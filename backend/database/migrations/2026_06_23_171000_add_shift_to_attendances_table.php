<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            if (!Schema::hasColumn('attendances', 'shift')) {
                $table->string('shift')->default('day')->after('date');
            }
            
            $isSqlite = DB::getDriverName() === 'sqlite';
            
            if (!$isSqlite) {
                // Drop foreign key first because index is needed for the constraint in MySQL
                $table->dropForeign('attendances_user_id_foreign');
            }
            
            // Drop existing unique key
            $table->dropUnique('attendances_user_id_date_unique');
            
            // Add new unique key including shift
            $table->unique(['user_id', 'date', 'shift']);
            
            if (!$isSqlite) {
                // Re-add foreign key
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('attendances', function (Blueprint $table) {
            $isSqlite = DB::getDriverName() === 'sqlite';
            
            if (!$isSqlite) {
                // Drop foreign key
                $table->dropForeign('attendances_user_id_foreign');
            }
            
            // Drop new unique key
            $table->dropUnique('attendances_user_id_date_shift_unique');
            
            // Re-add old unique key
            $table->unique(['user_id', 'date']);
            
            if (!$isSqlite) {
                // Re-add foreign key
                $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            }
            
            if (Schema::hasColumn('attendances', 'shift')) {
                $table->dropColumn('shift');
            }
        });
    }
};
