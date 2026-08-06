<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\JobCard;
use Carbon\Carbon;

class ArchiveDeliveredJobs extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'jobs:archive-delivered';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Automatically archive jobs that were delivered more than 24 hours ago.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Checking for delivered jobs to archive...");
        
        $threshold = Carbon::now()->subHours(24);

        // Find jobs that are not archived and have a delivery challan created > 24h ago
        $jobsToArchive = JobCard::where('is_archived', false)
            ->whereHas('deliveryChallanItem', function ($query) use ($threshold) {
                $query->whereHas('deliveryChallan', function ($q) use ($threshold) {
                    $q->whereNull('cancelled_at')
                      ->where('created_at', '<=', $threshold);
                });
            })
            ->get();

        if ($jobsToArchive->isEmpty()) {
            $this->info("No delivered jobs found that are older than 24 hours.");
            return 0;
        }

        foreach ($jobsToArchive as $job) {
            $job->update([
                'is_archived' => true,
                'archived_at' => Carbon::now(),
                'archived_by' => 1 // Assuming 1 is system admin/owner
            ]);
            
            $this->info("Archived JobCard ID: {$job->id}");
        }

        $this->info("Successfully archived {$jobsToArchive->count()} job(s).");
        return 0;
    }
}
