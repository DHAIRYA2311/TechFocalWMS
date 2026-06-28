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
        Schema::create('purchase_orders', function (Blueprint $table) {
            $table->id();
            $table->string('po_number');
            $table->date('po_date')->nullable();
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('pdf_path')->nullable();
            $table->string('email_uid')->nullable()->unique();
            $table->enum('status', ['draft_review', 'approved', 'completed'])->default('draft_review');
            $table->timestamps();
        });

        Schema::create('po_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->string('item_code')->nullable();
            $table->text('description');
            $table->decimal('quantity', 12, 2);
            $table->string('unit')->default('Pcs');
            $table->decimal('rate', 12, 2);
            $table->decimal('total_amount', 12, 2);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('po_items');
        Schema::dropIfExists('purchase_orders');
    }
};
