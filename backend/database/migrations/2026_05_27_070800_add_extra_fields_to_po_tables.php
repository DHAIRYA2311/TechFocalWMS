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
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->text('customer_address')->nullable()->after('customer_name');
            $table->string('customer_gstin')->nullable()->after('customer_address');
        });

        Schema::table('po_items', function (Blueprint $table) {
            $table->date('delivery_date')->nullable()->after('description');
            $table->string('hsn_sac')->nullable()->after('delivery_date');
            $table->string('uqc')->default('PC')->nullable()->after('hsn_sac');
            $table->decimal('cgst', 5, 2)->default(0)->after('rate');
            $table->decimal('sgst', 5, 2)->default(0)->after('cgst');
            $table->decimal('igst', 5, 2)->default(0)->after('sgst');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('po_items', function (Blueprint $table) {
            $table->dropColumn(['delivery_date', 'hsn_sac', 'uqc', 'cgst', 'sgst', 'igst']);
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['customer_address', 'customer_gstin']);
        });
    }
};
