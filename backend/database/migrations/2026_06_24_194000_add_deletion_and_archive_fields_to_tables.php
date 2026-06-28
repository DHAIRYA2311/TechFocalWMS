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
        // 1. Purchase Orders
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->softDeletes(); // deleted_at
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('delete_reason')->nullable();
        });

        // 2. Users
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->softDeletes();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('delete_reason')->nullable();
        });

        // 3. Machines
        Schema::table('machines', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->softDeletes();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('delete_reason')->nullable();
        });

        // 4. Expenses
        Schema::table('expenses', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->index();
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->softDeletes();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('delete_reason')->nullable();
        });

        // 5. Job Cards (already has is_archived)
        Schema::table('job_cards', function (Blueprint $table) {
            $table->timestamp('archived_at')->nullable();
            $table->unsignedBigInteger('archived_by')->nullable();
            $table->softDeletes();
            $table->unsignedBigInteger('deleted_by')->nullable();
            $table->text('delete_reason')->nullable();
        });

        // 6. Delivery Challans
        Schema::table('delivery_challans', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->text('cancellation_reason')->nullable();
        });

        // 7. Invoices
        Schema::table('invoices', function (Blueprint $table) {
            $table->timestamp('cancelled_at')->nullable();
            $table->unsignedBigInteger('cancelled_by')->nullable();
            $table->text('cancellation_reason')->nullable();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by', 'deleted_at', 'deleted_by', 'delete_reason']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by', 'deleted_at', 'deleted_by', 'delete_reason']);
        });

        Schema::table('machines', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by', 'deleted_at', 'deleted_by', 'delete_reason']);
        });

        Schema::table('expenses', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'archived_at', 'archived_by', 'deleted_at', 'deleted_by', 'delete_reason']);
        });

        Schema::table('job_cards', function (Blueprint $table) {
            $table->dropColumn(['archived_at', 'archived_by', 'deleted_at', 'deleted_by', 'delete_reason']);
        });

        Schema::table('delivery_challans', function (Blueprint $table) {
            $table->dropColumn(['cancelled_at', 'cancelled_by', 'cancellation_reason']);
        });

        Schema::table('invoices', function (Blueprint $table) {
            $table->dropColumn(['cancelled_at', 'cancelled_by', 'cancellation_reason']);
        });
    }
};
