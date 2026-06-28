<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\IncomingChallan;
use App\Models\IncomingChallanItem;
use App\Models\JobCard;
use App\Models\PurchaseOrder;
use App\Models\PoItem;
use App\Services\ChallanParserService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Exception;

class IncomingChallanController extends Controller
{
    /**
     * Display a list of incoming challans.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to manage incoming challans.'], 403);
        }

        $challans = IncomingChallan::where('is_archived', false)
            ->with(['purchaseOrder', 'receiver'])
            ->withCount('items')
            ->orderBy('created_at', 'desc')
            ->get();

        return response()->json($challans);
    }

    /**
     * Display a specific incoming challan with items.
     */
    public function show(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to view incoming challans.'], 403);
        }

        $challan = IncomingChallan::with(['purchaseOrder', 'receiver', 'items.poItem'])->findOrFail($id);
        return response()->json($challan);
    }

    /**
     * Upload and parse a Challan PDF.
     */
    public function parse(Request $request)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to parse challans.'], 403);
        }

        $request->validate([
            'file' => 'required|file|mimes:pdf,png,jpg,jpeg|max:10240', // Limit to 10MB PDF or Image
        ]);

        try {
            $file = $request->file('file');
            
            // Save temporarily to drawings
            if (!Storage::disk('public')->exists('drawings')) {
                Storage::disk('public')->makeDirectory('drawings');
            }

            $fileName = time() . '_challan_' . preg_replace('/[^a-zA-Z0-9_.-]/', '', $file->getClientOriginalName());
            Storage::disk('public')->putFileAs('drawings', $file, $fileName);
            
            $relativeUrl = 'storage/drawings/' . $fileName;

            // Check if file is an image
            $ext = strtolower($file->getClientOriginalExtension());
            if (in_array($ext, ['png', 'jpg', 'jpeg'])) {
                return response()->json([
                    'challan_number' => 'CHALLAN-' . time(),
                    'challan_date' => date('Y-m-d'),
                    'purchase_order_id' => null,
                    'pdf_path' => $relativeUrl,
                    'items' => [],
                    'raw_text' => ''
                ]);
            }

            $absolutePath = storage_path('app/public/drawings/' . $fileName);

            $parser = new ChallanParserService();
            $parsedData = $parser->parse($absolutePath);
            $parsedData['pdf_path'] = $relativeUrl;

            return response()->json($parsedData);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to parse Challan PDF: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Confirm and save an incoming challan, generating shop Job Cards.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to create incoming challans.'], 403);
        }

        $request->validate([
            'challan_number' => 'required|string',
            'challan_date' => 'required|date',
            'purchase_order_id' => 'required|exists:purchase_orders,id',
            'pdf_path' => 'nullable|string',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.po_item_id' => 'required|exists:po_items,id',
            'items.*.quantity_received' => 'required|numeric|min:0.01',
        ]);

        DB::beginTransaction();

        try {
            // 1. Create the Challan record
            $challan = IncomingChallan::create([
                'challan_number' => $request->challan_number,
                'challan_date' => $request->challan_date,
                'purchase_order_id' => $request->purchase_order_id,
                'pdf_path' => $request->pdf_path,
                'received_by' => auth()->id() ?: 1, // Fallback to user ID 1 for testing
                'remarks' => $request->remarks,
            ]);

            // 2. Create challan items & corresponding Job Cards
            foreach ($request->items as $item) {
                $qtyReceived = floatval($item['quantity_received']);

                // Track total received so far against ordered quantity
                $poItem = PoItem::findOrFail($item['po_item_id']);
                $totalReceived = IncomingChallanItem::where('po_item_id', $poItem->id)->sum('quantity_received');
                
                if ($totalReceived + $qtyReceived > $poItem->quantity) {
                    throw new Exception("Received quantity for item '{$poItem->item_code}' exceeds the remaining ordered quantity.");
                }

                // Save Challan item
                $challanItem = IncomingChallanItem::create([
                    'incoming_challan_id' => $challan->id,
                    'po_item_id' => $poItem->id,
                    'quantity_received' => $qtyReceived,
                ]);

                // Generate sequential Job Card Number
                $settingPrefix = \App\Models\Setting::getVal('prefix_job', 'JOB-');
                $lastJob = JobCard::orderBy('id', 'desc')->first();
                $nextNum = 1;
                if ($lastJob) {
                    $parts = explode('-', $lastJob->job_card_number);
                    $lastSeq = (int) end($parts);
                    $nextNum = $lastSeq + 1;
                }
                $jobCardNumber = $settingPrefix . date('Y') . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

                // Create Job Card
                JobCard::create([
                    'job_card_number' => $jobCardNumber,
                    'incoming_challan_item_id' => $challanItem->id,
                    'po_item_id' => $poItem->id,
                    'quantity' => $qtyReceived,
                    'status' => 'pending',
                ]);
            }

            // Check if PO is now fully received (all items received)
            $po = PurchaseOrder::with('items')->findOrFail($request->purchase_order_id);
            $fullyReceived = true;
            foreach ($po->items as $pi) {
                $rec = IncomingChallanItem::where('po_item_id', $pi->id)->sum('quantity_received');
                if ($rec < $pi->quantity) {
                    $fullyReceived = false;
                    break;
                }
            }

            if ($fullyReceived) {
                $po->update(['status' => 'completed']);
            }

            DB::commit();

            return response()->json([
                'message' => 'Material receipt registered successfully. Floor Job Cards generated.',
                'challan' => $challan->load('items')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to save Challan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update an existing incoming challan, syncing items and updating job cards.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to manage incoming challans.'], 403);
        }

        $challan = IncomingChallan::findOrFail($id);

        $request->validate([
            'challan_number' => 'required|string',
            'challan_date' => 'required|date',
            'remarks' => 'nullable|string',
            'items' => 'required|array|min:1',
            'items.*.po_item_id' => 'required|exists:po_items,id',
            'items.*.quantity_received' => 'required|numeric|min:0.01',
        ]);

        DB::beginTransaction();

        try {
            // Update details
            $challan->update([
                'challan_number' => $request->challan_number,
                'challan_date' => $request->challan_date,
                'remarks' => $request->remarks,
            ]);

            $processedItemIds = [];

            foreach ($request->items as $item) {
                $qtyReceived = floatval($item['quantity_received']);
                $poItemId = $item['po_item_id'];
                
                // Track total received so far against ordered quantity (excluding this challan's previous receipt)
                $poItem = PoItem::findOrFail($poItemId);
                $otherReceived = IncomingChallanItem::where('po_item_id', $poItemId)
                    ->where('incoming_challan_id', '!=', $challan->id)
                    ->sum('quantity_received');
                
                if ($otherReceived + $qtyReceived > $poItem->quantity) {
                    throw new Exception("Received quantity for item '{$poItem->item_code}' exceeds the remaining ordered quantity.");
                }

                // Find existing challan item or create it
                $challanItem = IncomingChallanItem::where('incoming_challan_id', $challan->id)
                    ->where('po_item_id', $poItemId)
                    ->first();

                if ($challanItem) {
                    $challanItem->update([
                        'quantity_received' => $qtyReceived,
                    ]);
                    
                    // Sync linked Job Card quantity
                    $jobCard = JobCard::where('incoming_challan_item_id', $challanItem->id)->first();
                    if ($jobCard) {
                        $jobCard->update([
                            'quantity' => $qtyReceived,
                        ]);
                    }
                } else {
                    // Create new challan item
                    $challanItem = IncomingChallanItem::create([
                        'incoming_challan_id' => $challan->id,
                        'po_item_id' => $poItemId,
                        'quantity_received' => $qtyReceived,
                    ]);

                    // Generate sequential Job Card Number
                    $settingPrefix = \App\Models\Setting::getVal('prefix_job', 'JOB-');
                    $lastJob = JobCard::orderBy('id', 'desc')->first();
                    $nextNum = 1;
                    if ($lastJob) {
                        $parts = explode('-', $lastJob->job_card_number);
                        $lastSeq = (int) end($parts);
                        $nextNum = $lastSeq + 1;
                    }
                    $jobCardNumber = $settingPrefix . date('Y') . '-' . str_pad($nextNum, 4, '0', STR_PAD_LEFT);

                    // Create Job Card
                    JobCard::create([
                        'job_card_number' => $jobCardNumber,
                        'incoming_challan_item_id' => $challanItem->id,
                        'po_item_id' => $poItemId,
                        'quantity' => $qtyReceived,
                        'status' => 'pending',
                    ]);
                }

                $processedItemIds[] = $challanItem->id;
            }

            // Remove items that are no longer in the request
            $deletedItems = IncomingChallanItem::where('incoming_challan_id', $challan->id)
                ->whereNotIn('id', $processedItemIds)
                ->get();

            foreach ($deletedItems as $delItem) {
                // Delete linked pending Job Cards
                $jobCard = JobCard::where('incoming_challan_item_id', $delItem->id)->first();
                if ($jobCard) {
                    if ($jobCard->status === 'pending') {
                        $jobCard->forceDelete();
                    } else {
                        // If job card is not pending, just unlink it
                        $jobCard->update(['incoming_challan_item_id' => null]);
                    }
                }
                $delItem->delete();
            }

            // Check if PO is now fully received
            $po = PurchaseOrder::with('items')->findOrFail($challan->purchase_order_id);
            $fullyReceived = true;
            foreach ($po->items as $pi) {
                $rec = IncomingChallanItem::where('po_item_id', $pi->id)->sum('quantity_received');
                if ($rec < $pi->quantity) {
                    $fullyReceived = false;
                    break;
                }
            }

            if ($fullyReceived) {
                $po->update(['status' => 'completed']);
            } else {
                // If it was completed, move back to approved
                if ($po->status === 'completed') {
                    $po->update(['status' => 'approved']);
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Incoming Challan updated successfully.',
                'challan' => $challan->load('items.poItem')
            ]);

        } catch (Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Failed to update Incoming Challan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Archive an incoming challan.
     */
    public function archive(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to archive incoming challans.'], 403);
        }

        $challan = IncomingChallan::findOrFail($id);

        try {
            $challan->update([
                'is_archived' => true,
                'archived_at' => now(),
                'archived_by' => auth()->id() ?: 1,
            ]);

            return response()->json([
                'message' => 'Incoming Challan archived successfully.'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to archive Incoming Challan: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete an incoming challan (soft delete).
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized. You do not have permission to delete incoming challans.'], 403);
        }

        $challan = IncomingChallan::findOrFail($id);

        $request->validate([
            'delete_reason' => 'nullable|string'
        ]);

        try {
            $challan->update([
                'deleted_by' => auth()->id() ?: 1,
                'delete_reason' => $request->delete_reason,
            ]);

            $challan->delete(); // Soft delete

            return response()->json([
                'message' => 'Incoming Challan deleted successfully (soft deleted).'
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to delete Incoming Challan: ' . $e->getMessage()
            ], 500);
        }
    }
}
