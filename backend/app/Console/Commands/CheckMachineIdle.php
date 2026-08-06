<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Machine;
use App\Services\PushNotificationService;
use Carbon\Carbon;

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
    protected $description = 'Check for machines that are idle/offline.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Checking for idle/offline machines...");

        $idleMachines = Machine::whereIn('status', ['idle', 'offline'])->get();

        if ($idleMachines->isEmpty()) {
            $this->info("No idle or offline machines found.");
            return 0;
        }

        foreach ($idleMachines as $machine) {
            PushNotificationService::sendToRoles(
                ['admin', 'manager', 'supervisor'],
                'Machine Idle Alert 🛑',
                "Machine {$machine->name} is currently {$machine->status}.",
                'machine_idle',
                ['machine_id' => $machine->id]
            );
        }

        $this->info("Notifications sent for {$idleMachines->count()} idle/offline machines.");
        return 0;
    }
}
