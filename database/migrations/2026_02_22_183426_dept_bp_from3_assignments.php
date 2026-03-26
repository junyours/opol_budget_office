<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up()
    {
        Schema::create('dept_bp_from3_assignments', function (Blueprint $table) {
            $table->id('dept_bp_from3_assignment_id');
            $table->foreignId('dept_budget_plan_id')
                  ->constrained('department_budget_plans', 'dept_budget_plan_id')
                  ->onDelete('cascade');
            $table->foreignId('plantilla_position_id')
                  ->constrained('plantilla_positions', 'plantilla_position_id');
            $table->foreignId('personnel_id')
                  ->nullable()
                  ->constrained('personnels', 'personnel_id')
                  ->nullOnDelete();
            $table->integer('salary_grade');
            $table->integer('step');
            $table->decimal('monthly_rate', 12, 2);
            $table->decimal('annual_rate', 12, 2);
            $table->decimal('annual_increment', 12, 2)
                  ->nullable();
            $table->date('step_effective_date')->nullable();
            $table->foreignId('salary_standard_version_id')
                  ->nullable()
                  ->constrained('salary_standard_versions', 'salary_standard_version_id')
                  ->nullOnDelete();
            $table->timestamps();

            $table->unique(['dept_budget_plan_id', 'plantilla_position_id'], 'budget_plantilla_unique');


        });
    }

    public function down()
    {
        Schema::dropIfExists('dept_bp_from3_assignments');
    }
};
