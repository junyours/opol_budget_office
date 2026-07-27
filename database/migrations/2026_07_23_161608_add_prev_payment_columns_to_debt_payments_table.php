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
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->decimal('prev_payment_principal', 18, 2)->default(0)->after('budget_plan_id');
            $table->decimal('prev_payment_interest',  18, 2)->default(0)->after('prev_payment_principal');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
         Schema::table('debt_payments', function (Blueprint $table) {
            $table->dropColumn(['prev_payment_principal', 'prev_payment_interest']);
        });
    }
};
