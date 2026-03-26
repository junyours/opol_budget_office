<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::create('department_budget_plans', function (Blueprint $table) {
            $table->id('dept_budget_plan_id');

            $table->foreignId('budget_plan_id')
                  ->constrained('budget_plans', 'budget_plan_id')
                  ->cascadeOnDelete();

            $table->foreignId('dept_id')
                  ->constrained('departments','dept_id')
                  ->cascadeOnDelete();

            $table->enum('status', ['draft', 'submitted', 'approved'])->default('draft'); // diagram shows status
            $table->foreignId('created_by')->nullable()->constrained('users','user_id')->nullOnDelete();
            $table->foreignId('updated_by')->nullable()->constrained('users','user_id')->nullOnDelete();

            $table->timestamps();

            $table->unique(['dept_id', 'budget_plan_id'], 'dept_budget_plan_unique');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_budget_plans');
    }
};
