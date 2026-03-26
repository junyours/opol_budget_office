<?php
// app/Http/Controllers/Api/LdrrmfPlanController.php

namespace App\Http\Controllers\Api;

use App\Models\BudgetPlan;
use App\Models\Department;
use App\Models\DepartmentCategory;
use App\Models\LdrrmfipItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * LdrrmfPlanController
 *
 * Generates the LDRRMF Plan report:
 *   CY-XXXX 5% Local Disaster Risk Reduction Management Fund Plan
 *   (JMC 2013-1, RA-10121)
 *
 * Each special account section shows:
 *   - 30% Quick Response Fund  = reserved_30 from ldrrmfip summary
 *   - 70% Disaster Preparedness items = ldrrmfip_items for that source
 *   - Total 5% Calamity Fund   = calamity_fund from ldrrmfip summary
 *
 * All values are shown for three years:
 *   past         = active budget year − 2  (e.g. 2024)
 *   current      = active budget year − 1  (e.g. 2025, split into sem1/sem2/total)
 *   budget_year  = active budget year      (e.g. 2026)
 *
 * Routes:
 *   GET /api/ldrrmf-plan               → index (full report data)
 *   GET /api/ldrrmf-plan/special-accounts → just the list of special account sources
 */
class LdrrmfPlanController extends BaseApiController
{
    // ─────────────────────────────────────────────────────────────────────────
    // source key → income fund source string mapping
    private const SOURCE_MAP = ['sh' => 'sh', 'occ' => 'occ', 'pm' => 'pm'];

    // ── special-accounts ──────────────────────────────────────────────────────

    /**
     * GET /api/ldrrmf-plan/special-accounts
     * Returns all special account departments with their source keys.
     */
    public function specialAccounts(): JsonResponse
    {
        return $this->success($this->getSpecialAccounts());
    }

    // ── index ─────────────────────────────────────────────────────────────────

    /**
     * GET /api/ldrrmf-plan
     *
     * Returns the full LDRRMF Plan report data for the active budget plan.
     *
     * Shape:
     * {
     *   year:         2026,
     *   past_year:    2024,
     *   current_year: 2025,
     *   special_accounts: [
     *     {
     *       source: 'pm',
     *       label:  'Mun. Eco. Entrpse., PUBLIC MARKET',
     *       dept_name: 'Public Market',
     *       // Summary totals for each year
     *       past:         { qrf_30: 0, preparedness_70: 0, total_5pct: 0 },
     *       current:      { qrf_30_sem1: 0, qrf_30_sem2: 0, qrf_30_total: 0,
     *                       prep_70_sem1: 0, prep_70_sem2: 0, prep_70_total: 0,
     *                       total_sem1: 0,  total_sem2: 0,  total_5pct: 0 },
     *       budget_year:  { qrf_30: 0, preparedness_70: 0, total_5pct: 0 },
     *       // 70% items for the budget year
     *       items: [
     *         { description, mooe, co, total }
     *       ]
     *     },
     *     ...
     *   ],
     *   grand_total: {
     *     past:        { total_5pct: 0 },
     *     current:     { total_sem1: 0, total_sem2: 0, total_5pct: 0 },
     *     budget_year: { total_5pct: 0 }
     *   }
     * }
     */
    public function index(Request $request): JsonResponse
    {
        // ── Resolve budget plans ───────────────────────────────────────────
        $activePlan = BudgetPlan::where('is_active', true)->first();
        if (!$activePlan) {
            return response()->json(['success' => false, 'message' => 'No active budget plan.'], 404);
        }

        $year        = (int) $activePlan->year;
        $pastYear    = $year - 2;
        $currentYear = $year - 1;

        $pastPlan    = BudgetPlan::where('year', $pastYear)->first();
        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        $specialAccounts = $this->getSpecialAccounts();

        $sections = [];

        foreach ($specialAccounts as $sa) {
            $source = $sa['source'];

            // ── Past year totals ───────────────────────────────────────────
            $pastData = $pastPlan
                ? $this->getSummaryForPlan($pastPlan->budget_plan_id, $source)
                : ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0];

            // ── Current year (2025) — uses sem1/sem2 from income_fund_amounts ──
            // For LDRRMF Plan, current year columns show actual calamity fund usage:
            // We derive from the ldrrmfip summary of the current plan (if it exists)
            // and split using sem1_actual / sem2_actual from income_fund_amounts.
            $currentData = $this->getCurrentYearData($currentPlan?->budget_plan_id, $source);

            // ── Budget year (active plan) ──────────────────────────────────
            $budgetData = $this->getSummaryForPlan($activePlan->budget_plan_id, $source);

            // ── 70% items for budget year ──────────────────────────────────
            $items = LdrrmfipItem::where('budget_plan_id', $activePlan->budget_plan_id)
                ->where('source', $source)
                ->with('category')
                ->orderBy('ldrrmfip_item_id')
                ->get()
                ->map(fn ($i) => [
                    'ldrrmfip_item_id'     => $i->ldrrmfip_item_id,
                    'description'          => $i->description,
                    'category_name'        => $i->category?->name,
                    'implementing_office'  => $i->implementing_office,
                    'mooe'                 => $i->mooe,
                    'co'                   => $i->co,
                    'total'                => $i->total,
                ])
                ->values();

            $sections[] = [
                'source'      => $source,
                'dept_name'   => $sa['dept_name'],
                'label'       => $sa['label'],
                'past'        => $pastData,
                'current'     => $currentData,
                'budget_year' => $budgetData,
                'items'       => $items,
            ];
        }

        // ── Grand totals ───────────────────────────────────────────────────
        $grandTotal = [
            'past' => [
                'total_5pct' => array_sum(array_column(array_column($sections, 'past'), 'total_5pct')),
            ],
            'current' => [
                'total_sem1'  => array_sum(array_column(array_column($sections, 'current'), 'total_sem1')),
                'total_sem2'  => array_sum(array_column(array_column($sections, 'current'), 'total_sem2')),
                'total_5pct'  => array_sum(array_column(array_column($sections, 'current'), 'total_5pct')),
            ],
            'budget_year' => [
                'total_5pct' => array_sum(array_column(array_column($sections, 'budget_year'), 'total_5pct')),
            ],
        ];

        return $this->success([
            'year'             => $year,
            'past_year'        => $pastYear,
            'current_year'     => $currentYear,
            'special_accounts' => $sections,
            'grand_total'      => $grandTotal,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Get all special account departments with derived source keys.
     * Dynamic — auto-picks up new departments in the Special Accounts category.
     */
    private function getSpecialAccounts(): array
    {
        $specialCatId = DepartmentCategory::where('dept_category_name', 'Special Accounts')
            ->value('dept_category_id');

        if (!$specialCatId) return [];

        $depts = Department::where('dept_category_id', $specialCatId)
            ->orderBy('dept_id')
            ->get(['dept_id', 'dept_name', 'dept_abbreviation']);

        $result = [];
        foreach ($depts as $dept) {
            $abbr   = strtolower($dept->dept_abbreviation ?? '');
            $name   = strtolower($dept->dept_name ?? '');
            $source = null;

            if (isset(self::SOURCE_MAP[$abbr])) {
                $source = self::SOURCE_MAP[$abbr];
            } elseif (str_contains($name, 'slaughter')) {
                $source = 'sh';
            } elseif (str_contains($name, 'college') || str_contains($name, 'opol community')) {
                $source = 'occ';
            } elseif (str_contains($name, 'market')) {
                $source = 'pm';
            }

            if ($source) {
                $result[] = [
                    'source'    => $source,
                    'dept_id'   => $dept->dept_id,
                    'dept_name' => $dept->dept_name,
                    'dept_abbreviation' => $dept->dept_abbreviation,
                    // Display label e.g. "Mun. Eco. Entrpse., PUBLIC MARKET"
                    'label'     => 'Mun. Eco. Entrpse., ' . strtoupper($dept->dept_name),
                ];
            }
        }

        return $result;
    }

    /**
     * Get LDRRMF summary (qrf_30, preparedness_70, total_5pct, calamity_fund)
     * for a given plan + source.
     */
    private function getSummaryForPlan(?int $planId, string $source): array
    {
        if (!$planId) {
            return ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0, 'calamity_fund' => 0];
        }

        // A. Sum of all items (70%)
        $total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
            ->where('source', $source)
            ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')
            ->value('grand');

        // C. 5% of Total Available Resources
        $calamityFund = $this->computeCalamityFund($planId, $source);

        // B. Reserved 30%
        $reserved30 = $calamityFund - $total70;

        return [
            'qrf_30'          => round($reserved30,   2),  // B (30% QRF)
            'preparedness_70' => round($total70,       2),  // A (70% items sum)
            'total_5pct'      => round($calamityFund,  2),  // C (total calamity fund)
            'calamity_fund'   => round($calamityFund,  2),
        ];
    }

    /**
     * Get current year data with sem1/sem2 split.
     * sem1 = sem1_actual from income_fund_amounts for that source's calamity fund object.
     * We approximate: sem1 = actual amounts from income_fund_amounts,
     * sem2 = total current − sem1.
     */
    private function getCurrentYearData(?int $planId, string $source): array
    {
        $empty = [
            'qrf_30_sem1'  => 0, 'qrf_30_sem2'  => 0, 'qrf_30_total'  => 0,
            'prep_70_sem1' => 0, 'prep_70_sem2' => 0, 'prep_70_total' => 0,
            'total_sem1'   => 0, 'total_sem2'   => 0, 'total_5pct'    => 0,
        ];

        if (!$planId) return $empty;

        // Get the 5% calamity fund total for current year
        $calamity = $this->computeCalamityFund($planId, $source);
        $total70  = (float) LdrrmfipItem::where('budget_plan_id', $planId)
            ->where('source', $source)
            ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')
            ->value('grand');
        $reserved30 = $calamity - $total70;

        // For sem1/sem2: read from income_fund_amounts actual columns
        // Sum all sem1_actual for this source (excluding non-income receipts)
        $nonIncomeParent = DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

        $excludeIds = [];
        if ($nonIncomeParent) {
            $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
            $excludeIds[] = $nonIncomeParent->id;
        }

        $q = DB::table('income_fund_amounts')
            ->where('budget_plan_id', $planId)
            ->where('source', $source);

        if (!empty($excludeIds)) {
            $q->whereNotIn('income_fund_object_id', $excludeIds);
        }

        $sem1GrandTotal = (float) $q->sum('sem1_actual');
        $sem1Calamity   = round($sem1GrandTotal * 0.05, 2);
        $sem2Calamity   = round($calamity - $sem1Calamity, 2);

        // Split 30/70 proportionally
        $qrf30Sem1 = round($sem1Calamity * 0.30, 2);
        $qrf30Sem2 = round($sem2Calamity * 0.30, 2);
        $prep70Sem1 = round($sem1Calamity * 0.70, 2);
        $prep70Sem2 = round($sem2Calamity * 0.70, 2);

        return [
            'qrf_30_sem1'  => $qrf30Sem1,
            'qrf_30_sem2'  => $qrf30Sem2,
            'qrf_30_total' => round($reserved30, 2),
            'prep_70_sem1' => $prep70Sem1,
            'prep_70_sem2' => $prep70Sem2,
            'prep_70_total'=> round($total70, 2),
            'total_sem1'   => round($sem1Calamity, 2),
            'total_sem2'   => round($sem2Calamity, 2),
            'total_5pct'   => round($calamity, 2),
        ];
    }

    /**
     * Compute 5% of "Total Available Resources" for a given source.
     * Mirrors LdrrmfipController::computeCalamityFund().
     */
    private function computeCalamityFund(int $planId, string $source): float
    {
        $nonIncomeParent = DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

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

        return round((float) $query->sum('proposed_amount') * 0.05, 2);
    }

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