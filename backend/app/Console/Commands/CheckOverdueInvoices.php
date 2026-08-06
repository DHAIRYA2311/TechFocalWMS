<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use App\Models\Invoice;
use App\Services\PushNotificationService;
use Carbon\Carbon;

class CheckOverdueInvoices extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'invoices:check-overdue';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for overdue invoices and send notifications.';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $today = Carbon::today()->toDateString();
        $this->info("Checking for overdue invoices as of {$today}...");

        $overdueInvoices = Invoice::where('payment_status', '!=', 'paid')
            ->whereNotNull('due_date')
            ->whereDate('due_date', '<', $today)
            ->where('status', 'finalized')
            ->get();

        if ($overdueInvoices->isEmpty()) {
            $this->info("No overdue invoices found.");
            return 0;
        }

        foreach ($overdueInvoices as $invoice) {
            $amountLeft = $invoice->grand_total - $invoice->amount_paid;
            
            PushNotificationService::sendToRoles(
                ['admin', 'partner'], // usually partners/admins care about overdue payments
                'Payment Overdue ⚠️',
                "Invoice {$invoice->invoice_number} is overdue by " . Carbon::parse($invoice->due_date)->diffInDays(Carbon::today()) . " days. Remaining: ₹{$amountLeft}",
                'invoice_overdue',
                ['invoice_id' => $invoice->id]
            );
        }

        $this->info("Notifications sent for {$overdueInvoices->count()} overdue invoices.");
        return 0;
    }
}
