<?php

namespace App\Services;

use App\Models\PairedDevice;
use App\Models\User;
use App\Models\Notification;
use App\Models\Setting;
use Illuminate\Support\Facades\Http;
use Exception;

class PushNotificationService
{
    /**
     * Send database and push notification to active users with specified roles.
     *
     * @param array $roles User roles to target (e.g. ['admin', 'manager', 'partner'])
     * @param string $title Notification title
     * @param string $message Notification body message
     * @param string $type Notification type for categorization
     * @param array $data Additional payload data to send along with the notification
     */
    public static function sendToRoles(array $roles, string $title, string $message, string $type, array $data = []): void
    {
        // Check settings overrides before processing
        if (in_array($type, ['purchase_order', 'po_revision', 'po_duplicate'])) {
            $poEnabled = Setting::getVal('notif_po_enabled', 'true') === 'true';
            if (!$poEnabled) {
                return;
            }
        }

        if ($type === 'attendance_reminder') {
            $attEnabled = Setting::getVal('notif_attendance_enabled', 'true') === 'true';
            if (!$attEnabled) {
                return;
            }
        }

        try {
            // 1. Fetch active target users
            $users = User::whereIn('role', $roles)
                ->where('status', 'active')
                ->get();

            if ($users->isEmpty()) {
                return;
            }

            // 2. Create database notifications for all target users
            foreach ($users as $user) {
                Notification::create([
                    'user_id' => $user->id,
                    'title' => $title,
                    'message' => $message,
                    'type' => $type,
                    'data' => json_encode($data)
                ]);
            }

            // 3. Fetch active push tokens from paired devices
            $tokens = PairedDevice::whereIn('user_id', $users->pluck('id'))
                ->whereNotNull('push_token')
                ->where('push_token', '!=', '')
                ->pluck('push_token')
                ->toArray();

            if (empty($tokens)) {
                return;
            }

            // 4. Send notifications via Expo Push API (chunked by 100)
            $chunks = array_chunk($tokens, 100);
            foreach ($chunks as $chunk) {
                $messages = [];
                foreach ($chunk as $token) {
                    $messages[] = [
                        'to' => $token,
                        'title' => $title,
                        'body' => $message,
                        'data' => $data,
                        'sound' => 'default'
                    ];
                }
                Http::post('https://exp.host/--/api/v2/push/send', $messages);
            }
        } catch (Exception $e) {
            logger()->error("PushNotificationService failed: " . $e->getMessage());
        }
    }
}
