<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;
use Illuminate\Validation\ValidationException;
use Illuminate\Auth\AuthenticationException;
use Sentry\Laravel\Integration;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        channels: __DIR__.'/../routes/channels.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->api(append: [
            \App\Http\Middleware\RequireWhitelistedIp::class,
        ]);
        $middleware->alias([
            'throttle.auth.exponential' => \App\Http\Middleware\ExponentialAuthThrottle::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        Integration::handles($exceptions);

        $exceptions->render(function (Throwable $e, Request $request) {
            if ($request->is('api/*')) {
                if ($e instanceof ValidationException || $e instanceof AuthenticationException) {
                    return null; // Allow default Laravel JSON response for expected client errors
                }

                $statusCode = 500;
                $message = 'An unexpected server error occurred. Our team has been notified.';

                if ($e instanceof HttpExceptionInterface) {
                    $statusCode = $e->getStatusCode();
                    // Some HTTP exceptions have generic messages (e.g. 404 Not Found), which are safe
                    $message = $e->getMessage() ?: $message;
                }

                // Prevent raw DB exceptions, file paths, or stack traces from reaching the client
                return response()->json([
                    'message' => $message,
                ], $statusCode);
            }
            return null;
        });

        $exceptions->reportable(function (Throwable $e) {
            try {
                \App\Services\PushNotificationService::sendToRoles(
                    ['admin', 'partner'],
                    'System Error ⚠️',
                    "An unexpected error occurred: " . substr($e->getMessage(), 0, 100),
                    'workshop_alert_error'
                );
            } catch (\Exception $ex) {
                // Ignore to avoid infinite loops if the notification system itself fails
            }
        });
    })->create();
