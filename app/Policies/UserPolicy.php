<?php

namespace App\Policies;

use App\Models\User;

class UserPolicy
{
    public function viewAny(User $user)
    {
        return in_array($user->role, ['admin','super-admin']);
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

    public function update(User $user, User $model)
    {
        if ($user->role === 'super-admin') return true;
        if ($user->role === 'admin') return true;

        return $user->user_id === $model->user_id;
    }

    public function delete(User $user)
    {
        return $user->role === 'super-admin';
    }
}
