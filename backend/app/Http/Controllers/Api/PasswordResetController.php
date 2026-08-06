<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Hash;
use App\Models\User;
use App\Mail\ResetPasswordMail;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;
use App\Services\SecurityLogger;

class PasswordResetController extends Controller
{
    /**
     * Send a reset link to the given user.
     */
    public function sendResetLinkEmail(Request $request)
    {
        $request->validate(['email' => 'required|email']);

        $user = User::where('email', $request->email)->first();

        if (!$user) {
            // Return success even if not found to prevent email enumeration
            return response()->json(['message' => 'If an account with that email exists, a password reset link has been sent.']);
        }

        // Generate token
        $token = Password::broker()->createToken($user);

        // Send email
        Mail::to($user->email)->send(new ResetPasswordMail($token, $user->email));

        SecurityLogger::log('password_reset_requested', 'Auth', $user->id, null, null, 'Password reset link sent', $user);

        return response()->json(['message' => 'If an account with that email exists, a password reset link has been sent.']);
    }

    /**
     * Reset the given user's password.
     */
    public function resetPassword(Request $request)
    {
        $user = User::where('email', $request->email)->first();

        $request->validate([
            'token' => 'required',
            'email' => 'required|email',
            'password' => [
                'required',
                'confirmed',
                \Illuminate\Validation\Rules\Password::min(12)->letters()->mixedCase()->numbers()->symbols(),
                new \App\Rules\NotUsedPassword($user)
            ],
        ]);

        $status = Password::broker()->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function ($user, $password) {
                $user->forceFill([
                    'password' => Hash::make($password)
                ])->setRememberToken(Str::random(60));

                $user->save();

                // Revoke all existing tokens to invalidate old sessions
                $user->tokens()->delete();

                \App\Models\PasswordHistory::create([
                    'user_id' => $user->id,
                    'password_hash' => Hash::make($password)
                ]);

                event(new PasswordReset($user));
            }
        );

        if ($status == Password::PASSWORD_RESET) {
            SecurityLogger::log('password_reset_completed', 'Auth', $user->id, null, null, 'Password successfully reset', $user);
            return response()->json(['message' => 'Password has been successfully reset.']);
        }

        throw ValidationException::withMessages([
            'email' => [trans($status)],
        ]);
    }
}
