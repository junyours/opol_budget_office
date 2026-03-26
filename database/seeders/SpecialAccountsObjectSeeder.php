<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SpecialAccountsObjectSeeder extends Seeder
{

public function run(): void
    {

        // Insert OCC objects
        $occObjects = [
            ['source' => 'occ', 'name' => 'Beginning Cash Balance', 'level' => 1, 'sort_order' => 1],
            ['source' => 'occ', 'name' => 'Receipts', 'level' => 1, 'sort_order' => 2],
            ['source' => 'occ', 'name' => 'A. Local Source', 'level' => 2, 'sort_order' => 3, 'parent' => 'Receipts'],
            ['source' => 'occ', 'name' => '1. Tax Revenue', 'level' => 3, 'sort_order' => 4, 'parent' => 'A. Local Source'],
            ['source' => 'occ', 'name' => 'a. Real Property Tax', 'level' => 4, 'sort_order' => 5, 'parent' => '1. Tax Revenue'],
            ['source' => 'occ', 'name' => 'i. Basic RPT', 'level' => 5, 'sort_order' => 6, 'parent' => 'a. Real Property Tax'],
            ['source' => 'occ', 'name' => 'ii. Special Education Fund', 'level' => 5, 'sort_order' => 7, 'parent' => 'a. Real Property Tax'],
            ['source' => 'occ', 'name' => 'b. Special Education Tax', 'level' => 4, 'sort_order' => 8, 'parent' => '1. Tax Revenue'],
            ['source' => 'occ', 'name' => 'c. Business Taxes & Licenses', 'level' => 4, 'sort_order' => 9, 'parent' => '1. Tax Revenue'],
            ['source' => 'occ', 'name' => 'd. Other Local Taxes', 'level' => 4, 'sort_order' => 10, 'parent' => '1. Tax Revenue'],
            ['source' => 'occ', 'name' => 'i. Community Tax', 'level' => 5, 'sort_order' => 11, 'parent' => 'd. Other Local Taxes'],
            ['source' => 'occ', 'name' => 'ii. Amusement Tax', 'level' => 5, 'sort_order' => 12, 'parent' => 'd. Other Local Taxes'],
            ['source' => 'occ', 'name' => 'iii. Other Taxes', 'level' => 5, 'sort_order' => 13, 'parent' => 'd. Other Local Taxes'],
            
            ['source' => 'occ', 'name' => '2. Non-Tax Revenue', 'level' => 3, 'sort_order' => 14, 'parent' => 'A. Local Source'],
            ['source' => 'occ', 'name' => 'a. Business & Service Income', 'level' => 4, 'sort_order' => 15, 'parent' => '2. Non-Tax Revenue'],
            ['source' => 'occ', 'name' => 'i. School Tuition Fee Income', 'level' => 5, 'sort_order' => 16, 'parent' => 'a. Business & Service Income'],
            ['source' => 'occ', 'name' => 'ii. Other School Fees', 'level' => 5, 'sort_order' => 17, 'parent' => 'a. Business & Service Income'],
            ['source' => 'occ', 'name' => 'c. Other Service Income', 'level' => 4, 'sort_order' => 18, 'parent' => '2. Non-Tax Revenue'],
            
            ['source' => 'occ', 'name' => 'B. External Source', 'level' => 2, 'sort_order' => 19, 'parent' => 'Receipts'],
            ['source' => 'occ', 'name' => '1. Share from National Internal Revenue Taxes', 'level' => 3, 'sort_order' => 20, 'parent' => 'B. External Source'],
            ['source' => 'occ', 'name' => '2. Shares from GOCCs(PAGCOR & PCSO)', 'level' => 3, 'sort_order' => 21, 'parent' => 'B. External Source'],
            ['source' => 'occ', 'name' => '3. Other Shares from National Taxes', 'level' => 3, 'sort_order' => 22, 'parent' => 'B. External Source'],
            ['source' => 'occ', 'name' => 'a. Share from EVAT', 'level' => 4, 'sort_order' => 23, 'parent' => '3. Other Shares from National Taxes'],
            ['source' => 'occ', 'name' => 'b. Tobacco Excise Tax', 'level' => 4, 'sort_order' => 24, 'parent' => '3. Other Shares from National Taxes'],
            ['source' => 'occ', 'name' => '4. Extraordinary Receipts', 'level' => 3, 'sort_order' => 25, 'parent' => 'B. External Source'],
            ['source' => 'occ', 'name' => 'a. Grants and Donations', 'level' => 4, 'sort_order' => 26, 'parent' => '4. Extraordinary Receipts'],
            ['source' => 'occ', 'name' => 'b. Subsidies from NGAs', 'level' => 4, 'sort_order' => 27, 'parent' => '4. Extraordinary Receipts'],
            ['source' => 'occ', 'name' => '5. Other Local Transfer', 'level' => 3, 'sort_order' => 28, 'parent' => 'B. External Source'],
            ['source' => 'occ', 'name' => 'a. Subsidy from General Fund', 'level' => 4, 'sort_order' => 29, 'parent' => '5. Other Local Transfer'],
            ['source' => 'occ', 'name' => 'b. Subsidy from Market Operation', 'level' => 4, 'sort_order' => 30, 'parent' => '5. Other Local Transfer'],
            ['source' => 'occ', 'name' => 'c. Subsidy from Motorpool', 'level' => 4, 'sort_order' => 31, 'parent' => '5. Other Local Transfer'],
            ['source' => 'occ', 'name' => 'd. Subsidy from OCC', 'level' => 4, 'sort_order' => 32, 'parent' => '5. Other Local Transfer'],
            
            ['source' => 'occ', 'name' => 'C. Non-Income Receipts', 'level' => 2, 'sort_order' => 33, 'parent' => 'Receipts'],
            ['source' => 'occ', 'name' => '1. Capital Investment Receipts', 'level' => 3, 'sort_order' => 34, 'parent' => 'C. Non-Income Receipts'],
            ['source' => 'occ', 'name' => 'a. Proceeds from Sale of Assets', 'level' => 4, 'sort_order' => 35, 'parent' => '1. Capital Investment Receipts'],
            ['source' => 'occ', 'name' => '2. Receipts from Loans and Borrowings', 'level' => 3, 'sort_order' => 36, 'parent' => 'C. Non-Income Receipts'],
            ['source' => 'occ', 'name' => 'a. Acquisition of Loans', 'level' => 4, 'sort_order' => 37, 'parent' => '2. Receipts from Loans and Borrowings'],
        ];

        // Insert Public Market objects
        $pmObjects = [
            ['source' => 'pm', 'name' => 'Beginning Cash Balance', 'level' => 1, 'sort_order' => 1],
            ['source' => 'pm', 'name' => 'Receipts', 'level' => 1, 'sort_order' => 2],
            ['source' => 'pm', 'name' => 'A. Local Source', 'level' => 2, 'sort_order' => 3, 'parent' => 'Receipts'],
            ['source' => 'pm', 'name' => '1. Tax Revenue', 'level' => 3, 'sort_order' => 4, 'parent' => 'A. Local Source'],
            ['source' => 'pm', 'name' => 'a. Real Property Tax', 'level' => 4, 'sort_order' => 5, 'parent' => '1. Tax Revenue'],
            ['source' => 'pm', 'name' => 'i. Basic RPT', 'level' => 5, 'sort_order' => 6, 'parent' => 'a. Real Property Tax'],
            ['source' => 'pm', 'name' => 'ii. Special Education Fund', 'level' => 5, 'sort_order' => 7, 'parent' => 'a. Real Property Tax'],
            ['source' => 'pm', 'name' => 'b. Special Education Tax', 'level' => 4, 'sort_order' => 8, 'parent' => '1. Tax Revenue'],
            ['source' => 'pm', 'name' => 'c. Business Taxes & Licenses', 'level' => 4, 'sort_order' => 9, 'parent' => '1. Tax Revenue'],
            ['source' => 'pm', 'name' => 'd. Other Local Taxes', 'level' => 4, 'sort_order' => 10, 'parent' => '1. Tax Revenue'],
            ['source' => 'pm', 'name' => 'i. Community Tax', 'level' => 5, 'sort_order' => 11, 'parent' => 'd. Other Local Taxes'],
            ['source' => 'pm', 'name' => 'ii. Amusement Tax', 'level' => 5, 'sort_order' => 12, 'parent' => 'd. Other Local Taxes'],
            ['source' => 'pm', 'name' => 'iii. Other Taxes', 'level' => 5, 'sort_order' => 13, 'parent' => 'd. Other Local Taxes'],
            
            ['source' => 'pm', 'name' => '2. Non-Tax Revenue', 'level' => 3, 'sort_order' => 14, 'parent' => 'A. Local Source'],
            ['source' => 'pm', 'name' => 'a. Regulatory Fees', 'level' => 4, 'sort_order' => 15, 'parent' => '2. Non-Tax Revenue'],
            ['source' => 'pm', 'name' => 'b. Business & Service Income', 'level' => 4, 'sort_order' => 16, 'parent' => '2. Non-Tax Revenue'],
            ['source' => 'pm', 'name' => 'i. Receipts from Market Operation', 'level' => 5, 'sort_order' => 17, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => 'ii. Pay Toilet Receipts', 'level' => 5, 'sort_order' => 18, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => 'iii. Parking Fees', 'level' => 5, 'sort_order' => 19, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => 'iv. Trading', 'level' => 5, 'sort_order' => 20, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => 'v. Wharf Enterprise/Fastcraft', 'level' => 5, 'sort_order' => 21, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => 'vi. Slaughterhouse', 'level' => 5, 'sort_order' => 22, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => '1. Swine', 'level' => 6, 'sort_order' => 23, 'parent' => 'vi. Slaughterhouse'],
            ['source' => 'pm', 'name' => '2. Cattle', 'level' => 6, 'sort_order' => 24, 'parent' => 'vi. Slaughterhouse'],
            ['source' => 'pm', 'name' => 'vii. Waterworks', 'level' => 5, 'sort_order' => 25, 'parent' => 'b. Business & Service Income'],
            ['source' => 'pm', 'name' => 'c. Other Service Income', 'level' => 4, 'sort_order' => 26, 'parent' => '2. Non-Tax Revenue'],
            
            ['source' => 'pm', 'name' => 'B. External Source', 'level' => 2, 'sort_order' => 27, 'parent' => 'Receipts'],
            ['source' => 'pm', 'name' => '1. Share from National Internal Revenue Taxes', 'level' => 3, 'sort_order' => 28, 'parent' => 'B. External Source'],
            ['source' => 'pm', 'name' => '2. Shares from GOCCs(PAGCOR & PCSO)', 'level' => 3, 'sort_order' => 29, 'parent' => 'B. External Source'],
            ['source' => 'pm', 'name' => '3. Other Shares from National Taxes', 'level' => 3, 'sort_order' => 30, 'parent' => 'B. External Source'],
            ['source' => 'pm', 'name' => 'a. Share from EVAT', 'level' => 4, 'sort_order' => 31, 'parent' => '3. Other Shares from National Taxes'],
            ['source' => 'pm', 'name' => 'b. Tobacco Excise Tax', 'level' => 4, 'sort_order' => 32, 'parent' => '3. Other Shares from National Taxes'],
            ['source' => 'pm', 'name' => '4. Extraordinary Receipts', 'level' => 3, 'sort_order' => 33, 'parent' => 'B. External Source'],
            ['source' => 'pm', 'name' => 'a. Grants and Donations', 'level' => 4, 'sort_order' => 34, 'parent' => '4. Extraordinary Receipts'],
            ['source' => 'pm', 'name' => 'b. Subsidies from NGAs', 'level' => 4, 'sort_order' => 35, 'parent' => '4. Extraordinary Receipts'],
            ['source' => 'pm', 'name' => '5. Other Local Transfer', 'level' => 3, 'sort_order' => 36, 'parent' => 'B. External Source'],
            ['source' => 'pm', 'name' => 'a. Subsidy from General Fund', 'level' => 4, 'sort_order' => 37, 'parent' => '5. Other Local Transfer'],
            ['source' => 'pm', 'name' => 'b. Subsidy from Motorpool', 'level' => 4, 'sort_order' => 38, 'parent' => '5. Other Local Transfer'],
            ['source' => 'pm', 'name' => 'c. Subsidy from Slaughterhouse', 'level' => 4, 'sort_order' => 39, 'parent' => '5. Other Local Transfer'],
            ['source' => 'pm', 'name' => 'd. Subsidy from OCC', 'level' => 4, 'sort_order' => 40, 'parent' => '5. Other Local Transfer'],
            
            ['source' => 'pm', 'name' => 'C. Non-Income Receipts', 'level' => 2, 'sort_order' => 41, 'parent' => 'Receipts'],
            ['source' => 'pm', 'name' => '1. Capital Investment Receipts', 'level' => 3, 'sort_order' => 42, 'parent' => 'C. Non-Income Receipts'],
            ['source' => 'pm', 'name' => 'a. Proceeds from Sale of Assets', 'level' => 4, 'sort_order' => 43, 'parent' => '1. Capital Investment Receipts'],
            ['source' => 'pm', 'name' => '2. Receipts from Loans and Borrowings', 'level' => 3, 'sort_order' => 44, 'parent' => 'C. Non-Income Receipts'],
            ['source' => 'pm', 'name' => 'a. Acquisition of Loans', 'level' => 4, 'sort_order' => 45, 'parent' => '2. Receipts from Loans and Borrowings'],
        ];

        // Insert Slaughterhouse objects
        $shObjects = [
            ['source' => 'sh', 'name' => 'Beginning Cash Balance', 'level' => 1, 'sort_order' => 1],
            ['source' => 'sh', 'name' => 'Receipts', 'level' => 1, 'sort_order' => 2],
            ['source' => 'sh', 'name' => 'A. Local Source', 'level' => 2, 'sort_order' => 3, 'parent' => 'Receipts'],
            ['source' => 'sh', 'name' => '1. Tax Revenue', 'level' => 3, 'sort_order' => 4, 'parent' => 'A. Local Source'],
            ['source' => 'sh', 'name' => 'a. Real Property Tax', 'level' => 4, 'sort_order' => 5, 'parent' => '1. Tax Revenue'],
            ['source' => 'sh', 'name' => 'i. Basic RPT', 'level' => 5, 'sort_order' => 6, 'parent' => 'a. Real Property Tax'],
            ['source' => 'sh', 'name' => 'ii. Special Education Fund', 'level' => 5, 'sort_order' => 7, 'parent' => 'a. Real Property Tax'],
            ['source' => 'sh', 'name' => 'b. Special Education Tax', 'level' => 4, 'sort_order' => 8, 'parent' => '1. Tax Revenue'],
            ['source' => 'sh', 'name' => 'c. Business Taxes & Licenses', 'level' => 4, 'sort_order' => 9, 'parent' => '1. Tax Revenue'],
            ['source' => 'sh', 'name' => 'd. Other Local Taxes', 'level' => 4, 'sort_order' => 10, 'parent' => '1. Tax Revenue'],
            ['source' => 'sh', 'name' => 'i. Community Tax', 'level' => 5, 'sort_order' => 11, 'parent' => 'd. Other Local Taxes'],
            ['source' => 'sh', 'name' => 'ii. Amusement Tax', 'level' => 5, 'sort_order' => 12, 'parent' => 'd. Other Local Taxes'],
            ['source' => 'sh', 'name' => 'iii. Other Taxes', 'level' => 5, 'sort_order' => 13, 'parent' => 'd. Other Local Taxes'],
            
            ['source' => 'sh', 'name' => '2. Non-Tax Revenue', 'level' => 3, 'sort_order' => 14, 'parent' => 'A. Local Source'],
            ['source' => 'sh', 'name' => 'a. Regulatory Fees', 'level' => 4, 'sort_order' => 15, 'parent' => '2. Non-Tax Revenue'],
            ['source' => 'sh', 'name' => 'b. Business & Service Income', 'level' => 4, 'sort_order' => 16, 'parent' => '2. Non-Tax Revenue'],
            ['source' => 'sh', 'name' => '1. Slaughtering Fee', 'level' => 5, 'sort_order' => 17, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '2. Butchers Fee', 'level' => 5, 'sort_order' => 18, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '3. Ante-Mortem Fee', 'level' => 5, 'sort_order' => 19, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '4. Post-Mortem Fee', 'level' => 5, 'sort_order' => 20, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '5. Lairage Fee/Coral Fee', 'level' => 5, 'sort_order' => 21, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '6. Meat Delivery Fee', 'level' => 5, 'sort_order' => 22, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '7. Miscellaneous Fee', 'level' => 5, 'sort_order' => 23, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '8. Permit To Slaughter', 'level' => 5, 'sort_order' => 24, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => '9. Boarding Fee', 'level' => 5, 'sort_order' => 25, 'parent' => 'b. Business & Service Income'],
            ['source' => 'sh', 'name' => 'c. Other Service Income', 'level' => 4, 'sort_order' => 26, 'parent' => '2. Non-Tax Revenue'],
            
            ['source' => 'sh', 'name' => 'B. External Source', 'level' => 2, 'sort_order' => 27, 'parent' => 'Receipts'],
            ['source' => 'sh', 'name' => '1. Share from National Internal Revenue Taxes', 'level' => 3, 'sort_order' => 28, 'parent' => 'B. External Source'],
            ['source' => 'sh', 'name' => '2. Shares from GOCCs(PAGCOR & PCSO)', 'level' => 3, 'sort_order' => 29, 'parent' => 'B. External Source'],
            ['source' => 'sh', 'name' => '3. Other Shares from National Taxes', 'level' => 3, 'sort_order' => 30, 'parent' => 'B. External Source'],
            ['source' => 'sh', 'name' => 'a. Share from EVAT', 'level' => 4, 'sort_order' => 31, 'parent' => '3. Other Shares from National Taxes'],
            ['source' => 'sh', 'name' => 'b. Tobacco Excise Tax', 'level' => 4, 'sort_order' => 32, 'parent' => '3. Other Shares from National Taxes'],
            ['source' => 'sh', 'name' => '4. Extraordinary Receipts', 'level' => 3, 'sort_order' => 33, 'parent' => 'B. External Source'],
            ['source' => 'sh', 'name' => 'a. Grants and Donations', 'level' => 4, 'sort_order' => 34, 'parent' => '4. Extraordinary Receipts'],
            ['source' => 'sh', 'name' => 'b. Subsidies from NGAs', 'level' => 4, 'sort_order' => 35, 'parent' => '4. Extraordinary Receipts'],
            ['source' => 'sh', 'name' => '5. Other Local Transfer', 'level' => 3, 'sort_order' => 36, 'parent' => 'B. External Source'],
            ['source' => 'sh', 'name' => 'a. Subsidy from General Fund', 'level' => 4, 'sort_order' => 37, 'parent' => '5. Other Local Transfer'],
            ['source' => 'sh', 'name' => 'b. Subsidy from Market Operation', 'level' => 4, 'sort_order' => 38, 'parent' => '5. Other Local Transfer'],
            ['source' => 'sh', 'name' => 'c. Subsidy from Motorpool', 'level' => 4, 'sort_order' => 39, 'parent' => '5. Other Local Transfer'],
            ['source' => 'sh', 'name' => 'd. Subsidy from OCC', 'level' => 4, 'sort_order' => 40, 'parent' => '5. Other Local Transfer'],
            
            ['source' => 'sh', 'name' => 'C. Non-Income Receipts', 'level' => 2, 'sort_order' => 41, 'parent' => 'Receipts'],
            ['source' => 'sh', 'name' => '1. Capital Investment Receipts', 'level' => 3, 'sort_order' => 42, 'parent' => 'C. Non-Income Receipts'],
            ['source' => 'sh', 'name' => 'a. Proceeds from Sale of Assets', 'level' => 4, 'sort_order' => 43, 'parent' => '1. Capital Investment Receipts'],
            ['source' => 'sh', 'name' => '2. Receipts from Loans and Borrowings', 'level' => 3, 'sort_order' => 44, 'parent' => 'C. Non-Income Receipts'],
            ['source' => 'sh', 'name' => 'a. Acquisition of Loans', 'level' => 4, 'sort_order' => 45, 'parent' => '2. Receipts from Loans and Borrowings'],
        ];

        // Insert all objects
        foreach (array_merge($occObjects, $pmObjects, $shObjects) as $obj) {
            $parentId = null;
            if (isset($obj['parent'])) {
                $parent = DB::table('income_fund_objects')
                    ->where('source', $obj['source'])
                    ->where('name', $obj['parent'])
                    ->first();
                $parentId = $parent->id ?? null;
            }

            DB::table('income_fund_objects')->insert([
                'source' => $obj['source'],
                'parent_id' => $parentId,
                'name' => $obj['name'],
                'level' => $obj['level'],
                'sort_order' => $obj['sort_order'],
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

}