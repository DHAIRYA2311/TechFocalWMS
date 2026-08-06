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
        // Granular settings dictionary mapping notification types to their Setting key
        $settingKeyMap = [
            // Purchase Orders
            'purchase_order' => 'notif_po_new',
            'purchase_order_approved' => 'notif_po_accepted',
            'purchase_order_rejected' => 'notif_po_rejected',
            'purchase_order_review' => 'notif_po_review',
            'purchase_order_edited' => 'notif_po_edited',
            'purchase_order_fail' => 'notif_po_failed',
            'po_duplicate' => 'notif_po_duplicate',
            'po_revision' => 'notif_po_edited', // groups with edited
            
            // Invoices
            'invoice_generated' => 'notif_inv_generated',
            'invoice_payment' => 'notif_inv_payment',
            'invoice_overdue' => 'notif_inv_overdue',
            'invoice_cancelled' => 'notif_inv_cancelled',
            'invoice_edited' => 'notif_inv_edited',
            
            // Attendance
            'attendance_reminder' => 'notif_att_reminder',
            'attendance_late' => 'notif_att_late',
            'attendance_correction' => 'notif_att_correction',
            
            // Jobs and Operations
            'machine_maintenance_req' => 'notif_machine_maint',
            'machine_idle' => 'notif_machine_idle',
            'job_delayed' => 'notif_job_delayed',
            'low_inventory' => 'notify_inventory',
            'workshop_alert_email_sync' => 'notif_email_sync_failed',
        ];

        // Check if a granular setting exists for this notification type
        $settingKey = $settingKeyMap[$type] ?? null;
        if ($settingKey) {
            $isEnabled = Setting::getVal($settingKey, 'true') === 'true';
            if (!$isEnabled) {
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
