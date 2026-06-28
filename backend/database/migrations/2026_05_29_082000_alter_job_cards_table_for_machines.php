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
        Schema::table('job_cards', function (Blueprint $table) {
            if (Schema::hasColumn('job_cards', 'machine_id')) {
                $table->dropColumn('machine_id');
            }
        });

        Schema::table('job_cards', function (Blueprint $table) {
            $table->foreignId('machine_id')->nullable()->constrained('machines')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('job_cards', function (Blueprint $table) {
            $table->dropForeign(['machine_id']);
            $table->dropColumn('machine_id');
        });

        Schema::table('job_cards', function (Blueprint $table) {
            $table->string('machine_id')->nullable();
        });
    }
};
