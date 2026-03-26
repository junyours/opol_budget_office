<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class BudgetPlanSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('budget_plans')->insert([
            [
                'budget_plan_id' => 1,
                'year' => 2024,
                'is_active' => false,
           ],
           [
                'budget_plan_id' => 2,
                'year' => 2025,
                'is_active' => false,
           ], 
            [
                'budget_plan_id' => 3,
                'year' => 2026,
                'is_active' => true,
           ]
        ]);
    }
}
