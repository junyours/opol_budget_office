<?php
// database/seeders/SalaryStandardVersionSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class SalaryStandardVersionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // SSL 5 and SSL 6 versions
        $versions = [
            // SSL 5
            [
                'lbc_reference' => 'LBC 160 Annex A-3', 
                'tranche' => '1st Tranche', 
                'income_class' => '2nd Class', 
                'effective_year' => 2025,
                'is_active' => true
            ],
            
            // SSL 6
            [
                'lbc_reference' => 'LBC 165 Annex A-3', 
                'tranche' => '1st Tranche', 
                'income_class' => '1st Class', 
                'effective_year' => 2026,
                'is_active' => true
            ],
        ];
        
        foreach ($versions as $version) {
            DB::table('salary_standard_versions')->insert([
                'lbc_reference' => $version['lbc_reference'],
                'tranche' => $version['tranche'],
                'income_class' => $version['income_class'],
                'effective_year' => $version['effective_year'],
                'is_active' => $version['is_active'],
                'created_at' => Carbon::now(),
                'updated_at' => Carbon::now(),
            ]);
        }
        
        $this->command->info('Created 2 salary standard versions');
    }
}