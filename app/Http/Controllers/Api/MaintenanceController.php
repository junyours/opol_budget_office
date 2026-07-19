<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SystemSetting;
use Illuminate\Http\Request;

class MaintenanceController extends Controller
{
    public function status()
    {
        $s = SystemSetting::current();

        return response()->json([
            'maintenance_mode'    => $s->maintenance_mode,
            'maintenance_message' => $s->maintenance_message,
        ]);
    }

    public function toggle(Request $request)
    {
        $validated = $request->validate([
            'maintenance_mode'    => 'required|boolean',
            'maintenance_message' => 'nullable|string|max:500',
        ]);

        $s = SystemSetting::current();
        $s->update([
            ...$validated,
            'updated_by' => $request->user()->user_id,
        ]);

        return response()->json(['message' => 'Maintenance settings updated.', 'data' => $s]);
    }
}
