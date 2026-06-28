<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Attendance;
use App\Models\SalaryAdvance;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class PayrollFlowTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;
    protected $worker;
    protected $helper;
    protected $admin;

    protected function setUp(): void
    {
        parent::setUp();

        // Create standard test users
        $this->manager = User::create([
            'name' => 'Test Manager',
            'email' => 'm@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'status' => 'active',
            'phone' => '1234567890',
            'salary' => 52000.00, // 52000 / 26 = 2000 daily
        ]);

        $this->worker = User::create([
            'name' => 'Test Worker',
            'email' => 'w@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'status' => 'active',
            'phone' => '0987654321',
            'salary' => 26000.00, // 26000 / 26 = 1000 daily (1000 / 8 = 125 hourly rate)
        ]);

        $this->helper = User::create([
            'name' => 'Test Helper',
            'email' => 'h@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'helper',
            'status' => 'active',
            'phone' => '5555555555',
            'salary' => 13000.00, // 13000 / 26 = 500 daily (500 / 8 = 62.5 hourly rate)
        ]);

        $this->admin = User::create([
            'name' => 'Test Admin',
            'email' => 'admin@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9999999999',
            'salary' => 100000.00,
        ]);
    }

    /**
     * Test fetching overall payroll statistics.
     */
    public function test_get_payroll_stats()
    {
        $this->actingAs($this->manager);

        // Fetch stats when empty
        $response = $this->getJson('/api/payroll/stats');
        $response->assertStatus(200)
                 ->assertJsonPath('total_pending_advances', 0)
                 ->assertJsonPath('total_paid_this_month', 0);

        // Grant a pending advance
        SalaryAdvance::create([
            'user_id' => $this->worker->id,
            'amount' => 5000.00,
            'date' => Carbon::now()->toDateString(),
            'status' => 'pending',
        ]);

        // Process a paid payroll item for this month
        $payroll = Payroll::create([
            'month' => Carbon::now()->month,
            'year' => Carbon::now()->year,
            'status' => 'processed',
            'processed_by' => $this->manager->id,
            'processed_at' => Carbon::now(),
        ]);

        PayrollItem::create([
            'payroll_id' => $payroll->id,
            'user_id' => $this->worker->id,
            'base_salary' => 26000.00,
            'days_present' => 26,
            'days_absent' => 0,
            'days_half_day' => 0,
            'days_leave' => 0,
            'gross_salary' => 26000.00,
            'attendance_deductions' => 0,
            'overtime_hours' => 0,
            'overtime_pay' => 0,
            'pf_deductions' => 1800.00,
            'pt_deductions' => 200.00,
            'advance_deductions' => 0,
            'bonus' => 0,
            'net_salary' => 24000.00,
            'payment_status' => 'paid',
            'paid_at' => Carbon::now(),
        ]);

        $response = $this->getJson('/api/payroll/stats');
        $response->assertStatus(200)
                 ->assertJsonPath('total_pending_advances', 5000)
                 ->assertJsonPath('total_paid_this_month', 24000);
    }

    /**
     * Test granting a salary advance.
     */
    public function test_grant_salary_advance()
    {
        $this->actingAs($this->manager);

        // Grant to worker (eligible)
        $response = $this->postJson('/api/payroll-advances', [
            'user_id' => $this->worker->id,
            'amount' => 3000.00,
            'date' => '2026-05-29',
            'notes' => 'Medical Advance',
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('advance.amount', '3000.00')
                 ->assertJsonPath('advance.status', 'pending');

        $this->assertDatabaseHas('salary_advances', [
            'user_id' => $this->worker->id,
            'amount' => 3000.00,
            'status' => 'pending',
            'notes' => 'Medical Advance',
        ]);

        // Attempting to grant to admin (ineligible) should fail
        $failResponse = $this->postJson('/api/payroll-advances', [
            'user_id' => $this->admin->id,
            'amount' => 5000.00,
            'date' => '2026-05-29',
        ]);

        $failResponse->assertStatus(422)
                     ->assertJsonFragment(['message' => 'Salary advances cannot be granted to Admins or Partners.']);
    }

    /**
     * Test canceling a pending salary advance.
     */
    public function test_cancel_salary_advance()
    {
        $advance = SalaryAdvance::create([
            'user_id' => $this->worker->id,
            'amount' => 4000.00,
            'date' => '2026-05-29',
            'status' => 'pending',
        ]);

        $this->actingAs($this->manager);

        $response = $this->deleteJson("/api/payroll-advances/{$advance->id}");
        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Salary advance cancelled successfully.');

        $this->assertDatabaseMissing('salary_advances', [
            'id' => $advance->id,
        ]);
    }

    /**
     * Test calculating draft payroll with attendance deductions, overtime, PF, and PT.
     */
    public function test_calculate_draft_payroll()
    {
        $month = 5;
        $year = 2026;

        // 1. Worker: Present 22 days, Absent 2 days, Half-day 2 days (unpaid days = 2 + 1 = 3 days)
        // Daily rate: 26000 / 26 = 1000. Attendance cuts: 3 * 1000 = 3000. Gross: 26000 - 3000 = 23000.
        // Also clock log with Overtime: 2 days having clock in/out.
        // Let's create attendance records for Worker.
        for ($day = 1; $day <= 22; $day++) {
            Attendance::create([
                'user_id' => $this->worker->id,
                'date' => Carbon::create($year, $month, $day)->toDateString(),
                'status' => 'present',
            ]);
        }
        for ($day = 23; $day <= 24; $day++) {
            Attendance::create([
                'user_id' => $this->worker->id,
                'date' => Carbon::create($year, $month, $day)->toDateString(),
                'status' => 'absent',
            ]);
        }
        for ($day = 25; $day <= 26; $day++) {
            Attendance::create([
                'user_id' => $this->worker->id,
                'date' => Carbon::create($year, $month, $day)->toDateString(),
                'status' => 'half_day',
            ]);
        }

        // Add clock logs with overtime for Worker
        // Day 1: clock_in = 08:00, clock_out = 18:30 (10.5 hours = 2.5 hours OT)
        Attendance::where('user_id', $this->worker->id)
            ->where('date', Carbon::create($year, $month, 1)->toDateString())
            ->update([
                'clock_in' => '08:00:00',
                'clock_out' => '18:30:00',
            ]);
        // Day 2: clock_in = 09:00, clock_out = 18:30 (9.5 hours = 1.5 hours OT)
        Attendance::where('user_id', $this->worker->id)
            ->where('date', Carbon::create($year, $month, 2)->toDateString())
            ->update([
                'clock_in' => '09:00:00',
                'clock_out' => '18:30:00',
            ]);
        // Total Overtime Hours = 2.5 + 1.5 = 4.0 hours.
        // Worker Hourly rate: (26000 / 26) / 8 = 125.
        // Overtime pay: 4.0 * 125 * 1.5 = 750.
        // Gross basic: 23000.
        // Gross for PT calculation: 23000 + 750 = 23750.
        // PF: 12% of Gross basic (23000 * 0.12) = 2760, but capped at 1800. PF = 1800.
        // PT: Gross for PT exceeds 10000, so PT = 200.
        // Outstanding advance: Grant pending advance of 5000.
        SalaryAdvance::create([
            'user_id' => $this->worker->id,
            'amount' => 5000.00,
            'date' => '2026-05-10',
            'status' => 'pending',
        ]);
        // Suggested advance deduction: min(5000, 23000 + 750 - 1800 - 200) = min(5000, 21750) = 5000.
        // Net: 21750 - 5000 = 16750.

        $this->actingAs($this->manager);

        $response = $this->postJson('/api/payroll/calculate', [
            'month' => $month,
            'year' => $year,
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('month', $month)
                 ->assertJsonPath('year', $year);

        $items = $response->json('items');
        $workerItem = collect($items)->firstWhere('user_id', $this->worker->id);

        $this->assertNotNull($workerItem);
        $this->assertEquals(26000.00, $workerItem['base_salary']);
        $this->assertEquals(22, $workerItem['days_present']);
        $this->assertEquals(2, $workerItem['days_absent']);
        $this->assertEquals(2, $workerItem['days_half_day']);
        $this->assertEquals(3000.00, $workerItem['attendance_deductions']);
        $this->assertEquals(23000.00, $workerItem['gross_salary']);
        $this->assertEquals(4.0, $workerItem['overtime_hours']);
        $this->assertEquals(750.00, $workerItem['overtime_pay']);
        $this->assertEquals(1800.00, $workerItem['pf_deductions']);
        $this->assertEquals(200.00, $workerItem['pt_deductions']);
        $this->assertEquals(5000.00, $workerItem['outstanding_advances']);
        $this->assertEquals(5000.00, $workerItem['advance_deductions']);
        $this->assertEquals(16750.00, $workerItem['net_salary']);
    }

    /**
     * Test saving a payroll run and partial advance splits.
     */
    public function test_save_payroll_run_and_advance_splitting()
    {
        $month = 5;
        $year = 2026;

        // Setup outstanding advance of 8000 for Worker
        $originalAdvance = SalaryAdvance::create([
            'user_id' => $this->worker->id,
            'amount' => 8000.00,
            'date' => '2026-05-01',
            'status' => 'pending',
        ]);

        $this->actingAs($this->manager);

        // Mock items payload from draft calculation
        // Worker base salary: 26000, 26 days present. Net payout before advances is 26000 - 1800 (PF) - 200 (PT) = 24000.
        // We will deduct 5000 from the 8000 advance.
        $payload = [
            'month' => $month,
            'year' => $year,
            'items' => [
                [
                    'user_id' => $this->worker->id,
                    'base_salary' => 26000.00,
                    'days_present' => 26,
                    'days_absent' => 0,
                    'days_half_day' => 0,
                    'days_leave' => 0,
                    'gross_salary' => 26000.00,
                    'attendance_deductions' => 0,
                    'overtime_hours' => 0,
                    'overtime_pay' => 0,
                    'pf_deductions' => 1800.00,
                    'pt_deductions' => 200.00,
                    'advance_deductions' => 5000.00, // Deducting only 5000 out of 8000
                    'bonus' => 500.00,
                    'net_salary' => 19500.00, // 26000 - 1800 - 200 - 5000 + 500 = 19500
                    'notes' => 'Bonus for active participation',
                ],
                [
                    'user_id' => $this->helper->id,
                    'base_salary' => 13000.00,
                    'days_present' => 26,
                    'days_absent' => 0,
                    'days_half_day' => 0,
                    'days_leave' => 0,
                    'gross_salary' => 13000.00,
                    'attendance_deductions' => 0,
                    'overtime_hours' => 0,
                    'overtime_pay' => 0,
                    'pf_deductions' => 1560.00, // 13000 * 0.12 = 1560
                    'pt_deductions' => 200.00, // gross = 13000 > 10000
                    'advance_deductions' => 0.00,
                    'bonus' => 0,
                    'net_salary' => 11240.00, // 13000 - 1560 - 200 = 11240
                    'notes' => '',
                ]
            ]
        ];

        $response = $this->postJson('/api/payroll/save', $payload);
        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Payroll processed and saved successfully.');

        // Verify database states
        $this->assertDatabaseHas('payrolls', [
            'month' => $month,
            'year' => $year,
            'status' => 'processed',
        ]);

        $payroll = Payroll::where('month', $month)->where('year', $year)->first();

        $this->assertDatabaseHas('payroll_items', [
            'payroll_id' => $payroll->id,
            'user_id' => $this->worker->id,
            'advance_deductions' => 5000.00,
            'net_salary' => 19500.00,
            'payment_status' => 'unpaid',
        ]);

        $payrollItem = PayrollItem::where('payroll_id', $payroll->id)->where('user_id', $this->worker->id)->first();

        // The original advance of 8000 should be split:
        // 1. One advance row updated to status='deducted' with amount=5000.00 and payroll_item_id
        $this->assertDatabaseHas('salary_advances', [
            'id' => $originalAdvance->id,
            'amount' => 5000.00,
            'status' => 'deducted',
            'payroll_item_id' => $payrollItem->id,
        ]);

        // 2. A new advance row created with status='pending', amount=3000.00
        $this->assertDatabaseHas('salary_advances', [
            'user_id' => $this->worker->id,
            'amount' => 3000.00,
            'status' => 'pending',
            'payroll_item_id' => null,
        ]);

        // Double processing prevention: attempt to calculate/save again should fail
        $dupCalc = $this->postJson('/api/payroll/calculate', [
            'month' => $month,
            'year' => $year,
        ]);
        $dupCalc->assertStatus(422);

        $dupSave = $this->postJson('/api/payroll/save', $payload);
        $dupSave->assertStatus(422);
    }

    /**
     * Test settling individual payroll item payments and generating slips.
     */
    public function test_settle_payroll_item_and_fetch_slip()
    {
        $this->actingAs($this->manager);

        $payroll = Payroll::create([
            'month' => 5,
            'year' => 2026,
            'status' => 'processed',
            'processed_by' => $this->manager->id,
            'processed_at' => Carbon::now(),
        ]);

        $item = PayrollItem::create([
            'payroll_id' => $payroll->id,
            'user_id' => $this->worker->id,
            'base_salary' => 26000.00,
            'days_present' => 26,
            'days_absent' => 0,
            'days_half_day' => 0,
            'days_leave' => 0,
            'gross_salary' => 26000.00,
            'attendance_deductions' => 0,
            'overtime_hours' => 0,
            'overtime_pay' => 0,
            'pf_deductions' => 1800.00,
            'pt_deductions' => 200.00,
            'advance_deductions' => 0,
            'bonus' => 0,
            'net_salary' => 24000.00,
            'payment_status' => 'unpaid',
        ]);

        // Settle payment
        $response = $this->putJson("/api/payroll/items/{$item->id}/pay");
        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Payment status updated to paid.');

        $this->assertDatabaseHas('payroll_items', [
            'id' => $item->id,
            'payment_status' => 'paid',
        ]);

        // Fetch payslip details
        $slipResponse = $this->getJson("/api/payroll/items/{$item->id}/slip");
        $slipResponse->assertStatus(200)
                     ->assertJsonStructure([
                         'company' => ['name', 'address', 'gstin'],
                         'item' => ['id', 'net_salary', 'user', 'payroll'],
                         'advances'
                     ]);
    }
}
