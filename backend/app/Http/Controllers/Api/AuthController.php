<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    /**
     * Handle user login and token generation.
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required|string',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            throw ValidationException::withMessages([
                'email' => ['The provided credentials do not match our records.'],
            ]);
        }

        if ($user->status !== 'active') {
            throw ValidationException::withMessages([
                'email' => ['Your account is inactive. Please contact the administrator.'],
            ]);
        }

        // Keep existing tokens to allow concurrent sessions across multiple devices
        // $user->tokens()->delete();

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'access_token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'phone' => $user->phone,
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
        $request->user()->currentAccessToken()->delete();

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
        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
                'status' => $user->status,
                'phone' => $user->phone,
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
            ->get();
        return response()->json($workers);
    }
}
