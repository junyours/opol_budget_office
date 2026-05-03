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
            // ── Past year totals — uses obligation_amount ──────────────────
            $pastData = $pastPlan
                ? $this->getPastYearSummary($pastPlan->budget_plan_id, $source)
                : ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0];

            // ── Current year — uses sem1_amount / sem2_amount / total_amount
            $currentData = $this->getCurrentYearData($currentPlan?->budget_plan_id, $source);

            // ── Budget year — uses total_amount column ─────────────────────
            $budgetData = $this->getBudgetYearSummary($activePlan->budget_plan_id, $source);

            // ── 70% items for budget year ──────────────────────────────────
            // ── Items per year (description-keyed for matching across years) ───────────
$budgetItems = LdrrmfipItem::where('budget_plan_id', $activePlan->budget_plan_id)
    ->where('source', $source)
    ->where('description', '!=', '__QRF_30__')
    ->with('category')
    ->orderBy('ldrrmfip_item_id')
    ->get()
    ->keyBy('description');

$pastItems = $pastPlan
    ? LdrrmfipItem::where('budget_plan_id', $pastPlan->budget_plan_id)
        ->where('source', $source)
        ->where('description', '!=', '__QRF_30__')
        ->with('category')
        ->get()
        ->keyBy('description')
    : collect();

$currentItems = $currentPlan
    ? LdrrmfipItem::where('budget_plan_id', $currentPlan->budget_plan_id)
        ->where('source', $source)
        ->where('description', '!=', '__QRF_30__')
        ->with('category')
        ->orderBy('ldrrmfip_item_id')
        ->get()
    : collect();

// Union of all descriptions across all three years so nothing is lost
$allDescriptions = $currentItems->pluck('description')
    ->merge($budgetItems->keys())
    ->merge($pastItems->keys())
    ->unique()
    ->values();

$currentItemsByDesc = $currentItems->keyBy('description');

$items = $allDescriptions->map(function ($desc) use (
    $budgetItems, $pastItems, $currentItemsByDesc
) {
    $budgetItem   = $budgetItems->get($desc);
    $pastItem     = $pastItems->get($desc);
    $currentItem  = $currentItemsByDesc->get($desc);

    // Use budget item for metadata if available, else fall back to current item
    // Use budget item for metadata if available, else current, else past
    $meta = $budgetItem ?? $currentItem ?? $pastItem;
    if (!$meta) return null;

    return [
        'ldrrmfip_item_id'    => $budgetItem?->ldrrmfip_item_id ?? $currentItem?->ldrrmfip_item_id ?? $pastItem?->ldrrmfip_item_id,
        'description'         => $desc,
        'category_name'       => $meta->category?->name ?? null,
        'implementing_office' => $meta->implementing_office ?? 'LDRRMO',
        // Past year — obligation_amount
        'obligation_amount'   => (float) ($pastItem?->obligation_amount ?? 0),
        // Current year
        'sem1_amount'         => (float) ($currentItem?->sem1_amount  ?? 0),
        'sem2_amount'         => (float) ($currentItem?->sem2_amount  ?? 0),
        'total_amount'        => (float) ($currentItem?->total_amount ?? 0),
        // Budget year — mooe + co (0 if item doesn't exist in budget year yet)
        'mooe'                => (float) ($budgetItem?->mooe         ?? 0),
'co'                  => (float) ($budgetItem?->co           ?? 0),
'total'               => (float) ($budgetItem?->total_amount ?? 0),
    ];
})->filter()->values();

// Read QRF stored amounts for editable past/current columns
$qrfPastItem    = $pastPlan
    ? LdrrmfipItem::where('budget_plan_id', $pastPlan->budget_plan_id)
        ->where('source', $source)->where('description', '__QRF_30__')->first()
    : null;
$qrfCurrentItem = $currentPlan
    ? LdrrmfipItem::where('budget_plan_id', $currentPlan->budget_plan_id)
        ->where('source', $source)->where('description', '__QRF_30__')->first()
    : null;

$sections[] = [
    'source'      => $source,
    'dept_name'   => $sa['dept_name'],
    'label'       => $sa['label'],
    'past'        => $pastData,
    'current'     => $currentData,
    'budget_year' => $budgetData,
    'items'       => $items,
    'qrf_past_obligation' => (float) ($qrfPastItem?->obligation_amount ?? 0),
'qrf_current_sem1'    => (float) ($qrfCurrentItem?->sem1_amount    ?? 0),
'qrf_current_sem2'    => (float) ($currentData['qrf_30_total'] - ($qrfCurrentItem?->sem1_amount ?? 0)),
'qrf_current_total'   => (float) $currentData['qrf_30_total'],
'qrf_past_plan_id'    => $pastPlan?->budget_plan_id,
'qrf_current_plan_id' => $currentPlan?->budget_plan_id,
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
            'past_plan_id'     => $pastPlan?->budget_plan_id,
            'current_plan_id'  => $currentPlan?->budget_plan_id,
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
    /**
     * Budget year summary — uses total_amount column.
     */
    private function getBudgetYearSummary(?int $planId, string $source): array
    {
        if (!$planId) {
            return ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0, 'calamity_fund' => 0];
        }

        $total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
    ->where('source', $source)
    ->where('description', '!=', '__QRF_30__')
    ->selectRaw('COALESCE(SUM(total_amount), 0) as grand')
    ->value('grand');

        $calamityFund = $this->computeCalamityFund($planId, $source);
        $reserved30   = $calamityFund - $total70;

        return [
            'qrf_30'          => round($reserved30,  2),
            'preparedness_70' => round($total70,      2),
            'total_5pct'      => round($calamityFund, 2),
            'calamity_fund'   => round($calamityFund, 2),
        ];
    }

    /**
     * Past year summary — uses obligation_amount column.
     */
    private function getPastYearSummary(?int $planId, string $source): array
    {
        if (!$planId) {
            return ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0, 'calamity_fund' => 0];
        }

        $total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
            ->where('source', $source)
            ->where('description', '!=', '__QRF_30__')
            ->selectRaw('COALESCE(SUM(obligation_amount), 0) as grand')
            ->value('grand');

        $qrfItem = LdrrmfipItem::where('budget_plan_id', $planId)
            ->where('source', $source)
            ->where('description', '__QRF_30__')
            ->first();
        $qrf30 = $qrfItem ? (float) $qrfItem->obligation_amount : 0.0;

        $calamityFund = $this->computeCalamityFund($planId, $source);

        return [
            'qrf_30'          => $qrf30,
            'preparedness_70' => round($total70,      2),
            'total_5pct'      => round($calamityFund, 2),
            'calamity_fund'   => round($calamityFund, 2),
        ];
    }

    /**
     * Get current year data with sem1/sem2 split.

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
        // Get the 5% calamity fund total for current year
        // total_amount = current year total per item (sem1 + sem2)
$total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
    ->where('source', $source)
    ->where('description', '!=', '__QRF_30__')
    ->selectRaw('COALESCE(SUM(total_amount), 0) as grand')
    ->value('grand');

$sem1Total = (float) LdrrmfipItem::where('budget_plan_id', $planId)
    ->where('source', $source)
    ->where('description', '!=', '__QRF_30__')
    ->selectRaw('COALESCE(SUM(sem1_amount), 0) as grand')
    ->value('grand');

$sem2Total = (float) LdrrmfipItem::where('budget_plan_id', $planId)
    ->where('source', $source)
    ->where('description', '!=', '__QRF_30__')
    ->selectRaw('COALESCE(SUM(sem2_amount), 0) as grand')
    ->value('grand');

// QRF 30% is derived proportionally from the 70% item totals
// total_5pct = total70 / 0.70,  reserved30 = total_5pct * 0.30
$total5pct  = $total70 > 0 ? round($total70 / 0.70, 2) : 0;
$reserved30 = round($total5pct * 0.30, 2);

// QRF sem split: proportional to 70% sem split ratio
$ratio      = $total70 > 0 ? ($sem1Total / $total70) : 0;
$qrf30Sem1  = round($reserved30 * $ratio, 2);
$qrf30Sem2  = round($reserved30 - $qrf30Sem1, 2);

return [
    'qrf_30_sem1'   => $qrf30Sem1,
    'qrf_30_sem2'   => $qrf30Sem2,
    'qrf_30_total'  => $reserved30,
    'prep_70_sem1'  => round($sem1Total, 2),
    'prep_70_sem2'  => round($sem2Total, 2),
    'prep_70_total' => round($total70, 2),
    'total_sem1'    => round($sem1Total + $qrf30Sem1, 2),
    'total_sem2'    => round($sem2Total + $qrf30Sem2, 2),
    'total_5pct'    => $total5pct,
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

    public function consolidated(Request $request): JsonResponse
{
    return $this->index($request);
}
}
