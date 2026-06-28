<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Expense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;

class ExpenseController extends Controller
{
    /**
     * Display a listing of expenses with analytical stats.
     */
    public function index(Request $request)
    {
        $query = Expense::with('loggedBy:id,name');

        // Apply filters
        if ($request->filled('category')) {
            $query->where('category', $request->category);
        }
        if ($request->filled('payment_mode')) {
            $query->where('payment_mode', $request->payment_mode);
        }
        if ($request->filled('start_date')) {
            $query->where('expense_date', '>=', $request->start_date);
        }
        if ($request->filled('end_date')) {
            $query->where('expense_date', '<=', $request->end_date);
        }
        if ($request->filled('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                  ->orWhere('reference_number', 'like', "%{$search}%");
            });
        }

        // Fetch paginated or all expenses
        $expenses = $query->orderBy('expense_date', 'desc')
                          ->orderBy('id', 'desc')
                          ->get();

        // Calculate Analytics (overall and current month)
        $startOfMonth = now()->startOfMonth()->toDateString();
        $endOfMonth = now()->endOfMonth()->toDateString();

        $totalOverall = Expense::sum('amount');
        $totalThisMonth = Expense::whereBetween('expense_date', [$startOfMonth, $endOfMonth])->sum('amount');

        // Category breakdown (for charts)
        $categoryBreakdown = Expense::groupBy('category')
            ->selectRaw('category, sum(amount) as total')
            ->orderBy('total', 'desc')
            ->get()
            ->pluck('total', 'category');

        // Payment mode breakdown
        $paymentModeBreakdown = Expense::groupBy('payment_mode')
            ->selectRaw('payment_mode, sum(amount) as total')
            ->get()
            ->pluck('total', 'payment_mode');

        return response()->json([
            'expenses' => $expenses,
            'stats' => [
                'total_overall' => (float) $totalOverall,
                'total_this_month' => (float) $totalThisMonth,
                'category_breakdown' => $categoryBreakdown,
                'payment_mode_breakdown' => $paymentModeBreakdown,
            ]
        ]);
    }

    /**
     * Store a newly created expense in database.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized. Only partners, administrators, or managers can log expenses.'], 403);
        }

        $request->validate([
            'expense_date' => 'required|date',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode' => 'required|string|in:cash,upi_bank,cheque,card',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
        ]);

        $receiptPath = null;
        if ($request->hasFile('receipt')) {
            $file = $request->file('receipt');
            $filename = time() . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', $file->getClientOriginalName());
            
            // Create directory if not exists
            if (!File::isDirectory(public_path('receipts'))) {
                File::makeDirectory(public_path('receipts'), 0755, true, true);
            }

            $file->move(public_path('receipts'), $filename);
            $receiptPath = 'receipts/' . $filename;
        }

        $expense = Expense::create([
            'expense_date' => $request->expense_date,
            'category' => $request->category,
            'amount' => $request->amount,
            'payment_mode' => $request->payment_mode,
            'description' => $request->description,
            'reference_number' => $request->reference_number,
            'receipt_path' => $receiptPath,
            'logged_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Expense logged successfully.',
            'expense' => $expense->load('loggedBy:id,name')
        ], 201);
    }

    /**
     * Update an existing expense in database.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized. Only partners, administrators, or managers can edit expenses.'], 403);
        }

        $expense = Expense::find($id);
        if (!$expense) {
            return response()->json(['message' => 'Expense record not found.'], 404);
        }

        $request->validate([
            'expense_date' => 'required|date',
            'category' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0.01',
            'payment_mode' => 'required|string|in:cash,upi_bank,cheque,card',
            'description' => 'nullable|string',
            'reference_number' => 'nullable|string|max:255',
            'receipt' => 'nullable|file|mimes:jpeg,png,jpg,pdf|max:5120',
        ]);

        if ($request->hasFile('receipt')) {
            // Delete old file
            if ($expense->receipt_path && File::exists(public_path($expense->receipt_path))) {
                File::delete(public_path($expense->receipt_path));
            }

            $file = $request->file('receipt');
            $filename = time() . '_' . preg_replace('/[^A-Za-z0-9._-]/', '_', $file->getClientOriginalName());

            // Create directory if not exists
            if (!File::isDirectory(public_path('receipts'))) {
                File::makeDirectory(public_path('receipts'), 0755, true, true);
            }

            $file->move(public_path('receipts'), $filename);
            $expense->receipt_path = 'receipts/' . $filename;
        }

        $expense->expense_date = $request->expense_date;
        $expense->category = $request->category;
        $expense->amount = $request->amount;
        $expense->payment_mode = $request->payment_mode;
        $expense->description = $request->description;
        $expense->reference_number = $request->reference_number;
        $expense->save();

        return response()->json([
            'message' => 'Expense updated successfully.',
            'expense' => $expense->load('loggedBy:id,name')
        ]);
    }

    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission('finance')) {
            return response()->json(['message' => 'Unauthorized. Only partners, administrators, or managers can void expenses.'], 403);
        }

        $request->validate([
            'delete_reason' => 'required|string|max:1000'
        ]);

        $expense = Expense::findOrFail($id);

        $expense->update([
            'deleted_by' => $request->user()->id,
            'delete_reason' => $request->delete_reason
        ]);

        $expense->delete(); // Laravel soft delete

        return response()->json([
            'message' => 'Expense record voided successfully.'
        ]);
    }
}
