<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;
use App\Traits\BroadcastsUpdates;

use Illuminate\Database\Eloquent\SoftDeletes;

class Invoice extends Model
{
    use HasFactory, SoftDeletes, BroadcastsUpdates;
    use LogsActivity;

    protected $fillable = [
        'invoice_number',
        'invoice_date',
        'purchase_order_id',
        'delivery_challan_id',
        'subtotal',
        'cgst_total',
        'sgst_total',
        'igst_total',
        'grand_total',
        'remarks',
        'eway_bill_no',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
        'status',
        'payment_method',
        'transaction_reference',
        'payment_date',
        'payment_remarks',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function deliveryChallan()
    {
        return $this->belongsTo(DeliveryChallan::class, 'delivery_challan_id');
    }

    public function items()
    {
        return $this->hasMany(InvoiceItem::class, 'invoice_id');
    }

    /**
     * Relationship to Purchase Orders (Many-to-Many).
     */
    public function purchaseOrders()
    {
        return $this->belongsToMany(PurchaseOrder::class, 'purchase_order_invoice');
    }
}
