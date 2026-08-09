<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'sku',
        'name',
        'category',
        'stock',
        'unit',
        'reorder_level',
        'location',
    ];

    public function consumptions()
    {
        return $this->hasMany(InventoryConsumption::class);
    }
}
