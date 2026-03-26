<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class DepartmentCategorySeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('department_categories')->insert([
            ['dept_category_name' => 'General Public Services', 'created_at' => now(), 'updated_at' => now()],
            ['dept_category_name' => 'Social Services', 'created_at' => now(), 'updated_at' => now()],
            ['dept_category_name' => 'Economic Services', 'created_at' => now(), 'updated_at' => now()],
            ['dept_category_name' => 'Special Accounts', 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
