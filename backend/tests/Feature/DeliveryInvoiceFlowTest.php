<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use App\Models\IncomingChallan;
use App\Models\IncomingChallanItem;
use App\Models\JobCard;
use App\Models\DeliveryChallan;
use App\Models\Invoice;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DeliveryInvoiceFlowTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test creating delivery challans and invoices.
     */
    public function test_delivery_and_invoice_workflow()
    {
        // 1. Setup user context (Admin/Manager role)
        $user = User::factory()->create([
            'role' => 'admin',
            'status' => 'active',
        ]);
        $this->actingAs($user);

        // 2. Setup Seed Data
        $po = PurchaseOrder::create([
            'po_number' => 'PO-2026-7890',
            'po_date' => '2026-05-27',
            'customer_name' => 'SANDVIK MINING INDIA',
            'customer_email' => 'sandvik@mail.com',
            'customer_address' => 'Pune, India',
            'customer_gstin' => '27AAACS1234A1Z1',
            'status' => 'approved',
        ]);

        $poItem = PoItem::create([
            'purchase_order_id' => $po->id,
            'item_code' => '400.0485-M9MC',
            'description' => 'Final Machining Work',
            'quantity' => 10.00,
            'unit' => 'PC',
            'rate' => 1000.00, // 1000 per PC
            'cgst' => 9.00,
            'sgst' => 9.00,
            'igst' => 0,
            'total_amount' => 11800.00, // 10 * 1000 * 1.18
        ]);

        $incoming = IncomingChallan::create([
            'challan_number' => 'CH-IN-1002',
            'challan_date' => '2026-05-27',
            'purchase_order_id' => $po->id,
            'received_by' => $user->id,
        ]);

        $incomingItem = IncomingChallanItem::create([
            'incoming_challan_id' => $incoming->id,
            'po_item_id' => $poItem->id,
            'quantity_received' => 5.00,
        ]);

        // Create completed Job Card
        $job = JobCard::create([
            'job_card_number' => 'JOB-2026-0001',
            'incoming_challan_item_id' => $incomingItem->id,
            'po_item_id' => $poItem->id,
            'quantity' => 5.00,
            'status' => 'completed',
            'end_date' => '2026-05-27',
        ]);

        // 3. Test Outgoing Delivery Challan Generation
        $currentYear = date('Y');
        $expectedChallanNo = "DC-{$currentYear}-0001";

        $response = $this->postJson('/api/delivery-challans', [
            'challan_date' => '2026-05-27',
            'purchase_order_id' => $po->id,
            'job_card_ids' => [$job->id],
            'remarks' => 'Challan Test dispatch',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('challan.challan_number', $expectedChallanNo)
            ->assertJsonCount(1, 'challan.items');

        $challanId = $response->json('challan.id');

        // Verify Job Card is marked as delivered (by existence of delivery challan item)
        $this->assertDatabaseHas('delivery_challan_items', [
            'delivery_challan_id' => $challanId,
            'job_card_id' => $job->id,
            'quantity_delivered' => 5.00,
        ]);

        // Verify trying to deliver the same Job Card again returns 422
        $responseDuplicate = $this->postJson('/api/delivery-challans', [
            'challan_date' => '2026-05-27',
            'purchase_order_id' => $po->id,
            'job_card_ids' => [$job->id],
        ]);
        $responseDuplicate->assertStatus(422);

        // 4. Test Commercial Invoice Generation (linking to the Delivery Challan)
        $expectedInvoiceNo = "INV-{$currentYear}-0001";

        $invoiceResponse = $this->postJson('/api/invoices', [
            'invoice_date' => '2026-05-27',
            'purchase_order_id' => $po->id,
            'delivery_challan_id' => $challanId,
            'remarks' => 'Invoice for DC-2026-0001',
        ]);

        // 5 * 1000 = 5000 subtotal
        // CGST = 9% of 5000 = 450
        // SGST = 9% of 5000 = 450
        // Grand Total = 5900
        $invoiceResponse->assertStatus(201)
            ->assertJsonPath('invoice.invoice_number', $expectedInvoiceNo)
            ->assertJsonPath('invoice.subtotal', 5000)
            ->assertJsonPath('invoice.cgst_total', 450)
            ->assertJsonPath('invoice.sgst_total', 450)
            ->assertJsonPath('invoice.grand_total', 5900);

        // Verify trying to invoice the same Job Card again returns 422
        $invoiceResponseDuplicate = $this->postJson('/api/invoices', [
            'invoice_date' => '2026-05-27',
            'purchase_order_id' => $po->id,
            'job_card_ids' => [$job->id],
        ]);
        $invoiceResponseDuplicate->assertStatus(422);

        // 5. Test Draft Invoice flow
        $job2 = JobCard::create([
            'job_card_number' => 'JOB-2026-0002',
            'incoming_challan_item_id' => $incomingItem->id,
            'po_item_id' => $poItem->id,
            'quantity' => 2.00,
            'status' => 'completed',
            'end_date' => '2026-05-27',
        ]);

        $draftInvoiceResponse = $this->postJson('/api/invoices', [
            'invoice_date' => '2026-05-27',
            'purchase_order_id' => $po->id,
            'job_card_ids' => [$job2->id],
            'status' => 'draft',
        ]);

        $draftInvoiceResponse->assertStatus(201)
            ->assertJsonPath('invoice.status', 'draft');

        $draftInvoiceId = $draftInvoiceResponse->json('invoice.id');

        // Update the draft invoice (change remarks and details)
        $updateResponse = $this->putJson("/api/invoices/{$draftInvoiceId}", [
            'invoice_date' => '2026-05-28',
            'remarks' => 'Updated draft invoice',
            'job_card_ids' => [$job2->id],
        ]);
        $updateResponse->assertStatus(200)
            ->assertJsonPath('invoice.remarks', 'Updated draft invoice')
            ->assertJsonPath('invoice.invoice_date', '2026-05-28');

        // Record payment on draft invoice should fail
        $payDraftResponse = $this->postJson("/api/invoices/{$draftInvoiceId}/record-payment", [
            'payment_method' => 'upi',
            'payment_date' => '2026-05-28',
        ]);
        $payDraftResponse->assertStatus(422);

        // Finalize draft invoice
        $finalizeResponse = $this->postJson("/api/invoices/{$draftInvoiceId}/finalize");
        $finalizeResponse->assertStatus(200)
            ->assertJsonPath('invoice.status', 'unpaid');

        // Edit on finalized invoice should fail
        $editFinalizedResponse = $this->putJson("/api/invoices/{$draftInvoiceId}", [
            'invoice_date' => '2026-05-29',
            'remarks' => 'Trying to edit finalized',
            'job_card_ids' => [$job2->id],
        ]);
        $editFinalizedResponse->assertStatus(422);

        // Record payment on finalized invoice
        $payResponse = $this->postJson("/api/invoices/{$draftInvoiceId}/record-payment", [
            'payment_method' => 'upi',
            'transaction_reference' => 'TXN123456',
            'payment_date' => '2026-05-28',
            'payment_remarks' => 'Paid via UPI',
        ]);
        $payResponse->assertStatus(200)
            ->assertJsonPath('invoice.status', 'paid')
            ->assertJsonPath('invoice.payment_method', 'upi')
            ->assertJsonPath('invoice.transaction_reference', 'TXN123456');
    }
}
