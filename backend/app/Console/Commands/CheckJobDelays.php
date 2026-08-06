<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\JobCard;
use App\Services\PushNotificationService;
use Carbon\Carbon;

class CheckJobDelays extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'jobs:check-delays';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for delayed jobs and notify managers.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Checking for delayed jobs...");
        $today = Carbon::today()->toDateString();

        $delayedJobs = JobCard::with(['poItem.purchaseOrder'])
            ->whereIn('status', ['pending', 'in_progress', 'inspection'])
            ->whereHas('poItem', function ($q) use ($today) {
                $q->whereNotNull('delivery_date')
                  ->whereDate('delivery_date', '<', $today);
            })
            ->get();

        if ($delayedJobs->isEmpty()) {
            $this->info("No delayed jobs found.");
            return 0;
        }

        foreach ($delayedJobs as $job) {
            $customer = $job->poItem->purchaseOrder->customer_name ?? 'Unknown';
            PushNotificationService::sendToRoles(
                ['admin', 'manager', 'supervisor'],
                'Job Delay Alert ⏳',
                "Job {$job->job_card_number} for {$customer} is past its delivery date.",
                'workshop_alert_job_delay',
                ['job_id' => $job->id]
            );
        }

        $this->info("Notifications sent for {$delayedJobs->count()} delayed jobs.");
        return 0;
    }
}
