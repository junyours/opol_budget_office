<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('gad_entries', function (Blueprint $table) {
            $table->id('gad_entry_id');

            // Which budget plan this entry belongs to
            $table->foreignId('budget_plan_id')
                ->constrained('budget_plans', 'budget_plan_id')
                ->cascadeOnDelete();

            // Which focus group: 'client' or 'organization'
            $table->enum('focus_type', ['client', 'organization']);

            // Core fields
            $table->text('gender_issue')->nullable();
            $table->text('gad_objective')->nullable();
            $table->text('relevant_program')->nullable();
            $table->text('gad_activity')->nullable();
            $table->text('performance_indicator')->nullable();
            $table->decimal('mooe', 15, 2)->default(0);

            // Lead / Responsible Office — FK to departments, nullable for free-text fallback
            $table->foreignId('department_id')
                ->nullable()
                ->constrained('departments', 'dept_id')
                ->nullOnDelete();

            // Free-text fallback in case dept is not in the system
            $table->string('lead_office_text')->nullable();

            // Row grouping: multiple GAD activities can share the same gender_issue / gad_objective / relevant_program
            // We use a group_key (UUID or sequential) to link them visually.
            // NULL means the row is standalone.
            $table->string('group_key')->nullable()->index();

            // Sort order within the focus group
            $table->unsignedInteger('sort_order')->default(0);

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['budget_plan_id', 'focus_type']);
            $table->index(['budget_plan_id', 'sort_order']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('gad_entries');
    }
};