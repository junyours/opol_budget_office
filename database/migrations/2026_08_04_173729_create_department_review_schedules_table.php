<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('department_review_schedules', function (Blueprint $table) {
            $table->id('dept_review_schedule_id');
            $table->unsignedBigInteger('dept_id');
            $table->unsignedBigInteger('budget_plan_id');

            $table->date('review_date');
            $table->enum('period', ['morning', 'afternoon']);
            $table->time('review_time')->nullable();
            $table->string('location')->nullable();

            $table->enum('status', ['scheduled', 'moved', 'completed', 'cancelled'])->default('scheduled');

            // ── Reschedule trail ────────────────────────────────────────────
            $table->text('reschedule_reason')->nullable();
            $table->date('previous_date')->nullable();
            $table->enum('previous_period', ['morning', 'afternoon'])->nullable();
            $table->time('previous_time')->nullable();
            $table->timestamp('rescheduled_at')->nullable();

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();

            $table->unique(['dept_id', 'budget_plan_id']);

            $table->foreign('dept_id')->references('dept_id')->on('departments')->onDelete('cascade');
            $table->foreign('budget_plan_id')->references('budget_plan_id')->on('budget_plans')->onDelete('cascade');
            $table->foreign('created_by')->references('user_id')->on('users')->nullOnDelete();
            $table->foreign('updated_by')->references('user_id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('department_review_schedules');
    }
};
