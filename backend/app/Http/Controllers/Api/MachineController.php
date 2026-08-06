<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Machine;
use App\Models\MachineLog;
use App\Services\PushNotificationService;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class MachineController extends Controller
{
    /**
     * Get list of machines.
     */
    public function index(Request $request)
    {
        $machines = Machine::with(['defaultOperator:id,name,role'])
            ->orderBy('machine_code', 'asc')
            ->get();

        // Attach active jobs details to each machine
        $machines->map(function ($machine) {
            $machine->active_jobs = \App\Models\JobCard::where('machine_id', $machine->id)
                ->whereIn('status', ['in_progress', 'inspection'])
                ->with(['worker:id,name', 'poItem.purchaseOrder:id,po_number,customer_name'])
                ->get()
                ->map(function ($job) {
                    return [
                        'id' => $job->id,
                        'job_card_number' => $job->job_card_number,
                        'quantity' => $job->quantity,
                        'status' => $job->status,
                        'worker_name' => $job->worker ? $job->worker->name : 'Unassigned',
                        'customer' => $job->poItem && $job->poItem->purchaseOrder ? $job->poItem->purchaseOrder->customer_name : 'N/A',
                        'po_number' => $job->poItem && $job->poItem->purchaseOrder ? $job->poItem->purchaseOrder->po_number : 'N/A',
                        'description' => $job->poItem ? $job->poItem->description : '',
                    ];
                });
            return $machine;
        });

        return response()->json($machines);
    }

    /**
     * Get specific machine details including logs and active jobs.
     */
    public function show(Request $request, $id)
    {
        $machine = Machine::with(['defaultOperator:id,name,role'])
            ->findOrFail($id);

        $machine->logs = MachineLog::where('machine_id', $id)
            ->with('user:id,name')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($log) {
                return [
                    'id' => $log->id,
                    'log_type' => $log->log_type,
                    'description' => $log->description,
                    'cost' => $log->cost,
                    'logged_by' => $log->user ? $log->user->name : 'Unknown',
                    'date' => $log->created_at->toDateTimeString(),
                ];
            });

        $machine->active_jobs = \App\Models\JobCard::where('machine_id', $id)
            ->whereIn('status', ['in_progress', 'inspection'])
            ->with(['worker:id,name', 'poItem.purchaseOrder:id,po_number,customer_name'])
            ->get()
            ->map(function ($job) {
                return [
                    'id' => $job->id,
                    'job_card_number' => $job->job_card_number,
                    'quantity' => $job->quantity,
                    'status' => $job->status,
                    'worker_name' => $job->worker ? $job->worker->name : 'Unassigned',
                    'customer' => $job->poItem && $job->poItem->purchaseOrder ? $job->poItem->purchaseOrder->customer_name : 'N/A',
                    'po_number' => $job->poItem && $job->poItem->purchaseOrder ? $job->poItem->purchaseOrder->po_number : 'N/A',
                ];
            });

        return response()->json($machine);
    }

    /**
     * Create a new machine register.
     */
    public function store(Request $request)
    {
        if (!$request->user()->hasPermission('jobs') || !$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'machine_code' => 'required|string|max:50|unique:machines,machine_code',
            'name' => 'required|string|max:100',
            'type' => 'required|string|max:50',
            'status' => 'nullable|string|in:idle,busy,maintenance,inactive',
            'default_operator_id' => 'nullable|integer|exists:users,id',
            'hourly_rate' => 'nullable|numeric|min:0|max:99999999',
            'specifications' => 'nullable|string|max:2000',
        ]);

        $machine = Machine::create([
            'machine_code' => strtoupper($validated['machine_code']),
            'name' => $validated['name'],
            'type' => $validated['type'],
            'status' => $validated['status'] ?? 'idle',
            'default_operator_id' => $validated['default_operator_id'] ?? null,
            'hourly_rate' => $validated['hourly_rate'] ?? null,
            'specifications' => $validated['specifications'] ?? null,
        ]);

        return response()->json([
            'message' => 'Machine registered successfully.',
            'machine' => $machine
        ]);
    }

    /**
     * Update machine details.
     */
    public function update(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs') || !$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $machine = Machine::findOrFail($id);

        $validated = $request->validate([
            'machine_code' => 'required|string|max:50|unique:machines,machine_code,' . $id,
            'name' => 'required|string|max:100',
            'type' => 'required|string|max:50',
            'status' => 'nullable|string|in:idle,busy,maintenance,inactive',
            'default_operator_id' => 'nullable|integer|exists:users,id',
            'hourly_rate' => 'nullable|numeric|min:0|max:99999999',
            'specifications' => 'nullable|string|max:2000',
        ]);

        // Keep status sync if busy
        $status = $validated['status'] ?? $machine->status;
        
        $machine->update([
            'machine_code' => strtoupper($validated['machine_code']),
            'name' => $validated['name'],
            'type' => $validated['type'],
            'status' => $status,
            'default_operator_id' => $validated['default_operator_id'] ?? null,
            'hourly_rate' => $validated['hourly_rate'] ?? null,
            'specifications' => $validated['specifications'] ?? null,
        ]);

        return response()->json([
            'message' => 'Machine updated successfully.',
            'machine' => $machine
        ]);
    }

    /**
     * Record a maintenance/breakdown log for a machine.
     */
    public function logMaintenance(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs') || !$request->user()->hasPermission('purchase_orders')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $machine = Machine::findOrFail($id);

        $validated = $request->validate([
            'log_type' => 'required|string|in:maintenance,breakdown,tooling_change,status_override',
            'description' => 'required|string|max:2000',
            'cost' => 'nullable|numeric|min:0|max:99999999',
        ]);

        $log = MachineLog::create([
            'machine_id' => $id,
            'log_type' => $validated['log_type'],
            'logged_by' => $request->user()->id,
            'description' => $validated['description'],
            'cost' => $validated['cost'] ?? null,
        ]);

        // Update machine status based on log
        $status = $machine->status;
        $updates = [];

        if (in_array($validated['log_type'], ['breakdown', 'maintenance'])) {
            $status = 'maintenance';
            $updates['last_maintenance_date'] = Carbon::today()->toDateString();
            
            // Set next maintenance due to 90 days out if doing routine maintenance
            if ($validated['log_type'] === 'maintenance') {
                $updates['next_maintenance_due'] = Carbon::today()->addDays(90)->toDateString();
            }

            PushNotificationService::sendToRoles(
                ['admin', 'manager', 'supervisor'],
                'Machine Maintenance Alert 🔧',
                "Machine {$machine->machine_code} has been marked for {$request->log_type}.",
                'machine_maintenance_req',
                ['machine_id' => $machine->id]
            );
        } elseif ($request->log_type === 'status_override' && $machine->status === 'maintenance') {
            // Resolving maintenance manually, back to idle
            $status = 'idle';
        }

        $updates['status'] = $status;
        $machine->update($updates);

        return response()->json([
            'message' => 'Machine log recorded successfully.',
            'log' => $log,
            'machine_status' => $status
        ]);
    }

    /**
     * Get machine shop utilization statistics.
     */
    public function stats(Request $request)
    {
        $total = Machine::count();
        $idle = Machine::where('status', 'idle')->count();
        $busy = Machine::where('status', 'busy')->count();
        $maintenance = Machine::where('status', 'maintenance')->count();
        $inactive = Machine::where('status', 'inactive')->count();

        return response()->json([
            'total' => $total,
            'idle' => $idle,
            'busy' => $busy,
            'maintenance' => $maintenance,
            'inactive' => $inactive,
            'utilization_rate' => $total > 0 ? round(($busy / ($total - $inactive)) * 100, 1) : 0
        ]);
    }

    /**
     * Archive a machine.
     */
    public function archive(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $machine = Machine::findOrFail($id);
        $machine->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $request->user()->id
        ]);

        return response()->json([
            'message' => 'Machine archived successfully.',
            'machine' => $machine
        ]);
    }

    /**
     * Prevent machine deletion, prompt to archive or retire.
     */
    public function destroy(Request $request, $id)
    {
        return response()->json([
            'message' => 'Machines cannot be deleted. You can retire or archive them instead.'
        ], 422);
    }
}
