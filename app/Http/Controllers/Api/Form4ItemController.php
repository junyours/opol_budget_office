<?php

namespace App\Http\Controllers\Api;

use App\Models\AIPProgram;
use App\Models\DeptBpForm4Item;
use App\Models\DepartmentBudgetPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class Form4ItemController extends BaseApiController
{
    /**
     * GET /api/form4-items?budget_plan_id=X
     *
     * Returns all form4 items for a given budget plan,
     * with the parent aip_program eager-loaded so the
     * frontend gets aip_reference_code + program_description
     * alongside the child row fields.
     */
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:department_budget_plans,dept_budget_plan_id',
        ]);

        $items = DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $request->budget_plan_id)
            ->orderBy('dept_bp_form4_item_id')
            ->get()
            ->map(fn ($item) => $this->formatItem($item));

        return response()->json(['data' => $items]);
    }

    /**
     * POST /api/form4-items
     *
     * Creates (or reuses) the parent AipProgram row for the
     * department, then creates the child DeptBpForm4Item.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_id'      => 'required|integer|exists:department_budget_plans,dept_budget_plan_id',
            'aip_reference_code'  => 'nullable|string|max:255',
            'program_description' => 'required|string',
            'major_final_output'  => 'nullable|string',
            'performance_indicator' => 'nullable|string',
            'target'              => 'nullable|string|max:255',
            'ps_amount'           => 'nullable|numeric|min:0',
            'mooe_amount'         => 'nullable|numeric|min:0',
            'co_amount'           => 'nullable|numeric|min:0',
        ]);

        $plan = DepartmentBudgetPlan::findOrFail($validated['budget_plan_id']);

        DB::beginTransaction();
        try {
            // Upsert the parent program scoped to the department
            $aipProgram = AIPProgram::firstOrCreate(
                [
                    'aip_reference_code'  => $validated['aip_reference_code'] ?? null,
                    'program_description' => $validated['program_description'],
                    'dept_id'             => $plan->dept_id,
                ],
                ['is_active' => true]
            );

            $item = DeptBpForm4Item::create([
                'aip_program_id'       => $aipProgram->aip_program_id,
                'dept_budget_plan_id'  => $plan->dept_budget_plan_id,
                'major_final_output'   => $validated['major_final_output'] ?? null,
                'performance_indicator'=> $validated['performance_indicator'] ?? null,
                'target'               => $validated['target'] ?? null,
                'ps_amount'            => $validated['ps_amount'] ?? 0,
                'mooe_amount'          => $validated['mooe_amount'] ?? 0,
                'co_amount'            => $validated['co_amount'] ?? 0,
                'created_by'           => Auth::id(),
                'updated_by'           => Auth::id(),
            ]);

            DB::commit();

            $item->load('aipProgram');
            return response()->json(['data' => $this->formatItem($item)], 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to create item.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * PUT /api/form4-items/{id}
     *
     * Updates both the parent program fields AND the child detail row.
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $item = DeptBpForm4Item::with('aipProgram')->findOrFail($id);

        $validated = $request->validate([
            'aip_reference_code'   => 'nullable|string|max:255',
            'program_description'  => 'sometimes|required|string',
            'major_final_output'   => 'nullable|string',
            'performance_indicator'=> 'nullable|string',
            'target'               => 'nullable|string|max:255',
            'ps_amount'            => 'nullable|numeric|min:0',
            'mooe_amount'          => 'nullable|numeric|min:0',
            'co_amount'            => 'nullable|numeric|min:0',
        ]);

        DB::beginTransaction();
        try {
            // Update parent program if program fields changed
            $programFields = array_filter([
                'aip_reference_code'  => $validated['aip_reference_code']  ?? null,
                'program_description' => $validated['program_description'] ?? null,
            ], fn ($v) => $v !== null);

            if (!empty($programFields)) {
                $item->aipProgram->update($programFields);
            }

            // Update child row
            $item->update([
                'major_final_output'    => $validated['major_final_output']    ?? $item->major_final_output,
                'performance_indicator' => $validated['performance_indicator'] ?? $item->performance_indicator,
                'target'                => $validated['target']                ?? $item->target,
                'ps_amount'             => $validated['ps_amount']             ?? $item->ps_amount,
                'mooe_amount'           => $validated['mooe_amount']           ?? $item->mooe_amount,
                'co_amount'             => $validated['co_amount']             ?? $item->co_amount,
                'updated_by'            => Auth::id(),
            ]);

            DB::commit();

            $item->refresh()->load('aipProgram');
            return response()->json(['data' => $this->formatItem($item)]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return response()->json(['message' => 'Failed to update item.', 'error' => $e->getMessage()], 500);
        }
    }

    /**
     * DELETE /api/form4-items/{id}
     *
     * Deletes the child row. The parent AipProgram is kept
     * (it may be referenced by other budget plans).
     */
    public function destroy(int $id): JsonResponse
    {
        $item = DeptBpForm4Item::findOrFail($id);
        $item->delete();

        return response()->json(['message' => 'Item deleted successfully.']);
    }

    // ── Private helper ────────────────────────────────────────────────────────

    /**
     * Flatten parent + child fields into one object for the frontend,
     * matching the shape the existing Form4.tsx expects.
     */
    private function formatItem(DeptBpForm4Item $item): array
    {
        return [
            'dept_bp_form4_item_id' => $item->dept_bp_form4_item_id,
            'aip_program_id'        => $item->aip_program_id,
            'dept_budget_plan_id'   => $item->dept_budget_plan_id,

            // From parent
            'aip_reference_code'    => $item->aipProgram?->aip_reference_code,
            'program_description'   => $item->aipProgram?->program_description,

            // From child
            'major_final_output'    => $item->major_final_output,
            'performance_indicator' => $item->performance_indicator,
            'target'                => $item->target,
            'ps_amount'             => (float) $item->ps_amount,
            'mooe_amount'           => (float) $item->mooe_amount,
            'co_amount'             => (float) $item->co_amount,
            'total_amount'          => (float) $item->total_amount,
        ];
    }
}