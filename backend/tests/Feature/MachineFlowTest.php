<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Machine;
use App\Models\JobCard;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use App\Models\IncomingChallan;
use App\Models\IncomingChallanItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class MachineFlowTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;
    protected $worker;
    protected $machine;

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

        // 2. Create an idle machine
        $this->machine = Machine::create([
            'machine_code' => 'CNC-99',
            'name' => 'Test CNC Machine',
            'type' => 'Milling',
            'status' => 'idle',
            'hourly_rate' => 500.00,
        ]);
    }

    /**
     * Test machine registration and permissions.
     */
    public function test_machine_registration_and_listing()
    {
        // 1. Worker tries to register a machine (should fail with 403)
        $this->actingAs($this->worker);
        $payload = [
            'machine_code' => 'CNC-100',
            'name' => 'Failed Lathe',
            'type' => 'Lathe',
        ];
        $response = $this->postJson('/api/machines', $payload);
        $response->assertStatus(403);

        // 2. Manager registers a machine (should succeed)
        $this->actingAs($this->manager);
        $payload['machine_code'] = 'CNC-101';
        $payload['name'] = 'Manager CNC';
        $response = $this->postJson('/api/machines', $payload);
        $response->assertStatus(200);
        $this->assertDatabaseHas('machines', [
            'machine_code' => 'CNC-101',
            'name' => 'Manager CNC',
            'status' => 'idle',
        ]);

        // 3. Retrieve machine list
        $listResponse = $this->getJson('/api/machines');
        $listResponse->assertStatus(200)
                     ->assertJsonCount(2); // CNC-99 and CNC-101
    }

    /**
     * Test machine maintenance logging and availability validation.
     */
    public function test_machine_maintenance_log_and_allocation_validation()
    {
        $this->actingAs($this->manager);

        // 1. Log breakdown on machine CNC-99
        $logPayload = [
            'log_type' => 'breakdown',
            'description' => 'Belt slip, motor overheating',
            'cost' => 1500.00
        ];
        $logResponse = $this->postJson("/api/machines/{$this->machine->id}/maintenance", $logPayload);
        $logResponse->assertStatus(200)
                   ->assertJsonPath('machine_status', 'maintenance');

        $this->assertDatabaseHas('machines', [
            'id' => $this->machine->id,
            'status' => 'maintenance',
        ]);
        $this->assertEquals(Carbon::today()->toDateString(), Machine::findOrFail($this->machine->id)->last_maintenance_date->toDateString());

        $this->assertDatabaseHas('machine_logs', [
            'machine_id' => $this->machine->id,
            'log_type' => 'breakdown',
            'cost' => 1500.00,
        ]);

        // 2. Set up dummy job card
        $po = PurchaseOrder::create([
            'po_number' => 'PO-DUMMY',
            'customer_name' => 'Dummy Client',
            'status' => 'approved',
        ]);
        $poItem = PoItem::create([
            'purchase_order_id' => $po->id,
            'item_code' => 'DUMMY-ITEM',
            'description' => 'Dummy Item Description',
            'quantity' => 10,
            'rate' => 100,
            'total_amount' => 1000,
        ]);
        $challan = IncomingChallan::create([
            'challan_number' => 'CH-DUMMY',
            'challan_date' => date('Y-m-d'),
            'purchase_order_id' => $po->id,
            'received_by' => $this->manager->id,
        ]);
        $challanItem = IncomingChallanItem::create([
            'incoming_challan_id' => $challan->id,
            'po_item_id' => $poItem->id,
            'quantity_received' => 10,
        ]);
        $jobCard = JobCard::create([
            'job_card_number' => 'JC-DUMMY-01',
            'incoming_challan_item_id' => $challanItem->id,
            'po_item_id' => $poItem->id,
            'quantity' => 10,
            'status' => 'pending',
        ]);

        // 3. Try to assign the job to CNC-99 (should fail because it is under maintenance)
        $assignPayload = [
            'assigned_worker_id' => $this->worker->id,
            'machine_id' => $this->machine->id,
        ];
        $assignResponse = $this->putJson("/api/jobs/{$jobCard->id}/assign", $assignPayload);
        $assignResponse->assertStatus(422)
                       ->assertJsonPath('message', 'The selected machine is currently under maintenance.');

        // 4. Override status back to idle
        $overridePayload = [
            'log_type' => 'status_override',
            'description' => 'Servicing complete. Returned to operations.',
        ];
        $this->postJson("/api/machines/{$this->machine->id}/maintenance", $overridePayload)
             ->assertStatus(200)
             ->assertJsonPath('machine_status', 'idle');

        // 5. Try to assign again (should succeed and switch machine status to busy because job advances to in_progress)
        $assignResponse2 = $this->putJson("/api/jobs/{$jobCard->id}/assign", $assignPayload);
        $assignResponse2->assertStatus(200);

        $this->assertDatabaseHas('machines', [
            'id' => $this->machine->id,
            'status' => 'busy',
        ]);

        // 6. Transition job card to completed (should release machine back to idle)
        $statusPayload = [
            'status' => 'completed',
            'remarks' => 'Machining done',
        ];
        $this->putJson("/api/jobs/{$jobCard->id}/status", $statusPayload)
             ->assertStatus(200);

        $this->assertDatabaseHas('machines', [
            'id' => $this->machine->id,
            'status' => 'idle',
        ]);
    }
}
