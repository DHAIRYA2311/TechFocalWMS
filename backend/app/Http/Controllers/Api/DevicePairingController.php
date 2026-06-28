<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PairedDevice;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class DevicePairingController extends Controller
{
    /**
     * Generate or retrieve the active temporary pairing session (QR & PIN) for the user.
     */
    public function getSession(Request $request)
    {
        $userId = $request->user()->id;
        $sessionKey = "user_pairing_session:{$userId}";
        $session = Cache::get($sessionKey);
        $refresh = $request->query('refresh') === 'true';

        if ($refresh && $session) {
            Cache::forget("pairing_qr:{$session['qr_token']}");
            Cache::forget("pairing_pin:{$session['pin_code']}");
            Cache::forget($sessionKey);
            $session = null;
        }

        if (!$session) {
            $qrToken = 'pair_' . Str::random(40);
            
            // Ensure PIN is unique across active pairing codes in cache
            do {
                $pinCode = str_pad(random_int(100000, 999999), 6, '0', STR_PAD_LEFT);
            } while (Cache::has("pairing_pin:{$pinCode}"));

            $expiresAt = time() + 120; // 2 minutes

            $session = [
                'qr_token' => $qrToken,
                'pin_code' => $pinCode,
                'user_id' => $userId,
                'expires_at' => $expiresAt,
            ];

            // Store the session for the user
            Cache::put($sessionKey, $session, 120);

            // Store cross-references for the public lookup
            Cache::put("pairing_qr:{$qrToken}", $userId, 120);
            Cache::put("pairing_pin:{$pinCode}", $userId, 120);
        }

        $session['expires_in'] = max(0, $session['expires_at'] - time());

        return response()->json($session);
    }

    /**
     * Public endpoint to verify a device QR code or PIN and register the device.
     */
    public function pair(Request $request)
    {
        $request->validate([
            'pairing_method' => 'required|string|in:qr,pin',
            'token' => 'required|string',
            'device_name' => 'required|string',
            'device_id' => 'required|string',
        ]);

        $method = $request->input('pairing_method');
        $token = $request->input('token');
        $deviceName = $request->input('device_name');
        $deviceId = $request->input('device_id');

        if ($method === 'qr') {
            $userId = Cache::get("pairing_qr:{$token}");
        } else {
            $userId = Cache::get("pairing_pin:{$token}");
        }

        if (!$userId) {
            return response()->json(['message' => 'Invalid or expired pairing code.'], 403);
        }

        $user = User::find($userId);
        if (!$user) {
            return response()->json(['message' => 'User account not found.'], 404);
        }

        // Create long-lived personal access token
        $tokenResult = $user->createToken($deviceName);
        $plainTextToken = $tokenResult->plainTextToken;

        // Register/update device entry
        $device = PairedDevice::updateOrCreate(
            ['device_id' => $deviceId],
            [
                'user_id' => $user->id,
                'token_id' => $tokenResult->accessToken->id,
                'device_name' => $deviceName,
                'last_active_at' => now(),
            ]
        );

        // Clear pairing session cache immediately after successful pairing
        $sessionKey = "user_pairing_session:{$userId}";
        $session = Cache::get($sessionKey);
        if ($session) {
            Cache::forget("pairing_qr:{$session['qr_token']}");
            Cache::forget("pairing_pin:{$session['pin_code']}");
            Cache::forget($sessionKey);
        }

        return response()->json([
            'token' => $plainTextToken,
            'device' => $device,
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->role,
            ]
        ]);
    }

    /**
     * List all paired devices.
     */
    public function listDevices()
    {
        $devices = PairedDevice::with('user:id,name')
            ->orderBy('updated_at', 'desc')
            ->get();

        return response()->json($devices);
    }

    /**
     * Revoke access for a paired device.
     */
    public function revokeDevice($id)
    {
        $device = PairedDevice::findOrFail($id);

        if ($device->token_id) {
            \DB::table('personal_access_tokens')->where('id', $device->token_id)->delete();
        }

        $device->delete();

        return response()->json([
            'message' => 'Device access has been successfully revoked.'
        ]);
    }

    /**
     * Register or update the device's push token.
     */
    public function registerPush(Request $request)
    {
        $request->validate([
            'device_id' => 'required|string',
            'push_token' => 'required|string',
        ]);

        $device = PairedDevice::where('device_id', $request->device_id)->first();
        if (!$device) {
            return response()->json(['message' => 'Device not found.'], 404);
        }

        $device->update([
            'push_token' => $request->push_token,
        ]);

        return response()->json([
            'message' => 'Push token registered successfully.',
            'device' => $device
        ]);
    }
}

