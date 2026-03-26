<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;

class ProfileController extends BaseApiController
{
    /**
     * GET /api/profile
     * Returns the authenticated user with their department.
     */
    public function show(Request $request)
    {
        return $this->success(
            $request->user()->load('department')
        );
    }

    /**
     * PUT /api/profile
     * Update basic info (fname, mname, lname, username).
     */
    public function update(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'fname'    => 'required|string|max:255',
            'mname'    => 'nullable|string|max:255',
            'lname'    => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username,' . $user->user_id . ',user_id',
        ]);

        $user->update($validated);

        return $this->success($user->fresh()->load('department'));
    }

    /**
     * PATCH /api/profile/password
     * Change password — requires current password verification.
     * Mapped to "store" action on the resource for the sub-route.
     */
    public function changePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'current_password' => 'required|string',
            'password'         => [
                'required', 'string', 'min:8', 'max:16', 'confirmed',
                'regex:/[A-Z]/',
                'regex:/[a-z]/',
                'regex:/[0-9]/',
                'regex:/[@$!%*?&\#^()\-_=+\[\]{};:\'",.<>\/?\\|`~]/',
            ],
        ], [
            'password.regex'     => 'Password must contain at least one uppercase letter, one lowercase letter, one number, and one symbol.',
            'password.min'       => 'Password must be at least 8 characters.',
            'password.max'       => 'Password must not exceed 16 characters.',
            'password.confirmed' => 'Password confirmation does not match.',
        ]);

        if (! Hash::check($request->current_password, $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $user->update(['password' => Hash::make($request->password)]);

        return $this->success(['message' => 'Password changed successfully.']);
    }

    /**
     * POST /api/profile/avatar
     * Upload profile picture.
     */
    public function uploadAvatar(Request $request)
    {
        $request->validate([
            'avatar' => 'required|image|mimes:jpeg,png,jpg,webp|max:2048',
        ]);

        $user = $request->user();

        // Delete old avatar from storage
        if ($user->avatar && Storage::disk('public')->exists($user->avatar)) {
            Storage::disk('public')->delete($user->avatar);
        }

        $path = $request->file('avatar')->store('avatars', 'public');

        $user->update(['avatar' => $path]);

        return $this->success([
            'avatar'     => $path,
            'avatar_url' => asset('storage/' . $path),
        ]);
    }
}