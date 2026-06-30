<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * Form7Controller
 *
 * Statement of Fund Allocation by Sector (LBP Form No. 7)
 *
 * Route:
 *   GET /api/form7?budget_plan_id=X
 *
 * Sections returned in order:
 *   PS   – Personal Services
 *   MOOE – Maintenance and Other Operating Expenses
 *   FE   – Financial Expenses  (obligations structure: creditor → principal + interest)
 *   CO   – Capital Outlay
 *   SPA  – Special Purpose Appropriations (AIP programs, by dept category)
 *
 * FE section shape differs from the others:
 *   {
 *     section_code: 'FE',
 *     obligations: [
 *       { creditor, purpose, principal, interest },
 *       ...
 *     ],
 *     rows: [],           ← always empty for FE
 *     subtotal: { ... }
 *   }
 *
 * All debt payments go under General Public Services (Finance Office).
 * Special Accounts departments are excluded from all sections.
 */
class Form7Controller extends BaseApiController
{
    private const GPS_FRAGMENT = 'general public service';
    private const SS_FRAGMENT  = 'social service';
    private const ES_FRAGMENT  = 'economic service';
    private const SA_FRAGMENT  = 'special account';

    private const PS_ABBR   = 'PS';
    private const MOOE_ABBR = 'MOOE';
    private const CO_ABBR   = 'CO';

    // ─────────────────────────────────────────────────────────────────────────

    // public function index(Request $request): JsonResponse
    // {
    //     $request->validate([
    //         'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
    //     ]);

    //     $budgetPlanId = $request->integer('budget_plan_id');

    //     // ── Category → column map ─────────────────────────────────────────────
    //     $categories        = DB::table('department_categories')->get();
    //     $categoryColumnMap = [];
    //     foreach ($categories as $cat) {
    //         $col = $this->categoryToColumn($cat->dept_category_name);
    //         if ($col) $categoryColumnMap[$cat->dept_category_id] = $col;
    //     }

    //     // ── dept_budget_plan_id → column (SA excluded) ────────────────────────
    //     $deptPlanCategoryMap = $this->buildDeptPlanCategoryMap($budgetPlanId, $categoryColumnMap);

    //     // ── PS / MOOE / CO from Form 2 ────────────────────────────────────────
    //     $form2Rows = $this->buildForm2Rows($budgetPlanId, $deptPlanCategoryMap);

    //     // // ── FE — debt obligations with separate principal + interest ──────────
    //     // $feObligations = $this->buildFeObligations($budgetPlanId);
    //     // $feSubtotal    = $this->sumObligations($feObligations);
    //     // ── FE — 20% MDF items + debt obligations + 5% LDRRMF (GF only) ───────
    //     $feRows     = $this->buildFeRows($budgetPlanId);
    //     $feSubtotal = $this->sumRows($feRows);

    //     // ── AIP (Special Purpose Appropriations) ──────────────────────────────
    //     $aipRows = $this->buildAipRows($budgetPlanId, $categoryColumnMap);

    //     // // ── Assemble ──────────────────────────────────────────────────────────
    //     // $sections = $this->assembleSections($form2Rows, $feObligations, $feSubtotal, $aipRows);
    //     // ── Assemble ──────────────────────────────────────────────────────────
    //     $sections = $this->assembleSections($form2Rows, $feRows, $feSubtotal, $aipRows);

    //     return $this->success([
    //         'budget_plan_id' => $budgetPlanId,
    //         'sections'       => $sections,
    //     ]);
    // }

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'filter'         => 'nullable|string|in:general-fund,sh,occ,pm',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');
        $filter       = $request->input('filter', 'general-fund');

        if ($filter !== 'general-fund') {
            $sections = $this->buildSpecialAccountSections($budgetPlanId, $filter);

            return $this->success([
                'budget_plan_id' => $budgetPlanId,
                'filter'         => $filter,
                'sections'       => $sections,
            ]);
        }

        // ── Category → column map ─────────────────────────────────────────────
        $categories        = DB::table('department_categories')->get();
        $categoryColumnMap = [];
        foreach ($categories as $cat) {
            $col = $this->categoryToColumn($cat->dept_category_name);
            if ($col) $categoryColumnMap[$cat->dept_category_id] = $col;
        }

        // ── dept_budget_plan_id → column (SA excluded) ────────────────────────
        $deptPlanCategoryMap = $this->buildDeptPlanCategoryMap($budgetPlanId, $categoryColumnMap);

        // ── PS / MOOE / CO from Form 2 ────────────────────────────────────────
        $form2Rows = $this->buildForm2Rows($budgetPlanId, $deptPlanCategoryMap);

        // ── FE — 20% MDF items + debt obligations + 5% LDRRMF (GF only) ───────
        $feRows     = $this->buildFeRows($budgetPlanId);
        $feSubtotal = $this->sumRows($feRows);

        // ── AIP (Special Purpose Appropriations) ──────────────────────────────
        $aipRows = $this->buildAipRows($budgetPlanId, $categoryColumnMap);

        // ── Assemble ──────────────────────────────────────────────────────────
        $sections = $this->assembleSections($form2Rows, $feRows, $feSubtotal, $aipRows);

        return $this->success([
            'budget_plan_id' => $budgetPlanId,
            'filter'         => 'general-fund',
            'sections'       => $sections,
        ]);
    }

    // ── Special Account sections (sh / occ / pm) ───────────────────────────────
    // Mirrors UnifiedReportController::buildOneForm7's SA branch exactly, so the
    // on-screen table and the PDF always agree. Built locally here (read-only,
    // does not touch UnifiedReportController) so this endpoint can be filtered.
    private function buildSpecialAccountSections(int $budgetPlanId, string $source): array
    {
        $abbrMap = ['sh' => 'SH', 'occ' => 'OCC', 'pm' => 'PM'];
        $abbr    = $abbrMap[$source] ?? strtoupper($source);

        $dept = DB::table('departments')
            ->whereRaw('UPPER(dept_abbreviation) = ?', [$abbr])
            ->first();

        if (!$dept) {
            $sum = $this->sumRows([]);
            return [
                'sections'    => [],
                'grand_total' => $sum,
            ];
        }

        // ── This dept's dept_budget_plan_id(s) for this plan ───────────────────
        $deptPlanIds = DB::table('department_budget_plans')
            ->where('budget_plan_id', $budgetPlanId)
            ->where('dept_id', $dept->dept_id)
            ->pluck('dept_budget_plan_id')
            ->toArray();

        // All SA amounts go under general_public_services — matches the PDF.
        $deptPlanCategoryMap = [];
        foreach ($deptPlanIds as $id) $deptPlanCategoryMap[$id] = 'general_public_services';

        // ── PS / MOOE / CO ───────────────────────────────────────────────────
        $form2Rows = $this->buildForm2Rows($budgetPlanId, $deptPlanCategoryMap);
        $psRows    = $form2Rows['PS']   ?? [];
        $mooeRows  = $form2Rows['MOOE'] ?? [];
        $coRows    = $form2Rows['CO']   ?? [];

        // ── FE — SA only has the 5% calamity QRF/Preparedness split ───────────
        $feRows = [];
        $calamity5 = $this->computeCalamity5Fund($budgetPlanId, $source);
        if ($calamity5 > 0) {
            $qrf30 = round($calamity5 * 0.30, 2);
            $pda70 = round($calamity5 * 0.70, 2);
            $feRows[] = $this->makeFeRow('5% Calamity Fund: Quick Response Fund (30% QRF)', '9000-2-01-001', $qrf30);
            $feRows[] = $this->makeFeRow('70% Pre-Disaster Preparedness Fund', '9000-2-02-001', $pda70);
        }
        $feSubtotal = $this->sumRows($feRows);

        // ── SPA (AIP programs) — scoped to THIS dept's plan ids only ──────────
        // NOTE: buildAipRows() takes a category_id→column map and internally
        // excludes Special Accounts (categoryToColumn returns null for them),
        // so it can never be reused for SA. Query directly by dept plan id instead.
        $aipRows = $this->buildAipRowsForDeptPlans($deptPlanIds);

        $sections = [
            [
                'section_code'  => 'PS',
                'section_label' => 'Personal Services, (P.S.)',
                'rows'          => $psRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($psRows),
            ],
            [
                'section_code'  => 'MOOE',
                'section_label' => 'Maint. & Othr Oprtng Expns, (MOOE)',
                'rows'          => $mooeRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($mooeRows),
            ],
            [
                'section_code'  => 'FE',
                'section_label' => 'Financial Expenses (F.E.)',
                'rows'          => $feRows,
                'obligations'   => [],
                'subtotal'      => $feSubtotal,
            ],
            [
                'section_code'  => 'CO',
                'section_label' => 'Capital Outlay (C.O.)',
                'rows'          => $coRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($coRows),
            ],
            [
                'section_code'  => 'SPA',
                'section_label' => 'Special Prps. Apprprtns.',
                'rows'          => $aipRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($aipRows),
            ],
        ];

        $grandTotal = ['general_public_services'=>0.0,'social_services'=>0.0,'economic_services'=>0.0,'other_services'=>0.0,'total'=>0.0];
        foreach ($sections as $s) {
            foreach (array_keys($grandTotal) as $col) {
                $grandTotal[$col] += $s['subtotal'][$col] ?? 0.0;
            }
        }

        return [
            'sections'    => $sections,
            'grand_total' => $grandTotal,
        ];
    }

    // ── Category resolver ─────────────────────────────────────────────────────

    private function categoryToColumn(string $name): ?string
    {
        $lower = strtolower($name);
        if (str_contains($lower, self::GPS_FRAGMENT)) return 'general_public_services';
        if (str_contains($lower, self::SS_FRAGMENT))  return 'social_services';
        if (str_contains($lower, self::ES_FRAGMENT))  return 'economic_services';
        if (str_contains($lower, self::SA_FRAGMENT))  return null;
        return 'other_services';
    }

    // ── dept plan → column map ────────────────────────────────────────────────

    private function buildDeptPlanCategoryMap(int $budgetPlanId, array $categoryColumnMap): array
    {
        $rows = DB::table('department_budget_plans as dbp')
            ->join('departments as d',           'd.dept_id',           '=', 'dbp.dept_id')
            ->join('department_categories as dc', 'dc.dept_category_id', '=', 'd.dept_category_id')
            ->where('dbp.budget_plan_id', $budgetPlanId)
            ->select('dbp.dept_budget_plan_id', 'd.dept_category_id')
            ->get();

        $map = [];
        foreach ($rows as $row) {
            $col = $categoryColumnMap[$row->dept_category_id] ?? null;
            if ($col) $map[$row->dept_budget_plan_id] = $col;
        }
        return $map;
    }

    // ── Form 2 rows (PS / MOOE / CO) ─────────────────────────────────────────

    private function buildForm2Rows(int $budgetPlanId, array $deptPlanCategoryMap): array
    {
        $validDeptPlanIds = array_keys($deptPlanCategoryMap);
        if (empty($validDeptPlanIds)) return [];

        $items = DB::table('dept_bp_form2_items as f2')
            ->join('expense_class_items as eci',   'eci.expense_class_item_id', '=', 'f2.expense_item_id')
            ->join('expense_classifications as ec', 'ec.expense_class_id',       '=', 'eci.expense_class_id')
            ->whereIn('f2.dept_budget_plan_id', $validDeptPlanIds)
            ->where('f2.total_amount', '>', 0)
            ->select(
                'f2.dept_budget_plan_id',
                'eci.expense_class_item_id',
                'eci.expense_class_item_name',
                'eci.expense_class_item_acc_code',
                'ec.abbreviation as class_abbr',
                'ec.expense_class_name',
                'f2.total_amount',
            )
            ->get();

        $grouped = [];
        foreach ($items as $item) {
            $abbr = strtoupper($item->class_abbr ?? '');
            if (!in_array($abbr, [self::PS_ABBR, self::MOOE_ABBR, self::CO_ABBR])) continue;

            $col    = $deptPlanCategoryMap[$item->dept_budget_plan_id] ?? null;
            if (!$col) continue;

            $itemId = $item->expense_class_item_id;

            if (!isset($grouped[$abbr][$itemId])) {
                $grouped[$abbr][$itemId] = [
                    'item_name'               => $item->expense_class_item_name,
                    'account_code'            => $item->expense_class_item_acc_code ?? '',
                    'general_public_services' => 0.0,
                    'social_services'         => 0.0,
                    'economic_services'       => 0.0,
                    'other_services'          => 0.0,
                ];
            }
            $grouped[$abbr][$itemId][$col] += (float) $item->total_amount;
        }

        $result = [];
        foreach ($grouped as $abbr => $items) {
            $result[$abbr] = [];
            foreach ($items as $row) {
                $row['total'] = $row['general_public_services']
                              + $row['social_services']
                              + $row['economic_services']
                              + $row['other_services'];
                $result[$abbr][] = $row;
            }
        }
        return $result;
    }

    // ── FE obligations (creditor → principal + interest) ──────────────────────

    // /**
    //  * Returns an array of obligations, each with:
    //  *   creditor, purpose, principal, interest
    //  *
    //  * All amounts go under General Public Services.
    //  * Only obligations with at least one payment > 0 for this plan are included.
    //  */
    // private function buildFeObligations(int $budgetPlanId): array
    // {
    //     $payments = DB::table('debt_payments as dp')
    //         ->join('debt_obligations as dob', 'dob.obligation_id', '=', 'dp.obligation_id')
    //         ->where('dp.budget_plan_id', $budgetPlanId)
    //         ->where(function ($q) {
    //             $q->where('dp.principal_due', '>', 0)
    //               ->orWhere('dp.interest_due', '>', 0);
    //         })
    //         ->select(
    //             'dob.creditor',
    //             'dob.purpose',
    //             DB::raw('COALESCE(dp.principal_due, 0) as principal'),
    //             DB::raw('COALESCE(dp.interest_due,  0) as interest'),
    //         )
    //         ->orderBy('dob.sort_order')
    //         ->orderBy('dob.obligation_id')
    //         ->get();

    //     $obligations = [];
    //     foreach ($payments as $p) {
    //         $obligations[] = [
    //             'creditor'  => $p->creditor,
    //             'purpose'   => $p->purpose ?? '',
    //             'principal' => (float) $p->principal,
    //             'interest'  => (float) $p->interest,
    //         ];
    //     }
    //     return $obligations;
    // }

    // /**
    //  * Sum all obligations into a SectionSubtotal shape.
    //  * All amounts go under general_public_services.
    //  */
    // private function sumObligations(array $obligations): array
    // {
    //     $total = 0.0;
    //     foreach ($obligations as $ob) {
    //         $total += $ob['principal'] + $ob['interest'];
    //     }
    //     return [
    //         'general_public_services' => $total,
    //         'social_services'         => 0.0,
    //         'economic_services'       => 0.0,
    //         'other_services'          => 0.0,
    //         'total'                   => $total,
    //     ];
    // }

    /**
     * Build FE rows: 20% MDF non-debt items (flat, no category headers),
     * debt obligations (principal/interest per creditor), and the 5% LDRRMF
     * 30%-QRF / 70%-Preparedness lines. All amounts go under
     * general_public_services since FE is always Finance Office territory.
     */
    private function buildFeRows(int $budgetPlanId): array
    {
        $rows = [];

        // ── 1. 20% MDF non-debt items (flat, no category headers) ─────────────
        $mdfItems = DB::table('mdf_snapshots as ms')
            ->join('mdf_items as mi', 'mi.item_id', '=', 'ms.item_id')
            ->where('ms.budget_plan_id', $budgetPlanId)
            ->whereNull('mi.obligation_id')
            ->where('mi.is_active', true)
            ->where('ms.total_amount', '>', 0)
            ->select('mi.name', 'mi.account_code', 'ms.total_amount')
            ->orderBy('mi.sort_order')
            ->get();

        foreach ($mdfItems as $item) {
            $rows[] = $this->makeFeRow($item->name, $item->account_code ?? '', (float) $item->total_amount);
        }

        // ── 2. Debt obligations — principal + interest per creditor ───────────
        $payments = DB::table('debt_payments as dp')
            ->join('debt_obligations as dob', 'dob.obligation_id', '=', 'dp.obligation_id')
            ->where('dp.budget_plan_id', $budgetPlanId)
            ->where(function ($q) {
                $q->where('dp.principal_due', '>', 0)
                  ->orWhere('dp.interest_due', '>', 0);
            })
            ->select(
                'dob.creditor',
                'dob.purpose',
                DB::raw('COALESCE(dp.principal_due, 0) as principal'),
                DB::raw('COALESCE(dp.interest_due,  0) as interest'),
            )
            ->orderBy('dob.sort_order')
            ->orderBy('dob.obligation_id')
            ->get();

        // foreach ($payments as $p) {
        //     $label = $p->creditor . (!empty($p->purpose) ? ' (' . $p->purpose . ')' : '');
        //     if ((float) $p->principal > 0) {
        //         $rows[] = $this->makeFeRow($label, '', (float) $p->principal, 'Principal');
        //     }
        //     if ((float) $p->interest > 0) {
        //         $rows[] = $this->makeFeRow($label, '', (float) $p->interest, 'Interest');
        //     }
        // }

        foreach ($payments as $p) {
            $label = $p->creditor . (!empty($p->purpose) ? ' (' . $p->purpose . ')' : '');
            if ((float) $p->principal > 0) {
                $rows[] = $this->makeFeRow($label, '', (float) $p->principal, 'Principal');
            }
            if ((float) $p->interest > 0) {
                $rows[] = $this->makeFeRow('Interest', '', (float) $p->interest);
            }
        }

        // ── 3. 5% LDRRMF — 30% QRF + 70% Pre-Disaster Preparedness ────────────
        $calamity5 = $this->computeCalamity5Fund($budgetPlanId, 'general-fund');
        $prop70    = (float) DB::table('ldrrmfip_items')
            ->where('budget_plan_id', $budgetPlanId)
            ->where('source', 'general-fund')
            ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')
            ->value('grand');
        $qrf30 = round($calamity5 * 0.30, 2);
        $pda70 = round($calamity5 * 0.70, 2);

        if ($calamity5 > 0) {
            $rows[] = $this->makeFeRow('5% LDRRMF: Quick Response Fund (30% QRF)', '5-02', $qrf30);
            $rows[] = $this->makeFeRow('70% Pre-Disaster Preparedness Fund', '5-02', $pda70);
        }

        return $rows;
    }

    private function makeFeRow(string $name, string $accountCode, float $amount, ?string $suffix = null): array
    {
        $itemName = $suffix ? "{$name} - {$suffix}" : $name;
        return [
            'item_name'               => $itemName,
            'account_code'            => $accountCode,
            'general_public_services' => $amount,
            'social_services'         => 0.0,
            'economic_services'       => 0.0,
            'other_services'          => 0.0,
            'total'                   => $amount,
        ];
    }

    /**
     * Compute 5% of Total Available Resources for Appropriations,
     * excluding the Non-Income Receipts subtree. Mirrors the same
     * calculation used by LdrrmfipController / UnifiedReportController.
     */
    private function computeCalamity5Fund(int $planId, string $source): float
    {
        $nonIncomeParent = DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

        if (!$nonIncomeParent && $source === 'general-fund') {
            $nonIncomeParent = DB::table('income_fund_objects')
                ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
                ->first(['id']);
        }

        $excludeIds = [];
        if ($nonIncomeParent) {
            $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
            $excludeIds[] = $nonIncomeParent->id;
        }

        $query = DB::table('income_fund_amounts')
            ->where('budget_plan_id', $planId)
            ->where('source', $source);

        if (!empty($excludeIds)) {
            $query->whereNotIn('income_fund_object_id', $excludeIds);
        }

        return round((float) $query->sum('proposed_amount') * 0.05, 2);
    }

    private function collectDescendantIds(int $parentId): array
    {
        $ids      = [];
        $children = DB::table('income_fund_objects')->where('parent_id', $parentId)->pluck('id');
        foreach ($children as $childId) {
            $ids[] = $childId;
            array_push($ids, ...$this->collectDescendantIds($childId));
        }
        return $ids;
    }

    // ── AIP (Special Purpose Appropriations) ──────────────────────────────────

    private function buildAipRows(int $budgetPlanId, array $categoryColumnMap): array
    {
        $deptPlans = DB::table('department_budget_plans as dbp')
            ->join('departments as d',           'd.dept_id',           '=', 'dbp.dept_id')
            ->join('department_categories as dc', 'dc.dept_category_id', '=', 'd.dept_category_id')
            ->where('dbp.budget_plan_id', $budgetPlanId)
            ->select('dbp.dept_budget_plan_id', 'd.dept_category_id')
            ->get();

        $deptPlanColMap = [];
        foreach ($deptPlans as $dp) {
            $col = $categoryColumnMap[$dp->dept_category_id] ?? null;
            if ($col) $deptPlanColMap[$dp->dept_budget_plan_id] = $col;
        }

        if (empty($deptPlanColMap)) return [];

        $form4Items = DB::table('dept_bp_form4_items as f4')
            ->join('aip_programs as ap', 'ap.aip_program_id', '=', 'f4.aip_program_id')
            ->whereIn('f4.dept_budget_plan_id', array_keys($deptPlanColMap))
            ->where('f4.total_amount', '>', 0)
            ->select(
                'f4.dept_budget_plan_id',
                'ap.aip_program_id',
                'ap.aip_reference_code',
                'ap.program_description',
                'f4.total_amount',
            )
            ->get();

        $grouped = [];
        foreach ($form4Items as $item) {
            $col    = $deptPlanColMap[$item->dept_budget_plan_id] ?? null;
            if (!$col) continue;

            $progId = $item->aip_program_id;
            if (!isset($grouped[$progId])) {
                $grouped[$progId] = [
                    'item_name'               => $item->program_description,
                    'account_code'            => $item->aip_reference_code ?? '',
                    'general_public_services' => 0.0,
                    'social_services'         => 0.0,
                    'economic_services'       => 0.0,
                    'other_services'          => 0.0,
                ];
            }
            $grouped[$progId][$col] += (float) $item->total_amount;
        }

        $rows = [];
        foreach ($grouped as $row) {
            $row['total'] = $row['general_public_services']
                          + $row['social_services']
                          + $row['economic_services']
                          + $row['other_services'];
            $rows[] = $row;
        }
        return $rows;
    }

   // ── AIP rows scoped directly to a set of dept_budget_plan_id values ────────
    // Used for Special Accounts, where buildAipRows()'s category-column-map
    // approach structurally excludes SA categories.
    private function buildAipRowsForDeptPlans(array $deptPlanIds): array
    {
        if (empty($deptPlanIds)) return [];

        $items = DB::table('dept_bp_form4_items as f4')
            ->join('aip_programs as ap', 'ap.aip_program_id', '=', 'f4.aip_program_id')
            ->whereIn('f4.dept_budget_plan_id', $deptPlanIds)
            ->where('f4.total_amount', '>', 0)
            ->select(
                'ap.aip_program_id',
                'ap.aip_reference_code',
                'ap.program_description',
                'f4.total_amount',
            )
            ->get();

        $grouped = [];
        foreach ($items as $item) {
            $progId = $item->aip_program_id;
            if (!isset($grouped[$progId])) {
                $grouped[$progId] = [
                    'item_name'               => $item->program_description,
                    'account_code'            => $item->aip_reference_code ?? '',
                    'general_public_services' => 0.0,
                    'social_services'         => 0.0,
                    'economic_services'       => 0.0,
                    'other_services'          => 0.0,
                ];
            }
            // SA: all amounts under general_public_services, matching the rest of the SA form.
            $grouped[$progId]['general_public_services'] += (float) $item->total_amount;
        }

        $rows = [];
        foreach ($grouped as $row) {
            $row['total'] = $row['general_public_services']
                          + $row['social_services']
                          + $row['economic_services']
                          + $row['other_services'];
            $rows[] = $row;
        }
        return $rows;
    }

    // ── Assemble sections ─────────────────────────────────────────────────────

    // private function assembleSections(
    //     array $form2Rows,
    //     array $feObligations,
    //     array $feSubtotal,
    //     array $aipRows
    // ): array {
    private function assembleSections(
        array $form2Rows,
        array $feRows,
        array $feSubtotal,
        array $aipRows
    ): array {
        $psRows   = $form2Rows[self::PS_ABBR]   ?? [];
        $mooeRows = $form2Rows[self::MOOE_ABBR] ?? [];
        $coRows   = $form2Rows[self::CO_ABBR]   ?? [];

        $sections = [
            [
                'section_code'  => 'PS',
                'section_label' => 'Personal Services, (P.S.)',
                'rows'          => $psRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($psRows),
            ],
            [
                'section_code'  => 'MOOE',
                'section_label' => 'Maint. & Othr Oprtng Expns, (MOOE)',
                'rows'          => $mooeRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($mooeRows),
            ],
            // [
            //     'section_code'  => 'FE',
            //     'section_label' => 'Financial Expenses (F.E.)',
            //     'rows'          => [],           // FE uses obligations, not rows
            //     'obligations'   => $feObligations,
            //     'subtotal'      => $feSubtotal,
            // ],

            [
                'section_code'  => 'FE',
                'section_label' => 'Financial Expenses (F.E.)',
                'rows'          => $feRows,
                'obligations'   => [],
                'subtotal'      => $feSubtotal,
            ],

            [
                'section_code'  => 'CO',
                'section_label' => 'Capital Outlay (C.O.)',
                'rows'          => $coRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($coRows),
            ],
            [
                'section_code'  => 'SPA',
                'section_label' => 'Special Prps. Apprprtns.',
                'rows'          => $aipRows,
                'obligations'   => [],
                'subtotal'      => $this->sumRows($aipRows),
            ],
        ];

        // Grand total across all sections
        $grandTotal = [
            'general_public_services' => 0.0,
            'social_services'         => 0.0,
            'economic_services'       => 0.0,
            'other_services'          => 0.0,
            'total'                   => 0.0,
        ];
        foreach ($sections as $s) {
            foreach (array_keys($grandTotal) as $col) {
                $grandTotal[$col] += $s['subtotal'][$col];
            }
        }

        return [
            'sections'    => $sections,
            'grand_total' => $grandTotal,
        ];
    }

    // ── Sum helper for standard rows ──────────────────────────────────────────

    private function sumRows(array $rows): array
    {
        $sum = [
            'general_public_services' => 0.0,
            'social_services'         => 0.0,
            'economic_services'       => 0.0,
            'other_services'          => 0.0,
            'total'                   => 0.0,
        ];
        foreach ($rows as $row) {
            foreach (array_keys($sum) as $col) {
                $sum[$col] += $row[$col] ?? 0.0;
            }
        }
        return $sum;
    }
}
