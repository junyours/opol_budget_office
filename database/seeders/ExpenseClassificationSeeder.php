<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ExpenseClassificationSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        DB::table('expense_classifications')->insert([
            ['expense_class_name' => 'Personal Services', 'abbreviation' => 'PS', 'created_at' => now(), 'updated_at' => now()],
            ['expense_class_name' => 'Maintenance and Other Operating Expenses', 'abbreviation' => 'MOOE', 'created_at' => now(), 'updated_at' => now()],  
            ['expense_class_name' => 'Financial Expenses Expenses', 'abbreviation' => 'FE', 'created_at' => now(), 'updated_at' => now()],  
            ['expense_class_name' => 'Capital Outlay', 'abbreviation' => 'CO', 'created_at' => now(), 'updated_at' => now()],  
            // ['expense_class_name' => 'Special Purpose Appropriation', 'abbreviation' => 'SPA', 'created_at' => now(), 'updated_at' => now()],
            // ['expense_class_name' => 'Prop/Plant/Eqpt', 'abbreviation' => 'CO', 'created_at' => now(), 'updated_at' => now()],
            // ['expense_class_name' => 'Prop/Plant/Eqpt', 'abbreviation' => null, 'created_at' => now(), 'updated_at' => now()],
            // ['expense_class_name' => 'NON-OFFICE EXPNDTRS', 'abbreviation' => null, 'created_at' => now(), 'updated_at' => now()],
        ]);
    }
}
