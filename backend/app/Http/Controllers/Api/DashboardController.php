<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\JobCard;
use App\Models\Machine;
use App\Models\PurchaseOrder;
use App\Models\Invoice;
use App\Models\User;
use App\Models\Attendance;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;


class DashboardController extends Controller
{
    public function index(Request $request)
    {
        $today = Carbon::today();

        // 1. KPIs
        $attendanceData = DB::table('attendances')
            ->whereDate('date', $today)
            ->where('status', 'present')
            ->count();
        
        $activeJobsCount = JobCard::whereIn('status', ['in_progress', 'inspection'])->count();
        $machinesRunning = Machine::whereIn('status', ['running', 'busy'])->count();
        $delayedJobsCount = JobCard::where('status', 'delayed')->count();

        // Optional KPIs
        $pendingDispatch = JobCard::where('status', 'completed')->count(); // Assuming completed jobs are waiting dispatch

        // 2. Machine Overview
        $machines = Machine::select('id', 'name', 'status')->get();
        $machineBreakdowns = $machines->where('status', 'breakdown');

        // 3. Priority Actions (Requires Attention)
        $requiresAttention = [];

        foreach ($machineBreakdowns as $machine) {
            $requiresAttention[] = [
                'type' => 'machine_breakdown',
                'title' => "Machine Breakdown",
                'message' => "{$machine->name} is down",
                'route' => '/machines'
            ];
        }

        if ($delayedJobsCount > 0) {
            $requiresAttention[] = [
                'type' => 'delayed_jobs',
                'title' => "Delayed Jobs",
                'message' => "{$delayedJobsCount} jobs require attention",
                'route' => '/jobs'
            ];
        }

        $pendingPO = PurchaseOrder::whereNotIn('status', ['completed', 'rejected'])->count();
        if ($pendingPO > 0) {
            $requiresAttention[] = [
                'type' => 'pending_po',
                'title' => "Purchase Orders",
                'message' => "{$pendingPO} POs pending",
                'route' => '/purchase-orders'
            ];
        }

        $pendingInvoices = Invoice::where('status', 'unpaid')->count();
        
        // Quality Inspection Failed (Mock logic: if job is in 'inspection' and has issues. We'll use random for now or skip if not implemented)

        // 4. Workshop Status
        $workshopStatus = 'Workshop Running Normally';
        $statusLevel = 'normal'; // normal, warning, critical

        if ($machineBreakdowns->count() > 0) {
            $workshopStatus = 'Machine Breakdown Detected';
            $statusLevel = 'critical';
        } elseif ($delayedJobsCount > 0) {
            $workshopStatus = 'Production Delayed';
            $statusLevel = 'warning';
        }

        // 5. Production Progress
        $jobsCompletedToday = JobCard::where('status', 'completed')
            ->whereDate('updated_at', $today)->count();
        $totalJobsToday = JobCard::whereIn('status', ['in_progress', 'inspection', 'delayed', 'completed'])
            ->where(function($query) use ($today) {
                $query->whereDate('created_at', $today)
                      ->orWhereDate('updated_at', $today);
            })->count();

        $productionPercentage = $totalJobsToday > 0 ? round(($jobsCompletedToday / $totalJobsToday) * 100) : 0;
        if ($totalJobsToday == 0 && $jobsCompletedToday == 0) {
            $totalJobsToday = JobCard::whereNotIn('status', ['completed'])->count(); // Fallback to all active jobs
            $jobsCompletedToday = 0;
        }

        // 6. Operational Modules Context
        $modulesData = [
            'attendance' => [
                'present' => $attendanceData,
                'absent' => max(0, User::where('role', 'worker')->count() - $attendanceData)
            ],
            'jobs' => [
                'active' => $activeJobsCount,
                'delayed' => $delayedJobsCount
            ],
            'purchase_orders' => [
                'pending' => $pendingPO
            ],
            'invoices' => [
                'pending' => $pendingInvoices
            ]
        ];

        // 7. Real Production Timeline
        $timelineEvents = collect();

        $attendances = Attendance::whereDate('date', $today)->whereNotNull('clock_in')->with('user')->get();
        foreach ($attendances as $att) {
            $timelineEvents->push([
                'time' => Carbon::parse($att->clock_in)->format('H:i'),
                'timestamp' => Carbon::parse($att->clock_in)->timestamp,
                'event' => 'Attendance Marked',
                'description' => ($att->user ? $att->user->name : 'Worker') . ' clocked in'
            ]);
        }

        $pos = PurchaseOrder::whereDate('created_at', $today)->orWhereDate('updated_at', $today)->get();
        foreach ($pos as $po) {
            if (Carbon::parse($po->created_at)->isSameDay($today)) {
                $timelineEvents->push([
                    'time' => Carbon::parse($po->created_at)->format('H:i'),
                    'timestamp' => Carbon::parse($po->created_at)->timestamp,
                    'event' => 'PO Received',
                    'description' => "PO {$po->po_number} received from {$po->customer_name}"
                ]);
            }
        }

        $jobs = JobCard::whereDate('created_at', $today)->orWhereDate('updated_at', $today)->get();
        foreach ($jobs as $job) {
            $time = Carbon::parse($job->updated_at)->isSameDay($today) ? Carbon::parse($job->updated_at) : Carbon::parse($job->created_at);
            
            $eventStr = 'Job Status Updated';
            $descStr = "Job {$job->job_card_number} is now {$job->status}";
            if ($job->status === 'pending') {
                $eventStr = 'Job Created';
                $descStr = "Job {$job->job_card_number} pending allocation";
            } elseif ($job->status === 'completed') {
                $eventStr = 'Job Completed';
                $descStr = "Job {$job->job_card_number} finished";
            } elseif ($job->status === 'allocated') {
                $eventStr = 'Job Allocated';
                $descStr = "Job {$job->job_card_number} assigned to worker";
            } elseif ($job->status === 'in_progress') {
                $eventStr = 'Job Started';
                $descStr = "Machining started for {$job->job_card_number}";
            }

            $timelineEvents->push([
                'time' => $time->format('H:i'),
                'timestamp' => $time->timestamp,
                'event' => $eventStr,
                'description' => $descStr
            ]);
        }

        $invoicesList = Invoice::whereDate('created_at', $today)->get();
        foreach ($invoicesList as $inv) {
            $timelineEvents->push([
                'time' => Carbon::parse($inv->created_at)->format('H:i'),
                'timestamp' => Carbon::parse($inv->created_at)->timestamp,
                'event' => 'Invoice Generated',
                'description' => "Invoice {$inv->invoice_number} generated"
            ]);
        }

        $timeline = $timelineEvents->sortByDesc('timestamp')->values()->all();

        // 8. Weekly Revenue
        $revenueData = [];
        for ($i = 6; $i >= 0; $i--) {
            $date = Carbon::today()->subDays($i);
            $sum = Invoice::whereDate('created_at', $date)->where('status', '!=', 'cancelled')->sum('grand_total');
            $revenueData[] = [
                'name' => $date->shortDayName,
                'revenue' => (float)$sum
            ];
        }

        // 9. Monthly Revenue
        $monthlyRevenue = [];
        for ($i = 0; $i < 6; $i++) {
            $date = Carbon::now()->startOfMonth()->subMonths(5 - $i);
            $sum = Invoice::whereMonth('created_at', $date->month)
                          ->whereYear('created_at', $date->year)
                          ->where('status', '!=', 'cancelled')
                          ->sum('grand_total');
            $monthlyRevenue[] = [
                'month' => $date->shortMonthName,
                'revenue' => (float)$sum
            ];
        }

        // 10. PO Stats (Amount)
        $startOfWeek = Carbon::now()->startOfWeek();
        $startOfMonth = Carbon::now()->startOfMonth();

        $todayPOAmount = DB::table('purchase_orders')
            ->join('po_items', 'purchase_orders.id', '=', 'po_items.purchase_order_id')
            ->whereDate('purchase_orders.created_at', $today)
            ->whereNull('purchase_orders.deleted_at')
            ->sum('po_items.total_amount');

        $weeklyPOAmount = DB::table('purchase_orders')
            ->join('po_items', 'purchase_orders.id', '=', 'po_items.purchase_order_id')
            ->where('purchase_orders.created_at', '>=', $startOfWeek)
            ->whereNull('purchase_orders.deleted_at')
            ->sum('po_items.total_amount');

        $monthlyPOAmount = DB::table('purchase_orders')
            ->join('po_items', 'purchase_orders.id', '=', 'po_items.purchase_order_id')
            ->where('purchase_orders.created_at', '>=', $startOfMonth)
            ->whereNull('purchase_orders.deleted_at')
            ->sum('po_items.total_amount');

        $poStats = [
            'today' => $todayPOAmount,
            'weekly' => $weeklyPOAmount,
            'monthly' => $monthlyPOAmount
        ];

        // 11. Financial KPIs
        $todaysRevenue = Invoice::whereDate('created_at', $today)->where('status', '!=', 'cancelled')->sum('grand_total');
        $monthlyRevenueTotal = Invoice::whereMonth('created_at', $today->month)->whereYear('created_at', $today->year)->where('status', '!=', 'cancelled')->sum('grand_total');
        $outstandingAmount = Invoice::whereIn('status', ['pending', 'unpaid', 'partially_paid'])->sum('grand_total');
        
        $monthlyExpenses = DB::table('expenses')
            ->whereMonth('expense_date', $today->month)
            ->whereYear('expense_date', $today->year)
            ->whereNull('deleted_at')
            ->sum('amount');
            
        $netProfit = $monthlyRevenueTotal - $monthlyExpenses;

        $financial_kpis = [
            'today_revenue' => (float)$todaysRevenue,
            'monthly_revenue' => (float)$monthlyRevenueTotal,
            'outstanding' => (float)$outstandingAmount,
            'monthly_expenses' => (float)$monthlyExpenses,
            'net_profit' => (float)$netProfit,
        ];

        // 12. Customer Stats (from POs)
        $totalOrders = PurchaseOrder::whereNull('deleted_at')->count();
        $completedOrders = PurchaseOrder::whereNull('deleted_at')->whereIn('status', ['completed', 'delivered'])->count();
        $pendingOrders = PurchaseOrder::whereNull('deleted_at')->where('status', 'pending')->count();
        $newCustomers = PurchaseOrder::whereNull('deleted_at')
            ->whereMonth('created_at', $today->month)
            ->whereYear('created_at', $today->year)
            ->distinct('customer_name')
            ->count('customer_name');

        $customer_stats = [
            'total_orders' => $totalOrders,
            'completed' => $completedOrders,
            'pending' => $pendingOrders,
            'new_customers' => $newCustomers
        ];

        return response()->json([
            'kpis' => [
                'workers_present' => $attendanceData,
                'machines_running' => $machinesRunning,
                'active_jobs' => $activeJobsCount,
                'delayed_jobs' => $delayedJobsCount,
                'pending_dispatch' => $pendingDispatch
            ],
            'workshop_status' => [
                'title' => $workshopStatus,
                'level' => $statusLevel,
                'shift' => 'Morning Shift'
            ],
            'priority_actions' => $requiresAttention,
            'production_progress' => [
                'completed' => $jobsCompletedToday,
                'remaining' => $totalJobsToday - $jobsCompletedToday,
                'total' => $totalJobsToday,
                'percentage' => $productionPercentage
            ],
            'modules_data' => $modulesData,
            'machines' => $machines,
            'timeline' => $timeline,
            'revenue_chart' => $revenueData,
            'monthly_revenue' => $monthlyRevenue,
            'po_stats' => $poStats,
            'financial_kpis' => $financial_kpis,
            'customer_stats' => $customer_stats
        ]);
    }
}
