<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\SoftDeletes;
use App\Traits\BroadcastsUpdates;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, BroadcastsUpdates;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'shift',
        'status',
        'phone',
        'salary',
        'extra_notes',
        'photo_path',
        'is_archived',
        'archived_at',
        'archived_by',
        'deleted_by',
        'delete_reason',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the attendance records for the user.
     */
    public function attendances()
    {
        return $this->hasMany(Attendance::class, 'user_id');
    }

    /**
     * Check if user has a specific permission.
     */
    public function hasPermission(string $permission): bool
    {
        // System safeguard: admins always have all permissions
        if ($this->role === 'admin') {
            return true;
        }

        // 1. Check user-specific override from settings
        $userOverridesJson = Setting::getVal('user_permissions', '{}');
        $userOverrides = json_decode($userOverridesJson, true);
        if (isset($userOverrides[$this->id])) {
            $userPerms = $userOverrides[$this->id];
            if (isset($userPerms[$permission])) {
                return (bool) $userPerms[$permission];
            }
        }

        // 2. Check role-based permissions from settings
        $rolePermissionsJson = Setting::getVal('role_permissions', '{}');
        $rolePermissions = json_decode($rolePermissionsJson, true);

        // Predefined fallback default values if setting is not populated yet
        $defaults = [
            'partner' => [
                'purchase_orders' => true,
                'jobs' => true,
                'payroll' => true,
                'finance' => true,
                'settings' => true,
            ],
            'manager' => [
                'purchase_orders' => true,
                'jobs' => true,
                'payroll' => true,
                'finance' => false,
                'settings' => false,
            ],
            'supervisor' => [
                'purchase_orders' => false,
                'jobs' => true,
                'payroll' => false,
                'finance' => false,
                'settings' => false,
            ],
            'worker' => [
                'purchase_orders' => false,
                'jobs' => false,
                'payroll' => false,
                'finance' => false,
                'settings' => false,
            ],
            'helper' => [
                'purchase_orders' => false,
                'jobs' => false,
                'payroll' => false,
                'finance' => false,
                'settings' => false,
            ],
        ];

        $rolePerms = isset($rolePermissions[$this->role]) ? $rolePermissions[$this->role] : ($defaults[$this->role] ?? []);

        return isset($rolePerms[$permission]) ? (bool) $rolePerms[$permission] : false;
    }
}
