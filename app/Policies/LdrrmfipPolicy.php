<?php

namespace App\Policies;

use App\Models\User;
use App\Models\LdrrmfipItem;

class LdrrmfipPolicy
{
    public function viewAny(User $user): bool { return true; }
    public function view(User $user, LdrrmfipItem $item): bool { return true; }

    public function create(User $user): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'admin-ldrrmo']);
    }

    public function update(User $user, LdrrmfipItem $item): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'admin-ldrrmo']);
    }

    public function delete(User $user, LdrrmfipItem $item): bool
    {
        return in_array($user->role, ['admin', 'super-admin', 'admin-ldrrmo']);
    }
}
