<?php

namespace App\Http\Controllers\Api;

use App\Models\Department;
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
use App\Models\AIPProgram;
use App\Models\DeptBpForm4Item;
use App\Models\User;
use App\Notifications\BudgetProposalSubmitted;
use App\Notifications\BudgetProposalAcknowledged;
use App\Notifications\BudgetProposalApproved;
use App\Notifications\BudgetProposalReturned;
use App\Http\Controllers\Api\CalamityFundController;
use App\Http\Controllers\Api\LdrrmfipController;


class DepartmentBudgetPlanController extends BaseApiController
{
    public function index(Request $request)
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);

        $light = $request->boolean('light');

        if ($light) {
            $query = DepartmentBudgetPlan::query()
                ->select(['dept_budget_plan_id', 'budget_plan_id', 'dept_id', 'status', 'created_at', 'updated_at'])
                ->with(['department:dept_id,dept_name,dept_abbreviation,logo'])
                ->withSum('items as items_total', 'total_amount');

            if ($request->query('include') === 'budget_plan') {
                $query->with(['budgetPlan:budget_plan_id,year']);
            }
        } else {
            $query = DepartmentBudgetPlan::with(['department', 'items', 'items.expenseItem','items.expenseItem.classification','budgetPlan']);
        }

        $budgetPlanId = $request->input('budget_plan_id')
                     ?? $request->input('filter.budget_plan_id');
        if ($budgetPlanId) {
            $query->where('budget_plan_id', $budgetPlanId);
        }

        $deptId = $request->input('dept_id');
        if ($deptId) {
            $query->where('dept_id', $deptId);
        }

        return $this->success($query->get());
    }

    public function show(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('view', $department_budget_plan);
        $department_budget_plan->load(['department', 'items', 'budgetPlan']);
        return $this->success($department_budget_plan);
    }

    /**
     * GET /api/department-budget-plans/expense-totals?budget_plan_id=X&dept_id=Y
     *
     * PS/MOOE/CO totals for one department's plan, computed here instead of
     * shipping the full item catalog + classification list + line items to
     * the frontend just to sum three numbers.
     */
    public function expenseTotals(Request $request)
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'dept_id'        => 'required|integer|exists:departments,dept_id',
        ]);

        $plan = DepartmentBudgetPlan::where('budget_plan_id', $validated['budget_plan_id'])
            ->where('dept_id', $validated['dept_id'])
            ->with('items.expenseItem.classification')
            ->first();

        $totals = [
            'Personal Services' => 0.0,
            'Maintenance and Other Operating Expenses' => 0.0,
            'Capital Outlay' => 0.0,
        ];

        if ($plan) {
            foreach ($plan->items as $item) {
                $className = $item->expenseItem->classification->expense_class_name ?? null;
                if ($className && array_key_exists($className, $totals)) {
                    $totals[$className] += (float) $item->total_amount;
                }
            }
        }

        $ps   = $totals['Personal Services'];
        $mooe = $totals['Maintenance and Other Operating Expenses'];
        $co   = $totals['Capital Outlay'];

        return $this->success([
            'ps'                  => $ps,
            'mooe'                => $mooe,
            'co'                  => $co,
            'total'               => $ps + $mooe + $co,
            'dept_budget_plan_id' => $plan->dept_budget_plan_id ?? null,
            'status'              => $plan->status ?? null,
        ]);
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

    // public function submit(DepartmentBudgetPlan $department_budget_plan)
    // {
    //     $this->authorize('submit', $department_budget_plan);

    //     $parentPlan = $department_budget_plan->budgetPlan;
    //     if ($parentPlan && !$parentPlan->is_open) {
    //         return response()->json([
    //             'message' => 'Submissions are closed for this budget plan. Please contact the Budget Officer.',
    //         ], 422);
    //     }

    //     if ($department_budget_plan->status !== 'draft') {
    //         return response()->json(['message' => 'Only draft plans can be submitted.'], 422);
    //     }

    //     $department_budget_plan->update(['status' => 'submitted']);
    //     return $this->success(['message' => 'Submitted successfully.']);
    // }

    // public function approve(DepartmentBudgetPlan $department_budget_plan)
    // {
    //     $this->authorize('approve', $department_budget_plan);

    //     if ($department_budget_plan->status !== 'submitted') {
    //         return response()->json(['message' => 'Only submitted plans can be approved.'], 422);
    //     }

    //     $department_budget_plan->update(['status' => 'approved']);
    //     return $this->success(['message' => 'Approved successfully.']);
    // }

    // public function reject(DepartmentBudgetPlan $department_budget_plan)
    // {
    //     $this->authorize('reject', $department_budget_plan);
    //     $department_budget_plan->update(['status' => 'draft']);
    //     return $this->success(['message' => 'Returned to draft.']);
    // }

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

    $department_budget_plan->update([
        'status'       => 'submitted',
        'submitted_at' => now(),
    ]);

    // ── Notify admins ─────────────────────────────────────────────────────
    $department_budget_plan->load('department', 'budgetPlan');
    $admins = User::whereIn('role', ['admin', 'super-admin'])->get();
    \Notification::send($admins, new BudgetProposalSubmitted($department_budget_plan));
    // ─────────────────────────────────────────────────────────────────────

    return $this->success(['message' => 'Submitted successfully.']);
}

public function acknowledge(DepartmentBudgetPlan $department_budget_plan)
{
    $this->authorize('acknowledge', $department_budget_plan);

    if ($department_budget_plan->status !== 'submitted') {
        return response()->json(['message' => 'Only submitted plans can be acknowledged.'], 422);
    }

   $department_budget_plan->update([
        'status'          => 'under_review',
        'acknowledged_at' => now(),
    ]);

    // ── Notify department head ────────────────────────────────────────────
    $department_budget_plan->load('department', 'budgetPlan');
    $deptHead = User::where('dept_id', $department_budget_plan->dept_id)
                    ->where('role', 'department-head')
                    ->first();
    if ($deptHead) {
        $deptHead->notify(new BudgetProposalAcknowledged($department_budget_plan));
    }
    // ─────────────────────────────────────────────────────────────────────

    return $this->success(['message' => 'Marked as under review.']);
}

public function approve(DepartmentBudgetPlan $department_budget_plan)
{
    $this->authorize('approve', $department_budget_plan);

    if ($department_budget_plan->status !== 'under_review') {
        return response()->json(['message' => 'Only plans currently under review can be approved.'], 422);
    }

    $department_budget_plan->update([
        'status'      => 'approved',
        'approved_at' => now(),
    ]);

    // ── Notify department head ────────────────────────────────────────────
    $department_budget_plan->load('department', 'budgetPlan');
    $deptHead = User::where('dept_id', $department_budget_plan->dept_id)
                    ->where('role', 'department-head')
                    ->first();
    if ($deptHead) {
        $deptHead->notify(new BudgetProposalApproved($department_budget_plan));
    }
    // ─────────────────────────────────────────────────────────────────────

    return $this->success(['message' => 'Approved successfully.']);
}

public function reject(Request $request, DepartmentBudgetPlan $department_budget_plan)
{
    $this->authorize('reject', $department_budget_plan);

    $validated = $request->validate([
        'reason' => ['nullable', 'string', 'max:1000'],
    ]);
    $reason = $validated['reason'] ?? null;

    $department_budget_plan->update([
        'status'          => 'draft',
        'returned_at'     => now(),
        'submitted_at'    => null,
        'acknowledged_at' => null,
        'approved_at'     => null,
    ]);

    // ── Notify department head ────────────────────────────────────────────
    $department_budget_plan->load('department', 'budgetPlan');
    $deptHead = User::where('dept_id', $department_budget_plan->dept_id)
                    ->where('role', 'department-head')
                    ->first();
    if ($deptHead) {
        $deptHead->notify(new BudgetProposalReturned($department_budget_plan, $reason));
    }
    // ─────────────────────────────────────────────────────────────────────

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

    /**
     * GET /api/department-budget-plans/totals?budget_plan_id=X
     *
     * Returns, per department, the combined Form2 + Form4 total for the given
     * budget plan year AND for the prior year — in ONE request instead of the
     * ~4-per-department fan-out the list page used to make (past-year lookup,
     * past AIP, current AIP, all repeated per department).
     */
    /**
     * GET /department-budget-plans/section-totals?budget_plan_id=X
     *
     * Per-department Form2 totals grouped by expense classification
     * (PS/MOOE/FE/CO/SPA), summed in SQL. Replaces SectorAllocationCard's
     * previous full department-budget-plans fetch (every item, with the
     * nested expense_item.classification relation, for every department) —
     * that call alone was ~900kB; this returns a handful of aggregated rows.
     */
    /**
     * GET /department-budget-plans/year-totals?plan_ids=1,2,5
     *
     * Per-department (dept_id + total) for a set of budget plans in one call —
     * combines Form2 line items and AIP program amounts in SQL. Built for
     * BudgetAreaChart's 3-year comparison, which previously fired 3x
     * department-budget-plans (full department objects incl. logos, names)
     * + 3x aip-programs just to sum two numbers per department per year.
     */
    public function yearTotals(Request $request)
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);

        $validated = $request->validate([
            'plan_ids' => 'required|string',
        ]);

        $planIds = array_values(array_filter(array_map('intval', explode(',', $validated['plan_ids']))));
        if (empty($planIds)) {
            return $this->success([]);
        }

        $form2 = DB::table('department_budget_plans as dbp')
            ->leftJoin('dept_bp_form2_items as f2', 'f2.dept_budget_plan_id', '=', 'dbp.dept_budget_plan_id')
            ->whereIn('dbp.budget_plan_id', $planIds)
            ->select('dbp.budget_plan_id', 'dbp.dept_id', DB::raw('COALESCE(SUM(f2.total_amount), 0) as form2_total'))
            ->groupBy('dbp.budget_plan_id', 'dbp.dept_id')
            ->get();

        $aip = DB::table('dept_bp_form4_items as f4')
            ->join('department_budget_plans as dbp2', 'dbp2.dept_budget_plan_id', '=', 'f4.dept_budget_plan_id')
            ->whereIn('dbp2.budget_plan_id', $planIds)
            ->select('dbp2.budget_plan_id', 'dbp2.dept_id', DB::raw('SUM(f4.total_amount) as aip_total'))
            ->groupBy('dbp2.budget_plan_id', 'dbp2.dept_id')
            ->get();

        $aipMap = [];
        foreach ($aip as $row) {
            $aipMap["{$row->budget_plan_id}_{$row->dept_id}"] = (float) $row->aip_total;
        }

        $result = [];
        foreach ($form2 as $row) {
            $key = (string) $row->budget_plan_id;
            $result[$key] ??= [];
            $result[$key][] = [
                'dept_id' => (int) $row->dept_id,
                'total'   => (float) $row->form2_total + ($aipMap["{$row->budget_plan_id}_{$row->dept_id}"] ?? 0),
            ];
        }

        return $this->success($result);
    }

    public function sectionTotals(Request $request)
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        $rows = BudgetPlanForm2Item::query()
            ->join('department_budget_plans', 'department_budget_plans.dept_budget_plan_id', '=', 'dept_bp_form2_items.dept_budget_plan_id')
            ->join('expense_class_items', 'expense_class_items.expense_class_item_id', '=', 'dept_bp_form2_items.expense_item_id')
            ->join('expense_classifications', 'expense_classifications.expense_class_id', '=', 'expense_class_items.expense_class_id')
            ->where('department_budget_plans.budget_plan_id', $validated['budget_plan_id'])
            ->selectRaw('
                department_budget_plans.dept_id as dept_id,
                expense_classifications.abbreviation as code,
                SUM(dept_bp_form2_items.total_amount) as total
            ')
            ->groupBy('department_budget_plans.dept_id', 'expense_classifications.abbreviation')
            ->get()
            ->map(fn ($row) => [
                'dept_id' => (int) $row->dept_id,
                'code'    => $row->code,
                'total'   => (float) $row->total,
            ]);

        return $this->success($rows);
    }

    public function totals(Request $request)
    {
        $this->authorize('viewAny', DepartmentBudgetPlan::class);

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        $currentBp = BudgetPlan::findOrFail($validated['budget_plan_id']);
        $pastBp    = BudgetPlan::where('year', $currentBp->year - 1)->first();

        $currentDeptPlans = DepartmentBudgetPlan::where('budget_plan_id', $currentBp->budget_plan_id)
            ->get(['dept_budget_plan_id', 'dept_id']);

        $pastDeptPlans = $pastBp
            ? DepartmentBudgetPlan::where('budget_plan_id', $pastBp->budget_plan_id)
                ->get(['dept_budget_plan_id', 'dept_id'])
            : collect();

        $currentPlanIds = $currentDeptPlans->pluck('dept_budget_plan_id');
        $pastPlanIds    = $pastDeptPlans->pluck('dept_budget_plan_id');

        $currentForm2 = BudgetPlanForm2Item::whereIn('dept_budget_plan_id', $currentPlanIds)
            ->selectRaw('dept_budget_plan_id, SUM(total_amount) as total')
            ->groupBy('dept_budget_plan_id')
            ->pluck('total', 'dept_budget_plan_id');

        $currentForm4 = DeptBpForm4Item::whereIn('dept_budget_plan_id', $currentPlanIds)
            ->selectRaw('dept_budget_plan_id, SUM(total_amount) as total')
            ->groupBy('dept_budget_plan_id')
            ->pluck('total', 'dept_budget_plan_id');

        $pastForm2 = BudgetPlanForm2Item::whereIn('dept_budget_plan_id', $pastPlanIds)
            ->selectRaw('dept_budget_plan_id, SUM(total_amount) as total')
            ->groupBy('dept_budget_plan_id')
            ->pluck('total', 'dept_budget_plan_id');

        $pastForm4 = DeptBpForm4Item::whereIn('dept_budget_plan_id', $pastPlanIds)
            ->selectRaw('dept_budget_plan_id, SUM(total_amount) as total')
            ->groupBy('dept_budget_plan_id')
            ->pluck('total', 'dept_budget_plan_id');

        $pastByDeptId = $pastDeptPlans->keyBy('dept_id');

        // ── Preload department abbreviations for the special-account check ─────
        // (mirrors the frontend's getSourceForDepartment: sh / occ / pm only)
        $deptIds = $currentDeptPlans->pluck('dept_id')->unique();
        $deptSourceById = Department::whereIn('dept_id', $deptIds)
            ->get(['dept_id', 'dept_abbreviation', 'dept_name'])
            ->mapWithKeys(function ($d) {
                $abbr = strtolower($d->dept_abbreviation ?? '');
                $name = strtolower($d->dept_name ?? '');
                $source = null;
                if ($abbr === 'sh' || str_contains($name, 'slaughter')) $source = 'sh';
                elseif ($abbr === 'occ' || str_contains($name, 'opol community')) $source = 'occ';
                elseif ($abbr === 'pm' || str_contains($name, 'public market')) $source = 'pm';
                return [$d->dept_id => $source];
            });

        $result = $currentDeptPlans->map(function ($cp) use (
            $currentForm2, $currentForm4, $pastByDeptId, $pastForm2, $pastForm4,
            $currentBp, $deptSourceById
        ) {
            $currentTotal = (float) ($currentForm2[$cp->dept_budget_plan_id] ?? 0)
                          + (float) ($currentForm4[$cp->dept_budget_plan_id] ?? 0);

            $pastPlan  = $pastByDeptId->get($cp->dept_id);
            $pastTotal = $pastPlan
                ? (float) ($pastForm2[$pastPlan->dept_budget_plan_id] ?? 0)
                  + (float) ($pastForm4[$pastPlan->dept_budget_plan_id] ?? 0)
                : 0.0;

            // ── 5% Calamity Fund add-on for special accounts (sh/occ/pm) ────────
            // These amounts are never stored as Form2/Form4 rows — Form2's own
            // grand total computes them live via /calamity-fund + /ldrrmfip/summary,
            // so the list-page card must reproduce the same sum or it under-reports.
            $source = $deptSourceById->get($cp->dept_id);
            if ($source) {
                try {
                    $calamityReq = new Request([
                        'budget_plan_id' => $currentBp->budget_plan_id,
                        'source'         => $source,
                    ]);
                    $calamityResp = app(CalamityFundController::class)->index($calamityReq);
                    $calamityData = json_decode($calamityResp->getContent(), true)['data'] ?? null;
                    $quickResponse = (float) ($calamityData['quick_response'] ?? 0);

                    $ldrrmfReq = new Request([
                        'budget_plan_id' => $currentBp->budget_plan_id,
                        'source'         => $source,
                    ]);
                    // NOTE: adjust the method name below if your LdrrmfipController's
                    // summary action isn't literally named `summary` — check
                    // routes/api.php for whatever maps to GET /ldrrmfip/summary.
                    $ldrrmfResp = app(LdrrmfipController::class)->summary($ldrrmfReq);
                    $ldrrmfData = json_decode($ldrrmfResp->getContent(), true)['data'] ?? null;
                    $preDisasterActual = (float) ($ldrrmfData['total70'] ?? $ldrrmfData['total_70pct'] ?? 0);

                    $currentTotal += $preDisasterActual + $quickResponse;
                } catch (\Throwable $e) {
                    // Fail soft — a card missing the calamity add-on for one
                    // department shouldn't break the whole list endpoint.
                    \Log::warning('Calamity fund totals lookup failed', [
                        'dept_id' => $cp->dept_id,
                        'source'  => $source,
                        'error'   => $e->getMessage(),
                    ]);
                }
            }

            return [
                'dept_id'             => $cp->dept_id,
                'dept_budget_plan_id' => $cp->dept_budget_plan_id,
                'current_total'       => $currentTotal,
                'past_total'          => $pastTotal,
            ];
        })->values();

        return $this->success($result);
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
            // $snapshots = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
            //     ->where('dept_budget_plan_id', $plan->dept_budget_plan_id)
            //     ->get()
            //     ->reject(fn ($item) =>
            //         $item->plantillaPosition
            //         && !$item->plantillaPosition->is_active
            //         && (float) $item->annual_rate == 0
            //     )
            //     ->values();

            $snapshots = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                ->where('dept_budget_plan_id', $plan->dept_budget_plan_id)
                ->get()
                ->reject(fn ($item) =>
                    $item->plantillaPosition
                    && !$item->plantillaPosition->is_active
                )
                ->values();

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
                        'old_item_number'          => $item->plantillaPosition->old_item_number,
                        'new_item_number'          => $item->plantillaPosition->new_item_number,
                        'position_title'           => $item->plantillaPosition->position_title,
                        'extension_department_id'  => $item->plantillaPosition->extension_department_id,
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
                        'old_item_number'          => $position->old_item_number,
                        'new_item_number'          => $position->new_item_number,
                        'position_title'           => $position->position_title,
                        'extension_department_id'  => $position->extension_department_id,
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

        if ($department_budget_plan->isFormsLockedFor($request->user())) {
            return response()->json(['message' => 'Forms 2 and 4 are locked because this plan is approved. Only a super-admin can modify them.'], 403);
        }

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
                $expItem = ExpenseClassItem::whereRaw(
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
