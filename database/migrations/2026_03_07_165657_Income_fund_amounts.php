<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('income_fund_amounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('budget_plan_id')->constrained('budget_plans','budget_plan_id')->cascadeOnDelete();
            $table->foreignId('income_fund_object_id')->constrained('income_fund_objects', null, 'igf_object_id_fk')->cascadeOnDelete();
            $table->enum('source', ['general-fund', 'sh', 'occ', 'pm']); 
            $table->decimal('sem1_actual',18,2)->nullable();
            $table->decimal('sem2_actual',18,2)->nullable(); 
            $table->decimal('proposed_amount',18,2)->nullable();
            $table->timestamps();
            
            // Add unique constraint to prevent duplicates
            $table->unique(['budget_plan_id', 'income_fund_object_id', 'source'], 'unique_fund_amount');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('income_fund_amounts');
    }
};