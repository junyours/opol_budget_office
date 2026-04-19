<?php

// namespace App\Http\Controllers\Api;

// use App\Models\AIPProgram;
// use App\Models\DepartmentBudgetPlan;
// use Illuminate\Http\JsonResponse;
// use Illuminate\Http\Request;

// class AipProgramController extends BaseApiController
// {
//     /**
//      * GET /api/aip-programs?dept_id=X
//      *   — Form 4 editor: programs for a single department.
//      *     Amounts are scoped to the dept's plan for the ACTIVE budget plan.
//      *
//      * GET /api/aip-programs?budget_plan_id=X
//      *   — Summary table: all programs across every department under a
//      *     specific budget plan. Amounts scoped to that plan only.
//      */
//     public function index(Request $request): JsonResponse
//     {
//         // ── Single-department path ────────────────────────────────────────────
//         if ($request->has('dept_id')) {
//             $request->validate([
//                 'dept_id' => 'required|integer|exists:departments,dept_id',
//             ]);

//             // Find the dept plan IDs for this department (across all budget plans).
//             // When used from the Form 4 editor the caller already knows the plan,
//             // so we return the program list and let the editor filter by its own
//             // dept_budget_plan_id when displaying amounts.
//             $deptBudgetPlanIds = DepartmentBudgetPlan::where('dept_id', $request->dept_id)
//                 ->pluck('dept_budget_plan_id');

//             $programs = AIPProgram::with(['form4Items' => function ($q) use ($deptBudgetPlanIds) {
//                     $q->whereIn('dept_budget_plan_id', $deptBudgetPlanIds);
//                 }])
//                 ->where('dept_id', $request->dept_id)
//                 ->where('is_active', true)
//                 ->orderBy('aip_reference_code')
//                 ->get()
//                 ->map(fn ($p) => $this->formatProgram($p));

//             return $this->success($programs);
//         }

//         // ── Whole-budget-plan path ────────────────────────────────────────────
//         $request->validate([
//             'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
//         ]);

//         // All dept_budget_plan_ids that belong to this parent budget plan
//         $deptPlans = DepartmentBudgetPlan::where('budget_plan_id', $request->budget_plan_id)
//             ->get(['dept_budget_plan_id', 'dept_id']);

//         $deptBudgetPlanIds = $deptPlans->pluck('dept_budget_plan_id');
//         $deptIds           = $deptPlans->pluck('dept_id');

//         // Eager-load form4Items but restrict them to the dept plans under THIS
//         // budget plan only — this is the fix for amounts leaking across years.
//         $programs = AIPProgram::with(['form4Items' => function ($q) use ($deptBudgetPlanIds) {
//                 $q->whereIn('dept_budget_plan_id', $deptBudgetPlanIds);
//             }])
//             ->whereIn('dept_id', $deptIds)
//             ->where('is_active', true)
//             ->orderBy('dept_id')
//             ->orderBy('aip_reference_code')
//             ->get()
//             // Exclude programs that have zero total for this plan (nothing entered yet)
//             ->filter(fn ($p) => $p->form4Items->isNotEmpty())
//             ->map(fn ($p) => $this->formatProgram($p))
//             ->values();

//         return $this->success($programs);
//     }

//     /**
//      * GET /api/aip-programs/{id}
//      */
//     public function show(int $id): JsonResponse
//     {
//         $program = AIPProgram::with('form4Items')->findOrFail($id);

//         return $this->success($this->formatProgram($program));
//     }

//     // ─────────────────────────────────────────────────────────────────────────

//     /**
//      * Format a program for the API response.
//      * Amounts are summed from whichever form4Items were eager-loaded
//      * (already scoped to the correct plan by the query above).
//      */
//     private function formatProgram(AIPProgram $program): array
//     {
//         return [
//             'aip_program_id'      => $program->aip_program_id,
//             'aip_reference_code'  => $program->aip_reference_code,
//             'program_description' => $program->program_description,
//             'dept_id'             => $program->dept_id,
//             'is_active'           => $program->is_active,
//             'total_ps'            => (float) $program->form4Items->sum('ps_amount'),
//             'total_mooe'          => (float) $program->form4Items->sum('mooe_amount'),
//             'total_co'            => (float) $program->form4Items->sum('co_amount'),
//             'total_amount'        => (float) $program->form4Items->sum('total_amount'),
//         ];
//     }
// }

/**
 * PATCH: AipProgramController.php
 *
 * The master list tab calls GET /api/aip-programs with NO query params.
 * Add a third branch at the top of index() to handle this case.
 *
 * Replace the existing index() method with the version below.
 */

// namespace App\Http\Controllers\Api;

// use App\Models\AIPProgram;
// use App\Models\DepartmentBudgetPlan;
// use Illuminate\Http\JsonResponse;
// use Illuminate\Http\Request;

// class AipProgramController extends BaseApiController
// {
//     /**
//      * GET /api/aip-programs               — Master list (no amounts, all depts)
//      * GET /api/aip-programs?dept_id=X     — Form 4 editor: single department
//      * GET /api/aip-programs?budget_plan_id=X — Summary: amounts for a plan
//      */
//     public function index(Request $request): JsonResponse
//     {
//         // ── Master list (no filter) ───────────────────────────────────────────
//         if (!$request->has('dept_id') && !$request->has('budget_plan_id')) {
//             $programs = AIPProgram::with([])   // no eager-load needed — no amounts
//                 ->orderBy('dept_id')
//                 ->orderBy('aip_reference_code')
//                 ->get()
//                 ->map(fn ($p) => [
//                     'aip_program_id'      => $p->aip_program_id,
//                     'aip_reference_code'  => $p->aip_reference_code,
//                     'program_description' => $p->program_description,
//                     'dept_id'             => $p->dept_id,
//                     'is_active'           => $p->is_active,
//                     'total_ps'            => 0.0,
//                     'total_mooe'          => 0.0,
//                     'total_co'            => 0.0,
//                     'total_amount'        => 0.0,
//                 ]);

//             return $this->success($programs);
//         }

//         // ── Single-department path ────────────────────────────────────────────
//         if ($request->has('dept_id')) {
//             $request->validate([
//                 'dept_id' => 'required|integer|exists:departments,dept_id',
//             ]);

//             $deptBudgetPlanIds = DepartmentBudgetPlan::where('dept_id', $request->dept_id)
//                 ->pluck('dept_budget_plan_id');

//             $programs = AIPProgram::with(['form4Items' => function ($q) use ($deptBudgetPlanIds) {
//                     $q->whereIn('dept_budget_plan_id', $deptBudgetPlanIds);
//                 }])
//                 ->where('dept_id', $request->dept_id)
//                 ->where('is_active', true)
//                 ->orderBy('aip_reference_code')
//                 ->get()
//                 ->map(fn ($p) => $this->formatProgram($p));

//             return $this->success($programs);
//         }

//         // ── Whole-budget-plan path ────────────────────────────────────────────
//         $request->validate([
//             'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
//         ]);

//         $deptPlans = DepartmentBudgetPlan::where('budget_plan_id', $request->budget_plan_id)
//             ->get(['dept_budget_plan_id', 'dept_id']);

//         $deptBudgetPlanIds = $deptPlans->pluck('dept_budget_plan_id');
//         $deptIds           = $deptPlans->pluck('dept_id');

//         // Return ALL programs for those depts (not just those with allocations)
//         // so the master list shows everything with 0s where not allocated.
//         $programs = AIPProgram::with(['form4Items' => function ($q) use ($deptBudgetPlanIds) {
//                 $q->whereIn('dept_budget_plan_id', $deptBudgetPlanIds);
//             }])
//             ->whereIn('dept_id', $deptIds)
//             ->orderBy('dept_id')
//             ->orderBy('aip_reference_code')
//             ->get()
//             ->map(fn ($p) => $this->formatProgram($p))
//             ->values();

//         return $this->success($programs);
//     }

//     public function show(int $id): JsonResponse
//     {
//         $program = AIPProgram::with('form4Items')->findOrFail($id);
//         return $this->success($this->formatProgram($program));
//     }

//     private function formatProgram(AIPProgram $program): array
//     {
//         return [
//             'aip_program_id'      => $program->aip_program_id,
//             'aip_reference_code'  => $program->aip_reference_code,
//             'program_description' => $program->program_description,
//             'dept_id'             => $program->dept_id,
//             'is_active'           => $program->is_active,
//             'total_ps'            => (float) $program->form4Items->sum('ps_amount'),
//             'total_mooe'          => (float) $program->form4Items->sum('mooe_amount'),
//             'total_co'            => (float) $program->form4Items->sum('co_amount'),
//             'total_amount'        => (float) $program->form4Items->sum('total_amount'),
//         ];
//     }
// }



namespace App\Http\Controllers\Api;

use App\Models\AIPProgram;
use App\Models\DepartmentBudgetPlan;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AipProgramController extends BaseApiController
{
    /**
     * GET /api/aip-programs               — Master list (no amounts, all depts)
     * GET /api/aip-programs?dept_id=X     — Form 4 editor: single department
     * GET /api/aip-programs?budget_plan_id=X — Summary: amounts for a plan
     */
    public function index(Request $request): JsonResponse
    {
        // ── Master list (no filter) ───────────────────────────────────────────
        if (!$request->has('dept_id') && !$request->has('budget_plan_id')) {
            $programs = AIPProgram::orderBy('dept_id')
                ->orderBy('aip_reference_code')
                ->get()
                ->map(fn ($p) => [
                    'aip_program_id'      => $p->aip_program_id,
                    'aip_reference_code'  => $p->aip_reference_code,
                    'program_description' => $p->program_description,
                    'dept_id'             => $p->dept_id,
                    'is_active'           => $p->is_active,
                    'total_ps'            => 0.0,
                    'total_mooe'          => 0.0,
                    'total_co'            => 0.0,
                    'total_amount'        => 0.0,
                ]);

            return $this->success($programs);
        }

        // ── Single-department path ────────────────────────────────────────────
        if ($request->has('dept_id')) {
            $request->validate([
                'dept_id' => 'required|integer|exists:departments,dept_id',
            ]);

            $deptBudgetPlanIds = DepartmentBudgetPlan::where('dept_id', $request->dept_id)
                ->pluck('dept_budget_plan_id');

            $programs = AIPProgram::with(['form4Items' => function ($q) use ($deptBudgetPlanIds) {
                    $q->whereIn('dept_budget_plan_id', $deptBudgetPlanIds);
                }])
                ->where('dept_id', $request->dept_id)
                ->where('is_active', true)
                ->orderBy('aip_reference_code')
                ->get()
                ->map(fn ($p) => $this->formatProgram($p));

            return $this->success($programs);
        }

        // ── Whole-budget-plan path ────────────────────────────────────────────
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        $deptPlans = DepartmentBudgetPlan::where('budget_plan_id', $request->budget_plan_id)
            ->get(['dept_budget_plan_id', 'dept_id']);

        $deptBudgetPlanIds = $deptPlans->pluck('dept_budget_plan_id');
        $deptIds           = $deptPlans->pluck('dept_id');

        $programs = AIPProgram::with(['form4Items' => function ($q) use ($deptBudgetPlanIds) {
                $q->whereIn('dept_budget_plan_id', $deptBudgetPlanIds);
            }])
            ->whereIn('dept_id', $deptIds)
            ->orderBy('dept_id')
            ->orderBy('aip_reference_code')
            ->get()
            ->map(fn ($p) => $this->formatProgram($p))
            ->values();

        return $this->success($programs);
    }

    /**
     * GET /api/aip-programs/{id}
     */
    public function show(int $id): JsonResponse
    {
        $program = AIPProgram::with('form4Items')->findOrFail($id);
        return $this->success($this->formatProgram($program));
    }

    /**
     * PUT /api/aip-programs/{id}
     *   — Edit description / reference code / is_active
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $program = AIPProgram::findOrFail($id);

        $validated = $request->validate([
            'program_description' => 'sometimes|required|string|max:1000',
            'aip_reference_code'  => 'sometimes|nullable|string|max:80',
            'is_active'           => 'sometimes|boolean',
        ]);

        $program->fill($validated);
        $program->save();

        return $this->success([
            'aip_program_id'      => $program->aip_program_id,
            'aip_reference_code'  => $program->aip_reference_code,
            'program_description' => $program->program_description,
            'dept_id'             => $program->dept_id,
            'is_active'           => $program->is_active,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function formatProgram(AIPProgram $program): array
    {
        return [
            'aip_program_id'      => $program->aip_program_id,
            'aip_reference_code'  => $program->aip_reference_code,
            'program_description' => $program->program_description,
            'dept_id'             => $program->dept_id,
            'is_active'           => $program->is_active,
            'total_ps'            => (float) $program->form4Items->sum('ps_amount'),
            'total_mooe'          => (float) $program->form4Items->sum('mooe_amount'),
            'total_co'            => (float) $program->form4Items->sum('co_amount'),
            'total_amount'        => (float) $program->form4Items->sum('total_amount'),
        ];
    }
}
