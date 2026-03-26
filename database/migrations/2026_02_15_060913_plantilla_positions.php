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
        Schema::create('plantilla_positions', function (Blueprint $table) {
            $table->id('plantilla_position_id');
            $table->string('old_item_number', 50)->nullable();
            $table->string('new_item_number', 50);
            $table->string('position_title', 150);
            $table->integer('salary_grade');
            $table->foreignId('dept_id')->constrained('departments','dept_id')->onDelete('restrict');
            
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            
            // Optional: Add indexes for frequently queried columns
            $table->index('old_item_number');
            $table->index('new_item_number');
            $table->index('position_title');
            $table->index('is_active');
            
            // Optional: Add unique constraint if new_item_number should be unique
            $table->unique('new_item_number');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('plantilla_positions');
    }
};