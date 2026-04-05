<?php
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void {
        Schema::table('dept_bp_form2_items', function (Blueprint $table) {
            $table->decimal('obligation_amount', 15, 2)->default(0)->after('total_amount');
        });
        Schema::table('dept_bp_form4_items', function (Blueprint $table) {
            $table->decimal('obligation_amount', 15, 2)->default(0)->after('total_amount');
        });
    }

    public function down(): void {
        Schema::table('dept_bp_form2_items', function (Blueprint $table) {
            $table->dropColumn('obligation_amount');
        });
        Schema::table('dept_bp_form4_items', function (Blueprint $table) {
            $table->dropColumn('obligation_amount');
        });
    }
};