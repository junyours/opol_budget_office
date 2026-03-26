<?php

namespace App\Http\Controllers\Api;

use App\Models\ExpenseClassItem;
use App\Models\DepartmentBudgetPlan;
use App\Models\BudgetPlanForm2Item;
use Illuminate\Http\Request;

class BudgetSummaryController extends BaseApiController
{
    /**
     * Get aggregated totals for statutory and contractual items for a given year.
     */
    public function statutoryAndContractualTotals($year)
    {
        $itemNames = [
            'Retirement Gratuity',
            'Terminal Leave Benefits',
            'Other Personnel Benefits',
            'Employees Compensation Insurance Premiums',
            'PhilHealth Contributions',
            'Pag-IBIG Contributions',
            'Retirement and Life Insurance Premiums',
        ];

        // Fetch the expense item IDs
        $items = ExpenseClassItem::whereIn('expense_class_item_name', $itemNames)
            ->get(['expense_class_item_id', 'expense_class_item_name']);

        if ($items->isEmpty()) {
            return $this->success([]);
        }

        $itemIds = $items->pluck('expense_class_item_id');

        // Get all budget plans for the given year (any status)
        $planIds = DepartmentBudgetPlan::where('year', $year)->pluck('dept_budget_plan_id');

        if ($planIds->isEmpty()) {
            return $this->success([]);
        }

        // Sum total_amount per expense_item_id
        $totals = BudgetPlanForm2Item::whereIn('dept_budget_plan_id', $planIds)
            ->whereIn('expense_item_id', $itemIds)
            ->groupBy('expense_item_id')
            ->selectRaw('expense_item_id, sum(total_amount) as total')
            ->get()
            ->keyBy('expense_item_id');

        // Build result array with item names as keys
        $result = [];
        foreach ($items as $item) {
            $result[$item->expense_class_item_name] = isset($totals[$item->expense_class_item_id])
                ? (float) $totals[$item->expense_class_item_id]->total
                : 0;
        }

        return $this->success($result);
    }
}