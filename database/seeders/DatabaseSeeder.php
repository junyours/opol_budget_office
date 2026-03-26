<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        $this->call([
            /////// Form 2
            DepartmentCategorySeeder::class,
            DepartmentSeeder::class,
            UserSeeder::class,
            ExpenseClassificationSeeder::class,
            ExpenseClassItemSeeder::class,
            ///////////////////////////////////////////
            PersonnelSeeder::class,
            PlantillaPositionSeeder::class,
            // PlantillaAssignmentSeeder::class,
            ///////////////////////////////////////////
            IncomeFundObjectSeeder::class,
            SpecialAccountsObjectSeeder::class,
            MdfCategorySeeder::class,
            LdrrmfipCategorySeeder::class,
            // BudgetPlanSeeder::class,
            // DepartmentBudgetPlanSeeder::class,
            // DepartmentBudgetPlanItemSeeder::class,

            /////// Form 3
            // SalaryStandardVersionSeeder::class,
            // PlantillaPositionSeeder::class,
            // PersonnelSeeder::class,
            // SalaryGradeStepSeeder::class,
            // PlantillaAssignmentSeeder::class,
            // SalaryGradeStepSeeder::class,
            // DepartmentPlantillaBudgetSeeder::class,
            
        ]);
    }
}
