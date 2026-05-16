<?php

namespace Database\Seeders;

use App\Models\PsSetting;
use Illuminate\Database\Seeder;

class PsSettingSeeder extends Seeder
{
    public function run(): void
    {
        // Only seeds if no row exists yet — safe to run multiple times
        PsSetting::firstOrCreate(
            ['key' => 'default'],
            ['value' => []] // controller will merge defaults on GET
        );
    }
}
