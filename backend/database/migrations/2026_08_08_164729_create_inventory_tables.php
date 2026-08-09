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
        Schema::create('inventory_items', function (Blueprint $table) {
            $table->id();
            $table->string('sku')->unique();
            $table->string('name');
            $table->string('category')->default('raw_materials');
            $table->decimal('stock', 12, 2)->default(0);
            $table->string('unit')->default('pcs');
            $table->decimal('reorder_level', 12, 2)->default(0);
            $table->string('location')->nullable();
            $table->timestamps();
            $table->softDeletes();
        });

        Schema::create('inventory_consumptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('job_card_id')->constrained('job_cards')->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->decimal('quantity', 12, 2);
            $table->foreignId('consumed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_consumptions');
        Schema::dropIfExists('inventory_items');
    }
};
