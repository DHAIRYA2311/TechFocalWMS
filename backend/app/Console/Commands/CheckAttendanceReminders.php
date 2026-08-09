<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Models\User;
use App\Services\PushNotificationService;
use App\Services\HolidayService;
use Carbon\Carbon;

class CheckAttendanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:check-reminders {shift : The shift to check (day or night)} {type : The reminder type (start or grace)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send attendance reminders to workers based on shift start and grace period.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $shift = $this->argument('shift');
        $type = $this->argument('type');

        if (!in_array($shift, ['day', 'night'])) {
            $this->error("Invalid shift specified. Use 'day' or 'night'.");
            return 1;
        }

        if (!in_array($type, ['start', 'grace'])) {
            $this->error("Invalid type specified. Use 'start' or 'grace'.");
            return 1;
        }

        $date = Carbon::today()->toDateString();
        $this->info("Checking attendance marking for date: {$date}, shift: {$shift}, type: {$type}...");

        $shiftTitle = ucfirst($shift) . ' Shift';
        
        // Check if today is a Holiday / Weekly Off
        $holidayCheck = HolidayService::isHoliday($date, $shift);
        if ($holidayCheck['is_holiday']) {
            $this->info("Today is a {$holidayCheck['type']} ({$holidayCheck['reason']}). Skipping attendance notifications.");
            return 0;
        }
        
        // Find active workers and helpers assigned to THIS specific shift
        $activeWorkers = User::whereIn('role', ['worker', 'helper'])
            ->where('status', 'active')
            ->where('shift', $shift)
            ->get();

        if ($activeWorkers->isEmpty()) {
            $this->info("No staff assigned to the {$shiftTitle}. Skipping attendance notifications.");
            return 0;
        }

        if ($type === 'start') {
            // At shift start, we just notify all workers to mark attendance
            foreach ($activeWorkers as $worker) {
                PushNotificationService::sendToUser(
                    $worker->id,
                    "{$shiftTitle} Started ⏰",
                    "Your shift has started. Please mark your attendance now.",
                    'attendance_reminder',
                    ['shift' => $shift, 'date' => $date]
                );
            }
            $this->info("Shift start notifications sent to {$activeWorkers->count()} workers.");
        } else {
            // After grace period, check who hasn't marked yet
            $markedUserIds = Attendance::where('date', $date)
                ->where('shift', $shift)
                ->pluck('user_id')
                ->toArray();
                
            $pendingWorkers = $activeWorkers->whereNotIn('id', $markedUserIds);
            
            foreach ($pendingWorkers as $worker) {
                PushNotificationService::sendToUser(
                    $worker->id,
                    "Attendance Overdue ⚠️",
                    "The grace period for the {$shiftTitle} has ended. Please mark your attendance immediately.",
                    'attendance_overdue',
                    ['shift' => $shift, 'date' => $date]
                );
            }
            
            // Also notify supervisors if there are any unmarked
            if ($pendingWorkers->count() > 0) {
                PushNotificationService::sendToRoles(
                    ['admin', 'manager', 'partner', 'supervisor'],
                    "Pending Attendance ⚠️",
                    "{$pendingWorkers->count()} employees have not marked attendance for the {$shiftTitle}.",
                    'attendance_overdue_supervisor',
                    ['shift' => $shift, 'date' => $date]
                );
            }
            
            $this->info("Grace period notifications sent for {$pendingWorkers->count()} workers.");
        }

        return 0;
    }
}
