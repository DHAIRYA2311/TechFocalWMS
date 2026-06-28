<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InvoiceItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'invoice_id',
        'po_item_id',
        'job_card_id',
        'quantity',
        'rate',
        'cgst_rate',
        'sgst_rate',
        'igst_rate',
        'cgst_amount',
        'sgst_amount',
        'igst_amount',
        'total_amount',
    ];

    public function invoice()
    {
        return $this->belongsTo(Invoice::class, 'invoice_id');
    }

    public function poItem()
    {
        return $this->belongsTo(PoItem::class, 'po_item_id');
    }

    public function jobCard()
    {
        return $this->belongsTo(JobCard::class, 'job_card_id');
    }
}
