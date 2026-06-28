<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\PurchaseOrder;
use App\Models\JobCard;
use App\Models\User;
use App\Models\Machine;
use App\Models\Expense;
use Illuminate\Support\Carbon;

class ArchiveController extends Controller
{
    /**
     * Map frontend tab keys to model classes and their singular type names.
     */
    protected $typeMap = [
        'purchase_orders'   => ['model' => PurchaseOrder::class,             'singular' => 'purchase_order'],
        'jobs'              => ['model' => JobCard::class,                   'singular' => 'job'],
        'users'             => ['model' => User::class,                      'singular' => 'user'],
        'machines'          => ['model' => Machine::class,                   'singular' => 'machine'],
        'incoming_challans' => ['model' => \App\Models\IncomingChallan::class,   'singular' => 'incoming_challan'],
    ];

    /**
     * Get categorized list of archived/deleted records.
     * Returns a flat merged list per type so the frontend can show them in tabs.
     */
    public function index(Request $request)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $result = [];

        foreach ($this->typeMap as $tabKey => $def) {
            $modelClass = $def['model'];
            $records    = collect();

            // Soft-deleted records
            if (method_exists($modelClass, 'onlyTrashed')) {
                $records = $records->merge($modelClass::onlyTrashed()->get());
            }

            // Archived (non-deleted) records
            if (in_array('is_archived', (new $modelClass)->getFillable())) {
                $archivedNotDeleted = $modelClass::where('is_archived', true)
                    ->whereNull((new $modelClass)->getKeyName() === 'id' ? 'deleted_at' : null)
                    ->get();
                $records = $records->merge($archivedNotDeleted);
            }

            // Deduplicate by id
            $result[$tabKey] = $records->unique('id')->values()->toArray();
        }

        return response()->json($result);
    }

    /**
     * Restore an archived or soft-deleted record.
     * Body: { type: 'purchase_orders'|'jobs'|'users'|'machines', id: int }
     */
    public function restore(Request $request)
    {
        if (!$request->user()->hasPermission('settings')) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $request->validate([
            'type' => 'required|string|in:purchase_orders,jobs,users,machines,incoming_challans',
            'id'   => 'required|integer',
        ]);

        $modelClass  = $this->typeMap[$request->type]['model'];
        $id          = $request->id;

        // Try to find as soft-deleted first, then as archived
        $record = null;
        if (method_exists($modelClass, 'onlyTrashed')) {
            $record = $modelClass::onlyTrashed()->find($id);
        }
        if (!$record) {
            $record = $modelClass::find($id);
        }

        if (!$record) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        // Determine when the action was taken for 30-day check
        $actionTime = $record->deleted_at ?? $record->archived_at ?? null;

        if ($actionTime) {
            $daysElapsed = Carbon::parse($actionTime)->diffInDays(Carbon::now());
            if ($daysElapsed > 30 && !in_array($request->user()->role, ['admin', 'partner'])) {
                return response()->json([
                    'message' => 'This record has been archived/deleted for more than 30 days and can only be restored by a Super Admin.'
                ], 403);
            }
        }

        // Restore soft-delete
        if ($record->deleted_at) {
            $record->restore();
            $record->update(['deleted_by' => null, 'delete_reason' => null]);
        }

        // Unarchive
        if ($record->is_archived) {
            $record->update([
                'is_archived' => false,
                'archived_at' => null,
                'archived_by' => null,
            ]);
        }

        return response()->json(['message' => 'Record restored successfully.']);
    }

    /**
     * Permanently delete (purge) a record. Super Admin only.
     * Body: { type: 'purchase_orders'|'jobs'|'users'|'machines', id: int }
     */
    public function purge(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'partner'])) {
            return response()->json([
                'message' => 'Unauthorized. Only Super Administrators can permanently delete records.'
            ], 403);
        }

        $request->validate([
            'type' => 'required|string|in:purchase_orders,jobs,users,machines,incoming_challans',
            'id'   => 'required|integer',
        ]);

        $modelClass = $this->typeMap[$request->type]['model'];
        $id         = $request->id;

        $record = null;
        if (method_exists($modelClass, 'onlyTrashed')) {
            $record = $modelClass::onlyTrashed()->find($id);
        }
        if (!$record) {
            $record = $modelClass::find($id);
        }

        if (!$record) {
            return response()->json(['message' => 'Record not found.'], 404);
        }

        // Force-delete if SoftDeletes is available, otherwise just delete
        if (method_exists($record, 'forceDelete')) {
            $record->forceDelete();
        } else {
            $record->delete();
        }

        return response()->json(['message' => 'Record permanently purged from the database.']);
    }
}
