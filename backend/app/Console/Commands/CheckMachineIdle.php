<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Machine;
use App\Models\JobCard;
use App\Services\PushNotificationService;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;

class CheckMachineIdle extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'machines:check-idle';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for machines that are idle/offline despite having active jobs.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Checking for idle/offline machines with active jobs...");

        $idleMachines = Machine::whereIn('status', ['idle', 'offline'])->get();

        if ($idleMachines->isEmpty()) {
            $this->info("No idle or offline machines found.");
            return 0;
        }

        $notifiedCount = 0;

        foreach ($idleMachines as $machine) {
            // Check if machine has an active job
            $hasActiveJob = JobCard::where('machine_id', $machine->id)
                ->whereIn('status', ['in_progress', 'pending'])
                ->exists();

            if (!$hasActiveJob) {
                continue; // Skip if no active job requires this machine
            }

            // Check if we recently notified about this machine (cooldown of 4 hours)
            $cacheKey = "notified_idle_machine_{$machine->id}";
            if (Cache::has($cacheKey)) {
                continue; // Skip if already notified recently
            }

            PushNotificationService::sendToRoles(
                ['admin', 'manager', 'supervisor'],
                'Machine Idle Alert 🛑',
                "Machine {$machine->name} is currently {$machine->status} but has active/pending work assigned.",
                'machine_idle',
                ['machine_id' => $machine->id]
            );

            // Set cooldown to prevent repeated hourly notifications
            Cache::put($cacheKey, true, now()->addHours(4));
            $notifiedCount++;
        }

        $this->info("Notifications sent for {$notifiedCount} machines.");
        return 0;
    }
}
