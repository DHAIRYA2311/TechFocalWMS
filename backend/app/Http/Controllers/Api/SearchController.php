<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PurchaseOrder;
use App\Models\User;
use App\Models\JobCard;
use App\Models\Machine;
use App\Models\Invoice;
use App\Models\DeliveryChallan;
use Illuminate\Http\Request;

class SearchController extends Controller
{
    /**
     * Perform global search across various models.
     */
    public function search(Request $request)
    {
        $query = $request->query('q');

        if (!$query || strlen(trim($query)) < 2) {
            return response()->json([
                'purchase_orders' => [],
                'users' => [],
                'job_cards' => [],
                'machines' => [],
                'invoices' => [],
                'delivery_challans' => [],
            ]);
        }

        $query = trim($query);

        // 1. Search Purchase Orders (matches po_number or customer_name)
        $pos = PurchaseOrder::where('po_number', 'like', "%{$query}%")
            ->orWhere('customer_name', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'po_number', 'customer_name', 'status']);

        // 2. Search Users (Staff profiles)
        $users = User::where('name', 'like', "%{$query}%")
            ->orWhere('email', 'like', "%{$query}%")
            ->orWhere('phone', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'name', 'email', 'role']);

        // 3. Search Job Cards
        $jobCards = JobCard::where('job_card_number', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'job_card_number', 'status']);

        // 4. Search Machines
        $machines = Machine::where('machine_code', 'like', "%{$query}%")
            ->orWhere('name', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'machine_code', 'name', 'status']);

        // 5. Search Invoices
        $invoices = Invoice::where('invoice_number', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'invoice_number', 'grand_total']);

        // 6. Search Delivery Challans
        $challans = DeliveryChallan::where('challan_number', 'like', "%{$query}%")
            ->limit(5)
            ->get(['id', 'challan_number']);

        return response()->json([
            'purchase_orders' => $pos,
            'users' => $users,
            'job_cards' => $jobCards,
            'machines' => $machines,
            'invoices' => $invoices,
            'delivery_challans' => $challans,
        ]);
    }
}
