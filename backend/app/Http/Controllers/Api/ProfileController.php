<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use App\Models\PasswordHistory;
use App\Services\SecurityLogger;
use App\Services\SecureFileUploadService;

class ProfileController extends Controller
{
    /**
     * Get the authenticated user's profile.
     */
    public function show(Request $request)
    {
        return response()->json($request->user());
    }

    /**
     * Update the authenticated user's profile details.
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'phone' => 'nullable|string|max:20',
        ]);

        $oldData = $user->getOriginal();
        $user->name = $validated['name'];
        $user->phone = $validated['phone'] ?? null;
        $user->save();

        SecurityLogger::log('profile_updated', 'Users', $user->id, $oldData, $user->toArray(), 'User updated their profile details', $user);

        return response()->json([
            'message' => 'Profile updated successfully.',
            'user' => $user
        ]);
    }

    /**
     * Change the authenticated user's password.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'new_password' => [
                'required',
                'string',
                'confirmed',
                \Illuminate\Validation\Rules\Password::min(12)->letters()->mixedCase()->numbers()->symbols(),
                new \App\Rules\NotUsedPassword($user)
            ],
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            return response()->json(['message' => 'The provided current password does not match our records.'], 400);
        }

        $user->password = Hash::make($validated['new_password']);
        $user->save();

        // Revoke all existing tokens to invalidate old sessions
        $user->tokens()->delete();

        PasswordHistory::create([
            'user_id' => $user->id,
            'password_hash' => Hash::make($validated['new_password'])
        ]);

        SecurityLogger::log('password_changed', 'Auth', $user->id, null, null, 'User changed their password from Profile Settings', $user);

        return response()->json([
            'message' => 'Password changed successfully.'
        ]);
    }

    /**
     * Deactivate MFA for the authenticated user.
     */
    public function deactivateMfa(Request $request)
    {
        $user = $request->user();
        
        $validated = $request->validate([
            'password' => 'required|string',
        ]);

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Incorrect password.'], 400);
        }

        $user->mfa_secret = null;
        $user->mfa_recovery_codes = null;
        $user->save();

        return response()->json([
            'message' => 'Two-Factor Authentication has been successfully deactivated.'
        ]);
    }
    /**
     * Upload and update user profile photo.
     */
    public function uploadPhoto(Request $request)
    {
        $request->validate([
            'photo' => 'required|image|mimes:jpeg,png,jpg|max:2048',
        ]);

        $user = $request->user();

        if ($request->hasFile('photo')) {
            // Delete old photo
            if ($user->photo_path && str_starts_with($user->photo_path, 'photos/')) {
                SecureFileUploadService::delete($user->photo_path, 'public');
            } else if ($user->photo_path && \Illuminate\Support\Facades\File::exists(public_path($user->photo_path))) {
                \Illuminate\Support\Facades\File::delete(public_path($user->photo_path));
            }

            try {
                $path = SecureFileUploadService::upload($request->file('photo'), 'photos', 'public');
                $user->photo_path = $path; // 'photos/filename.jpg'
                $user->save();
            } catch (\Exception $e) {
                return response()->json(['message' => 'Failed to upload photo: ' . $e->getMessage()], 400);
            }

            return response()->json([
                'message' => 'Profile photo updated successfully.',
                'photo_path' => $user->photo_path
            ]);
        }

        return response()->json(['message' => 'No photo provided.'], 400);
    }
}
