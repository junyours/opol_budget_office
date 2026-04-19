<?php

// namespace App\Http\Controllers\Api;

// use App\Http\Controllers\Controller;
// use App\Models\BudgetPlan;
// use App\Models\LepHeaderSetting;
// use Illuminate\Http\Request;

// /**
//  * LepHeaderSettingController
//  * ═══════════════════════════════════════════════════════════════════════════
//  * GET  /api/lep-header-settings/{budget_plan_id}  — fetch (or return defaults)
//  * PUT  /api/lep-header-settings/{budget_plan_id}  — upsert
//  */
// class LepHeaderSettingController extends Controller
// {
//     // ── GET — return existing row or computed defaults ──────────────────────
//     public function show(int $budgetPlanId)
//     {
//         $plan = BudgetPlan::where('budget_plan_id', $budgetPlanId)->firstOrFail();

//         $row = LepHeaderSetting::where('budget_plan_id', $budgetPlanId)->first();

//         if ($row) {
//             return response()->json(['data' => $row]);
//         }

//         // Build defaults (mirrors LEPReportController::getLepHeaderSettings)
//         $lgu = $plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL';

//         return response()->json([
//             'data' => [
//                 'budget_plan_id'    => $budgetPlanId,
//                 'province'          => 'Province of Misamis Oriental',
//                 'municipality'      => 'MUNICIPALITY OF ' . strtoupper($lgu),
//                 'office_name'       => 'OFFICE OF THE SANGGUNIANG BAYAN',
//                 'office_subtitle'   => 'MUNICIPALITY OF ' . strtoupper($lgu),
//                 'ordinance_session' => '2ND SPECIAL SESSION',
//                 'session_date_text' => "Began and held at its Mun. Session Hall on the ___ day of ________ "
//                     . "Two Thousand Twenty Five at SB Session Hall, {$lgu}, Misamis Oriental",
//                 'ordinance_number'  => 'APPROPRIATION ORDINANCE NO. ' . $plan->year . ' - ___',
//                 'ordinance_title'   => 'AN ORDINANCE AUTHORIZING THE ' . $plan->year
//                     . ' ANNUAL BUDGET OF ' . strtoupper($lgu),
//                 'introduced_by'     => '',
//             ],
//         ]);
//     }

//     // ── PUT — create or update ─────────────────────────────────────────────
//     public function upsert(Request $request, int $budgetPlanId)
//     {
//         BudgetPlan::where('budget_plan_id', $budgetPlanId)->firstOrFail();

//         $validated = $request->validate([
//             'province'          => 'required|string|max:255',
//             'municipality'      => 'required|string|max:255',
//             'office_name'       => 'required|string|max:255',
//             'office_subtitle'   => 'required|string|max:255',
//             'ordinance_session' => 'required|string|max:100',
//             'session_date_text' => 'nullable|string',
//             'ordinance_number'  => 'nullable|string|max:255',
//             'ordinance_title'   => 'nullable|string',
//             'introduced_by'     => 'nullable|string|max:255',
//         ]);

//         $row = LepHeaderSetting::updateOrCreate(
//             ['budget_plan_id' => $budgetPlanId],
//             $validated
//         );

//         return response()->json(['data' => $row, 'message' => 'LEP header settings saved.']);
//     }
// }



namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\LepHeaderSetting;
use Illuminate\Http\Request;

/**
 * LepHeaderSettingController
 *
 * Place in: app/Http/Controllers/Api/LepHeaderSettingController.php
 *
 * Routes (add inside the throttle:reports group in routes/api.php):
 *   Route::prefix('reports/lep')->group(function () {
 *       Route::post('consolidated-plantilla',         [LEPReportController::class,        'consolidatedPlantilla']);
 *       Route::get ('header-settings/{budgetPlanId}', [LepHeaderSettingController::class, 'show']);
 *       Route::put ('header-settings/{budgetPlanId}', [LepHeaderSettingController::class, 'upsert']);
 *   });
 */
class LepHeaderSettingController extends Controller
{
    // GET /api/reports/lep/header-settings/{budgetPlanId}
    public function show(int $budgetPlanId)
    {
        $plan = BudgetPlan::where('budget_plan_id', $budgetPlanId)->firstOrFail();
        $row  = LepHeaderSetting::where('budget_plan_id', $budgetPlanId)->first();

        if ($row) {
            return response()->json(['data' => $row]);
        }

        // Return computed defaults (mirrors LEPReportController::getLepHeaderSettings)
        $lgu = $plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL';

        return response()->json([
            'data' => [
                'budget_plan_id'    => $budgetPlanId,
                'province'          => 'Province of Misamis Oriental',
                'municipality'      => 'MUNICIPALITY OF ' . strtoupper($lgu),
                'office_name'       => 'OFFICE OF THE SANGGUNIANG BAYAN',
                'office_subtitle'   => 'MUNICIPALITY OF ' . strtoupper($lgu),
                'ordinance_session' => '2ND SPECIAL SESSION',
                'session_date_text' => "Began and held at its Mun. Session Hall on the ___ day of ________ "
                    . "Two Thousand Twenty Five at SB Session Hall, {$lgu}, Misamis Oriental",
                'ordinance_number'  => 'APPROPRIATION ORDINANCE NO. ' . $plan->year . ' - ___',
                'ordinance_title'   => 'AN ORDINANCE AUTHORIZING THE ' . $plan->year
                    . ' ANNUAL BUDGET OF ' . strtoupper($lgu),
                'introduced_by'     => '',
            ],
        ]);
    }

    // PUT /api/reports/lep/header-settings/{budgetPlanId}
    public function upsert(Request $request, int $budgetPlanId)
    {
        BudgetPlan::where('budget_plan_id', $budgetPlanId)->firstOrFail();

        $validated = $request->validate([
            'province'          => 'required|string|max:255',
            'municipality'      => 'required|string|max:255',
            'office_name'       => 'required|string|max:255',
            'office_subtitle'   => 'required|string|max:255',
            'ordinance_session' => 'required|string|max:100',
            'session_date_text' => 'nullable|string',
            'ordinance_number'  => 'nullable|string|max:255',
            'ordinance_title'   => 'nullable|string',
            'introduced_by'     => 'nullable|string|max:255',
        ]);

        $row = LepHeaderSetting::updateOrCreate(
            ['budget_plan_id' => $budgetPlanId],
            $validated
        );

        return response()->json(['data' => $row, 'message' => 'LEP header settings saved.']);
    }
}
