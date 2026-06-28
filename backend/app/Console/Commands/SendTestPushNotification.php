<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\PairedDevice;
use Illuminate\Support\Facades\Http;

class SendTestPushNotification extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'push:test {--token= : Send to a specific Expo push token} {--title=Test Notification : The notification title} {--body=This is a test notification from the backend! : The notification body}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Send a test push notification to paired devices via Expo';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $specificToken = $this->option('token');
        $title = $this->option('title');
        $body = $this->option('body');

        if ($specificToken) {
            $tokens = [$specificToken];
        } else {
            $tokens = PairedDevice::whereNotNull('push_token')
                ->where('push_token', '!=', '')
                ->pluck('push_token')
                ->toArray();
        }

        if (empty($tokens)) {
            $this->error("No active push tokens found in the database!");
            $this->line("Please make sure your phone is running the custom Development Build APK (not Expo Go) and has granted notification permissions.");
            return 1;
        }

        $this->info("Sending test push notification to " . count($tokens) . " device(s)...");

        $messages = [];
        foreach ($tokens as $token) {
            $messages[] = [
                'to' => $token,
                'title' => $title,
                'body' => $body,
                'data' => ['test' => true],
                'sound' => 'default'
            ];
            $this->line("Target token: {$token}");
        }

        try {
            $response = Http::post('https://exp.host/--/api/v2/push/send', $messages);
            if ($response->successful()) {
                $this->info("Request sent successfully to Expo!");
                $this->line($response->body());
            } else {
                $this->error("Failed to send request. HTTP Status: " . $response->status());
                $this->line($response->body());
            }
        } catch (\Exception $e) {
            $this->error("Error sending push notification: " . $e->getMessage());
        }

        return 0;
    }
}
