<?php
// database/migrations/2025_01_01_000003_create_ps_computation_values_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * PS Computation — stores only the two manual inputs per budget plan.
     * All other values are derived from dept_bp_form2_items at query time.
     *
     * budget_plan_id  → the PROPOSED year (e.g. 2026)
     * income_year     → automatically set to proposed_year − 2 (e.g. 2024)
     *
     * Manual inputs:
     *   total_income          → "Total Income from sources realized from next preceding year"
     *   non_recurring_income  → "Less: Non-Recurring Income"
     *   excess_amount         → "Excess Amount" (editable override, defaults 0)
     */
    public function up(): void
    {
        Schema::create('ps_computation_values', function (Blueprint $table) {
            $table->id('ps_computation_id');

            $table->foreignId('budget_plan_id')
                ->unique()   // one row per budget plan
                ->constrained('budget_plans', 'budget_plan_id')
                ->cascadeOnDelete();

            // Manual inputs
            $table->decimal('total_income',         18, 2)->default(0);
            $table->decimal('non_recurring_income', 18, 2)->default(0);
            $table->decimal('excess_amount',        18, 2)->default(0);

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ps_computation_values');
    }
};