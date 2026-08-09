<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\InventoryItem;
use App\Models\JobCard;
use App\Models\InventoryConsumption;

class InventoryController extends Controller
{
    public function index()
    {
        $items = InventoryItem::orderBy('name')->get();
        return response()->json($items);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'sku' => 'required|string|unique:inventory_items,sku',
            'name' => 'required|string|max:255',
            'category' => 'required|string',
            'stock' => 'required|numeric|min:0',
            'unit' => 'required|string',
            'reorder_level' => 'required|numeric|min:0',
            'location' => 'nullable|string',
        ]);

        $item = InventoryItem::create($validated);
        return response()->json(['message' => 'Inventory item created successfully', 'item' => $item], 201);
    }

    public function destroy($id)
    {
        $item = InventoryItem::findOrFail($id);
        $item->delete();
        
        return response()->json(['message' => 'Inventory item deleted successfully']);
    }

    public function restock(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|numeric|min:0.01',
        ]);

        $item = InventoryItem::findOrFail($id);
        $item->stock += $request->quantity;
        $item->save();

        return response()->json([
            'message' => 'Stock added successfully',
            'item' => $item
        ]);
    }

    public function consume(Request $request, $jobId)
    {
        $request->validate([
            'inventory_item_id' => 'required|exists:inventory_items,id',
            'quantity' => 'required|numeric|min:0.01',
        ]);

        $job = JobCard::findOrFail($jobId);
        $item = InventoryItem::findOrFail($request->inventory_item_id);

        if ($item->stock < $request->quantity) {
            return response()->json(['message' => 'Insufficient stock in inventory.'], 400);
        }

        // Deduct stock
        $item->stock -= $request->quantity;
        $item->save();

        // Record consumption
        $consumption = InventoryConsumption::create([
            'job_card_id' => $job->id,
            'inventory_item_id' => $item->id,
            'quantity' => $request->quantity,
            'consumed_by' => $request->user()->id ?? null,
        ]);

        return response()->json([
            'message' => 'Material consumed successfully',
            'consumption' => $consumption->load('inventoryItem', 'consumer'),
        ]);
    }

    public function getJobConsumptions($jobId)
    {
        $job = JobCard::findOrFail($jobId);
        $consumptions = $job->consumptions()->with('inventoryItem', 'consumer')->orderBy('created_at', 'desc')->get();
        return response()->json($consumptions);
    }
}
