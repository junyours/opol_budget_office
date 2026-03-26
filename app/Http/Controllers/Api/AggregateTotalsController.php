<?php

namespace App\Http\Controllers\Api;

use App\Services\AggregateTotalsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * AggregateTotalsController
 *
 * REST resource for named aggregate totals.
 *
 * Route registration (in api.php):
 *
 *   // Static named routes BEFORE apiResource
 *   Route::get('totals/keys',                 [AggregateTotalsController::class, 'keys']);
 *   Route::get('totals/income-fund-derived',  [AggregateTotalsController::class, 'incomeFundDerived']);
 *
 *   Route::apiResource('totals', AggregateTotalsController::class)
 *       ->parameters(['totals' => 'key'])
 *       ->only(['index', 'show']);
 *
 * Endpoints:
 *   GET /api/totals/keys                → list of { key, label } — no DB hit
 *   GET /api/totals/income-fund-derived → derived values (NTA 20%, LDRRMF 5%, etc.)
 *   GET /api/totals                     → all PS totals for a plan
 *   GET /api/totals/{key}               → single PS total by key
 *
 * Optional query param for all endpoints:
 *   ?budget_plan_id=3   → use a specific plan instead of the active one
 */
class AggregateTotalsController extends BaseApiController
{
    public function __construct(private readonly AggregateTotalsService $service) {}

    // ── GET /api/totals/keys ─────────────────────────────────────────────────

    /**
     * Return all registered key → label pairs. No DB queries.
     */
    public function keys(): JsonResponse
    {
        $labels  = $this->service->labels();
        $payload = array_map(
            fn ($key, $label) => ['key' => $key, 'label' => $label],
            array_keys($labels),
            array_values($labels)
        );

        return $this->success($payload);
    }

    // ── GET /api/totals ──────────────────────────────────────────────────────

    /**
     * Return every PS aggregate total for the resolved budget plan.
     */
    public function index(Request $request): JsonResponse
    {
        $budgetPlanId = $this->resolvePlanId($request);
        if ($budgetPlanId === null) return $this->noPlan();

        $raw    = $this->service->computeMultiple($budgetPlanId);
        $labels = $this->service->labels();

        $totals = array_map(
            fn ($key, $total) => ['key' => $key, 'label' => $labels[$key], 'total' => $total],
            array_keys($raw),
            array_values($raw)
        );

        return $this->success([
            'budget_plan_id' => $budgetPlanId,
            'totals'         => $totals,
        ]);
    }

    // ── GET /api/totals/{key} ────────────────────────────────────────────────

    /**
     * Return one PS total by its registered key.
     */
    public function show(Request $request, string $key): JsonResponse
    {
        if (!in_array($key, $this->service->keys(), true)) {
            return response()->json([
                'success'        => false,
                'message'        => "Unknown total key \"{$key}\".",
                'available_keys' => $this->service->keys(),
            ], 404);
        }

        $budgetPlanId = $this->resolvePlanId($request);
        if ($budgetPlanId === null) return $this->noPlan();

        $total  = $this->service->compute($budgetPlanId, $key);
        $labels = $this->service->labels();

        return $this->success([
            'key'            => $key,
            'label'          => $labels[$key],
            'total'          => $total,
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ── GET /api/totals/income-fund-derived ──────────────────────────────────

    /**
     * Read-only counterpart to Form6Controller::syncFromOther().
     *
     * Computes all income-fund-derived values (20% NTA, 5% LDRRMF, debt
     * services, aid to barangays, infrastructure program, QRF, PDA) and
     * returns them WITH their intermediate inputs so the frontend can render
     * "how was this computed" tooltips.
     *
     * Does NOT write anything — purely a GET.
     *
     * Returns:
     *   nta_proposed        – Raw NTA proposed amount (source for ldf_20pct)
     *   ldf_20pct           – National Tax Allotment × 20%
     *   grand_total_income  – Raw grand total income (source for ldrrmf_5pct)
     *   ldrrmf_5pct         – Grand Total Income × 5%
     *   qrf_30pct           – LDRRMF × 30%
     *   pda_70pct           – LDRRMF × 70%
     *   debt_services       – Σ (principal_due + interest_due)
     *   infrastructure_program – ldf_20pct − debt_services
     *   aid_to_barangays    – AIP "Aid to Barangay" total
     */
    public function incomeFundDerived(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'sometimes|integer|exists:budget_plans,budget_plan_id',
        ]);

        $budgetPlanId = $this->resolvePlanId($request);
        if ($budgetPlanId === null) return $this->noPlan();

        // ── 1. NTA proposed amount ────────────────────────────────────────
        $ntaObject = DB::table('income_fund_objects')
            ->whereRaw("LOWER(name) LIKE '%national tax allotment%'")
            ->first(['id']);

        $ntaProposed = 0.0;
        if ($ntaObject) {
            $ntaProposed = (float) DB::table('income_fund_amounts')
                ->where('budget_plan_id', $budgetPlanId)
                ->where('income_fund_object_id', $ntaObject->id)
                ->where('source', 'general-fund')
                ->value('proposed_amount');
        }

        // ── 2. Grand total of general-fund income ─────────────────────────
        $nonIncomeParent = DB::table('income_fund_objects')
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

        $excludeIds = [];
        if ($nonIncomeParent) {
            $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
            $excludeIds[] = $nonIncomeParent->id;
        }

        $grandTotalQuery = DB::table('income_fund_amounts')
            ->where('budget_plan_id', $budgetPlanId)
            ->where('source', 'general-fund');

        if (!empty($excludeIds)) {
            $grandTotalQuery->whereNotIn('income_fund_object_id', $excludeIds);
        }

        $grandTotal = (float) $grandTotalQuery->sum('proposed_amount');

        // ── 3. Debt services ──────────────────────────────────────────────
        $debtSvc = (float) DB::table('debt_payments')
            ->where('budget_plan_id', $budgetPlanId)
            ->selectRaw('COALESCE(SUM(principal_due + interest_due), 0) as total')
            ->value('total');

        // ── 4. Aid to Barangays ───────────────────────────────────────────
        $deptPlanIds = DB::table('department_budget_plans')
            ->where('budget_plan_id', $budgetPlanId)
            ->pluck('dept_budget_plan_id');

        $aidToBarangay = 0.0;
        if ($deptPlanIds->isNotEmpty()) {
            $aidProgramIds = DB::table('aip_programs')
                ->whereRaw("LOWER(program_description) LIKE '%aid to barangay%'")
                ->pluck('aip_program_id');

            if ($aidProgramIds->isNotEmpty()) {
                $aidToBarangay = (float) DB::table('dept_bp_form4_items')
                    ->whereIn('dept_budget_plan_id', $deptPlanIds)
                    ->whereIn('aip_program_id', $aidProgramIds)
                    ->sum('total_amount');
            }
        }

        // ── 5. Derived values ─────────────────────────────────────────────
        $ldf20    = round($ntaProposed * 0.20, 2);
        $ldrrmf5  = round($grandTotal  * 0.05, 2);
        $qrf30    = round($ldrrmf5     * 0.30, 2);
        $pda70    = round($ldrrmf5     * 0.70, 2);
        $debtRnd  = round($debtSvc,             2);
        $infra    = ($ldf20 > 0 && $debtRnd > 0)
                      ? round($ldf20 - $debtRnd, 2)
                      : 0.0;

        return $this->success([
            'budget_plan_id'        => $budgetPlanId,

            // Source values (raw inputs)
            'nta_proposed'          => $ntaProposed,
            'grand_total_income'    => $grandTotal,
            'debt_services'         => $debtRnd,
            'aid_to_barangays'      => round($aidToBarangay, 2),

            // Derived values
            'ldf_20pct'             => $ldf20,
            'infrastructure_program'=> $infra,
            'ldrrmf_5pct'           => $ldrrmf5,
            'qrf_30pct'             => $qrf30,
            'pda_70pct'             => $pda70,
        ]);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    private function resolvePlanId(Request $request): ?int
    {
        if ($request->filled('budget_plan_id')) {
            return (int) $request->input('budget_plan_id');
        }
        return $this->service->activeBudgetPlanId();
    }

    private function noPlan(): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => 'No active budget plan found. Pass ?budget_plan_id= to specify one.',
        ], 404);
    }

    /**
     * Recursively collect descendant IDs of an income_fund_object.
     * @return int[]
     */
    private function collectDescendantIds(int $parentId): array
    {
        $ids = [];
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