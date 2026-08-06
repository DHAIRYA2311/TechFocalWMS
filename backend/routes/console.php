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
    $dayTime = \App\Models\Setting::getVal('notif_attendance_day_time', '10:00');
    $nightTime = \App\Models\Setting::getVal('notif_attendance_night_time', '22:00');
} catch (\Exception $e) {
    $dayTime = '10:00';
    $nightTime = '22:00';
}

Schedule::command('attendance:check-reminders day')
    ->dailyAt($dayTime)
    ->description('Send Day Shift Attendance Reminders')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_attendance:check-reminders day', '1') === '1');

Schedule::command('attendance:check-reminders night')
    ->dailyAt($nightTime)
    ->description('Send Night Shift Attendance Reminders')
    ->when(fn() => \App\Models\Setting::getVal('scheduler_attendance:check-reminders night', '1') === '1');

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
