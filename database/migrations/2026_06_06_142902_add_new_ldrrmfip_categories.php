<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        $newCategories = [
            ['name' => 'Prevention & Mitigation',  'sort_order' => 10, 'is_active' => true],
            ['name' => 'Preparedness',             'sort_order' => 20, 'is_active' => true],
            ['name' => 'Response',                 'sort_order' => 30, 'is_active' => true],
            ['name' => 'Recovery & Rehabilitation','sort_order' => 40, 'is_active' => true],
        ];

        foreach ($newCategories as $cat) {
            \DB::table('ldrrmfip_categories')->insertOrIgnore($cat);
        }
    }

    public function down(): void
    {
        // intentionally left empty — don't delete old data
    }
};
