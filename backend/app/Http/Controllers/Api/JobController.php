<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\JobCard;
use Illuminate\Support\Facades\Log;
use App\Services\SecureFileUploadService;
use Exception;
use Illuminate\Http\Request;

class JobController extends Controller
{
    /**
     * Display a list of job cards.
     */
    public function index(Request $request)
    {
        $status = $request->query('status');
        $workerId = $request->query('worker_id');
        $machineId = $request->query('machine_id');

        $query = JobCard::select([
                'id', 'job_card_number', 'incoming_challan_item_id', 'po_item_id', 'quantity', 
                'assigned_worker_id', 'machine_id', 'status', 'start_date', 'end_date', 'remarks', 
                'machining_started_at', 'machining_duration_seconds',
                'is_archived', 'created_at', 'updated_at'
            ])
            ->with([
                'poItem',
                'poItem.purchaseOrder' => function($q) {
                    $q->select(['id', 'po_number', 'po_date', 'customer_name', 'status', 'is_archived', 'created_at']);
                },
                'worker:id,name,role',
                'challanItem.challan',
                'machine:id,machine_code,name,status',
                'deliveryChallanItem'
            ])
            ->orderBy('created_at', 'desc');

        $archived = $request->query('archived') == '1';
        if ($request->query('undelivered') == '1' || $request->query('uninvoiced') == '1') {
            // Keep both archived and active jobs for billing/shipping
        } else {
            $query->where('is_archived', $archived);
        }

        // Role-based scoping: workers can only see their assigned job cards
        $user = auth()->user();
        if ($user && !$user->hasPermission('jobs')) {
            $query->where('assigned_worker_id', $user->id);
        } elseif ($workerId) {
            $query->where('assigned_worker_id', $workerId);
        }

        if ($status) {
            $query->where('status', $status);
        }

        if ($machineId) {
            $query->where('machine_id', $machineId);
        }

        if ($request->query('undelivered') == '1') {
            $query->whereDoesntHave('deliveryChallanItem', function ($q) {
                $q->whereHas('deliveryChallan', function ($dc) {
                    $dc->whereNull('cancelled_at');
                });
            });
        }

        if ($request->query('uninvoiced') == '1') {
            $query->whereDoesntHave('invoiceItem', function ($q) {
                $q->whereHas('invoice', function ($inv) {
                    $inv->whereNull('cancelled_at');
                });
            });
        }

        $jobs = $query->get();

        return response()->json($jobs);
    }

    /**
     * Display a specific job card.
     */
    public function show($id)
    {
        $job = JobCard::with(['poItem.purchaseOrder', 'worker', 'challanItem.challan', 'machine', 'deliveryChallanItem'])->findOrFail($id);
        return response()->json($job);
    }

    /**
     * Assign a job card to a worker and machine.
     */
    public function assign(Request $request, $id)
    {
        $job = JobCard::findOrFail($id);

        $validated = $request->validate([
            'assigned_worker_id' => 'required|integer|exists:users,id',
            'machine_id' => 'required|integer|exists:machines,id',
            'status' => 'nullable|string|in:pending,in_progress,inspection,completed,cancelled',
        ]);

        $machine = \App\Models\Machine::findOrFail($validated['machine_id']);
        if ($machine->status === 'maintenance') {
            return response()->json([
                'message' => 'The selected machine is currently under maintenance.'
            ], 422);
        }
        if ($machine->status === 'inactive') {
            return response()->json([
                'message' => 'The selected machine is currently inactive.'
            ], 422);
        }

        try {
            $oldMachineId = $job->machine_id;

            $updateData = [
                'assigned_worker_id' => $validated['assigned_worker_id'],
                'machine_id' => $validated['machine_id'],
            ];

            $newStatus = isset($validated['status']) && $validated['status'] ? $validated['status'] : ($job->status === 'pending' ? 'in_progress' : $job->status);

            if ($newStatus === 'in_progress') {
                $activeJob = JobCard::where('machine_id', $validated['machine_id'])
                    ->where('status', 'in_progress')
                    ->where('id', '!=', $job->id)
                    ->first();

                if ($activeJob) {
                    return response()->json(['message' => 'The selected machine is busy running Job #' . $activeJob->job_card_number], 422);
                }

                $updateData['status'] = 'in_progress';
                if ($job->status !== 'in_progress') {
                    $updateData['machining_started_at'] = now();
                    if (!$job->start_date) {
                        $updateData['start_date'] = date('Y-m-d');
                    }
                }
            } else {
                $updateData['status'] = $newStatus;
                if ($job->status === 'in_progress') {
                    if ($job->machining_started_at) {
                        $duration = \Carbon\Carbon::parse($job->machining_started_at)->diffInSeconds(now());
                        $updateData['machining_duration_seconds'] = $job->machining_duration_seconds + $duration;
                        $updateData['machining_started_at'] = null;
                    }
                }
            }

            $job->update($updateData);

            // Sync statuses of both old and new machines
            $this->syncMachineStatus($validated['machine_id']);
            if ($oldMachineId && $oldMachineId != $validated['machine_id']) {
                $this->syncMachineStatus($oldMachineId);
            }

            return response()->json([
                'message' => 'Job Card assigned successfully.',
                'job' => $job->load(['worker'])
            ]);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to assign Job: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Transition a job card's progress status.
     */
    public function updateStatus(Request $request, $id)
    {
        $job = JobCard::findOrFail($id);

        $validated = $request->validate([
            'status' => 'required|string|in:pending,in_progress,inspection,completed,cancelled',
            'remarks' => 'nullable|string|max:2000',
        ]);

        try {
            $machineId = $job->machine_id;

            $updateData = [
                'status' => $validated['status'],
                'remarks' => $validated['remarks'] ?? null,
            ];

            if ($validated['status'] === 'in_progress') {
                if (!$job->assigned_worker_id || !$job->machine_id) {
                    return response()->json(['message' => 'Assign both a Machine and an Operator before starting production.'], 422);
                }

                $activeJob = JobCard::where('machine_id', $job->machine_id)
                    ->where('status', 'in_progress')
                    ->where('id', '!=', $job->id)
                    ->first();

                if ($activeJob) {
                    return response()->json(['message' => 'Machine is busy running Job #' . $activeJob->job_card_number], 422);
                }

                if ($job->status !== 'in_progress') {
                    $updateData['machining_started_at'] = now();
                    if (!$job->start_date) {
                        $updateData['start_date'] = date('Y-m-d');
                    }
                }
            } else {
                if ($job->status === 'in_progress') {
                    if ($job->machining_started_at) {
                        $duration = \Carbon\Carbon::parse($job->machining_started_at)->diffInSeconds(now());
                        $updateData['machining_duration_seconds'] = $job->machining_duration_seconds + $duration;
                        $updateData['machining_started_at'] = null;
                    }
                }
                if ($request->status === 'completed' && !$job->end_date) {
                    $updateData['end_date'] = date('Y-m-d');
                }
            }

            $job->update($updateData);

            // Sync status of machine
            if ($machineId) {
                $this->syncMachineStatus($machineId);
            }

            return response()->json([
                'message' => "Job status updated to '{$request->status}' successfully.",
                'job' => $job
            ]);

        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to update job status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Synchronize machine status based on active machining jobs.
     */
    protected function syncMachineStatus($machineId)
    {
        if (!$machineId) return;

        $activeJobsCount = JobCard::where('machine_id', $machineId)
            ->where('status', 'in_progress')
            ->count();

        $machine = \App\Models\Machine::find($machineId);
        if ($machine && $machine->status !== 'maintenance' && $machine->status !== 'inactive') {
            $machine->status = $activeJobsCount > 0 ? 'busy' : 'idle';
            $machine->save();
        }
    }

    /**
     * Upload a drawing file for a specific job card.
     */
    public function uploadDrawing(Request $request, $id)
    {
        $job = JobCard::findOrFail($id);

        $validated = $request->validate([
            'file' => 'required|file|mimes:pdf,png,jpg,jpeg|max:10240',
        ]);

        try {
            $file = $request->file('file');
            
            // Upload to local disk -> storage/app/private/drawings
            $path = SecureFileUploadService::upload($file, 'private/drawings', 'local');

            $currentDrawings = $job->drawing_path; // Casts to array via accessor
            if (!is_array($currentDrawings)) {
                $currentDrawings = [];
            }
            $currentDrawings[] = [
                'path' => $path,
                'name' => $file->getClientOriginalName()
            ];

            $job->update([
                'drawing_path' => $currentDrawings
            ]);

            return response()->json([
                'message' => 'Drawing uploaded successfully.',
                'job' => $job
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to upload drawing: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Delete a drawing file from a job card.
     */
    public function deleteDrawing(Request $request, $id)
    {
        $job = JobCard::findOrFail($id);
        
        $validated = $request->validate([
            'path' => 'required|string|max:1000'
        ]);

        try {
            $pathToDelete = $validated['path'];
            $drawings = $job->drawing_path;
            
            $updatedDrawings = array_values(array_filter($drawings, function ($d) use ($pathToDelete) {
                return $d['path'] !== $pathToDelete;
            }));

            // Delete file from disk securely
            SecureFileUploadService::delete($pathToDelete, 'local');

            $job->update([
                'drawing_path' => $updatedDrawings
            ]);

            return response()->json([
                'message' => 'Drawing deleted successfully.',
                'job' => $job
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to delete drawing: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Rename a drawing file name on a job card.
     */
    public function renameDrawing(Request $request, $id)
    {
        $job = JobCard::findOrFail($id);
        
        $validated = $request->validate([
            'path' => 'required|string|max:1000',
            'name' => 'required|string|max:255'
        ]);

        try {
            $drawings = $job->drawing_path;
            foreach ($drawings as &$d) {
                if ($d['path'] === $validated['path']) {
                    $d['name'] = $validated['name'];
                }
            }

            $job->update([
                'drawing_path' => $drawings
            ]);

            return response()->json([
                'message' => 'Drawing renamed successfully.',
                'job' => $job
            ]);
        } catch (Exception $e) {
            return response()->json([
                'message' => 'Failed to rename drawing: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Archive a job card.
     */
    public function archive(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $job = JobCard::findOrFail($id);
        $job->update([
            'is_archived' => true,
            'archived_at' => now(),
            'archived_by' => $request->user()->id
        ]);

        return response()->json([
            'message' => 'Job Card archived successfully.',
            'job' => $job
        ]);
    }

    /**
     * Cancel a job card.
     */
    public function cancel(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $job = JobCard::findOrFail($id);
        $job->update([
            'status' => 'cancelled'
        ]);

        return response()->json([
            'message' => 'Job Card cancelled successfully.',
            'job' => $job
        ]);
    }

    /**
     * Soft delete a job card.
     */
    public function destroy(Request $request, $id)
    {
        if (!$request->user()->hasPermission('jobs')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'delete_reason' => 'required|string|max:1000'
        ]);

        $job = JobCard::findOrFail($id);

        $isCompleted = $job->status === 'completed';
        $hasActivity = $job->assigned_worker_id !== null || $job->machine_id !== null || $job->start_date !== null;
        $hasDelivery = $job->deliveryChallanItem()->exists();
        $hasInvoice = $job->invoiceItem()->exists();

        if ($isCompleted || $hasActivity || $hasDelivery || $hasInvoice) {
            return response()->json([
                'message' => 'This Job Card cannot be deleted because it is linked to operational records.'
            ], 422);
        }

        $job->update([
            'deleted_by' => $request->user()->id,
            'delete_reason' => $validated['delete_reason']
        ]);

        $job->delete();

        return response()->json([
            'message' => 'Job Card deleted successfully.'
        ]);
    }
}
