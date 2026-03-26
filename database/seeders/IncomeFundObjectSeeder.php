<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class IncomeFundObjectSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // DB::table('lbp_form1_objects')->delete();

        $items = [

            ['id'=>1,'parent_id'=>null,'code'=>'1','name'=>'Beginning Cash Balance','level'=>1],

            ['id'=>2,'parent_id'=>null,'code'=>'2','name'=>'Receipts','level'=>1],

            ['id'=>3,'parent_id'=>2,'code'=>'A','name'=>'Local Source','level'=>2],

            ['id'=>4,'parent_id'=>3,'code'=>'1','name'=>'Tax Revenue','level'=>3],

            ['id'=>5,'parent_id'=>4,'code'=>'a','name'=>'Real Property Tax','level'=>4],

            ['id'=>6,'parent_id'=>5,'code'=>'i','name'=>'Basic RPT','level'=>5],
            ['id'=>7,'parent_id'=>5,'code'=>'ii','name'=>'Fines & Penalties','level'=>5],

            ['id'=>8,'parent_id'=>4,'code'=>'b','name'=>'Special Education Tax','level'=>4],
            ['id'=>9,'parent_id'=>4,'code'=>'c','name'=>'Business Taxes & Licenses','level'=>4],

            ['id'=>10,'parent_id'=>4,'code'=>'d','name'=>'Other Local Taxes','level'=>4],

            ['id'=>11,'parent_id'=>10,'code'=>'i','name'=>'Community Tax','level'=>5],
            ['id'=>12,'parent_id'=>10,'code'=>'ii','name'=>'Amusement Tax','level'=>5],
            ['id'=>13,'parent_id'=>10,'code'=>'iii','name'=>'Other Taxes','level'=>5],

            ['id'=>14,'parent_id'=>3,'code'=>'2','name'=>'Non-Tax Revenue','level'=>3],

            ['id'=>15,'parent_id'=>14,'code'=>'a','name'=>'Regulatory Fees','level'=>4],

            ['id'=>16,'parent_id'=>15,'code'=>'i','name'=>'Registration Fees','level'=>5],
            ['id'=>17,'parent_id'=>15,'code'=>'ii','name'=>'Permit Fees','level'=>5],
            ['id'=>18,'parent_id'=>15,'code'=>'iii','name'=>'Medical, Dental & Laboratory Fees','level'=>5],
            ['id'=>19,'parent_id'=>15,'code'=>'iv','name'=>'Building Permit Fees','level'=>5],
            ['id'=>20,'parent_id'=>15,'code'=>'v','name'=>'Clearance/Certification Fees','level'=>5],
            ['id'=>21,'parent_id'=>15,'code'=>'vi','name'=>'Inspection Fees','level'=>5],
            ['id'=>22,'parent_id'=>15,'code'=>'vii','name'=>'Environmental Fees','level'=>5],
            ['id'=>23,'parent_id'=>15,'code'=>'viii','name'=>'Tipping Fees','level'=>5],
            ['id'=>24,'parent_id'=>15,'code'=>'ix','name'=>'Tourism Ecological Fee','level'=>5],

            ['id'=>25,'parent_id'=>15,'code'=>'x','name'=>'Other Fees','level'=>5],

            ['id'=>26,'parent_id'=>25,'code'=>'1','name'=>'Weight & Measures','level'=>6],
            ['id'=>27,'parent_id'=>25,'code'=>'2','name'=>'Fines & Penalties','level'=>6],
            ['id'=>28,'parent_id'=>25,'code'=>'3','name'=>'Supervision and Regulation Enforcement Fees','level'=>6],

            ['id'=>29,'parent_id'=>14,'code'=>'b','name'=>'Business & Service Income','level'=>4],

            ['id'=>30,'parent_id'=>29,'code'=>'i','name'=>'Interest Income','level'=>5],
            ['id'=>31,'parent_id'=>29,'code'=>'ii','name'=>'Other Business Income','level'=>5],

            ['id'=>32,'parent_id'=>14,'code'=>'c','name'=>'Other Service Income','level'=>4],

            ['id'=>33,'parent_id'=>2,'code'=>'B','name'=>'External Source','level'=>2],

            ['id'=>34,'parent_id'=>33,'code'=>'1','name'=>'National Tax Allotment','level'=>3],
            ['id'=>35,'parent_id'=>33,'code'=>'2','name'=>'Shares from GOCCs (PAGCOR & PCSO)','level'=>3],

            ['id'=>36,'parent_id'=>33,'code'=>'3','name'=>'Other Shares from National Taxes','level'=>3],

            ['id'=>37,'parent_id'=>36,'code'=>'a','name'=>'Share from EVAT','level'=>4],
            ['id'=>38,'parent_id'=>36,'code'=>'b','name'=>'Tobacco Excise Tax','level'=>4],

            ['id'=>39,'parent_id'=>33,'code'=>'4','name'=>'Extraordinary Receipts','level'=>3],

            ['id'=>40,'parent_id'=>39,'code'=>'a','name'=>'Grants and Donations','level'=>4],
            ['id'=>41,'parent_id'=>39,'code'=>'b','name'=>'Subsidies from NGA\'s','level'=>4],

            ['id'=>42,'parent_id'=>33,'code'=>'5','name'=>'Other Local Transfer','level'=>3],

            ['id'=>43,'parent_id'=>42,'code'=>'a','name'=>'Subsidy from Market Operation','level'=>4],
            ['id'=>44,'parent_id'=>42,'code'=>'b','name'=>'Subsidy from OCC','level'=>4],

            ['id'=>45,'parent_id'=>2,'code'=>'C','name'=>'Non-Income Receipts','level'=>2],

            ['id'=>46,'parent_id'=>45,'code'=>'1','name'=>'Capital Investment Receipts','level'=>3],

            ['id'=>47,'parent_id'=>46,'code'=>'a','name'=>'Proceeds from Sale of Assets','level'=>4],

            ['id'=>48,'parent_id'=>45,'code'=>'2','name'=>'Receipts from Loans and Borrowings','level'=>3],

            ['id'=>49,'parent_id'=>48,'code'=>'a','name'=>'Acquisition of Loans','level'=>4],

        ];

        DB::table('income_fund_objects')->insert($items);
    }
}
