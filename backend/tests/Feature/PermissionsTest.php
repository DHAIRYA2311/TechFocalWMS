<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Setting;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PermissionsTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $partner;
    protected $manager;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@techfocal.in',
            'password' => bcrypt('password'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '1111111111',
        ]);

        $this->partner = User::create([
            'name' => 'Founder Partner',
            'email' => 'partner@techfocal.in',
            'password' => bcrypt('password'),
            'role' => 'partner',
            'status' => 'active',
            'phone' => '2222222222',
        ]);

        $this->manager = User::create([
            'name' => 'Workshop Manager',
            'email' => 'manager@techfocal.in',
            'password' => bcrypt('password'),
            'role' => 'manager',
            'status' => 'active',
            'phone' => '3333333333',
        ]);
    }

    public function test_admin_bypasses_all_permissions()
    {
        $this->assertTrue($this->admin->hasPermission('purchase_orders'));
        $this->assertTrue($this->admin->hasPermission('settings'));
        $this->assertTrue($this->admin->hasPermission('some_arbitrary_permission'));
    }

    public function test_default_role_permissions_fallback()
    {
        // Partner defaults: all true
        $this->assertTrue($this->partner->hasPermission('purchase_orders'));
        $this->assertTrue($this->partner->hasPermission('settings'));

        // Manager defaults: settings is false, jobs is true
        $this->assertTrue($this->manager->hasPermission('jobs'));
        $this->assertFalse($this->manager->hasPermission('settings'));
    }

    public function test_role_based_permissions_from_settings()
    {
        // Configure manager settings
        Setting::setVal('role_permissions', json_encode([
            'manager' => [
                'purchase_orders' => false,
                'jobs' => true,
                'payroll' => false,
                'finance' => true, // changed from default false
                'settings' => false,
            ]
        ]));

        $this->assertTrue($this->manager->hasPermission('finance'));
        $this->assertFalse($this->manager->hasPermission('purchase_orders'));
    }

    public function test_user_specific_overrides()
    {
        // Manager default: finance is false
        $this->assertFalse($this->manager->hasPermission('finance'));

        // Override finance to true for this user
        Setting::setVal('user_permissions', json_encode([
            $this->manager->id => [
                'finance' => true,
                'jobs' => false, // override default true to false
            ]
        ]));

        $this->assertTrue($this->manager->hasPermission('finance'));
        $this->assertFalse($this->manager->hasPermission('jobs'));
    }

    public function test_endpoints_fetch_and_save()
    {
        $this->actingAs($this->admin);

        // Fetch
        $response = $this->getJson('/api/settings/permissions');
        $response->assertStatus(200);
        $response->assertJsonStructure([
            'role_permissions',
            'user_permissions',
            'users'
        ]);

        // Save
        $saveResponse = $this->postJson('/api/settings/permissions', [
            'role_permissions' => [
                'manager' => [
                    'purchase_orders' => true,
                    'jobs' => true,
                    'payroll' => true,
                    'finance' => true,
                    'settings' => true,
                ]
            ],
            'user_permissions' => [
                $this->manager->id => [
                    'settings' => false
                ]
            ]
        ]);

        $saveResponse->assertStatus(200);
        
        // Verify database updated
        $this->assertEquals(
            ['settings' => false],
            json_decode(Setting::getVal('user_permissions', '{}'), true)[$this->manager->id]
        );
    }

    public function test_notifications_settings_switching()
    {
        // 1. Initially enabled
        Setting::setVal('notif_po_enabled', 'true');
        Setting::setVal('notif_attendance_enabled', 'true');

        // Dispatch PO notification
        \App\Services\PushNotificationService::sendToRoles(['admin'], 'PO test', 'body', 'purchase_order');
        $this->assertEquals(1, \App\Models\Notification::count());

        // Dispatch Attendance notification
        \App\Services\PushNotificationService::sendToRoles(['admin'], 'Att test', 'body', 'attendance_reminder');
        $this->assertEquals(2, \App\Models\Notification::count());

        // 2. Disable PO and Attendance alerts in settings
        Setting::setVal('notif_po_enabled', 'false');
        Setting::setVal('notif_attendance_enabled', 'false');

        // Dispatch PO notification (should be skipped)
        \App\Services\PushNotificationService::sendToRoles(['admin'], 'PO test 2', 'body', 'purchase_order');
        $this->assertEquals(2, \App\Models\Notification::count());

        // Dispatch Attendance notification (should be skipped)
        \App\Services\PushNotificationService::sendToRoles(['admin'], 'Att test 2', 'body', 'attendance_reminder');
        $this->assertEquals(2, \App\Models\Notification::count());
    }
}
