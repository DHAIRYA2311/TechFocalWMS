<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\SecurityAuditLog;
use Illuminate\Support\Facades\Response;
use Carbon\Carbon;
use Barryvdh\DomPDF\Facade\Pdf;

class SecurityController extends Controller
{
    public function index(Request $request)
    {
        $query = SecurityAuditLog::with('user:id,name,email');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }

        if ($request->has('module')) {
            $query->where('module', $request->module);
        }

        if ($request->has('action')) {
            $query->where('action', $request->action);
        }
        
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('created_at', [
                Carbon::parse($request->start_date)->startOfDay(),
                Carbon::parse($request->end_date)->endOfDay()
            ]);
        }

        $logs = $query->orderBy('created_at', 'desc')->paginate($request->get('per_page', 50));

        return response()->json($logs);
    }

    public function stats(Request $request)
    {
        $today = Carbon::today();
        
        // Logins today
        $loginsToday = SecurityAuditLog::where('action', 'login_success')
            ->whereDate('created_at', $today)
            ->count();
            
        // Failed logins today
        $failedLoginsToday = SecurityAuditLog::where('action', 'login_failed')
            ->whereDate('created_at', $today)
            ->count();
            
        // Unique users active today
        $activeUsersToday = SecurityAuditLog::whereDate('created_at', $today)
            ->distinct('user_id')
            ->count('user_id');

        // Recent alerts (e.g. failed logins, deactivations, etc.)
        $alerts = SecurityAuditLog::with('user:id,name')
            ->whereIn('action', ['login_failed', 'mfa_disabled', 'account_deactivated', 'password_reset_requested'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'logins_today' => $loginsToday,
            'failed_logins_today' => $failedLoginsToday,
            'active_users_today' => $activeUsersToday,
            'recent_alerts' => $alerts
        ]);
    }

    public function export(Request $request)
    {
        $query = SecurityAuditLog::with('user:id,name');

        if ($request->has('user_id')) {
            $query->where('user_id', $request->user_id);
        }
        if ($request->has('role')) {
            $query->where('role', $request->role);
        }
        if ($request->has('module')) {
            $query->where('module', $request->module);
        }
        if ($request->has('action')) {
            $query->where('action', $request->action);
        }
        if ($request->has('start_date') && $request->has('end_date')) {
            $query->whereBetween('created_at', [
                Carbon::parse($request->start_date)->startOfDay(),
                Carbon::parse($request->end_date)->endOfDay()
            ]);
        }

        $logs = $query->orderBy('created_at', 'desc')->get();
        $format = $request->get('format', 'csv');

        if ($format === 'pdf') {
            $pdf = Pdf::loadView('reports.security_audit', ['logs' => $logs])->setPaper('a4', 'landscape');
            return $pdf->download('security_audit_report.pdf');
        }

        // CSV Export
        $csvFileName = 'security_audit_report_' . date('Y-m-d_H-i-s') . '.csv';
        $headers = [
            "Content-type"        => "text/csv",
            "Content-Disposition" => "attachment; filename=$csvFileName",
            "Pragma"              => "no-cache",
            "Cache-Control"       => "must-revalidate, post-check=0, pre-check=0",
            "Expires"             => "0"
        ];

        $columns = ['Timestamp', 'User', 'Role', 'IP Address', 'Device', 'Action', 'Module', 'Record ID', 'Remarks'];

        $callback = function() use($logs, $columns) {
            $file = fopen('php://output', 'w');
            fputcsv($file, $columns);

            foreach ($logs as $log) {
                $row = [
                    $log->created_at->toDateTimeString(),
                    $log->user ? $log->user->name : 'System/Unknown',
                    $log->role ?? 'N/A',
                    $log->ip_address,
                    $log->user_agent,
                    $log->action,
                    $log->module,
                    $log->record_id,
                    $log->remarks
                ];
                fputcsv($file, $row);
            }
            fclose($file);
        };

        return response()->stream($callback, 200, $headers);
    }

    public function getActiveSessions(Request $request)
    {
        $currentId = $request->user()->currentAccessToken()->id ?? null;
        
        $sessions = \Illuminate\Support\Facades\DB::table('personal_access_tokens')
            ->join('users', 'personal_access_tokens.tokenable_id', '=', 'users.id')
            ->select(
                'personal_access_tokens.id as token_id',
                'users.id as user_id',
                'users.name as user_name',
                'users.role as user_role',
                'users.email as user_email',
                'personal_access_tokens.name as token_name',
                'personal_access_tokens.created_at',
                'personal_access_tokens.last_used_at'
            )
            ->where('personal_access_tokens.tokenable_type', \App\Models\User::class)
            ->where('personal_access_tokens.id', '!=', $currentId)
            ->orderBy('personal_access_tokens.last_used_at', 'desc')
            ->get();

        return response()->json($sessions);
    }

    public function terminateSession(Request $request, $id)
    {
        $token = \Illuminate\Support\Facades\DB::table('personal_access_tokens')->where('id', $id)->first();
        if (!$token) {
            return response()->json(['message' => 'Session not found'], 404);
        }

        \Illuminate\Support\Facades\DB::table('personal_access_tokens')->where('id', $id)->delete();
        
        $user = \App\Models\User::find($token->tokenable_id);
        if ($user) {
            \App\Services\SecurityLogger::log('session_terminated', 'Auth', (string) $user->id, null, null, 'Admin forcefully terminated the session', $request->user());
            
            try {
                event(new \App\Events\SessionTerminated($user->id, $id));
            } catch (\Exception $e) {
                \Illuminate\Support\Facades\Log::error('Failed to broadcast SessionTerminated event: ' . $e->getMessage());
            }
        }

        return response()->json(['message' => 'Session terminated successfully']);
    }
}
