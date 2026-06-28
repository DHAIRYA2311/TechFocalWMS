<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BroadcastsUpdates;

class PurchaseOrder extends Model
{
    use HasFactory, SoftDeletes, BroadcastsUpdates;

    protected $fillable = [
        'po_number',
        'po_date',
        'customer_name',
        'customer_address',
        'customer_gstin',
        'customer_email',
        'remarks',
        'pdf_path',
        'email_uid',
        'status',
        'is_archived',
        'archived_at',
        'archived_by',
        'deleted_by',
        'delete_reason',
    ];

    /**
     * Relationship to PO items.
     */
    public function items()
    {
        return $this->hasMany(PoItem::class);
    }

    /**
     * Relationship to revisions.
     */
    public function revisions()
    {
        return $this->hasMany(PurchaseOrderRevision::class);
    }

    /**
     * Relationship to change logs/audit trails.
     */
    public function auditLogs()
    {
        return $this->hasMany(PurchaseOrderAuditLog::class);
    }
}
