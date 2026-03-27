<?php

namespace App\Http\Controllers\Api;

use App\Models\AIPProgram;
use App\Models\DeptBpForm4Item;
use App\Models\DepartmentBudgetPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class BudgetPlanForm4ItemController extends BaseApiController
{
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

        return $this->success($items);
    }

    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_id'        => 'required|integer|exists:department_budget_plans,dept_budget_plan_id',
            'aip_program_id'        => 'nullable|integer|exists:aip_programs,aip_program_id',
            'aip_reference_code'    => 'nullable|string|max:255',
            'program_description'   => 'required_without:aip_program_id|string',
            'major_final_output'    => 'nullable|string',
            'performance_indicator' => 'nullable|string',
            'target'                => 'nullable|string|max:255',
            'ps_amount'             => 'nullable|numeric|min:0',
            'mooe_amount'           => 'nullable|numeric|min:0',
            'co_amount'             => 'nullable|numeric|min:0',
            'sem1_amount'           => 'nullable|numeric|min:0',
            'sem2_amount'           => 'nullable|numeric|min:0',
            'recommendation'        => 'nullable|string|max:255',
        ]);

        $plan = DepartmentBudgetPlan::findOrFail($validated['budget_plan_id']);

        $programIdToCheck = $validated['aip_program_id'] ?? null;
        if ($programIdToCheck) {
            $duplicate = DeptBpForm4Item::where('dept_budget_plan_id', $plan->dept_budget_plan_id)
                ->where('aip_program_id', $programIdToCheck)
                ->exists();
            if ($duplicate) {
                return $this->error('This AIP program is already added to this budget plan.', 422);
            }
        }

        DB::beginTransaction();
        try {
            if (!empty($validated['aip_program_id'])) {
                $aipProgram = AIPProgram::findOrFail($validated['aip_program_id']);
            } else {
                $aipProgram = AIPProgram::firstOrCreate(
                    [
                        'aip_reference_code'  => $validated['aip_reference_code'] ?? null,
                        'program_description' => $validated['program_description'],
                        'dept_id'             => $plan->dept_id,
                    ],
                    ['is_active' => true]
                );
            }

            $item = DeptBpForm4Item::create([
                'aip_program_id'        => $aipProgram->aip_program_id,
                'dept_budget_plan_id'   => $plan->dept_budget_plan_id,
                'major_final_output'    => $validated['major_final_output'] ?? null,
                'performance_indicator' => $validated['performance_indicator'] ?? null,
                'target'                => $validated['target'] ?? null,
                'ps_amount'             => $validated['ps_amount'] ?? 0,
                'mooe_amount'           => $validated['mooe_amount'] ?? 0,
                'co_amount'             => $validated['co_amount'] ?? 0,
                'sem1_amount'           => $validated['sem1_amount'] ?? 0,
                'sem2_amount'           => $validated['sem2_amount'] ?? 0,
                'recommendation'        => $validated['recommendation'] ?? null,
                'created_by'            => Auth::id(),
                'updated_by'            => Auth::id(),
            ]);

            DB::commit();
            $item->load('aipProgram');
            return $this->success($this->formatItem($item), 201);
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Failed to create item: ' . $e->getMessage(), 500);
        }
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $item = DeptBpForm4Item::with('aipProgram')->findOrFail($id);

        $validated = $request->validate([
            'aip_reference_code'    => 'nullable|string|max:255',
            'program_description'   => 'sometimes|required|string',
            'major_final_output'    => 'nullable|string',
            'performance_indicator' => 'nullable|string',
            'target'                => 'nullable|string|max:255',
            'ps_amount'             => 'nullable|numeric|min:0',
            'mooe_amount'           => 'nullable|numeric|min:0',
            'co_amount'             => 'nullable|numeric|min:0',
            'sem1_amount'           => 'nullable|numeric|min:0',
            'sem2_amount'           => 'nullable|numeric|min:0',
            'recommendation'        => 'nullable|string|max:255',
        ]);

        DB::beginTransaction();
        try {
            $programFields = [];
            if (array_key_exists('aip_reference_code', $validated)) {
                $programFields['aip_reference_code'] = $validated['aip_reference_code'];
            }
            if (!empty($validated['program_description'])) {
                $programFields['program_description'] = $validated['program_description'];
            }
            if (!empty($programFields)) {
                $item->aipProgram->update($programFields);
            }

            // Only update child fields that were actually sent in the request
            $childUpdate = ['updated_by' => Auth::id()];
            foreach (['major_final_output', 'performance_indicator', 'target',
                      'ps_amount', 'mooe_amount', 'co_amount',
                      'sem1_amount', 'sem2_amount', 'recommendation'] as $field) {
                if (array_key_exists($field, $validated)) {
                    $childUpdate[$field] = $validated[$field] ?? $item->{$field};
                }
            }
            $item->update($childUpdate);

            DB::commit();
            $item->refresh()->load('aipProgram');
            return $this->success($this->formatItem($item));
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Failed to update item: ' . $e->getMessage(), 500);
        }
    }

    public function destroy(int $id): JsonResponse
    {
        $item = DeptBpForm4Item::findOrFail($id);
        $item->delete();
        return $this->success(['message' => 'Item deleted successfully.']);
    }

    private function formatItem(DeptBpForm4Item $item): array
    {
        return [
            'dept_bp_form4_item_id' => $item->dept_bp_form4_item_id,
            'aip_program_id'        => $item->aip_program_id,
            'dept_budget_plan_id'   => $item->dept_budget_plan_id,
            'aip_reference_code'    => $item->aipProgram?->aip_reference_code,
            'program_description'   => $item->aipProgram?->program_description,
            'major_final_output'    => $item->major_final_output,
            'performance_indicator' => $item->performance_indicator,
            'target'                => $item->target,
            'ps_amount'             => (float) $item->ps_amount,
            'mooe_amount'           => (float) $item->mooe_amount,
            'co_amount'             => (float) $item->co_amount,
            'total_amount'          => (float) $item->total_amount,
            'sem1_amount'           => (float) $item->sem1_amount,
            'sem2_amount'           => (float) $item->sem2_amount,
            'recommendation'        => $item->recommendation,
            'created_by'            => $item->created_by,
            'updated_by'            => $item->updated_by,
        ];
    }
}