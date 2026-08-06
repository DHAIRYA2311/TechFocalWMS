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
use App\Traits\LogsActivity;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable, SoftDeletes, BroadcastsUpdates;
    use LogsActivity;

    protected static function booted()
    {
        static::creating(function ($user) {
            if (empty($user->photo_path)) {
                $user->photo_path = self::getDefaultPfpForRole($user->role);
            }
        });
        
        static::updating(function ($user) {
            if ($user->isDirty('role') && (empty($user->photo_path) || str_contains($user->photo_path, 'defaults'))) {
                $user->photo_path = self::getDefaultPfpForRole($user->role);
            }
        });
    }

    protected static function getDefaultPfpForRole($role)
    {
        $roleMap = [
            'admin' => 'ADMIN',
            'partner' => 'PARTNER',
            'manager' => 'MANAGER',
            'supervisor' => 'MANAGER', // fallback to manager if no supervisor icon
            'worker' => 'WORKER',
            'helper' => 'HELPER'
        ];

        $name = $roleMap[$role] ?? 'WORKER';
        return 'photos/defaults/' . $name . '.png';
    }

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
        'mfa_secret',
        'mfa_dismissed',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
        'mfa_secret',
        'mfa_recovery_codes',
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

    public function jobs()
    {
        return $this->hasMany(JobCard::class, 'assigned_worker_id');
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
