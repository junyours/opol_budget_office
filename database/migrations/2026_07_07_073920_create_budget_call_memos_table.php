<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('budget_call_memos', function (Blueprint $table) {
            $table->id('budget_call_memos_id');
            $table->unsignedSmallInteger('year')->index();
            $table->string('title')->nullable();
            $table->string('original_filename');
            $table->string('file_path');
            $table->unsignedInteger('file_size')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->unsignedBigInteger('uploaded_by')->nullable();
            $table->timestamps();

            $table->foreign('uploaded_by')->references('user_id')->on('users')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('budget_call_memos_id');
    }
};
