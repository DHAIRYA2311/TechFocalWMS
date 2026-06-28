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
        Schema::create('incoming_challans', function (Blueprint $table) {
            $table->id();
            $table->string('challan_number');
            $table->date('challan_date');
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->string('pdf_path')->nullable();
            $table->foreignId('received_by')->constrained('users')->onDelete('cascade');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });

        Schema::create('incoming_challan_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('incoming_challan_id')->constrained('incoming_challans')->onDelete('cascade');
            $table->foreignId('po_item_id')->constrained('po_items')->onDelete('cascade');
            $table->decimal('quantity_received', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('incoming_challan_items');
        Schema::dropIfExists('incoming_challans');
    }
};
