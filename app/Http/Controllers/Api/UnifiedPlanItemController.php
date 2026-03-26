<?php

namespace App\Http\Controllers\Api;

use App\Models\AipProgram;
use App\Models\UnifiedPlanItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use App\Http\Controllers\Controller;

/**
 * Single controller for all 9 unified plan types.
 *
 * plan_type is injected via route defaults (same as before).
 * Endpoint pattern: GET/POST /api/{slug}-plan  e.g. /api/lcpc-plan
 *
 * URL slugs → plan_type mapping:
 *   lcpc-plan       → lcpc
 *   lydp-plan       → lydp
 *   sc-plan         → sc
 *   mpoc-plan       → mpoc
 *   drugs-plan      → drugs
 *   arts-plan       → arts
 *   aids-plan       → aids
 *   sc-ppa-plan     → sc_ppa
 *   nutrition-plan  → nutrition
 */
class UnifiedPlanItemController extends Controller
{
    // ── GET /api/{slug}-plan?budget_plan_id=X ────────────────────────────────

    public function index(Request $request, string $planType): JsonResponse
    {
        $this->guard($planType);
        $request->validate(['budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id']);

        $items = UnifiedPlanItem::with(['aipProgram', 'department'])
            ->forPlan($request->budget_plan_id)
            ->ofType($planType)
            ->orderBy('sort_order')
            ->orderBy('up_item_id')
            ->get()
            ->map(fn ($i) => $this->format($i));

        $data = $items->where('is_subtotal_row', false);

        return response()->json([
            'data'           => $items,
            'plan_type'      => $planType,
            'total_aip'      => $data->sum('aip_amount'),
            'total_ab'       => $data->sum('ab_amount'),
            'total_ps'       => $data->sum('ps_amount'),
            'total_mooe'     => $data->sum('mooe_amount'),
            'total_co'       => $data->sum('co_amount'),
            'grand_total'    => $data->sum('total_amount'),
            'total_cc_adapt' => $data->sum('cc_adaptation'),
            'total_cc_mitig' => $data->sum('cc_mitigation'),
        ]);
    }

    // ── POST /api/{slug}-plan ─────────────────────────────────────────────────

    public function store(Request $request, string $planType): JsonResponse
    {
        $this->guard($planType);
        $data = $this->validated($request, $planType);
        $data['plan_type'] = $planType;

        if (!empty($data['aip_reference_code']) || !empty($data['program_description'])) {
            $data['aip_program_id'] = $this->resolveAip(
                $data['aip_reference_code'] ?? null,
                $data['program_description'] ?? 'Unnamed',
                $data['dept_id'] ?? null,
            );
        }

        if (!isset($data['sort_order'])) {
            $data['sort_order'] = UnifiedPlanItem::forPlan($data['budget_plan_id'])
                ->ofType($planType)->max('sort_order') + 1;
        }

        unset($data['aip_reference_code']);
        $item = UnifiedPlanItem::create($data);
        $item->load(['aipProgram', 'department']);

        return response()->json(['data' => $this->format($item)], 201);
    }

    // ── PUT /api/{slug}-plan/{id} ─────────────────────────────────────────────

    public function update(Request $request, string $planType, UnifiedPlanItem $upItem): JsonResponse
    {
        $this->guard($planType);

        $data = $request->validate(array_merge(
            $this->sharedRules('sometimes'),
            $this->variantRules($planType, 'sometimes'),
        ));

        if (isset($data['aip_reference_code']) || isset($data['program_description'])) {
            $data['aip_program_id'] = $this->resolveAip(
                $data['aip_reference_code'] ?? $upItem->aipProgram?->aip_reference_code,
                $data['program_description'] ?? $upItem->aipProgram?->program_description ?? 'Unnamed',
                $data['dept_id'] ?? $upItem->dept_id,
            );
            unset($data['aip_reference_code']);
        }

        $upItem->update($data);
        $upItem->load(['aipProgram', 'department']);

        return response()->json(['data' => $this->format($upItem)]);
    }

    // ── DELETE /api/{slug}-plan/{id} ──────────────────────────────────────────

    public function destroy(string $planType, UnifiedPlanItem $upItem): JsonResponse
    {
        $this->guard($planType);
        $upItem->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    // ── POST /api/{slug}-plan/bulk ────────────────────────────────────────────

    public function bulk(Request $request, string $planType): JsonResponse
    {
        $this->guard($planType);
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'items'          => 'required|array|min:1',
        ]);

        $planId = $request->budget_plan_id;

        DB::transaction(function () use ($request, $planId, $planType) {
            foreach ($request->items as $idx => $row) {
                $aipId = null;
                if (!empty($row['aip_reference_code']) || !empty($row['program_description'])) {
                    $aipId = $this->resolveAip(
                        $row['aip_reference_code'] ?? null,
                        $row['program_description'] ?? 'Unnamed',
                        $row['dept_id'] ?? null,
                    );
                }

                UnifiedPlanItem::create(array_merge(
                    $this->sanitize($row, $planType),
                    [
                        'plan_type'      => $planType,
                        'budget_plan_id' => $planId,
                        'aip_program_id' => $aipId,
                        'sort_order'     => $row['sort_order'] ?? $idx,
                    ]
                ));
            }
        });

        return $this->index(new Request(['budget_plan_id' => $planId]), $planType);
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private function guard(string $planType): void
    {
        if (!in_array($planType, UnifiedPlanItem::PLAN_TYPES)) {
            abort(404, "Unknown plan type: {$planType}");
        }
    }

    private function resolveAip(?string $refCode, string $desc, ?int $deptId): int
    {
        if ($refCode) {
            $existing = AipProgram::whereRaw('LOWER(aip_reference_code) = ?', [strtolower(trim($refCode))])->first();
            if ($existing) return $existing->aip_program_id;
        }
        return AipProgram::create([
            'aip_reference_code'  => $refCode,
            'program_description' => $desc,
            'dept_id'             => $deptId ?? 1,
            'is_active'           => true,
        ])->aip_program_id;
    }

    private function sharedRules(string $p = 'required'): array
    {
        return [
            'budget_plan_id'      => "{$p}|integer|exists:budget_plans,budget_plan_id",
            'aip_reference_code'  => 'nullable|string|max:100',
            'program_description' => 'nullable|string',
            'dept_id'             => 'nullable|integer|exists:departments,dept_id',
            'implementing_office' => 'nullable|string|max:255',
            'sector'              => 'nullable|string|max:255',
            'sub_sector'          => 'nullable|string|max:255',
            'start_date'          => 'nullable|string|max:50',
            'completion_date'     => 'nullable|string|max:50',
            'cc_adaptation'       => 'nullable|numeric|min:0',
            'cc_mitigation'       => 'nullable|numeric|min:0',
            'cc_typology_code'    => 'nullable|string|max:100',
            'sort_order'          => 'nullable|integer|min:0',
            'is_subtotal_row'     => 'nullable|boolean',
            'row_label'           => 'nullable|string|max:255',
        ];
    }

    private function variantRules(string $planType, string $p = 'required'): array
    {
        if ($planType === 'nutrition') {
            return [
                'nutrition_issue'     => 'nullable|string',
                'nutrition_objective' => 'nullable|string',
                'nutrition_activity'  => 'nullable|string',
                'nutrition_target'    => 'nullable|string|max:255',
                'lead_office_text'    => 'nullable|string|max:255',
                'ps_amount'           => 'nullable|numeric|min:0',
                'mooe_amount'         => 'nullable|numeric|min:0',
                'co_amount'           => 'nullable|numeric|min:0',
            ];
        }

        if (in_array($planType, UnifiedPlanItem::FUND_PLANS)) {
            return [
                'fund_source'  => ['nullable', Rule::in(['general_fund', 'special_account'])],
                'ps_amount'    => 'nullable|numeric|min:0',
                'mooe_amount'  => 'nullable|numeric|min:0',
                'co_amount'    => 'nullable|numeric|min:0',
            ];
        }

        // Sector plans
        return [
            'target_output_aip' => 'nullable|string',
            'target_output_ab'  => 'nullable|string',
            'aip_amount'        => 'nullable|numeric|min:0',
            'ab_amount'         => 'nullable|numeric|min:0',
        ];
    }

    private function validated(Request $request, string $planType): array
    {
        return $request->validate(array_merge(
            $this->sharedRules('required'),
            $this->variantRules($planType),
        ));
    }

    private function sanitize(array $row, string $planType): array
    {
        $base = [
            'dept_id'             => $row['dept_id'] ?? null,
            'implementing_office' => $row['implementing_office'] ?? null,
            'sector'              => $row['sector'] ?? null,
            'sub_sector'          => $row['sub_sector'] ?? null,
            'program_description' => $row['program_description'] ?? null,
            'start_date'          => $row['start_date'] ?? null,
            'completion_date'     => $row['completion_date'] ?? null,
            'cc_adaptation'       => (float)($row['cc_adaptation'] ?? 0),
            'cc_mitigation'       => (float)($row['cc_mitigation'] ?? 0),
            'cc_typology_code'    => $row['cc_typology_code'] ?? null,
            'is_subtotal_row'     => $row['is_subtotal_row'] ?? false,
            'row_label'           => $row['row_label'] ?? null,
        ];

        if ($planType === 'nutrition') {
            return array_merge($base, [
                'nutrition_issue'     => $row['nutrition_issue'] ?? null,
                'nutrition_objective' => $row['nutrition_objective'] ?? null,
                'nutrition_activity'  => $row['nutrition_activity'] ?? null,
                'nutrition_target'    => $row['nutrition_target'] ?? null,
                'lead_office_text'    => $row['lead_office_text'] ?? null,
                'ps_amount'           => (float)($row['ps_amount'] ?? 0),
                'mooe_amount'         => (float)($row['mooe_amount'] ?? 0),
                'co_amount'           => (float)($row['co_amount'] ?? 0),
            ]);
        }

        if (in_array($planType, UnifiedPlanItem::FUND_PLANS)) {
            return array_merge($base, [
                'fund_source' => $row['fund_source'] ?? 'general_fund',
                'ps_amount'   => (float)($row['ps_amount'] ?? 0),
                'mooe_amount' => (float)($row['mooe_amount'] ?? 0),
                'co_amount'   => (float)($row['co_amount'] ?? 0),
            ]);
        }

        return array_merge($base, [
            'target_output_aip' => $row['target_output_aip'] ?? null,
            'target_output_ab'  => $row['target_output_ab'] ?? null,
            'aip_amount'        => (float)($row['aip_amount'] ?? 0),
            'ab_amount'         => (float)($row['ab_amount'] ?? 0),
        ]);
    }

    private function format(UnifiedPlanItem $i): array
    {
        $total = in_array($i->plan_type, array_merge(UnifiedPlanItem::FUND_PLANS, ['nutrition']))
            ? (float)($i->ps_amount + $i->mooe_amount + $i->co_amount)
            : (float) $i->aip_amount;

        return [
            'up_item_id'          => $i->up_item_id,
            'plan_type'           => $i->plan_type,
            'budget_plan_id'      => $i->budget_plan_id,
            'aip_program_id'      => $i->aip_program_id,
            'aip_reference_code'  => $i->aipProgram?->aip_reference_code,
            'program_description' => $i->program_description ?? $i->aipProgram?->program_description,
            'dept_id'             => $i->dept_id,
            'implementing_office' => $i->office_display,
            'sector'              => $i->sector,
            'sub_sector'          => $i->sub_sector,
            'target_output_aip'   => $i->target_output_aip,
            'target_output_ab'    => $i->target_output_ab,
            'aip_amount'          => (float) $i->aip_amount,
            'ab_amount'           => (float) $i->ab_amount,
            'fund_source'         => $i->fund_source,
            'fund_source_label'   => $i->fund_source_label,
            'ps_amount'           => (float) $i->ps_amount,
            'mooe_amount'         => (float) $i->mooe_amount,
            'co_amount'           => (float) $i->co_amount,
            'total_amount'        => $total,
            'cc_adaptation'       => (float) $i->cc_adaptation,
            'cc_mitigation'       => (float) $i->cc_mitigation,
            'cc_typology_code'    => $i->cc_typology_code,
            'nutrition_issue'     => $i->nutrition_issue,
            'nutrition_objective' => $i->nutrition_objective,
            'nutrition_activity'  => $i->nutrition_activity,
            'nutrition_target'    => $i->nutrition_target,
            'lead_office_text'    => $i->lead_office_text,
            'sort_order'          => $i->sort_order,
            'is_subtotal_row'     => $i->is_subtotal_row,
            'row_label'           => $i->row_label,
            'department'          => $i->department ? [
                'dept_id'           => $i->department->dept_id,
                'dept_name'         => $i->department->dept_name,
                'dept_abbreviation' => $i->department->dept_abbreviation,
            ] : null,
        ];
    }
}