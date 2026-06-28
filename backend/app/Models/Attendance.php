<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\BroadcastsUpdates;

class Attendance extends Model
{
    use HasFactory, BroadcastsUpdates;

    protected $fillable = [
        'user_id',
        'date',
        'shift',
        'status',
        'clock_in',
        'clock_out',
        'marked_by',
        'notes',
    ];

    /**
     * Get the user that this attendance log belongs to.
     */
    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    /**
     * Get the user who marked/updated this attendance.
     */
    public function marker()
    {
        return $this->belongsTo(User::class, 'marked_by');
    }
}
