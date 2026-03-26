<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Statement of Indebtedness — LBP Form 5
     *
     * debt_obligations  → parent row (one per loan/creditor)
     * debt_payments     → per-budget-plan payment records (editable principal/interest for that year)
     */
    public function up(): void
    {
        // ── Parent table ─────────────────────────────────────────────────────────
        Schema::create('debt_obligations', function (Blueprint $table) {
            $table->id('obligation_id');

            // Column (1) – Creditor
            $table->string('creditor');

            // Column (2) – Date Contracted (free-text to allow "Various date Contracted")
            $table->string('date_contracted');

            // Column (3) – Term (free-text: "15 years  4% Fixed up to 12/31/22  subject to annual repricing")
            $table->text('term');

            // Column (4) – Principal Amount (original loan face value)
            $table->decimal('principal_amount', 18, 2);

            // Column (5) – Purpose
            $table->text('purpose');

            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();
        });

        // ── Per-budget-year payments ──────────────────────────────────────────────
        Schema::create('debt_payments', function (Blueprint $table) {
            $table->id('payment_id');

            $table->foreignId('obligation_id')
                ->constrained('debt_obligations', 'obligation_id')
                ->cascadeOnDelete();

            // Link to the budget plan year this payment row belongs to
            $table->foreignId('budget_plan_id')
                ->constrained('budget_plans', 'budget_plan_id')   // adjust PK name if yours differs
                ->cascadeOnDelete();

            // Columns (9) & (10) – editable for the CURRENT budget plan year
            
            
            $table->decimal('principal_sem1', 18, 2)->default(0);
            $table->decimal('principal_sem2', 18, 2)->default(0);
            $table->decimal('principal_due', 18, 2)->default(0);

            $table->decimal('interest_sem1', 18, 2)->default(0);
            $table->decimal('interest_sem2', 18, 2)->default(0);
            $table->decimal('interest_due',  18, 2)->default(0);

            $table->timestamps();

            $table->unique(['obligation_id', 'budget_plan_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('debt_payments');
        Schema::dropIfExists('debt_obligations');
    }
};