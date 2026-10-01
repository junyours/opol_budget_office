<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audit_logs', function (Blueprint $t) {
            $t->id();

            // Tied to the ACTIVE budget plan at the time of the action.
            // No FK on purpose: deleting a budget plan must not wipe its history.
            $t->unsignedBigInteger('budget_plan_id')->nullable();
            $t->unsignedSmallInteger('budget_plan_year');

            // Actor (denormalised so the log survives user renames / deletions)
            $t->unsignedBigInteger('user_id')->nullable();
            $t->string('username', 100)->nullable();
            $t->string('user_name', 150)->nullable();
            $t->string('user_role', 30)->nullable();

            // What happened
            $t->string('action', 30);
            $t->string('subject_type', 80)->nullable();
            $t->string('subject_id', 40)->nullable();
            $t->string('subject_label', 255)->nullable();
            $t->string('description', 500);
            $t->json('changes')->nullable();

            // Where from
            $t->string('ip_address', 45)->nullable();
            $t->string('device', 150)->nullable();

            $t->timestamp('created_at')->useCurrent();

            $t->index('budget_plan_year');
            $t->index('user_id');
            $t->index('action');
            $t->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audit_logs');
    }
};
