<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PayrollItem extends Model
{
    protected $fillable = [
        'payroll_id',
        'user_id',
        'base_salary',
        'days_present',
        'days_absent',
        'days_half_day',
        'days_leave',
        'gross_salary',
        'attendance_deductions',
        'overtime_hours',
        'overtime_pay',
        'pf_deductions',
        'pt_deductions',
        'advance_deductions',
        'bonus',
        'net_salary',
        'payment_status',
        'paid_at',
        'notes',
    ];

    protected $casts = [
        'base_salary' => 'decimal:2',
        'gross_salary' => 'decimal:2',
        'attendance_deductions' => 'decimal:2',
        'overtime_hours' => 'decimal:2',
        'overtime_pay' => 'decimal:2',
        'pf_deductions' => 'decimal:2',
        'pt_deductions' => 'decimal:2',
        'advance_deductions' => 'decimal:2',
        'bonus' => 'decimal:2',
        'net_salary' => 'decimal:2',
        'paid_at' => 'datetime',
    ];

    public function payroll(): BelongsTo
    {
        return $this->belongsTo(Payroll::class, 'payroll_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function salaryAdvances(): HasMany
    {
        return $this->hasMany(SalaryAdvance::class, 'payroll_item_id');
    }
}
