<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Attendance;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class AttendanceFlowTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;
    protected $worker;
    protected $helper;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create test users
        $this->manager = User::create([
            'name' => 'Test Manager',
            'email' => 'm@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'manager',
            'status' => 'active',
            'phone' => '1234567890',
        ]);

        $this->worker = User::create([
            'name' => 'Test Worker',
            'email' => 'w@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'status' => 'active',
            'phone' => '0987654321',
        ]);

        $this->helper = User::create([
            'name' => 'Test Helper',
            'email' => 'h@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'helper',
            'status' => 'active',
            'phone' => '5555555555',
        ]);
    }

    /**
     * Test self clock-in and clock-out operations for workers.
     */
    public function test_worker_self_clock_in_and_out()
    {
        // 1. Clock in before 9:00 AM (e.g., 8:30 AM)
        Carbon::setTestNow(Carbon::today()->setTime(8, 30, 0));
        
        $this->actingAs($this->worker);
        
        $response = $this->postJson('/api/attendance/clock-in');
        $response->assertStatus(200)
                 ->assertJsonPath('attendance.status', 'present')
                 ->assertJsonPath('attendance.clock_in', '08:30');

        $this->assertDatabaseHas('attendances', [
            'user_id' => $this->worker->id,
            'date' => Carbon::today()->toDateString(),
            'status' => 'present',
            'clock_in' => '08:30:00',
            'clock_out' => null,
        ]);

        // Attempting to clock in again should fail
        $retryResponse = $this->postJson('/api/attendance/clock-in');
        $retryResponse->assertStatus(400);

        // 2. Clock out later (e.g., 5:00 PM)
        Carbon::setTestNow(Carbon::today()->setTime(17, 0, 0));

        $outResponse = $this->postJson('/api/attendance/clock-out');
        $outResponse->assertStatus(200)
                   ->assertJsonPath('attendance.clock_out', '17:00');

        $this->assertDatabaseHas('attendances', [
            'user_id' => $this->worker->id,
            'date' => Carbon::today()->toDateString(),
            'status' => 'present',
            'clock_in' => '08:30:00',
            'clock_out' => '17:00:00',
        ]);

        // Attempting to clock out again should fail
        $retryOutResponse = $this->postJson('/api/attendance/clock-out');
        $retryOutResponse->assertStatus(400);
    }

    /**
     * Test late arrival marking.
     */
    public function test_worker_late_arrival()
    {
        // Clock in after 9:00 AM (e.g., 9:15 AM)
        Carbon::setTestNow(Carbon::today()->setTime(9, 15, 0));
        
        $this->actingAs($this->worker);
        
        $response = $this->postJson('/api/attendance/clock-in');
        $response->assertStatus(200)
                 ->assertJsonPath('attendance.status', 'late')
                 ->assertJsonPath('attendance.clock_in', '09:15');

        $this->assertDatabaseHas('attendances', [
            'user_id' => $this->worker->id,
            'date' => Carbon::today()->toDateString(),
            'status' => 'late',
            'clock_in' => '09:15:00',
        ]);
    }

    /**
     * Test manager viewing registers and monthly grids.
     */
    public function test_manager_views_register_and_matrix()
    {
        // Setup clock logs
        Carbon::setTestNow(Carbon::today()->setTime(8, 0, 0));
        
        // Worker present
        Attendance::create([
            'user_id' => $this->worker->id,
            'date' => Carbon::today()->toDateString(),
            'status' => 'present',
            'clock_in' => '08:00:00',
        ]);

        // Helper late
        Attendance::create([
            'user_id' => $this->helper->id,
            'date' => Carbon::today()->toDateString(),
            'status' => 'late',
            'clock_in' => '09:30:00',
        ]);

        $this->actingAs($this->manager);

        // Fetch daily register
        $response = $this->getJson('/api/attendance?date=' . Carbon::today()->toDateString());
        $response->assertStatus(200)
                 ->assertJsonCount(3, 'records'); // manager, worker, helper (excluding admin if not seeded, but here active users are manager, worker, helper)

        $records = $response->json('records');
        
        // Find worker record
        $workerRecord = collect($records)->firstWhere('id', $this->worker->id);
        $this->assertNotNull($workerRecord);
        $this->assertEquals('present', $workerRecord['attendance']['status']);
        $this->assertEquals('08:00', $workerRecord['attendance']['clock_in']);

        // Find helper record
        $helperRecord = collect($records)->firstWhere('id', $this->helper->id);
        $this->assertNotNull($helperRecord);
        $this->assertEquals('late', $helperRecord['attendance']['status']);
        $this->assertEquals('09:30', $helperRecord['attendance']['clock_in']);

        // Fetch with matrix data
        $matrixResponse = $this->getJson('/api/attendance?date=' . Carbon::today()->toDateString() . '&include_matrix=1');
        $matrixResponse->assertStatus(200)
                       ->assertJsonStructure(['records', 'matrix']);
        
        $matrix = $matrixResponse->json('matrix');
        $this->assertEquals('present', $matrix[$this->worker->id][Carbon::today()->toDateString()]);
        $this->assertEquals('late', $matrix[$this->helper->id][Carbon::today()->toDateString()]);
    }

    /**
     * Test worker viewing their own calendar logs.
     */
    public function test_worker_views_own_logs()
    {
        $today = Carbon::today()->toDateString();
        
        Attendance::create([
            'user_id' => $this->worker->id,
            'date' => $today,
            'status' => 'present',
            'clock_in' => '08:00:00',
        ]);

        // Create log for helper to ensure worker doesn't see it
        Attendance::create([
            'user_id' => $this->helper->id,
            'date' => $today,
            'status' => 'present',
            'clock_in' => '08:15:00',
        ]);

        $this->actingAs($this->worker);

        $response = $this->getJson('/api/attendance');
        $response->assertStatus(200)
                 ->assertJsonStructure(['logs', 'today'])
                 ->assertJsonCount(1, 'logs'); // only worker's own log

        $this->assertEquals($this->worker->id, $requestUser = $this->worker->id);
        $this->assertEquals('present', $response->json('today.status'));
    }

    /**
     * Test manager bulk updating register.
     */
    public function test_manager_bulk_saves_register()
    {
        $today = Carbon::today()->toDateString();
        
        $this->actingAs($this->manager);

        $payload = [
            'date' => $today,
            'records' => [
                [
                    'user_id' => $this->worker->id,
                    'status' => 'absent',
                    'clock_in' => null,
                    'clock_out' => null,
                    'notes' => 'Did not inform'
                ],
                [
                    'user_id' => $this->helper->id,
                    'status' => 'leave',
                    'clock_in' => null,
                    'clock_out' => null,
                    'notes' => 'Medical leave approved'
                ]
            ]
        ];

        $response = $this->postJson('/api/attendance', $payload);
        $response->assertStatus(200);

        $this->assertDatabaseHas('attendances', [
            'user_id' => $this->worker->id,
            'date' => $today,
            'status' => 'absent',
            'notes' => 'Did not inform',
            'marked_by' => $this->manager->id,
        ]);

        $this->assertDatabaseHas('attendances', [
            'user_id' => $this->helper->id,
            'date' => $today,
            'status' => 'leave',
            'notes' => 'Medical leave approved',
            'marked_by' => $this->manager->id,
        ]);
    }

    /**
     * Test dashboard stats retrieval.
     */
    public function test_attendance_stats()
    {
        $today = Carbon::today()->toDateString();

        // 1 present, 1 late, 1 absent (manager, helper, worker)
        Attendance::create([
            'user_id' => $this->manager->id,
            'date' => $today,
            'status' => 'present',
            'clock_in' => '08:00:00'
        ]);

        Attendance::create([
            'user_id' => $this->helper->id,
            'date' => $today,
            'status' => 'late',
            'clock_in' => '09:30:00'
        ]);

        Attendance::create([
            'user_id' => $this->worker->id,
            'date' => $today,
            'status' => 'absent'
        ]);

        $this->actingAs($this->manager);

        $response = $this->getJson('/api/attendance/stats');
        $response->assertStatus(200)
                 ->assertJsonPath('today.present', 2) // present + late count as present
                 ->assertJsonPath('today.late', 1)
                 ->assertJsonPath('today.absent', 1)
                 ->assertJsonPath('today.total_staff', 3);
    }
}
