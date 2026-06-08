<?php

namespace App\Policies;

use App\Models\User;
use App\Models\DepartmentBudgetPlan;

class DepartmentBudgetPlanPolicy
{
    public function viewAny(User $user): bool
    {
        return true;
    }

    // public function view(User $user, DepartmentBudgetPlan $plan): bool
    // {
    //     if (in_array($user->role, ['admin', 'super-admin'])) return true;

    //     if ($user->role === 'department-head') {
    //         return (int) $user->dept_id === (int) $plan->dept_id;
    //     }

    //     return false;
    // }
    public function view(User $user, DepartmentBudgetPlan $plan): bool
    {
        if (in_array($user->role, ['admin', 'super-admin', 'viewer'])) return true;

        if ($user->role === 'department-head') {
            return (int) $user->dept_id === (int) $plan->dept_id;
        }

        return false;
    }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'department-head']);
    }

    public function update(User $user, DepartmentBudgetPlan $plan): bool
    {
        if ($plan->status === 'approved') return false;

        if ($plan->status === 'submitted') {
            return in_array($user->role, ['admin', 'super-admin']);
        }

        if (in_array($user->role, ['admin', 'super-admin'])) return true;

        if ($user->role === 'department-head') {
            return (int) $user->dept_id === (int) $plan->dept_id;
        }

        return false;
    }

    public function delete(User $user, DepartmentBudgetPlan $plan): bool
    {
        if ($plan->status !== 'draft') return false;

        return $this->update($user, $plan);
    }

    public function submit(User $user, DepartmentBudgetPlan $plan): bool
    {
        return $plan->status === 'draft'
            && $user->role === 'department-head'
            && (int) $user->dept_id === (int) $plan->dept_id;
    }

    public function approve(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    public function reject(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }
}
