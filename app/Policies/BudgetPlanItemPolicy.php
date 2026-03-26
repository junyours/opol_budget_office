<?php

namespace App\Policies;

use App\Models\User;
use App\Models\BudgetPlanForm2Item;

class BudgetPlanItemPolicy
{
    public function update(User $user, BudgetPlanForm2Item $item)
    {
        $plan = $item->budgetPlan; // This is a DepartmentBudgetPlan model

        if (in_array($plan->status, ['submitted', 'approved'])) {
            return false;
        }

        if ($user->role === 'admin' || $user->role === 'super-admin') {
            return true;
        }

        if ($user->role === 'department-head') {
            // Compare user's department ID with the plan's department ID
            return $user->dept_id == $plan->dept_id;
        }

        return false;
    }

    public function delete(User $user, BudgetPlanForm2Item $item)
    {
        return $this->update($user, $item);
    }
}