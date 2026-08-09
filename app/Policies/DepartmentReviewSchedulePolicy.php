<?php

namespace App\Policies;

use App\Models\User;
use App\Models\DepartmentReviewSchedule;

class DepartmentReviewSchedulePolicy
{
    public function viewAny(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'department-head']);
    }

    public function view(User $user, DepartmentReviewSchedule $schedule): bool
    {
        if (in_array($user->role, ['admin', 'super-admin'])) return true;

        if ($user->role === 'department-head') {
            return (int) $user->dept_id === (int) $schedule->dept_id;
        }

        return false;
    }

    // Only admins/super-admins may ever create a schedule for a department.
    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    public function update(User $user, DepartmentReviewSchedule $schedule): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }

    public function delete(User $user, DepartmentReviewSchedule $schedule): bool
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }
}
