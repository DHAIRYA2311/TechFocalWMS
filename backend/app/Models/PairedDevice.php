<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Laravel\Sanctum\PersonalAccessToken;

class PairedDevice extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'token_id',
        'device_name',
        'device_id',
        'last_active_at',
        'push_token',
    ];

    /**
     * Relationship with the user.
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Relationship with the Personal Access Token.
     */
    public function token()
    {
        return $this->belongsTo(PersonalAccessToken::class, 'token_id');
    }
}
