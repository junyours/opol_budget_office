<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\IncomeFundAmount;
use App\Models\IncomeFundObject;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class IncomeFundObjectController extends Controller
{
    // ── GET /income-fund-objects ───────────────────────────────────────────────
    public function index(Request $request)
    {
        $query = IncomeFundObject::orderBy('source')->orderBy('sort_order');

        if ($request->filled('source')) {
            $query->where('source', $request->source);
        }

        if ($request->filled('status')) {
            $query->where('is_active', $request->status === 'active');
        }

        $items = $query->get()->map(fn($o) => [
            'id'         => $o->id,
            'source'     => $o->source,
            'parent_id'  => $o->parent_id,
            'code'       => $o->code,
            'name'       => $o->name,
            'level'      => $o->level,
            'sort_order' => $o->sort_order,
            'is_active'  => $o->is_active,
        ]);

        return response()->json(['data' => $items]);
    }

    // ── POST /income-fund-objects ──────────────────────────────────────────────
    public function store(Request $request)
    {
        $validated = $request->validate([
            'source'     => 'required|string|max:100',
            'parent_id'  => 'nullable|integer|exists:income_fund_objects,id',
            'code'       => 'nullable|string|max:80',
            'name'       => 'required|string|max:255',
            'level'      => 'required|integer|min:0',
            'sort_order' => 'nullable|integer',
        ]);

        // // Auto sort_order: place at end of its source group
        // if (!isset($validated['sort_order'])) {
        //     $max = IncomeFundObject::where('source', $validated['source'])->max('sort_order') ?? 0;
        //     $validated['sort_order'] = $max + 1;
        // }

        // $obj = IncomeFundObject::create(array_merge($validated, ['is_active' => true]));
                $obj = DB::transaction(function () use ($validated) {
            $source = $validated['source'];

            // Current on-screen order. Ties (seeded rows are all 0) fall back to id.
            $ordered = IncomeFundObject::where('source', $source)
                ->orderBy('sort_order')
                ->orderBy('id')
                ->get(['id', 'parent_id', 'sort_order'])
                ->values();

            $total = $ordered->count();

            if (isset($validated['sort_order'])) {
                // Typed value = 1-based position in the list
                $pos = max(0, min((int) $validated['sort_order'] - 1, $total));
            } elseif (!empty($validated['parent_id'])) {
                // Directly after the LAST descendant of the chosen parent
                $childrenOf = [];
                foreach ($ordered as $row) {
                    if ($row->parent_id !== null) {
                        $childrenOf[$row->parent_id][] = $row->id;
                    }
                }

                $subtree = [];
                $stack   = [(int) $validated['parent_id']];
                while ($stack) {
                    $id = array_pop($stack);
                    $subtree[$id] = true;
                    foreach ($childrenOf[$id] ?? [] as $childId) {
                        $stack[] = $childId;
                    }
                }

                $last = null;
                foreach ($ordered as $i => $row) {
                    if (isset($subtree[$row->id])) {
                        $last = $i;
                    }
                }
                $pos = $last === null ? $total : $last + 1;
            } else {
                // Top-level with no parent: end of the list
                $pos = $total;
            }

            // Make every row's sort_order unique and gapless, leaving a slot at $pos
            foreach ($ordered as $i => $row) {
                $target = $i < $pos ? $i + 1 : $i + 2;
                if ((int) $row->sort_order !== $target) {
                    IncomeFundObject::where('id', $row->id)->update(['sort_order' => $target]);
                }
            }

            return IncomeFundObject::create(array_merge($validated, [
                'sort_order' => $pos + 1,
                'is_active'  => true,
            ]));
        });

        return response()->json(['data' => $obj], 201);
    }

    // ── PUT /income-fund-objects/{id} ──────────────────────────────────────────
    public function update(Request $request, int $id)
    {
        $obj = IncomeFundObject::findOrFail($id);

        $validated = $request->validate([
            'source'     => 'sometimes|string|max:100',
            'parent_id'  => 'nullable|integer|exists:income_fund_objects,id',
            'code'       => 'nullable|string|max:80',
            'name'       => 'sometimes|required|string|max:255',
            'level'      => 'sometimes|required|integer|min:0',
            'sort_order' => 'nullable|integer',
            'is_active'  => 'sometimes|boolean',
        ]);

        // Guard: cannot deactivate if there are amounts in the active budget plan
        if (isset($validated['is_active']) && $validated['is_active'] === false && $obj->is_active) {
            $activePlan = BudgetPlan::where('is_active', 1)->first();
            if ($activePlan) {
                $hasAmount = IncomeFundAmount::where('income_fund_object_id', $obj->id)
                    ->where('budget_plan_id', $activePlan->budget_plan_id)
                    ->where(function ($q) {
                        $q->whereNotNull('proposed_amount')
                          ->orWhereNotNull('sem1_actual')
                          ->orWhereNotNull('sem2_actual');
                    })
                    ->exists();

                if ($hasAmount) {
                    return response()->json([
                        'message' => "Cannot deactivate \"{$obj->name}\" — it has amounts allocated in the active budget plan ({$activePlan->year}). Please clear those amounts first.",
                    ], 422);
                }
            }
        }

        $obj->update($validated);

        return response()->json(['data' => $obj]);
    }

    // ── DELETE /income-fund-objects/{id} ───────────────────────────────────────
    public function destroy(int $id)
    {
        $obj = IncomeFundObject::findOrFail($id);

        $hasAmounts = IncomeFundAmount::where('income_fund_object_id', $obj->id)->exists();
        if ($hasAmounts) {
            return response()->json([
                'message' => "Cannot delete \"{$obj->name}\" — it has saved budget amounts. Deactivate it instead.",
            ], 422);
        }

        $obj->delete();

        return response()->json(['success' => true]);
    }

    // ── GET /income-fund-objects/sources ──────────────────────────────────────
    public function sources()
    {
        $sources = IncomeFundObject::select('source')
            ->distinct()
            ->orderBy('source')
            ->pluck('source');

        return response()->json(['data' => $sources]);
    }


}
