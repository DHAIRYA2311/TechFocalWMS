<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DeliveryChallanItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'delivery_challan_id',
        'job_card_id',
        'po_item_id',
        'quantity_delivered',
    ];

    public function deliveryChallan()
    {
        return $this->belongsTo(DeliveryChallan::class, 'delivery_challan_id');
    }

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class, 'job_card_id');
    }

    public function poItem()
    {
        return $this->belongsTo(PoItem::class, 'po_item_id');
    }
}
