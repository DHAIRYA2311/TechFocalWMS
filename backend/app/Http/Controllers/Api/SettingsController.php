<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Setting;
use App\Services\ImapService;
use Illuminate\Http\Request;
use Exception;

class SettingsController extends Controller
{
    /**
     * Retrieve the email connection configuration settings.
     */
    public function getEmailSettings()
    {
        return response()->json([
            'imap_host' => Setting::getVal('imap_host', ''),
            'imap_port' => Setting::getVal('imap_port', '993'),
            'imap_encryption' => Setting::getVal('imap_encryption', 'ssl'),
            'imap_username' => Setting::getVal('imap_username', ''),
            'imap_source_folder' => Setting::getVal('imap_source_folder', 'INBOX'),
            'imap_processed_folder' => Setting::getVal('imap_processed_folder', 'Processed'),
            'imap_subject_filter' => Setting::getVal('imap_subject_filter', 'Purchase Order'),
            'is_password_set' => !empty(Setting::getVal('imap_password')),
        ]);
    }

    /**
     * Store the updated email connection configuration.
     */
    public function saveEmailSettings(Request $request)
    {
        $validated = $request->validate([
            'imap_host' => 'required|string|max:255',
            'imap_port' => 'required|string|max:10',
            'imap_encryption' => 'required|string|in:ssl,tls,none',
            'imap_username' => 'required|string|max:255',
            'imap_source_folder' => 'required|string|max:255',
            'imap_processed_folder' => 'required|string|max:255',
            'imap_subject_filter' => 'nullable|string|max:255',
            'imap_password' => 'nullable|string|max:255',
        ]);

        Setting::setVal('imap_host', $validated['imap_host']);
        Setting::setVal('imap_port', $validated['imap_port']);
        Setting::setVal('imap_encryption', $validated['imap_encryption']);
        Setting::setVal('imap_username', $validated['imap_username']);
        Setting::setVal('imap_source_folder', $validated['imap_source_folder']);
        Setting::setVal('imap_processed_folder', $validated['imap_processed_folder']);
        Setting::setVal('imap_subject_filter', $validated['imap_subject_filter'] ?? null);

        if (!empty($validated['imap_password'])) {
            Setting::setVal('imap_password', $validated['imap_password']);
        }

        return response()->json([
            'message' => 'Email server configurations saved successfully.'
        ]);
    }

    /**
     * Test the connection with the given settings.
     */
    public function testConnection(Request $request)
    {
        $validated = $request->validate([
            'imap_host' => 'required|string|max:255',
            'imap_port' => 'required|string|max:10',
            'imap_encryption' => 'required|string|in:ssl,tls,none',
            'imap_username' => 'required|string|max:255',
            'imap_source_folder' => 'required|string|max:255',
            'imap_password' => 'nullable|string|max:255',
        ]);

        // Backup existing settings
        $backupHost = Setting::getVal('imap_host');
        $backupPort = Setting::getVal('imap_port');
        $backupEnc = Setting::getVal('imap_encryption');
        $backupUser = Setting::getVal('imap_username');
        $backupFolder = Setting::getVal('imap_source_folder');
        $backupPassword = Setting::getVal('imap_password');

        // Apply temporary test settings
        Setting::setVal('imap_host', $validated['imap_host']);
        Setting::setVal('imap_port', $validated['imap_port']);
        Setting::setVal('imap_encryption', $validated['imap_encryption']);
        Setting::setVal('imap_username', $validated['imap_username']);
        Setting::setVal('imap_source_folder', $validated['imap_source_folder']);
        
        // Use new password if provided, otherwise use backed up password
        if (!empty($validated['imap_password'])) {
            Setting::setVal('imap_password', $validated['imap_password']);
        } else {
            Setting::setVal('imap_password', $backupPassword);
        }

        $imap = new ImapService();
        $isConnected = false;
        $errorMessage = '';

        try {
            $isConnected = $imap->connect();
            if (!$isConnected) {
                $errorMessage = $imap->getLastError();
            }
        } catch (Exception $e) {
            $errorMessage = $e->getMessage();
        }

        // Restore backup settings
        Setting::setVal('imap_host', $backupHost);
        Setting::setVal('imap_port', $backupPort);
        Setting::setVal('imap_encryption', $backupEnc);
        Setting::setVal('imap_username', $backupUser);
        Setting::setVal('imap_source_folder', $backupFolder);
        Setting::updateOrCreate(['key' => 'imap_password'], ['value' => $backupPassword ? encrypt($backupPassword) : null]);

        if ($isConnected) {
            return response()->json([
                'success' => true,
                'message' => 'Successfully connected to IMAP mail server.'
            ]);
        } else {
            return response()->json([
                'success' => false,
                'message' => 'Failed to connect: ' . $errorMessage
            ], 400);
        }
    }

    /**
     * Retrieve all business configurations.
     */
    public function getSettings()
    {
        $settings = Setting::all()->pluck('value', 'key');
        return response()->json($settings);
    }

    /**
     * Retrieve current roles and users permissions configuration.
     */
    public function getPermissions()
    {
        $rolePermissions = json_decode(Setting::getVal('role_permissions', '{}'), true);
        $userPermissions = json_decode(Setting::getVal('user_permissions', '{}'), true);
        $users = \App\Models\User::select('id', 'name', 'email', 'role')->get();

        return response()->json([
            'role_permissions' => $rolePermissions,
            'user_permissions' => $userPermissions,
            'users' => $users,
        ]);
    }

    /**
     * Save roles and users permissions configuration.
     */
    public function savePermissions(Request $request)
    {
        $validated = $request->validate([
            'role_permissions' => 'required|array',
            'user_permissions' => 'required|array',
        ]);

        Setting::setVal('role_permissions', json_encode($validated['role_permissions']));
        Setting::setVal('user_permissions', json_encode($validated['user_permissions']));

        return response()->json([
            'message' => 'Permissions updated successfully.'
        ]);
    }

    /**
     * Bulk save business configurations.
     */
    public function saveSettings(Request $request)
    {
        $validated = $request->validate([
            '*' => 'nullable|string'
        ]);

        foreach ($validated as $key => $value) {
            Setting::setVal($key, $value);
        }
        return response()->json([
            'message' => 'Settings saved successfully.'
        ]);
    }
}
