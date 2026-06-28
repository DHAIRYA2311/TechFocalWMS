<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseOrderRevision extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'po_number',
        'po_date',
        'customer_name',
        'customer_email',
        'pdf_path',
        'email_uid',
        'status',
        'extracted_data',
        'has_differences',
    ];

    protected $casts = [
        'extracted_data' => 'array',
        'has_differences' => 'boolean',
    ];

    /**
     * Relationship to original PO.
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }
}
