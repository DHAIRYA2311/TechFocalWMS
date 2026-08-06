<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Machine;
use App\Services\PushNotificationService;
use Carbon\Carbon;

class CheckMachineMaintenance extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'machines:check-maintenance';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for machines requiring maintenance based on date or runtime limit.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today()->toDateString();
        $this->info("Checking for machine maintenance as of {$today}...");

        // Find machines where next_maintenance_date is today or passed
        $machinesByDate = Machine::whereNotNull('next_maintenance_date')
            ->whereDate('next_maintenance_date', '<=', $today)
            ->where('status', '!=', 'maintenance')
            ->get();

        foreach ($machinesByDate as $machine) {
            PushNotificationService::sendToRoles(
                ['admin', 'manager', 'supervisor'],
                'Maintenance Due 🔧',
                "Machine {$machine->name} ({$machine->model_number}) is due for scheduled maintenance.",
                'machine_maintenance_due',
                ['machine_id' => $machine->id]
            );
        }

        // We could also check runtime limit if we track total_runtime vs maintenance_interval_hours,
        // but currently we mostly rely on date. If total_runtime is tracked:
        $machinesByRuntime = Machine::whereNotNull('maintenance_interval_hours')
            ->whereRaw('total_runtime >= maintenance_interval_hours')
            ->where('status', '!=', 'maintenance')
            ->get();

        foreach ($machinesByRuntime as $machine) {
            if (!$machinesByDate->contains('id', $machine->id)) { // avoid duplicate notification
                PushNotificationService::sendToRoles(
                    ['admin', 'manager', 'supervisor'],
                    'Maintenance Due 🔧',
                    "Machine {$machine->name} has reached its maintenance runtime limit.",
                    'machine_maintenance_due',
                    ['machine_id' => $machine->id]
                );
            }
        }

        $this->info("Completed maintenance checks.");
        return 0;
    }
}
