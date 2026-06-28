<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Machine;
use Illuminate\Database\Seeder;

class MachineSeeder extends Seeder
{
    /**
     * Seed the machines.
     */
    public function run(): void
    {
        if (Machine::count() > 0) {
            return;
        }

        $worker = User::where('role', 'worker')->first();
        $workerId = $worker ? $worker->id : null;

        Machine::create([
            'machine_code' => 'CNC-01',
            'name' => 'CNC Milling Center VMC-850',
            'type' => 'Milling',
            'status' => 'idle',
            'default_operator_id' => $workerId,
            'hourly_rate' => 750.00,
            'specifications' => "Table size: 1000x500mm\nSpindle speed: 10000 RPM\nController: Fanuc Series Oi-MC",
        ]);

        Machine::create([
            'machine_code' => 'LATH-01',
            'name' => 'Heavy Duty Lathe Machine',
            'type' => 'Lathe',
            'status' => 'idle',
            'default_operator_id' => $workerId,
            'hourly_rate' => 450.00,
            'specifications' => "Max swing: 400mm\nMax length: 1000mm\nChuck size: 10 inch",
        ]);

        Machine::create([
            'machine_code' => 'DRILL-01',
            'name' => 'Radial Drilling Machine RD-32',
            'type' => 'Drilling',
            'status' => 'idle',
            'hourly_rate' => 200.00,
            'specifications' => "Drilling capacity: 32mm\nSpindle travel: 250mm",
        ]);

        Machine::create([
            'machine_code' => 'GRND-01',
            'name' => 'Precision Surface Grinder SG-200',
            'type' => 'Grinding',
            'status' => 'idle',
            'hourly_rate' => 350.00,
            'specifications' => "Chuck size: 450x200mm\nWheel size: 200mm",
        ]);
    }
}
