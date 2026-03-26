<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * One unified table for all Special Purpose / Annual Plan forms.
 *
 * PLAN TYPES & THEIR COLUMN VARIANTS
 * ────────────────────────────────────────────────────────────────────────────
 * SECTOR plans  (mpoc, drugs, arts, aids, sc_ppa)
 *   Uses: sector, target_output_aip, target_output_ab, aip_amount, ab_amount
 *
 * FUND plans    (lcpc, lydp, sc)
 *   Uses: sector (optional grouping), fund_source, ps_amount, mooe_amount,
 *         co_amount  — NO separate AB column
 *
 * NUTRITION     (nutrition)
 *   Uses: nutrition_issue, nutrition_objective, nutrition_activity,
 *         nutrition_target, lead_office_text, ps_amount, mooe_amount, co_amount
 *
 * All unused columns are NULL for each variant.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('unified_plan_items', function (Blueprint $table) {
            $table->id('up_item_id');

            // ── Discriminator ──────────────────────────────────────────────────
            $table->enum('plan_type', [
                // Sector plans
                'mpoc', 'drugs', 'arts', 'aids', 'sc_ppa',
                // Fund plans (formerly special_purpose_items)
                'lcpc', 'lydp', 'sc',
                // Nutrition
                'nutrition',
            ]);

            // ── Budget plan year scope ─────────────────────────────────────────
            $table->foreignId('budget_plan_id')
                ->constrained('budget_plans', 'budget_plan_id')
                ->cascadeOnDelete();

            // ── AIP Program parent (nullable for nutrition sub-rows) ───────────
            $table->foreignId('aip_program_id')
                ->nullable()
                ->constrained('aip_programs', 'aip_program_id')
                ->nullOnDelete();

            // ── Implementing / responsible office ─────────────────────────────
            $table->unsignedBigInteger('dept_id')->nullable();
            $table->foreign('dept_id')
                ->references('dept_id')->on('departments')->nullOnDelete();
            $table->string('implementing_office')->nullable(); // free-text fallback

            // ── Common narrative ───────────────────────────────────────────────
            $table->string('sector')->nullable();           // e.g. "GENERAL PUBLIC SERVICE"
            $table->string('sub_sector')->nullable();       // MPOC sub-grouping
            $table->text('program_description')->nullable();

            // ── Sector-plan columns ────────────────────────────────────────────
            $table->text('target_output_aip')->nullable();
            $table->text('target_output_ab')->nullable();
            $table->decimal('aip_amount', 15, 2)->default(0);
            $table->decimal('ab_amount',  15, 2)->default(0);

            // ── Fund-plan columns (lcpc / lydp / sc) ───────────────────────────
            $table->enum('fund_source', ['general_fund', 'special_account'])
                ->default('general_fund');

            // ── PS / MOOE / CO (fund plans + nutrition) ────────────────────────
            $table->decimal('ps_amount',   15, 2)->default(0);
            $table->decimal('mooe_amount', 15, 2)->default(0);
            $table->decimal('co_amount',   15, 2)->default(0);

            // ── Schedule (free-text) ───────────────────────────────────────────
            $table->string('start_date')->nullable();
            $table->string('completion_date')->nullable();

            // ── Climate change ─────────────────────────────────────────────────
            $table->decimal('cc_adaptation',  15, 2)->default(0);
            $table->decimal('cc_mitigation',   15, 2)->default(0);
            $table->string('cc_typology_code')->nullable();

            // ── Nutrition-specific ─────────────────────────────────────────────
            $table->text('nutrition_issue')->nullable();
            $table->text('nutrition_objective')->nullable();
            $table->text('nutrition_activity')->nullable();
            $table->string('nutrition_target')->nullable();
            $table->string('lead_office_text')->nullable();

            // ── Display helpers ────────────────────────────────────────────────
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_subtotal_row')->default(false);
            $table->string('row_label')->nullable();

            $table->timestamps();
            $table->softDeletes();

            $table->index(['budget_plan_id', 'plan_type', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('unified_plan_items');
    }
};