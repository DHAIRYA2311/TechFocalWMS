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

                $smtpHost = \App\Models\Setting::getVal('email_smtp_host');
                if ($smtpHost) {
                    config([
                        'mail.default' => 'smtp',
                        'mail.mailers.smtp.host' => $smtpHost,
                        'mail.mailers.smtp.port' => \App\Models\Setting::getVal('email_smtp_port', 587),
                        'mail.mailers.smtp.encryption' => \App\Models\Setting::getVal('email_smtp_encryption', 'tls'),
                        'mail.mailers.smtp.username' => \App\Models\Setting::getVal('email_smtp_username'),
                        'mail.mailers.smtp.password' => \App\Models\Setting::getVal('email_smtp_password'),
                        'mail.from.address' => \App\Models\Setting::getVal('email_smtp_sender_email', 'notifications@techfocal.in'),
                        'mail.from.name' => \App\Models\Setting::getVal('email_smtp_sender_name', 'TechFocal'),
                    ]);
                }
            }
        } catch (\Exception $e) {
            // Prevent boot crashes during initial migrations or console installation
        }

        $this->configureRateLimiting();
    }

    /**
     * Configure the rate limiters for the application.
     */
    protected function configureRateLimiting(): void
    {
        \Illuminate\Support\Facades\RateLimiter::for('api', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(config('rate_limiting.api_limits', 120))
                ->by($request->user()?->id ?: $request->ip());
        });

        \Illuminate\Support\Facades\RateLimiter::for('public', function (\Illuminate\Http\Request $request) {
            return \Illuminate\Cache\RateLimiting\Limit::perMinute(config('rate_limiting.public_limits', 60))
                ->by($request->ip());
        });
    }
}
