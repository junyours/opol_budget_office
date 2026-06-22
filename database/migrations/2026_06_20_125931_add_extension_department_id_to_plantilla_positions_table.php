<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('plantilla_positions', function (Blueprint $table) {
            // Plain grouping number — no FK constraint. Null = main department group.
            $table->unsignedBigInteger('extension_department_id')->nullable()->after('dept_id');
            $table->index('extension_department_id');
        });
    }

    public function down(): void
    {
        Schema::table('plantilla_positions', function (Blueprint $table) {
            $table->dropIndex(['extension_department_id']);
            $table->dropColumn('extension_department_id');
        });
    }
};
