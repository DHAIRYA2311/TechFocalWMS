<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\SecurityLogger;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class MaintenanceController extends Controller
{
    /**
     * Get the public status of the website (maintenance mode).
     * Hide sensitive information like access code.
     */
    public function status(Request $request)
    {
        $enabled = Setting::getVal('maintenance_enabled', 'false') === 'true';

        if (!$enabled) {
            return response()->json(['enabled' => false]);
        }

        return response()->json([
            'enabled' => true,
            'title' => Setting::getVal('maintenance_title', 'Website Under Maintenance'),
            'description' => Setting::getVal('maintenance_description', "We're currently improving our website. Please check back later."),
            'estimated_launch' => Setting::getVal('maintenance_launch_date'),
            'bg_image' => Setting::getVal('maintenance_bg_image'),
            'show_socials' => Setting::getVal('maintenance_show_socials', 'true') === 'true',
            'show_contact' => Setting::getVal('maintenance_show_contact', 'true') === 'true',
            'show_timer' => Setting::getVal('maintenance_show_timer', 'false') === 'true',
        ]);
    }

    /**
     * Verify the private preview access code.
     */
    public function verify(Request $request)
    {
        $request->validate([
            'access_code' => 'required|string',
        ]);

        $enabled = Setting::getVal('maintenance_enabled', 'false') === 'true';
        if (!$enabled) {
            return response()->json(['message' => 'Maintenance mode is not enabled.'], 400);
        }

        $correctCode = Setting::getVal('maintenance_access_code');
        $expiresAt = Setting::getVal('maintenance_code_expires_at');

        if ($expiresAt && now()->isAfter($expiresAt)) {
            SecurityLogger::log('preview_access_failed', 'Maintenance', null, null, null, 'Attempted preview access with expired code', null);
            return response()->json(['message' => 'Access code has expired.'], 403);
        }

        if ($correctCode && hash_equals($correctCode, $request->access_code)) {
            // Success
            $previewToken = Str::random(64);
            // We can just set a flag or a generic token for the frontend to store in localstorage
            SecurityLogger::log('preview_access_success', 'Maintenance', null, null, null, 'Successful preview access', null);

            return response()->json([
                'message' => 'Access granted.',
                'preview_token' => $previewToken // Frontend will store this in cookie/localstorage
            ]);
        }

        // Failure
        SecurityLogger::log('preview_access_failed', 'Maintenance', null, null, null, 'Failed preview access with incorrect code', null);
        return response()->json(['message' => 'Invalid access code.'], 403);
    }

    /**
     * Get admin settings for maintenance mode.
     */
    public function getAdminSettings()
    {
        return response()->json([
            'maintenance_enabled' => Setting::getVal('maintenance_enabled', 'false') === 'true',
            'maintenance_title' => Setting::getVal('maintenance_title', 'Website Under Maintenance'),
            'maintenance_description' => Setting::getVal('maintenance_description', "We're currently improving our website. Please check back later."),
            'maintenance_launch_date' => Setting::getVal('maintenance_launch_date'),
            'maintenance_bg_image' => Setting::getVal('maintenance_bg_image'),
            'maintenance_show_socials' => Setting::getVal('maintenance_show_socials', 'true') === 'true',
            'maintenance_show_contact' => Setting::getVal('maintenance_show_contact', 'true') === 'true',
            'maintenance_show_timer' => Setting::getVal('maintenance_show_timer', 'false') === 'true',
            'maintenance_access_code' => Setting::getVal('maintenance_access_code'),
            'maintenance_code_expires_at' => Setting::getVal('maintenance_code_expires_at'),
        ]);
    }

    /**
     * Save admin settings for maintenance mode.
     */
    public function saveAdminSettings(Request $request)
    {
        $validated = $request->validate([
            'maintenance_enabled' => 'required|boolean',
            'maintenance_title' => 'nullable|string|max:255',
            'maintenance_description' => 'nullable|string|max:1000',
            'maintenance_launch_date' => 'nullable|date',
            'maintenance_bg_image' => 'nullable|string',
            'maintenance_show_socials' => 'required|boolean',
            'maintenance_show_contact' => 'required|boolean',
            'maintenance_show_timer' => 'required|boolean',
            'maintenance_access_code' => 'nullable|string|max:255',
            'maintenance_code_expires_at' => 'nullable|date',
        ]);

        Setting::setVal('maintenance_enabled', $validated['maintenance_enabled'] ? 'true' : 'false');
        Setting::setVal('maintenance_title', $validated['maintenance_title']);
        Setting::setVal('maintenance_description', $validated['maintenance_description']);
        Setting::setVal('maintenance_launch_date', $validated['maintenance_launch_date']);
        Setting::setVal('maintenance_bg_image', $validated['maintenance_bg_image']);
        Setting::setVal('maintenance_show_socials', $validated['maintenance_show_socials'] ? 'true' : 'false');
        Setting::setVal('maintenance_show_contact', $validated['maintenance_show_contact'] ? 'true' : 'false');
        Setting::setVal('maintenance_show_timer', $validated['maintenance_show_timer'] ? 'true' : 'false');
        Setting::setVal('maintenance_access_code', $validated['maintenance_access_code']);
        Setting::setVal('maintenance_code_expires_at', $validated['maintenance_code_expires_at']);

        return response()->json([
            'message' => 'Maintenance mode settings saved successfully.'
        ]);
    }
}
