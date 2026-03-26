<?php

namespace App\Policies;

use App\Models\User;

class MasterDataPolicy
{
    public function viewAny(User $user) { return true; }
    public function view(User $user) { return true; }

    public function create(User $user)
    {
        return in_array($user->role, ['admin','super-admin','admin-hrmo']);
    }

    public function update(User $user)
    {
        return in_array($user->role, ['admin','super-admin','admin-hrmo']);
    }

    public function delete(User $user)
    {   
        return in_array($user->role, ['admin','super-admin']);
    }
}
