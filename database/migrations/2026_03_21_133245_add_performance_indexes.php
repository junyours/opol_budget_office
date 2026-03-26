<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── department_budget_plans ───────────────────────────────────────────
        // Most queried table — filtered by budget_plan_id on almost every page
        Schema::table('department_budget_plans', function (Blueprint $table) {
            $table->index('budget_plan_id', 'idx_dbp_budget_plan_id');
            $table->index('dept_id',        'idx_dbp_dept_id');
            $table->index('status',         'idx_dbp_status');
        });

        // ── dept_bp_form2_items ───────────────────────────────────────────────
        // Loaded for every department on Form 2, Summary, Form 7 SA tabs
        Schema::table('dept_bp_form2_items', function (Blueprint $table) {
            $table->index('dept_budget_plan_id', 'idx_form2_dept_budget_plan_id');
            $table->index('expense_item_id',     'idx_form2_expense_item_id');
        });

        // ── aip_programs ──────────────────────────────────────────────────────
        // Queried by dept_id on summary page
        Schema::table('aip_programs', function (Blueprint $table) {
            $table->index('dept_id',   'idx_aip_dept_id');
            $table->index('is_active', 'idx_aip_is_active');
        });

        // ── dept_bp_form4_items ───────────────────────────────────────────────
        Schema::table('dept_bp_form4_items', function (Blueprint $table) {
            $table->index('aip_program_id',      'idx_form4_aip_program_id');
            $table->index('dept_budget_plan_id', 'idx_form4_dept_budget_plan_id');
        });

        // ── dept_bp_from3_assignments ─────────────────────────────────────────
        // Queried per dept_budget_plan_id for plantilla
        Schema::table('dept_bp_from3_assignments', function (Blueprint $table) {
            $table->index('dept_budget_plan_id',  'idx_form3_dept_budget_plan_id');
            $table->index('plantilla_position_id','idx_form3_plantilla_position_id');
        });

        // ── unified_plan_items ────────────────────────────────────────────────
        // Already has composite index on [budget_plan_id, plan_type, sort_order]
        // Add dept_id for filtering
        Schema::table('unified_plan_items', function (Blueprint $table) {
            $table->index('dept_id',    'idx_upi_dept_id');
            $table->index('plan_type',  'idx_upi_plan_type');
        });

        // ── income_fund_amounts ───────────────────────────────────────────────
        Schema::table('income_fund_amounts', function (Blueprint $table) {
            $table->index(['budget_plan_id', 'source'], 'idx_ifa_plan_source');
        });

        // ── plantilla_assignments ─────────────────────────────────────────────
        Schema::table('plantilla_assignments', function (Blueprint $table) {
            $table->index('personnel_id', 'idx_pa_personnel_id');
        });

        // ── expense_class_items ───────────────────────────────────────────────
        Schema::table('expense_class_items', function (Blueprint $table) {
            $table->index('expense_class_id', 'idx_eci_expense_class_id');
            $table->index('is_active',        'idx_eci_is_active');
        });
    }

    public function down(): void
    {
        Schema::table('department_budget_plans', function (Blueprint $table) {
            $table->dropIndex('idx_dbp_budget_plan_id');
            $table->dropIndex('idx_dbp_dept_id');
            $table->dropIndex('idx_dbp_status');
        });

        Schema::table('dept_bp_form2_items', function (Blueprint $table) {
            $table->dropIndex('idx_form2_dept_budget_plan_id');
            $table->dropIndex('idx_form2_expense_item_id');
        });

        Schema::table('aip_programs', function (Blueprint $table) {
            $table->dropIndex('idx_aip_dept_id');
            $table->dropIndex('idx_aip_is_active');
        });

        Schema::table('dept_bp_form4_items', function (Blueprint $table) {
            $table->dropIndex('idx_form4_aip_program_id');
            $table->dropIndex('idx_form4_dept_budget_plan_id');
        });

        Schema::table('dept_bp_from3_assignments', function (Blueprint $table) {
            $table->dropIndex('idx_form3_dept_budget_plan_id');
            $table->dropIndex('idx_form3_plantilla_position_id');
        });

        Schema::table('unified_plan_items', function (Blueprint $table) {
            $table->dropIndex('idx_upi_dept_id');
            $table->dropIndex('idx_upi_plan_type');
        });

        Schema::table('income_fund_amounts', function (Blueprint $table) {
            $table->dropIndex('idx_ifa_plan_source');
        });

        Schema::table('plantilla_assignments', function (Blueprint $table) {
            $table->dropIndex('idx_pa_personnel_id');
        });

        Schema::table('expense_class_items', function (Blueprint $table) {
            $table->dropIndex('idx_eci_expense_class_id');
            $table->dropIndex('idx_eci_is_active');
        });
    }
};