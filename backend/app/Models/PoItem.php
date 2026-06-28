<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PoItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'purchase_order_id',
        'item_code',
        'description',
        'delivery_date',
        'hsn_sac',
        'uqc',
        'quantity',
        'unit',
        'rate',
        'cgst',
        'sgst',
        'igst',
        'total_amount',
        'item_remarks',
        'manufacturing_notes',
    ];

    /**
     * Relationship to parent Purchase Order.
     */
    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    /**
     * Relationship to Job Cards.
     */
    public function jobCards()
    {
        return $this->hasMany(JobCard::class, 'po_item_id');
    }

    /**
     * Relationship to Delivery Challan Items.
     */
    public function deliveryItems()
    {
        return $this->hasMany(DeliveryChallanItem::class, 'po_item_id');
    }
}
