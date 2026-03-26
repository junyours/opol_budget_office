<?php
// database/migrations/2025_01_01_000010_create_ldrrmfip_tables.php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // ── Categories (Functional Classification) ────────────────────────
        Schema::create('ldrrmfip_categories', function (Blueprint $table) {
            $table->id('ldrrmfip_category_id');
            $table->string('name');
            $table->unsignedInteger('sort_order')->default(0);
            $table->boolean('is_active')->default(true);
            $table->timestamps();
        });

        // ── Items ─────────────────────────────────────────────────────────
        Schema::create('ldrrmfip_items', function (Blueprint $table) {
            $table->id('ldrrmfip_item_id');

            $table->foreignId('budget_plan_id')
                ->constrained('budget_plans', 'budget_plan_id')
                ->cascadeOnDelete();

            $table->foreignId('ldrrmfip_category_id')
                ->constrained('ldrrmfip_categories', 'ldrrmfip_category_id')
                ->cascadeOnDelete();

            // ── Fund source ───────────────────────────────────────────────
            // 'general-fund' | 'occ' | 'pm' | 'sh'
            // Matches the source keys used by IncomeFundController.
            $table->string('source')->default('general-fund');

            $table->string('description');
            $table->string('implementing_office')->default('LDRRMO');
            $table->string('starting_date')->nullable();
            $table->string('completion_date')->nullable();
            $table->string('expected_output')->nullable();
            $table->string('funding_source')->default('LDRRMF');

            $table->decimal('mooe', 18, 2)->default(0);
            $table->decimal('co',   18, 2)->default(0);

            $table->unsignedBigInteger('created_by')->nullable();
            $table->unsignedBigInteger('updated_by')->nullable();
            $table->timestamps();
            $table->softDeletes();

            // Unique per plan + category + source + description
            $table->unique(
                ['budget_plan_id', 'ldrrmfip_category_id', 'source', 'description'],
                'ldrrmfip_unique_item'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ldrrmfip_items');
        Schema::dropIfExists('ldrrmfip_categories');
    }
};