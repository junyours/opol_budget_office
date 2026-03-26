<?php

namespace App\Http\Controllers\Api;

use App\Models\BudgetPlan;
use App\Models\Department;
use App\Models\DepartmentBudgetPlan;
use App\Models\BudgetPlanForm2Item;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\DB;

class BudgetPlanController extends BaseApiController
{
    /**
     * GET /api/budget-plans
     */
    public function index()
    {
        $this->authorize('viewAny', BudgetPlan::class);

        $plans = BudgetPlan::with('departmentPlans')->get();

        return $this->success($plans);
    }

    /**
     * POST /api/budget-plans
     */
    public function store(Request $request)
    {
        $this->authorize('create', BudgetPlan::class);

        $validated = $request->validate([
            'year'      => ['required', 'integer', Rule::unique('budget_plans', 'year')],
            'is_active' => 'sometimes|boolean',
            'is_open'   => 'sometimes|boolean',
        ]);

        return DB::transaction(function () use ($request, $validated) {
            $user = $request->user();

            if (!empty($validated['is_active'])) {
                BudgetPlan::where('is_active', true)->update(['is_active' => false]);
            }

            // New plans are open by default
            $validated['is_open'] = $validated['is_open'] ?? true;

            $plan = BudgetPlan::create($validated);

            $departments    = Department::all();
            $previousParent = BudgetPlan::where('year', $plan->year - 1)->first();

            foreach ($departments as $dept) {
                $deptPlan = DepartmentBudgetPlan::create([
                    'budget_plan_id' => $plan->budget_plan_id,
                    'dept_id'        => $dept->dept_id,
                    'status'         => 'draft',
                    'created_by'     => $user->user_id,
                ]);

                if ($previousParent) {
                    $pastPlan = DepartmentBudgetPlan::with('items')
                        ->where('dept_id', $dept->dept_id)
                        ->where('budget_plan_id', $previousParent->budget_plan_id)
                        ->first();

                    if ($pastPlan) {
                        foreach ($pastPlan->items->filter(fn ($i) => $i->total_amount > 0) as $item) {
                            BudgetPlanForm2Item::create([
                                'dept_budget_plan_id' => $deptPlan->dept_budget_plan_id,
                                'expense_item_id'     => $item->expense_item_id,
                                'sem1_amount'         => 0,
                                'sem2_amount'         => 0,
                                'total_amount'        => 0,
                                'created_by'          => $user->user_id,
                            ]);
                        }
                    }
                }
            }

            $plan->load('departmentPlans');

            return $this->success($plan, 201);
        });
    }

    /**
     * GET /api/budget-plans/{budgetPlan}
     */
    public function show(BudgetPlan $budgetPlan)
    {
        $this->authorize('view', $budgetPlan);

        $budgetPlan->load('departmentPlans');

        return $this->success($budgetPlan);
    }

    /**
     * PUT /api/budget-plans/{budgetPlan}
     */
    public function update(Request $request, BudgetPlan $budgetPlan)
    {
        $this->authorize('update', $budgetPlan);

        $validated = $request->validate([
            'year' => [
                'sometimes', 'integer',
                Rule::unique('budget_plans', 'year')
                    ->ignore($budgetPlan->budget_plan_id, 'budget_plan_id'),
            ],
            'is_active' => 'sometimes|boolean',
            'is_open'   => 'sometimes|boolean',
        ]);

        if (isset($validated['is_active']) && $validated['is_active'] === true) {
            BudgetPlan::where('budget_plan_id', '!=', $budgetPlan->budget_plan_id)
                      ->where('is_active', true)
                      ->update(['is_active' => false]);
        }

        $budgetPlan->update($validated);

        return $this->success($budgetPlan);
    }

    /**
     * DELETE /api/budget-plans/{budgetPlan}
     */
    public function destroy(BudgetPlan $budgetPlan)
    {
        $this->authorize('delete', $budgetPlan);

        $budgetPlan->delete();

        return $this->success(['message' => 'Deleted']);
    }

    /**
     * POST /api/budget-plans/{budgetPlan}/activate
     */
    public function activate(BudgetPlan $budgetPlan)
    {
        $this->authorize('update', $budgetPlan);

        DB::transaction(function () use ($budgetPlan) {
            BudgetPlan::where('budget_plan_id', '!=', $budgetPlan->budget_plan_id)
                      ->update(['is_active' => false]);

            $budgetPlan->update(['is_active' => true]);
        });

        return $this->success($budgetPlan->fresh());
    }

    /**
     * GET /api/budget-plans/active
     */
    public function active()
    {
        $this->authorize('viewAny', BudgetPlan::class);

        $plan = BudgetPlan::where('is_active', true)->first();

        if (!$plan) {
            return response()->json(['message' => 'No active budget plan found.'], 404);
        }

        return $this->success($plan);
    }

    /**
     * POST /api/budget-plans/{budgetPlan}/close
     *
     * Sets is_open = false and auto-submits all remaining draft dept plans.
     * Returns the list of auto-submitted departments so the frontend can show it.
     */
    public function close(BudgetPlan $budgetPlan)
    {
        $this->authorize('update', $budgetPlan);

        $autoSubmitted = DB::transaction(function () use ($budgetPlan) {
            // Find all draft dept plans for this budget plan
            $drafts = DepartmentBudgetPlan::with('department')
                ->where('budget_plan_id', $budgetPlan->budget_plan_id)
                ->where('status', 'draft')
                ->get();

            // Auto-submit them
            DepartmentBudgetPlan::where('budget_plan_id', $budgetPlan->budget_plan_id)
                ->where('status', 'draft')
                ->update(['status' => 'submitted']);

            $budgetPlan->update(['is_open' => false]);

            return $drafts->map(fn ($dp) => [
                'dept_budget_plan_id' => $dp->dept_budget_plan_id,
                'dept_name'           => $dp->department?->dept_name ?? 'Unknown',
                'dept_abbreviation'   => $dp->department?->dept_abbreviation ?? '',
            ])->values();
        });

        return $this->success([
            'message'        => 'Budget plan closed. Draft plans auto-submitted.',
            'auto_submitted' => $autoSubmitted,
            'plan'           => $budgetPlan->fresh(),
        ]);
    }

    /**
     * GET /api/budget-plans/{budgetPlan}/draft-departments
     *
     * Returns departments that still have a draft plan — used to warn the admin
     * before closing submissions.
     */
    public function draftDepartments(BudgetPlan $budgetPlan)
    {
        $this->authorize('view', $budgetPlan);

        $drafts = DepartmentBudgetPlan::with('department')
            ->where('budget_plan_id', $budgetPlan->budget_plan_id)
            ->where('status', 'draft')
            ->get()
            ->map(fn ($dp) => [
                'dept_budget_plan_id' => $dp->dept_budget_plan_id,
                'dept_name'           => $dp->department?->dept_name ?? 'Unknown',
                'dept_abbreviation'   => $dp->department?->dept_abbreviation ?? '',
            ]);

        return $this->success($drafts);
    }
}
