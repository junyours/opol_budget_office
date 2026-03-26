<?php
// database/migrations/2024_01_01_000001_create_salary_grade_steps_table.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('salary_grade_steps', function (Blueprint $table) {
            $table->id('salary_grade_step_id');
            
            // This creates the column AND the foreign key in one line
            $table->foreignId('salary_standard_version_id')
                  ->constrained('salary_standard_versions', 'salary_standard_version_id')
                  ->onDelete('cascade');
                  
            $table->integer('salary_grade');
            $table->integer('step');
            $table->decimal('salary', 10, 2);
            $table->timestamps();
            
            // Unique constraint to prevent duplicate grade-step combinations per version
            $table->unique(['salary_standard_version_id', 'salary_grade', 'step'], 'unique_grade_step_per_version');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('salary_grade_steps');
    }
};