<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PurchaseOrder;
use App\Models\Machine;
use App\Models\JobCard;
use App\Models\PoItem;
use App\Models\IncomingChallan;
use App\Models\IncomingChallanItem;
use App\Models\Invoice;
use App\Models\DeliveryChallan;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class SearchFlowTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $po;
    protected $staff;
    protected $machine;
    protected $jobCard;
    protected $invoice;
    protected $challan;

    protected function setUp(): void
    {
        parent::setUp();

        // 1. Create test admin user
        $this->admin = User::create([
            'name' => 'Search Master Admin',
            'email' => 'admin.search@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '9988776655',
        ]);

        // 2. Create test staff user
        $this->staff = User::create([
            'name' => 'John Workshop Operator',
            'email' => 'john.operator@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'worker',
            'status' => 'active',
            'phone' => '8877665544',
        ]);

        // 3. Create test PO
        $this->po = PurchaseOrder::create([
            'po_number' => 'PO-9999',
            'customer_name' => 'Titan Engineering Group',
            'po_date' => '2026-06-20',
            'status' => 'approved',
        ]);

        $poItem = PoItem::create([
            'purchase_order_id' => $this->po->id,
            'description' => 'Titanium Spacer Bar',
            'quantity' => 10,
            'rate' => 500,
            'total_amount' => 5000,
        ]);

        // Create Incoming Challan
        $incChallan = IncomingChallan::create([
            'challan_number' => 'INC-CH-9999',
            'challan_date' => date('Y-m-d'),
            'purchase_order_id' => $this->po->id,
            'received_by' => $this->admin->id,
        ]);

        $incChallanItem = IncomingChallanItem::create([
            'incoming_challan_id' => $incChallan->id,
            'po_item_id' => $poItem->id,
            'quantity_received' => 10,
        ]);

        // 4. Create test machine
        $this->machine = Machine::create([
            'machine_code' => 'CNC-SH-01',
            'name' => 'Shibaura Lathe CNC',
            'type' => 'Lathe',
            'status' => 'idle',
        ]);

        // 5. Create test job card
        $this->jobCard = JobCard::create([
            'job_card_number' => 'JOB-9999',
            'incoming_challan_item_id' => $incChallanItem->id,
            'po_item_id' => $poItem->id,
            'quantity' => 10,
            'status' => 'completed',
        ]);

        // 6. Create test delivery challan
        $this->challan = DeliveryChallan::create([
            'challan_number' => 'DC-9999',
            'challan_date' => '2026-06-21',
            'purchase_order_id' => $this->po->id,
        ]);

        // 7. Create test invoice
        $this->invoice = Invoice::create([
            'invoice_number' => 'INV-9999',
            'invoice_date' => '2026-06-22',
            'purchase_order_id' => $this->po->id,
            'subtotal' => 5000,
            'grand_total' => 5900,
        ]);
    }

    /**
     * Test global search results matching categories.
     */
    public function test_can_perform_global_search_across_all_categories()
    {
        $this->actingAs($this->admin);

        // A. Search for PO number
        $response = $this->getJson('/api/search?q=PO-99');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'purchase_orders')
                 ->assertJsonPath('purchase_orders.0.po_number', 'PO-9999');

        // B. Search for customer name
        $response = $this->getJson('/api/search?q=Titan');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'purchase_orders')
                 ->assertJsonPath('purchase_orders.0.customer_name', 'Titan Engineering Group');

        // C. Search for staff user
        $response = $this->getJson('/api/search?q=John');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'users')
                 ->assertJsonPath('users.0.name', 'John Workshop Operator');

        // D. Search for machine
        $response = $this->getJson('/api/search?q=SH-01');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'machines')
                 ->assertJsonPath('machines.0.machine_code', 'CNC-SH-01');

        // E. Search for Job Card
        $response = $this->getJson('/api/search?q=JOB-9');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'job_cards')
                 ->assertJsonPath('job_cards.0.job_card_number', 'JOB-9999');

        // F. Search for Invoice
        $response = $this->getJson('/api/search?q=INV-99');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'invoices')
                 ->assertJsonPath('invoices.0.invoice_number', 'INV-9999');

        // G. Search for Challan
        $response = $this->getJson('/api/search?q=DC-99');
        $response->assertStatus(200)
                 ->assertJsonCount(1, 'delivery_challans')
                 ->assertJsonPath('delivery_challans.0.challan_number', 'DC-9999');
    }

    /**
     * Test short search queries return empty structures.
     */
    public function test_short_search_queries_return_empty_results()
    {
        $this->actingAs($this->admin);

        $response = $this->getJson('/api/search?q=P');
        $response->assertStatus(200)
                 ->assertJsonCount(0, 'purchase_orders')
                 ->assertJsonCount(0, 'users')
                 ->assertJsonCount(0, 'machines')
                 ->assertJsonCount(0, 'job_cards')
                 ->assertJsonCount(0, 'invoices')
                 ->assertJsonCount(0, 'delivery_challans');
    }
}
