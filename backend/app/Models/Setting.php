<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use App\Traits\LogsActivity;

class Setting extends Model
{
    use HasFactory;
    use LogsActivity;

    protected $fillable = ['key', 'value'];

    /**
     * Get a setting value by key, decrypting if sensitive.
     */
    public static function getVal(string $key, $default = null)
    {
        $setting = self::where('key', $key)->first();
        if (!$setting) {
            return $default;
        }

        // Decrypt password on retrieve
        if ($key === 'imap_password' && $setting->value) {
            try {
                return decrypt($setting->value);
            } catch (\Exception $e) {
                return $setting->value;
            }
        }

        return $setting->value;
    }

    /**
     * Save a setting value, encrypting if sensitive.
     */
    public static function setVal(string $key, ?string $value)
    {
        if ($key === 'imap_password' && $value) {
            try {
                $value = encrypt($value);
            } catch (\Exception $e) {
                // Ignore encryption failures during command-line testing
            }
        }

        // Do not log routine background setting updates
        $backgroundKeys = ['po_last_fetch_at'];
        if (in_array($key, $backgroundKeys)) {
            return self::withoutEvents(function () use ($key, $value) {
                return self::updateOrCreate(
                    ['key' => $key],
                    ['value' => $value]
                );
            });
        }

        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }
}
