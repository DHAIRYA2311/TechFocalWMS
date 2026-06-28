<?php

namespace App\Http\Middleware;

use App\Models\PairedDevice;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class UpdateDeviceActivity
{
    /**
     * Handle an incoming request.
     *
     * @param  Closure(Request): (Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();
        if ($user && method_exists($user, 'currentAccessToken')) {
            $token = $user->currentAccessToken();
            if ($token && isset($token->id)) {
                PairedDevice::where('token_id', $token->id)->update([
                    'last_active_at' => now()
                ]);
            }
        }

        return $next($request);
    }
}
