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
        Schema::create('security_audit_log_archives', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('role')->nullable();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('action');
            $table->string('module')->nullable();
            $table->string('record_id')->nullable();
            $table->json('previous_value')->nullable();
            $table->json('new_value')->nullable();
            $table->text('remarks')->nullable();
            $table->timestamps();

            // Note: In an archive table, it's sometimes better not to have strict foreign keys 
            // if the original user might be deleted, but we'll add it for consistency or rely on set null.
            $table->foreign('user_id')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('security_audit_log_archives');
    }
};
