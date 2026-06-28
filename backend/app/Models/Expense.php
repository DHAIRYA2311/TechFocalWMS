<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BroadcastsUpdates;

class Expense extends Model
{
    use HasFactory, SoftDeletes, BroadcastsUpdates;

    protected $fillable = [
        'expense_date',
        'category',
        'amount',
        'payment_mode',
        'description',
        'reference_number',
        'receipt_path',
        'logged_by',
        'is_archived',
        'archived_at',
        'archived_by',
        'deleted_by',
        'delete_reason',
    ];

    /**
     * Relationship to the user who logged the expense.
     */
    public function loggedBy()
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
