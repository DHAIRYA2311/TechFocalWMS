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
        Schema::create('payroll_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('payroll_id')->constrained('payrolls')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('cascade');
            $table->decimal('base_salary', 12, 2);
            $table->integer('days_present');
            $table->integer('days_absent');
            $table->integer('days_half_day');
            $table->integer('days_leave');
            $table->decimal('gross_salary', 12, 2);
            $table->decimal('attendance_deductions', 12, 2);
            $table->decimal('overtime_hours', 10, 2)->default(0);
            $table->decimal('overtime_pay', 12, 2)->default(0);
            $table->decimal('pf_deductions', 12, 2)->default(0);
            $table->decimal('pt_deductions', 12, 2)->default(0);
            $table->decimal('advance_deductions', 12, 2)->default(0);
            $table->decimal('bonus', 12, 2)->default(0);
            $table->decimal('net_salary', 12, 2);
            $table->enum('payment_status', ['unpaid', 'paid'])->default('unpaid');
            $table->timestamp('paid_at')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('payroll_items');
    }
};
