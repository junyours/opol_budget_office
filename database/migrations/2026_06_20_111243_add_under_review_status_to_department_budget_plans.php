<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration {
    public function up(): void
    {
        // Adjust if you're not on MySQL/MariaDB — Postgres would use a CHECK constraint instead.
        DB::statement("ALTER TABLE department_budget_plans MODIFY status ENUM('draft','submitted','under_review','approved') NOT NULL DEFAULT 'draft'");
    }

    public function down(): void
    {
        DB::statement("UPDATE department_budget_plans SET status = 'submitted' WHERE status = 'under_review'");
        DB::statement("ALTER TABLE department_budget_plans MODIFY status ENUM('draft','submitted','approved') NOT NULL DEFAULT 'draft'");
    }
};
