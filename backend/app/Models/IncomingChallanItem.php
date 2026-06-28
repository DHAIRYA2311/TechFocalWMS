<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class IncomingChallanItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'incoming_challan_id',
        'po_item_id',
        'quantity_received',
    ];

    public function challan()
    {
        return $this->belongsTo(IncomingChallan::class, 'incoming_challan_id');
    }

    public function poItem()
    {
        return $this->belongsTo(PoItem::class, 'po_item_id');
    }

    public function jobCard()
    {
        return $this->hasOne(JobCard::class, 'incoming_challan_item_id');
    }
}
