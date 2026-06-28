<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Attendance;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AttendanceController extends Controller
{
    /**
     * Resolve the closest shift and logical date based on given Carbon time.
     */
    private static function resolveShiftAndTime(Carbon $now)
    {
        $dayStart = \App\Models\Setting::getVal('att_day_shift_start', '09:00');
        $nightStart = \App\Models\Setting::getVal('att_night_shift_start', '21:00');
        
        $dayToday = Carbon::today()->setTimeFromTimeString($dayStart);
        $dayTomorrow = Carbon::tomorrow()->setTimeFromTimeString($dayStart);
        $dayYesterday = Carbon::yesterday()->setTimeFromTimeString($dayStart);
        
        $nightToday = Carbon::today()->setTimeFromTimeString($nightStart);
        $nightYesterday = Carbon::yesterday()->setTimeFromTimeString($nightStart);
        $nightTomorrow = Carbon::tomorrow()->setTimeFromTimeString($nightStart);
        
        $candidates = [
            ['shift' => 'day', 'date' => Carbon::today()->toDateString(), 'time' => $dayToday],
            ['shift' => 'day', 'date' => Carbon::tomorrow()->toDateString(), 'time' => $dayTomorrow],
            ['shift' => 'day', 'date' => Carbon::yesterday()->toDateString(), 'time' => $dayYesterday],
            ['shift' => 'night', 'date' => Carbon::today()->toDateString(), 'time' => $nightToday],
            ['shift' => 'night', 'date' => Carbon::yesterday()->toDateString(), 'time' => $nightYesterday],
            ['shift' => 'night', 'date' => Carbon::tomorrow()->toDateString(), 'time' => $nightTomorrow],
        ];
        
        $bestCandidate = null;
        $minDiff = null;
        foreach ($candidates as $cand) {
            $diff = abs($now->diffInSeconds($cand['time']));
            if ($minDiff === null || $diff < $minDiff) {
                $minDiff = $diff;
                $bestCandidate = $cand;
            }
        }
        
        return $bestCandidate;
    }

    /**
     * Get attendance records.
     */
    public function index(Request $request)
    {
        $role = $request->user()->role;
        $isManager = in_array($role, ['admin', 'partner', 'manager']);

        if ($isManager) {
            // Managers view all users' attendance for a selected date and shift
            $date = $request->query('date', Carbon::today()->toDateString());
            $shift = $request->query('shift', 'day');
            
            $users = User::whereIn('role', ['manager', 'supervisor', 'helper', 'worker'])
                ->where('status', 'active')
                ->where(function($query) use ($shift, $date) {
                    $query->where('shift', $shift)
                          ->orWhereHas('attendances', function($q) use ($date, $shift) {
                              $q->where('date', $date)->where('shift', $shift);
                          });
                })
                ->select('id', 'name', 'email', 'role', 'phone', 'shift')
                ->orderBy('name', 'asc')
                ->get();

            $attendances = Attendance::where('date', $date)
                ->where('shift', $shift)
                ->get()
                ->keyBy('user_id');

            $result = $users->map(function ($user) use ($attendances) {
                $att = $attendances->get($user->id);
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'phone' => $user->phone,
                    'attendance' => $att ? [
                        'id' => $att->id,
                        'status' => $att->status,
                        'clock_in' => $att->clock_in ? Carbon::parse($att->clock_in)->format('H:i') : null,
                        'clock_out' => $att->clock_out ? Carbon::parse($att->clock_out)->format('H:i') : null,
                        'notes' => $att->notes,
                    ] : null
                ];
            });

            // Also return matrix data if requested (monthly list for calendar grid, filtered by shift)
            $matrix = [];
            if ($request->query('include_matrix')) {
                $month = $request->query('month', Carbon::now()->month);
                $year = $request->query('year', Carbon::now()->year);
                
                $matrixData = Attendance::whereMonth('date', $month)
                    ->whereYear('date', $year)
                    ->where('shift', $shift)
                    ->get();
                
                foreach ($matrixData as $log) {
                    $matrix[$log->user_id][$log->date] = $log->status;
                }
            }

            return response()->json([
                'records' => $result,
                'matrix' => $matrix
            ]);
        } else {
            // Floor staff view their own history for selected month/year
            $month = $request->query('month', Carbon::now()->month);
            $year = $request->query('year', Carbon::now()->year);

            $logs = Attendance::where('user_id', $request->user()->id)
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
                        'clock_in' => $att->clock_in ? Carbon::parse($att->clock_in)->format('H:i') : null,
                        'clock_out' => $att->clock_out ? Carbon::parse($att->clock_out)->format('H:i') : null,
                        'notes' => $att->notes,
                    ];
                });

            // Return active clock-in, or resolve closest shift log for today
            $activeLog = Attendance::where('user_id', $request->user()->id)
                ->whereNotNull('clock_in')
                ->whereNull('clock_out')
                ->first();

            $todayLog = null;
            if ($activeLog) {
                $todayLog = $activeLog;
            } else {
                $resolved = self::resolveShiftAndTime(Carbon::now());
                $todayLog = Attendance::where('user_id', $request->user()->id)
                    ->where('date', $resolved['date'])
                    ->where('shift', $resolved['shift'])
                    ->first();
            }

            return response()->json([
                'logs' => $logs,
                'today' => $todayLog ? [
                    'id' => $todayLog->id,
                    'shift' => $todayLog->shift,
                    'status' => $todayLog->status,
                    'clock_in' => $todayLog->clock_in ? Carbon::parse($todayLog->clock_in)->format('H:i') : null,
                    'clock_out' => $todayLog->clock_out ? Carbon::parse($todayLog->clock_out)->format('H:i') : null,
                    'notes' => $todayLog->notes,
                ] : null
            ]);
        }
    }

    /**
     * Store daily attendance register (Manager bulk actions).
     */
    public function store(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'partner', 'manager'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'date' => 'required|date',
            'shift' => 'nullable|string|in:day,night',
            'records' => 'required|array',
            'records.*.user_id' => 'required|exists:users,id',
            'records.*.status' => 'required|in:present,absent,late,half_day,leave',
            'records.*.clock_in' => 'nullable|string',
            'records.*.clock_out' => 'nullable|string',
            'records.*.notes' => 'nullable|string',
        ]);

        $date = $request->date;
        $shift = $request->input('shift', 'day');
        
        foreach ($request->records as $record) {
            Attendance::updateOrCreate(
                ['user_id' => $record['user_id'], 'date' => $date, 'shift' => $shift],
                [
                    'status' => $record['status'],
                    'clock_in' => $record['clock_in'] ? Carbon::parse($record['clock_in'])->toTimeString() : null,
                    'clock_out' => $record['clock_out'] ? Carbon::parse($record['clock_out'])->toTimeString() : null,
                    'notes' => $record['notes'] ?? null,
                    'marked_by' => $request->user()->id
                ]
            );
        }

        return response()->json(['message' => 'Attendance sheet saved successfully.']);
    }

    /**
     * Self Clock-in (floor operators).
     */
    public function clockIn(Request $request)
    {
        $userId = $request->user()->id;
        
        $now = Carbon::now();
        $resolved = self::resolveShiftAndTime($now);
        $resolvedShift = $resolved['shift'];
        $resolvedDate = $resolved['date'];

        // Check if already clocked in for this shift on this date
        $existing = Attendance::where('user_id', $userId)
            ->where('date', $resolvedDate)
            ->where('shift', $resolvedShift)
            ->first();
        if ($existing) {
            return response()->json(['message' => 'You have already checked in for the ' . ucfirst($resolvedShift) . ' Shift today.'], 400);
        }

        // Determine if late based on configured start time and grace period
        $graceMinutes = (int) \App\Models\Setting::getVal("att_{$resolvedShift}_grace_period", 0);
        $shiftStartCarbon = $resolved['time'];
        $graceDeadline = (clone $shiftStartCarbon)->addMinutes($graceMinutes);
        
        $status = $now->greaterThan($graceDeadline) ? 'late' : 'present';

        $att = Attendance::create([
            'user_id' => $userId,
            'date' => $resolvedDate,
            'shift' => $resolvedShift,
            'status' => $status,
            'clock_in' => $now->toTimeString(),
        ]);

        return response()->json([
            'message' => 'Checked in successfully for ' . ucfirst($resolvedShift) . ' Shift.',
            'attendance' => [
                'id' => $att->id,
                'shift' => $att->shift,
                'status' => $att->status,
                'clock_in' => $now->format('H:i'),
                'clock_out' => null,
            ]
        ]);
    }

    /**
     * Self Clock-out (floor operators).
     */
    public function clockOut(Request $request)
    {
        $userId = $request->user()->id;

        // Find the latest active check-in (where clock_in is present but clock_out is null)
        $att = Attendance::where('user_id', $userId)
            ->whereNotNull('clock_in')
            ->whereNull('clock_out')
            ->orderBy('date', 'desc')
            ->first();

        if (!$att) {
            return response()->json(['message' => 'You must check in first.'], 400);
        }

        $time = Carbon::now();
        $att->clock_out = $time->toTimeString();
        $att->save();

        return response()->json([
            'message' => 'Checked out successfully.',
            'attendance' => [
                'id' => $att->id,
                'shift' => $att->shift,
                'status' => $att->status,
                'clock_in' => Carbon::parse($att->clock_in)->format('H:i'),
                'clock_out' => $time->format('H:i'),
            ]
        ]);
    }

    /**
     * Attendance Statistics.
     */
    public function stats(Request $request)
    {
        $today = Carbon::today()->toDateString();
        
        $shift = $request->query('shift');
        if (!$shift) {
            $resolved = self::resolveShiftAndTime(Carbon::now());
            $shift = $resolved['shift'];
        }
        
        $totalActiveStaff = User::whereIn('role', ['manager', 'supervisor', 'helper', 'worker'])
            ->where('status', 'active')
            ->count();

        $present = Attendance::where('date', $today)->where('shift', $shift)->whereIn('status', ['present', 'late', 'half_day'])->count();
        $late = Attendance::where('date', $today)->where('shift', $shift)->where('status', 'late')->count();
        $absent = Attendance::where('date', $today)->where('shift', $shift)->where('status', 'absent')->count();
        $leave = Attendance::where('date', $today)->where('shift', $shift)->where('status', 'leave')->count();

        return response()->json([
            'today' => [
                'present' => $present,
                'late' => $late,
                'absent' => $absent,
                'leave' => $leave,
                'not_marked' => max(0, $totalActiveStaff - ($present + $absent + $leave)),
                'total_staff' => $totalActiveStaff,
                'resolved_shift' => $shift
            ]
        ]);
    }
}
