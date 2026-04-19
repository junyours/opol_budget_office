<?php
// app/Http/Controllers/Api/MdfSnapshotController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MdfItem;
use App\Models\MdfSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MdfSnapshotController extends Controller
{
    // DELETE /api/mdf-snapshots?item_id=X&budget_plan_id=Y
    // Removes an item from a specific budget plan's table — does NOT touch mdf_items
    public function destroy(Request $request): JsonResponse
    {
        $validated = $request->validate([
        'item_id'        => 'required|integer|exists:mdf_items,item_id',
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
    ]);

        $item = MdfItem::findOrFail($validated['item_id']);
        if ($item->obligation_id) {
            return response()->json(['message' => 'Debt rows cannot be removed manually.'], 422);
        }

        $deleted = MdfSnapshot::where('item_id', $validated['item_id'])
            ->where('budget_plan_id', $validated['budget_plan_id'])
            ->delete();

        if (! $deleted) {
            return response()->json(['message' => 'Snapshot not found.'], 404);
        }

        return response()->json(['message' => 'Item removed from this budget plan.']);
    }
}
