<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BroadcastsUpdates;

class JobCard extends Model
{
    use HasFactory, SoftDeletes, BroadcastsUpdates;

    protected $fillable = [
        'job_card_number',
        'incoming_challan_item_id',
        'po_item_id',
        'quantity',
        'assigned_worker_id',
        'machine_id',
        'drawing_path',
        'status',
        'start_date',
        'end_date',
        'remarks',
        'is_archived',
        'archived_at',
        'archived_by',
        'deleted_by',
        'delete_reason',
    ];

    public function challanItem()
    {
        return $this->belongsTo(IncomingChallanItem::class, 'incoming_challan_item_id');
    }

    public function poItem()
    {
        return $this->belongsTo(PoItem::class, 'po_item_id');
    }

    public function worker()
    {
        return $this->belongsTo(User::class, 'assigned_worker_id');
    }

    public function deliveryChallanItem()
    {
        return $this->hasOne(DeliveryChallanItem::class, 'job_card_id');
    }

    public function invoiceItem()
    {
        return $this->hasOne(InvoiceItem::class, 'job_card_id');
    }

    public function machine()
    {
        return $this->belongsTo(Machine::class, 'machine_id');
    }

    public function getDrawingPathAttribute($value)
    {
        if (empty($value)) {
            return [];
        }

        $decoded = json_decode($value, true);
        if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
            return array_map(function ($item) {
                if (is_array($item)) {
                    return [
                        'path' => $item['path'] ?? '',
                        'name' => $item['name'] ?? basename($item['path'] ?? '')
                    ];
                }
                return [
                    'path' => $item,
                    'name' => basename($item)
                ];
            }, $decoded);
        }

        return [
            [
                'path' => $value,
                'name' => basename($value)
            ]
        ];
    }

    public function setDrawingPathAttribute($value)
    {
        if (is_array($value)) {
            $this->attributes['drawing_path'] = json_encode(array_values($value));
        } else {
            $this->attributes['drawing_path'] = $value;
        }
    }
}
