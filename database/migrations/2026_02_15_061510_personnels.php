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
        Schema::create('personnels', function (Blueprint $table) {
            $table->id('personnel_id'); 
            
            $table->string('first_name', 100);
            $table->string('middle_name', 100)->nullable();
            $table->string('last_name', 100);
            
            // $table->integer('step')->default(1);
            $table->timestamps();
            
            // Indexes
            $table->index('personnel_id');
            $table->index('first_name');
            $table->index('last_name');
            $table->index(['last_name', 'first_name']);

            $table->unique(['first_name', 'last_name', 'middle_name'], 'personnels_full_name_unique');
            
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('personnels');
    }
};