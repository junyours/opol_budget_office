<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $validated = $request->validate([
            'username' => 'required',
            'password' => 'required',
        ]);

        try {
            $user = User::with('department')
                ->where('username', $validated['username'])
                ->first();
        } catch (\Exception $e) {
            \Log::error('Login DB error: ' . $e->getMessage());
            return response()->json([
                'message' => 'Unable to process login. Please try again later.',
            ], 503);
        }

        if (!$user || !Hash::check($validated['password'], $user->password)) {
            throw ValidationException::withMessages([
                'username' => ['Invalid credentials.'],
            ]);
        }

        if (!$user->is_active) {
            throw ValidationException::withMessages([
                'username' => ['This account has been deactivated. Please contact the administrator.'],
            ]);
        }

        // Maintenance mode: block everyone except super-admin from logging in.
        $maintenance = \App\Models\SystemSetting::current();
        if ($maintenance->maintenance_mode && $user->role !== 'super-admin') {
            return response()->json([
                'maintenance_mode'    => true,
                'maintenance_message' => $maintenance->maintenance_message
                    ?? 'The system is temporarily down for maintenance. Please check back shortly.',
            ], 503);
        }

        // Clean up only THIS user's expired tokens on login
    //     $user->tokens()->where('expires_at', '<', now())->delete();

    //     // return response()->json([
    //     //     'user'  => $user,
    //     //     'token' => $user->createToken('auth-token')->plainTextToken, // expiry handled by sanctum.php
    //     // ]);

    //     return response()->json([
    //         'user'  => $user,
    //         'token' => $user->createToken('auth-token')->plainTextToken,
    //     ]);
    // }

    // Clean up only THIS user's expired tokens on login
        $user->tokens()->where('expires_at', '<', now())->delete();

        $expiresAt = config('sanctum.expiration')
            ? now()->addMinutes(config('sanctum.expiration'))
            : null;

        return response()->json([
            'user'  => $user,
            'token' => $user->createToken('auth-token', ['*'], $expiresAt)->plainTextToken,
        ]);
    }



    public function loginWithPin(Request $request)
    {
        $validated = $request->validate([
            'user_id'  => 'required|integer',
            'password' => 'required|string',
        ]);

        $user = User::with('department')->find($validated['user_id']);

        if (!$user) {
            return response()->json(['message' => 'Account not found.'], 422);
        }

        if (!$user->is_active) {
            return response()->json(['message' => 'Account is deactivated.'], 403);
        }

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Incorrect password.'], 422);
        }

        // Maintenance mode: block everyone except super-admin from logging in.
        $maintenance = \App\Models\SystemSetting::current();
        if ($maintenance->maintenance_mode && $user->role !== 'super-admin') {
            return response()->json([
                'maintenance_mode'    => true,
                'maintenance_message' => $maintenance->maintenance_message
                    ?? 'The system is temporarily down for maintenance. Please check back shortly.',
            ], 503);
        }

    //     $user->tokens()->where('expires_at', '<', now())->delete();

    //     return response()->json([
    //         'user'  => $user,
    //         'token' => $user->createToken('auth-token')->plainTextToken,
    //     ]);
    // }

    // public function logout(Request $request)
    $user->tokens()->where('expires_at', '<', now())->delete();

        $expiresAt = config('sanctum.expiration')
            ? now()->addMinutes(config('sanctum.expiration'))
            : null;

        return response()->json([
            'user'  => $user,
            'token' => $user->createToken('auth-token', ['*'], $expiresAt)->plainTextToken,
        ]);
    }

    public function logout(Request $request)
    {
        $request->user()->tokens()->where('id', $request->user()->currentAccessToken()->id)->delete();
        return response()->json(['message' => 'Logged out successfully']);
    }

    public function changeForcedPassword(Request $request)
    {
        $user = $request->user();

        $validated = $request->validate([
            'current_password' => 'required|string',
            'password'         => 'required|string|min:8|max:16|confirmed',
        ]);

        if (!Hash::check($validated['current_password'], $user->password)) {
            throw ValidationException::withMessages([
                'current_password' => ['Current password is incorrect.'],
            ]);
        }

        $pwd = $validated['password'];
        $rules = [
            'an uppercase letter (A–Z)' => (bool) preg_match('/[A-Z]/', $pwd),
            'a lowercase letter (a–z)'  => (bool) preg_match('/[a-z]/', $pwd),
            'a number (0–9)'            => (bool) preg_match('/[0-9]/', $pwd),
            'a symbol (!@#$%^&*…)'      => (bool) preg_match('/[@$!%*?&#^()\-_=+\[\]{};:\'",.\/<>?\\\\|`~]/', $pwd),
        ];
        $failed = array_keys(array_filter($rules, fn ($ok) => !$ok));

        if (!empty($failed)) {
            throw ValidationException::withMessages([
                'password' => ['Password must include ' . implode(', ', $failed) . '.'],
            ]);
        }

        if (Hash::check($pwd, $user->password)) {
            throw ValidationException::withMessages([
                'password' => ['New password must be different from your current password.'],
            ]);
        }

        $user->password         = Hash::make($pwd);
        $user->must_change_pass = false;
        $user->save();

        return response()->json([
            'message' => 'Password changed successfully.',
            'user'    => $user->fresh('department'),
        ]);
    }
}
