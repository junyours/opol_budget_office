<?php

namespace App\Http\Controllers\Api;

use App\Models\DepartmentBudgetPlan;
use App\Models\SalaryStandardVersion;
use App\Models\SalaryGradeStep;
use App\Models\PlantillaAssignment;
use App\Models\BudgetPlanForm2Item;
use App\Models\ExpenseClassItem;
use App\Models\BudgetPlanForm3Assignment;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use App\Models\BudgetPlan;
use Carbon\Carbon;
use Illuminate\Support\Facades\Log;
use App\Models\AIPProgram;
use App\Models\DeptBpForm4Item;

class DepartmentBudgetPlanController extends BaseApiController
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);

        $query = DepartmentBudgetPlan::with(['department', 'items', 'items.expenseItem','items.expenseItem.classification','budgetPlan']);

        $budgetPlanId = $request->input('budget_plan_id')
                     ?? $request->input('filter.budget_plan_id');
        if ($budgetPlanId) {
            $query->where('budget_plan_id', $budgetPlanId);
        }

        return $this->success($query->get());
    }

    public function show(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('view', $department_budget_plan);
        $department_budget_plan->load(['department', 'items', 'budgetPlan']);
        return $this->success($department_budget_plan);
    }

    public function store(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|exists:budget_plans,budget_plan_id',
            'dept_id'        => 'required|exists:departments,dept_id',
        ]);

        return DB::transaction(function () use ($request) {
            $user = $request->user();

            $exists = DepartmentBudgetPlan::where('dept_id', $request->dept_id)
                ->where('budget_plan_id', $request->budget_plan_id)
                ->exists();

            if ($exists) {
                return response()->json([
                    'message' => 'Budget plan for this department already exists under this budget plan.',
                ], 422);
            }

            $parentPlan  = BudgetPlan::findOrFail($request->budget_plan_id);
            $currentYear = $parentPlan->year;

            $newPlan = DepartmentBudgetPlan::create([
                'budget_plan_id' => $request->budget_plan_id,
                'dept_id'        => $request->dept_id,
                'status'         => 'draft',
                'created_by'     => $user->user_id,
            ]);

            $previousParentPlan = BudgetPlan::where('year', $currentYear - 1)->first();
            if ($previousParentPlan) {
                $pastPlan = DepartmentBudgetPlan::with('items')
                    ->where('dept_id', $request->dept_id)
                    ->where('budget_plan_id', $previousParentPlan->budget_plan_id)
                    ->first();

                if ($pastPlan) {
                    foreach ($pastPlan->items->filter(fn($i) => $i->total_amount > 0) as $item) {
                        BudgetPlanForm2Item::create([
                            'dept_budget_plan_id' => $newPlan->dept_budget_plan_id,
                            'expense_item_id'     => $item->expense_item_id,
                            'sem1_amount'         => 0,
                            'sem2_amount'         => 0,
                            'total_amount'        => 0,
                            'created_by'          => $user->user_id,
                        ]);
                    }
                }
            }

            $newPlan->load('items', 'budgetPlan');
            return $this->success($newPlan, 201);
        });
    }

    public function update(Request $request, DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('update', $department_budget_plan);

        $validated = $request->validate([
            'budget_plan_id' => 'sometimes|exists:budget_plans,budget_plan_id',
            'dept_id'        => 'sometimes|exists:departments,dept_id',
            'status'         => 'sometimes|in:draft,submitted,approved',
        ]);

        if (
            isset($validated['budget_plan_id'])
            && $validated['budget_plan_id'] != $department_budget_plan->budget_plan_id
        ) {
            $exists = DepartmentBudgetPlan::where('dept_id', $validated['dept_id'] ?? $department_budget_plan->dept_id)
                ->where('budget_plan_id', $validated['budget_plan_id'])
                ->where('dept_budget_plan_id', '!=', $department_budget_plan->dept_budget_plan_id)
                ->exists();

            if ($exists) {
                return response()->json(['message' => 'Duplicate department plan under the new budget plan.'], 422);
            }
        }

        $department_budget_plan->update([
            ...$validated,
            'updated_by' => $request->user()->user_id,
        ]);

        return $this->success($department_budget_plan);
    }

    public function destroy(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('delete', $department_budget_plan);
        $department_budget_plan->delete();
        return $this->success(['message' => 'Deleted']);
    }

    public function submit(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('submit', $department_budget_plan);

        $parentPlan = $department_budget_plan->budgetPlan;
        if ($parentPlan && !$parentPlan->is_open) {
            return response()->json([
                'message' => 'Submissions are closed for this budget plan. Please contact the Budget Officer.',
            ], 422);
        }

        if ($department_budget_plan->status !== 'draft') {
            return response()->json(['message' => 'Only draft plans can be submitted.'], 422);
        }

        $department_budget_plan->update(['status' => 'submitted']);
        return $this->success(['message' => 'Submitted successfully.']);
    }

    public function approve(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('approve', $department_budget_plan);

        if ($department_budget_plan->status !== 'submitted') {
            return response()->json(['message' => 'Only submitted plans can be approved.'], 422);
        }

        $department_budget_plan->update(['status' => 'approved']);
        return $this->success(['message' => 'Approved successfully.']);
    }

    public function reject(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('reject', $department_budget_plan);
        $department_budget_plan->update(['status' => 'draft']);
        return $this->success(['message' => 'Returned to draft.']);
    }

    public function findByDeptAndYear($dept_id, $year)
    {
        $budgetPlan = BudgetPlan::where('year', $year)->first();

        if (!$budgetPlan) {
            return response()->json(['message' => 'Budget plan for that year not found'], 404);
        }

        $plan = DepartmentBudgetPlan::with(['items', 'budgetPlan'])
            ->where('dept_id', $dept_id)
            ->where('budget_plan_id', $budgetPlan->budget_plan_id)
            ->first();

        if (!$plan) {
            return response()->json(['message' => 'Department plan not found'], 404);
        }

        return $this->success($plan);
    }

    public function years()
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);
        return $this->success(BudgetPlan::orderBy('year', 'desc')->pluck('year'));
    }

    // ── plantillaAssignments ──────────────────────────────────────────────────

    public function plantillaAssignments($budgetPlanId)
    {
        try {
            $plan = DepartmentBudgetPlan::with('budgetPlan')->findOrFail($budgetPlanId);

            if (!$plan->budgetPlan) {
                return response()->json([
                    'success' => false,
                    'message' => 'Budget plan relationship not found for dept_budget_plan_id: ' . $budgetPlanId,
                ], 404);
            }

            $departmentId = $plan->dept_id;
            $budgetYear   = $plan->budgetPlan->year;

            // ── 1. Return saved snapshots if they exist ────────────────────
            $snapshots = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                ->where('dept_budget_plan_id', $plan->dept_budget_plan_id)
                ->get();

            if ($snapshots->isNotEmpty()) {
                $result = $snapshots->map(fn ($item) => [
                    'dept_bp_from3_assignment_id' => $item->dept_bp_from3_assignment_id,
                    'budget_plan_id'              => $item->dept_budget_plan_id,
                    'plantilla_position_id'       => $item->plantilla_position_id,
                    'personnel_id'                => $item->personnel_id,
                    'salary_grade'                => $item->salary_grade,
                    'step'                        => $item->step,
                    'monthly_rate'                => $item->monthly_rate,
                    'annual_rate'                 => $item->annual_rate,
                    // ↓ FIX: include annual_increment so Form 3 can display it
                    'annual_increment'            => $item->annual_increment,
                    'step_effective_date'         => $item->step_effective_date?->toDateString(),
                    'effective_date'              => null,
                    'assignment_date'             => null,
                    'plantilla_position'          => $item->plantillaPosition ? [
                        'old_item_number' => $item->plantillaPosition->old_item_number,
                        'new_item_number' => $item->plantillaPosition->new_item_number,
                        'position_title'  => $item->plantillaPosition->position_title,
                    ] : null,
                    'personnel' => $item->personnel ? [
                        'first_name'  => $item->personnel->first_name,
                        'middle_name' => $item->personnel->middle_name,
                        'last_name'   => $item->personnel->last_name,
                    ] : null,
                ]);

                return response()->json(['success' => true, 'data' => $result]);
            }

            // ── 2. Live computation from plantilla_assignments ─────────────
            $activeVersion = SalaryStandardVersion::where('is_active', true)->first();

            $salarySteps = collect();
            if ($activeVersion) {
                $salarySteps = SalaryGradeStep::where(
                    'salary_standard_version_id',
                    $activeVersion->salary_standard_version_id
                )
                    ->get()
                    ->keyBy(fn ($s) => $s->salary_grade . '-' . $s->step);
            }

            $assignments = PlantillaAssignment::with(['plantilla_position', 'personnel'])
                ->whereHas(
                    'plantilla_position',
                    fn ($q) => $q->where('dept_id', $departmentId)->where('is_active', true)
                )
                ->get();

            $result = $assignments->map(function ($assignment) use ($budgetYear, $salarySteps, $plan) {
                $position  = $assignment->plantilla_position;
                $personnel = $assignment->personnel;

                $baseStep          = 1;
                $stepEffectiveDate = null;
                $baseMonths        = 12;

                $assignmentDate = $assignment->assignment_date;

                if ($assignmentDate) {
                    $assignCarbon = Carbon::parse($assignmentDate);
                    $aYear        = $assignCarbon->year;
                    $aMonth       = $assignCarbon->month; // 1-based
                    $aDay         = $assignCarbon->day;

                    $gap = $budgetYear - $aYear;

                    if ($gap > 0) {
                        $blocksComplete = (int) floor(($gap - 1) / 3);
                        $baseStep       = max(1, min(8, 1 + $blocksComplete));

                        if ($baseStep < 8) {
                            $nextAnnivYear = $aYear + ($blocksComplete + 1) * 3;

                            if ($nextAnnivYear === $budgetYear) {
                                $stepEffectiveDate = Carbon::create($nextAnnivYear, $aMonth, $aDay)
                                    ->toDateString();

                                $month0          = $aMonth - 1;
                                $incrStartMonth0 = $aDay <= 15 ? $month0 : $month0 + 1;
                                $incrementMonths = max(0, 12 - $incrStartMonth0);
                                $baseMonths      = 12 - $incrementMonths;
                            }
                        }
                    }
                }

                $salaryGrade = $position?->salary_grade ?? 0;
                $monthlyRate = (float) ($salarySteps->get($salaryGrade . '-' . $baseStep)?->salary ?? 0);
                $annualRate  = $monthlyRate * $baseMonths;

                return [
                    // 'dept_bp_from3_assignment_id' => $assignment->assignment_id,
                    'dept_bp_from3_assignment_id' => null,
                    'budget_plan_id'              => $plan->dept_budget_plan_id,
                    'plantilla_position_id'       => $assignment->plantilla_position_id,
                    'personnel_id'                => $assignment->personnel_id,
                    'salary_grade'                => $salaryGrade,
                    'step'                        => $baseStep,
                    'monthly_rate'                => $monthlyRate,
                    'annual_rate'                 => $annualRate,
                    // Live path: annual_increment not yet computed — null until saved
                    'annual_increment'            => null,
                    'step_effective_date'         => $stepEffectiveDate,
                    'assignment_date'             => $assignment->assignment_date?->toDateString(),
                    'effective_date'              => $assignment->assignment_date?->toDateString(),
                    'plantilla_position'          => $position ? [
                        'old_item_number' => $position->old_item_number,
                        'new_item_number' => $position->new_item_number,
                        'position_title'  => $position->position_title,
                    ] : null,
                    'personnel' => $personnel ? [
                        'first_name'  => $personnel->first_name,
                        'middle_name' => $personnel->middle_name,
                        'last_name'   => $personnel->last_name,
                    ] : null,
                ];
            });

            return response()->json(['success' => true, 'data' => $result]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch plantilla assignments',
                'error'   => $e->getMessage(),
                'trace'   => config('app.debug') ? $e->getTraceAsString() : null,
            ], 500);
        }
    }

    // ── bulkSavePlantillaAssignments ──────────────────────────────────────────

    public function bulkSavePlantillaAssignments(Request $request, DepartmentBudgetPlan $budget_plan)
    {
        $this->authorize('update', $budget_plan);

        $validated = $request->validate([
            'assignments'                              => 'required|array|min:1',
            'assignments.*.plantilla_position_id'      => 'required|integer|exists:plantilla_positions,plantilla_position_id',
            'assignments.*.personnel_id'               => 'nullable|integer|exists:personnels,personnel_id',
            'assignments.*.salary_grade'               => 'required|integer|min:1',
            'assignments.*.step'                       => 'required|integer|min:1|max:8',
            'assignments.*.monthly_rate'               => 'required|numeric|min:0',
            'assignments.*.annual_rate'                => 'required|numeric|min:0',
            // ↓ FIX: accept and validate annual_increment
            'assignments.*.annual_increment'           => 'nullable|numeric|min:0',
            'assignments.*.step_effective_date'        => 'nullable|date',
            'assignments.*.salary_standard_version_id' => 'nullable|integer|exists:salary_standard_versions,salary_standard_version_id',
        ]);

        DB::transaction(function () use ($validated, $budget_plan) {
            foreach ($validated['assignments'] as $data) {
                BudgetPlanForm3Assignment::updateOrCreate(
                    [
                        'dept_budget_plan_id'   => $budget_plan->dept_budget_plan_id,
                        'plantilla_position_id' => $data['plantilla_position_id'],
                    ],
                    [
                        'personnel_id'               => $data['personnel_id'],
                        'salary_grade'               => $data['salary_grade'],
                        'step'                       => $data['step'],
                        'monthly_rate'               => $data['monthly_rate'],
                        'annual_rate'                => $data['annual_rate'],
                        // ↓ FIX: save annual_increment (null when no step-up)
                        'annual_increment'           => $data['annual_increment'] ?? null,
                        'step_effective_date'        => $data['step_effective_date'] ?? null,
                        'salary_standard_version_id' => $data['salary_standard_version_id'] ?? null,
                    ]
                );
            }
        });

        // ── OCC special honoraria items (Form 2 snapshot) ─────────────────────
        $dept = $budget_plan->department ?? $budget_plan->load('department')->department;

        if ($dept && $dept->dept_abbreviation === 'OCC') {
            $occNames = [
                'Honoraria - BOT',
                'Honoraria - Part-Time Instructors',
                'Honoraria - Program Head',
                'Honoraria - TESDA Coordinator',
            ];

            $occItems = ExpenseClassItem::whereIn('expense_class_item_name', $occNames)
                ->get();

            $existingIds = $budget_plan->items()
                ->pluck('expense_item_id')
                ->all();

            foreach ($occItems as $occItem) {
                if (!in_array($occItem->expense_class_item_id, $existingIds)) {
                    BudgetPlanForm2Item::create([
                        'dept_budget_plan_id' => $budget_plan->dept_budget_plan_id,
                        'expense_item_id'     => $occItem->expense_class_item_id,
                        'sem1_amount'         => 0,
                        'sem2_amount'         => 0,
                        'total_amount'        => 0,
                    ]);
                }
            }
        }
        // ─────────────────────────────────────────────────────────────────────

        return $this->success([
            'message' => 'Plantilla assignments snapshot saved successfully.',
            'count'   => count($validated['assignments']),
        ]);
    }

    public function destroyPlantillaAssignment(
    DepartmentBudgetPlan $budget_plan,
    BudgetPlanForm3Assignment $assignment
) {
    $this->authorize('update', $budget_plan);

    if ($assignment->dept_budget_plan_id !== $budget_plan->dept_budget_plan_id) {
        return response()->json(['message' => 'Assignment does not belong to this plan.'], 403);
    }

    $assignment->delete();

    return $this->success(['message' => 'Assignment removed from snapshot.']);
}

/**
     * POST /api/department-budget-plans/{plan}/upload-obligations
     *
     * Accepts a JSON body (parsed from Excel on the frontend) with shape:
     * {
     *   "items": [
     *     { "expense_item_name": "...", "amount": 12345 },
     *     ...
     *   ],
     *   "aip_programs": [
     *     { "program_description": "...", "amount": 12345 },
     *     ...
     *   ]
     * }
     *
     * Matches by expense_item_name (case-insensitive) and program_description,
     * upserts obligation_amount, and auto-adds missing items to current (year+1)
     * and proposed (year+2) plans if not already present.
     */
    public function uploadObligations(Request $request, DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('update', $department_budget_plan);

        $validated = $request->validate([
            'items'                       => 'sometimes|array',
            'items.*.expense_item_name'   => 'required_with:items|string',
            'items.*.amount'              => 'required_with:items|numeric|min:0',
            'aip_programs'                => 'sometimes|array',
            'aip_programs.*.program_description' => 'required_with:aip_programs|string',
            'aip_programs.*.amount'       => 'required_with:aip_programs|numeric|min:0',
        ]);

        $pastPlan   = $department_budget_plan;
        $pastBpYear = $pastPlan->budgetPlan->year ?? null;

        if (!$pastBpYear) {
            return $this->error('Could not determine year for this plan.', 422);
        }

        // Find current (pastYear+1) and proposed (pastYear+2) plans for same dept
        $currentBp  = BudgetPlan::where('year', $pastBpYear + 1)->first();
        $proposedBp = BudgetPlan::where('year', $pastBpYear + 2)->first();

        $currentPlan  = $currentBp  ? DepartmentBudgetPlan::where('dept_id', $pastPlan->dept_id)->where('budget_plan_id', $currentBp->budget_plan_id)->first()  : null;
        $proposedPlan = $proposedBp ? DepartmentBudgetPlan::where('dept_id', $pastPlan->dept_id)->where('budget_plan_id', $proposedBp->budget_plan_id)->first() : null;

        DB::beginTransaction();
        try {
            // ── Regular expense items ─────────────────────────────────────────
            foreach ($validated['items'] ?? [] as $row) {
                // Find expense item by name (case-insensitive)
                $expItem = \App\Models\ExpenseClassItem::whereRaw(
                    'LOWER(expense_class_item_name) = ?', [strtolower(trim($row['expense_item_name']))]
                )->first();

                if (!$expItem) continue;

                // Upsert obligation on past plan
                $pastItem = BudgetPlanForm2Item::firstOrCreate(
                    ['dept_budget_plan_id' => $pastPlan->dept_budget_plan_id, 'expense_item_id' => $expItem->expense_class_item_id],
                    ['sem1_amount' => 0, 'sem2_amount' => 0, 'total_amount' => 0, 'obligation_amount' => 0]
                );
                $pastItem->obligation_amount = $row['amount'];
                $pastItem->save();

                // Auto-add to current year plan (0 amount) if missing
                if ($currentPlan) {
                    BudgetPlanForm2Item::firstOrCreate(
                        ['dept_budget_plan_id' => $currentPlan->dept_budget_plan_id, 'expense_item_id' => $expItem->expense_class_item_id],
                        ['sem1_amount' => 0, 'sem2_amount' => 0, 'total_amount' => 0, 'obligation_amount' => 0]
                    );
                }
                // Auto-add to proposed year plan (0 amount) if missing
                if ($proposedPlan) {
                    BudgetPlanForm2Item::firstOrCreate(
                        ['dept_budget_plan_id' => $proposedPlan->dept_budget_plan_id, 'expense_item_id' => $expItem->expense_class_item_id],
                        ['sem1_amount' => 0, 'sem2_amount' => 0, 'total_amount' => 0, 'obligation_amount' => 0]
                    );
                }
            }

            // ── AIP program items ─────────────────────────────────────────────
            foreach ($validated['aip_programs'] ?? [] as $row) {
                $program = AIPProgram::where('dept_id', $pastPlan->dept_id)
                    ->whereRaw('LOWER(program_description) = ?', [strtolower(trim($row['program_description']))])
                    ->first();

                if (!$program) continue;

                $pastForm4 = DeptBpForm4Item::where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
                    ->where('aip_program_id', $program->aip_program_id)
                    ->first();

                if ($pastForm4) {
                    $pastForm4->obligation_amount = $row['amount'];
                    $pastForm4->save();
                }
            }

            DB::commit();
            $pastPlan->load('items');
            return $this->success(['message' => 'Obligations uploaded successfully.', 'plan' => $pastPlan]);
        } catch (\Throwable $e) {
            DB::rollBack();
            return $this->error('Upload failed: ' . $e->getMessage(), 500);
        }
    }

}
