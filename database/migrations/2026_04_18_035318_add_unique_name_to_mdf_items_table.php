<?php
// database/migrations/xxxx_add_unique_name_to_mdf_items_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mdf_items', function (Blueprint $table) {
            $table->unique('name', 'mdf_items_name_unique');
        });
    }

    public function down(): void
    {
        Schema::table('mdf_items', function (Blueprint $table) {
            $table->dropUnique('mdf_items_name_unique');
        });
    }
};
