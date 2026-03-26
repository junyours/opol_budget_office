<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * ConsolidatedSpecialIncomeController
 *
 * Builds the Consolidated Estimated Income — Special Account table.
 *
 * Structure:
 *   Rows    = Departments whose category.dept_category_name ILIKE '%special%'
 *   Columns = Income fund objects (leaf nodes with proposed > 0) for each
 *             department's source (sh / occ / pm / etc.)
 *   Cells   = proposed_amount from income_fund_amounts for that dept/source/object
 *   Total   = SUM of all income objects for the department
 *   Grand   = SUM of all department totals
 *
 * GET /api/consolidated-special-income?budget_plan_id=X
 *
 * Response shape:
 * {
 *   budget_plan_id: number,
 *   year: number,
 *   departments: [
 *     {
 *       dept_id:    number,
 *       dept_name:  string,
 *       dept_abbreviation: string,
 *       source:     string,           // e.g. "sh", "occ", "pm"
 *       columns: [                    // income objects that have values
 *         { object_id: number, name: string, amount: number }
 *       ],
 *       total: number
 *     }
 *   ],
 *   grand_total: number
 * }
 */
class ConsolidatedSpecialIncomeController extends BaseApiController
{
    /**
     * Source slug mapping — derived from dept_abbreviation (lowercase, trimmed).
     * Extend as needed.
     */
    private const SOURCE_MAP = [
        'meeo'  => 'pm',    // Public Market falls under MEEO
        'pm'    => 'pm',
        'sh'    => 'sh',
        'occ'   => 'occ',
    ];

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'sometimes|integer|exists:budget_plans,budget_plan_id',
        ]);

        // Resolve budget plan
        $budgetPlanId = $request->filled('budget_plan_id')
            ? (int) $request->input('budget_plan_id')
            : DB::table('budget_plans')->where('is_active', true)->value('budget_plan_id');

        if (!$budgetPlanId) {
            return response()->json([
                'success' => false,
                'message' => 'No active budget plan found.',
            ], 404);
        }

        $budgetYear = DB::table('budget_plans')
            ->where('budget_plan_id', $budgetPlanId)
            ->value('year');

        // 1. Fetch special-account departments
        $departments = DB::table('departments as d')
            ->join('department_categories as dc', 'd.dept_category_id', '=', 'dc.dept_category_id')
            ->whereRaw("LOWER(dc.dept_category_name) LIKE '%special%'")
            ->select('d.dept_id', 'd.dept_name', 'd.dept_abbreviation', 'd.logo')
            ->orderBy('d.dept_name')
            ->get();

        if ($departments->isEmpty()) {
            return $this->success([
                'budget_plan_id' => $budgetPlanId,
                'year'           => $budgetYear,
                'departments'    => [],
                'grand_total'    => 0,
            ]);
        }

        $grandTotal = 0.0;
        $result     = [];

        foreach ($departments as $dept) {
            $abbrev = strtolower(trim($dept->dept_abbreviation ?? ''));
            $source = self::SOURCE_MAP[$abbrev] ?? $abbrev;

            // 2. Fetch all income_fund_amounts for this source + budget_plan where proposed > 0
            //    Join income_fund_objects to get the item name and ensure it is a leaf node
            //    (has no children that also have amounts — simplest: just fetch all with values)
            $incomeItems = DB::table('income_fund_amounts as ifa')
                ->join('income_fund_objects as ifo', 'ifa.income_fund_object_id', '=', 'ifo.id')
                ->where('ifa.budget_plan_id', $budgetPlanId)
                ->where('ifa.source', $source)
                ->where('ifa.proposed_amount', '>', 0)
                ->whereNotExists(function ($q) {
                    // Exclude parent nodes — only include leaf objects
                    $q->select(DB::raw(1))
                      ->from('income_fund_objects as child')
                      ->whereColumn('child.parent_id', 'ifo.id');
                })
                ->select(
                    'ifo.id as object_id',
                    'ifo.name',
                    'ifa.proposed_amount as amount'
                )
                ->orderBy('ifo.id')
                ->get();

            $deptTotal = $incomeItems->sum('amount');
            $grandTotal += $deptTotal;

            $result[] = [
                'dept_id'           => $dept->dept_id,
                'dept_name'         => $dept->dept_name,
                'dept_abbreviation' => $dept->dept_abbreviation,
                'logo'              => $dept->logo,
                'source'            => $source,
                'columns'           => $incomeItems->map(fn($i) => [
                    'object_id' => $i->object_id,
                    'name'      => $i->name,
                    'amount'    => (float) $i->amount,
                ])->values()->toArray(),
                'total' => (float) $deptTotal,
            ];
        }

        return $this->success([
            'budget_plan_id' => $budgetPlanId,
            'year'           => $budgetYear,
            'departments'    => $result,
            'grand_total'    => (float) $grandTotal,
        ]);
    }
}