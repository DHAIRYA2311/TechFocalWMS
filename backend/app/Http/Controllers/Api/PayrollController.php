<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Models\Attendance;
use App\Models\SalaryAdvance;
use App\Models\Payroll;
use App\Models\PayrollItem;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class PayrollController extends Controller
{
    /**
     * Get overall payroll statistics.
     */
    public function stats(Request $request)
    {
        $currentMonth = Carbon::now()->month;
        $currentYear = Carbon::now()->year;

        $totalPendingAdvances = SalaryAdvance::where('status', 'pending')->sum('amount');
        
        $totalPaidThisMonth = PayrollItem::where('payment_status', 'paid')
            ->whereMonth('paid_at', $currentMonth)
            ->whereYear('paid_at', $currentYear)
            ->sum('net_salary');

        $lastRun = Payroll::orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->first();

        return response()->json([
            'total_pending_advances' => $totalPendingAdvances,
            'total_paid_this_month' => $totalPaidThisMonth,
            'last_run_month' => $lastRun ? $lastRun->month : null,
            'last_run_year' => $lastRun ? $lastRun->year : null,
            'last_run_status' => $lastRun ? $lastRun->status : null,
        ]);
    }

    /**
     * Get list of historical payroll runs.
     */
    public function index(Request $request)
    {
        $payrolls = Payroll::with(['processor:id,name'])
            ->orderBy('year', 'desc')
            ->orderBy('month', 'desc')
            ->get()
            ->map(function ($p) {
                // Attach summary stats of items
                $p->total_staff = PayrollItem::where('payroll_id', $p->id)->count();
                $p->total_net_payout = PayrollItem::where('payroll_id', $p->id)->sum('net_salary');
                $p->total_unpaid = PayrollItem::where('payroll_id', $p->id)->where('payment_status', 'unpaid')->count();
                return $p;
            });

        return response()->json($payrolls);
    }

    /**
     * Get items of a specific payroll run.
     */
    public function show(Request $request, $id)
    {
        $payroll = Payroll::with(['processor:id,name'])->findOrFail($id);
        
        $items = PayrollItem::where('payroll_id', $id)
            ->with('user:id,name,role,email')
            ->get();

        return response()->json([
            'payroll' => $payroll,
            'items' => $items
        ]);
    }

    /**
     * Calculate draft payroll items for a month/year.
     */
    public function calculate(Request $request)
    {
        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020|max:2050',
        ]);

        $month = $request->month;
        $year = $request->year;

        // Check if payroll already exists for this period
        $exists = Payroll::where('month', $month)->where('year', $year)->first();
        if ($exists) {
            return response()->json([
                'message' => "Payroll for {$month}/{$year} has already been processed.",
                'payroll_id' => $exists->id
            ], 422);
        }

        // Fetch eligible staff: manager, supervisor, helper, worker
        $users = User::whereIn('role', ['manager', 'supervisor', 'helper', 'worker'])
            ->where('status', 'active')
            ->orderBy('name', 'asc')
            ->get();

        $calculatedItems = $users->map(function ($user) use ($month, $year) {
            $baseSalary = $user->salary ?: 0.00;

            // 1. Fetch attendance records
            $attendances = Attendance::where('user_id', $user->id)
                ->whereMonth('date', $month)
                ->whereYear('date', $year)
                ->get();

            $daysPresent = $attendances->whereIn('status', ['present', 'late'])->count();
            $daysAbsent = $attendances->where('status', 'absent')->count();
            $daysHalfDay = $attendances->where('status', 'half_day')->count();
            $daysLeave = $attendances->where('status', 'leave')->count();

            // Daily rate based on standard 26 working days
            $dailyRate = $baseSalary > 0 ? ($baseSalary / 26) : 0;
            $unpaidDays = $daysAbsent + (0.5 * $daysHalfDay);
            
            // Limit attendance deductions to maximum base salary
            $attendanceDeductions = round(max(0, min($baseSalary, $unpaidDays * $dailyRate)), 2);
            $grossSalary = round(max(0, $baseSalary - $attendanceDeductions), 2);

            // 2. Overtime calculation (working hours > shift hours count as OT, paid at 1.5x hourly rate)
            $overtimeHours = 0;
            $clockedAttendances = $attendances->whereNotNull('clock_in')->whereNotNull('clock_out');

            foreach ($clockedAttendances as $att) {
                try {
                    $in = Carbon::parse($att->clock_in);
                    $out = Carbon::parse($att->clock_out);
                    $workedHours = abs($out->diffInMinutes($in) / 60);
                    
                    $shiftKey = $att->shift === 'night' ? 'att_night_working_hours' : 'att_day_working_hours';
                    $requiredHours = (float) \App\Models\Setting::getVal($shiftKey, 8.0);
                    
                    if ($workedHours > $requiredHours) {
                        $overtimeHours += ($workedHours - $requiredHours);
                    }
                } catch (\Exception $e) {
                    // Ignore parsing issues
                }
            }

            $hourlyRate = $dailyRate > 0 ? ($dailyRate / 8) : 0;
            $overtimePay = round($overtimeHours * ($hourlyRate * 1.5), 2);

            // 3. Provident Fund (PF) (12% of basic gross, capped at ₹1,800)
            $pfDeductions = round(min(1800.00, $grossSalary * 0.12), 2);

            // 4. Professional Tax (PT) (flat ₹200 if total gross > ₹10,000)
            $grossTotalForPT = $grossSalary + $overtimePay;
            $ptDeductions = $grossTotalForPT > 10000 ? 200.00 : 0.00;

            // 5. Outstanding advances
            $outstandingAdvances = SalaryAdvance::where('user_id', $user->id)
                ->where('status', 'pending')
                ->sum('amount');

            // Suggested advance deduction (up to available balance after tax/pf)
            $balanceBeforeAdvance = $grossSalary + $overtimePay - $pfDeductions - $ptDeductions;
            $suggestedAdvanceDeduction = round(min($outstandingAdvances, max(0, $balanceBeforeAdvance)), 2);

            $netSalary = round($balanceBeforeAdvance - $suggestedAdvanceDeduction, 2);

            return [
                'user_id' => $user->id,
                'name' => $user->name,
                'role' => $user->role,
                'base_salary' => $baseSalary,
                'days_present' => $daysPresent,
                'days_absent' => $daysAbsent,
                'days_half_day' => $daysHalfDay,
                'days_leave' => $daysLeave,
                'gross_salary' => $grossSalary,
                'attendance_deductions' => $attendanceDeductions,
                'overtime_hours' => round($overtimeHours, 2),
                'overtime_pay' => $overtimePay,
                'pf_deductions' => $pfDeductions,
                'pt_deductions' => $ptDeductions,
                'outstanding_advances' => $outstandingAdvances,
                'advance_deductions' => $suggestedAdvanceDeduction,
                'bonus' => 0.00,
                'net_salary' => $netSalary,
                'notes' => '',
            ];
        });

        return response()->json([
            'month' => $month,
            'year' => $year,
            'items' => $calculatedItems
        ]);
    }

    /**
     * Confirm and save a payroll run.
     */
    public function save(Request $request)
    {
        if (!$request->user()->hasPermission('payroll')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'month' => 'required|integer|between:1,12',
            'year' => 'required|integer|min:2020|max:2050',
            'items' => 'required|array',
            'items.*.user_id' => 'required|exists:users,id',
            'items.*.base_salary' => 'required|numeric|min:0',
            'items.*.days_present' => 'required|integer|min:0',
            'items.*.days_absent' => 'required|integer|min:0',
            'items.*.days_half_day' => 'required|integer|min:0',
            'items.*.days_leave' => 'required|integer|min:0',
            'items.*.gross_salary' => 'required|numeric|min:0',
            'items.*.attendance_deductions' => 'required|numeric|min:0',
            'items.*.overtime_hours' => 'required|numeric|min:0',
            'items.*.overtime_pay' => 'required|numeric|min:0',
            'items.*.pf_deductions' => 'required|numeric|min:0',
            'items.*.pt_deductions' => 'required|numeric|min:0',
            'items.*.advance_deductions' => 'required|numeric|min:0',
            'items.*.bonus' => 'required|numeric|min:0',
            'items.*.net_salary' => 'required|numeric|min:0',
            'items.*.notes' => 'nullable|string',
        ]);

        $month = $request->month;
        $year = $request->year;

        // Check again to prevent double submit
        $exists = Payroll::where('month', $month)->where('year', $year)->first();
        if ($exists) {
            return response()->json(['message' => "Payroll for {$month}/{$year} already processed."], 422);
        }

        DB::beginTransaction();
        try {
            // 1. Create payroll run record
            $payroll = Payroll::create([
                'month' => $month,
                'year' => $year,
                'status' => 'processed',
                'processed_by' => $request->user()->id,
                'processed_at' => Carbon::now(),
            ]);

            // 2. Create items
            foreach ($request->items as $item) {
                $userId = $item['user_id'];
                
                $payrollItem = PayrollItem::create([
                    'payroll_id' => $payroll->id,
                    'user_id' => $userId,
                    'base_salary' => $item['base_salary'],
                    'days_present' => $item['days_present'],
                    'days_absent' => $item['days_absent'],
                    'days_half_day' => $item['days_half_day'],
                    'days_leave' => $item['days_leave'],
                    'gross_salary' => $item['gross_salary'],
                    'attendance_deductions' => $item['attendance_deductions'],
                    'overtime_hours' => $item['overtime_hours'],
                    'overtime_pay' => $item['overtime_pay'],
                    'pf_deductions' => $item['pf_deductions'],
                    'pt_deductions' => $item['pt_deductions'],
                    'advance_deductions' => $item['advance_deductions'],
                    'bonus' => $item['bonus'],
                    'net_salary' => $item['net_salary'],
                    'notes' => $item['notes'] ?? null,
                ]);

                // 3. Sequential deduction from outstanding cash advances
                $remDeduction = $item['advance_deductions'];
                if ($remDeduction > 0) {
                    $advances = SalaryAdvance::where('user_id', $userId)
                        ->where('status', 'pending')
                        ->orderBy('date', 'asc')
                        ->get();

                    foreach ($advances as $adv) {
                        if ($remDeduction <= 0) break;

                        if ($adv->amount <= $remDeduction) {
                            $remDeduction -= $adv->amount;
                            $adv->status = 'deducted';
                            $adv->payroll_item_id = $payrollItem->id;
                            $adv->save();
                        } else {
                            $remainingAmount = $adv->amount - $remDeduction;
                            
                            // Log currently deducted portion
                            $adv->amount = $remDeduction;
                            $adv->status = 'deducted';
                            $adv->payroll_item_id = $payrollItem->id;
                            $adv->save();

                            // Create a new pending advance representing balance
                            SalaryAdvance::create([
                                'user_id' => $userId,
                                'amount' => $remainingAmount,
                                'date' => $adv->date,
                                'status' => 'pending',
                                'notes' => 'Remaining balance from partial deduction in Payroll Run ' . $month . '/' . $year,
                            ]);

                            $remDeduction = 0;
                        }
                    }
                }
            }

            DB::commit();
            return response()->json([
                'message' => 'Payroll processed and saved successfully.',
                'payroll_id' => $payroll->id
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json([
                'message' => 'Processing failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark an individual salary item as Paid.
     */
    public function payItem(Request $request, $id)
    {
        if (!$request->user()->hasPermission('payroll')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $item = PayrollItem::findOrFail($id);
        
        if ($item->payment_status === 'paid') {
            return response()->json(['message' => 'Item is already paid.'], 400);
        }

        $item->update([
            'payment_status' => 'paid',
            'paid_at' => Carbon::now()
        ]);

        return response()->json([
            'message' => 'Payment status updated to paid.',
            'paid_at' => $item->paid_at->toDateTimeString()
        ]);
    }

    /**
     * Get details for payslip slip view.
     */
    public function slipDetails(Request $request, $id)
    {
        $item = PayrollItem::with([
            'user:id,name,role,phone,email',
            'payroll.processor:id,name'
        ])->findOrFail($id);

        // Fetch advances deducted in this item
        $advances = SalaryAdvance::where('payroll_item_id', $id)->get();

        return response()->json([
            'company' => [
                'name' => 'TechFocal Industrial Solutions',
                'address' => 'Shop No. 12, Industrial Area Phase 1, Pune, MH, India',
                'gstin' => '27AAACT1234F1ZA',
            ],
            'item' => $item,
            'advances' => $advances
        ]);
    }

    /**
     * Get history of salary advances.
     */
    public function indexAdvances(Request $request)
    {
        $advances = SalaryAdvance::with(['user:id,name,role'])
            ->orderBy('date', 'desc')
            ->get();

        return response()->json($advances);
    }

    /**
     * Grant a new salary advance.
     */
    public function storeAdvance(Request $request)
    {
        if (!$request->user()->hasPermission('payroll')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'user_id' => 'required|exists:users,id',
            'amount' => 'required|numeric|min:100|max:100000',
            'date' => 'required|date',
            'notes' => 'nullable|string',
        ]);

        // Check if selected user is eligible (non-admin, non-partner)
        $user = User::findOrFail($request->user_id);
        if (in_array($user->role, ['admin', 'partner'])) {
            return response()->json(['message' => 'Salary advances cannot be granted to Admins or Partners.'], 422);
        }

        $advance = SalaryAdvance::create([
            'user_id' => $request->user_id,
            'amount' => $request->amount,
            'date' => $request->date,
            'status' => 'pending',
            'notes' => $request->notes,
        ]);

        return response()->json([
            'message' => 'Salary advance granted successfully.',
            'advance' => $advance->load('user:id,name,role')
        ]);
    }

    /**
     * Delete/cancel a pending advance.
     */
    public function destroyAdvance(Request $request, $id)
    {
        if (!$request->user()->hasPermission('payroll')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $advance = SalaryAdvance::findOrFail($id);

        if ($advance->status !== 'pending') {
            return response()->json(['message' => 'Cannot delete an advance that has already been deducted or repaid.'], 400);
        }

        $advance->delete();

        return response()->json(['message' => 'Salary advance cancelled successfully.']);
    }
}
