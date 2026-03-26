<?php
// database/seeders/SalaryGradeStepSeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\SalaryGradeStep;
use App\Models\SalaryStandardVersion;
use Illuminate\Support\Facades\DB;

class SalaryGradeStepSeeder extends Seeder
{
    public function run(): void
    {
        // Clear existing records
        DB::table('salary_grade_steps')->truncate();

        // Get BOTH versions (SSL 5 and SSL 6)
        $versions = SalaryStandardVersion::all();
        
        if ($versions->isEmpty()) {
            $this->command->error('No salary standard versions found. Please run SalaryStandardVersionSeeder first.');
            return;
        }

        $this->command->info('Seeding salary grades for ' . $versions->count() . ' versions');

        // Your salary data from the original table you provided
        $salaryData = [
            1 => [12655, 12748, 12850, 12954, 13058, 13163, 13269, 13376],
            2 => [13433, 13532, 13631, 13732, 13834, 13936, 14039, 14143],
            3 => [14267, 14374, 14479, 14587, 14696, 14803, 14914, 15024],
            4 => [15150, 15262, 15376, 15488, 15603, 15718, 15835, 15952],
            5 => [16079, 16200, 16320, 16440, 16561, 16684, 16808, 16932],
            6 => [17061, 17179, 17315, 17445, 17573, 17703, 17834, 17967],
            7 => [18099, 18232, 18367, 18504, 18640, 18779, 18917, 19058],
            8 => [19303, 19478, 19655, 19832, 20011, 20192, 20374, 20559],
            9 => [20903, 21070, 21239, 21389, 21580, 21753, 21928, 22100],
            10 => [23027, 23211, 23396, 23583, 23771, 23961, 23882, 24345],
            11 => [27022, 27277, 27537, 27800, 28067, 28337, 28611, 28889],
            12 => [29021, 29276, 29535, 29795, 30063, 30332, 30604, 30879],
            13 => [30979, 31260, 31544, 31832, 32125, 32420, 32719, 33022],
            14 => [33322, 33646, 33974, 34304, 34642, 34982, 35327, 35676],
            15 => [36185, 36544, 36905, 37272, 37462, 38017, 38396, 38781],
            16 => [39204, 39596, 39994, 40397, 40804, 41216, 41635, 42057],
            17 => [42522, 42954, 43392, 43835, 44283, 44737, 45196, 45662],
            18 => [46174, 46649, 47130, 47616, 48110, 48609, 49115, 49626],
            19 => [50751, 51449, 52158, 52878, 53610, 54355, 55112, 55880],
            20 => [56670, 57458, 58259, 59073, 59901, 60731, 61568, 62408],
            21 => [63012, 63900, 64804, 65722, 66655, 67604, 68536, 69515],
            22 => [70346, 71349, 72370, 73408, 74462, 75498, 76586, 77692],
            23 => [78584, 79717, 80870, 82047, 83333, 84639, 85966, 87260],
            24 => [88367, 89749, 91155, 92584, 94035, 95511, 96965, 98488],
            25 => [100554, 102128, 103729, 105356, 107009, 108689, 110398, 112132],
            26 => [113627, 115405, 117214, 119052, 120920, 122819, 124747, 126709],
            27 => [128397, 130407, 132452, 134466, 136577, 138465, 140640, 142851],
            28 => [144422, 146662, 148993, 151195, 153571, 155988, 158043, 160715],
            29 => [162443, 164999, 167596, 170236, 172918, 175317, 178083, 180894],
            30 => [182880, 185761, 188602, 191489, 194420, 197491, 200517, 203687],
            31 => [263872, 268896, 274018, 279107, 284115, 289661, 295025, 300653],
            32 => [313099, 319269, 325562, 331825, 338372, 345052, 351867, 358817],
        ];

        $records = [];
        
        // For EACH version, create ALL grade-step combinations
        foreach ($versions as $version) {
            $this->command->info('Seeding version ID: ' . $version->salary_standard_version_id);
            
            foreach ($salaryData as $grade => $steps) {
                foreach ($steps as $step => $salary) {
                    $records[] = [
                        'salary_standard_version_id' => $version->salary_standard_version_id,
                        'salary_grade' => $grade,
                        'step' => $step + 1,
                        'salary' => $salary,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ];
                }
            }
        }

        // Insert in chunks
        foreach (array_chunk($records, 500) as $chunk) {
            SalaryGradeStep::insert($chunk);
        }
        
        $this->command->info('Salary grade steps seeded for both SSL versions');
    }
}