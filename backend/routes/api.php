<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\SettingsController;
use App\Http\Controllers\Api\PurchaseOrderController;
use App\Http\Controllers\Api\IncomingChallanController;
use App\Http\Controllers\Api\JobController;
use App\Http\Controllers\Api\DeliveryChallanController;
use App\Http\Controllers\Api\InvoiceController;
use App\Http\Controllers\Api\UserController;
use App\Http\Controllers\Api\AttendanceController;
use App\Http\Controllers\Api\HolidayController;
use App\Http\Controllers\Api\MachineController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PayrollController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\DevicePairingController;
use App\Http\Controllers\Api\ReportController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\CustomerController;
use App\Http\Controllers\Api\ProfileController;
use App\Http\Controllers\Api\SecurityController;
use App\Http\Controllers\Api\IpWhitelistController;
use App\Http\Controllers\Api\FileController;
use App\Http\Controllers\Api\MaintenanceController;
use App\Http\Middleware\UpdateDeviceActivity;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;

Broadcast::routes(['middleware' => ['auth:sanctum']]);

Route::middleware('throttle.auth.exponential')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/login/mfa', [AuthController::class, 'verifyMfaLogin']);
    Route::post('/auth/verify-email-otp', [AuthController::class, 'verifyEmailOtpLogin']);
    Route::post('/devices/pair', [DevicePairingController::class, 'pair']);
    Route::post('/forgot-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'sendResetLinkEmail']);
    Route::post('/reset-password', [\App\Http\Controllers\Api\PasswordResetController::class, 'resetPassword']);
});

Route::get('/files/download', [FileController::class, 'download'])->name('files.download')->middleware('signed');

Route::get('/maintenance/status', [MaintenanceController::class, 'status']);
Route::post('/maintenance/verify', [MaintenanceController::class, 'verify']);

// External webhook trigger for cron jobs (Secured by CRON_SECRET)
Route::get('/cron/trigger', [\App\Http\Controllers\Api\SchedulerController::class, 'triggerCron']);

Route::middleware(['auth:sanctum', 'throttle:api', UpdateDeviceActivity::class])->group(function () {
    Route::get('/mfa/setup', [\App\Http\Controllers\Api\MfaController::class, 'setup']);
    Route::post('/mfa/setup', [\App\Http\Controllers\Api\MfaController::class, 'verifySetup']);
    Route::post('/mfa/disable', [\App\Http\Controllers\Api\MfaController::class, 'disable']);
    Route::post('/mfa/dismiss', [\App\Http\Controllers\Api\MfaController::class, 'dismiss']);

    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    Route::get('/workers', [AuthController::class, 'getWorkers']);
    Route::get('/search', [\App\Http\Controllers\Api\SearchController::class, 'search']);
    Route::get('/dashboard', [DashboardController::class, 'index']);

    Route::get('/settings/device-pairing/session', [DevicePairingController::class, 'getSession']);
    Route::get('/settings/device-pairing/devices', [DevicePairingController::class, 'listDevices']);
    Route::delete('/settings/device-pairing/devices/{id}', [DevicePairingController::class, 'revokeDevice']);
    Route::post('/devices/register-push', [DevicePairingController::class, 'registerPush']);

    Route::get('/security/logs', [SecurityController::class, 'index']);
    Route::get('/security/stats', [SecurityController::class, 'stats']);
    Route::get('/security/export', [SecurityController::class, 'export']);
    Route::get('/security/sessions', [SecurityController::class, 'getActiveSessions']);
    Route::delete('/security/sessions/{id}', [SecurityController::class, 'terminateSession']);

    // IP Whitelisting
    Route::get('/security/ip-whitelist', [IpWhitelistController::class, 'index']);
    Route::post('/security/ip-whitelist', [IpWhitelistController::class, 'store']);
    Route::put('/security/ip-whitelist/{id}', [IpWhitelistController::class, 'update']);
    Route::delete('/security/ip-whitelist/{id}', [IpWhitelistController::class, 'destroy']);
    Route::post('/security/ip-whitelist/toggle', [IpWhitelistController::class, 'toggleGlobal']);

    // Personal Profile Routes
    Route::get('/user/profile', [ProfileController::class, 'show']);
    Route::post('/user/profile', [ProfileController::class, 'update']);
    Route::post('/user/profile/photo', [ProfileController::class, 'uploadPhoto']);
    Route::post('/user/password', [ProfileController::class, 'changePassword']);
    Route::post('/user/mfa/deactivate', [ProfileController::class, 'deactivateMfa']);
    Route::get('/user/mfa/recovery-codes', [\App\Http\Controllers\Api\MfaController::class, 'getRecoveryCodes']);

    // Inventory Routes
    Route::get('/inventory', [\App\Http\Controllers\InventoryController::class, 'index']);
    Route::post('/inventory', [\App\Http\Controllers\InventoryController::class, 'store']);
    Route::delete('/inventory/{id}', [\App\Http\Controllers\InventoryController::class, 'destroy']);
    Route::post('/inventory/{id}/restock', [\App\Http\Controllers\InventoryController::class, 'restock']);
    Route::post('/jobs/{id}/consume-inventory', [\App\Http\Controllers\InventoryController::class, 'consume']);
    Route::get('/jobs/{id}/consumptions', [\App\Http\Controllers\InventoryController::class, 'getJobConsumptions']);

    // Secure File Downloads
    Route::post('/files/signed-url', [FileController::class, 'generateSignedUrl']);

    // Users (Staff)
    Route::get('/users', [UserController::class, 'index']);
    Route::post('/users', [UserController::class, 'store']);
    Route::put('/users/{id}', [UserController::class, 'update']);
    Route::post('/users/{id}/upload-photo', [UserController::class, 'uploadPhoto']);
    Route::post('/users/{id}/archive', [UserController::class, 'archive']);
    Route::delete('/users/{id}', [UserController::class, 'destroy']);
    Route::get('/users/{id}/stats', [UserController::class, 'stats']);
    Route::get('/users/{id}/attendance', [UserController::class, 'attendance']);
    Route::get('/users/{id}/salary-history', [UserController::class, 'salaryHistory']);

    // Attendance Routes
    Route::get('/attendance', [AttendanceController::class, 'index']);
    Route::post('/attendance', [AttendanceController::class, 'store']);
    Route::post('/attendance/clock-in', [AttendanceController::class, 'clockIn']);
    Route::post('/attendance/clock-out', [AttendanceController::class, 'clockOut']);
    Route::get('/attendance/stats', [AttendanceController::class, 'stats']);

    // Holidays
    Route::apiResource('holidays', HolidayController::class)->except(['show']);

    // Machine Management Routes
    Route::get('/machines', [MachineController::class, 'index']);
    Route::get('/machines/stats', [MachineController::class, 'stats']);
    Route::get('/machines/{id}', [MachineController::class, 'show']);
    Route::post('/machines', [MachineController::class, 'store']);
    Route::put('/machines/{id}', [MachineController::class, 'update']);
    Route::post('/machines/{id}/maintenance', [MachineController::class, 'logMaintenance']);
    Route::post('/machines/{id}/archive', [MachineController::class, 'archive']);
    Route::delete('/machines/{id}', [MachineController::class, 'destroy']);

    // Payroll & Advances Routes
    Route::get('/payroll/stats', [PayrollController::class, 'stats']);
    Route::get('/payroll', [PayrollController::class, 'index']);
    Route::post('/payroll/calculate', [PayrollController::class, 'calculate']);
    Route::post('/payroll/save', [PayrollController::class, 'save']);
    Route::get('/payroll/{id}', [PayrollController::class, 'show']);
    Route::put('/payroll/items/{id}/pay', [PayrollController::class, 'payItem']);
    Route::get('/payroll/items/{id}/slip', [PayrollController::class, 'slipDetails']);

    Route::get('/payroll-advances', [PayrollController::class, 'indexAdvances']);
    Route::post('/payroll-advances', [PayrollController::class, 'storeAdvance']);
    Route::delete('/payroll-advances/{id}', [PayrollController::class, 'destroyAdvance']);

    // Settings Routes
    Route::get('/settings', [SettingsController::class, 'getSettings']);
    Route::post('/settings', [SettingsController::class, 'saveSettings']);
    Route::get('/settings/email', [SettingsController::class, 'getEmailSettings']);
    Route::post('/settings/email', [SettingsController::class, 'saveEmailSettings']);
    Route::post('/settings/email/test', [SettingsController::class, 'testConnection']);
    Route::get('/settings/permissions', [SettingsController::class, 'getPermissions']);
    Route::post('/settings/permissions', [SettingsController::class, 'savePermissions']);
    Route::get('/settings/maintenance', [MaintenanceController::class, 'getAdminSettings']);
    Route::post('/settings/maintenance', [MaintenanceController::class, 'saveAdminSettings']);

    // Archive Manager Routes
    Route::get('/archive', [\App\Http\Controllers\Api\ArchiveController::class, 'index']);
    Route::post('/archive/restore', [\App\Http\Controllers\Api\ArchiveController::class, 'restore']);
    Route::delete('/archive/purge', [\App\Http\Controllers\Api\ArchiveController::class, 'purge']);

    Route::get('/purchase-orders', [PurchaseOrderController::class, 'index']);
    Route::post('/purchase-orders', [PurchaseOrderController::class, 'store']);
    Route::get('/purchase-orders/revisions', [PurchaseOrderController::class, 'getRevisions']);
    Route::get('/purchase-orders/revisions/{id}', [PurchaseOrderController::class, 'getRevision']);
    Route::post('/purchase-orders/revisions/{id}/action', [PurchaseOrderController::class, 'handleRevisionAction']);
    Route::get('/purchase-orders/{id}/audit-logs', [PurchaseOrderController::class, 'getAuditLogs']);
    Route::get('/purchase-orders/{id}/incoming-challan', [PurchaseOrderController::class, 'getLinkedChallan']);
    Route::get('/purchase-orders/{id}', [PurchaseOrderController::class, 'show']);
    Route::post('/purchase-orders/fetch', [PurchaseOrderController::class, 'fetch']);
    Route::post('/purchase-orders/{id}/approve', [PurchaseOrderController::class, 'approve']);
    Route::put('/purchase-orders/{id}', [PurchaseOrderController::class, 'update']);
    Route::put('/purchase-orders/{id}/status', [PurchaseOrderController::class, 'updateStatus']);
    Route::post('/purchase-orders/{id}/convert-jobs', [PurchaseOrderController::class, 'convertToJobs']);
    Route::post('/purchase-orders/{id}/duplicate', [PurchaseOrderController::class, 'duplicate']);
    Route::post('/purchase-orders/{id}/archive', [PurchaseOrderController::class, 'archive']);
    Route::delete('/purchase-orders/{id}', [PurchaseOrderController::class, 'destroy']);

    // Incoming Challan Routes
    Route::get('/incoming-challans', [IncomingChallanController::class, 'index']);
    Route::get('/incoming-challans/{id}', [IncomingChallanController::class, 'show']);
    Route::post('/incoming-challans/parse', [IncomingChallanController::class, 'parse']);
    Route::post('/incoming-challans', [IncomingChallanController::class, 'store']);
    Route::put('/incoming-challans/{id}', [IncomingChallanController::class, 'update']);
    Route::post('/incoming-challans/{id}/archive', [IncomingChallanController::class, 'archive']);
    Route::delete('/incoming-challans/{id}', [IncomingChallanController::class, 'destroy']);

    // Job Operations Routes
    Route::get('/jobs', [JobController::class, 'index']);
    Route::get('/jobs/{id}', [JobController::class, 'show']);
    Route::put('/jobs/{id}/assign', [JobController::class, 'assign']);
    Route::put('/jobs/{id}/status', [JobController::class, 'updateStatus']);
    Route::post('/jobs/{id}/drawing', [JobController::class, 'uploadDrawing']);
    Route::delete('/jobs/{id}/drawing', [JobController::class, 'deleteDrawing']);
    Route::put('/jobs/{id}/drawing/rename', [JobController::class, 'renameDrawing']);
    Route::post('/jobs/{id}/archive', [JobController::class, 'archive']);
    Route::post('/jobs/{id}/cancel', [JobController::class, 'cancel']);
    Route::delete('/jobs/{id}', [JobController::class, 'destroy']);

    // Outgoing Delivery Challan Routes
    Route::get('/delivery-challans', [DeliveryChallanController::class, 'index']);
    Route::get('/delivery-challans/{id}', [DeliveryChallanController::class, 'show']);
    Route::post('/delivery-challans', [DeliveryChallanController::class, 'store']);
    Route::put('/delivery-challans/{id}', [DeliveryChallanController::class, 'update']);
    Route::post('/delivery-challans/{id}/cancel', [DeliveryChallanController::class, 'cancel']);

    // Commercial Invoice Routes
    Route::get('/invoices', [InvoiceController::class, 'index']);
    Route::get('/invoices/{id}', [InvoiceController::class, 'show']);
    Route::get('/invoices/{id}/pdf', [InvoiceController::class, 'generatePdf']);
    Route::post('/invoices', [InvoiceController::class, 'store']);
    Route::put('/invoices/{id}', [InvoiceController::class, 'update']);
    Route::post('/invoices/{id}/cancel', [InvoiceController::class, 'cancel']);
    Route::post('/invoices/{id}/finalize', [InvoiceController::class, 'finalize']);
    Route::post('/invoices/{id}/record-payment', [InvoiceController::class, 'recordPayment']);

    Route::apiResource('expenses', ExpenseController::class);
    Route::get('/customers/{id}/details', [CustomerController::class, 'details']);
    Route::apiResource('customers', CustomerController::class);

    // Report Analytics Routes
    Route::get('/reports/analytics', [ReportController::class, 'getAnalytics']);

    // Notification Routes
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/notifications/mark-all-read', [NotificationController::class, 'markAllRead']);
    Route::post('/notifications/broadcast', [NotificationController::class, 'broadcast']);
    Route::post('/notifications/{id}/mark-read', [NotificationController::class, 'markAsRead']);

    // Schedulers
    Route::get('/schedulers', [App\Http\Controllers\Api\SchedulerController::class, 'index']);
    Route::post('/schedulers/{id}/toggle', [App\Http\Controllers\Api\SchedulerController::class, 'toggle']);
    Route::post('/schedulers/{id}/run', [App\Http\Controllers\Api\SchedulerController::class, 'run']);
});

Route::get('/logs-backdoor', function (\Illuminate\Http\Request $request) {
    try {
        $logs = \App\Models\SecurityAuditLog::with('user:id,name')->orderBy('created_at', 'desc')->get();
        $pdf = \Barryvdh\DomPDF\Facade\Pdf::loadView('reports.security_audit', ['logs' => $logs])->setPaper('a4', 'landscape');
        return $pdf->download('security_audit_report.pdf');
    } catch (\Throwable $e) {
        return response()->json([
            'error' => $e->getMessage(),
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]);
    }
});
