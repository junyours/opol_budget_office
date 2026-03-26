<?php
// database/seeders/MdfCategorySeeder.php

namespace Database\Seeders;

use App\Models\MdfCategory;
use Illuminate\Database\Seeder;

class MdfCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name'              => 'GENERAL PUBLIC SERVICES',
                'code'              => 'GPS',
                'is_debt_servicing' => false,
                'sort_order'        => 1,
            ],
            [
                'name'              => 'SOCIAL SERVICES',
                'code'              => 'SS',
                'is_debt_servicing' => false,
                'sort_order'        => 2,
            ],
            [
                'name'              => 'ECONOMIC SERVICES - Debt Servicing',
                'code'              => 'ES-DS',
                'is_debt_servicing' => true,   // ← auto-populated from debt_obligations
                'sort_order'        => 3,
            ],
            [
                'name'              => 'INFRASTRUCTURE PROJECTS',
                'code'              => 'INFRA',
                'is_debt_servicing' => false,
                'sort_order'        => 4,
            ],
        ];

        foreach ($categories as $cat) {
            MdfCategory::firstOrCreate(
                ['name' => $cat['name']],
                $cat
            );
        }
    }
}