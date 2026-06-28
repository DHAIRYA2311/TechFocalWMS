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
        Schema::create('paired_devices', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->unsignedBigInteger('token_id')->nullable();
            $table->string('device_name');
            $table->string('device_id')->unique();
            $table->timestamp('last_active_at')->nullable();
            $table->timestamps();

            // Set up foreign key constraint manually if table name differs, 
            // but morphs table personal_access_tokens is standard.
            $table->foreign('token_id')
                  ->references('id')
                  ->on('personal_access_tokens')
                  ->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('paired_devices');
    }
};
