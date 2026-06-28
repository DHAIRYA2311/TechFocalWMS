<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderAuditLog extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'action',
        'original_version',
        'revised_version',
        'user_id',
        'user_name',
    ];

    protected $casts = [
        'original_version' => 'array',
        'revised_version' => 'array',
    ];

    /**
     * Relationship to PO.
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    /**
     * Relationship to User who performed revision/action.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
