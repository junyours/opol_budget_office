<?php

namespace App\Policies;

use App\Models\BudgetPlan;
use App\Models\User;

class BudgetPlanPolicy
{
    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'department-head']);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, BudgetPlan $budgetPlan): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'department-head']);
    }

    /**
     * Determine whether the user can create models.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, BudgetPlan $budgetPlan): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, BudgetPlan $budgetPlan): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }
}