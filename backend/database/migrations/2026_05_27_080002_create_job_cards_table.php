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
        Schema::create('job_cards', function (Blueprint $table) {
            $table->id();
            $table->string('job_card_number')->unique();
            $table->foreignId('incoming_challan_item_id')->constrained('incoming_challan_items')->onDelete('cascade');
            $table->foreignId('po_item_id')->constrained('po_items')->onDelete('cascade');
            $table->decimal('quantity', 12, 2);
            $table->foreignId('assigned_worker_id')->nullable()->constrained('users')->onDelete('set null');
            $table->string('machine_id')->nullable(); // Machine code/name
            $table->enum('status', ['pending', 'in_progress', 'inspection', 'completed'])->default('pending');
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('job_cards');
    }
};
