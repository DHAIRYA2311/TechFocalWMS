<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;
use App\Traits\BroadcastsUpdates;

use Illuminate\Database\Eloquent\SoftDeletes;

class DeliveryChallan extends Model
{
    use HasFactory, SoftDeletes, BroadcastsUpdates;
    use LogsActivity;

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

    /**
     * Relationship to Purchase Orders (Many-to-Many).
     */
    public function purchaseOrders()
    {
        return $this->belongsToMany(PurchaseOrder::class, 'purchase_order_delivery_challan');
    }
}
