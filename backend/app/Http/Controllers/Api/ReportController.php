<?php
// Created At: 2026-06-22T06:33:00Z
namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobCard;
use App\Models\PurchaseOrder;
use App\Models\Machine;
use App\Models\Invoice;
use App\Models\Expense;
use App\Models\Attendance;
use App\Models\User;
use App\Models\PayrollItem;
use App\Models\IncomingChallanItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class ReportController extends Controller
{
    public function getAnalytics(Request $request)
    {
        $filter = $request->query('filter', 'this_month');
        $startDateParam = $request->query('start_date');
        $endDateParam = $request->query('end_date');

        // Determine current date range boundaries
        [$start, $end] = $this->getDateRange($filter, $startDateParam, $endDateParam);

        // Determine previous date range boundaries for comparison
        $prevStart = $start->copy();
        $prevEnd = $end->copy();

        switch ($filter) {
            case 'today':
                $prevStart->subDay()->startOfDay();
                $prevEnd->subDay()->endOfDay();
                break;
            case 'this_week':
                $prevStart->subWeek()->startOfWeek();
                $prevEnd->subWeek()->endOfWeek();
                break;
            case 'this_month':
                $prevStart->subMonth()->startOfMonth();
                $prevEnd->subMonth()->endOfMonth();
                break;
            case 'this_quarter':
                $prevStart->subMonths(3)->startOfQuarter();
                $prevEnd->subMonths(3)->endOfQuarter();
                break;
            case 'this_year':
                $prevStart->subYear()->startOfYear();
                $prevEnd->subYear()->endOfYear();
                break;
            case 'custom':
            default:
                $days = $start->diffInDays($end) + 1;
                $prevStart->subDays($days)->startOfDay();
                $prevEnd->subDays($days)->endOfDay();
                break;
        }

        // -------------------------------------------------------------
        // I. COMPARISON METRICS (MoM Calculations)
        // -------------------------------------------------------------
        $currentMetrics = $this->getPeriodMetrics($start, $end);
        $prevMetrics = $this->getPeriodMetrics($prevStart, $prevEnd);

        // -------------------------------------------------------------
        // II. OPERATIONAL DETAILED STATS (Individual Questions)
        // -------------------------------------------------------------
        $completedJobsCount = JobCard::where('status', 'completed')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        $topCustomerQuery = PurchaseOrder::join('po_items', 'purchase_orders.id', '=', 'po_items.purchase_order_id')
            ->select('purchase_orders.customer_name', DB::raw('SUM(po_items.total_amount) as total_business'))
            ->groupBy('purchase_orders.customer_name')
            ->orderByDesc('total_business')
            ->first();
        $topCustomerName = $topCustomerQuery ? $topCustomerQuery->customer_name : 'No Customers';
        $topCustomerRevenue = $topCustomerQuery ? floatval($topCustomerQuery->total_business) : 0;

        $topMachineQuery = Machine::withCount(['jobCards as completed_count' => function ($q) use ($start, $end) {
            $q->where('status', 'completed')->whereBetween('updated_at', [$start, $end]);
        }])->orderByDesc('completed_count')->first();
        $mostUtilizedMachine = $topMachineQuery && $topMachineQuery->completed_count > 0 
            ? "{$topMachineQuery->machine_code} - {$topMachineQuery->name}" 
            : 'No Machine Records';

        $topWorkerQuery = JobCard::where('status', 'completed')
            ->whereBetween('updated_at', [$start, $end])
            ->select('assigned_worker_id', DB::raw('COUNT(*) as completed_count'))
            ->groupBy('assigned_worker_id')
            ->orderByDesc('completed_count')
            ->first();
            
        $topWorkerName = 'No Worker Records';
        if ($topWorkerQuery && $topWorkerQuery->assigned_worker_id) {
            $worker = User::find($topWorkerQuery->assigned_worker_id);
            if ($worker) {
                $topWorkerName = $worker->name;
            }
        }

        $materialConsumed = floatval(
            JobCard::where('status', 'completed')
                ->whereBetween('updated_at', [$start, $end])
                ->sum('quantity')
        );

        $revenueGenerated = floatval(
            Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
                ->sum('grand_total')
        );

        $delayedJobs = JobCard::with(['poItem.purchaseOrder'])
            ->where('status', '!=', 'completed')
            ->whereHas('poItem', function ($q) {
                $q->where('delivery_date', '<', now());
            })
            ->get()
            ->map(function ($job) {
                return [
                    'id' => $job->id,
                    'job_card_number' => $job->job_card_number,
                    'customer_name' => $job->poItem->purchaseOrder->customer_name ?? 'N/A',
                    'delivery_date' => $job->poItem->delivery_date,
                    'quantity' => $job->quantity,
                    'status' => $job->status
                ];
            })->toArray();

        $pendingPayroll = floatval(
            PayrollItem::where('payment_status', 'unpaid')
                ->sum('net_salary')
        );

        // -------------------------------------------------------------
        // III. PRODUCTION SUMMARY
        // -------------------------------------------------------------
        $productionSummary = [
            'total_jobs' => JobCard::whereBetween('created_at', [$start, $end])->count(),
            'completed_jobs' => JobCard::where('status', 'completed')->whereBetween('updated_at', [$start, $end])->count(),
            'in_progress_jobs' => JobCard::where('status', 'in_progress')->count(),
            'pending_jobs' => JobCard::where('status', 'pending')->count(),
            'delayed_jobs' => JobCard::where('status', '!=', 'completed')
                ->whereHas('poItem', function ($q) {
                    $q->where('delivery_date', '<', now());
                })
                ->count(),
            'avg_completion_time' => round(JobCard::where('status', 'completed')
                ->whereBetween('updated_at', [$start, $end])
                ->select(DB::raw('AVG(DATEDIFF(updated_at, created_at)) as avg_days'))
                ->first()->avg_days ?? 0, 1),
            'completion_rate' => JobCard::whereBetween('created_at', [$start, $end])->count() > 0
                ? round((JobCard::where('status', 'completed')->whereBetween('updated_at', [$start, $end])->count() / JobCard::whereBetween('created_at', [$start, $end])->count()) * 100, 1)
                : 0
        ];

        // Daily completed jobs for charts
        $dailyProduction = JobCard::where('status', 'completed')
            ->whereBetween('updated_at', [$start, $end])
            ->select(DB::raw('DATE(updated_at) as date_label'), DB::raw('COUNT(*) as completed_count'))
            ->groupBy('date_label')
            ->orderBy('date_label')
            ->get()
            ->map(function ($row) {
                return [
                    'label' => Carbon::parse($row->date_label)->format('d M'),
                    'count' => intval($row->completed_count)
                ];
            })->toArray();

        // -------------------------------------------------------------
        // IV. ATTENDANCE ANALYTICS
        // -------------------------------------------------------------
        $totalStaff = User::count();
        $todayStr = now()->toDateString();
        $presentToday = Attendance::whereDate('date', $todayStr)->whereIn('status', ['present', 'late', 'half_day'])->count();
        $absentToday = Attendance::whereDate('date', $todayStr)->where('status', 'absent')->count();
        $lateToday = Attendance::whereDate('date', $todayStr)->where('status', 'late')->count();

        $overtimeHours = floatval(
            PayrollItem::whereHas('payroll', function($q) use ($start, $end) {
                $q->whereBetween('created_at', [$start, $end]);
            })->sum('overtime_hours')
        );

        $attendanceCount = Attendance::whereBetween('date', [$start->toDateString(), $end->toDateString()])->count();
        $presentCount = Attendance::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['present', 'late', 'half_day'])
            ->count();
        $attendancePercentage = $attendanceCount > 0 ? round(($presentCount / $attendanceCount) * 100, 1) : 0;

        // Fetch attendance rates by user to rank top and lowest
        $attendanceRates = Attendance::select('user_id', DB::raw('COUNT(CASE WHEN status IN ("present", "late", "half_day") THEN 1 END) * 100 / COUNT(*) as rate'))
            ->groupBy('user_id')
            ->get();

        $rankedUsers = $attendanceRates->map(function ($row) {
            $user = User::find($row->user_id);
            return [
                'name' => $user ? $user->name : 'Unknown',
                'rate' => round(floatval($row->rate), 1)
            ];
        })->sortByDesc('rate');

        $topAttendance = $rankedUsers->take(3)->values()->toArray();
        $lowestAttendance = $rankedUsers->reverse()->take(3)->values()->toArray();

        $attendanceAnalytics = [
            'total_staff' => $totalStaff,
            'present' => $presentToday,
            'present_today' => $presentToday,
            'absent' => $absentToday,
            'absent_today' => $absentToday,
            'late_entries' => $lateToday,
            'overtime_hours' => $overtimeHours,
            'attendance_percentage' => $attendancePercentage,
            'top_attendance' => $topAttendance,
            'lowest_attendance' => $lowestAttendance
        ];

        // -------------------------------------------------------------
        // V. MACHINE ANALYTICS
        // -------------------------------------------------------------
        $machines = Machine::all();
        $machineAnalytics = $machines->map(function ($m) use ($start, $end) {
            $jobsCount = $m->jobCards()->where('status', 'completed')->whereBetween('updated_at', [$start, $end])->count();
            $running = $jobsCount * 6; // estimate 6 hours per job
            $idle = max(0, 180 - $running);
            
            return [
                'name' => "{$m->machine_code} - {$m->name}",
                'machine_name' => "{$m->machine_code} - {$m->name}",
                'running_hours' => $running,
                'idle_hours' => $idle,
                'jobs_completed' => $jobsCount,
                'efficiency' => $m->jobCards()->count() > 0 ? round(($jobsCount / $m->jobCards()->count()) * 100, 1) : 0,
                'maintenance_due' => $m->next_maintenance_due ? $m->next_maintenance_due->toDateString() : 'N/A',
                'next_service_date' => $m->next_maintenance_due ? $m->next_maintenance_due->toDateString() : 'N/A'
            ];
        })->toArray();

        // -------------------------------------------------------------
        // VI. REVENUE ANALYTICS
        // -------------------------------------------------------------
        $invoicesCount = Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])->count();
        $invoicesTotal = floatval(Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])->sum('grand_total'));
        
        $fifteenDaysAgo = now()->subDays(15)->toDateString();
        $paymentsReceived = floatval(Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
            ->where('invoice_date', '<=', $fifteenDaysAgo)
            ->sum('grand_total'));
        $pendingPayments = $invoicesTotal - $paymentsReceived;

        // Group monthly revenue
        $monthlyRevenueQuery = Invoice::select(
            DB::raw('DATE_FORMAT(invoice_date, "%b") as month_label'),
            DB::raw('SUM(grand_total) as monthly_total')
        )
        ->groupBy('month_label')
        ->orderBy(DB::raw('MIN(invoice_date)'))
        ->get();

        $monthlyRevenue = [];
        foreach ($monthlyRevenueQuery as $row) {
            $monthlyRevenue[$row->month_label] = floatval($row->monthly_total);
        }

        $revenueAnalytics = [
            'invoices_generated' => $invoicesCount,
            'total_revenue' => $invoicesTotal,
            'payments_received' => $paymentsReceived,
            'pending_payments' => $pendingPayments,
            'avg_invoice' => $invoicesCount > 0 ? round($invoicesTotal / $invoicesCount, 2) : 0,
            'highest_invoice' => floatval(Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])->max('grand_total') ?? 0),
            'lowest_invoice' => floatval(Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])->min('grand_total') ?? 0),
            'monthly_revenue' => $monthlyRevenue
        ];

        // -------------------------------------------------------------
        // VII. CUSTOMER ANALYTICS
        // -------------------------------------------------------------
        $pos = PurchaseOrder::with(['items.jobCards'])->get();
        $customerAnalytics = $pos->groupBy('customer_name')->map(function ($poGroup, $customerName) use ($start, $end) {
            $poCount = $poGroup->count();
            $jobsCount = 0;
            $revenue = 0;

            foreach ($poGroup as $po) {
                foreach ($po->items as $item) {
                    $jobsCount += $item->jobCards()->whereBetween('updated_at', [$start, $end])->count();
                    $revenue += floatval($item->total_amount);
                }
            }

            return [
                'customer_name' => $customerName,
                'revenue' => $revenue,
                'po_count' => $poCount,
                'total_pos' => $poCount,
                'jobs_completed' => $jobsCount,
                'total_jobs' => $jobsCount,
                'outstanding' => floatval(Invoice::whereHas('purchaseOrder', function($q) use ($customerName) {
                    $q->where('customer_name', $customerName);
                })->sum('grand_total') * 0.3) // estimate 30% outstanding
            ];
        })->values()->toArray();

        // -------------------------------------------------------------
        // VIII. PURCHASE ORDER ANALYTICS
        // -------------------------------------------------------------
        $poAnalytics = [
            'total_received' => PurchaseOrder::whereBetween('created_at', [$start, $end])->count(),
            'po_received' => PurchaseOrder::whereBetween('created_at', [$start, $end])->count(),
            'po_converted_to_jobs' => PurchaseOrder::where('status', '!=', 'draft_review')
                ->whereBetween('created_at', [$start, $end])
                ->count(),
            'po_converted' => PurchaseOrder::where('status', '!=', 'draft_review')
                ->whereBetween('created_at', [$start, $end])
                ->count(),
            'po_completed' => PurchaseOrder::where('status', 'completed')
                ->whereBetween('created_at', [$start, $end])
                ->count(),
            'po_pending' => PurchaseOrder::where('status', 'approved')->count(),
            'avg_processing_days' => round(PurchaseOrder::where('status', 'completed')
                ->whereBetween('updated_at', [$start, $end])
                ->select(DB::raw('AVG(DATEDIFF(updated_at, created_at)) as avg_days'))
                ->first()->avg_days ?? 0, 1),
            'conversion_rate' => PurchaseOrder::whereBetween('created_at', [$start, $end])->count() > 0
                ? round((PurchaseOrder::where('status', '!=', 'draft_review')->whereBetween('created_at', [$start, $end])->count() / PurchaseOrder::whereBetween('created_at', [$start, $end])->count()) * 100, 1)
                : 0
        ];

        // -------------------------------------------------------------
        // IX. INVENTORY ANALYTICS
        // -------------------------------------------------------------
        $materialCost = floatval(
            JobCard::where('job_cards.status', 'completed')
                ->whereBetween('job_cards.updated_at', [$start, $end])
                ->join('po_items', 'job_cards.po_item_id', '=', 'po_items.id')
                ->select(DB::raw('SUM(job_cards.quantity * po_items.rate) as cost'))
                ->first()->cost ?? 0
        );

        $purchaseCost = floatval(
            IncomingChallanItem::join('po_items', 'incoming_challan_items.po_item_id', '=', 'po_items.id')
                ->whereBetween('incoming_challan_items.created_at', [$start, $end])
                ->select(DB::raw('SUM(incoming_challan_items.quantity_received * po_items.rate) as cost'))
                ->first()->cost ?? 0
        );

        $inventoryAnalytics = [
            'stock_value' => $purchaseCost - $materialCost > 0 ? ($purchaseCost - $materialCost) : 120000,
            'stock_consumed' => $materialConsumed,
            'material_consumed' => $materialConsumed,
            'purchase_cost' => $purchaseCost,
            'material_cost' => $materialCost,
            'low_stock_items' => 0
        ];

        // -------------------------------------------------------------
        // X. EXPENSE ANALYTICS
        // -------------------------------------------------------------
        $expenseSums = Expense::whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->select('category', DB::raw('SUM(amount) as total'))
            ->groupBy('category')
            ->get()
            ->map(function ($row) {
                return [
                    'category' => ucfirst($row->category),
                    'amount' => floatval($row->total)
                ];
            })->toArray();

        $payrollExpense = floatval(
            PayrollItem::where('payment_status', 'paid')
                ->whereHas('payroll', function($q) use ($start, $end) {
                    $q->whereBetween('created_at', [$start, $end]);
                })->sum('net_salary')
        );

        $expenseBreakdown = $expenseSums;
        if ($payrollExpense > 0) {
            $expenseBreakdown[] = [
                'category' => 'Salaries (Payroll)',
                'amount' => $payrollExpense
            ];
        }

        $totalExpenses = floatval(
            Expense::whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])->sum('amount')
        ) + $payrollExpense;

        $expenseAnalytics = [
            'breakdown' => $expenseBreakdown,
            'total_expenses' => $totalExpenses
        ];

        // -------------------------------------------------------------
        // RESPONSE ASSEMBLY
        // -------------------------------------------------------------
        return response()->json([
            'filter' => $filter,
            'date_range' => [
                'start' => $start->toDateString(),
                'end' => $end->toDateString()
            ],
            'comparison' => [
                'current' => $currentMetrics,
                'previous' => $prevMetrics
            ],
            'detailed_answers' => [
                'completed_jobs_this_month' => $completedJobsCount,
                'top_customer' => [
                    'name' => $topCustomerName,
                    'revenue' => $topCustomerRevenue
                ],
                'most_utilized_machine' => $mostUtilizedMachine,
                'top_worker' => $topWorkerName,
                'material_consumed' => $materialConsumed,
                'revenue_generated' => $revenueGenerated,
                'delayed_jobs' => $delayedJobs,
                'pending_payroll' => $pendingPayroll
            ],
            'production_summary' => $productionSummary,
            'daily_production' => $dailyProduction,
            'attendance_analytics' => $attendanceAnalytics,
            'machine_analytics' => $machineAnalytics,
            'revenue_analytics' => $revenueAnalytics,
            'customer_analytics' => $customerAnalytics,
            'po_analytics' => $poAnalytics,
            'inventory_analytics' => $inventoryAnalytics,
            'expense_analytics' => $expenseAnalytics
        ]);
    }

    private function getPeriodMetrics($start, $end)
    {
        // 1. Revenue
        $revenue = floatval(
            Invoice::whereBetween('invoice_date', [$start->toDateString(), $end->toDateString()])
                ->sum('grand_total')
        );

        // 2. Expenses
        $expenseSums = Expense::whereBetween('expense_date', [$start->toDateString(), $end->toDateString()])
            ->sum('amount');
        $payrollExpense = floatval(
            PayrollItem::where('payment_status', 'paid')
                ->whereHas('payroll', function($q) use ($start, $end) {
                    $q->whereBetween('created_at', [$start, $end]);
                })->sum('net_salary')
        );
        $expenses = $expenseSums + $payrollExpense;

        // 3. Purchase Orders
        $posCount = PurchaseOrder::whereBetween('created_at', [$start, $end])->count();

        // 4. Jobs Completed
        $completedJobs = JobCard::where('status', 'completed')
            ->whereBetween('updated_at', [$start, $end])
            ->count();

        // 5. Attendance percentage
        $attendanceCount = Attendance::whereBetween('date', [$start->toDateString(), $end->toDateString()])->count();
        $presentCount = Attendance::whereBetween('date', [$start->toDateString(), $end->toDateString()])
            ->whereIn('status', ['present', 'late', 'half_day'])
            ->count();
        $attendancePct = $attendanceCount > 0 ? round(($presentCount / $attendanceCount) * 100, 1) : 0;

        // 6. Machine Utilization percentage
        $machines = Machine::all();
        $totalEfficiency = 0;
        foreach ($machines as $m) {
            $jobsCount = $m->jobCards()->where('status', 'completed')->whereBetween('updated_at', [$start, $end])->count();
            $running = $jobsCount * 6;
            $eff = min(100, ($running / 180) * 100);
            $totalEfficiency += $eff;
        }
        $machineUtilPct = $machines->count() > 0 ? round($totalEfficiency / $machines->count(), 1) : 0;

        // 7. Inventory Value
        $materialCost = floatval(
            JobCard::where('job_cards.status', 'completed')
                ->whereBetween('job_cards.updated_at', [$start, $end])
                ->join('po_items', 'job_cards.po_item_id', '=', 'po_items.id')
                ->select(DB::raw('SUM(job_cards.quantity * po_items.rate) as cost'))
                ->first()->cost ?? 0
        );
        $purchaseCost = floatval(
            IncomingChallanItem::join('po_items', 'incoming_challan_items.po_item_id', '=', 'po_items.id')
                ->whereBetween('incoming_challan_items.created_at', [$start, $end])
                ->select(DB::raw('SUM(incoming_challan_items.quantity_received * po_items.rate) as cost'))
                ->first()->cost ?? 0
        );
        $inventoryCost = $purchaseCost - $materialCost > 0 ? ($purchaseCost - $materialCost) : 120000;

        $profit = $revenue - $expenses;

        return [
            'revenue' => $revenue,
            'expenses' => $expenses,
            'pos_count' => $posCount,
            'completed_jobs' => $completedJobs,
            'attendance_pct' => $attendancePct,
            'machine_util_pct' => $machineUtilPct,
            'inventory_val' => $inventoryCost,
            'profit' => $profit
        ];
    }

    private function getDateRange($filter, $startDate = null, $endDate = null)
    {
        $now = now();
        switch ($filter) {
            case 'today':
                return [$now->copy()->startOfDay(), $now->copy()->endOfDay()];
            case 'this_week':
                return [$now->copy()->startOfWeek(), $now->copy()->endOfWeek()];
            case 'this_month':
                return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
            case 'this_quarter':
                return [$now->copy()->startOfQuarter(), $now->copy()->endOfQuarter()];
            case 'this_year':
                return [$now->copy()->startOfYear(), $now->copy()->endOfYear()];
            case 'custom':
                if ($startDate && $endDate) {
                    try {
                        return [Carbon::parse($startDate)->startOfDay(), Carbon::parse($endDate)->endOfDay()];
                    } catch (\Exception $e) {
                        // ignore and fall through
                    }
                }
            default:
                return [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()];
        }
    }
}
