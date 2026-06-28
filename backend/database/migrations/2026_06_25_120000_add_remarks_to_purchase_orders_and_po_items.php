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
        // Add PO-level remarks (workshop-wide instructions)
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->text('remarks')->nullable()->after('customer_gstin');
        });

        // Add item-level remarks and manufacturing notes
        Schema::table('po_items', function (Blueprint $table) {
            $table->text('item_remarks')->nullable()->after('total_amount');
            $table->text('manufacturing_notes')->nullable()->after('item_remarks');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn('remarks');
        });

        Schema::table('po_items', function (Blueprint $table) {
            $table->dropColumn(['item_remarks', 'manufacturing_notes']);
        });
    }
};
