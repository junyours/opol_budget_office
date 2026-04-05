<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ldrrmfip_items', function (Blueprint $table) {
            // Past year actual (obligation column)
            $table->decimal('obligation_amount', 18, 2)->default(0)->after('co');

            // Current year estimate
            $table->decimal('sem1_amount',  18, 2)->default(0)->after('obligation_amount');
            $table->decimal('sem2_amount',  18, 2)->default(0)->after('sem1_amount');
            $table->decimal('total_amount', 18, 2)->default(0)->after('sem2_amount');
        });
    }

    public function down(): void
    {
        Schema::table('ldrrmfip_items', function (Blueprint $table) {
            $table->dropColumn(['obligation_amount', 'sem1_amount', 'sem2_amount', 'total_amount']);
        });
    }
};