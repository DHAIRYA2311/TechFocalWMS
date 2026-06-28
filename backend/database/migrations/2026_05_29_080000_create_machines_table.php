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
        Schema::create('machines', function (Blueprint $table) {
            $table->id();
            $table->string('machine_code')->unique();
            $table->string('name');
            $table->string('type');
            $table->enum('status', ['idle', 'busy', 'maintenance', 'inactive'])->default('idle');
            $table->foreignId('default_operator_id')->nullable()->constrained('users')->onDelete('set null');
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->date('last_maintenance_date')->nullable();
            $table->date('next_maintenance_due')->nullable();
            $table->text('specifications')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('machines');
    }
};
