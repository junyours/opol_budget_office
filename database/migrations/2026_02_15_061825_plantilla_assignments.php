<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('plantilla_assignments', function (Blueprint $table) {
            $table->id('assignment_id');
            $table->foreignId('plantilla_position_id')
                  ->constrained('plantilla_positions', 'plantilla_position_id')
                  ->onDelete('cascade');
            $table->foreignId('personnel_id')
                  ->nullable()
                  ->constrained('personnels', 'personnel_id')
                  ->onDelete('set null');
            $table->date('assignment_date')->nullable();
            // $table->date('effective_date')->nullable();
            $table->timestamps();

            $table->unique('plantilla_position_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plantilla_assignments');
    }
};