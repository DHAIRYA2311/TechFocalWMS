<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use App\Services\SecureFileUploadService;
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

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => [
                'required',
                'string',
                \Illuminate\Validation\Rules\Password::min(12)->letters()->mixedCase()->numbers()->symbols()
            ],
            'role' => 'required|string|in:admin,partner,manager,supervisor,helper,worker',
            'shift' => 'nullable|string|in:day,night',
            'status' => 'required|string|in:active,inactive',
            'phone' => 'nullable|string|max:20',
            'salary' => 'nullable|numeric|min:0',
            'extra_notes' => 'nullable|string|max:2000',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
            'shift' => $validated['shift'] ?? 'day',
            'status' => $validated['status'],
            'phone' => $validated['phone'] ?? null,
            'salary' => $validated['salary'] ?? null,
            'extra_notes' => $validated['extra_notes'] ?? null,
        ]);

        \App\Models\PasswordHistory::create([
            'user_id' => $user->id,
            'password_hash' => $user->password
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

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => ['required', 'string', 'email', 'max:255', Rule::unique('users')->ignore($user->id)],
            'password' => [
                'nullable',
                'string',
                \Illuminate\Validation\Rules\Password::min(12)->letters()->mixedCase()->numbers()->symbols(),
                new \App\Rules\NotUsedPassword($user)
            ],
            'role' => 'required|string|in:admin,partner,manager,supervisor,helper,worker',
            'shift' => 'nullable|string|in:day,night',
            'status' => 'required|string|in:active,inactive',
            'phone' => 'nullable|string|max:20',
            'salary' => 'nullable|numeric|min:0',
            'extra_notes' => 'nullable|string|max:2000',
        ]);

        $user->name = $validated['name'];
        $user->email = $validated['email'];
        $user->role = $validated['role'];
        $user->shift = $validated['shift'] ?? 'day';
        
        $oldStatus = $user->status;
        $user->status = $validated['status'];
        $user->phone = $validated['phone'] ?? null;
        $user->salary = $validated['salary'] ?? null;
        $user->extra_notes = $validated['extra_notes'] ?? null;

        if (!empty($validated['password'])) {
            $user->password = Hash::make($validated['password']);
            
            \App\Models\PasswordHistory::create([
                'user_id' => $user->id,
                'password_hash' => $user->password
            ]);
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

        $userTarget = \App\Models\User::find($id);
        $shift = $userTarget ? $userTarget->shift : 'day';

        $logs = \App\Models\Attendance::where('user_id', $id)
            ->whereMonth('date', $month)
            ->whereYear('date', $year)
            ->orderBy('date', 'asc')
            ->get()
            ->keyBy('date');

        $daysInMonth = \Illuminate\Support\Carbon::createFromDate($year, $month, 1)->daysInMonth;
        $resultLogs = collect();

        for ($d = 1; $d <= $daysInMonth; $d++) {
            $dateStr = sprintf('%04d-%02d-%02d', $year, $month, $d);
            
            if ($logs->has($dateStr)) {
                $att = $logs->get($dateStr);
                $resultLogs->push([
                    'id' => $att->id,
                    'date' => $att->date,
                    'shift' => $att->shift,
                    'status' => $att->status,
                    'clock_in' => $att->clock_in ? \Illuminate\Support\Carbon::parse($att->clock_in)->format('H:i') : null,
                    'clock_out' => $att->clock_out ? \Illuminate\Support\Carbon::parse($att->clock_out)->format('H:i') : null,
                    'notes' => $att->notes,
                ]);
            } else {
                $holidayCheck = \App\Services\HolidayService::isHoliday($dateStr, $shift);
                if ($holidayCheck['is_holiday']) {
                    $resultLogs->push([
                        'id' => null,
                        'date' => $dateStr,
                        'shift' => $shift,
                        'status' => $holidayCheck['type'],
                        'clock_in' => null,
                        'clock_out' => null,
                        'notes' => $holidayCheck['reason'],
                    ]);
                }
            }
        }

        return response()->json($resultLogs);
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
            // Delete old photo securely via service if it's stored on public disk
            if ($user->photo_path && str_starts_with($user->photo_path, 'photos/')) {
                SecureFileUploadService::delete($user->photo_path, 'public');
            } else if ($user->photo_path && \Illuminate\Support\Facades\File::exists(public_path($user->photo_path))) {
                // Fallback for legacy photos directly in public/photos
                \Illuminate\Support\Facades\File::delete(public_path($user->photo_path));
            }

            try {
                $path = SecureFileUploadService::upload($request->file('photo'), 'photos', 'public');
                $user->photo_path = $path; // 'photos/filename.jpg'
                $user->save();
            } catch (\Exception $e) {
                return response()->json(['message' => 'Failed to upload photo: ' . $e->getMessage()], 400);
            }

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

        $validated = $request->validate([
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
            'delete_reason' => $validated['delete_reason']
        ]);

        $user->delete();

        return response()->json([
            'message' => 'User deleted successfully.'
        ]);
    }
}
