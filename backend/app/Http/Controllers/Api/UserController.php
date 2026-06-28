<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    /**
     * Display a listing of the users.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('settings') && !$request->user()->hasPermission('payroll') && !$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. Only management staff can view users.'], 403);
        }

        $users = User::select('id', 'name', 'email', 'role', 'shift', 'status', 'phone', 'salary', 'extra_notes', 'photo_path', 'created_at')
            ->orderBy('id', 'desc')
            ->get();

        return response()->json($users);
    }

    /**
     * Store a newly created user in storage.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized. Only management can manage users.'], 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:6',
            'role' => 'required|string|in:admin,partner,manager,supervisor,helper,worker',
            'shift' => 'nullable|string|in:day,night',
            'status' => 'required|string|in:active,inactive',
            'phone' => 'nullable|string|max:20',
            'salary' => 'nullable|numeric|min:0',
            'extra_notes' => 'nullable|string',
        ]);

        $user = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => $request->role,
            'shift' => $request->input('shift', 'day'),
            'status' => $request->status,
            'phone' => $request->phone,
            'salary' => $request->salary,
            'extra_notes' => $request->extra_notes,
        ]);

        return response()->json([
            'message' => 'User created successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'shift' => $user->shift,
                'status' => $user->status,
                'phone' => $user->phone,
                'salary' => $user->salary,
                'extra_notes' => $user->extra_notes,
                'photo_path' => $user->photo_path,
                'created_at' => $user->created_at,
            ]
        ], 201);
    }

    /**
     * Update the specified user in storage.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized. Only management can manage users.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => 'nullable|string|min:6',
            'role' => 'required|string|in:admin,partner,manager,supervisor,helper,worker',
            'shift' => 'nullable|string|in:day,night',
            'status' => 'required|string|in:active,inactive',
            'phone' => 'nullable|string|max:20',
            'salary' => 'nullable|numeric|min:0',
            'extra_notes' => 'nullable|string',
        ]);

        $user->name = $request->name;
        $user->email = $request->email;
        $user->role = $request->role;
        $user->shift = $request->input('shift', 'day');
        
        $oldStatus = $user->status;
        $user->status = $request->status;
        $user->phone = $request->phone;
        $user->salary = $request->salary;
        $user->extra_notes = $request->extra_notes;

        if ($request->filled('password')) {
            $user->password = Hash::make($request->password);
        }

        $user->save();

        // If user was deactivated, revoke all access tokens to log them out instantly
        if ($user->status === 'inactive' && $oldStatus === 'active') {
            $user->tokens()->delete();
        }

        return response()->json([
            'message' => 'User updated successfully.',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'shift' => $user->shift,
                'status' => $user->status,
                'phone' => $user->phone,
                'salary' => $user->salary,
                'extra_notes' => $user->extra_notes,
                'photo_path' => $user->photo_path,
                'created_at' => $user->created_at,
            ]
        ]);
    }

    /**
     * Get statistics for a specific user.
     */
    public function stats(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings') && !$request->user()->hasPermission('payroll') && !$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $completedCount = \App\Models\JobCard::where('assigned_worker_id', $id)
            ->where('status', 'completed')
            ->where('updated_at', '>=', now()->subDays(30))
            ->count();

        $activeCount = \App\Models\JobCard::where('assigned_worker_id', $id)
            ->whereIn('status', ['in_progress', 'inspection'])
            ->count();

        $pendingCount = \App\Models\JobCard::where('assigned_worker_id', $id)
            ->where('status', 'pending')
            ->count();

        $recentJobs = \App\Models\JobCard::where('assigned_worker_id', $id)
            ->with('poItem.purchaseOrder')
            ->orderBy('updated_at', 'desc')
            ->limit(5)
            ->get()
            ->map(function ($job) {
                return [
                    'id' => $job->id,
                    'job_card_number' => $job->job_card_number,
                    'quantity' => $job->quantity,
                    'status' => $job->status,
                    'item_code' => $job->poItem->item_code ?? 'N/A',
                    'po_number' => $job->poItem->purchaseOrder->po_number ?? 'N/A',
                    'updated_at' => $job->updated_at,
                ];
            });

        return response()->json([
            'completed_jobs_last_month' => $completedCount,
            'active_jobs' => $activeCount,
            'pending_jobs' => $pendingCount,
            'recent_jobs' => $recentJobs
        ]);
    }

    /**
     * Get attendance records for a specific user.
     */
    public function attendance(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings') && !$request->user()->hasPermission('payroll') && !$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $month = $request->query('month', \Illuminate\Support\Carbon::now()->month);
        $year = $request->query('year', \Illuminate\Support\Carbon::now()->year);

        $logs = \App\Models\Attendance::where('user_id', $id)
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->orderBy('date', 'asc')
            ->get()
            ->map(function ($att) {
                return [
                    'id' => $att->id,
                    'date' => $att->date,
                    'shift' => $att->shift,
                    'status' => $att->status,
                    'clock_in' => $att->clock_in ? \Illuminate\Support\Carbon::parse($att->clock_in)->format('H:i') : null,
                    'clock_out' => $att->clock_out ? \Illuminate\Support\Carbon::parse($att->clock_out)->format('H:i') : null,
                    'notes' => $att->notes,
                ];
            });

        return response()->json($logs);
    }

    /**
     * Get salary and advances history for a specific user.
     */
    public function salaryHistory(Request $request, $id)
    {
        if (!$request->user()->hasPermission('payroll')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        $advances = \App\Models\SalaryAdvance::where('user_id', $id)
            ->orderBy('date', 'desc')
            ->get();

        $payrollItems = \App\Models\PayrollItem::where('user_id', $id)
            ->with('payroll')
            ->orderBy('id', 'desc')
            ->get()
            ->map(function ($item) {
                return [
                    'id' => $item->id,
                    'payroll_id' => $item->payroll_id,
                    'month' => $item->payroll->month ?? null,
                    'year' => $item->payroll->year ?? null,
                    'base_salary' => $item->base_salary,
                    'gross_salary' => $item->gross_salary,
                    'attendance_deductions' => $item->attendance_deductions,
                    'overtime_pay' => $item->overtime_pay,
                    'pf_deductions' => $item->pf_deductions,
                    'pt_deductions' => $item->pt_deductions,
                    'advance_deductions' => $item->advance_deductions,
                    'bonus' => $item->bonus,
                    'net_salary' => $item->net_salary,
                    'payment_status' => $item->payment_status,
                    'paid_at' => $item->paid_at,
                    'notes' => $item->notes,
                ];
            });

        return response()->json([
            'salary' => $user->salary,
            'advances' => $advances,
            'payroll_history' => $payrollItems
        ]);
    }

    /**
     * Upload and update user profile photo.
     */
    public function uploadPhoto(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized. Only management staff can upload photos.'], 403);
        }

        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $user = User::find($id);
        if (!$user) {
            return response()->json(['message' => 'User not found.'], 404);
        }

        if ($request->hasFile('photo')) {
            // Delete old photo
            if ($user->photo_path && \Illuminate\Support\Facades\File::exists(public_path($user->photo_path))) {
                \Illuminate\Support\Facades\File::delete(public_path($user->photo_path));
            }

            $file = $request->file('photo');
            $filename = 'user_' . $user->id . '_' . time() . '.' . $file->getClientOriginalExtension();

            if (!\Illuminate\Support\Facades\File::isDirectory(public_path('photos'))) {
                \Illuminate\Support\Facades\File::makeDirectory(public_path('photos'), 0755, true, true);
            }

            $file->move(public_path('photos'), $filename);
            $user->photo_path = 'photos/' . $filename;
            $user->save();

            return response()->json([
                'message' => 'Photo uploaded successfully.',
                'photo_path' => $user->photo_path
            ]);
        }

        return response()->json(['message' => 'No photo file provided.'], 400);
    }

    /**
     * Archive a user.
     */
    public function archive(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $user = User::findOrFail($id);
        $user->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $request->user()->id
        ]);

        return response()->json([
            'message' => 'User archived successfully.',
            'user' => $user
        ]);
    }

    /**
     * Soft delete a user.
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'delete_reason' => 'required|string|max:1000'
        ]);

        $user = User::findOrFail($id);

        $hasAttendances = \App\Models\Attendance::where('user_id', $user->id)->orWhere('marked_by', $user->id)->exists();
        $hasPayrolls = \App\Models\PayrollItem::where('user_id', $user->id)->exists();
        $hasJobs = \App\Models\JobCard::where('assigned_worker_id', $user->id)->exists();
        $hasExpenses = \App\Models\Expense::where('logged_by', $user->id)->exists();
        $hasDevices = \App\Models\PairedDevice::where('user_id', $user->id)->exists();

        if ($hasAttendances || $hasPayrolls || $hasJobs || $hasExpenses || $hasDevices) {
            return response()->json([
                'message' => 'This user cannot be deleted because they have operational activity records. You can deactivate their login status instead.'
            ], 422);
        }

        $user->update([
            'deleted_by' => $request->user()->id,
            'delete_reason' => $request->delete_reason
        ]);

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.'
        ]);
    }
}
