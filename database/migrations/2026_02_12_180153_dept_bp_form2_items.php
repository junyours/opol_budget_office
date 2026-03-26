<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('dept_bp_form2_items', function (Blueprint $table) {
            $table->id('dept_bp_form2_item_id');

            $table->foreignId('dept_budget_plan_id')
                  ->constrained('department_budget_plans','dept_budget_plan_id')
                  ->cascadeOnDelete();

            $table->foreignId('expense_item_id')
                  ->constrained('expense_class_items','expense_class_item_id')
                  ->restrictOnDelete();

            $table->decimal('sem1_amount', 15, 2)->nullable()->default(0);
            $table->decimal('sem2_amount', 15, 2)->nullable()->default(0);

            $table->decimal('total_amount', 15, 2)->nullable()->default(0);

            $table->string('recommendation', 255)->nullable();

            $table->foreignId('updated_by')
                ->nullable()
                ->constrained('users', 'user_id')
                ->nullOnDelete();

            $table->timestamps();

            $table->unique(
                ['dept_budget_plan_id','expense_item_id'],
                'plan_item_unique'
            );

            $table->index('updated_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_budget_plan_expense_items');
    }
};
