<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Attendance;
use App\Models\JobCard;
use App\Models\Machine;
use App\Services\PushNotificationService;
use Carbon\Carbon;

class CheckScheduledOperators extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'operators:check-absent';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for absent operators assigned to active jobs or machines.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Checking for absent scheduled operators...");
        $today = Carbon::today()->toDateString();

        $absences = Attendance::with('user')
            ->where('date', $today)
            ->whereIn('status', ['absent', 'leave'])
            ->get();

        if ($absences->isEmpty()) {
            $this->info("No operators are absent today.");
            return 0;
        }

        foreach ($absences as $absence) {
            $userId = $absence->user_id;

            // Check if they have active jobs
            $activeJobs = JobCard::where('worker_id', $userId)
                ->whereIn('status', ['in_progress'])
                ->get();

            if ($activeJobs->isNotEmpty()) {
                foreach ($activeJobs as $job) {
                    PushNotificationService::sendToRoles(
                        ['admin', 'manager', 'supervisor'],
                        'Absent Operator Alert ⚠️',
                        "Operator {$absence->user->name} is absent but assigned to active Job {$job->job_card_number}.",
                        'workshop_alert_operator',
                        ['job_id' => $job->id, 'user_id' => $userId]
                    );
                }
            }

            // Check if they are default operator for any active machine
            $machines = Machine::where('default_operator_id', $userId)
                ->whereIn('status', ['idle', 'busy'])
                ->get();

            if ($machines->isNotEmpty()) {
                foreach ($machines as $machine) {
                    PushNotificationService::sendToRoles(
                        ['admin', 'manager', 'supervisor'],
                        'Absent Operator Alert ⚠️',
                        "Default operator {$absence->user->name} is absent for Machine {$machine->name}.",
                        'workshop_alert_operator',
                        ['machine_id' => $machine->id, 'user_id' => $userId]
                    );
                }
            }
        }

        $this->info("Absent operator checks completed.");
        return 0;
    }
}
