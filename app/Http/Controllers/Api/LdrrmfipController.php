<?php
// app/Http/Controllers/Api/LdrrmfipController.php

namespace App\Http\Controllers\Api;

use App\Models\LdrrmfipCategory;
use App\Models\LdrrmfipItem;
use App\Models\BudgetPlan;
use App\Models\Department;
use App\Models\DepartmentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * LdrrmfipController
 *
 * Routes (all scoped by ?source= query param):
 *   GET    /api/ldrrmfip/categories
 *   GET    /api/ldrrmfip/sources                        → available tabs
 *   GET    /api/ldrrmfip/previous-items?budget_plan_id&source
 *   GET    /api/ldrrmfip/summary?budget_plan_id&source
 *   GET    /api/ldrrmfip?budget_plan_id&source
 *   POST   /api/ldrrmfip
 *   PUT    /api/ldrrmfip/{ldrrmfip}
 *   DELETE /api/ldrrmfip/{ldrrmfip}
 */
class LdrrmfipController extends BaseApiController
{
    // ── Valid source keys ─────────────────────────────────────────────────────
    // 'general-fund' = General Fund income source
    // 'occ' | 'pm' | 'sh' = Special Accounts matching IncomeFundController sources

    private const SPECIAL_ACCOUNT_SOURCES = ['occ', 'pm', 'sh'];

    // ── categories ────────────────────────────────────────────────────────────

    public function categories(): JsonResponse
    {
        return $this->success(
            LdrrmfipCategory::where('is_active', true)->orderBy('sort_order')->get()
        );
    }

    // ── sources ───────────────────────────────────────────────────────────────

    /**
     * GET /api/ldrrmfip/sources
     *
     * Returns the list of fund sources available as tabs.
     * Always includes general-fund.
     * Special Accounts are pulled from department_categories + departments.
     *
     * Shape: [
     *   { id: 'general-fund', label: 'General Fund', type: 'general' },
     *   { id: 'occ', label: 'Opol Community College', type: 'special', dept_abbreviation: 'OCC' },
     *   …
     * ]
     */
    public function sources(): JsonResponse
    {
        $specialCatId = DepartmentCategory::where('dept_category_name', 'Special Accounts')
            ->value('dept_category_id');

        $specials = [];
        if ($specialCatId) {
            // Map department abbreviation → income-fund source key
            $sourceMap = ['sh' => 'sh', 'occ' => 'occ', 'pm' => 'pm'];

            $depts = Department::where('dept_category_id', $specialCatId)
                ->orderBy('dept_id')
                ->get(['dept_id', 'dept_name', 'dept_abbreviation']);

            foreach ($depts as $dept) {
                $abbr = strtolower($dept->dept_abbreviation ?? '');
                $name = strtolower($dept->dept_name ?? '');

                // Derive source key from abbreviation or name
                $key = null;
                if (isset($sourceMap[$abbr])) {
                    $key = $sourceMap[$abbr];
                } elseif (str_contains($name, 'slaughter')) {
                    $key = 'sh';
                } elseif (str_contains($name, 'college') || str_contains($name, 'opol community')) {
                    $key = 'occ';
                } elseif (str_contains($name, 'market')) {
                    $key = 'pm';
                }

                if ($key) {
                    $specials[] = [
                        'id'               => $key,
                        'label'            => $dept->dept_name,
                        'type'             => 'special',
                        'dept_id'          => $dept->dept_id,
                        'dept_abbreviation'=> $dept->dept_abbreviation,
                    ];
                }
            }
        }

        $sources = array_merge(
            [['id' => 'general-fund', 'label' => 'General Fund', 'type' => 'general']],
            $specials
        );

        return $this->success($sources);
    }

    // ── index ─────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'required|string',
        ]);

        $planId = $request->integer('budget_plan_id');
        $source = $request->string('source')->toString();

        $categories = LdrrmfipCategory::where('is_active', true)
            ->orderBy('sort_order')
            ->with(['items' => function ($q) use ($planId, $source) {
                $q->where('budget_plan_id', $planId)
                  ->where('source', $source)
                  ->orderBy('ldrrmfip_item_id');
            }])
            ->get()
            ->map(fn ($cat) => [
                'ldrrmfip_category_id' => $cat->ldrrmfip_category_id,
                'name'                 => $cat->name,
                'sort_order'           => $cat->sort_order,
                'items'                => $cat->items->values(),
                'subtotal_mooe'        => $cat->items->sum('mooe'),
                'subtotal_co'          => $cat->items->sum('co'),
                'subtotal_total'       => $cat->items->sum(fn ($i) => $i->mooe + $i->co),
            ]);

        return $this->success($categories);
    }

    // ── store ─────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_id'        => 'required|integer|exists:budget_plans,budget_plan_id',
            'ldrrmfip_category_id'  => 'required|integer|exists:ldrrmfip_categories,ldrrmfip_category_id',
            'source'                => 'required|string|max:50',
            'description'           => 'required|string|max:500',
            'implementing_office'   => 'nullable|string|max:100',
            'starting_date'         => 'nullable|string|max:50',
            'completion_date'       => 'nullable|string|max:50',
            'expected_output'       => 'nullable|string|max:255',
            'funding_source'        => 'nullable|string|max:100',
            'mooe'                  => 'nullable|numeric|min:0',
            'co'                    => 'nullable|numeric|min:0',
        ]);

        $exists = LdrrmfipItem::where('budget_plan_id',       $validated['budget_plan_id'])
            ->where('ldrrmfip_category_id', $validated['ldrrmfip_category_id'])
            ->where('source',               $validated['source'])
            ->where('description',          $validated['description'])
            ->exists();

        if ($exists) {
            return response()->json([
                'message' => 'This item already exists in the selected category for this fund source.',
            ], 422);
        }

        $userId = $request->user()?->user_id;

        $item = LdrrmfipItem::create([
            ...$validated,
            'implementing_office' => $validated['implementing_office'] ?? 'LDRRMO',
            'funding_source'      => $validated['funding_source']      ?? 'LDRRMF',
            'mooe'                => $validated['mooe'] ?? 0,
            'co'                  => $validated['co']   ?? 0,
            'created_by'          => $userId,
            'updated_by'          => $userId,
        ]);

        return $this->success($item->load('category'), 201);
    }

    // ── update ────────────────────────────────────────────────────────────────

    public function update(Request $request, LdrrmfipItem $ldrrmfip): JsonResponse
    {
        $validated = $request->validate([
            'ldrrmfip_category_id' => 'sometimes|integer|exists:ldrrmfip_categories,ldrrmfip_category_id',
            'description'          => 'sometimes|string|max:500',
            'implementing_office'  => 'nullable|string|max:100',
            'starting_date'        => 'nullable|string|max:50',
            'completion_date'      => 'nullable|string|max:50',
            'expected_output'      => 'nullable|string|max:255',
            'funding_source'       => 'nullable|string|max:100',
            'mooe'                 => 'nullable|numeric|min:0',
            'co'                   => 'nullable|numeric|min:0',
        ]);

        if (isset($validated['description']) && $validated['description'] !== $ldrrmfip->description) {
            $catId = $validated['ldrrmfip_category_id'] ?? $ldrrmfip->ldrrmfip_category_id;
            $dup = LdrrmfipItem::where('budget_plan_id',       $ldrrmfip->budget_plan_id)
                ->where('ldrrmfip_category_id', $catId)
                ->where('source',               $ldrrmfip->source)
                ->where('description',          $validated['description'])
                ->where('ldrrmfip_item_id', '!=',$ldrrmfip->ldrrmfip_item_id)
                ->exists();

            if ($dup) {
                return response()->json(['message' => 'Duplicate item description in this category.'], 422);
            }
        }

        $ldrrmfip->update([...$validated, 'updated_by' => $request->user()?->user_id]);

        return $this->success($ldrrmfip->fresh()->load('category'));
    }

    // ── destroy ───────────────────────────────────────────────────────────────

    public function destroy(LdrrmfipItem $ldrrmfip): JsonResponse
    {
        $ldrrmfip->delete();
        return $this->success(['message' => 'Deleted.']);
    }

    // ── previousItems ─────────────────────────────────────────────────────────

    public function previousItems(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'required|string',
        ]);

        $currentPlan = BudgetPlan::findOrFail($request->integer('budget_plan_id'));
        $prevPlan    = BudgetPlan::where('year', $currentPlan->year - 1)->first();
        $source      = $request->string('source')->toString();

        if (!$prevPlan) return $this->success([]);

        $existing = LdrrmfipItem::where('budget_plan_id', $currentPlan->budget_plan_id)
            ->where('source', $source)
            ->pluck('description')
            ->map(fn ($d) => strtolower(trim($d)))
            ->toArray();

        $prevItems = LdrrmfipItem::where('budget_plan_id', $prevPlan->budget_plan_id)
            ->where('source', $source)
            ->with('category')
            ->orderBy('ldrrmfip_category_id')
            ->orderBy('ldrrmfip_item_id')
            ->get()
            ->filter(fn ($item) =>
                !in_array(strtolower(trim($item->description)), $existing, true)
            )
            ->values();

        return $this->success($prevItems);
    }

    // ── summary ───────────────────────────────────────────────────────────────

    /**
     * GET /api/ldrrmfip/summary?budget_plan_id=X&source=general-fund
     *
     * C. calamity_fund:
     *   - general-fund → same as before (grand total income × 5%)
     *   - special account (occ/pm/sh) → "Total Available Resources for Appropriations"
     *     for that specific source × 5%
     *     Mirrors how IncomeFundController builds grand total for each source:
     *     Sum of all leaf proposed_amounts for that source, excluding Non-Income Receipts.
     */
    public function summary(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'required|string',
        ]);

        $planId = $request->integer('budget_plan_id');
        $source = $request->string('source')->toString();

        // ── A. Sum of all LDRRMFIP items for this source ──────────────────
        $total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
            ->where('source', $source)
            ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')
            ->value('grand');

        // ── C. 5% of Total Available Resources ───────────────────────────
        $calamityFund = $this->computeCalamityFund($planId, $source);

        $reserved30 = round($calamityFund - $total70, 2);

        return $this->success([
            'budget_plan_id' => $planId,
            'source'         => $source,
            'total_70pct'    => round($total70,    2),
            'reserved_30'    => $reserved30,
            'calamity_fund'  => $calamityFund,
        ]);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /**
     * Compute 5% of "Total Available Resources for Appropriations"
     * for the given income-fund source.
     *
     * For general-fund: same as AggregateTotalsController::incomeFundDerived()
     *   grandTotal = SUM(proposed_amount) excluding Non-Income Receipts subtree
     *
     * For special accounts (occ/pm/sh): same formula but scoped to that source.
     *   The income_fund_amounts table has a `source` column that matches
     *   IncomeFundController's source keys, so we just filter by source.
     *
     * Grand total = Beginning Cash Balance + Tax Revenue subtotal
     *             + Non-Tax Revenue subtotal + External Source subtotal
     *   (i.e. everything EXCEPT Non-Income Receipts — same exclusion as general-fund)
     */
    private function computeCalamityFund(int $planId, string $source): float
    {
        // Exclude the "Non-Income Receipts" subtree
        $nonIncomeParent = DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

        // Fallback: try without source filter (general-fund objects may not have source column)
        if (!$nonIncomeParent && $source === 'general-fund') {
            $nonIncomeParent = DB::table('income_fund_objects')
                ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
                ->first(['id']);
        }

        $excludeIds = [];
        if ($nonIncomeParent) {
            $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
            $excludeIds[] = $nonIncomeParent->id;
        }

        $query = DB::table('income_fund_amounts')
            ->where('budget_plan_id', $planId)
            ->where('source', $source);

        if (!empty($excludeIds)) {
            $query->whereNotIn('income_fund_object_id', $excludeIds);
        }

        $grandTotal = (float) $query->sum('proposed_amount');

        return round($grandTotal * 0.05, 2);
    }

    /**
     * Recursively collect all descendant IDs of an income_fund_object.
     * @return int[]
     */
    private function collectDescendantIds(int $parentId): array
    {
        $ids      = [];
        $children = DB::table('income_fund_objects')
            ->where('parent_id', $parentId)
            ->pluck('id');

        foreach ($children as $childId) {
            $ids[] = $childId;
            array_push($ids, ...$this->collectDescendantIds($childId));
        }

        return $ids;
    }
}