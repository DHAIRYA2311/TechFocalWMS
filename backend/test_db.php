<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Http\Kernel::class);
$shift = 'day'; 
$date = '2026-08-09';
$users = App\Models\User::whereIn('role', ['manager', 'supervisor', 'helper', 'worker'])->where('status', 'active')->where(function($query) use ($shift, $date) { $query->where('shift', $shift)->orWhereHas('attendances', function($q) use ($date, $shift) { $q->where('date', $date)->where('shift', $shift); }); })->select('id', 'name', 'email', 'role', 'phone', 'shift')->get();
echo "USERS COUNT: " . $users->count() . "\n";
