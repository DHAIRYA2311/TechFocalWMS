<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;

class MigrateCustomerData extends Command
{
    protected $signature = 'techfocal:migrate-customers';
    protected $description = 'Migrates distinct customer data from purchase_orders into customers table';

    public function handle()
    {
        $this->info("Starting customer data migration...");

        // Get unique customers based on name and email
        $pos = \App\Models\PurchaseOrder::select('customer_name', 'customer_address', 'customer_gstin', 'customer_email')->distinct()->get();
        
        $count = 0;
        foreach ($pos as $po) {
            if (empty($po->customer_name)) continue;

            $customer = \App\Models\Customer::firstOrCreate(
                ['name' => $po->customer_name],
                [
                    'email' => $po->customer_email,
                    'address' => $po->customer_address,
                    'gstin' => $po->customer_gstin
                ]
            );

            // Update all POs with this customer name
            \App\Models\PurchaseOrder::where('customer_name', $po->customer_name)
                ->whereNull('customer_id')
                ->update(['customer_id' => $customer->id]);

            $count++;
        }

        $this->info("Successfully migrated {$count} unique customers and linked them to existing Purchase Orders.");
    }
}
