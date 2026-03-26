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
        Schema::create('salary_standard_versions', function (Blueprint $table) {
            $table->id('salary_standard_version_id');
            $table->string('lbc_reference', 100); // e.g., "LBC 160 Annex A-3"
            
            // Using ENUM for predefined tranche values
            $table->enum('tranche', [
                '1st Tranche',
                '2nd Tranche',
                '3rd Tranche',
                '4th Tranche'
            ]);
            
            $table->string('income_class', 50);
            $table->date('effective_year');
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Indexes
            $table->index('lbc_reference');
            $table->index('tranche');
            $table->index('income_class');
            $table->index('effective_year');
            $table->index('is_active');
            $table->index(['effective_year', 'is_active']);
            
            // Unique constraint
            $table->unique(['lbc_reference', 'tranche', 'income_class', 'effective_year'], 'unique_salary_version');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('salary_standard_versions');
    }
};