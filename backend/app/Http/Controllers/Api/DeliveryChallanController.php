<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DeliveryChallan;
use App\Models\DeliveryChallanItem;
use App\Models\JobCard;
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

        $request->validate([
            'challan_date' => 'required|date',
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'job_card_ids' => 'required_without:invoice_id|array',
            'job_card_ids.*' => 'exists:job_cards,id',
            'invoice_id' => 'nullable|exists:invoices,id',
            'remarks' => 'nullable|string',
            'generate_invoice' => 'nullable|boolean',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                $invoice = null;
                $jobCardIds = $request->job_card_ids;

                if ($request->invoice_id) {
                    $invoice = \App\Models\Invoice::findOrFail($request->invoice_id);
                    if ($invoice->delivery_challan_id) {
                        throw new Exception("Invoice {$invoice->invoice_number} is already linked to a Delivery Challan.");
                    }
                    if ((int)$invoice->purchase_order_id !== (int)$request->purchase_order_id) {
                        throw new Exception("Selected Purchase Order does not match the Invoice.");
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

                // 2. Create the Delivery Challan
                $challan = DeliveryChallan::create([
                    'challan_number' => $challanNumber,
                    'challan_date' => $request->challan_date,
                    'purchase_order_id' => $request->purchase_order_id,
                    'invoice_id' => $request->invoice_id,
                    'remarks' => $request->remarks,
                ]);

                // 3. Associate completed job cards
                foreach ($jobCardIds as $jobCardId) {
                    $job = JobCard::findOrFail($jobCardId);

                    // Validation: Must be completed
                    if ($job->status !== 'completed') {
                        throw new Exception("Job Card {$job->job_card_number} is not completed yet and cannot be delivered.");
                    }

                    // Validation: Must not already be delivered
                    $alreadyDelivered = DeliveryChallanItem::where('job_card_id', $jobCardId)->exists();
                    if ($alreadyDelivered) {
                        throw new Exception("Job Card {$job->job_card_number} has already been delivered in another challan.");
                    }

                    // Validation: Must belong to the same Purchase Order
                    if ($job->poItem->purchase_order_id !== (int)$request->purchase_order_id) {
                        throw new Exception("Job Card {$job->job_card_number} does not belong to the selected Purchase Order.");
                    }

                    // Create item record
                    DeliveryChallanItem::create([
                        'delivery_challan_id' => $challan->id,
                        'job_card_id' => $job->id,
                        'po_item_id' => $job->po_item_id,
                        'quantity_delivered' => $job->quantity,
                    ]);
                }

                // 4. Update the invoice link if this challan was generated from an invoice
                if ($invoice) {
                    $invoice->update([
                        'delivery_challan_id' => $challan->id
                    ]);
                }

                // 5. Auto generate Invoice if requested
                if ($request->generate_invoice) {
                    if (!$request->user()->hasPermission('finance')) {
                        throw new Exception("Unauthorized. You do not have permission to generate invoices.");
                    }

                    // Generate sequential invoice number (INV-YYYY-XXXX)
                    $invoiceYear = date('Y', strtotime($request->challan_date));
                    $invoicePrefixSetting = \App\Models\Setting::getVal('prefix_invoice', 'INV-');
                    $invoicePrefix = "{$invoicePrefixSetting}{$invoiceYear}-";

                    $latestInvoice = \App\Models\Invoice::where('invoice_number', 'LIKE', "{$invoicePrefix}%")
                        ->orderBy('invoice_number', 'desc')
                        ->first();

                    $nextInvoiceSequence = 1;
                    if ($latestInvoice) {
                        $invoiceParts = explode('-', $latestInvoice->invoice_number);
                        $lastInvoiceSeq = (int) end($invoiceParts);
                        $nextInvoiceSequence = $lastInvoiceSeq + 1;
                    }

                    $invoiceNumber = $invoicePrefix . str_pad($nextInvoiceSequence, 4, '0', STR_PAD_LEFT);

                    $subtotal = 0;
                    $cgstTotal = 0;
                    $sgstTotal = 0;
                    $igstTotal = 0;
                    $invoiceItemsData = [];

                    foreach ($jobCardIds as $jobCardId) {
                        $job = JobCard::findOrFail($jobCardId);
                        
                        $alreadyInvoiced = \App\Models\InvoiceItem::where('job_card_id', $jobCardId)->exists();
                        if ($alreadyInvoiced) {
                            throw new Exception("Job Card {$job->job_card_number} has already been invoiced.");
                        }

                        $poItem = \App\Models\PoItem::findOrFail($job->po_item_id);
                        
                        $qty = $job->quantity;
                        $rate = $poItem->rate;
                        
                        $itemTaxable = $qty * $rate;
                        $cgstAmount = $itemTaxable * (($poItem->cgst ?? 0) / 100);
                        $sgstAmount = $itemTaxable * (($poItem->sgst ?? 0) / 100);
                        $igstAmount = $itemTaxable * (($poItem->igst ?? 0) / 100);
                        $itemTotal = $itemTaxable + $cgstAmount + $sgstAmount + $igstAmount;

                        $subtotal += $itemTaxable;
                        $cgstTotal += $cgstAmount;
                        $sgstTotal += $sgstAmount;
                        $igstTotal += $igstAmount;

                        $invoiceItemsData[] = [
                            'po_item_id' => $poItem->id,
                            'job_card_id' => $job->id,
                            'quantity' => $qty,
                            'rate' => $rate,
                            'cgst_rate' => $poItem->cgst ?? 0,
                            'sgst_rate' => $poItem->sgst ?? 0,
                            'igst_rate' => $poItem->igst ?? 0,
                            'cgst_amount' => $cgstAmount,
                            'sgst_amount' => $sgstAmount,
                            'igst_amount' => $igstAmount,
                            'total_amount' => $itemTotal,
                        ];
                    }

                    $grandTotal = $subtotal + $cgstTotal + $sgstTotal + $igstTotal;

                    $generatedInvoice = \App\Models\Invoice::create([
                        'invoice_number' => $invoiceNumber,
                        'invoice_date' => $request->challan_date,
                        'purchase_order_id' => $request->purchase_order_id,
                        'delivery_challan_id' => $challan->id,
                        'subtotal' => $subtotal,
                        'cgst_total' => $cgstTotal,
                        'sgst_total' => $sgstTotal,
                        'igst_total' => $igstTotal,
                        'grand_total' => $grandTotal,
                        'remarks' => $request->remarks,
                    ]);

                    foreach ($invoiceItemsData as $itemData) {
                        $itemData['invoice_id'] = $generatedInvoice->id;
                        \App\Models\InvoiceItem::create($itemData);
                    }

                    $challan->update([
                        'invoice_id' => $generatedInvoice->id
                    ]);
                }

                return response()->json([
                    'message' => 'Delivery Challan generated successfully.',
                    'challan' => $challan->load(['purchaseOrder', 'invoice', 'items.poItem', 'items.jobCard'])
                ], 201);
            });
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
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

        $request->validate([
            'challan_date' => 'required|date',
            'job_card_ids' => 'required|array',
            'job_card_ids.*' => 'exists:job_cards,id',
            'remarks' => 'nullable|string',
        ]);

        $challan = DeliveryChallan::findOrFail($id);

        if ($challan->cancelled_at) {
            return response()->json(['message' => 'Cancelled Delivery Challans cannot be edited.'], 422);
        }

        DB::beginTransaction();

        try {
            // Update details
            $challan->update([
                'challan_date' => $request->challan_date,
                'remarks' => $request->remarks,
            ]);

            // Sync job cards
            $existingJobCardIds = DeliveryChallanItem::where('delivery_challan_id', $challan->id)->pluck('job_card_id')->toArray();
            $newJobCardIds = $request->job_card_ids;

            $jobCardIdsToDelete = array_diff($existingJobCardIds, $newJobCardIds);
            $jobCardIdsToAdd = array_diff($newJobCardIds, $existingJobCardIds);

            if (count($jobCardIdsToDelete) > 0) {
                // If it is linked to an active invoice, we cannot change job cards
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

                if ($job->poItem->purchase_order_id !== (int)$challan->purchase_order_id) {
                    throw new Exception("Job Card {$job->job_card_number} does not belong to this Purchase Order.");
                }

                DeliveryChallanItem::create([
                    'delivery_challan_id' => $challan->id,
                    'job_card_id' => $job->id,
                    'po_item_id' => $job->po_item_id,
                    'quantity_delivered' => $job->quantity,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Delivery Challan updated successfully.',
                'challan' => $challan->load(['purchaseOrder', 'invoice', 'items.poItem', 'items.jobCard'])
            ]);

        } catch (Exception $e) {
            DB::rollBack();
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

        $request->validate([
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
            'cancellation_reason' => $request->cancellation_reason
        ]);

        return response()->json([
            'message' => 'Delivery Challan cancelled successfully.',
            'challan' => $dc
        ]);
    }
}
