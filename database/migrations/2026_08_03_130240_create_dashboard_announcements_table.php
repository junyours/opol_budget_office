<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dashboard_announcements', function (Blueprint $table) {
            $table->id();
            $table->enum('type', ['announcement', 'phase', 'schedule', 'department'])->default('announcement');
            $table->string('title');
            $table->text('description')->nullable();
            $table->unsignedBigInteger('dept_id')->nullable();
            $table->string('accent_color', 20)->default('blue');
            $table->string('icon', 40)->nullable();
            $table->date('event_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('dept_id')->references('dept_id')->on('departments')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('dashboard_announcements');
    }
};
