<?php
// database/migrations/2025_06_01_000001_add_sem2_and_obligation_to_mdf_snapshots.php
//
// Adds two new columns to mdf_snapshots:
//
//   sem2_actual      — 2nd semester actual (editable on the current year plan).
//                      Previously was always derived as total_amount - sem1_actual,
//                      but now stored so it can be independently edited.
//
//   obligation_amount — Past year obligation amount (editable on the past year plan,
//                       i.e. active_year − 2). Mirrors income_fund_amounts.obligation_amount.
//
// Column mapping after this migration:
//   col (3) past actual      → pastPlan    snapshot.obligation_amount  [EDITABLE]
//   col (4) sem1 actual      → currentPlan snapshot.sem1_actual        [EDITABLE]
//   col (5) sem2             → currentPlan snapshot.sem2_actual        [stored, auto-computed on sem1 save]
//   col (6) total            → currentPlan snapshot.total_amount       [READ-ONLY]
//   col (7) proposed         → activePlan  snapshot.total_amount       [EDITABLE]

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('mdf_snapshots', function (Blueprint $table) {
            // Stored sem2 — set automatically when sem1 is saved (total_amount - sem1_actual)
            $table->decimal('sem2_actual', 18, 2)->default(0)->after('sem1_actual');

            // Past year obligation amount — saved into the past plan's snapshot row
            $table->decimal('obligation_amount', 18, 2)->nullable()->after('sem2_actual');
        });
    }

    public function down(): void
    {
        Schema::table('mdf_snapshots', function (Blueprint $table) {
            $table->dropColumn(['sem2_actual', 'obligation_amount']);
        });
    }
};
