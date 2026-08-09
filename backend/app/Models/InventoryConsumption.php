<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryConsumption extends Model
{
    use HasFactory;

    protected $fillable = [
        'job_card_id',
        'inventory_item_id',
        'quantity',
        'consumed_by',
        'remarks',
    ];

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class);
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function consumer()
    {
        return $this->belongsTo(User::class, 'consumed_by');
    }
}
