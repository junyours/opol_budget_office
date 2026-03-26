<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('form6_templates', function (Blueprint $table) {
            $table->id('form6_template_id');

            // e.g. "1", "1.1", "2.1.1"
            $table->string('code', 20)->unique();

            // Display label shown in the form
            $table->string('label', 500);

            // null = top-level section, otherwise points to parent code
            $table->string('parent_code', 20)->nullable();

            // Display order within parent
            $table->unsignedSmallInteger('sort_order')->default(0);

            // Whether this row shows a peso sign (₱) prefix
            $table->boolean('show_peso_sign')->default(false);

            // Whether this is a section header (bold, no amount input)
            $table->boolean('is_section')->default(false);

            // Whether amount is computed (sum of children) vs manually entered
            $table->boolean('is_computed')->default(false);

            // Indentation level for display (0 = top, 1 = sub, 2 = sub-sub)
            $table->unsignedTinyInteger('level')->default(0);

            $table->timestamps();
        });

        // ── Seed the template rows ────────────────────────────────────────────
        $rows = [
            // Section 1
            ['code' => '1',     'label' => '1. Statutory and Contractual Obligations',               'parent_code' => null,  'sort_order' => 1,  'is_section' => true,  'is_computed' => false, 'show_peso_sign' => false, 'level' => 0],
            ['code' => 'PS',    'label' => 'Personnel Services (PS)',                                 'parent_code' => '1',   'sort_order' => 2,  'is_section' => false, 'is_computed' => true,  'show_peso_sign' => true,  'level' => 1],
            ['code' => '1.1',   'label' => 'Retirement Gratuity',                                    'parent_code' => 'PS',  'sort_order' => 3,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '1.2',   'label' => 'Terminal Leave Benefits',                                 'parent_code' => 'PS',  'sort_order' => 4,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '1.3',   'label' => 'Other Personnel Benefits (Monetization Leave Credits)',   'parent_code' => 'PS',  'sort_order' => 5,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '1.5',   'label' => 'Employment Compensation Insurance Premiums',              'parent_code' => 'PS',  'sort_order' => 6,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '1.6',   'label' => 'Philhealth Contributions',                               'parent_code' => 'PS',  'sort_order' => 7,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '1.7',   'label' => 'Pag-Ibig Contribution',                                  'parent_code' => 'PS',  'sort_order' => 8,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '1.8',   'label' => 'Retirement and Life Insurance Premiums',                 'parent_code' => 'PS',  'sort_order' => 9,  'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],

            // Section 2
            ['code' => '2',     'label' => '2. Budgetary Requirements',                              'parent_code' => null,  'sort_order' => 10, 'is_section' => true,  'is_computed' => false, 'show_peso_sign' => false, 'level' => 0],
            ['code' => '2.1',   'label' => '20% of NTA for Local Development Fund',                  'parent_code' => '2',   'sort_order' => 11, 'is_section' => false, 'is_computed' => true,  'show_peso_sign' => false, 'level' => 1],
            ['code' => '2.1.1', 'label' => 'Infrastructure Program',                                 'parent_code' => '2.1', 'sort_order' => 12, 'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '2.1.2', 'label' => 'Debt Services',                                          'parent_code' => '2.1', 'sort_order' => 13, 'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '2.2',   'label' => '5% Local Disaster Risk Reduction Management Fund',       'parent_code' => '2',   'sort_order' => 14, 'is_section' => false, 'is_computed' => true,  'show_peso_sign' => true,  'level' => 1],
            ['code' => '2.2.1', 'label' => '30% Quick Response Fund',                                'parent_code' => '2.2', 'sort_order' => 15, 'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '2.2.2', 'label' => '70% Pre-Disaster Activities, (JMC 2013-1, R.A. 10121)', 'parent_code' => '2.2', 'sort_order' => 16, 'is_section' => false, 'is_computed' => false, 'show_peso_sign' => false, 'level' => 2],
            ['code' => '2.3',   'label' => 'Financial Assistance to Barangays',                      'parent_code' => '2',   'sort_order' => 17, 'is_section' => false, 'is_computed' => false, 'show_peso_sign' => true,  'level' => 1],
        ];

        foreach ($rows as $row) {
            DB::table('form6_templates')->insert(array_merge($row, [
                'created_at' => now(),
                'updated_at' => now(),
            ]));
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('form6_templates');
    }
};
