<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Holiday;

class HolidayController extends Controller
{
    public function index(Request $request)
    {
        $holidays = Holiday::orderBy('date', 'desc')->get();
        return response()->json($holidays);
    }

    public function store(Request $request)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'partner'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'date' => 'required|date',
            'type' => 'required|string|in:public,company,festival,custom',
            'description' => 'nullable|string',
            'applies_to' => 'required|string|in:all,shift',
            'target_shift' => 'nullable|string|in:day,night',
            'is_active' => 'boolean'
        ]);

        // Prevent exact duplicates
        $exists = Holiday::where('date', $validated['date'])
            ->where('applies_to', $validated['applies_to'])
            ->where('target_shift', $validated['target_shift'] ?? null)
            ->exists();
            
        if ($exists) {
            return response()->json(['message' => 'A holiday with this scope already exists for this date.'], 422);
        }

        $holiday = Holiday::create($validated);
        return response()->json($holiday, 201);
    }

    public function update(Request $request, $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'partner'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $holiday = Holiday::findOrFail($id);

        $validated = $request->validate([
            'name' => 'sometimes|string|max:255',
            'date' => 'sometimes|date',
            'type' => 'sometimes|string|in:public,company,festival,custom',
            'description' => 'nullable|string',
            'applies_to' => 'sometimes|string|in:all,shift',
            'target_shift' => 'nullable|string|in:day,night',
            'is_active' => 'boolean'
        ]);

        $holiday->update($validated);
        return response()->json($holiday);
    }

    public function destroy(Request $request, $id)
    {
        if (!in_array($request->user()->role, ['admin', 'manager', 'partner'])) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $holiday = Holiday::findOrFail($id);
        $holiday->delete();
        return response()->json(['message' => 'Holiday deleted successfully']);
    }
}
