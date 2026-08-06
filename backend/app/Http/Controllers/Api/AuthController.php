<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use App\Models\Setting;
use PragmaRX\Google2FA\Google2FA;
use App\Services\SecurityLogger;

class AuthController extends Controller
{
    /**
     * Handle user login and token generation.
     */
    public function login(Request $request)
    {
        $validated = $request->validate([
            'email' => 'required|email|max:255',
            'password' => 'required|string|max:255',
        ]);

        $throttleKey = 'login|' . $request->ip() . '|' . $validated['email'];
        if (RateLimiter::tooManyAttempts($throttleKey, 5)) {
            SecurityLogger::log('login_failed_ratelimit', 'Auth', null, null, null, 'Rate limit exceeded for email: ' . $validated['email'], null);
            $seconds = RateLimiter::availableIn($throttleKey);
            throw ValidationException::withMessages([
                'email' => ['Too many login attempts. Please try again in ' . ceil($seconds / 60) . ' minutes.'],
            ]);
        }

        $user = User::where('email', $validated['email'])->first();

        if (! $user || ! Hash::check($validated['password'], $user->password)) {
            RateLimiter::hit($throttleKey, 900); // 15 minutes lockout
            SecurityLogger::log('login_failed', 'Auth', null, null, null, 'Invalid credentials for email: ' . $validated['email'], $user);
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            RateLimiter::hit($throttleKey, 900);
            SecurityLogger::log('login_failed', 'Auth', $user->id, null, null, 'Account is inactive', $user);
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact the administrator.'],
            ]);
        }

        RateLimiter::clear($throttleKey);

        $mfaEnabledGlobally = Setting::getVal('mfa_global_enabled') === 'true';
        $ipWhitelistingEnabled = Setting::getVal('ip_whitelisting_enabled') === 'true';
        $ip = $request->ip();
        
        $isWhitelistedIp = true;
        if ($ipWhitelistingEnabled) {
            $isWhitelistedIp = \App\Models\IpWhitelist::where('ip_address', $ip)->where('is_active', true)->exists();
        }

        $isPrivilegedUser = in_array($user->role, ['admin', 'partner']);
        
        if ($ipWhitelistingEnabled && !$isWhitelistedIp && !$isPrivilegedUser) {
            SecurityLogger::log('unauthorized_login_attempt', 'Auth', $user->id, null, null, "Login blocked from non-whitelisted IP: {$ip}", $user);
            return response()->json([
                'message' => 'Access forbidden from your network.'
            ], 403);
        }

        $forceVerificationDueToIp = $isPrivilegedUser && !$isWhitelistedIp;

        if ($mfaEnabledGlobally || $forceVerificationDueToIp) {
            if ($user->mfa_secret) {
                $mfaToken = Str::random(60);
                \Illuminate\Support\Facades\Cache::put('mfa_login_' . $mfaToken, $user->id, now()->addMinutes(10));
                
                return response()->json([
                    'requires_mfa' => true,
                    'mfa_token' => $mfaToken,
                    'message' => $forceVerificationDueToIp ? 'Unrecognized IP address. Additional verification required.' : null,
                ]);
            } else if ($forceVerificationDueToIp) {
                // If no MFA is setup, fallback to Email OTP
                $otp = random_int(100000, 999999);
                $mfaToken = Str::random(60);
                
                \Illuminate\Support\Facades\Cache::put('email_otp_login_' . $mfaToken, ['user_id' => $user->id, 'otp' => $otp], now()->addMinutes(10));
                
                try {
                    \Illuminate\Support\Facades\Mail::raw(
                        "Your verification code is: {$otp}\n\nThis was requested from an unrecognized IP: {$ip}.",
                        function ($message) use ($user) {
                            $message->to($user->email)->subject('TechFocal - Login Verification Code');
                        }
                    );
                } catch (\Exception $e) {
                    // Log error but proceed
                }
                
                return response()->json([
                    'requires_email_otp' => true,
                    'mfa_token' => $mfaToken,
                    'message' => 'Unrecognized IP address. A verification code has been sent to your email.'
                ]);
            }
        }

        return $this->issueTokenAndResponse($user, $request);
    }

    public function verifyMfaLogin(Request $request)
    {
        $request->validate([
            'mfa_token' => 'required|string',
            'code' => 'required|string|min:6|max:16',
        ]);

        $userId = \Illuminate\Support\Facades\Cache::get('mfa_login_' . $request->mfa_token);
        $emailOtpData = \Illuminate\Support\Facades\Cache::get('email_otp_login_' . $request->mfa_token);

        if (!$userId && !$emailOtpData) {
            return response()->json(['message' => 'MFA session expired. Please login again.'], 400);
        }

        $user = User::find($userId ?? $emailOtpData['user_id']);
        if (!$user) {
            return response()->json(['message' => 'Invalid MFA request.'], 400);
        }

        $valid = false;
        
        if ($emailOtpData) {
            // Verifying Email OTP
            if ($request->code == $emailOtpData['otp']) {
                $valid = true;
            }
        } else {
            // Verifying TOTP or Recovery Code
            if (!$user->mfa_secret) {
                return response()->json(['message' => 'Invalid MFA request.'], 400);
            }
            if (strlen($request->code) == 6 && is_numeric($request->code)) {
                $google2fa = new Google2FA();
                $valid = $google2fa->verifyKey(decrypt($user->mfa_secret), $request->code);
            } else {
                $recoveryCodes = $user->mfa_recovery_codes ? json_decode($user->mfa_recovery_codes, true) : [];
                foreach ($recoveryCodes as $index => $hashedCode) {
                    if (\Illuminate\Support\Facades\Hash::check($request->code, $hashedCode)) {
                        $valid = true;
                        unset($recoveryCodes[$index]);
                        $user->mfa_recovery_codes = json_encode(array_values($recoveryCodes));
                        $user->save();
                        break;
                    }
                }
            }
        }

        if (!$valid) {
            SecurityLogger::log('mfa_failed', 'Auth', $user->id, null, null, 'Invalid authentication code used', $user);
            return response()->json(['message' => 'Invalid authentication or recovery code.'], 400);
        }

        \Illuminate\Support\Facades\Cache::forget('mfa_login_' . $request->mfa_token);
        \Illuminate\Support\Facades\Cache::forget('email_otp_login_' . $request->mfa_token);

        return $this->issueTokenAndResponse($user, $request);
    }

    public function verifyEmailOtpLogin(Request $request)
    {
        $request->validate([
            'mfa_token' => 'required|string',
            'code' => 'required|string|min:6|max:6',
        ]);

        $session = \Illuminate\Support\Facades\Cache::get('email_otp_login_' . $request->mfa_token);
        if (!$session) {
            return response()->json(['message' => 'Verification session expired. Please login again.'], 400);
        }

        if ((string)$session['otp'] !== $request->code) {
            $user = User::find($session['user_id']);
            if ($user) {
                SecurityLogger::log('email_otp_failed', 'Auth', $user->id, null, null, 'Invalid email OTP used', $user);
            }
            return response()->json(['message' => 'Invalid verification code.'], 400);
        }

        $user = User::find($session['user_id']);
        \Illuminate\Support\Facades\Cache::forget('email_otp_login_' . $request->mfa_token);

        return $this->issueTokenAndResponse($user, $request);
    }

    private function issueTokenAndResponse(User $user, Request $request)
    {
        $deviceName = substr($request->userAgent() ?? 'Unknown Device', 0, 255);
        $isNewDevice = !$user->tokens()->where('name', $deviceName)->exists();

        $token = $user->createToken($deviceName)->plainTextToken;

        SecurityLogger::log('login_success', 'Auth', $user->id, null, null, 'Successful login via ' . ($isNewDevice ? 'new device' : 'known device'), $user);

        $mfaEnabledGlobally = Setting::getVal('mfa_global_enabled') === 'true';
        $needsMfaSetup = $mfaEnabledGlobally && !$user->mfa_secret && !$user->mfa_dismissed;

        if ($isNewDevice) {
            try {
                \Illuminate\Support\Facades\Mail::raw(
                    "A new login was detected on your account.\n\nDevice: {$deviceName}\nIP Address: {$request->ip()}\nDate: " . now()->toDayDateTimeString() . "\n\nIf this wasn't you, please secure your account immediately.",
                    function ($message) use ($user) {
                        $message->to($user->email)
                            ->subject('TechFocal - New Login Detected');
                    }
                );
            } catch (\Exception $e) {
                // Ignore mail errors to not break login
            }
        }

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'needs_mfa_setup' => $needsMfaSetup,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'phone' => $user->phone,
                'photo_path' => $user->photo_path,
                'permissions' => [
                    'purchase_orders' => $user->hasPermission('purchase_orders'),
                    'jobs' => $user->hasPermission('jobs'),
                    'payroll' => $user->hasPermission('payroll'),
                    'finance' => $user->hasPermission('finance'),
                    'settings' => $user->hasPermission('settings'),
                ]
            ]
        ]);
    }

    /**
     * Handle user logout and revoke token.
     */
    public function logout(Request $request)
    {
        $user = $request->user();
        if ($user) {
            SecurityLogger::log('logout', 'Auth', $user->id, null, null, 'User logged out', $user);
            $user->currentAccessToken()->delete();
        }

        return response()->json([
            'message' => 'Logged out successfully.'
        ]);
    }

    /**
     * Fetch the authenticated user profile.
     */
    public function me(Request $request)
    {
        $user = $request->user();
        $mfaEnabledGlobally = Setting::getVal('mfa_global_enabled') === 'true';
        $needsMfaSetup = $mfaEnabledGlobally && !$user->mfa_secret && !$user->mfa_dismissed;

        return response()->json([
            'needs_mfa_setup' => $needsMfaSetup,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'phone' => $user->phone,
                'photo_path' => $user->photo_path,
                'permissions' => [
                    'purchase_orders' => $user->hasPermission('purchase_orders'),
                    'jobs' => $user->hasPermission('jobs'),
                    'payroll' => $user->hasPermission('payroll'),
                    'finance' => $user->hasPermission('finance'),
                    'settings' => $user->hasPermission('settings'),
                ]
            ]
        ]);
    }

    /**
     * Get a list of active workers.
     */
    public function getWorkers()
    {
        $workers = User::whereIn('role', ['worker', 'supervisor', 'helper'])
            ->where('status', 'active')
            ->select('id', 'name')
            ->withCount(['jobs as active_jobs_count' => function ($query) {
                $query->whereIn('status', ['in_progress', 'inspection']);
            }])
            ->get();
        return response()->json($workers);
    }
}
