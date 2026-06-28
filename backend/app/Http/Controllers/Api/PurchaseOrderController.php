<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use App\Services\ImapService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Exception;

class PurchaseOrderController extends Controller
{
    /**
     * Display a list of purchase orders.
     */
    public function index(Request $request)
    {
        $status = $request->query('status');

        $query = PurchaseOrder::with([
            'items.jobCards',
            'items.deliveryItems'
        ])->withCount('items')->orderBy('created_at', 'desc');

        if ($status) {
            $query->where('status', $status);
        }

        $pos = $query->get();

        foreach ($pos as $po) {
            $totalQty = 0;
            $completedQty = 0;
            $deliveredQty = 0;
            
            $jobsStatusBreakdown = [
                'pending' => 0,
                'in_progress' => 0,
                'inspection' => 0,
                'completed' => 0,
            ];

            foreach ($po->items as $item) {
                $totalQty += floatval($item->quantity);
                
                foreach ($item->jobCards as $job) {
                    $qty = floatval($job->quantity);
                    if ($job->status === 'completed') {
                        $completedQty += $qty;
                    }
                    if (isset($jobsStatusBreakdown[$job->status])) {
                        $jobsStatusBreakdown[$job->status] += $qty;
                    }
                }

                foreach ($item->deliveryItems as $delItem) {
                    $deliveredQty += floatval($delItem->quantity_delivered);
                }
            }

            $po->total_qty = $totalQty;
            $po->completed_qty = $completedQty;
            $po->delivered_qty = $deliveredQty;
            $po->jobs_status_breakdown = $jobsStatusBreakdown;
        }

        return response()->json($pos);
    }

    /**
     * Retrieve a specific purchase order with its items.
     */
    public function show($id)
    {
        $po = PurchaseOrder::with([
            'items.jobCards.worker',
            'items.jobCards.machine',
            'items.deliveryItems.deliveryChallan'
        ])->findOrFail($id);
        
        foreach ($po->items as $item) {
            $item->received_qty = floatval(\App\Models\IncomingChallanItem::where('po_item_id', $item->id)->sum('quantity_received'));
            
            $itemCompleted = 0;
            $itemDelivered = 0;
            $itemJobsBreakdown = [
                'pending' => 0,
                'in_progress' => 0,
                'inspection' => 0,
                'completed' => 0,
            ];
            
            foreach ($item->jobCards as $job) {
                $qty = floatval($job->quantity);
                if ($job->status === 'completed') {
                    $itemCompleted += $qty;
                }
                if (isset($itemJobsBreakdown[$job->status])) {
                    $itemJobsBreakdown[$job->status] += $qty;
                }
            }
            
            foreach ($item->deliveryItems as $delItem) {
                $itemDelivered += floatval($delItem->quantity_delivered);
            }
            
            $item->completed_qty = $itemCompleted;
            $item->delivered_qty = $itemDelivered;
            $item->jobs_status_breakdown = $itemJobsBreakdown;
        }
        
        return response()->json($po);
    }
    
    /**
     * Manually create a new purchase order.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $request->validate([
            'po_number' => 'required|string',
            'po_date' => 'required|date',
            'customer_name' => 'required|string',
            'customer_address' => 'nullable|string',
            'customer_gstin' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'remarks' => 'nullable|string',
            'status' => 'required|string|in:draft_review,approved',
            'items' => 'required|array|min:1',
            'items.*.item_code' => 'nullable|string',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.delivery_date' => 'nullable|date',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.uqc' => 'nullable|string',
            'items.*.cgst' => 'nullable|numeric|min:0',
            'items.*.sgst' => 'nullable|numeric|min:0',
            'items.*.igst' => 'nullable|numeric|min:0',
            'items.*.item_remarks' => 'nullable|string',
            'items.*.manufacturing_notes' => 'nullable|string',
        ]);

        // Check duplicate
        $exists = PurchaseOrder::where('po_number', $request->po_number)->exists();
        if ($exists) {
            return response()->json([
                'message' => 'A Purchase Order with this PO number already exists.'
            ], 422);
        }

        DB::beginTransaction();

        try {
            $po = PurchaseOrder::create([
                'po_number' => $request->po_number,
                'po_date' => $request->po_date,
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address,
                'customer_gstin' => $request->customer_gstin,
                'customer_email' => $request->customer_email,
                'remarks' => $request->remarks,
                'status' => $request->status,
            ]);

            foreach ($request->items as $item) {
                $qty = floatval($item['quantity']);
                $rate = floatval($item['rate']);
                
                $cgst = floatval($item['cgst'] ?? 0);
                $sgst = floatval($item['sgst'] ?? 0);
                $igst = floatval($item['igst'] ?? 0);
                
                $taxable = $qty * $rate;
                $taxRate = ($cgst + $sgst + $igst) / 100;
                $total = $taxable * (1 + $taxRate);

                PoItem::create([
                    'purchase_order_id' => $po->id,
                    'item_code' => $item['item_code'] ?? null,
                    'description' => $item['description'],
                    'delivery_date' => $item['delivery_date'] ?? null,
                    'hsn_sac' => $item['hsn_sac'] ?? null,
                    'uqc' => $item['uqc'] ?? 'PC',
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? 'Pcs',
                    'rate' => $rate,
                    'cgst' => $cgst,
                    'sgst' => $sgst,
                    'igst' => $igst,
                    'total_amount' => $total,
                    'item_remarks' => $item['item_remarks'] ?? null,
                    'manufacturing_notes' => $item['manufacturing_notes'] ?? null,
                ]);
            }

            // Automatically initialize Job Cards if status is approved
            if ($request->status === 'approved') {
                $po->load('items');
                $settingPrefix = \App\Models\Setting::getVal('prefix_job', 'JOB-');
                foreach ($po->items as $poItem) {
                    $lastJob = \App\Models\JobCard::orderBy('id', 'desc')->first();
                    $nextNum = 1;
                    if ($lastJob) {
                        $parts = explode('-', $lastJob->job_card_number);
                        $lastSeq = (int) end($parts);
                        $nextNum = $lastSeq + 1;
                    }
                    $jobCardNumber = $settingPrefix . date('Y') . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

                    \App\Models\JobCard::create([
                        'job_card_number' => $jobCardNumber,
                        'po_item_id' => $poItem->id,
                        'quantity' => $poItem->quantity,
                        'status' => 'pending',
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'message' => $request->status === 'approved' 
                    ? 'Purchase Order created and approved successfully. Job cards initialized.' 
                    : 'Purchase Order created successfully as draft.',
                'po' => $po->load('items')
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to create PO: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manually trigger PO fetching from email inbox.
     */
    public function fetch()
    {
        if (!auth()->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $imap = new ImapService();

        try {
            $result = $imap->fetchPurchaseOrders();
            $result['last_fetch_at'] = \App\Models\Setting::getVal('po_last_fetch_at');
            return response()->json($result);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to check emails: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Approve a purchase order, updating details and sync items.
     */
    public function approve(Request $request, $id)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $po = PurchaseOrder::findOrFail($id);

        $request->validate([
            'po_number' => 'required|string',
            'po_date' => 'required|date',
            'customer_name' => 'required|string',
            'customer_address' => 'nullable|string',
            'customer_gstin' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.delivery_date' => 'nullable|date',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.uqc' => 'nullable|string',
            'items.*.cgst' => 'nullable|numeric|min:0',
            'items.*.sgst' => 'nullable|numeric|min:0',
            'items.*.igst' => 'nullable|numeric|min:0',
            'items.*.item_remarks' => 'nullable|string',
            'items.*.manufacturing_notes' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            // 1. Update PO details
            $po->update([
                'po_number' => $request->po_number,
                'po_date' => $request->po_date,
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address,
                'customer_gstin' => $request->customer_gstin,
                'customer_email' => $request->customer_email,
                'remarks' => $request->remarks,
                'status' => 'approved',
            ]);

            // 2. Sync items
            $po->items()->delete();

            foreach ($request->items as $item) {
                $qty = floatval($item['quantity']);
                $rate = floatval($item['rate']);
                
                $cgst = floatval($item['cgst'] ?? 0);
                $sgst = floatval($item['sgst'] ?? 0);
                $igst = floatval($item['igst'] ?? 0);
                
                $taxable = $qty * $rate;
                $taxRate = ($cgst + $sgst + $igst) / 100;
                $total = $taxable * (1 + $taxRate);

                PoItem::create([
                    'purchase_order_id' => $po->id,
                    'item_code' => $item['item_code'] ?? null,
                    'description' => $item['description'],
                    'delivery_date' => $item['delivery_date'] ?? null,
                    'hsn_sac' => $item['hsn_sac'] ?? null,
                    'uqc' => $item['uqc'] ?? 'PC',
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? 'Pcs',
                    'rate' => $rate,
                    'cgst' => $cgst,
                    'sgst' => $sgst,
                    'igst' => $igst,
                    'total_amount' => $total,
                    'item_remarks' => $item['item_remarks'] ?? null,
                    'manufacturing_notes' => $item['manufacturing_notes'] ?? null,
                ]);
            }

            DB::commit();

            return response()->json([
                'message' => 'Purchase Order verified and approved successfully. Job cards initialized.',
                'po' => $po->load('items')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to approve PO: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update purchase order status (Accept, Reject, Mark for Review).
     */
    public function updateStatus(Request $request, $id)
    {
        $po = PurchaseOrder::findOrFail($id);

        $request->validate([
            'status' => 'required|string|in:draft_review,approved,rejected,marked_review,completed',
        ]);

        try {
            $po->update([
                'status' => $request->status,
            ]);

            return response()->json([
                'message' => "Purchase Order status updated to '{$request->status}' successfully.",
                'po' => $po
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to update PO status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Convert PO items directly into floor Job Cards.
     * Skips items that already have jobs. Optionally links to incoming challan.
     */
    public function convertToJobs(Request $request, $id)
    {
        if (!auth()->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $po = PurchaseOrder::with('items')->findOrFail($id);

        if ($po->items->isEmpty()) {
            return response()->json([
                'message' => 'This Purchase Order contains no line items to convert.'
            ], 422);
        }

        $request->validate([
            'po_item_ids' => 'nullable|array',
            'po_item_ids.*' => 'exists:po_items,id',
            'challan_option' => 'nullable|string|in:none,new,existing',
            'challan_number' => 'required_if:challan_option,new|nullable|string',
            'challan_date' => 'required_if:challan_option,new|nullable|date',
            'incoming_challan_id' => 'required_if:challan_option,existing|nullable|exists:incoming_challans,id',
        ]);

        DB::beginTransaction();

        try {
            $createdCount = 0;
            $skippedCount = 0;

            // Determine the challan to link
            $challanOption = $request->input('challan_option');
            $linkedChallan = null;

            if ($challanOption === 'new') {
                $linkedChallan = \App\Models\IncomingChallan::create([
                    'challan_number' => $request->challan_number,
                    'challan_date' => $request->challan_date ?: date('Y-m-d'),
                    'purchase_order_id' => $po->id,
                    'received_by' => auth()->id() ?: 1,
                ]);
            } elseif ($challanOption === 'existing') {
                $linkedChallan = \App\Models\IncomingChallan::findOrFail($request->incoming_challan_id);
            } elseif ($challanOption === 'none') {
                $linkedChallan = null;
            } else {
                // Default: Fallback to existing linked challan if any
                $linkedChallan = \App\Models\IncomingChallan::where('purchase_order_id', $po->id)->first();
            }

            // Filter items to convert
            $poItemIds = $request->input('po_item_ids');
            $itemsToConvert = $po->items;
            if (!empty($poItemIds)) {
                $itemsToConvert = $po->items->whereIn('id', $poItemIds);
            }

            foreach ($itemsToConvert as $poItem) {
                // Check if a Job Card already exists for this PO Item
                $existingJob = \App\Models\JobCard::where('po_item_id', $poItem->id)->first();
                if ($existingJob) {
                    $skippedCount++;
                    continue;
                }

                // Generate sequential Job Card Number
                $settingPrefix = \App\Models\Setting::getVal('prefix_job', 'JOB-');
                $lastJob = \App\Models\JobCard::orderBy('id', 'desc')->first();
                $nextNum = 1;
                if ($lastJob) {
                    $parts = explode('-', $lastJob->job_card_number);
                    $lastSeq = (int) end($parts);
                    $nextNum = $lastSeq + 1;
                }
                $jobCardNumber = $settingPrefix . date('Y') . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

                // Find or create linked challan item if challan exists
                $challanItemId = null;
                if ($linkedChallan) {
                    $challanItem = \App\Models\IncomingChallanItem::where('incoming_challan_id', $linkedChallan->id)
                        ->where('po_item_id', $poItem->id)
                        ->first();

                    if (!$challanItem) {
                        $challanItem = \App\Models\IncomingChallanItem::create([
                            'incoming_challan_id' => $linkedChallan->id,
                            'po_item_id' => $poItem->id,
                            'quantity_received' => $poItem->quantity,
                        ]);
                    }
                    $challanItemId = $challanItem->id;
                }

                // Create Job Card, carry forward PO-level remarks
                \App\Models\JobCard::create([
                    'job_card_number' => $jobCardNumber,
                    'po_item_id' => $poItem->id,
                    'incoming_challan_item_id' => $challanItemId,
                    'quantity' => $poItem->quantity,
                    'status' => 'pending',
                    'remarks' => $po->remarks, // Carry PO-level remarks to job
                ]);

                $createdCount++;
            }

            // Auto transition status to approved if it was draft
            if ($po->status === 'draft_review') {
                $po->update(['status' => 'approved']);
            }

            DB::commit();

            $message = $skippedCount > 0
                ? "Generated {$createdCount} new Job Card(s). {$skippedCount} item(s) already had jobs and were skipped."
                : "Successfully converted all PO items. Generated {$createdCount} new Job Card(s).";

            return response()->json([
                'message' => $message,
                'created_count' => $createdCount,
                'skipped_count' => $skippedCount,
                'po' => $po->load('items')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to convert PO items: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing Purchase Order (edit any status) with audit log.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $po = PurchaseOrder::with('items')->findOrFail($id);

        $request->validate([
            'po_number' => 'required|string',
            'po_date' => 'required|date',
            'customer_name' => 'required|string',
            'customer_address' => 'nullable|string',
            'customer_gstin' => 'nullable|string',
            'customer_email' => 'nullable|email',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.description' => 'required|string',
            'items.*.quantity' => 'required|numeric|min:0.01',
            'items.*.rate' => 'required|numeric|min:0',
            'items.*.delivery_date' => 'nullable|date',
            'items.*.hsn_sac' => 'nullable|string',
            'items.*.uqc' => 'nullable|string',
            'items.*.cgst' => 'nullable|numeric|min:0',
            'items.*.sgst' => 'nullable|numeric|min:0',
            'items.*.igst' => 'nullable|numeric|min:0',
            'items.*.item_remarks' => 'nullable|string',
            'items.*.manufacturing_notes' => 'nullable|string',
        ]);

        DB::beginTransaction();

        try {
            $originalSnapshot = $this->getPoSnapshot($po);

            // Update PO header
            $po->update([
                'po_number' => $request->po_number,
                'po_date' => $request->po_date,
                'customer_name' => $request->customer_name,
                'customer_address' => $request->customer_address,
                'customer_gstin' => $request->customer_gstin,
                'customer_email' => $request->customer_email,
                'remarks' => $request->remarks,
            ]);

            // Sync items: update existing by id, delete removed, create new
            $existingItemIds = $po->items->pluck('id')->toArray();
            $submittedIds = [];

            foreach ($request->items as $item) {
                $qty = floatval($item['quantity']);
                $rate = floatval($item['rate']);
                $cgst = floatval($item['cgst'] ?? 0);
                $sgst = floatval($item['sgst'] ?? 0);
                $igst = floatval($item['igst'] ?? 0);
                $taxable = $qty * $rate;
                $taxRate = ($cgst + $sgst + $igst) / 100;
                $total = $taxable * (1 + $taxRate);

                $itemData = [
                    'item_code' => $item['item_code'] ?? null,
                    'description' => $item['description'],
                    'delivery_date' => $item['delivery_date'] ?? null,
                    'hsn_sac' => $item['hsn_sac'] ?? null,
                    'uqc' => $item['uqc'] ?? 'PC',
                    'quantity' => $qty,
                    'unit' => $item['unit'] ?? 'Pcs',
                    'rate' => $rate,
                    'cgst' => $cgst,
                    'sgst' => $sgst,
                    'igst' => $igst,
                    'total_amount' => $total,
                    'item_remarks' => $item['item_remarks'] ?? null,
                    'manufacturing_notes' => $item['manufacturing_notes'] ?? null,
                ];

                if (!empty($item['id']) && in_array($item['id'], $existingItemIds)) {
                    // Update existing item
                    PoItem::where('id', $item['id'])->update($itemData);
                    $submittedIds[] = $item['id'];
                } else {
                    // Create new item
                    $newItem = PoItem::create(array_merge($itemData, ['purchase_order_id' => $po->id]));
                    $submittedIds[] = $newItem->id;
                }
            }

            // Delete items that were removed
            $toDelete = array_diff($existingItemIds, $submittedIds);
            if (!empty($toDelete)) {
                PoItem::whereIn('id', $toDelete)->delete();
            }

            $revisedSnapshot = $this->getPoSnapshot($po->fresh());

            // Audit log
            \App\Models\PurchaseOrderAuditLog::create([
                'purchase_order_id' => $po->id,
                'action' => 'manual_edit',
                'original_version' => $originalSnapshot,
                'revised_version' => $revisedSnapshot,
                'user_id' => $request->user()->id,
                'user_name' => $request->user()->name,
            ]);

            DB::commit();

            return response()->json([
                'message' => 'Purchase Order updated successfully.',
                'po' => $po->fresh()->load('items.jobCards', 'items.deliveryItems')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update PO: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Duplicate a Purchase Order as a new draft.
     */
    public function duplicate(Request $request, $id)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $po = PurchaseOrder::with('items')->findOrFail($id);

        DB::beginTransaction();

        try {
            // Determine a unique new PO number
            $copyCount = PurchaseOrder::where('po_number', 'like', $po->po_number . '-COPY-%')->count() + 1;
            $newPoNumber = $po->po_number . '-COPY-' . $copyCount;

            $newPo = PurchaseOrder::create([
                'po_number' => $newPoNumber,
                'po_date' => $po->po_date,
                'customer_name' => $po->customer_name,
                'customer_address' => $po->customer_address,
                'customer_gstin' => $po->customer_gstin,
                'customer_email' => $po->customer_email,
                'remarks' => $po->remarks,
                'status' => 'draft_review',
            ]);

            foreach ($po->items as $item) {
                PoItem::create([
                    'purchase_order_id' => $newPo->id,
                    'item_code' => $item->item_code,
                    'description' => $item->description,
                    'delivery_date' => $item->delivery_date,
                    'hsn_sac' => $item->hsn_sac,
                    'uqc' => $item->uqc,
                    'quantity' => $item->quantity,
                    'unit' => $item->unit,
                    'rate' => $item->rate,
                    'cgst' => $item->cgst,
                    'sgst' => $item->sgst,
                    'igst' => $item->igst,
                    'total_amount' => $item->total_amount,
                    'item_remarks' => $item->item_remarks,
                    'manufacturing_notes' => $item->manufacturing_notes,
                ]);
            }

            // Audit log on original
            \App\Models\PurchaseOrderAuditLog::create([
                'purchase_order_id' => $po->id,
                'action' => 'duplicated',
                'original_version' => $this->getPoSnapshot($po),
                'revised_version' => ['new_po_number' => $newPoNumber],
                'user_id' => $request->user()->id,
                'user_name' => $request->user()->name,
            ]);

            DB::commit();

            return response()->json([
                'message' => "Purchase Order duplicated successfully as {$newPoNumber}.",
                'po' => $newPo->load('items')
            ], 201);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to duplicate PO: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the linked incoming challan for a Purchase Order, plus job coverage info.
     */
    public function getLinkedChallan($id)
    {
        $po = PurchaseOrder::with('items')->findOrFail($id);

        $challan = \App\Models\IncomingChallan::where('purchase_order_id', $po->id)
            ->with('items')
            ->first();

        // Compute partial job info
        $itemIds = $po->items->pluck('id');
        $itemsWithJobs = \App\Models\JobCard::whereIn('po_item_id', $itemIds)
            ->select('po_item_id')
            ->distinct()
            ->pluck('po_item_id')
            ->count();
        $totalItems = $po->items->count();
        $remainingItems = $totalItems - $itemsWithJobs;

        return response()->json([
            'has_incoming_challan' => !is_null($challan),
            'challan' => $challan,
            'jobs_info' => [
                'total_items' => $totalItems,
                'items_with_jobs' => $itemsWithJobs,
                'remaining_items' => $remainingItems,
                'all_done' => $remainingItems === 0,
            ],
        ]);
    }

    /**
     * Get list of pending purchase order revisions.
     */
    public function getRevisions(Request $request)
    {
        $revisions = \App\Models\PurchaseOrderRevision::with('purchaseOrder')
            ->where('status', 'pending')
            ->orderBy('created_at', 'desc')
            ->get();

        foreach ($revisions as $rev) {
            $stats = null;
            if ($rev->purchase_order_id) {
                $existingPo = PurchaseOrder::with('items')->find($rev->purchase_order_id);
                if ($existingPo) {
                    $jobsCount = \App\Models\JobCard::whereIn('po_item_id', $existingPo->items->pluck('id'))->count();
                    $hasDelivery = \App\Models\DeliveryChallan::where('purchase_order_id', $existingPo->id)->exists();
                    $totalQty = floatval($existingPo->items->sum('quantity'));
                    $deliveredQty = floatval(\App\Models\DeliveryChallanItem::whereIn('po_item_id', $existingPo->items->pluck('id'))->sum('quantity_delivered'));
                    
                    $deliveryStatus = 'No';
                    if ($hasDelivery) {
                        $deliveryStatus = ($deliveredQty >= $totalQty) ? 'Fully Delivered' : 'Partial (' . $deliveredQty . '/' . $totalQty . ')';
                    }
                    
                    $hasInvoice = \App\Models\Invoice::where('purchase_order_id', $existingPo->id)->exists();
                    $invoicedQty = floatval(\App\Models\InvoiceItem::whereIn('po_item_id', $existingPo->items->pluck('id'))->sum('quantity'));
                    
                    $invoiceStatus = 'No';
                    if ($hasInvoice) {
                        $invoiceStatus = ($invoicedQty >= $totalQty) ? 'Fully Invoiced' : 'Partial (' . $invoicedQty . '/' . $totalQty . ')';
                    }
                    
                    $stats = [
                        'status' => $existingPo->status,
                        'created_at' => $existingPo->created_at->toDateTimeString(),
                        'customer_name' => $existingPo->customer_name,
                        'jobs_count' => $jobsCount,
                        'delivery_status' => $deliveryStatus,
                        'invoice_status' => $invoiceStatus,
                    ];
                }
            }
            $rev->existing_stats = $stats;
        }

        return response()->json($revisions);
    }

    /**
     * Get a single PO revision with matching original PO details and execution stats.
     */
    public function getRevision($id)
    {
        $revision = \App\Models\PurchaseOrderRevision::findOrFail($id);
        
        $existingPo = null;
        $stats = null;
        
        if ($revision->purchase_order_id) {
            $existingPo = PurchaseOrder::with(['items.jobCards', 'items.deliveryItems'])->find($revision->purchase_order_id);
            
            if ($existingPo) {
                $jobsCount = \App\Models\JobCard::whereIn('po_item_id', $existingPo->items->pluck('id'))->count();
                
                $hasDelivery = \App\Models\DeliveryChallan::where('purchase_order_id', $existingPo->id)->exists();
                $totalQty = floatval($existingPo->items->sum('quantity'));
                $deliveredQty = floatval(\App\Models\DeliveryChallanItem::whereIn('po_item_id', $existingPo->items->pluck('id'))->sum('quantity_delivered'));
                
                $deliveryStatus = 'No';
                if ($hasDelivery) {
                    $deliveryStatus = ($deliveredQty >= $totalQty) ? 'Fully Delivered' : 'Partial (' . $deliveredQty . '/' . $totalQty . ')';
                }
                
                $hasInvoice = \App\Models\Invoice::where('purchase_order_id', $existingPo->id)->exists();
                $invoicedQty = floatval(\App\Models\InvoiceItem::whereIn('po_item_id', $existingPo->items->pluck('id'))->sum('quantity'));
                
                $invoiceStatus = 'No';
                if ($hasInvoice) {
                    $invoiceStatus = ($invoicedQty >= $totalQty) ? 'Fully Invoiced' : 'Partial (' . $invoicedQty . '/' . $totalQty . ')';
                }
                
                $stats = [
                    'status' => $existingPo->status,
                    'created_at' => $existingPo->created_at->toDateTimeString(),
                    'customer_name' => $existingPo->customer_name,
                    'jobs_count' => $jobsCount,
                    'delivery_status' => $deliveryStatus,
                    'invoice_status' => $invoiceStatus,
                ];
            }
        }
        
        return response()->json([
            'revision' => $revision,
            'existing_po' => $existingPo,
            'existing_stats' => $stats
        ]);
    }

    /**
     * Process user action (ignore, update existing, or save as version PO) on a pending revision.
     */
    public function handleRevisionAction(Request $request, $id)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }
        $revision = \App\Models\PurchaseOrderRevision::findOrFail($id);
        
        $request->validate([
            'action' => 'required|string|in:ignore,update_existing,save_as_revision',
        ]);
        
        $action = $request->action;
        $user = auth()->user();
        
        DB::beginTransaction();
        
        try {
            if ($action === 'ignore') {
                $revision->update(['status' => 'ignored']);
                
                // Log audit trail if linked to existing PO
                if ($revision->purchase_order_id) {
                    \App\Models\PurchaseOrderAuditLog::create([
                        'purchase_order_id' => $revision->purchase_order_id,
                        'action' => 'ignored',
                        'original_version' => null,
                        'revised_version' => $revision->extracted_data,
                        'user_id' => $user?->id,
                        'user_name' => $user?->name,
                    ]);
                }
                
                DB::commit();
                return response()->json([
                    'message' => 'Revision changes ignored and archived.'
                ]);
            }
            
            $existingPo = PurchaseOrder::findOrFail($revision->purchase_order_id);
            $originalSnapshot = $this->getPoSnapshot($existingPo);
            
            if ($action === 'update_existing') {
                // Update PO details
                $existingPo->update([
                    'po_date' => $revision->po_date,
                    'customer_name' => $revision->customer_name,
                    'customer_email' => $revision->customer_email,
                    'pdf_path' => $revision->pdf_path ?? $existingPo->pdf_path,
                    'email_uid' => $revision->email_uid ?? $existingPo->email_uid,
                    'status' => 'draft_review', // Reset to draft for verification
                ]);
                
                // Clear existing items and save new items
                $existingPo->items()->delete();
                
                $itemsData = $revision->extracted_data['items'] ?? [];
                if (!empty($itemsData)) {
                    foreach ($itemsData as $item) {
                        PoItem::create([
                            'purchase_order_id' => $existingPo->id,
                            'item_code' => $item['item_code'] ?? null,
                            'description' => $item['description'],
                            'delivery_date' => $item['delivery_date'] ?? null,
                            'hsn_sac' => $item['hsn_sac'] ?? null,
                            'uqc' => $item['uqc'] ?? 'PC',
                            'quantity' => floatval($item['quantity']),
                            'unit' => $item['unit'] ?? 'Pcs',
                            'rate' => floatval($item['rate']),
                            'cgst' => floatval($item['cgst'] ?? 0),
                            'sgst' => floatval($item['sgst'] ?? 0),
                            'igst' => floatval($item['igst'] ?? 0),
                            'total_amount' => floatval($item['total_amount'] ?? ($item['quantity'] * $item['rate'])),
                        ]);
                    }
                } else {
                    PoItem::create([
                        'purchase_order_id' => $existingPo->id,
                        'description' => 'Text details extracted from PDF: review drawing for items configuration.',
                        'quantity' => 1.00,
                        'unit' => 'Pcs',
                        'rate' => 0.00,
                        'total_amount' => 0.00,
                    ]);
                }
                
                $revisedSnapshot = $this->getPoSnapshot($existingPo->fresh());
                
                // Log in Audit Logs
                \App\Models\PurchaseOrderAuditLog::create([
                    'purchase_order_id' => $existingPo->id,
                    'action' => 'revised_update',
                    'original_version' => $originalSnapshot,
                    'revised_version' => $revisedSnapshot,
                    'user_id' => $user?->id,
                    'user_name' => $user?->name,
                ]);
                
                $revision->update(['status' => 'applied']);
                
                DB::commit();
                return response()->json([
                    'message' => 'Existing Purchase Order updated successfully with revision details.',
                    'po' => $existingPo->load('items')
                ]);
            }
            
            if ($action === 'save_as_revision') {
                // Find suffix/revision number
                $versionCount = PurchaseOrder::where('po_number', 'like', $existingPo->po_number . '-REV-%')->count() + 1;
                $newPoNumber = $existingPo->po_number . '-REV-' . $versionCount;
                
                // Create a new PO
                $newPo = PurchaseOrder::create([
                    'po_number' => $newPoNumber,
                    'po_date' => $revision->po_date,
                    'customer_name' => $revision->customer_name,
                    'customer_address' => $existingPo->customer_address,
                    'customer_gstin' => $existingPo->customer_gstin,
                    'customer_email' => $revision->customer_email,
                    'pdf_path' => $revision->pdf_path ?? $existingPo->pdf_path,
                    'email_uid' => $revision->email_uid,
                    'status' => 'draft_review',
                ]);
                
                // Create items
                $itemsData = $revision->extracted_data['items'] ?? [];
                if (!empty($itemsData)) {
                    foreach ($itemsData as $item) {
                        PoItem::create([
                            'purchase_order_id' => $newPo->id,
                            'item_code' => $item['item_code'] ?? null,
                            'description' => $item['description'],
                            'delivery_date' => $item['delivery_date'] ?? null,
                            'hsn_sac' => $item['hsn_sac'] ?? null,
                            'uqc' => $item['uqc'] ?? 'PC',
                            'quantity' => floatval($item['quantity']),
                            'unit' => $item['unit'] ?? 'Pcs',
                            'rate' => floatval($item['rate']),
                            'cgst' => floatval($item['cgst'] ?? 0),
                            'sgst' => floatval($item['sgst'] ?? 0),
                            'igst' => floatval($item['igst'] ?? 0),
                            'total_amount' => floatval($item['total_amount'] ?? ($item['quantity'] * $item['rate'])),
                        ]);
                    }
                } else {
                    PoItem::create([
                        'purchase_order_id' => $newPo->id,
                        'description' => 'Text details extracted from PDF: review drawing for items configuration.',
                        'quantity' => 1.00,
                        'unit' => 'Pcs',
                        'rate' => 0.00,
                        'total_amount' => 0.00,
                    ]);
                }
                
                $revisedSnapshot = $this->getPoSnapshot($newPo);
                
                // Log in Audit Logs for BOTH existing and new PO
                \App\Models\PurchaseOrderAuditLog::create([
                    'purchase_order_id' => $existingPo->id,
                    'action' => 'saved_as_revision_po',
                    'original_version' => $originalSnapshot,
                    'revised_version' => $revisedSnapshot,
                    'user_id' => $user?->id,
                    'user_name' => $user?->name,
                ]);
                
                \App\Models\PurchaseOrderAuditLog::create([
                    'purchase_order_id' => $newPo->id,
                    'action' => 'created_as_revision',
                    'original_version' => null,
                    'revised_version' => $revisedSnapshot,
                    'user_id' => $user?->id,
                    'user_name' => $user?->name,
                ]);
                
                $revision->update(['status' => 'applied']);
                
                DB::commit();
                return response()->json([
                    'message' => 'Revision saved as a new Purchase Order version: ' . $newPoNumber,
                    'po' => $newPo->load('items')
                ]);
            }
        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to process revision action: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get change logs for a specific PO.
     */
    public function getAuditLogs($id)
    {
        $logs = \App\Models\PurchaseOrderAuditLog::where('purchase_order_id', $id)
            ->orderBy('created_at', 'desc')
            ->get();
        return response()->json($logs);
    }

    /**
     * Capture snapshots of PO & items for audit log tracking.
     */
    protected function getPoSnapshot($po)
    {
        $po->load('items');
        return [
            'po_number' => $po->po_number,
            'po_date' => $po->po_date,
            'customer_name' => $po->customer_name,
            'customer_address' => $po->customer_address,
            'customer_gstin' => $po->customer_gstin,
            'customer_email' => $po->customer_email,
            'remarks' => $po->remarks,
            'pdf_path' => $po->pdf_path,
            'status' => $po->status,
            'items' => $po->items->map(function ($item) {
                return [
                    'item_code' => $item->item_code,
                    'description' => $item->description,
                    'delivery_date' => $item->delivery_date,
                    'hsn_sac' => $item->hsn_sac,
                    'uqc' => $item->uqc,
                    'quantity' => floatval($item->quantity),
                    'unit' => $item->unit,
                    'rate' => floatval($item->rate),
                    'cgst' => floatval($item->cgst),
                    'sgst' => floatval($item->sgst),
                    'igst' => floatval($item->igst),
                    'total_amount' => floatval($item->total_amount),
                    'item_remarks' => $item->item_remarks,
                    'manufacturing_notes' => $item->manufacturing_notes,
                ];
            })->toArray()
        ];
    }

    /**
     * Archive a purchase order.
     */
    public function archive(Request $request, $id)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $po = PurchaseOrder::findOrFail($id);
        $po->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $request->user()->id,
            'status' => 'archived'
        ]);

        return response()->json([
            'message' => 'Purchase Order archived successfully.',
            'po' => $po
        ]);
    }

    /**
     * Soft delete a purchase order.
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'delete_reason' => 'required|string|max:1000'
        ]);

        $po = PurchaseOrder::findOrFail($id);

        $hasJobs = \App\Models\JobCard::whereIn('po_item_id', $po->items->pluck('id'))->exists();
        $hasChallans = \App\Models\DeliveryChallan::where('purchase_order_id', $po->id)->exists();
        $hasInvoices = \App\Models\Invoice::where('purchase_order_id', $po->id)->exists();

        if ($hasJobs || $hasChallans || $hasInvoices) {
            return response()->json([
                'message' => 'This Purchase Order cannot be deleted because it is linked to operational records.'
            ], 422);
        }

        $po->update([
            'deleted_by' => $request->user()->id,
            'delete_reason' => $request->delete_reason
        ]);

        $po->delete(); // Laravel soft delete

        return response()->json([
            'message' => 'Purchase Order deleted successfully.'
        ]);
    }
}
