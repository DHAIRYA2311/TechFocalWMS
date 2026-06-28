<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BroadcastsUpdates;

class Machine extends Model
{
    use SoftDeletes, BroadcastsUpdates;
    protected $fillable = [
        'machine_code',
        'name',
        'type',
        'status',
        'default_operator_id',
        'hourly_rate',
        'last_maintenance_date',
        'next_maintenance_due',
        'specifications',
        'is_archived',
        'archived_at',
        'archived_by',
        'deleted_by',
        'delete_reason',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'last_maintenance_date' => 'date',
        'next_maintenance_due' => 'date',
    ];

    /**
     * Get the default operator (worker) associated with this machine.
     */
    public function defaultOperator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'default_operator_id');
    }

    /**
     * Get the job cards assigned to this machine.
     */
    public function jobCards(): HasMany
    {
        return $this->hasMany(JobCard::class, 'machine_id');
    }

    /**
     * Get active/current job cards assigned to this machine.
     */
    public function activeJobs(): HasMany
    {
        return $this->hasMany(JobCard::class, 'machine_id')
            ->whereIn('status', ['in_progress', 'inspection']);
    }

    /**
     * Get the logs recorded for this machine.
     */
    public function logs(): HasMany
    {
        return $this->hasMany(MachineLog::class, 'machine_id');
    }
}
