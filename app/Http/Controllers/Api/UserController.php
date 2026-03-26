<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class UserController extends BaseApiController
{
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
            'password' => 'required|min:6',
            'fname' => 'required',
            'mname' => 'nullable',
            'lname' => 'required',
            'role' => 'required|in:admin,department-head,admin-hrmo,super-admin',
            'dept_id' => 'nullable|exists:departments,dept_id',
            'is_online' => 'boolean',
            'is_active' => 'boolean',
        ]);

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
            'password' => 'sometimes|min:6',
            'fname' => 'sometimes|required',
            'mname' => 'nullable',
            'lname' => 'sometimes|required',
            'role' => 'sometimes|required|in:admin,department-head,admin-hrmo,super-admin',
            'dept_id' => 'nullable|exists:departments,dept_id',
            'is_online' => 'boolean',
            'is_active' => 'boolean',
        ]);

        if (isset($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        }

        $user->update($validated);

        return $this->success($user->load('department'));
    }

    public function destroy($id)
    {
        $user = User::findOrFail($id);

        $this->authorize('delete', $user);

        $user->delete();

        return $this->success(['message' => 'User deleted']);
    }
}