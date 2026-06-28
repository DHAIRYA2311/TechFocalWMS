<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    use HasFactory;

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

        return self::updateOrCreate(
            ['key' => $key],
            ['value' => $value]
        );
    }
}
