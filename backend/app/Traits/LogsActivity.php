<?php

namespace App\Traits;

use App\Services\SecurityLogger;
use Illuminate\Database\Eloquent\Model;

trait LogsActivity
{
    protected static function bootLogsActivity()
    {
        static::created(function (Model $model) {
            SecurityLogger::log(
                strtolower(class_basename($model)) . '_created',
                class_basename($model),
                $model->id,
                null,
                $model->toArray(),
                class_basename($model) . ' created'
            );
        });

        static::updated(function (Model $model) {
            $dirty = $model->getDirty();
            // Don't log if only timestamps changed
            if (count($dirty) === 1 && isset($dirty['updated_at'])) {
                return;
            }
            
            $original = array_intersect_key($model->getOriginal(), $dirty);
            
            SecurityLogger::log(
                strtolower(class_basename($model)) . '_updated',
                class_basename($model),
                $model->id,
                $original,
                $dirty,
                class_basename($model) . ' updated'
            );
        });

        static::deleted(function (Model $model) {
            SecurityLogger::log(
                strtolower(class_basename($model)) . '_deleted',
                class_basename($model),
                $model->id,
                $model->toArray(),
                null,
                class_basename($model) . ' deleted'
            );
        });
    }
}
