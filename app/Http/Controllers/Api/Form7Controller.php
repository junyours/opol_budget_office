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

    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        $budgetPlanId = $request->integer('budget_plan_id');

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

        // ── FE — debt obligations with separate principal + interest ──────────
        $feObligations = $this->buildFeObligations($budgetPlanId);
        $feSubtotal    = $this->sumObligations($feObligations);

        // ── AIP (Special Purpose Appropriations) ──────────────────────────────
        $aipRows = $this->buildAipRows($budgetPlanId, $categoryColumnMap);

        // ── Assemble ──────────────────────────────────────────────────────────
        $sections = $this->assembleSections($form2Rows, $feObligations, $feSubtotal, $aipRows);

        return $this->success([
            'budget_plan_id' => $budgetPlanId,
            'sections'       => $sections,
        ]);
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

    /**
     * Returns an array of obligations, each with:
     *   creditor, purpose, principal, interest
     *
     * All amounts go under General Public Services.
     * Only obligations with at least one payment > 0 for this plan are included.
     */
    private function buildFeObligations(int $budgetPlanId): array
    {
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

        $obligations = [];
        foreach ($payments as $p) {
            $obligations[] = [
                'creditor'  => $p->creditor,
                'purpose'   => $p->purpose ?? '',
                'principal' => (float) $p->principal,
                'interest'  => (float) $p->interest,
            ];
        }
        return $obligations;
    }

    /**
     * Sum all obligations into a SectionSubtotal shape.
     * All amounts go under general_public_services.
     */
    private function sumObligations(array $obligations): array
    {
        $total = 0.0;
        foreach ($obligations as $ob) {
            $total += $ob['principal'] + $ob['interest'];
        }
        return [
            'general_public_services' => $total,
            'social_services'         => 0.0,
            'economic_services'       => 0.0,
            'other_services'          => 0.0,
            'total'                   => $total,
        ];
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

    // ── Assemble sections ─────────────────────────────────────────────────────

    private function assembleSections(
        array $form2Rows,
        array $feObligations,
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
            [
                'section_code'  => 'FE',
                'section_label' => 'Financial Expenses (F.E.)',
                'rows'          => [],           // FE uses obligations, not rows
                'obligations'   => $feObligations,
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