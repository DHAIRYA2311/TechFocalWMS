<?php

return [

    /*
    |--------------------------------------------------------------------------
    | API Rate Limiting Thresholds
    |--------------------------------------------------------------------------
    |
    | These options control the rate limiting across various endpoint types.
    |
    */

    // Looser limits for authenticated users
    'api_limits' => env('RATE_LIMIT_API_ATTEMPTS', 120),

    // Moderate limits for public/unauthenticated endpoints
    'public_limits' => env('RATE_LIMIT_PUBLIC_ATTEMPTS', 60),

    // Stricter limits for authentication endpoints (e.g., login, password reset)
    'auth' => [
        // Number of attempts allowed before backoff kicks in
        'max_attempts' => env('RATE_LIMIT_AUTH_ATTEMPTS', 5),
        
        // Base multiplier for the exponential backoff calculation (minutes)
        // wait_time = base ^ (attempts - max_attempts)
        'backoff_base' => env('RATE_LIMIT_AUTH_BACKOFF_BASE', 2),
    ],

];
