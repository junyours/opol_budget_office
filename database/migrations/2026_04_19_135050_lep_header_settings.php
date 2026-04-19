<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Migration: create_lep_header_settings_table
 *
 * Stores the editable header fields for the LEP Appropriation Ordinance.
 * One row per budget_plan_id.
 *
 * File: database/migrations/YYYY_MM_DD_create_lep_header_settings_table.php
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lep_header_settings', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('budget_plan_id')->unique();
            $table->foreign('budget_plan_id')
                  ->references('budget_plan_id')
                  ->on('budget_plans')
                  ->onDelete('cascade');

            // Letterhead
            $table->string('province',       255)->default('Province of Misamis Oriental');
            $table->string('municipality',   255)->default('MUNICIPALITY OF OPOL');
            $table->string('office_name',    255)->default('OFFICE OF THE SANGGUNIANG BAYAN');
            $table->string('office_subtitle',255)->default('MUNICIPALITY OF OPOL');

            // Ordinance header
            $table->string('ordinance_session',  100)->default('2ND SPECIAL SESSION');
            $table->text  ('session_date_text')      ->nullable();
            $table->string('ordinance_number',   255)->nullable();
            $table->text  ('ordinance_title')        ->nullable();
            $table->string('introduced_by',      255)->nullable();

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lep_header_settings');
    }
};
