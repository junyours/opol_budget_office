<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    // public function viewAny(User $user)
    // {
    //     return in_array($user->role, ['admin','super-admin']);
    // }
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin', 'super-admin', 'viewer']);
    }

    public function view(User $user, User $model)
    {
        return $user->role === 'super-admin'
            || $user->role === 'admin'
            || $user->user_id === $model->user_id;
    }

    public function create(User $user)
    {
        return in_array($user->role, ['admin','super-admin']);
    }

    /**
     * Rank of a role. Only a HIGHER rank may manage a LOWER rank.
     * super-admin = 3, admin = 2, everyone else = 1.
     */
    private function rank(?string $role): int
    {
        return match ($role) {
            'super-admin' => 3,
            'admin'       => 2,
            default       => 1,
        };
    }

    /**
     * Actor must be admin/super-admin AND strictly higher than the target.
     * This blocks: admin -> super-admin, admin -> admin,
     * super-admin -> super-admin (including yourself).
     */
    private function canManage(User $actor, User $target): bool
    {
        if (!in_array($actor->role, ['admin', 'super-admin'], true)) {
            return false;
        }

        return $this->rank($actor->role) > $this->rank($target->role);
    }

    public function update(User $user, User $model)
    {
        // Admins / super-admins may always edit their own account.
        // (Role and status changes on self are blocked in UserController.)
        if (
            $user->user_id === $model->user_id
            && in_array($user->role, ['admin', 'super-admin'], true)
        ) {
            return true;
        }

        return $this->canManage($user, $model);
    }

    public function delete(User $user, User $model)
    {
        return $user->role === 'super-admin' && $this->canManage($user, $model);
    }

    public function resetPassword(User $user, User $model)
    {
        return $this->canManage($user, $model);
    }
}
