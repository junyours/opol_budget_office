<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dept_bp_form6_items', function (Blueprint $table) {
            $table->id('dept_bp_form6_items_id');
            $table->year('year');
            $table->foreignId('expense_item_id')
                  ->constrained('expense_class_items', 'expense_class_item_id');
            $table->decimal('total_amount', 15, 2)->default(0);
            $table->timestamp('computed_at')->nullable();
            $table->timestamps();

            $table->unique(['year', 'expense_item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dept_bp_form6_items');
    }
};