<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryChallan;
use App\Models\DeliveryChallanItem;
use App\Models\JobCard;
use App\Models\PurchaseOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class DeliveryChallanController extends Controller
{
    /**
     * List all outgoing delivery challans.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to manage delivery challans.'], 403);
        }

        $challans = DeliveryChallan::with(['purchaseOrder', 'invoice'])
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($challans);
    }

    /**
     * View details of a specific delivery challan.
     */
    public function show(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to view delivery challans.'], 403);
        }

        $challan = DeliveryChallan::with(['purchaseOrder', 'invoice', 'items.poItem', 'items.jobCard'])
            ->findOrFail($id);

        return response()->json($challan);
    }

    /**
     * Create a new outgoing delivery challan.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to create delivery challans.'], 403);
        }

        $validated = $request->validate([
            'challan_date' => 'required|date',
            'purchase_order_id' => 'required_without:purchase_order_ids|nullable|integer|exists:purchase_orders,id',
            'purchase_order_ids' => 'required_without:purchase_order_id|nullable|array|max:100',
            'purchase_order_ids.*' => 'integer|exists:purchase_orders,id',
            'job_card_ids' => 'required_without:invoice_id|array|max:100',
            'job_card_ids.*' => 'integer|exists:job_cards,id',
            'invoice_id' => 'nullable|integer|exists:invoices,id',
            'remarks' => 'nullable|string|max:2000',
            'generate_invoice' => 'nullable|boolean',
        ]);

        try {
            $poIds = $validated['purchase_order_ids'] ?? null;
            if (empty($poIds) && isset($validated['purchase_order_id'])) {
                $poIds = [$validated['purchase_order_id']];
            }
            $poIds = array_filter(array_unique(array_map('intval', (array)$poIds)));

            if (empty($poIds)) {
                return response()->json(['message' => 'Please select at least one Purchase Order.'], 422);
            }

            $pos = PurchaseOrder::whereIn('id', $poIds)->get();
            if ($pos->count() !== count($poIds)) {
                return response()->json(['message' => 'One or more selected Purchase Orders do not exist.'], 422);
            }

            $customerNames = $pos->pluck('customer_name')->unique();
            if ($customerNames->count() > 1) {
                return response()->json(['message' => 'All selected Purchase Orders must belong to the same customer.'], 422);
            }

            return DB::transaction(function () use ($request, $poIds, $validated) {
                $invoice = null;
                $primaryPoId = reset($poIds); // Get the first PO ID as primary
                $jobCardIds = $request->job_card_ids;

                if ($request->invoice_id) {
                    $invoice = \App\Models\Invoice::findOrFail($request->invoice_id);
                    if ($invoice->delivery_challan_id) {
                        throw new Exception("Invoice {$invoice->invoice_number} is already linked to a Delivery Challan.");
                    }
                    if (!in_array((int)$invoice->purchase_order_id, $poIds)) {
                        throw new Exception("Selected Purchase Orders do not match the Invoice.");
                    }

                    // Extract job card IDs from InvoiceItems
                    $jobCardIds = $invoice->items()->whereNotNull('job_card_id')->pluck('job_card_id')->toArray();
                    if (count($jobCardIds) === 0) {
                        throw new Exception("No completed job cards found in the selected Invoice.");
                    }
                }

                // 1. Generate sequential challan number (DC-YYYY-XXXX)
                $year = date('Y', strtotime($request->challan_date));
                $settingPrefix = \App\Models\Setting::getVal('prefix_challan', 'DC-');
                $prefix = "{$settingPrefix}{$year}-";

                $latest = DeliveryChallan::where('challan_number', 'LIKE', "{$prefix}%")
                    ->orderBy('challan_number', 'desc')
                    ->first();

                $nextSequence = 1;
                if ($latest) {
                    $parts = explode('-', $latest->challan_number);
                    $lastSeq = (int) end($parts);
                    $nextSequence = $lastSeq + 1;
                }

                $challanNumber = $prefix . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);

                $dc = DeliveryChallan::create([
                    'challan_number' => $challanNumber,
                    'challan_date' => $validated['challan_date'],
                    'purchase_order_id' => $primaryPoId,
                    'invoice_id' => $validated['invoice_id'] ?? null,
                    'remarks' => $validated['remarks'] ?? null,
                    'created_by' => auth()->id() ?: 1,
                ]);

                $dc->purchaseOrders()->sync($poIds);

                foreach ($jobCardIds as $jobCardId) {
                    $job = JobCard::findOrFail($jobCardId);

                    if ($job->status !== 'completed') {
                        throw new Exception("Job Card {$job->job_card_number} is not completed yet and cannot be delivered.");
                    }

                    $alreadyDelivered = DeliveryChallanItem::where('job_card_id', $jobCardId)->exists();
                    if ($alreadyDelivered) {
                        throw new Exception("Job Card {$job->job_card_number} has already been delivered in another challan.");
                    }

                    if (!in_array((int)$job->poItem->purchase_order_id, $poIds)) {
                        throw new Exception("Job Card {$job->job_card_number} does not belong to the selected Purchase Orders.");
                    }

                    DeliveryChallanItem::create([
                        'delivery_challan_id' => $dc->id,
                        'job_card_id' => $job->id,
                        'po_item_id' => $job->po_item_id,
                        'quantity_delivered' => $job->quantity,
                    ]);
                }

                if ($invoice) {
                    $invoice->update(['delivery_challan_id' => $dc->id]);
                }

                if (isset($validated['generate_invoice']) && $validated['generate_invoice']) {
                    if (!$request->user()->hasPermission('finance')) {
                        throw new Exception("Unauthorized. You do not have permission to generate invoices.");
                    }
                    $invoiceResult = \App\Services\InvoiceGenerator::generateFromChallan($dc);
                    $dc->refresh();
                }

                return response()->json([
                    'message' => 'Delivery Challan generated successfully.',
                    'challan' => $dc->load(['purchaseOrder', 'purchaseOrders', 'invoice', 'items.poItem', 'items.jobCard'])
                ], 201);
            });
        } catch (Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * Update an existing delivery challan.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to manage delivery challans.'], 403);
        }

        $validated = $request->validate([
            'challan_date' => 'required|date',
            'purchase_order_ids' => 'nullable|array|max:100',
            'purchase_order_ids.*' => 'integer|exists:purchase_orders,id',
            'job_card_ids' => 'required|array|max:100',
            'job_card_ids.*' => 'integer|exists:job_cards,id',
            'remarks' => 'nullable|string|max:2000',
        ]);

        $challan = DeliveryChallan::findOrFail($id);
        if ($challan->cancelled_at) {
            return response()->json(['message' => 'Cancelled Delivery Challans cannot be edited.'], 422);
        }

        try {
            $poIds = $validated['purchase_order_ids'] ?? [];
            if (empty($poIds)) {
                $poIds = $challan->purchaseOrders()->pluck('purchase_orders.id')->toArray();
            }
            $poIds = array_filter(array_unique(array_map('intval', (array)$poIds)));
            $primaryPoId = $poIds[0];

            if (empty($poIds)) {
                return response()->json(['message' => 'Please select at least one Purchase Order.'], 422);
            }

            $pos = PurchaseOrder::whereIn('id', $poIds)->get();
            $customerNames = $pos->pluck('customer_name')->unique();
            if ($customerNames->count() > 1) {
                return response()->json(['message' => 'All selected Purchase Orders must belong to the same customer.'], 422);
            }

            DB::transaction(function () use ($challan, $validated, $poIds, $primaryPoId) {
                $challan->update([
                    'challan_date' => $validated['challan_date'],
                    'purchase_order_id' => $primaryPoId,
                    'remarks' => $validated['remarks'] ?? null,
                ]);

                $challan->purchaseOrders()->sync($poIds);

                $existingJobCardIds = DeliveryChallanItem::where('delivery_challan_id', $challan->id)->pluck('job_card_id')->toArray();
                $newJobCardIds = $validated['job_card_ids'];

                $jobCardIdsToDelete = array_diff($existingJobCardIds, $newJobCardIds);
                $jobCardIdsToAdd = array_diff($newJobCardIds, $existingJobCardIds);

                if (count($jobCardIdsToDelete) > 0) {
                    $linkedInvoice = \App\Models\Invoice::where('id', $challan->invoice_id)->first();
                    if ($linkedInvoice && !$linkedInvoice->cancelled_at) {
                        throw new Exception("Cannot modify items on this Delivery Challan because it is linked to an active Invoice.");
                    }

                    DeliveryChallanItem::where('delivery_challan_id', $challan->id)
                        ->whereIn('job_card_id', $jobCardIdsToDelete)
                        ->delete();
                }

                foreach ($jobCardIdsToAdd as $jobCardId) {
                    $job = JobCard::findOrFail($jobCardId);

                    if ($job->status !== 'completed') {
                        throw new Exception("Job Card {$job->job_card_number} is not completed yet.");
                    }

                    $alreadyDelivered = DeliveryChallanItem::where('job_card_id', $jobCardId)
                        ->where('delivery_challan_id', '!=', $challan->id)
                        ->exists();
                    if ($alreadyDelivered) {
                        throw new Exception("Job Card {$job->job_card_number} has already been delivered in another challan.");
                    }

                    if (!in_array((int)$job->poItem->purchase_order_id, $poIds)) {
                        throw new Exception("Job Card {$job->job_card_number} does not belong to the selected Purchase Orders.");
                    }

                    DeliveryChallanItem::create([
                        'delivery_challan_id' => $challan->id,
                        'job_card_id' => $job->id,
                        'po_item_id' => $job->po_item_id,
                        'quantity_delivered' => $job->quantity,
                    ]);
                }
            });

            return response()->json([
                'message' => 'Delivery Challan updated successfully.',
                'challan' => $challan->load(['purchaseOrder', 'purchaseOrders', 'invoice', 'items.poItem', 'items.jobCard'])
            ]);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to update Delivery Challan: ' . $e->getMessage()
            ], 422);
        }
    }

    /**
     * Cancel a delivery challan.
     */
    public function cancel(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:1000'
        ]);

        $dc = DeliveryChallan::with('invoice')->findOrFail($id);

        if ($dc->invoice_id && !$dc->invoice->cancelled_at) {
            return response()->json([
                'message' => 'This Delivery Challan cannot be cancelled because it is linked to an active Invoice.'
            ], 422);
        }

        $dc->update([
            'cancelled_at' => now(),
            'cancelled_by' => $request->user()->id,
            'cancellation_reason' => $validated['cancellation_reason']
        ]);

        return response()->json([
            'message' => 'Delivery Challan cancelled successfully.',
            'challan' => $dc
        ]);
    }
}
