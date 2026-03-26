<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Parent: AIP program definitions (dept-scoped, reusable) ──────────
        Schema::create('aip_programs', function (Blueprint $table) {
            $table->id('aip_program_id');
            $table->string('aip_reference_code')->nullable();
            $table->text('program_description');
            $table->unsignedBigInteger('dept_id');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->foreign('dept_id')
                  ->references('dept_id')
                  ->on('departments')
                  ->onDelete('cascade');
        });

        // ── Child: per-budget-plan detail rows ───────────────────────────────
        Schema::create('dept_bp_form4_items', function (Blueprint $table) {
            $table->id('dept_bp_form4_item_id');

            $table->unsignedBigInteger('aip_program_id');
            $table->foreign('aip_program_id')
                  ->references('aip_program_id')
                  ->on('aip_programs')
                  ->onDelete('cascade');

            $table->unsignedBigInteger('dept_budget_plan_id');
            $table->foreign('dept_budget_plan_id')
                  ->references('dept_budget_plan_id')
                  ->on('department_budget_plans')
                  ->onDelete('cascade');

            $table->text('major_final_output')->nullable();
            $table->text('performance_indicator')->nullable();
            $table->string('target')->nullable();

            $table->decimal('ps_amount',    15, 2)->default(0);
            $table->decimal('mooe_amount',  15, 2)->default(0);
            $table->decimal('co_amount',    15, 2)->default(0);

            // Stored computed column — automatically maintained by DB
            $table->decimal('total_amount', 15, 2)->storedAs('ps_amount + mooe_amount + co_amount');

            // Semester breakdown — used later by Form 2
            $table->decimal('sem1_amount', 15, 2)->default(0);
            $table->decimal('sem2_amount', 15, 2)->default(0);

            $table->string('recommendation', 255)->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            // One detail row per program per budget plan
            $table->unique(['aip_program_id', 'dept_budget_plan_id'], 'unique_program_per_plan');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dept_bp_form4_items');
        Schema::dropIfExists('aip_programs');
    }
};