<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Services\PushNotificationService;
use Carbon\Carbon;

class CheckAttendanceReminders extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'attendance:check-reminders {shift : The shift to check (day or night)}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check if attendance has been marked for the given shift. If not, alert the supervisors.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $shift = $this->argument('shift');

        if (!in_array($shift, ['day', 'night'])) {
            $this->error("Invalid shift specified. Use 'day' or 'night'.");
            return 1;
        }

        $date = Carbon::today()->toDateString();

        $this->info("Checking attendance marking for date: {$date}, shift: {$shift}...");

        // Check if any attendance has been marked for this date and shift
        $markedCount = Attendance::where('date', $date)
            ->where('shift', $shift)
            ->count();

        if ($markedCount === 0) {
            $this->warn("No attendance records found! Dispatching reminders...");

            $shiftTitle = ucfirst($shift) . ' Shift';
            $title = "Attendance Pending ⏰";
            $message = "The Attendance of {$shiftTitle} is remaining.";

            PushNotificationService::sendToRoles(
                ['admin', 'manager', 'partner'],
                $title,
                $message,
                'attendance_reminder',
                [
                    'shift' => $shift,
                    'date' => $date
                ]
            );

            $this->info("Supervisors have been successfully notified.");
        } else {
            $this->info("Attendance has already been marked ({$markedCount} records found). No reminders needed.");
        }

        return 0;
    }
}
