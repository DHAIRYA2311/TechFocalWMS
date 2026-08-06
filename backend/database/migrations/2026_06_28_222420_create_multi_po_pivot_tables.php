<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // 1. Create purchase_order_invoice pivot table
        Schema::create('purchase_order_invoice', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['purchase_order_id', 'invoice_id'], 'po_invoice_unique');
        });

        // 2. Create purchase_order_delivery_challan pivot table
        Schema::create('purchase_order_delivery_challan', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->foreignId('delivery_challan_id')->constrained('delivery_challans')->onDelete('cascade');
            $table->timestamps();

            $table->unique(['purchase_order_id', 'delivery_challan_id'], 'po_dc_unique');
        });

        // 3. Migrate existing invoice relationships to pivot
        $invoices = DB::table('invoices')->whereNotNull('purchase_order_id')->get();
        foreach ($invoices as $invoice) {
            DB::table('purchase_order_invoice')->insertOrIgnore([
                'purchase_order_id' => $invoice->purchase_order_id,
                'invoice_id' => $invoice->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        // 4. Migrate existing delivery challan relationships to pivot
        $challans = DB::table('delivery_challans')->whereNotNull('purchase_order_id')->get();
        foreach ($challans as $challan) {
            DB::table('purchase_order_delivery_challan')->insertOrIgnore([
                'purchase_order_id' => $challan->purchase_order_id,
                'delivery_challan_id' => $challan->id,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_invoice');
        Schema::dropIfExists('purchase_order_delivery_challan');
    }
};
