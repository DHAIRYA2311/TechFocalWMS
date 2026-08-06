<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Setting;
use App\Models\IpWhitelist;
use App\Services\SecurityLogger;
use Illuminate\Support\Facades\Log;

class RequireWhitelistedIp
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $enabled = Setting::where('key', 'ip_whitelisting_enabled')->value('value') === 'true';

        if (!$enabled) {
            return $next($request);
        }

        $ip = $request->ip();

        // Check if IP is in the active whitelist
        $isWhitelisted = IpWhitelist::where('ip_address', $ip)->where('is_active', true)->exists();

        // If the route is an unauthenticated route (like login), we let AuthController handle the logic 
        // to enforce MFA for Admins/Partners instead of completely blocking them here.
        // Or we block everyone here UNLESS they are trying to login?
        // Wait, if it's the login route, we can't know their role until they authenticate.
        // Thus, we shouldn't block the `/api/login` route here. 
        if ($request->is('api/login*')) {
            return $next($request);
        }

        if ($request->user()) {
            $role = $request->user()->role;
            if (in_array($role, ['admin', 'partner'])) {
                // Admin and Partner are exempt from being blocked directly by middleware.
                // Their MFA enforcement happens at login.
                return $next($request);
            }
        }

        if (!$isWhitelisted) {
            $userId = $request->user() ? $request->user()->id : null;
            SecurityLogger::log('unauthorized_ip_access', 'Auth', $userId, null, null, "Access denied from non-whitelisted IP: {$ip}");
            return response()->json(['message' => 'Access forbidden from your network.'], 403);
        }

        return $next($request);
    }
}
