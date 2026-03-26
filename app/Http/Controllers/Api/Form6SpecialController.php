<?php

namespace App\Http\Controllers\Api;

use App\Models\Department;
use App\Models\DepartmentCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Form6SpecialController
 *
 * Handles Form 6 rows scoped to Special Account departments (OCC, PM, SH).
 *
 * KEY DIFFERENCE vs general-fund Form 6:
 *
 *   General Fund:
 *     - 20% NTA LDF     = NTA (general-fund income object) × 20%
 *     - 5%  LDRRMF      = grand total of general-fund income × 5%
 *     - Debt Services   = sum of debt_payments for this budget plan
 *     - Infrastructure  = 20% NTA − Debt Services
 *
 *   Special Accounts (OCC / PM / SH):
 *     - 20% NTA LDF     = 0  (special accounts do NOT receive NTA)
 *     - Debt Services   = 0  (LGU debt is a general-fund obligation)
 *     - Infrastructure  = 0  (no NTA, no LDF to allocate)
 *     - 5%  LDRRMF      = grand total of THIS special-account's own income × 5%
 *                         (income_fund_amounts WHERE source = 'occ'|'pm'|'sh')
 *     - Aid to Brgy     = AIP Form 4 items for this specific dept only
 *
 * Income data per source is stored in income_fund_amounts.source just like
 * IncomeFundController does — we simply scope every query by $source.
 */
class Form6SpecialController extends Form6Controller
{
    /**
     * Column name on expense_class_items for the human-readable label.
     * Migration: $table->string('expense_class_item_name')
     */
    private const ITEM_NAME_COL = 'expense_class_item_name';

    // ─── Source resolution ────────────────────────────────────────────────────

    protected function resolveSource(Request $request): string
    {
        return $request->input('source', 'occ');
    }

    // ─── sources ──────────────────────────────────────────────────────────────

    /**
     * GET /api/form6-special/sources
     *
     * Returns Special Account departments as tab descriptors.
     * Shape mirrors LdrrmfipController::sources().
     */
    public function sources(): JsonResponse
    {
        $specialCatId = DepartmentCategory::where('dept_category_name', 'Special Accounts')
            ->value('dept_category_id');

        if (!$specialCatId) {
            return $this->success([]);
        }

        $depts   = Department::where('dept_category_id', $specialCatId)
            ->orderBy('dept_id')
            ->get(['dept_id', 'dept_name', 'dept_abbreviation']);

        $sources = [];
        foreach ($depts as $dept) {
            $key = $this->sourceKeyForDept($dept->dept_abbreviation, $dept->dept_name);
            if ($key) {
                $sources[] = [
                    'id'                => $key,
                    'label'             => $dept->dept_name,
                    'type'              => 'special',
                    'dept_id'           => $dept->dept_id,
                    'dept_abbreviation' => $dept->dept_abbreviation,
                ];
            }
        }

        return $this->success($sources);
    }

    // ─── sync-from-ps ─────────────────────────────────────────────────────────

    /**
     * POST /api/form6-special/sync-from-ps
     *
     * Scopes PS totals to the one department that operates this special fund.
     * Sums dept_bp_form2_items by matching expense_class_item_name fragments.
     */
    public function syncFromPs(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'required|string|max:50',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $source       = $this->resolveSource($request);
        $userId       = $request->user()?->user_id;

        $deptId      = $this->deptIdForSource($source);
        $codeAmounts = [];

        if ($deptId) {
            $deptPlanId = DB::table('department_budget_plans')
                ->where('budget_plan_id', $budgetPlanId)
                ->where('dept_id', $deptId)
                ->value('dept_budget_plan_id');

            if ($deptPlanId) {
                $codeAmounts = $this->psTotalsForDeptPlan((int) $deptPlanId);
            }
        }

        $templates = \App\Models\Form6Template::whereIn('code', array_keys($codeAmounts))
            ->get()
            ->keyBy('code');

        DB::transaction(function () use ($codeAmounts, $templates, $budgetPlanId, $source, $userId) {
            foreach ($codeAmounts as $code => $amount) {
                $tpl = $templates->get($code);
                if (!$tpl) continue;
                \App\Models\Form6Item::updateOrCreate(
                    [
                        'budget_plan_id'    => $budgetPlanId,
                        'form6_template_id' => $tpl->form6_template_id,
                        'source'            => $source,
                    ],
                    [
                        'amount'     => $amount,
                        'updated_by' => $userId,
                        'created_by' => $userId,
                    ]
                );
            }
        });

        return response()->json([
            'success'        => true,
            'message'        => 'PS totals synced for special account.',
            'source'         => $source,
            'synced_codes'   => array_keys($codeAmounts),
            'data'           => $this->freshRows($budgetPlanId, $source),
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ─── sync-from-other ──────────────────────────────────────────────────────

    /**
     * POST /api/form6-special/sync-from-other
     *
     * Special accounts have their OWN income fund data stored in
     * income_fund_amounts WHERE source = 'occ'|'pm'|'sh'.
     *
     * This mirrors exactly how IncomeFundController scopes its queries:
     *   GET /income-fund?source=occ  → reads income_fund_objects + income_fund_amounts WHERE source='occ'
     *
     * Derivation rules for special accounts:
     *   ldf20         = 0   (NTA is a general-fund allotment, not given to special accounts)
     *   debtSvc       = 0   (debt obligations belong to the general fund)
     *   infraProgram  = 0   (derived from ldf20, which is 0)
     *   ldrrmf5       = grand total of THIS source's income_fund_amounts × 5%
     *                   (same exclusion logic: skip Non-Income Receipts subtree)
     *   qrf30         = ldrrmf5 × 30%
     *   pda70         = ldrrmf5 × 70%
     *   aidToBarangay = AIP Form 4 items for this specific department only
     */
    public function syncFromOther(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'required|string|max:50',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $source       = $this->resolveSource($request);
        $userId       = $request->user()?->user_id;

        // ── Special accounts do NOT receive NTA or carry LGU debt ─────────
        $ldf20          = 0.0;
        $debtSvcRounded = 0.0;
        $infraProgram   = 0.0;

        // ── Grand total of THIS special account's own income ──────────────
        // Reads income_fund_amounts WHERE source = $source (e.g. 'occ')
        // This is exactly the same data IncomeFundController shows on the
        // Income Fund page when the user selects the OCC/PM/SH tab.
        $grandTotal = $this->incomeGrandTotal($budgetPlanId, $source);

        // ── 5% LDRRMF based on this special account's income ─────────────
        $ldrrmf5 = round($grandTotal * 0.05, 2);
        $qrf30   = round($ldrrmf5   * 0.30, 2);
        $pda70   = round($ldrrmf5   * 0.70, 2);

        // ── Aid to Barangays — scoped to this specific department ─────────
        $deptId        = $this->deptIdForSource($source);
        $aidToBarangay = $deptId ? $this->aidToBarangaysForDept($budgetPlanId, $deptId) : 0.0;
        $aidBargy      = round($aidToBarangay, 2);

        $synced = $this->upsertOtherRows(
            $budgetPlanId, $source, $userId,
            $ldf20, $debtSvcRounded, $infraProgram,
            $ldrrmf5, $qrf30, $pda70, $aidBargy
        );

        return response()->json([
            'success'  => true,
            'message'  => "Form 6 values synced for special account ({$source}).",
            'source'   => $source,
            'warnings' => $synced['warnings'],
            'debug'    => [
                'note'                   => "NTA/LDF/Debt = 0 for special accounts; LDRRMF based on {$source} income only",
                'grand_total_income'     => $grandTotal,
                'income_source_used'     => $source,
                'ldf_20pct'              => $ldf20,
                'debt_services'          => $debtSvcRounded,
                'infrastructure_program' => $infraProgram,
                'ldrrmf_5pct'            => $ldrrmf5,
                'qrf_30pct'              => $qrf30,
                'pda_70pct'              => $pda70,
                'aid_to_barangays'       => $aidBargy,
            ],
            'data'           => $this->freshRows($budgetPlanId, $source),
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /**
     * Map department abbreviation/name → income-fund source key.
     * Single source of truth — used by sources() and deptIdForSource().
     */
    private function sourceKeyForDept(?string $abbr, ?string $name): ?string
    {
        $a = strtolower($abbr ?? '');
        $n = strtolower($name ?? '');

        if (in_array($a, ['occ', 'pm', 'sh'], true))                            return $a;
        if (str_contains($n, 'slaughter'))                                        return 'sh';
        if (str_contains($n, 'college') || str_contains($n, 'opol community'))  return 'occ';
        if (str_contains($n, 'market'))                                           return 'pm';

        return null;
    }

    /**
     * Resolve dept_id for the given special-account source key.
     */
    private function deptIdForSource(string $source): ?int
    {
        $specialCatId = DepartmentCategory::where('dept_category_name', 'Special Accounts')
            ->value('dept_category_id');

        if (!$specialCatId) return null;

        $depts = Department::where('dept_category_id', $specialCatId)
            ->get(['dept_id', 'dept_name', 'dept_abbreviation']);

        foreach ($depts as $dept) {
            if ($this->sourceKeyForDept($dept->dept_abbreviation, $dept->dept_name) === $source) {
                return $dept->dept_id;
            }
        }

        return null;
    }

    /**
     * Sum PS expense items for one dept_budget_plan, grouped by Form 6 code.
     *
     * Join: dept_bp_form2_items.expense_item_id = expense_class_items.expense_class_item_id
     * Name column: expense_class_item_name  (from migration)
     */
    private function psTotalsForDeptPlan(int $deptPlanId): array
    {
        $col = 'ei.' . self::ITEM_NAME_COL;

        $codeToFragments = [
            '1.2' => ['terminal leave'],
            '1.3' => ['other personnel benefits', 'monetization'],
            '1.5' => ['ecip', 'employees compensation', 'insurance premium'],
            '1.6' => ['philhealth', 'phil health'],
            '1.7' => ['pag-ibig', 'pagibig'],
            '1.8' => ['retirement', 'life insurance'],
        ];

        $results = [];

        foreach ($codeToFragments as $code => $fragments) {
            $amount = DB::table('dept_bp_form2_items as f2')
                ->join('expense_class_items as ei', 'f2.expense_item_id', '=', 'ei.expense_class_item_id')
                ->where('f2.dept_budget_plan_id', $deptPlanId)
                ->where(function ($q) use ($col, $fragments) {
                    foreach ($fragments as $frag) {
                        $q->orWhereRaw("LOWER({$col}) LIKE ?", ["%{$frag}%"]);
                    }
                })
                ->sum('f2.total_amount');

            $results[$code] = round((float) $amount, 2);
        }

        return $results;
    }

    /**
     * Aid-to-Barangays total from AIP Form 4 items for one specific department.
     */
    private function aidToBarangaysForDept(int $planId, int $deptId): float
    {
        $deptPlanId = DB::table('department_budget_plans')
            ->where('budget_plan_id', $planId)
            ->where('dept_id', $deptId)
            ->value('dept_budget_plan_id');

        if (!$deptPlanId) return 0.0;

        $aidProgramIds = DB::table('aip_programs')
            ->whereRaw("LOWER(program_description) LIKE '%aid to barangay%'")
            ->pluck('aip_program_id');

        if ($aidProgramIds->isEmpty()) return 0.0;

        return (float) DB::table('dept_bp_form4_items')
            ->where('dept_budget_plan_id', $deptPlanId)
            ->whereIn('aip_program_id', $aidProgramIds)
            ->sum('total_amount');
    }
}