<?php

// namespace App\Http\Controllers\Api;

// use App\Models\DepartmentBudgetPlan;
// use App\Models\BudgetPlanForm2Item;
// use Illuminate\Http\Request;

// class BudgetPlanForm2ItemController extends BaseApiController
// {
//     public function index(DepartmentBudgetPlan $department_budget_plan)
//     {
//         $this->authorize('view', $department_budget_plan);

//         $items = $department_budget_plan->items()->with(['expenseItem', 'updatedBy'])->get();

//         return $this->success($items);
//     }

//     public function store(Request $request, DepartmentBudgetPlan $department_budget_plan)
//     {
//         $this->authorize('update', $department_budget_plan);

//         // if ($department_budget_plan->status !== 'draft') {
//         //     return $this->error('Plan locked', 422);
//         // }
//         if ($department_budget_plan->status !== 'draft' && !$request->user()->hasRole('admin')) {
//             return $this->error('Plan locked', 422);
//         }

//         $validated = $request->validate([
//             'expense_item_id'   => 'required|exists:expense_class_items,expense_class_item_id',
//             'total_amount'      => 'nullable|numeric|min:0',
//             'sem1_amount'       => 'nullable|numeric|min:0',
//             'sem2_amount'       => 'nullable|numeric|min:0',
//             'obligation_amount' => 'nullable|numeric|min:0',
//             'recommendation'    => 'nullable|string|max:255',
//         ]);

//         $exists = $department_budget_plan->items()
//             ->where('expense_item_id', $validated['expense_item_id'])
//             ->exists();

//         if ($exists) {
//             return $this->error('Item already exists', 422);
//         }

       
//         if (array_key_exists('total_amount', $validated) && !is_null($validated['total_amount'])) {
//             $total = $validated['total_amount'];
//             $sem1  = 0;   // ? was: $sem1 = $total
//             $sem2  = 0;
//         } else {
//             $sem1  = $validated['sem1_amount'] ?? 0;
//             $sem2  = $validated['sem2_amount'] ?? 0;
//             $total = $sem1 + $sem2;
//         }

//         $item = $department_budget_plan->items()->create([
//             'expense_item_id'   => $validated['expense_item_id'],
//             'sem1_amount'       => $sem1,
//             'sem2_amount'       => $sem2,
//             'total_amount'      => $total,
//             'obligation_amount' => $validated['obligation_amount'] ?? 0,
//             'recommendation'    => $validated['recommendation'] ?? null,
//             'updated_by'        => $request->user()->user_id,
//         ]);

//         return $this->success($item->load('expenseItem'), 201);
//     }

//     public function update(
//         Request $request,
//         DepartmentBudgetPlan $department_budget_plan,
//         BudgetPlanForm2Item $item
//     ) {
//         // if ($item->dept_budget_plan_id !== $department_budget_plan->dept_budget_plan_id) {
//         //     return response()->json(['message' => 'Item does not belong to this budget plan'], 403);
//         // }

//         if ($department_budget_plan->status !== 'draft' && !$request->user()->hasRole('admin')) {
//             return $this->error('Plan locked', 422);
//         }

//         // $this->authorize('update', $item);

//         // if ($department_budget_plan->status !== 'draft') {
//         //     return $this->error('Plan locked', 422);
//         // }

//         $this->authorize('update', $item);

//         if ($department_budget_plan->status !== 'draft' && !$request->user()->hasRole('admin')) {
//             return $this->error('Plan locked', 422);
//         }

//         $validated = $request->validate([
//             'total_amount'      => 'nullable|numeric|min:0',
//             'sem1_amount'       => 'nullable|numeric|min:0',
//             'sem2_amount'       => 'nullable|numeric|min:0',
//             'obligation_amount' => 'nullable|numeric|min:0',
//             'recommendation'    => 'nullable|string|max:255',
//         ]);

//         // Proposed year update: total_amount only
//         if (array_key_exists('total_amount', $validated) && !is_null($validated['total_amount'])) {
//             $item->total_amount = $validated['total_amount'];
//         }
//         // Past year update: sem1 changes, total stays fixed
//         elseif (array_key_exists('sem1_amount', $validated) && !is_null($validated['sem1_amount'])) {
//             $total            = $item->total_amount;
//             $newSem1          = min(max($validated['sem1_amount'], 0), $total);
//             $item->sem1_amount = $newSem1;
//             $item->sem2_amount = $total - $newSem1;
//         }
//         // Both sem1 + sem2 explicitly (rare)
//         elseif (array_key_exists('sem1_amount', $validated) && array_key_exists('sem2_amount', $validated)) {
//             $item->sem1_amount  = $validated['sem1_amount'];
//             $item->sem2_amount  = $validated['sem2_amount'];
//             $item->total_amount = $validated['sem1_amount'] + $validated['sem2_amount'];
//         }

//         // Recommendation saves independently alongside any other field update
//         if (array_key_exists('recommendation', $validated)) {
//             $item->recommendation = $validated['recommendation'];
//         }

//         // Obligation amount — admin uploads past actual
//         if (array_key_exists('obligation_amount', $validated) && !is_null($validated['obligation_amount'])) {
//             $item->obligation_amount = $validated['obligation_amount'];
//         }

//         $item->updated_by = $request->user()->user_id;
//         $item->save();

//         return $this->success($item);
//     }

//     public function destroy(DepartmentBudgetPlan $department_budget_plan, BudgetPlanForm2Item $item)
//     {
//         $this->authorize('delete', $item);

//         $item->delete();

//         return $this->success(['message' => 'Item deleted']);
//     }
// }


namespace App\Http\Controllers\Api;

use App\Models\DepartmentBudgetPlan;
use App\Models\BudgetPlanForm2Item;
use Illuminate\Http\Request;

class BudgetPlanForm2ItemController extends BaseApiController
{
    public function index(DepartmentBudgetPlan $department_budget_plan)
    {
        $this->authorize('view', $department_budget_plan);

        $items = $department_budget_plan->items()->with(['expenseItem', 'updatedBy'])->get();

        return $this->success($items);
    }

    public function store(Request $request, DepartmentBudgetPlan $department_budget_plan)
    {
        // Admins can add items to any plan regardless of status.
        // Non-admins are restricted to their own draft plans via policy.
        // $isAdmin = $request->user()->hasRole('admin');
        $isAdmin = $request->user()->role === 'admin';

        if (!$isAdmin) {
            $this->authorize('update', $department_budget_plan);

            if ($department_budget_plan->status !== 'draft') {
                return $this->error('Plan locked', 422);
            }
        }

        $validated = $request->validate([
            'expense_item_id'   => 'required|exists:expense_class_items,expense_class_item_id',
            'total_amount'      => 'nullable|numeric|min:0',
            'sem1_amount'       => 'nullable|numeric|min:0',
            'sem2_amount'       => 'nullable|numeric|min:0',
            'obligation_amount' => 'nullable|numeric|min:0',
            'recommendation'    => 'nullable|string|max:255',
        ]);

        $exists = $department_budget_plan->items()
            ->where('expense_item_id', $validated['expense_item_id'])
            ->exists();

        if ($exists) {
            return $this->error('Item already exists', 422);
        }

        if (array_key_exists('total_amount', $validated) && !is_null($validated['total_amount'])) {
            $total = $validated['total_amount'];
            $sem1  = 0;
            $sem2  = 0;
        } else {
            $sem1  = $validated['sem1_amount'] ?? 0;
            $sem2  = $validated['sem2_amount'] ?? 0;
            $total = $sem1 + $sem2;
        }

        $item = $department_budget_plan->items()->create([
            'expense_item_id'   => $validated['expense_item_id'],
            'sem1_amount'       => $sem1,
            'sem2_amount'       => $sem2,
            'total_amount'      => $total,
            'obligation_amount' => $validated['obligation_amount'] ?? 0,
            'recommendation'    => $validated['recommendation'] ?? null,
            'updated_by'        => $request->user()->user_id,
        ]);

        return $this->success($item->load('expenseItem'), 201);
    }

    public function update(
        Request $request,
        DepartmentBudgetPlan $department_budget_plan,
        BudgetPlanForm2Item $item
    ) {
        // Admins can update items on any plan regardless of status.
        // $isAdmin = $request->user()->hasRole('admin');
        $isAdmin = $request->user()->role === 'admin';
        if (!$isAdmin) {
            $this->authorize('update', $item);

            if ($department_budget_plan->status !== 'draft') {
                return $this->error('Plan locked', 422);
            }
        }

        $validated = $request->validate([
            'total_amount'      => 'nullable|numeric|min:0',
            'sem1_amount'       => 'nullable|numeric|min:0',
            'sem2_amount'       => 'nullable|numeric|min:0',
            'obligation_amount' => 'nullable|numeric|min:0',
            'recommendation'    => 'nullable|string|max:255',
        ]);

        // Proposed year update: total_amount only
        if (array_key_exists('total_amount', $validated) && !is_null($validated['total_amount'])) {
            $item->total_amount = $validated['total_amount'];
        }
        // Past year update: sem1 changes, total stays fixed
        elseif (array_key_exists('sem1_amount', $validated) && !is_null($validated['sem1_amount'])) {
            $total            = $item->total_amount;
            $newSem1          = min(max($validated['sem1_amount'], 0), $total);
            $item->sem1_amount = $newSem1;
            $item->sem2_amount = $total - $newSem1;
        }
        // Both sem1 + sem2 explicitly (rare)
        elseif (array_key_exists('sem1_amount', $validated) && array_key_exists('sem2_amount', $validated)) {
            $item->sem1_amount  = $validated['sem1_amount'];
            $item->sem2_amount  = $validated['sem2_amount'];
            $item->total_amount = $validated['sem1_amount'] + $validated['sem2_amount'];
        }

        // Recommendation saves independently
        if (array_key_exists('recommendation', $validated)) {
            $item->recommendation = $validated['recommendation'];
        }

        // Obligation amount — admin uploads past actual
        if (array_key_exists('obligation_amount', $validated) && !is_null($validated['obligation_amount'])) {
            $item->obligation_amount = $validated['obligation_amount'];
        }

        $item->updated_by = $request->user()->user_id;
        $item->save();

        return $this->success($item);
    }

    public function destroy(DepartmentBudgetPlan $department_budget_plan, BudgetPlanForm2Item $item)
    {
        $this->authorize('delete', $item);

        $item->delete();

        return $this->success(['message' => 'Item deleted']);
    }
}