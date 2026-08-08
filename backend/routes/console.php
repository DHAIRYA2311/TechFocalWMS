<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('email:fetch-pos')
    ->everyFiveMinutes()
    ->description('Fetch Incoming Emails for PO Parsing')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_email:fetch-pos', '1') === '1');

try {
    $dayStart = \App\Models\Setting::getVal('att_day_start', '09:00');
    $nightStart = \App\Models\Setting::getVal('att_night_start', '21:00');
    $dayGrace = (int) \App\Models\Setting::getVal('att_day_grace_period', 15);
    $nightGrace = (int) \App\Models\Setting::getVal('att_night_grace_period', 15);

    $dayGraceTime = \Carbon\Carbon::parse($dayStart)->addMinutes($dayGrace)->format('H:i');
    $nightGraceTime = \Carbon\Carbon::parse($nightStart)->addMinutes($nightGrace)->format('H:i');
} catch (\Exception $e) {
    $dayStart = '09:00';
    $nightStart = '21:00';
    $dayGraceTime = '09:15';
    $nightGraceTime = '21:15';
}

Schedule::command('attendance:check-reminders day start')
    ->dailyAt($dayStart)
    ->description('Send Day Shift Start Reminders')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_attendance:check-reminders', '1') === '1');

Schedule::command('attendance:check-reminders day grace')
    ->dailyAt($dayGraceTime)
    ->description('Send Day Shift Grace Reminders')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_attendance:check-reminders', '1') === '1');

Schedule::command('attendance:check-reminders night start')
    ->dailyAt($nightStart)
    ->description('Send Night Shift Start Reminders')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_attendance:check-reminders', '1') === '1');

Schedule::command('attendance:check-reminders night grace')
    ->dailyAt($nightGraceTime)
    ->description('Send Night Shift Grace Reminders')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_attendance:check-reminders', '1') === '1');

Schedule::command('invoices:check-overdue')
    ->dailyAt('09:00')
    ->description('Check Overdue Invoices and Send Alerts')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_invoices:check-overdue', '1') === '1');

Schedule::command('machines:check-maintenance')
    ->dailyAt('08:00')
    ->description('Check Machine Maintenance Schedules')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_machines:check-maintenance', '1') === '1');

Schedule::command('machines:check-idle')
    ->hourly()
    ->description('Check for Unexpected Idle Machines')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_machines:check-idle', '1') === '1');

Schedule::command('inventory:check-low')
    ->dailyAt('08:30')
    ->description('Check Low Stock Inventory')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_inventory:check-low', '1') === '1');

Schedule::command('jobs:check-delays')
    ->dailyAt('09:30')
    ->description('Check for Delayed Jobs in Progress')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_jobs:check-delays', '1') === '1');

Schedule::command('operators:check-absent')
    ->dailyAt('10:30')
    ->description('Check for Absent Operators and Re-allocate Jobs')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_operators:check-absent', '1') === '1');

Schedule::command('jobs:archive-delivered')
    ->hourly()
    ->description('Archive Delivered Job Cards (Hourly Check)')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_jobs:archive-delivered', '1') === '1');

Schedule::call(function () {
    \App\Models\JobCard::where('status', 'completed')
        ->where('is_archived', false)
        ->whereHas('deliveryChallanItem', function ($query) {
            $query->where('created_at', '<', now()->subHours(24));
        })
        ->update(['is_archived' => true]);
})
->everyMinute()
->description('Inline Auto-Archive Delivered Jobs')
->when(fn() => \App\Models\Setting::getVal('scheduler_closure_' . md5('Inline Auto-Archive Delivered Jobs* * * * *'), '1') === '1');
