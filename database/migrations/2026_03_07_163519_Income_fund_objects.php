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
        Schema::create('income_fund_objects', function (Blueprint $table) {
            $table->id();
            $table->string('source')->default('general-fund');
            $table->foreignId('parent_id')->nullable()->constrained('income_fund_objects')->cascadeOnDelete();
            $table->string('code')->nullable();
            $table->string('name');
            $table->integer('level')->default(1);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index(['source', 'sort_order']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('lbp_form1_objects');
    }
};
