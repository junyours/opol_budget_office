<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentBudgetPlanSeeder extends Seeder
{
    public function run()
    {
        DB::table('department_budget_plans')->insert([
            // [
            //     'dept_id' => 1,
            //     'year' => 2024,
            //     'status' => 'draft',
            //     'created_by' => 3,
            //     'updated_by' => 3,
            //     'created_at' => '2024-01-15 00:00:00',
            //     'updated_at' => '2024-01-15 00:00:00',
            // ],
            // [
            //     'dept_id' => 1,
            //     'year' => 2025,
            //     'status' => 'draft',
            //     'created_by' => 3,
            //     'updated_by' => 3,
            //     'created_at' => '2025-01-15 00:00:00',
            //     'updated_at' => '2025-01-15 00:00:00',
            // ],
            [
                'dept_id' => 1,
                'budget_plan_id' => 3,
                'status' => 'draft',
                'created_by' => 3,
                'updated_by' => 3,
                'created_at' => '2025-01-15 00:00:00',
                'updated_at' => '2025-01-15 00:00:00',
            ],
           
        ]);
    }
}
