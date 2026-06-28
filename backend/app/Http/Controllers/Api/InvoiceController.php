<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\DeliveryChallan;
use App\Models\DeliveryChallanItem;
use App\Models\JobCard;
use App\Models\PoItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class InvoiceController extends Controller
{
    /**
     * List all commercial invoices.
     */
    public function index()
    {
        $invoices = Invoice::with(['purchaseOrder', 'deliveryChallan'])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invoices);
    }

    /**
     * View details of a specific invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['purchaseOrder', 'deliveryChallan', 'items.poItem.purchaseOrder', 'items.jobCard'])
            ->findOrFail($id);

        return response()->json($invoice);
    }

    /**
     * Create a new commercial invoice.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized. Only accounts with Finance permission can generate invoices.'], 403);
        }

        $request->validate([
            'invoice_date' => 'required|date',
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'delivery_challan_id' => 'nullable|exists:delivery_challans,id',
            'job_card_ids' => 'nullable|array',
            'job_card_ids.*' => 'exists:job_cards,id',
            'remarks' => 'nullable|string',
            'eway_bill_no' => 'nullable|string',
            'status' => 'nullable|string|in:draft,unpaid',
        ]);

        try {
            return DB::transaction(function () use ($request) {
                // 1. Generate sequential invoice number (INV-YYYY-XXXX)
                $year = date('Y', strtotime($request->invoice_date));
                $settingPrefix = \App\Models\Setting::getVal('prefix_invoice', 'INV-');
                $prefix = "{$settingPrefix}{$year}-";

                $latest = Invoice::where('invoice_number', 'LIKE', "{$prefix}%")
                    ->orderBy('invoice_number', 'desc')
                    ->first();

                $nextSequence = 1;
                if ($latest) {
                    $parts = explode('-', $latest->invoice_number);
                    $lastSeq = (int) end($parts);
                    $nextSequence = $lastSeq + 1;
                }

                $invoiceNumber = $prefix . str_pad($nextSequence, 4, '0', STR_PAD_LEFT);

                // 2. Identify items to bill
                $itemsToBill = [];
                $dc = null;
                if ($request->delivery_challan_id) {
                    $dc = DeliveryChallan::findOrFail($request->delivery_challan_id);
                    if ($dc->invoice_id) {
                        throw new Exception("Delivery Challan {$dc->challan_number} is already linked to an Invoice.");
                    }
                    if ((int)$dc->purchase_order_id !== (int)$request->purchase_order_id) {
                        throw new Exception("Selected Purchase Order does not match the Delivery Challan.");
                    }

                    $dcItems = DeliveryChallanItem::where('delivery_challan_id', $dc->id)->get();
                    foreach ($dcItems as $dcItem) {
                        $itemsToBill[] = [
                            'po_item_id' => $dcItem->po_item_id,
                            'job_card_id' => $dcItem->job_card_id,
                            'quantity' => $dcItem->quantity_delivered,
                        ];
                    }
                } elseif ($request->job_card_ids && count($request->job_card_ids) > 0) {
                    foreach ($request->job_card_ids as $jobCardId) {
                        $job = JobCard::findOrFail($jobCardId);
                        if ($job->status !== 'completed') {
                            throw new Exception("Job Card {$job->job_card_number} is not completed and cannot be invoiced.");
                        }
                        $itemsToBill[] = [
                            'po_item_id' => $job->po_item_id,
                            'job_card_id' => $job->id,
                            'quantity' => $job->quantity,
                        ];
                    }
                } else {
                    throw new Exception("You must select either a Delivery Challan or completed Job Cards to generate an Invoice.");
                }

                if (count($itemsToBill) === 0) {
                    throw new Exception("No items found to generate this Invoice.");
                }

                // 3. Compute taxable subtotal and taxes
                $subtotal = 0;
                $cgstTotal = 0;
                $sgstTotal = 0;
                $igstTotal = 0;
                $invoiceItemsData = [];

                foreach ($itemsToBill as $billItem) {
                    // Check if already invoiced
                    if ($billItem['job_card_id']) {
                        $alreadyInvoiced = InvoiceItem::where('job_card_id', $billItem['job_card_id'])->exists();
                        if ($alreadyInvoiced) {
                            $jobCard = JobCard::find($billItem['job_card_id']);
                            throw new Exception("Job Card {$jobCard->job_card_number} has already been invoiced.");
                        }
                    }

                    $poItem = PoItem::findOrFail($billItem['po_item_id']);
                    
                    // Verify PO match
                    if ($poItem->purchase_order_id !== (int)$request->purchase_order_id) {
                        throw new Exception("Items must belong to the selected Purchase Order.");
                    }

                    $qty = $billItem['quantity'];
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
                        'job_card_id' => $billItem['job_card_id'],
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

                $invoice = Invoice::create([
                    'invoice_number' => $invoiceNumber,
                    'invoice_date' => $request->invoice_date,
                    'purchase_order_id' => $request->purchase_order_id,
                    'delivery_challan_id' => $request->delivery_challan_id,
                    'subtotal' => $subtotal,
                    'cgst_total' => $cgstTotal,
                    'sgst_total' => $sgstTotal,
                    'igst_total' => $igstTotal,
                    'grand_total' => $grandTotal,
                    'remarks' => $request->remarks,
                    'eway_bill_no' => $request->eway_bill_no,
                    'status' => $request->status ?? 'unpaid',
                ]);

                // 5. Save Invoice Items
                foreach ($invoiceItemsData as $itemData) {
                    $itemData['invoice_id'] = $invoice->id;
                    InvoiceItem::create($itemData);
                }

                // 6. Update Delivery Challan's invoice link if it was provided
                if ($dc) {
                    $dc->update([
                        'invoice_id' => $invoice->id
                    ]);
                }

                return response()->json([
                    'message' => 'Invoice generated successfully.',
                    'invoice' => $invoice->load(['purchaseOrder', 'deliveryChallan', 'items.poItem'])
                ], 201);
            });
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Cancel/Void an invoice.
     */
    public function cancel(Request $request, $id)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized. Only accounts with Finance permission can cancel invoices.'], 403);
        }

        $request->validate([
            'cancellation_reason' => 'required|string|max:1000'
        ]);

        $invoice = Invoice::findOrFail($id);

        DB::transaction(function () use ($invoice, $request) {
            $invoice->update([
                'cancelled_at' => now(),
                'cancelled_by' => $request->user()->id,
                'cancellation_reason' => $request->cancellation_reason
            ]);

            // Clear the link from delivery challans
            \App\Models\DeliveryChallan::where('invoice_id', $invoice->id)->update([
                'invoice_id' => null
            ]);
        });

        return response()->json([
            'message' => 'Invoice cancelled successfully.',
            'invoice' => $invoice
        ]);
    }

    /**
     * Update an existing draft invoice.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized. Only accounts with Finance permission can edit invoices.'], 403);
        }

        $request->validate([
            'invoice_date' => 'required|date',
            'remarks' => 'nullable|string',
            'eway_bill_no' => 'nullable|string',
            'delivery_challan_id' => 'nullable|exists:delivery_challans,id',
            'job_card_ids' => 'nullable|array',
            'job_card_ids.*' => 'exists:job_cards,id',
            'status' => 'nullable|string|in:draft,unpaid',
        ]);

        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be edited.'], 422);
        }

        try {
            return DB::transaction(function () use ($request, $invoice) {
                // 1. Identify items to bill
                $itemsToBill = [];
                $dc = null;
                if ($request->delivery_challan_id) {
                    $dc = DeliveryChallan::findOrFail($request->delivery_challan_id);
                    if ($dc->invoice_id && (int)$dc->invoice_id !== (int)$invoice->id) {
                        throw new Exception("Delivery Challan {$dc->challan_number} is already linked to another Invoice.");
                    }
                    if ((int)$dc->purchase_order_id !== (int)$invoice->purchase_order_id) {
                        throw new Exception("Selected Purchase Order does not match the Delivery Challan.");
                    }

                    $dcItems = DeliveryChallanItem::where('delivery_challan_id', $dc->id)->get();
                    foreach ($dcItems as $dcItem) {
                        $itemsToBill[] = [
                            'po_item_id' => $dcItem->po_item_id,
                            'job_card_id' => $dcItem->job_card_id,
                            'quantity' => $dcItem->quantity_delivered,
                        ];
                    }
                } elseif ($request->job_card_ids && count($request->job_card_ids) > 0) {
                    foreach ($request->job_card_ids as $jobCardId) {
                        $job = JobCard::findOrFail($jobCardId);
                        if ($job->status !== 'completed') {
                            throw new Exception("Job Card {$job->job_card_number} is not completed and cannot be invoiced.");
                        }
                        $itemsToBill[] = [
                            'po_item_id' => $job->po_item_id,
                            'job_card_id' => $job->id,
                            'quantity' => $job->quantity,
                        ];
                    }
                } else {
                    throw new Exception("You must select either a Delivery Challan or completed Job Cards to generate an Invoice.");
                }

                if (count($itemsToBill) === 0) {
                    throw new Exception("No items found to generate this Invoice.");
                }

                // 2. Compute taxable subtotal and taxes
                $subtotal = 0;
                $cgstTotal = 0;
                $sgstTotal = 0;
                $igstTotal = 0;
                $invoiceItemsData = [];

                foreach ($itemsToBill as $billItem) {
                    // Check if already invoiced on another invoice
                    if ($billItem['job_card_id']) {
                        $alreadyInvoiced = InvoiceItem::where('job_card_id', $billItem['job_card_id'])
                            ->where('invoice_id', '!=', $invoice->id)
                            ->exists();
                        if ($alreadyInvoiced) {
                            $jobCard = JobCard::find($billItem['job_card_id']);
                            throw new Exception("Job Card {$jobCard->job_card_number} has already been invoiced on another invoice.");
                        }
                    }

                    $poItem = PoItem::findOrFail($billItem['po_item_id']);
                    
                    if ($poItem->purchase_order_id !== (int)$invoice->purchase_order_id) {
                        throw new Exception("Items must belong to the selected Purchase Order.");
                    }

                    $qty = $billItem['quantity'];
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
                        'job_card_id' => $billItem['job_card_id'],
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

                // Remove existing Delivery Challan linkage if it changed
                if ($invoice->delivery_challan_id && (int)$invoice->delivery_challan_id !== (int)$request->delivery_challan_id) {
                    DeliveryChallan::where('id', $invoice->delivery_challan_id)->update(['invoice_id' => null]);
                }

                // Delete old items
                InvoiceItem::where('invoice_id', $invoice->id)->delete();

                // Update the Invoice
                $invoice->update([
                    'invoice_date' => $request->invoice_date,
                    'delivery_challan_id' => $request->delivery_challan_id,
                    'subtotal' => $subtotal,
                    'cgst_total' => $cgstTotal,
                    'sgst_total' => $sgstTotal,
                    'igst_total' => $igstTotal,
                    'grand_total' => $grandTotal,
                    'remarks' => $request->remarks,
                    'eway_bill_no' => $request->eway_bill_no,
                    'status' => $request->status ?? $invoice->status,
                ]);

                // Save New Invoice Items
                foreach ($invoiceItemsData as $itemData) {
                    $itemData['invoice_id'] = $invoice->id;
                    InvoiceItem::create($itemData);
                }

                // Link Delivery Challan if set
                if ($dc) {
                    $dc->update([
                        'invoice_id' => $invoice->id
                    ]);
                }

                return response()->json([
                    'message' => 'Invoice updated successfully.',
                    'invoice' => $invoice->load(['purchaseOrder', 'deliveryChallan', 'items.poItem'])
                ]);
            });
        } catch (Exception $e) {
            return response()->json([
                'message' => $e->getMessage()
            ], 422);
        }
    }

    /**
     * Finalize / Publish a draft invoice.
     */
    public function finalize(Request $request, $id)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be finalized.'], 422);
        }

        $invoice->update([
            'status' => 'unpaid'
        ]);

        return response()->json([
            'message' => 'Invoice finalized successfully.',
            'invoice' => $invoice
        ]);
    }

    /**
     * Record payment for an invoice.
     */
    public function recordPayment(Request $request, $id)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'payment_method' => 'required|string|in:cash,bank_transfer,upi,cheque,card',
            'transaction_reference' => 'nullable|string|max:255',
            'payment_date' => 'required|date',
            'payment_remarks' => 'nullable|string|max:1000',
        ]);

        $invoice = Invoice::findOrFail($id);

        if ($invoice->cancelled_at) {
            return response()->json(['message' => 'Cannot record payment for a cancelled invoice.'], 422);
        }

        if ($invoice->status === 'draft') {
            return response()->json(['message' => 'Cannot record payment for a draft invoice. Please finalize it first.'], 422);
        }

        $invoice->update([
            'status' => 'paid',
            'payment_method' => $request->payment_method,
            'transaction_reference' => $request->transaction_reference,
            'payment_date' => $request->payment_date,
            'payment_remarks' => $request->payment_remarks,
        ]);

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'invoice' => $invoice->load(['purchaseOrder', 'deliveryChallan', 'items.poItem'])
        ]);
    }
}
