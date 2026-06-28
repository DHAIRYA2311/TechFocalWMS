<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::command('email:fetch-pos')->everyFiveMinutes();

try {
    $dayTime = \App\Models\Setting::getVal('notif_attendance_day_time', '10:00');
    $nightTime = \App\Models\Setting::getVal('notif_attendance_night_time', '22:00');
} catch (\Exception $e) {
    $dayTime = '10:00';
    $nightTime = '22:00';
}

Schedule::command('attendance:check-reminders day')->dailyAt($dayTime);
Schedule::command('attendance:check-reminders night')->dailyAt($nightTime);

Schedule::call(function () {
    \App\Models\JobCard::where('status', 'completed')
        ->where('is_archived', false)
        ->whereHas('deliveryChallanItem', function ($query) {
            $query->where('created_at', '<', now()->subHours(24));
        })
        ->update(['is_archived' => true]);
})->everyMinute();
