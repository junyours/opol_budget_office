<?php

namespace App\Policies;

use App\Models\BudgetCallMemo;
use App\Models\User;

class BudgetCallMemoPolicy
{
    /**
     * Any signed-in user can view the Budget Call Memorandum.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    public function view(User $user, BudgetCallMemo $budgetCallMemo): bool
    {
        return true;
    }

    /**
     * Only admin/super-admin may upload, edit, or delete.
     */
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    public function update(User $user, BudgetCallMemo $budgetCallMemo): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    public function delete(User $user, BudgetCallMemo $budgetCallMemo): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }
}
