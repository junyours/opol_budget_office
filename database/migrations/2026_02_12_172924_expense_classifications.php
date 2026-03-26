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
        Schema::create('expense_classifications', function (Blueprint $table) {
            $table->id('expense_class_id');
            $table->string('expense_class_name');
            $table->string('abbreviation')->nullable();
            $table->timestamps();

            $table->unique(['expense_class_name'], 'expense_class_name_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('expense_classifications');
    }
};
