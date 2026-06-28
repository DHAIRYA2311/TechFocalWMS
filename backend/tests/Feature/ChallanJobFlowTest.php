<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use App\Models\IncomingChallan;
use App\Models\IncomingChallanItem;
use App\Models\JobCard;
use App\Models\Machine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChallanJobFlowTest extends TestCase
{
    use RefreshDatabase;

    protected $manager;
    protected $worker;
    protected $po;
    protected $itemA;
    protected $itemB;
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

        // 2. Create an approved Purchase Order
        $this->po = PurchaseOrder::create([
            'po_number' => 'PO-TEST-100',
            'po_date' => date('Y-m-d'),
            'customer_name' => 'Sandvik India',
            'customer_address' => 'Dapodi, Pune',
            'customer_gstin' => '27AAACS1234F1Z1',
            'status' => 'approved',
        ]);

        // 3. Add items to Purchase Order
        $this->itemA = PoItem::create([
            'purchase_order_id' => $this->po->id,
            'item_code' => 'CODE-A',
            'description' => 'Fabrication Item A',
            'quantity' => 10.00,
            'rate' => 100.00,
            'uqc' => 'PC',
            'unit' => 'PC',
            'total_amount' => 1000.00,
        ]);

        $this->itemB = PoItem::create([
            'purchase_order_id' => $this->po->id,
            'item_code' => 'CODE-B',
            'description' => 'Milling Item B',
            'quantity' => 5.00,
            'rate' => 200.00,
            'uqc' => 'PC',
            'unit' => 'PC',
            'total_amount' => 1000.00,
        ]);

        // 4. Create an idle machine
        $this->machine = Machine::create([
            'machine_code' => 'CNC-01',
            'name' => 'Test Machine CNC-01',
            'type' => 'Milling',
            'status' => 'idle',
        ]);
    }

    /**
     * Test the entire flow from Logging Challan to Job Card completion.
     */
    public function test_complete_challan_to_job_flow()
    {
        // Act as manager for logging challan
        $this->actingAs($this->manager);

        // 1. Log an Incoming Challan (receiving 4 of Item A, and 2 of Item B)
        $payload = [
            'challan_number' => 'DC-TEST-99',
            'challan_date' => date('Y-m-d'),
            'purchase_order_id' => $this->po->id,
            'remarks' => 'First batch received',
            'items' => [
                [
                    'po_item_id' => $this->itemA->id,
                    'quantity_received' => 4.00,
                ],
                [
                    'po_item_id' => $this->itemB->id,
                    'quantity_received' => 2.00,
                ]
            ]
        ];

        $response = $this->postJson('/api/incoming-challans', $payload);

        $response->assertStatus(200)
                 ->assertJsonStructure(['message', 'challan']);

        // 2. Assert records in database
        $this->assertDatabaseHas('incoming_challans', [
            'challan_number' => 'DC-TEST-99',
            'purchase_order_id' => $this->po->id,
        ]);

        $this->assertDatabaseHas('incoming_challan_items', [
            'po_item_id' => $this->itemA->id,
            'quantity_received' => 4.00,
        ]);

        $this->assertDatabaseHas('incoming_challan_items', [
            'po_item_id' => $this->itemB->id,
            'quantity_received' => 2.00,
        ]);

        // 3. Assert Job Cards were auto-generated
        $this->assertDatabaseCount('job_cards', 2);
        
        $jobA = JobCard::where('po_item_id', $this->itemA->id)->first();
        $this->assertNotNull($jobA);
        $this->assertEquals(4.00, $jobA->quantity);
        $this->assertEquals('pending', $jobA->status);

        $jobB = JobCard::where('po_item_id', $this->itemB->id)->first();
        $this->assertNotNull($jobB);
        $this->assertEquals(2.00, $jobB->quantity);
        $this->assertEquals('pending', $jobB->status);

        // 4. Assign Job Card A to Worker on Machine CNC-01 (as Manager)
        $assignPayload = [
            'assigned_worker_id' => $this->worker->id,
            'machine_id' => $this->machine->id,
        ];

        $assignRes = $this->putJson("/api/jobs/{$jobA->id}/assign", $assignPayload);
        $assignRes->assertStatus(200);

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobA->id,
            'assigned_worker_id' => $this->worker->id,
            'machine_id' => $this->machine->id,
            'status' => 'in_progress', // Verify auto-advance to Machining column
        ]);

        // 5. Upload a technical drawing (as Manager)
        \Illuminate\Support\Facades\Storage::fake('public');
        $file = \Illuminate\Http\UploadedFile::fake()->create('blueprint.pdf', 500);

        $drawingRes = $this->postJson("/api/jobs/{$jobA->id}/drawing", [
            'file' => $file
        ]);
        $drawingRes->assertStatus(200);

        $jobA = JobCard::findOrFail($jobA->id);
        $this->assertNotNull($jobA->drawing_path);
        $this->assertStringContainsString('job_drawing', $jobA->drawing_path[0]['path']);

        // 6. Transition Job Card A status (as Worker)
        $this->actingAs($this->worker);

        // Worker starts the job (or updates status with notes)
        $statusPayload1 = [
            'status' => 'in_progress',
            'remarks' => 'Setup lathe tooling',
        ];
        $statusRes1 = $this->putJson("/api/jobs/{$jobA->id}/status", $statusPayload1);
        $statusRes1->assertStatus(200);

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobA->id,
            'status' => 'in_progress',
            'start_date' => date('Y-m-d'),
        ]);

        // Worker submits for quality inspection
        $statusPayload2 = [
            'status' => 'inspection',
            'remarks' => 'Machining complete, ready for QC',
        ];
        $statusRes2 = $this->putJson("/api/jobs/{$jobA->id}/status", $statusPayload2);
        $statusRes2->assertStatus(200);

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobA->id,
            'status' => 'inspection',
        ]);

        // 6. QC Sign-off (as Manager)
        $this->actingAs($this->manager);

        $statusPayload3 = [
            'status' => 'completed',
            'remarks' => 'Inspected and approved by QC manager',
        ];
        $statusRes3 = $this->putJson("/api/jobs/{$jobA->id}/status", $statusPayload3);
        $statusRes3->assertStatus(200);

        $this->assertDatabaseHas('job_cards', [
            'id' => $jobA->id,
            'status' => 'completed',
            'end_date' => date('Y-m-d'),
        ]);
    }
}
