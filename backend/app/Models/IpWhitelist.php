<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class IpWhitelist extends Model
{
    use HasFactory, LogsActivity;

    protected $fillable = [
        'ip_address',
        'label',
        'is_active'
    ];

    protected $casts = [
        'is_active' => 'boolean'
    ];
}
