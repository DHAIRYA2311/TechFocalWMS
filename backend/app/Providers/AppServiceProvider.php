<?php

namespace App\Providers;

use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        try {
            if (class_exists(\App\Models\Setting::class) && \Illuminate\Support\Facades\Schema::hasTable('settings')) {
                $tz = \App\Models\Setting::getVal('system_timezone');
                if ($tz) {
                    config(['app.timezone' => $tz]);
                    date_default_timezone_set($tz);
                }
            }
        } catch (\Exception $e) {
            // Prevent boot crashes during initial migrations or console installation
        }
    }
}
