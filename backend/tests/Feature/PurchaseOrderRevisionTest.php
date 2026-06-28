<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use App\Models\PurchaseOrderRevision;
use App\Models\PurchaseOrderAuditLog;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PurchaseOrderRevisionTest extends TestCase
{
    use RefreshDatabase;

    protected $admin;
    protected $existingPo;

    protected function setUp(): void
    {
        parent::setUp();

        // Create an admin user for auth
        $this->admin = User::create([
            'name' => 'Admin User',
            'email' => 'admin@techfocal.in',
            'password' => bcrypt('password123'),
            'role' => 'admin',
            'status' => 'active',
            'phone' => '1122334455',
        ]);

        // Create an existing PO
        $this->existingPo = PurchaseOrder::create([
            'po_number' => 'PO-1025',
            'po_date' => '2026-06-20',
            'customer_name' => 'Acme Industries',
            'customer_email' => 'acme@example.com',
            'status' => 'approved',
        ]);

        // Add an item to existing PO
        PoItem::create([
            'purchase_order_id' => $this->existingPo->id,
            'description' => 'M4 Hex Nut',
            'quantity' => 100.0,
            'unit' => 'Pcs',
            'rate' => 1.5,
            'total_amount' => 150.0,
        ]);
    }

    /**
     * Test list revisions endpoint.
     */
    public function test_can_list_pending_revisions()
    {
        $this->actingAs($this->admin);

        // Create a pending revision
        PurchaseOrderRevision::create([
            'purchase_order_id' => $this->existingPo->id,
            'po_number' => 'PO-1025',
            'po_date' => '2026-06-21',
            'customer_name' => 'Acme Industries Inc',
            'customer_email' => 'acme.revised@example.com',
            'status' => 'pending',
            'extracted_data' => [
                'po_number' => 'PO-1025',
                'po_date' => '2026-06-21',
                'customer_name' => 'Acme Industries Inc',
                'customer_email' => 'acme.revised@example.com',
                'items' => [
                    [
                        'description' => 'M4 Hex Nut',
                        'quantity' => 150.0,
                        'unit' => 'Pcs',
                        'rate' => 1.5,
                        'total_amount' => 225.0
                    ]
                ]
            ],
            'has_differences' => true,
        ]);

        $response = $this->getJson('/api/purchase-orders/revisions');
        $response->assertStatus(200)
                 ->assertJsonCount(1)
                 ->assertJsonFragment([
                     'po_number' => 'PO-1025',
                     'customer_name' => 'Acme Industries Inc'
                 ]);
    }

    /**
     * Test get single revision comparison details.
     */
    public function test_can_get_single_revision_details()
    {
        $this->actingAs($this->admin);

        $revision = PurchaseOrderRevision::create([
            'purchase_order_id' => $this->existingPo->id,
            'po_number' => 'PO-1025',
            'po_date' => '2026-06-21',
            'customer_name' => 'Acme Industries Inc',
            'customer_email' => 'acme.revised@example.com',
            'status' => 'pending',
            'extracted_data' => [
                'po_number' => 'PO-1025',
                'po_date' => '2026-06-21',
                'customer_name' => 'Acme Industries Inc',
                'customer_email' => 'acme.revised@example.com',
                'items' => []
            ],
            'has_differences' => true,
        ]);

        $response = $this->getJson("/api/purchase-orders/revisions/{$revision->id}");
        $response->assertStatus(200)
                 ->assertJsonStructure([
                     'revision',
                     'existing_po',
                     'existing_stats'
                 ])
                 ->assertJsonPath('revision.id', $revision->id)
                 ->assertJsonPath('existing_po.id', $this->existingPo->id);
    }

    /**
     * Test ignore action on revision.
     */
    public function test_can_ignore_revision()
    {
        $this->actingAs($this->admin);

        $revision = PurchaseOrderRevision::create([
            'purchase_order_id' => $this->existingPo->id,
            'po_number' => 'PO-1025',
            'po_date' => '2026-06-21',
            'customer_name' => 'Acme Industries Inc',
            'status' => 'pending',
            'extracted_data' => [
                'po_number' => 'PO-1025',
                'po_date' => '2026-06-21',
                'customer_name' => 'Acme Industries Inc',
                'items' => []
            ],
            'has_differences' => true,
        ]);

        $response = $this->postJson("/api/purchase-orders/revisions/{$revision->id}/action", [
            'action' => 'ignore'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Revision changes ignored and archived.');

        $this->assertEquals('ignored', $revision->fresh()->status);

        // Verify audit log created
        $this->assertDatabaseHas('purchase_order_audit_logs', [
            'purchase_order_id' => $this->existingPo->id,
            'action' => 'ignored',
            'user_id' => $this->admin->id,
        ]);
    }

    /**
     * Test update_existing action on revision.
     */
    public function test_can_update_existing_po_revision()
    {
        $this->actingAs($this->admin);

        $revision = PurchaseOrderRevision::create([
            'purchase_order_id' => $this->existingPo->id,
            'po_number' => 'PO-1025',
            'po_date' => '2026-06-21',
            'customer_name' => 'Acme Industries Inc',
            'customer_email' => 'acme.revised@example.com',
            'status' => 'pending',
            'extracted_data' => [
                'po_number' => 'PO-1025',
                'po_date' => '2026-06-21',
                'customer_name' => 'Acme Industries Inc',
                'customer_email' => 'acme.revised@example.com',
                'items' => [
                    [
                        'description' => 'M4 Hex Nut Revised',
                        'quantity' => 150.0,
                        'unit' => 'Pcs',
                        'rate' => 2.0,
                        'cgst' => 0.0,
                        'sgst' => 0.0,
                        'igst' => 0.0,
                        'total_amount' => 300.0
                    ]
                ]
            ],
            'has_differences' => true,
        ]);

        $response = $this->postJson("/api/purchase-orders/revisions/{$revision->id}/action", [
            'action' => 'update_existing'
        ]);

        $response->assertStatus(200)
                 ->assertJsonPath('message', 'Existing Purchase Order updated successfully with revision details.');

        $this->assertEquals('applied', $revision->fresh()->status);

        // Verify existing PO is updated
        $updatedPo = $this->existingPo->fresh();
        $this->assertEquals('2026-06-21', $updatedPo->po_date);
        $this->assertEquals('Acme Industries Inc', $updatedPo->customer_name);
        $this->assertEquals('acme.revised@example.com', $updatedPo->customer_email);
        $this->assertEquals('draft_review', $updatedPo->status); // resets to draft for review

        // Verify items updated
        $this->assertCount(1, $updatedPo->items);
        $this->assertEquals('M4 Hex Nut Revised', $updatedPo->items->first()->description);
        $this->assertEquals(150.0, floatval($updatedPo->items->first()->quantity));
        $this->assertEquals(2.0, floatval($updatedPo->items->first()->rate));

        // Verify audit log created
        $this->assertDatabaseHas('purchase_order_audit_logs', [
            'purchase_order_id' => $this->existingPo->id,
            'action' => 'revised_update',
            'user_id' => $this->admin->id,
        ]);
    }

    /**
     * Test save_as_revision action on revision.
     */
    public function test_can_save_as_new_revision_po()
    {
        $this->actingAs($this->admin);

        $revision = PurchaseOrderRevision::create([
            'purchase_order_id' => $this->existingPo->id,
            'po_number' => 'PO-1025',
            'po_date' => '2026-06-21',
            'customer_name' => 'Acme Industries Inc',
            'customer_email' => 'acme.revised@example.com',
            'status' => 'pending',
            'extracted_data' => [
                'po_number' => 'PO-1025',
                'po_date' => '2026-06-21',
                'customer_name' => 'Acme Industries Inc',
                'customer_email' => 'acme.revised@example.com',
                'items' => [
                    [
                        'description' => 'M4 Hex Nut New Version',
                        'quantity' => 200.0,
                        'unit' => 'Pcs',
                        'rate' => 1.5,
                        'cgst' => 0.0,
                        'sgst' => 0.0,
                        'igst' => 0.0,
                        'total_amount' => 300.0
                    ]
                ]
            ],
            'has_differences' => true,
        ]);

        $response = $this->postJson("/api/purchase-orders/revisions/{$revision->id}/action", [
            'action' => 'save_as_revision'
        ]);

        $response->assertStatus(200)
                 ->assertJsonFragment([
                     'message' => 'Revision saved as a new Purchase Order version: PO-1025-REV-1'
                 ]);

        $this->assertEquals('applied', $revision->fresh()->status);

        // Verify original PO remains unchanged
        $originalPo = $this->existingPo->fresh();
        $this->assertEquals('2026-06-20', $originalPo->po_date);
        $this->assertEquals('Acme Industries', $originalPo->customer_name);
        $this->assertEquals('approved', $originalPo->status);

        // Verify new PO created with suffix
        $newPo = PurchaseOrder::where('po_number', 'PO-1025-REV-1')->first();
        $this->assertNotNull($newPo);
        $this->assertEquals('2026-06-21', $newPo->po_date);
        $this->assertEquals('Acme Industries Inc', $newPo->customer_name);
        $this->assertEquals('draft_review', $newPo->status);

        $this->assertCount(1, $newPo->items);
        $this->assertEquals('M4 Hex Nut New Version', $newPo->items->first()->description);

        // Verify audit log recorded for BOTH
        $this->assertDatabaseHas('purchase_order_audit_logs', [
            'purchase_order_id' => $this->existingPo->id,
            'action' => 'saved_as_revision_po',
            'user_id' => $this->admin->id,
        ]);

        $this->assertDatabaseHas('purchase_order_audit_logs', [
            'purchase_order_id' => $newPo->id,
            'action' => 'created_as_revision',
            'user_id' => $this->admin->id,
        ]);
    }

    /**
     * Test retrieve audit logs.
     */
    public function test_can_retrieve_audit_logs()
    {
        $this->actingAs($this->admin);

        PurchaseOrderAuditLog::create([
            'purchase_order_id' => $this->existingPo->id,
            'action' => 'created',
            'user_id' => $this->admin->id,
            'user_name' => $this->admin->name,
        ]);

        $response = $this->getJson("/api/purchase-orders/{$this->existingPo->id}/audit-logs");
        $response->assertStatus(200)
                 ->assertJsonCount(1)
                 ->assertJsonFragment([
                     'action' => 'created',
                     'user_name' => 'Admin User'
                 ]);
    }
}
