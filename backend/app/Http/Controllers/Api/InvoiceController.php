<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Invoice;
use App\Models\InvoiceItem;
use App\Models\DeliveryChallan;
use App\Models\DeliveryChallanItem;
use App\Models\JobCard;
use App\Models\PoItem;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Barryvdh\DomPDF\Facade\Pdf;
use Exception;

class InvoiceController extends Controller
{
    /**
     * List all commercial invoices.
     */
    public function index()
    {
        $invoices = Invoice::with([
                'purchaseOrder:id,po_number,customer_name', 
                'purchaseOrders:id,po_number,customer_name', 
                'deliveryChallan:id,challan_number'
            ])
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($invoices);
    }

    /**
     * View details of a specific invoice.
     */
    public function show($id)
    {
        $invoice = Invoice::with(['purchaseOrder', 'purchaseOrders', 'deliveryChallan', 'items.poItem.purchaseOrder', 'items.jobCard'])
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

        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'purchase_order_id' => 'required_without:purchase_order_ids|nullable|integer|exists:purchase_orders,id',
            'purchase_order_ids' => 'required_without:purchase_order_id|nullable|array|max:100',
            'purchase_order_ids.*' => 'integer|exists:purchase_orders,id',
            'delivery_challan_id' => 'nullable|integer|exists:delivery_challans,id',
            'job_card_ids' => 'nullable|array|max:100',
            'job_card_ids.*' => 'integer|exists:job_cards,id',
            'remarks' => 'nullable|string|max:2000',
            'eway_bill_no' => 'nullable|string|max:100',
            'status' => 'nullable|string|in:draft,unpaid',
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

            return DB::transaction(function () use ($validated, $poIds) {
                // 1. Generate sequential invoice number (INV-YYYY-XXXX)
                $year = date('Y', strtotime($validated['invoice_date']));
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
                if (isset($validated['delivery_challan_id'])) {
                    $dc = DeliveryChallan::findOrFail($validated['delivery_challan_id']);
                    if ($dc->invoice_id) {
                        throw new Exception("Delivery Challan {$dc->challan_number} is already linked to an Invoice.");
                    }
                    if (!in_array((int)$dc->purchase_order_id, $poIds)) {
                        throw new Exception("Selected Purchase Orders do not match the Delivery Challan.");
                    }

                    $dcItems = DeliveryChallanItem::where('delivery_challan_id', $dc->id)->get();
                    foreach ($dcItems as $dcItem) {
                        $itemsToBill[] = [
                            'po_item_id' => $dcItem->po_item_id,
                            'job_card_id' => $dcItem->job_card_id,
                            'quantity' => $dcItem->quantity_delivered,
                        ];
                    }
                } elseif (isset($validated['job_card_ids']) && count($validated['job_card_ids']) > 0) {
                    foreach ($validated['job_card_ids'] as $jobCardId) {
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
                    if (!in_array((int)$poItem->purchase_order_id, $poIds)) {
                        throw new Exception("Items must belong to the selected Purchase Orders.");
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
                    'invoice_date' => $validated['invoice_date'],
                    'purchase_order_id' => $poIds[0],
                    'delivery_challan_id' => $validated['delivery_challan_id'] ?? null,
                    'subtotal' => $subtotal,
                    'cgst_total' => $cgstTotal,
                    'sgst_total' => $sgstTotal,
                    'igst_total' => $igstTotal,
                    'grand_total' => $grandTotal,
                    'remarks' => $validated['remarks'] ?? null,
                    'eway_bill_no' => $validated['eway_bill_no'] ?? null,
                    'status' => $validated['status'] ?? 'unpaid',
                ]);

                // Sync pivot relation
                $invoice->purchaseOrders()->sync($poIds);

                // 5. Save Invoice Items
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

                PushNotificationService::sendToRoles(
                    ['admin', 'partner'],
                    'Invoice Generated 📄',
                    "Invoice {$invoice->invoice_number} has been generated.",
                    'invoice_generated',
                    ['invoice_id' => $invoice->id]
                );

                return response()->json([
                    'message' => 'Invoice generated successfully.',
                    'invoice' => $invoice->load(['purchaseOrder', 'purchaseOrders', 'deliveryChallan', 'items.poItem'])
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

        $validated = $request->validate([
            'cancellation_reason' => 'required|string|max:1000'
        ]);

        $invoice = Invoice::findOrFail($id);

        DB::transaction(function () use ($invoice, $request, $validated) {
            $invoice->update([
                'cancelled_at' => now(),
                'cancelled_by' => $request->user()->id,
                'cancellation_reason' => $validated['cancellation_reason']
            ]);

            // Clear the link from delivery challans
            \App\Models\DeliveryChallan::where('invoice_id', $invoice->id)->update([
                'invoice_id' => null
            ]);
        });

        PushNotificationService::sendToRoles(
            ['admin', 'partner'],
            'Invoice Cancelled 🚫',
            "Invoice {$invoice->invoice_number} has been cancelled.",
            'invoice_cancelled',
            ['invoice_id' => $invoice->id]
        );

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

        $validated = $request->validate([
            'invoice_date' => 'required|date',
            'remarks' => 'nullable|string|max:2000',
            'eway_bill_no' => 'nullable|string|max:100',
            'purchase_order_ids' => 'nullable|array|max:100',
            'purchase_order_ids.*' => 'integer|exists:purchase_orders,id',
            'delivery_challan_id' => 'nullable|integer|exists:delivery_challans,id',
            'job_card_ids' => 'nullable|array|max:100',
            'job_card_ids.*' => 'integer|exists:job_cards,id',
            'status' => 'nullable|string|in:draft,unpaid',
        ]);

        $invoice = Invoice::findOrFail($id);

        if ($invoice->status !== 'draft') {
            return response()->json(['message' => 'Only draft invoices can be edited.'], 422);
        }

        try {
            $poIds = $request->input('purchase_order_ids');
            if (empty($poIds)) {
                $poIds = $invoice->purchaseOrders()->pluck('purchase_orders.id')->toArray();
                if (empty($poIds)) {
                    $poIds = [$invoice->purchase_order_id];
                }
            }
            $poIds = array_filter(array_unique(array_map('intval', (array)$poIds)));

            if (empty($poIds)) {
                return response()->json(['message' => 'Please select at least one Purchase Order.'], 422);
            }

            $pos = PurchaseOrder::whereIn('id', $poIds)->get();
            $customerNames = $pos->pluck('customer_name')->unique();
            if ($customerNames->count() > 1) {
                return response()->json(['message' => 'All selected Purchase Orders must belong to the same customer.'], 422);
            }

            return DB::transaction(function () use ($validated, $invoice, $poIds) {
                // 1. Identify items to bill
                $itemsToBill = [];
                $dc = null;
                if (isset($validated['delivery_challan_id'])) {
                    $dc = DeliveryChallan::findOrFail($validated['delivery_challan_id']);
                    if ($dc->invoice_id && (int)$dc->invoice_id !== (int)$invoice->id) {
                        throw new Exception("Delivery Challan {$dc->challan_number} is already linked to another Invoice.");
                    }
                    if (!in_array((int)$dc->purchase_order_id, $poIds)) {
                        throw new Exception("Selected Purchase Orders do not match the Delivery Challan.");
                    }

                    $dcItems = DeliveryChallanItem::where('delivery_challan_id', $dc->id)->get();
                    foreach ($dcItems as $dcItem) {
                        $itemsToBill[] = [
                            'po_item_id' => $dcItem->po_item_id,
                            'job_card_id' => $dcItem->job_card_id,
                            'quantity' => $dcItem->quantity_delivered,
                        ];
                    }
                } elseif (isset($validated['job_card_ids']) && count($validated['job_card_ids']) > 0) {
                    foreach ($validated['job_card_ids'] as $jobCardId) {
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
                    
                    if (!in_array((int)$poItem->purchase_order_id, $poIds)) {
                        throw new Exception("Items must belong to the selected Purchase Orders.");
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
                if ($invoice->delivery_challan_id && (int)$invoice->delivery_challan_id !== (int)($validated['delivery_challan_id'] ?? null)) {
                    DeliveryChallan::where('id', $invoice->delivery_challan_id)->update(['invoice_id' => null]);
                }

                // Delete old items
                InvoiceItem::where('invoice_id', $invoice->id)->delete();

                // Update the Invoice
                $invoice->update([
                    'purchase_order_id' => $poIds[0],
                    'invoice_date' => $validated['invoice_date'],
                    'delivery_challan_id' => $validated['delivery_challan_id'] ?? null,
                    'subtotal' => $subtotal,
                    'cgst_total' => $cgstTotal,
                    'sgst_total' => $sgstTotal,
                    'igst_total' => $igstTotal,
                    'grand_total' => $grandTotal,
                    'remarks' => $validated['remarks'] ?? null,
                    'eway_bill_no' => $validated['eway_bill_no'] ?? null,
                    'status' => $validated['status'] ?? $invoice->status,
                ]);

                // Sync pivot relation
                $invoice->purchaseOrders()->sync($poIds);

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

                PushNotificationService::sendToRoles(
                    ['admin', 'partner'],
                    'Invoice Edited 📝',
                    "Invoice {$invoice->invoice_number} has been updated.",
                    'invoice_edited',
                    ['invoice_id' => $invoice->id]
                );

                return response()->json([
                    'message' => 'Invoice updated successfully.',
                    'invoice' => $invoice->load(['purchaseOrder', 'purchaseOrders', 'deliveryChallan', 'items.poItem'])
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

        $validated = $request->validate([
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
            'payment_method' => $validated['payment_method'],
            'transaction_reference' => $validated['transaction_reference'] ?? null,
            'payment_date' => $validated['payment_date'],
            'payment_remarks' => $validated['payment_remarks'] ?? null,
        ]);

        PushNotificationService::sendToRoles(
            ['admin', 'partner'],
            'Payment Received 💰',
            "Payment recorded for Invoice {$invoice->invoice_number}.",
            'invoice_payment',
            ['invoice_id' => $invoice->id]
        );

        return response()->json([
            'message' => 'Payment recorded successfully.',
            'invoice' => $invoice->load(['purchaseOrder', 'deliveryChallan', 'items.poItem'])
        ]);
    }

    /**
     * Generate PDF for the invoice.
     */
    public function generatePdf(Request $request, $id)
    {
        $invoice = Invoice::with(['purchaseOrder', 'deliveryChallan', 'items.poItem', 'items.jobCard', 'purchaseOrders'])
            ->findOrFail($id);

        $config = [
            'showQrCode' => $request->query('showQrCode', 'true') === 'true',
            'showCompanyTagline' => $request->query('showCompanyTagline', 'true') === 'true',
            'showBankDetails' => $request->query('showBankDetails', 'true') === 'true',
            'showAmountInWords' => $request->query('showAmountInWords', 'true') === 'true',
            'showJobReferences' => $request->query('showJobReferences', 'true') === 'true',
            'showHsnSac' => $request->query('showHsnSac', 'true') === 'true',
            'showPartNumbers' => $request->query('showPartNumbers', 'true') === 'true',
            'showSerialNumbers' => $request->query('showSerialNumbers', 'false') === 'true',
            'enableWatermark' => \App\Models\Setting::getVal('enable_watermark', '1') === '1',
            'watermarkText' => \App\Models\Setting::getVal('global_watermark_text', ''),
            'downloadedBy' => $request->user() ? $request->user()->name : 'System',
        ];

        if (\App\Models\Setting::getVal('enable_qr_verification', '1') === '1') {
            $verificationUrl = url('/verify/INV-' . $invoice->id);
            $renderer = new \BaconQrCode\Renderer\ImageRenderer(
                new \BaconQrCode\Renderer\RendererStyle\RendererStyle(100),
                new \BaconQrCode\Renderer\Image\SvgImageBackEnd()
            );
            $writer = new \BaconQrCode\Writer($renderer);
            $config['qrCodeSvg'] = $writer->writeString($verificationUrl);
        }

        // Load view and pass data
        $amountInWords = $this->numberToWords($invoice->grand_total);
        $logo = \App\Models\Setting::getVal('branding_pdf_logo') ?: \App\Models\Setting::getVal('company_logo');
        $pdf = Pdf::setOptions(['isPhpEnabled' => true])->loadView('pdf.invoice', compact('invoice', 'amountInWords', 'config', 'logo'));
        
        // DomPDF configuration for A4 portrait
        $pdf->setPaper('a4', 'portrait');

        if ($request->query('save') === 'true') {
            $fileName = 'invoices/' . $invoice->invoice_number . '_' . time() . '.pdf';
            \Illuminate\Support\Facades\Storage::disk('public')->put($fileName, $pdf->output());
            return response()->json(['url' => asset('storage/' . $fileName)]);
        }

        return $pdf->download($invoice->invoice_number . '.pdf');
    }

    private function numberToWords($num)
    {
        $num = (int)$num;
        if ($num == 0) return 'Zero';

        $ones = [
            0 => '', 1 => 'One', 2 => 'Two', 3 => 'Three', 4 => 'Four', 5 => 'Five',
            6 => 'Six', 7 => 'Seven', 8 => 'Eight', 9 => 'Nine', 10 => 'Ten',
            11 => 'Eleven', 12 => 'Twelve', 13 => 'Thirteen', 14 => 'Fourteen',
            15 => 'Fifteen', 16 => 'Sixteen', 17 => 'Seventeen', 18 => 'Eighteen', 19 => 'Nineteen'
        ];
        $tens = [
            0 => '', 1 => 'Ten', 2 => 'Twenty', 3 => 'Thirty', 4 => 'Forty',
            5 => 'Fifty', 6 => 'Sixty', 7 => 'Seventy', 8 => 'Eighty', 9 => 'Ninety'
        ];

        $numToWords = function($n) use (&$numToWords, $ones, $tens) {
            if ($n < 20) return $ones[$n];
            if ($n < 100) return $tens[(int)($n / 10)] . ($n % 10 != 0 ? ' ' . $ones[$n % 10] : '');
            if ($n < 1000) return $ones[(int)($n / 100)] . ' Hundred' . ($n % 100 != 0 ? ' ' . $numToWords($n % 100) : '');
            if ($n < 100000) return $numToWords((int)($n / 1000)) . ' Thousand' . ($n % 1000 != 0 ? ' ' . $numToWords($n % 1000) : '');
            if ($n < 10000000) return $numToWords((int)($n / 100000)) . ' Lakh' . ($n % 100000 != 0 ? ' ' . $numToWords($n % 100000) : '');
            return $numToWords((int)($n / 10000000)) . ' Crore' . ($n % 10000000 != 0 ? ' ' . $numToWords($n % 10000000) : '');
        };

        return 'Rupees ' . $numToWords($num) . ' Only';
    }
}
