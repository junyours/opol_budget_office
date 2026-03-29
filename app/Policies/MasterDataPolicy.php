<?php

// namespace App\Policies;

// use App\Models\User;

// class MasterDataPolicy
// {
//     public function viewAny(User $user) { return true; }
//     public function view(User $user) { return true; }

//     public function create(User $user)
//     {
//         return in_array($user->role, ['admin','super-admin','admin-hrmo']);
//     }

//     public function update(User $user)
//     {
//         return in_array($user->role, ['admin','super-admin','admin-hrmo']);
//     }

//     public function delete(User $user)
//     {   
//         return in_array($user->role, ['admin','super-admin']);
//     }
// }

namespace App\Policies;

use App\Models\User;
use App\Models\Department;

class MasterDataPolicy
{
    public function viewAny(User $user) { return true; }
    public function view(User $user)    { return true; }

    public function create(User $user)
    {
        return in_array($user->role, ['admin', 'super-admin', 'admin-hrmo']);
    }

    public function update(User $user, $model = null)
    {
        // Admins can update anything
        if (in_array($user->role, ['admin', 'super-admin', 'admin-hrmo'])) {
            return true;
        }

        // Department-head can only update their own department
        if ($user->role === 'department-head' && $model !== null) {
            $modelClass = get_class($model);
            if ($modelClass === Department::class) {
                return $user->dept_id === $model->dept_id;
            }
        }

        return false;
    }

    public function delete(User $user)
    {
        return in_array($user->role, ['admin', 'super-admin']);
    }
}