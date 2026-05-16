<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\PsSetting;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;

class PsSettingController extends Controller
{
    private const KEY = 'default';

    // These MUST match PSConfig.ts exactly — they are the canonical defaults
    private const DEFAULTS = [
        'pera_monthly'          => 2000,
        'retirement_rate'       => 12,
        'pagibig_rate'          => 2,
        'philhealth_rate'       => 2.5,
        'philhealth_cap'        => 2786.38,
        'ecip_rate'             => 1,
        'ecip_cap'              => 1200,
        'annual_threshold'      => 54888,
        'subsistence_threshold' => 54000,
        'subsistence_monthly'   => 0,
        'subsistence_depts'     => [
            ['dept_id' => 21, 'label' => '(MHO)'],
            ['dept_id' => 22, 'label' => '(MSWDO)'],
        ],
        'laundry_threshold'     => 54000,
        'laundry_monthly'       => 0,
        'laundry_depts'         => [
            ['dept_id' => 21, 'label' => '(MHO)'],
            ['dept_id' => 22, 'label' => '(MSWDO)'],
        ],
        'magna_carta_rate'      => 25,
        'magna_carta1_depts'    => [
            ['dept_id' => 21, 'label' => '(MHO)'],
        ],
        'magna_carta2_depts'    => [
            ['dept_id' => 22, 'label' => '(MSWDO)'],
        ],
        'clothing_annual'       => 7000,
        'productivity_annual'   => 2000,
        'cash_gift_annual'      => 5000,
        'other_benefits_days'   => 5,
        'ra' => [
            ['from' => 27, 'to' => 40, 'monthly' => 9000],
            ['from' => 25, 'to' => 26, 'monthly' => 8550],
            ['from' => 24, 'to' => 24, 'monthly' => 7650],
            ['from' => 22, 'to' => 23, 'monthly' => 5400],
        ],
    ];

    public function show(): JsonResponse
    {
        $row = PsSetting::where('key', self::KEY)->first();

        // Merge saved values over defaults so new keys always have a value
        $merged = array_merge(self::DEFAULTS, $row?->value ?? []);

        return response()->json(['data' => $merged]);
    }

    public function update(Request $request): JsonResponse
    {
        if (!in_array($request->user()->role, ['admin', 'super-admin'])) {
            return response()->json(['message' => 'Forbidden.'], 403);
        }
        $validated = $request->validate([
            'pera_monthly'          => 'sometimes|numeric|min:0',
            'retirement_rate'       => 'sometimes|numeric|min:0',
            'pagibig_rate'          => 'sometimes|numeric|min:0',
            'philhealth_rate'       => 'sometimes|numeric|min:0',
            'philhealth_cap'        => 'sometimes|numeric|min:0',
            'ecip_rate'             => 'sometimes|numeric|min:0',
            'ecip_cap'              => 'sometimes|numeric|min:0',
            'annual_threshold'      => 'sometimes|numeric|min:0',
            'subsistence_threshold' => 'sometimes|numeric|min:0',
            'subsistence_monthly'   => 'sometimes|numeric|min:0',
            'subsistence_depts'     => 'sometimes|array',
            'laundry_threshold'     => 'sometimes|numeric|min:0',
            'laundry_monthly'       => 'sometimes|numeric|min:0',
            'laundry_depts'         => 'sometimes|array',
            'magna_carta_rate'      => 'sometimes|numeric|min:0',
            'magna_carta1_depts'    => 'sometimes|array',
            'magna_carta2_depts'    => 'sometimes|array',
            'clothing_annual'       => 'sometimes|numeric|min:0',
            'productivity_annual'   => 'sometimes|numeric|min:0',
            'cash_gift_annual'      => 'sometimes|numeric|min:0',
            'other_benefits_days'   => 'sometimes|numeric|min:0',
            'ra'                    => 'sometimes|array',
        ]);

        PsSetting::updateOrCreate(
            ['key' => self::KEY],
            ['value' => $validated]
        );

        return response()->json(['data' => array_merge(self::DEFAULTS, $validated)]);
    }
}
