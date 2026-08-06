<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Customer;

class CustomerController extends Controller
{
    public function index(Request $request)
    {
        $query = Customer::query();
        
        if ($request->has('search')) {
            $search = $request->search;
            $query->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
        }
        
        return response()->json($query->orderBy('name')->get());
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'gstin' => 'nullable|string|max:50',
            'contact_person' => 'nullable|string|max:255',
            'notes' => 'nullable|string'
        ]);

        $customer = Customer::create($validated);
        return response()->json($customer, 201);
    }

    public function show($id)
    {
        $customer = Customer::with('purchaseOrders')->findOrFail($id);
        return response()->json($customer);
    }

    public function update(Request $request, $id)
    {
        $customer = Customer::findOrFail($id);
        
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'nullable|email|max:255',
            'phone' => 'nullable|string|max:20',
            'address' => 'nullable|string',
            'gstin' => 'nullable|string|max:50',
            'contact_person' => 'nullable|string|max:255',
            'notes' => 'nullable|string'
        ]);

        $customer->update($validated);
        return response()->json($customer);
    }

    public function destroy($id)
    {
        $customer = Customer::findOrFail($id);
        $customer->delete();
        return response()->json(['message' => 'Customer deleted successfully']);
    }

    public function details($id)
    {
        $customer = Customer::with([
            'purchaseOrders.items.jobCards',
            'purchaseOrders.items.deliveryItems',
            'purchaseOrders.invoices',
            'purchaseOrders.deliveryChallans'
        ])->findOrFail($id);

        $totalBilling = 0;
        $runningJobs = 0;
        $completedJobs = 0;
        $pos = [];

        foreach ($customer->purchaseOrders as $po) {
            // Calculate Billing
            foreach ($po->invoices as $invoice) {
                if ($invoice->status !== 'cancelled') {
                    $totalBilling += floatval($invoice->grand_total);
                }
            }

            // Calculate PO specific stats
            $poTotalQty = 0;
            $poCompletedQty = 0;
            $poDeliveredQty = 0;

            foreach ($po->items as $item) {
                $poTotalQty += floatval($item->quantity);
                
                foreach ($item->jobCards as $job) {
                    $qty = floatval($job->quantity);
                    if ($job->status === 'completed') {
                        $completedJobs++;
                        $poCompletedQty += $qty;
                    } elseif (in_array($job->status, ['in_progress', 'pending', 'inspection'])) {
                        $runningJobs++;
                    }
                }

                foreach ($item->deliveryItems as $delItem) {
                    $poDeliveredQty += floatval($delItem->quantity_delivered);
                }
            }

            $pos[] = [
                'id' => $po->id,
                'po_number' => $po->po_number,
                'po_date' => $po->po_date,
                'status' => $po->status,
                'total_qty' => $poTotalQty,
                'completed_qty' => $poCompletedQty,
                'delivered_qty' => $poDeliveredQty,
                'invoices' => $po->invoices,
                'delivery_challans' => $po->deliveryChallans
            ];
        }

        return response()->json([
            'customer' => [
                'id' => $customer->id,
                'name' => $customer->name,
                'email' => $customer->email,
                'phone' => $customer->phone,
                'address' => $customer->address,
                'gstin' => $customer->gstin,
                'contact_person' => $customer->contact_person,
                'notes' => $customer->notes,
                'created_at' => $customer->created_at,
            ],
            'metrics' => [
                'total_pos' => count($pos),
                'total_billing' => $totalBilling,
                'running_jobs' => $runningJobs,
                'completed_jobs' => $completedJobs,
            ],
            'purchase_orders' => collect($pos)->sortByDesc('po_date')->values()->all()
        ]);
    }
}
