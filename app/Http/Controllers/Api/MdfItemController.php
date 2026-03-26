<?php
// app/Http/Controllers/Api/MdfItemController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MdfItem;
use App\Models\MdfSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MdfItemController extends Controller
{
    // ──────────────────────────────────────────────────────────────────────────
    // GET /api/mdf-items?search=X&category_id=Y
    //
    // Search dialog — returns all active non-debt items for re-use from prior years.
    // ──────────────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = MdfItem::with('category')
            ->where('is_active', true)
            ->whereNull('deleted_at')
            ->whereNull('obligation_id'); // exclude auto-synced debt rows

        if ($request->filled('search')) {
            $query->where('name', 'like', '%' . $request->query('search') . '%');
        }

        if ($request->filled('category_id')) {
            $query->where('category_id', $request->query('category_id'));
        }

        $items = $query->orderBy('sort_order')->orderBy('name')->get()
            ->map(fn($item) => [
                'item_id'       => $item->item_id,
                'category_id'   => $item->category_id,
                'category_name' => $item->category?->name,
                'name'          => $item->name,
                'account_code'  => $item->account_code,
            ]);

        return response()->json(['data' => $items]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // POST /api/mdf-items
    // ──────────────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $item = MdfItem::create($request->validate([
            'category_id'  => 'required|integer|exists:mdf_categories,category_id',
            'name'         => 'required|string|max:255',
            'account_code' => 'nullable|string|max:50',
            'sort_order'   => 'nullable|integer',
        ]));

        return response()->json([
            'data' => array_merge($item->toArray(), [
                'is_debt_row'         => false,
                'active_snapshot_id'  => null,
                'current_snapshot_id' => null,
                'past_total'          => 0.0,
                'cur_sem1'            => 0.0,
                'cur_sem2'            => 0.0,
                'cur_total'           => 0.0,
                'proposed'            => 0.0,
                'has_prior_data'      => false,
            ]),
        ], 201);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // PUT /api/mdf-items/{mdfItem}
    // ──────────────────────────────────────────────────────────────────────────

    public function update(Request $request, MdfItem $mdfItem): JsonResponse
    {
        if ($mdfItem->obligation_id) {
            return response()->json(['message' => 'Debt rows are managed automatically.'], 422);
        }

        $mdfItem->update($request->validate([
            'name'         => 'sometimes|required|string|max:255',
            'account_code' => 'nullable|string|max:50',
            'sort_order'   => 'sometimes|integer',
            'is_active'    => 'sometimes|boolean',
        ]));

        return response()->json(['data' => $mdfItem]);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // DELETE /api/mdf-items/{mdfItem}
    // ──────────────────────────────────────────────────────────────────────────

    public function destroy(MdfItem $mdfItem): JsonResponse
    {
        if ($mdfItem->obligation_id) {
            return response()->json(['message' => 'Debt rows cannot be deleted here.'], 422);
        }

        $mdfItem->delete();

        return response()->json(['message' => 'Item deleted.']);
    }
}