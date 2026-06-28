<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('delivery_challans', function (Blueprint $table) {
            $table->id();
            $table->string('challan_number')->unique();
            $table->date('challan_date');
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('delivery_challan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('delivery_challan_id')->constrained('delivery_challans')->onDelete('cascade');
            $table->foreignId('job_card_id')->constrained('job_cards')->onDelete('cascade');
            $table->foreignId('po_item_id')->constrained('po_items')->onDelete('cascade');
            $table->decimal('quantity_delivered', 12, 2);
            $table->timestamps();
        });

        Schema::create('invoices', function (Blueprint $table) {
            $table->id();
            $table->string('invoice_number')->unique();
            $table->date('invoice_date');
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->foreignId('delivery_challan_id')->nullable()->constrained('delivery_challans')->onDelete('set null');
            $table->decimal('subtotal', 12, 2);
            $table->decimal('cgst_total', 12, 2)->default(0);
            $table->decimal('sgst_total', 12, 2)->default(0);
            $table->decimal('igst_total', 12, 2)->default(0);
            $table->decimal('grand_total', 12, 2);
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('invoice_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('invoice_id')->constrained('invoices')->onDelete('cascade');
            $table->foreignId('po_item_id')->constrained('po_items')->onDelete('cascade');
            $table->foreignId('job_card_id')->nullable()->constrained('job_cards')->onDelete('set null');
            $table->decimal('quantity', 12, 2);
            $table->decimal('rate', 12, 2);
            $table->decimal('cgst_rate', 5, 2)->default(0);
            $table->decimal('sgst_rate', 5, 2)->default(0);
            $table->decimal('igst_rate', 5, 2)->default(0);
            $table->decimal('cgst_amount', 12, 2)->default(0);
            $table->decimal('sgst_amount', 12, 2)->default(0);
            $table->decimal('igst_amount', 12, 2)->default(0);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('invoice_items');
        Schema::dropIfExists('invoices');
        Schema::dropIfExists('delivery_challan_items');
        Schema::dropIfExists('delivery_challans');
    }
};
