<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;
use Symfony\Component\HttpFoundation\Response;
use Illuminate\Http\Exceptions\ThrottleRequestsException;

class ExponentialAuthThrottle
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $maxAttempts = config('rate_limiting.auth.max_attempts', 5);
        $backoffBase = config('rate_limiting.auth.backoff_base', 2);
        
        $ipKey = 'auth_throttle_ip:' . $request->ip();
        $emailKey = 'auth_throttle_email:' . strtolower($request->input('email', ''));

        // Check if either key is currently locked out
        if (RateLimiter::tooManyAttempts($ipKey, $maxAttempts)) {
            $this->throwThrottleException($ipKey);
        }

        if ($request->filled('email') && RateLimiter::tooManyAttempts($emailKey, $maxAttempts)) {
            $this->throwThrottleException($emailKey);
        }

        $response = $next($request);

        // If the login was successful (usually 200 OK with a token), clear the limiters
        if ($response->getStatusCode() >= 200 && $response->getStatusCode() < 300 && !$response->exception) {
            RateLimiter::clear($ipKey);
            if ($request->filled('email')) {
                RateLimiter::clear($emailKey);
            }
            return $response;
        }

        // If it failed (e.g., 422 Validation Error on credentials), increment the attempt counters.
        // Calculate dynamic decay based on current attempts
        $ipAttempts = RateLimiter::attempts($ipKey) + 1;
        $ipDecaySeconds = $this->calculateDecaySeconds($ipAttempts, $maxAttempts, $backoffBase);
        RateLimiter::hit($ipKey, $ipDecaySeconds);

        if ($request->filled('email')) {
            $emailAttempts = RateLimiter::attempts($emailKey) + 1;
            $emailDecaySeconds = $this->calculateDecaySeconds($emailAttempts, $maxAttempts, $backoffBase);
            RateLimiter::hit($emailKey, $emailDecaySeconds);
        }

        return $response;
    }

    /**
     * Calculate exponential decay time in seconds.
     */
    protected function calculateDecaySeconds(int $attempts, int $maxAttempts, int $base): int
    {
        if ($attempts <= $maxAttempts) {
            return 60; // Standard 1 minute before max attempts is reached
        }

        // Exponential backoff: base ^ (attempts - maxAttempts) in minutes
        $exponent = $attempts - $maxAttempts;
        $minutes = pow($base, $exponent);
        
        // Cap the maximum wait time to 24 hours to prevent extreme lockouts
        $maxMinutes = 24 * 60;
        if ($minutes > $maxMinutes) {
            $minutes = $maxMinutes;
        }

        return $minutes * 60;
    }

    /**
     * Throw standard throttle exception with Retry-After header.
     */
    protected function throwThrottleException(string $key)
    {
        $seconds = RateLimiter::availableIn($key);
        $headers = [
            'Retry-After' => $seconds,
            'X-RateLimit-Reset' => time() + $seconds,
        ];

        throw new ThrottleRequestsException('Too many authentication attempts. Please try again later.', null, $headers);
    }
}
