<?php

namespace App\Services;

use App\Models\SecurityAuditLog;
use Illuminate\Support\Facades\Request;

class SecurityLogger
{
    /**
     * Log a security or audit event.
     *
     * @param string $action The event type (e.g., 'login_success', 'po_created')
     * @param string|null $module The module affected (e.g., 'Auth', 'PurchaseOrder')
     * @param string|null $recordId ID of the record affected (if applicable)
     * @param array|null $previousValue The state before the action
     * @param array|null $newValue The state after the action
     * @param string|null $remarks Any additional notes
     * @param \App\Models\User|null $user The user performing the action (defaults to authenticated user)
     */
    public static function log(
        string $action,
        ?string $module = null,
        ?string $recordId = null,
        ?array $previousValue = null,
        ?array $newValue = null,
        ?string $remarks = null,
        $user = null
    ) {
        $user = $user ?? auth()->user();
        
        SecurityAuditLog::create([
            'user_id' => $user ? $user->id : null,
            'role' => $user ? $user->role : null,
            'ip_address' => Request::ip(),
            'user_agent' => substr(Request::userAgent() ?? '', 0, 65535),
            'action' => $action,
            'module' => $module,
            'record_id' => $recordId,
            'previous_value' => $previousValue,
            'new_value' => $newValue,
            'remarks' => $remarks,
        ]);
    }
}
