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
        Schema::table('income_fund_amounts', function (Blueprint $table) {
            $table->decimal('obligation_amount', 18, 2)->nullable()->after('proposed_amount');
        });
    }

    public function down(): void
    {
        Schema::table('income_fund_amounts', function (Blueprint $table) {
            $table->dropColumn('obligation_amount');
        });
    }
};
