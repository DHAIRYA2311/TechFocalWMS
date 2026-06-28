<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Services\ImapService;

class FetchEmailsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'email:fetch-pos';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Fetch Purchase Orders from IMAP inbox and parse attached PDFs';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Connecting to IMAP server...");

        $imap = new ImapService();

        try {
            $result = $imap->fetchPurchaseOrders();
            $this->info($result['message']);
        } catch (\Exception $e) {
            $this->error("Error executing email fetcher: " . $e->getMessage());
        }
    }
}
