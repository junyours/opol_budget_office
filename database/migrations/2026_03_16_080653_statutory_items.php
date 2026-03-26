<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form6_items', function (Blueprint $table) {
            $table->id('form6_item_id');

            // Which budget plan this amount belongs to
            $table->unsignedBigInteger('budget_plan_id');
            $table->foreign('budget_plan_id')
                  ->references('budget_plan_id')
                  ->on('budget_plans')
                  ->onDelete('cascade');

            $table->string('source', 50)->default('general-fund');

            // The template row this value belongs to
            $table->unsignedBigInteger('form6_template_id');
            $table->foreign('form6_template_id')
                  ->references('form6_template_id')
                  ->on('form6_templates')
                  ->onDelete('cascade');

            $table->decimal('amount', 18, 2)->default(0);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();

            $table->timestamps();

            // One amount row per template row per budget plan
            //$table->unique(['budget_plan_id', 'form6_template_id']);
            $table->unique(['budget_plan_id', 'form6_template_id', 'source']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('form6_items');
    }
};
