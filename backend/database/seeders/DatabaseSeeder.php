<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Admin Account
        User::create([
            'name' => 'TechFocal Admin',
            'email' => 'admin@techfocal.in',
            'password' => bcrypt('admin123'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999991',
        ]);

        // Partner Account (Founder)
        User::create([
            'name' => 'TechFocal Partner',
            'email' => 'partner@techfocal.in',
            'password' => bcrypt('partner123'),
            'role' => 'partner',
            'status' => 'active',
            'phone' => '9999999992',
        ]);

        // Manager Account
        User::create([
            'name' => 'TechFocal Manager',
            'email' => 'manager@techfocal.in',
            'password' => bcrypt('manager123'),
            'role' => 'manager',
            'status' => 'active',
            'phone' => '9999999993',
        ]);

        // Worker Account
        $worker = User::create([
            'name' => 'TechFocal Worker',
            'email' => 'worker@techfocal.in',
            'password' => bcrypt('worker123'),
            'role' => 'worker',
            'status' => 'active',
            'phone' => '9999999994',
        ]);

        // Seed default machines
        \App\Models\Machine::create([
            'machine_code' => 'CNC-01',
            'name' => 'CNC Milling Center VMC-850',
            'type' => 'Milling',
            'status' => 'idle',
            'default_operator_id' => $worker->id,
            'hourly_rate' => 750.00,
            'specifications' => "Table size: 1000x500mm\nSpindle speed: 10000 RPM\nController: Fanuc Series Oi-MC",
        ]);

        \App\Models\Machine::create([
            'machine_code' => 'LATH-01',
            'name' => 'Heavy Duty Lathe Machine',
            'type' => 'Lathe',
            'status' => 'idle',
            'default_operator_id' => $worker->id,
            'hourly_rate' => 450.00,
            'specifications' => "Max swing: 400mm\nMax length: 1000mm\nChuck size: 10 inch",
        ]);

        \App\Models\Machine::create([
            'machine_code' => 'DRILL-01',
            'name' => 'Radial Drilling Machine RD-32',
            'type' => 'Drilling',
            'status' => 'idle',
            'hourly_rate' => 200.00,
            'specifications' => "Drilling capacity: 32mm\nSpindle travel: 250mm",
        ]);

        \App\Models\Machine::create([
            'machine_code' => 'GRND-01',
            'name' => 'Precision Surface Grinder SG-200',
            'type' => 'Grinding',
            'status' => 'idle',
            'hourly_rate' => 350.00,
            'specifications' => "Chuck size: 450x200mm\nWheel size: 200mm",
        ]);
    }
}
