<?php


namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\IncomeFundObject;
use App\Models\IncomeFundAmount;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class IncomeFundController extends Controller
{
    protected function getUserSource($requestSource = null)
    {
        $user = Auth::user();

        // If source is provided in request and user is admin, use that source
        if ($requestSource && ($user->role === 'admin' || $user->role === 1 || $user->role === 'super-admin')) {
            return $requestSource;
        }

        // For non-admin users, determine source based on department
        if ($user->role === 'department-head' || $user->role === 2) {
            $department = $user->department;

            if (!$department) {
                return null;
            }

            $departmentName = strtolower($department->dept_name ?? '');
            $departmentCode = strtolower($department->dept_abbreviation ?? '');

            if (str_contains($departmentName, 'slaughter') || $departmentCode === 'sh') {
                return 'sh';
            }

            if (
                str_contains($departmentName, 'college') ||
                $departmentCode === 'occ' ||
                str_contains($departmentName, 'opol community')
            ) {
                return 'occ';
            }

            if (str_contains($departmentName, 'market') || $departmentCode === 'pm') {
                return 'pm';
            }
        }

        // Default for admin
        return 'general-fund';
    }

    public function index(Request $request)
    {
        $source = $this->getUserSource($request->get('source'));

        if (!$source) {
            return response()->json([
                'message' => 'Unauthorized access'
            ], 403);
        }

        $active = BudgetPlan::where('is_active', 1)->first();

        if (!$active) {
            return response()->json([
                'message' => 'No active budget plan'
            ], 404);
        }

        $year = $active->year;
        $pastYear = $year - 2;
        $currentYear = $year - 1;

        $pastPlan = BudgetPlan::where('year', $pastYear)->first();
        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        // Get objects filtered by source
        $objects = IncomeFundObject::where('source', $source)
            ->orderBy('sort_order')
            ->get();

        $rows = [];

        foreach ($objects as $obj) {
            $past = null;
            $currentTotal = null;

            if ($pastPlan) {
                $pastAmount = IncomeFundAmount::where([
                    'budget_plan_id' => $pastPlan->budget_plan_id,
                    'income_fund_object_id' => $obj->id,
                    'source' => $source
                ])->first();

                $past = $pastAmount?->proposed_amount;
            }

            if ($currentPlan) {
                $currentAmount = IncomeFundAmount::where([
                    'budget_plan_id' => $currentPlan->budget_plan_id,
                    'income_fund_object_id' => $obj->id,
                    'source' => $source
                ])->first();

                $currentTotal = $currentAmount?->proposed_amount;
            }

            $current = IncomeFundAmount::where([
                'budget_plan_id' => $active->budget_plan_id,
                'income_fund_object_id' => $obj->id,
                'source' => $source
            ])->first();

            $rows[] = [
                'id' => $obj->id,
                'parent_id' => $obj->parent_id,
                'code' => $obj->code,
                'name' => $obj->name,
                'level' => $obj->level,
                'past' => $past,
                'current_total' => $currentTotal,
                'sem1' => $current->sem1_actual ?? null,
                'sem2' => $current->sem2_actual ?? null,
                'proposed' => $current->proposed_amount ?? null
            ];
        }

        $recordsExist = IncomeFundAmount::where('budget_plan_id', $active->budget_plan_id)
            ->where('source', $source)
            ->exists();

        return response()->json([
            'year' => $year,
            'past_year' => $pastYear,
            'current_year' => $currentYear,
            'source' => $source,
            'records_exist' => $recordsExist,
            'data' => $rows
        ]);
    }

    public function save(Request $request)
    {
        $source = $this->getUserSource($request->get('source'));

        if (!$source) {
            return response()->json(['message' => 'Unauthorized'], 403);
        }

        $plan = BudgetPlan::where('is_active', 1)->first();

        if (!$plan) {
            return response()->json(['message' => 'No active plan'], 404);
        }

        DB::beginTransaction();
        
        try {
            foreach ($request->rows as $row) {
                IncomeFundAmount::updateOrCreate(
                    [
                        'budget_plan_id' => $plan->budget_plan_id,
                        'income_fund_object_id' => $row['id'],
                        'source' => $source
                    ],
                    [
                        'sem1_actual' => $row['sem1'],
                        'sem2_actual' => $row['sem2'],
                        'proposed_amount' => $row['proposed']
                    ]
                );
            }
            
            DB::commit();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Save failed: ' . $e->getMessage()], 500);
        }
    }
}