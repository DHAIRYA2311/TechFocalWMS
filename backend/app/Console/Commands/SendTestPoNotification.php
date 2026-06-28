<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\PairedDevice;
use App\Models\Notification;
use Illuminate\Support\Facades\Http;
use Exception;

class SendTestPoNotification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'push:test-po {--po-number=TEST-1001 : The PO Number to simulate} {--customer=ACME Industries : The customer name}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Simulate a new Purchase Order receipt and trigger the database and push notification logic';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $poNumber = $this->option('po-number');
        $customer = $this->option('customer');

        $this->info("Simulating new Purchase Order receipt...");
        $this->line("PO Number: {$poNumber}");
        $this->line("Customer: {$customer}");

        // 1. Create a dummy/test Purchase Order in the database
        $po = PurchaseOrder::create([
            'po_number' => $poNumber,
            'po_date' => date('Y-m-d'),
            'customer_name' => $customer,
            'customer_address' => '123 Test Street, Industrial Zone',
            'customer_gstin' => '27AAACT1234A1Z1',
            'customer_email' => 'test-customer@example.com',
            'status' => 'draft_review',
        ]);

        $this->info("Simulated PO created in database with ID: {$po->id}");

        try {
            // Find all active admin, manager, and partner users
            $users = User::whereIn('role', ['admin', 'manager', 'partner'])
                ->where('status', 'active')
                ->get();

            $this->info("Found " . count($users) . " active admin/manager/partner user(s).");

            foreach ($users as $user) {
                // Create database notification
                Notification::create([
                    'user_id' => $user->id,
                    'title' => 'New Purchase Order Received',
                    'message' => "PO-{$po->po_number} from {$po->customer_name}",
                    'type' => 'purchase_order',
                    'data' => json_encode(['po_id' => $po->id])
                ]);
                $this->line("  Created database notification for user: {$user->name} (Role: {$user->role})");
            }

            // Fetch active push tokens
            $tokens = PairedDevice::whereIn('user_id', $users->pluck('id'))
                ->whereNotNull('push_token')
                ->where('push_token', '!=', '')
                ->pluck('push_token')
                ->toArray();

            if (empty($tokens)) {
                $this->warn("No active push tokens found for these users in the database!");
                return 0;
            }

            $this->info("Sending push notification to " . count($tokens) . " device(s)...");

            $messages = [];
            foreach ($tokens as $token) {
                $messages[] = [
                    'to' => $token,
                    'title' => 'New Purchase Order Received 📥',
                    'body' => "PO-{$po->po_number} from {$po->customer_name}",
                    'data' => ['po_id' => $po->id],
                    'sound' => 'default'
                ];
                $this->line("  Targeting device token: {$token}");
            }

            // Send via Expo Push Notification API
            $response = Http::post('https://exp.host/--/api/v2/push/send', $messages);
            
            if ($response->successful()) {
                $this->info("Push notification request successfully sent to Expo!");
                $this->line($response->body());
            } else {
                $this->error("Failed to send push request. Status: " . $response->status());
                $this->line($response->body());
            }

        } catch (Exception $e) {
            $this->error("Error executing notification simulation: " . $e->getMessage());
        }

        return 0;
    }
}
