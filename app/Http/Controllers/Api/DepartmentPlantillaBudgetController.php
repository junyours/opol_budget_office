<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DepartmentBudgetPlan;
use App\Models\PlantillaPosition;
use Illuminate\Http\Request;

class DepartmentPlantillaBudgetController extends Controller
{
    // This is a placeholder – actual logic depends on your Form3 requirements
    public function index($year)
    {
        // Example: return budget plans for given year, grouped by department
        $plans = DepartmentBudgetPlan::with(['department', 'items.expenseItem'])
            ->where('year', $year)
            ->get();

        // You might also include plantilla data
        $plantilla = PlantillaPosition::with(['department', 'assignments.personnel'])
            ->where('is_active', true)
            ->get();

        return response()->json([
            'year' => $year,
            'budget_plans' => $plans,
            'plantilla' => $plantilla,
        ]);
    }

    public function getByBudgetPlan($planId)
    {
        $plan = DepartmentBudgetPlan::with(['department', 'items.expenseItem'])->findOrFail($planId);
        // Optionally include plantilla for that department
        $plantilla = PlantillaPosition::with('assignments.personnel')
            ->where('dept_id', $plan->dept_id)
            ->where('is_active', true)
            ->get();

        return response()->json([
            'budget_plan' => $plan,
            'plantilla' => $plantilla,
        ]);
    }

    public function generate(Request $request)
    {
        // Logic to generate Form3 snapshot (admin only)
        // ...
        return response()->json(['message' => 'Form3 generation started']);
    }
}