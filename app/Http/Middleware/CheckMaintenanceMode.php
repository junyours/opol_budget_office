<?php

namespace App\Http\Middleware;

use App\Models\SystemSetting;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMaintenanceMode
{
    public function handle(Request $request, Closure $next): Response
    {
        $settings = SystemSetting::current();

        if (!$settings->maintenance_mode) {
            return $next($request);
        }

        $user = $request->user();
        if ($user && $user->role === 'super-admin') {
            return $next($request);
        }

        return response()->json([
            'maintenance_mode'    => true,
            'maintenance_message' => $settings->maintenance_message
                ?? 'The system is temporarily down for maintenance. Please check back shortly.',
        ], 503);
    }
}
