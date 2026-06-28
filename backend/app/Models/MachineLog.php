<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use App\Traits\BroadcastsUpdates;

class MachineLog extends Model
{
    use BroadcastsUpdates;
    protected $fillable = [
        'machine_id',
        'log_type',
        'logged_by',
        'description',
        'cost',
    ];

    protected $casts = [
        'cost' => 'decimal:2',
    ];

    /**
     * Get the machine that owns the log.
     */
    public function machine(): BelongsTo
    {
        return $this->belongsTo(Machine::class, 'machine_id');
    }

    /**
     * Get the user who logged this event.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'logged_by');
    }
}
