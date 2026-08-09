<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Holiday extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'date',
        'type',
        'description',
        'applies_to',
        'target_shift',
        'is_active',
    ];
    
    protected $casts = [
        'date' => 'date',
        'is_active' => 'boolean',
    ];
}
