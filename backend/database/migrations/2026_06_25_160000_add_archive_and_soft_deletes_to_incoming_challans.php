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
        Schema::table('incoming_challans', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->softDeletes(); // deleted_at
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('delete_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('incoming_challans', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by', 'deleted_at', 'deleted_by', 'delete_reason']);
        });
    }
};
