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

        // $year = $active->year;
        // $pastYear = $year - 2;
        // $currentYear = $year - 1;

        // $pastPlan = BudgetPlan::where('year', $pastYear)->first();
        // $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        $year = $active->year;
        $pastYear = $year - 2;
        $currentYear = $year - 1;

        $pastPlan = BudgetPlan::where('year', $pastYear)->first();
        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        // Initialize past plan records if they don't exist yet
        // Check past plan existence and initialize records if needed
$pastPlanMissing = false;
if (!$pastPlan) {
    $pastPlanMissing = true;
} else {
    // Only initialize if no records exist yet for this past plan + source
    $pastRecordsExist = IncomeFundAmount::where('budget_plan_id', $pastPlan->budget_plan_id)
        ->where('source', $source)
        ->exists();

    if (!$pastRecordsExist) {
        $objects = IncomeFundObject::where('source', $source)->get();
        foreach ($objects as $obj) {
            IncomeFundAmount::firstOrCreate(
                [
                    'budget_plan_id'        => $pastPlan->budget_plan_id,
                    'income_fund_object_id' => $obj->id,
                    'source'                => $source,
                ],
                [
                    'sem1_actual'       => null,
                    'sem2_actual'       => null,
                    'proposed_amount'   => null,
                    'obligation_amount' => null,
                ]
            );
        }
    }
}

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

            // $current = IncomeFundAmount::where([
            //     'budget_plan_id' => $active->budget_plan_id,
            //     'income_fund_object_id' => $obj->id,
            //     'source' => $source
            // ])->first();

            // $rows[] = [
            //     'id' => $obj->id,
            //     'parent_id' => $obj->parent_id,
            //     'code' => $obj->code,
            //     'name' => $obj->name,
            //     'level' => $obj->level,
            //     'past' => $past,
            //     'current_total' => $currentTotal,
            //     'sem1' => $current->sem1_actual ?? null,
            //     'sem2' => $current->sem2_actual ?? null,
            //     'proposed' => $current->proposed_amount ?? null
            // ];

            $current = IncomeFundAmount::where([
                'budget_plan_id' => $active->budget_plan_id,
                'income_fund_object_id' => $obj->id,
                'source' => $source
            ])->first();

            $pastAmount = null;
            $pastObligation = null;
            if ($pastPlan) {
                $pastRecord = IncomeFundAmount::where([
                    'budget_plan_id'        => $pastPlan->budget_plan_id,
                    'income_fund_object_id' => $obj->id,
                    'source'                => $source,
                ])->first();
                $pastAmount     = $pastRecord?->proposed_amount;
                $pastObligation = $pastRecord?->obligation_amount;
            }

            $currentSem1  = null;
            $currentSem2  = null;
            $currentTotal = null;
            if ($currentPlan) {
                $currentRecord = IncomeFundAmount::where([
                    'budget_plan_id'        => $currentPlan->budget_plan_id,
                    'income_fund_object_id' => $obj->id,
                    'source'                => $source,
                ])->first();
                $currentSem1  = $currentRecord?->sem1_actual;
                $currentSem2  = $currentRecord?->sem2_actual;
                $currentTotal = $currentRecord?->proposed_amount;
            }

            $rows[] = [
                'id'              => $obj->id,
                'parent_id'       => $obj->parent_id,
                'code'            => $obj->code,
                'name'            => $obj->name,
                'level'           => $obj->level,
                'past'            => $pastAmount,
                'past_obligation' => $pastObligation,   // ← new
                'current_sem1'    => $currentSem1,      // ← renamed (was sem1 from active plan)
                'current_sem2'    => $currentSem2,      // ← renamed
                'current_total'   => $currentTotal,
                'sem1'            => $current?->sem1_actual,
                'sem2'            => $current?->sem2_actual,
                'proposed'        => $current?->proposed_amount,
            ];
        }

        $recordsExist = IncomeFundAmount::where('budget_plan_id', $active->budget_plan_id)
            ->where('source', $source)
            ->exists();

        return response()->json([
            'year'              => $year,
            'past_year'         => $pastYear,
            'current_year'      => $currentYear,
            'source'            => $source,
            'records_exist'     => $recordsExist,
            'past_plan_missing' => $pastPlanMissing,
            'data'              => $rows
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

// Current year plan (year - 1) is where sem1/sem2 actual values belong
$currentPlan = BudgetPlan::where('year', $plan->year - 1)->first();

// Past plan (year - 2) is where obligation_amount belongs
$pastPlan = BudgetPlan::where('year', $plan->year - 2)->first();

        // Validate past plan exists before any obligation_amount save is attempted
        $hasPastObligationData = collect($request->rows)->contains(fn($r) =>
            array_key_exists('past_obligation', $r) && $r['past_obligation'] !== null
        );

        if ($hasPastObligationData && !$pastPlan) {
            return response()->json([
                'message' => "Budget plan for year " . ($plan->year - 2) . " does not exist. Please create it first before entering past year obligation amounts."
            ], 422);
        }

        DB::beginTransaction();

        try {
            foreach ($request->rows as $row) {
    // Save proposed_amount to the ACTIVE plan (budget year e.g. 2027)
    IncomeFundAmount::updateOrCreate(
        [
            'budget_plan_id'        => $plan->budget_plan_id,
            'income_fund_object_id' => $row['id'],
            'source'                => $source,
        ],
        [
            'proposed_amount' => $row['proposed'] ?? null,
        ]
    );

    // Save sem1/sem2 actual values to the CURRENT YEAR plan (e.g. 2026)
    if ($currentPlan) {
        IncomeFundAmount::updateOrCreate(
            [
                'budget_plan_id'        => $currentPlan->budget_plan_id,
                'income_fund_object_id' => $row['id'],
                'source'                => $source,
            ],
            [
                'sem1_actual' => $row['sem1'] ?? null,
                'sem2_actual' => $row['sem2'] ?? null,
            ]
        );
    }

                // Save obligation_amount to the past plan record
                if ($pastPlan && array_key_exists('past_obligation', $row)) {
                    IncomeFundAmount::updateOrCreate(
                        [
                            'budget_plan_id'        => $pastPlan->budget_plan_id,
                            'income_fund_object_id' => $row['id'],
                            'source'                => $source,
                        ],
                        [
                            'obligation_amount' => $row['past_obligation'] ?? null,
                        ]
                    );
                }
            }

            DB::commit();
            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Save failed: ' . $e->getMessage()], 500);
        }
    }

    // public function save(Request $request)
    // {
    //     $source = $this->getUserSource($request->get('source'));

    //     if (!$source) {
    //         return response()->json(['message' => 'Unauthorized'], 403);
    //     }

    //     $plan = BudgetPlan::where('is_active', 1)->first();

    //     if (!$plan) {
    //         return response()->json(['message' => 'No active plan'], 404);
    //     }

    //     DB::beginTransaction();

    //     try {
    //         foreach ($request->rows as $row) {
    //             IncomeFundAmount::updateOrCreate(
    //                 [
    //                     'budget_plan_id' => $plan->budget_plan_id,
    //                     'income_fund_object_id' => $row['id'],
    //                     'source' => $source
    //                 ],
    //                 [
    //                     'sem1_actual' => $row['sem1'],
    //                     'sem2_actual' => $row['sem2'],
    //                     'proposed_amount' => $row['proposed']
    //                 ]
    //             );
    //         }

    //         DB::commit();
    //         return response()->json(['success' => true]);
    //     } catch (\Exception $e) {
    //         DB::rollBack();
    //         return response()->json(['message' => 'Save failed: ' . $e->getMessage()], 500);
    //     }
    // }
}
