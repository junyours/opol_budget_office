<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('department_budget_plans', function (Blueprint $table) {
            $table->timestamp('submitted_at')->nullable()->after('status');
            $table->timestamp('acknowledged_at')->nullable()->after('submitted_at');
            $table->timestamp('approved_at')->nullable()->after('acknowledged_at');
            $table->timestamp('returned_at')->nullable()->after('approved_at');
        });
    }

    public function down(): void
    {
        Schema::table('department_budget_plans', function (Blueprint $table) {
            $table->dropColumn(['submitted_at', 'acknowledged_at', 'approved_at', 'returned_at']);
        });
    }
};
