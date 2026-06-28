<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BroadcastsUpdates;

class IncomingChallan extends Model
{
    use HasFactory, SoftDeletes, BroadcastsUpdates;

    protected $fillable = [
        'challan_number',
        'challan_date',
        'purchase_order_id',
        'pdf_path',
        'received_by',
        'remarks',
        'is_archived',
        'archived_at',
        'archived_by',
        'deleted_by',
        'delete_reason',
    ];

    public function purchaseOrder()
    {
        return $this->belongsTo(PurchaseOrder::class);
    }

    public function receiver()
    {
        return $this->belongsTo(User::class, 'received_by');
    }

    public function items()
    {
        return $this->hasMany(IncomingChallanItem::class);
    }

    public function archiver()
    {
        return $this->belongsTo(User::class, 'archived_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }
}
