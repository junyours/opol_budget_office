<?php
// database/migrations/2025_01_01_000001_create_mdf_tables.php
//
// MDF data model mirrors Form2's dept_bp_form2_items pattern:
//   Each mdf_snapshots row = one item × one budget plan.
//   The table stores total_amount + sem1_actual for that plan year.
//   sem2 is always derived: total_amount - sem1_actual (never stored separately).
//
// The controller loads 3 budget plans and reads columns like this:
//   col (3) past actual  → pastPlan   snapshot.total_amount   [read-only]
//   col (4) sem1 actual  → currentPlan snapshot.sem1_actual   [editable]
//   col (5) sem2         → currentPlan snapshot.total_amount - sem1_actual [computed]
//   col (6) total        → currentPlan snapshot.total_amount  [read-only]
//   col (7) proposed     → activePlan  snapshot.total_amount  [editable]

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── 1. Categories ────────────────────────────────────────────────────
        Schema::create('mdf_categories', function (Blueprint $table) {
            $table->id('category_id');
            $table->string('name');
            $table->string('code')->nullable();
            $table->boolean('is_debt_servicing')->default(false);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
        });

        // ── 2. Line items ────────────────────────────────────────────────────
        Schema::create('mdf_items', function (Blueprint $table) {
            $table->id('item_id');
            $table->foreignId('category_id')
                ->constrained('mdf_categories', 'category_id')
                ->cascadeOnDelete();
            $table->string('name');
            // Null = regular item. Set for auto-synced debt rows.
            $table->foreignId('obligation_id')
                ->nullable()
                ->constrained('debt_obligations', 'obligation_id')
                ->nullOnDelete();
            $table->enum('debt_type', ['principal', 'interest'])->nullable();
            $table->string('account_code')->nullable();
            $table->integer('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();
        });

        // ── 3. Per-plan snapshots ────────────────────────────────────────────
        //
        // Mirrors dept_bp_form2_items:
        //   total_amount  = the budget for this item in this plan year
        //   sem1_actual   = 1st semester actual (editable; only meaningful for
        //                   the "current year" plan, i.e. active_year − 1)
        //
        // sem2 is never stored — always derived as total_amount - sem1_actual.
        //
        Schema::create('mdf_snapshots', function (Blueprint $table) {
            $table->id('snapshot_id');
            $table->foreignId('item_id')
                ->constrained('mdf_items', 'item_id')
                ->cascadeOnDelete();
            $table->foreignId('budget_plan_id')
                ->constrained('budget_plans', 'budget_plan_id')
                ->cascadeOnDelete();
            $table->decimal('total_amount', 18, 2)->default(0);
            $table->decimal('sem1_actual',  18, 2)->default(0);
            $table->timestamps();
            $table->unique(['item_id', 'budget_plan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mdf_snapshots');
        Schema::dropIfExists('mdf_items');
        Schema::dropIfExists('mdf_categories');
    }
};