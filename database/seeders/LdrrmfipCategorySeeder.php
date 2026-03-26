<?php
// database/seeders/LdrrmfipCategorySeeder.php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class LdrrmfipCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            ['name' => 'DISASTER RESPONSE & RESCUE EQUIPMENT', 'sort_order' => 1],
            ['name' => 'SUPPLIES OR INVENTORY',                 'sort_order' => 2],
            ['name' => 'DRRM, TRAININGS, SEMINARS & DRILLS',    'sort_order' => 3],
        ];

        foreach ($categories as $cat) {
            DB::table('ldrrmfip_categories')->updateOrInsert(
                ['name' => $cat['name']],
                ['sort_order' => $cat['sort_order'], 'is_active' => true,
                 'created_at' => now(), 'updated_at' => now()]
            );
        }
    }
}