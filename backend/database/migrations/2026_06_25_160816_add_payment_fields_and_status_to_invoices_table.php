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
        Schema::table('invoices', function (Blueprint $table) {
            $table->string('status')->default('unpaid');
            $table->string('payment_method')->nullable();
            $table->string('transaction_reference')->nullable();
            $table->date('payment_date')->nullable();
            $table->text('payment_remarks')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['status', 'payment_method', 'transaction_reference', 'payment_date', 'payment_remarks']);
        });
    }
};
