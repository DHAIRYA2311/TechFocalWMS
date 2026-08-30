<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class InvoiceSequence extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'financial_year',
        'next_number',
    ];
}
