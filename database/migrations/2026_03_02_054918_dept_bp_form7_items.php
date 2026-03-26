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
         Schema::create('dept_bp_form7_items', function (Blueprint $table) {
            $table->id('dept_bp_form7_items_id');
            $table->year('year');
            $table->foreignId('expense_item_id')
                  ->constrained('expense_class_items', 'expense_class_item_id');
            $table->decimal('gen_pub_total', 15, 2)->default(0);
            $table->decimal('social_total', 15, 2)->default(0);
            $table->decimal('economic_total', 15, 2)->default(0);
            $table->decimal('other_total', 15, 2)->default(0);
            $table->timestamps();

            $table->unique(['year', 'expense_item_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('dept_bp_form7_items');
    }
};
