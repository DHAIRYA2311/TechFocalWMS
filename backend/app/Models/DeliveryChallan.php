<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BroadcastsUpdates;

class DeliveryChallan extends Model
{
    use HasFactory, BroadcastsUpdates;

    protected $fillable = [
        'challan_number',
        'challan_date',
        'purchase_order_id',
        'invoice_id',
        'remarks',
        'cancelled_at',
        'cancelled_by',
        'cancellation_reason',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class, 'purchase_order_id');
    }

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function items()
    {
        return $this->hasMany(DeliveryChallanItem::class, 'delivery_challan_id');
    }
}
