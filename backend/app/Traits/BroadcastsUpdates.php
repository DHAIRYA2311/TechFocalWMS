<?php

namespace App\Traits;

use App\Events\ResourceUpdated;

trait BroadcastsUpdates
{
    /**
     * Boot the trait and register model event listeners.
     */
    public static function bootBroadcastsUpdates(): void
    {
        static::saved(function ($model) {
            static::broadcastModelChange($model, 'updated');
        });

        static::deleted(function ($model) {
            static::broadcastModelChange($model, 'deleted');
        });
    }

    /**
     * Broadcast model changes via WebSockets.
     */
    protected static function broadcastModelChange($model, string $action): void
    {
        $resource = static::getBroadcastResourceName($model);
        if ($resource) {
            // Dispatch the primary update event
            ResourceUpdated::dispatch($resource, $action, [
                'id' => $model->getKey(),
            ]);

            // Dispatch dashboard/general system update ping
            ResourceUpdated::dispatch('dashboard', 'updated');
        }
    }

    /**
     * Resolve broadcast resource names based on model class.
     */
    protected static function getBroadcastResourceName($model): ?string
    {
        $className = class_basename($model);
        return match ($className) {
            'PurchaseOrder' => 'purchase_orders',
            'JobCard' => 'jobs',
            'Attendance' => 'attendance',
            'Machine' => 'machines',
            'MachineLog' => 'machines',
            'DeliveryChallan', 'IncomingChallan' => 'challans',
            'Invoice' => 'invoices',
            'Expense' => 'expenses',
            'User' => 'users',
            default => null,
        };
    }
}
