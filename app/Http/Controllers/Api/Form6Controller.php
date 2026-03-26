<?php

namespace App\Http\Controllers\Api;

use App\Models\Form6Item;
use App\Models\Form6Template;
use App\Services\AggregateTotalsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Form6Controller  (General Fund)
 *
 * All operations are scoped to source = 'general-fund'.
 * Special Accounts use Form6SpecialController, which extends this class
 * and overrides the source resolution.
 *
 * Routes (registered in api.php):
 *   GET    /api/form6                  index
 *   POST   /api/form6                  store
 *   PUT    /api/form6/{form6Item}       update
 *   DELETE /api/form6/{form6Item}       destroy
 *   GET    /api/form6/templates         templates
 *   POST   /api/form6/init              init
 *   POST   /api/form6/bulk              bulk
 *   POST   /api/form6/sync-from-ps      syncFromPs
 *   POST   /api/form6/sync-from-other   syncFromOther
 */
class Form6Controller extends BaseApiController
{
    /**
     * Maps Form 6 template code → AggregateTotalsService key (PS-derived).
     */
    private const CODE_TO_AGGREGATE_KEY = [
        '1.2' => 'terminalLeave',
        '1.3' => 'otherPersonnelBenefits',
        '1.5' => 'ecip',
        '1.6' => 'philHealth',
        '1.7' => 'pagIbig',
        '1.8' => 'retirementAndLifeInsurance',
        // '1.1' => 'retirementGratuity',  // uncomment when seeded
    ];

    public function __construct(private readonly AggregateTotalsService $totalsService) {}

    // ── Source resolution ─────────────────────────────────────────────────────

    /**
     * The source string scoping all items managed by this controller.
     * Subclasses override this to return a special-account key.
     */
    protected function resolveSource(Request $request): string
    {
        return $request->input('source', 'general-fund');
    }

    // ── index ─────────────────────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'sometimes|string|max:50',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $source       = $this->resolveSource($request);

        $items = Form6Item::where('budget_plan_id', $budgetPlanId)
            ->where('source', $source)
            ->get()
            ->keyBy('form6_template_id');

        $rows = Form6Template::orderBy('sort_order')
            ->get()
            ->map(fn (Form6Template $tpl) => $this->mergeRow($tpl, $items->get($tpl->form6_template_id), $budgetPlanId, $source));

        return response()->json([
            'success'        => true,
            'data'           => $rows,
            'records_exist'  => $items->isNotEmpty(),
            'source'         => $source,
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ── store ─────────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_id'    => 'required|integer|exists:budget_plans,budget_plan_id',
            'form6_template_id' => 'required|integer|exists:form6_templates,form6_template_id',
            'amount'            => 'required|numeric|min:0',
            'source'            => 'sometimes|string|max:50',
        ]);

        $userId = $request->user()?->user_id;
        $source = $this->resolveSource($request);

        $item = Form6Item::updateOrCreate(
            [
                'budget_plan_id'    => $validated['budget_plan_id'],
                'form6_template_id' => $validated['form6_template_id'],
                'source'            => $source,
            ],
            [
                'amount'     => $validated['amount'],
                'created_by' => $userId,
                'updated_by' => $userId,
            ]
        );

        return $this->success($item, $item->wasRecentlyCreated ? 201 : 200);
    }

    // ── update ────────────────────────────────────────────────────────────────

    public function update(Request $request, Form6Item $form6Item): JsonResponse
    {
        $validated = $request->validate([
            'amount' => 'required|numeric|min:0',
        ]);

        $form6Item->update([
            'amount'     => $validated['amount'],
            'updated_by' => $request->user()?->user_id,
        ]);

        return $this->success($form6Item);
    }

    // ── destroy ───────────────────────────────────────────────────────────────

    public function destroy(Form6Item $form6Item): JsonResponse
    {
        $form6Item->delete();
        return $this->success(['message' => 'Deleted.']);
    }

    // ── templates ─────────────────────────────────────────────────────────────

    public function templates(): JsonResponse
    {
        return $this->success(Form6Template::orderBy('sort_order')->get());
    }

    // ── init ──────────────────────────────────────────────────────────────────

    public function init(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'sometimes|string|max:50',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $source       = $this->resolveSource($request);
        $userId       = $request->user()?->user_id;

        DB::transaction(function () use ($budgetPlanId, $source, $userId) {
            foreach (Form6Template::all() as $tpl) {
                Form6Item::firstOrCreate(
                    [
                        'budget_plan_id'    => $budgetPlanId,
                        'form6_template_id' => $tpl->form6_template_id,
                        'source'            => $source,
                    ],
                    [
                        'amount'     => 0,
                        'created_by' => $userId,
                        'updated_by' => $userId,
                    ]
                );
            }
        });

        return $this->success([
            'message'        => 'Form 6 initialised.',
            'source'         => $source,
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ── bulk ──────────────────────────────────────────────────────────────────

    public function bulk(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_id'            => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'                    => 'sometimes|string|max:50',
            'items'                     => 'required|array|min:1',
            'items.*.form6_template_id' => 'required|integer|exists:form6_templates,form6_template_id',
            'items.*.amount'            => 'required|numeric|min:0',
        ]);

        $userId = $request->user()?->user_id;
        $planId = $validated['budget_plan_id'];
        $source = $this->resolveSource($request);

        DB::transaction(function () use ($validated, $planId, $source, $userId) {
            foreach ($validated['items'] as $row) {
                Form6Item::updateOrCreate(
                    [
                        'budget_plan_id'    => $planId,
                        'form6_template_id' => $row['form6_template_id'],
                        'source'            => $source,
                    ],
                    [
                        'amount'     => $row['amount'],
                        'created_by' => $userId,
                        'updated_by' => $userId,
                    ]
                );
            }
        });

        return $this->success(['message' => 'Saved successfully.']);
    }

    // ── sync-from-ps ──────────────────────────────────────────────────────────

    /**
     * POST /api/form6/sync-from-ps
     *
     * For General Fund: aggregates PS across all non-Special-Account departments.
     * Subclasses override to scope to a single special-account department.
     */
    public function syncFromPs(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'sometimes|string|max:50',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $source       = $this->resolveSource($request);
        $userId       = $request->user()?->user_id;

        $aggregateKeys = array_unique(array_values(self::CODE_TO_AGGREGATE_KEY));
        $totals        = $this->totalsService->computeMultiple($budgetPlanId, $aggregateKeys);

        $codeAmounts = [];
        foreach (self::CODE_TO_AGGREGATE_KEY as $code => $aggKey) {
            $codeAmounts[$code] = round($totals[$aggKey] ?? 0.0, 2);
        }

        $templates = Form6Template::whereIn('code', array_keys($codeAmounts))
            ->get()
            ->keyBy('code');

        DB::transaction(function () use ($codeAmounts, $templates, $budgetPlanId, $source, $userId) {
            foreach ($codeAmounts as $code => $amount) {
                $tpl = $templates->get($code);
                if (!$tpl) continue;

                Form6Item::updateOrCreate(
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
            'message'        => 'PS totals synced to Form 6.',
            'source'         => $source,
            'synced_codes'   => array_keys($codeAmounts),
            'debug_totals'   => $totals,
            'data'           => $this->freshRows($budgetPlanId, $source),
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ── sync-from-other ───────────────────────────────────────────────────────

    /**
     * POST /api/form6/sync-from-other
     *
     * For General Fund: pulls NTA / debt / LDRRMF / AIP.
     * For Special Accounts the subclass overrides this method, substituting
     * the income-fund grand total scoped to the special-account source.
     */
    public function syncFromOther(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'sometimes|string|max:50',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $source       = $this->resolveSource($request);
        $userId       = $request->user()?->user_id;

        // ── 1. NTA proposed amount ─────────────────────────────────────────
        $ntaObject   = DB::table('income_fund_objects')
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

        // ── 2. Grand total income (for 5% LDRRMF) ─────────────────────────
        $grandTotal  = $this->incomeGrandTotal($budgetPlanId, 'general-fund');

        // ── 3. Debt services ───────────────────────────────────────────────
        $debtSvc = (float) DB::table('debt_payments')
            ->where('budget_plan_id', $budgetPlanId)
            ->selectRaw('COALESCE(SUM(principal_due + interest_due), 0) as total')
            ->value('total');

        // ── 4. Aid to Barangays ────────────────────────────────────────────
        $aidToBarangay = $this->aidToBarangays($budgetPlanId);

        // ── 5. Derived values ──────────────────────────────────────────────
        $ldf20          = round($ntaProposed * 0.20, 2);
        $ldrrmf5        = round($grandTotal   * 0.05, 2);
        $qrf30          = round($ldrrmf5      * 0.30, 2);
        $pda70          = round($ldrrmf5      * 0.70, 2);
        $debtSvcRounded = round($debtSvc,             2);
        $aidBargy       = round($aidToBarangay,        2);
        $infraProgram   = ($ldf20 > 0 && $debtSvcRounded > 0)
                            ? round($ldf20 - $debtSvcRounded, 2)
                            : 0.0;

        $synced = $this->upsertOtherRows(
            $budgetPlanId, $source, $userId,
            $ldf20, $debtSvcRounded, $infraProgram,
            $ldrrmf5, $qrf30, $pda70, $aidBargy
        );

        return response()->json([
            'success'      => true,
            'message'      => 'Form 6 values synced from Income Fund, Debt Services, and AIP.',
            'source'       => $source,
            'warnings'     => $synced['warnings'],
            'debug' => [
                'nta_proposed'           => $ntaProposed,
                'ldf_20pct'              => $ldf20,
                'grand_total_income'     => $grandTotal,
                'ldrrmf_5pct'            => $ldrrmf5,
                'qrf_30pct'              => $qrf30,
                'pda_70pct'              => $pda70,
                'debt_services'          => $debtSvcRounded,
                'aid_to_barangays'       => $aidBargy,
                'infrastructure_program' => $infraProgram,
            ],
            'data'           => $this->freshRows($budgetPlanId, $source),
            'budget_plan_id' => $budgetPlanId,
        ]);
    }

    // ── Protected helpers (overridable by subclasses) ─────────────────────────

    /**
     * Compute grand total of income for a given income-fund source,
     * excluding the Non-Income Receipts subtree.
     */
    protected function incomeGrandTotal(int $planId, string $incomeSource): float
    {
        $nonIncomeParent = DB::table('income_fund_objects')
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

        $excludeIds = [];
        if ($nonIncomeParent) {
            $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
            $excludeIds[] = $nonIncomeParent->id;
        }

        $q = DB::table('income_fund_amounts')
            ->where('budget_plan_id', $planId)
            ->where('source', $incomeSource);

        if (!empty($excludeIds)) {
            $q->whereNotIn('income_fund_object_id', $excludeIds);
        }

        return (float) $q->sum('proposed_amount');
    }

    /**
     * Total Aid-to-Barangays from AIP Form 4 items for this plan.
     */
    protected function aidToBarangays(int $planId): float
    {
        $deptPlanIds = DB::table('department_budget_plans')
            ->where('budget_plan_id', $planId)
            ->pluck('dept_budget_plan_id');

        if ($deptPlanIds->isEmpty()) return 0.0;

        $aidProgramIds = DB::table('aip_programs')
            ->whereRaw("LOWER(program_description) LIKE '%aid to barangay%'")
            ->pluck('aip_program_id');

        if ($aidProgramIds->isEmpty()) return 0.0;

        return (float) DB::table('dept_bp_form4_items')
            ->whereIn('dept_budget_plan_id', $deptPlanIds)
            ->whereIn('aip_program_id', $aidProgramIds)
            ->sum('total_amount');
    }

    /**
     * Upsert the "other" (non-PS) rows into form6_items for a given source.
     * Returns ['warnings' => string[]].
     */
    protected function upsertOtherRows(
        int    $budgetPlanId,
        string $source,
        ?int   $userId,
        float  $ldf20,
        float  $debtSvc,
        float  $infraProgram,
        float  $ldrrmf5,
        float  $qrf30,
        float  $pda70,
        float  $aidBargy,
    ): array {
        $labelMap = [
            '20%'                           => $ldf20,
            'debt service'                  => $debtSvc,
            'infrastructure program'        => $infraProgram,
            'local disaster risk reduction' => $ldrrmf5,
            'quick response'                => $qrf30,
            'pre-disaster'                  => $pda70,
            'financial assistance'          => $aidBargy,
        ];

        $allTemplates = Form6Template::all();
        $warnings     = [];
        $codeAmounts  = [];

        foreach ($labelMap as $fragment => $amount) {
            $matched = $allTemplates->first(
                fn (Form6Template $tpl) => stripos($tpl->label, $fragment) !== false
            );

            if (!$matched) {
                $warnings[] = "No Form 6 template matched label fragment: \"{$fragment}\"";
                continue;
            }

            $codeAmounts[$matched->form6_template_id] = $amount;
        }

        DB::transaction(function () use ($codeAmounts, $budgetPlanId, $source, $userId) {
            foreach ($codeAmounts as $templateId => $amount) {
                Form6Item::updateOrCreate(
                    [
                        'budget_plan_id'    => $budgetPlanId,
                        'form6_template_id' => $templateId,
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

        return ['warnings' => $warnings];
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    protected function freshRows(int $budgetPlanId, string $source): \Illuminate\Support\Collection
    {
        $items = Form6Item::where('budget_plan_id', $budgetPlanId)
            ->where('source', $source)
            ->get()
            ->keyBy('form6_template_id');

        return Form6Template::orderBy('sort_order')
            ->get()
            ->map(fn (Form6Template $tpl) => $this->mergeRow($tpl, $items->get($tpl->form6_template_id), $budgetPlanId, $source));
    }

    protected function mergeRow(Form6Template $tpl, ?Form6Item $item, int $budgetPlanId, string $source): array
    {
        return [
            'form6_template_id' => $tpl->form6_template_id,
            'form6_item_id'     => $item?->form6_item_id,
            'budget_plan_id'    => $budgetPlanId,
            'source'            => $source,
            'code'              => $tpl->code,
            'label'             => $tpl->label,
            'parent_code'       => $tpl->parent_code,
            'sort_order'        => $tpl->sort_order,
            'show_peso_sign'    => $tpl->show_peso_sign,
            'is_section'        => $tpl->is_section,
            'is_computed'       => $tpl->is_computed,
            'level'             => $tpl->level,
            'amount'            => $item ? (float) $item->amount : 0.0,
        ];
    }

    protected function collectDescendantIds(int $parentId): array
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