<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Make incoming_challan_item_id nullable on job_cards
     * so that Jobs can be created directly from a PO without a challan.
     */
    public function up(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            $table->unsignedBigInteger('incoming_challan_item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            $table->unsignedBigInteger('incoming_challan_item_id')->nullable(false)->change();
        });
    }
};
