<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;

class UserController extends BaseApiController
{
    private const DEFAULT_PASSWORD = 'password123';
    public function index()
    {
        $this->authorize('viewAny', User::class);

        $users = User::with('department')->get();

        return $this->success($users);
    }

    public function store(Request $request)
    {
        $this->authorize('create', User::class);

        $validated = $request->validate([
            'username' => 'required|unique:users,username',
            'password' => 'required|min:8',
            'fname' => 'required',
            'mname' => 'nullable',
            'lname' => 'required',
            // 'role' => 'required|in:admin,department-head,admin-hrmo,super-admin',
            'role' => 'required|in:admin,department-head,admin-hrmo,super-admin,viewer,admin-ldrrmo',
            'dept_id' => 'nullable|exists:departments,dept_id',
            'is_online' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if ($validated['role'] === 'super-admin' && $request->user()->role !== 'super-admin') {
            abort(403, 'Only a super admin can create a super admin account.');
        }

        $validated['password'] = Hash::make($validated['password']);

        $user = User::create($validated);

        return $this->success($user, 201);
    }

    public function show($id)
    {
        $user = User::with('department')->findOrFail($id);

        $this->authorize('view', $user);

        return $this->success($user);
    }

    public function update(Request $request, $id)
    {
        $user = User::with('department')->findOrFail($id);

        $this->authorize('update', $user);

        $validated = $request->validate([
            'username' => 'sometimes|required|unique:users,username,' . $user->user_id . ',user_id',
            'fname' => 'sometimes|required',
            'mname' => 'nullable',
            'lname' => 'sometimes|required',
            // 'role' => 'sometimes|required|in:admin,department-head,admin-hrmo,super-admin',
            'role' => 'sometimes|required|in:admin,department-head,admin-hrmo,super-admin,viewer,admin-ldrrmo',
            'dept_id' => 'nullable|exists:departments,dept_id',
            'is_online' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['role']) && $validated['role'] === 'super-admin' && $request->user()->role !== 'super-admin') {
            abort(403, 'Only a super admin can assign the super admin role.');
        }

        // Self-edit guard: you can change your own details, but not your own
        // role or active status (prevents self-promotion / self-lockout).
        if ($request->user()->user_id === $user->user_id) {
            if (isset($validated['role']) && $validated['role'] !== $user->role) {
                abort(403, 'You cannot change your own role.');
            }
            if (isset($validated['is_active']) && (bool) $validated['is_active'] !== (bool) $user->is_active) {
                abort(403, 'You cannot change your own account status.');
            }
        }

        $user->update($validated);

        return $this->success($user->load('department'));
    }

    /**
     * Set the user's password to the default, force a password change on next
     * login, and revoke every token so all logged-in devices are logged out.
     */
    public function resetPassword($id)
    {
        $user = User::findOrFail($id);

        $this->authorize('resetPassword', $user);

        DB::transaction(function () use ($user) {
            $user->forceFill([
                'password'         => Hash::make(self::DEFAULT_PASSWORD),
                'must_change_pass' => true,
                'is_online'        => false,
            ])->save();

            $user->tokens()->delete();
        });

        return $this->success(['message' => 'Password has been set to the default.']);
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        $this->authorize('delete', $user);

        $user->delete();

        return $this->success(['message' => 'User deleted']);
    }
}
