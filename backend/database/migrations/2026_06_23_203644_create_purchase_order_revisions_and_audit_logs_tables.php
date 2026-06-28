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
        Schema::create('purchase_order_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->nullable()->constrained('purchase_orders')->onDelete('cascade');
            $table->string('po_number');
            $table->date('po_date')->nullable();
            $table->string('customer_name');
            $table->string('customer_email')->nullable();
            $table->string('pdf_path')->nullable();
            $table->string('email_uid')->nullable();
            $table->string('status', 50)->default('pending'); // 'pending', 'applied', 'ignored'
            $table->json('extracted_data');
            $table->boolean('has_differences')->default(true);
            $table->timestamps();
        });

        Schema::create('purchase_order_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('purchase_order_id')->constrained('purchase_orders')->onDelete('cascade');
            $table->string('action'); // 'created', 'approved', 'revised_update', 'saved_as_revision_po', 'ignored'
            $table->json('original_version')->nullable();
            $table->json('revised_version')->nullable();
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('user_name')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('purchase_order_audit_logs');
        Schema::dropIfExists('purchase_order_revisions');
    }
};
