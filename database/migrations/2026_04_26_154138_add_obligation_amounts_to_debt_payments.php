<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add past-year obligation columns to debt_payments.
     *
     * These store the "Past Year Obligation" amounts that were previously
     * auto-derived from the MDF snapshot's obligation_amount field.
     * Now they are stored per-payment row so they can be edited per budget plan.
     *
     *   obligation_principal_amount  → past yr principal obligation (col 3a)
     *   obligation_interest_amount   → past yr interest obligation  (col 3b)
     */
    public function up(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->decimal('obligation_principal_amount', 18, 2)->default(0)->after('interest_due');
            $table->decimal('obligation_interest_amount',  18, 2)->default(0)->after('obligation_principal_amount');
        });
    }

    public function down(): void
    {
        Schema::table('debt_payments', function (Blueprint $table) {
            $table->dropColumn(['obligation_principal_amount', 'obligation_interest_amount']);
        });
    }
};
