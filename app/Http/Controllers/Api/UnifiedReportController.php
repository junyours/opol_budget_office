<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\PlantillaPosition;
use App\Models\PlantillaAssignment;
use App\Models\BudgetPlanForm2Item;
use App\Models\BudgetPlanForm3Assignment;
use App\Models\DebtObligation;
use App\Models\DebtPayment;
use App\Models\Department;
use App\Models\DepartmentBudgetPlan;
use App\Models\DeptBpForm4Item;
use App\Models\ExpenseClassItem;
use App\Models\ExpenseClassification;
use App\Models\IncomeFundAmount;
use App\Models\IncomeFundObject;
use App\Models\MdfItem;
use App\Models\MdfSnapshot;
use App\Models\SalaryGradeStep;
use App\Models\SalaryStandardVersion;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use ZipArchive;
use App\Models\Form6Template;
use App\Models\Form6Item;
use App\Models\LdrrmfipItem;
use App\Models\MdfCategory;
use App\Models\DepartmentCategory;
/**
 * UnifiedReportController
 * ═══════════════════════════════════════════════════════════════════════════
 * Single controller for all LBP budget report forms (1–5).
 * All forms share the unified Blade: reports/budget-forms-unified.blade.php
 *
 * Endpoints:
 *   POST /api/reports/unified/form1        — LBP Form 1 (B.E.S.F.)
 *   POST /api/reports/unified/dept         — LBP Forms 2, 3, 4 (dept)
 *   POST /api/reports/unified/form5        — LBP Form 5 (landscape)
 *   POST /api/reports/unified/generate-all — All forms → ZIP
 *   GET  /api/reports/unified/sources      — Filter options for Form 1
 */
class UnifiedReportController extends Controller
{
    // ═══════════════════════════════════════════════════════
    // GET /api/reports/unified/sources
    // ═══════════════════════════════════════════════════════
    public function sources(): \Illuminate\Http\JsonResponse
    {
        $specialDepts = Department::with('category')
            ->get()
            ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts');

        $options = [
            ['value' => 'all',          'label' => 'All (General Fund + Special Accounts)'],
            ['value' => 'general-fund', 'label' => 'General Fund only'],
        ];
        foreach ($specialDepts as $dept) {
            $options[] = [
                'value' => $this->sourceKeyForDept($dept),
                'label' => $dept->dept_name . ' (' . $dept->dept_abbreviation . ')',
            ];
        }
        return response()->json(['data' => $options]);
    }

    // ═══════════════════════════════════════════════════════
    // POST /api/reports/unified/form1
    // ═══════════════════════════════════════════════════════
    public function form1(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'filter'         => 'nullable|string',
        ]);
        try {
            $this->clearViewCache();
            $filter = $request->input('filter', 'all');
            $data   = $this->buildForm1Data((int) $request->budget_plan_id, $filter);
            $html   = $this->renderHtml('form1', $data);
            $pdf    = $this->makePdf($html, 'portrait');
            $plan   = $data['budget_plan'];
            $suffix = $filter === 'all' ? '' : ('_' . strtoupper($filter));
            return $this->pdfResponse($pdf, "LBP_Form1_FY{$plan->year}{$suffix}.pdf", $request->boolean('download'));
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // POST /api/reports/unified/dept
    // ═══════════════════════════════════════════════════════
    public function dept(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'department'     => 'required|string',
            'forms'          => 'required|array|min:1',
            'forms.*'        => 'in:form2,form3,form4',
        ]);
        try {
            $this->clearViewCache();
            $reportData = $this->buildDeptData($request);
            $forms      = $request->forms;
            $html       = $this->renderHtml('dept', null, $forms, $reportData);
            $pdf        = $this->makePdf($html, 'portrait');
            $plan       = $reportData['budget_plan'];
            $deptParam  = $request->department;
            $filename   = 'LBP_Forms_FY' . $plan->year
                . '_' . ($deptParam === 'all' ? 'AllDepts' : 'Dept' . $deptParam)
                . '_' . implode('-', array_map('strtoupper', $forms))
                . '.pdf';
            return $this->pdfResponse($pdf, $filename, $request->boolean('download'));
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // POST /api/reports/unified/form5
    // ═══════════════════════════════════════════════════════
    public function form5(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);
        try {
            $this->clearViewCache();
            $data = $this->buildForm5Data((int) $request->budget_plan_id);
            $html = $this->renderHtml('form5', $data);
            $pdf  = $this->makePdf($html, 'landscape');
            return $this->pdfResponse($pdf, "LBP_Form5_FY{$data['year']}.pdf", $request->boolean('download'));
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ═══════════════════════════════════════════════════════
// POST /api/reports/unified/summary
// ═══════════════════════════════════════════════════════
public function summary(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
    ]);
    try {
        $this->clearViewCache();
        $data = $this->buildSummaryData((int) $request->budget_plan_id);
        $html = $this->renderHtml('summary', $data);
        $pdf  = $this->makePdf($html, 'portrait');
        return $this->pdfResponse(
            $pdf,
            "LBP_SummaryOfExpenditures_FY{$data['year']}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}
private function buildSummaryData(int $budgetPlanId): array
{
    $plan = BudgetPlan::findOrFail($budgetPlanId);
    $year = (int) $plan->year;

    // ── Departments & categories ──────────────────────────────────────────
    // $departments = \App\Models\Department::with('category')
    //     ->orderBy('dept_name')
    //     ->get();
    $departments = Department::with('category')
    ->orderBy('dept_id')  // ← change from orderBy('dept_name')
    ->get();
    $categories  = DepartmentCategory::all()->keyBy('dept_category_id');

    $SPECIAL_ACCOUNTS_CATEGORY_ID = 4;
    $gfDepts   = $departments->filter(fn ($d) => $d->dept_category_id !== $SPECIAL_ACCOUNTS_CATEGORY_ID);
    $gfDeptIds = $gfDepts->pluck('dept_id')->toArray();

    // ── Expense classifications ───────────────────────────────────────────
    $rawClasses    = ExpenseClassification::all();
    $rawClassItems = ExpenseClassItem::all();

    $classMap = $rawClasses->keyBy('expense_class_id')
        ->map(fn ($c) => ['expense_class_name' => $c->expense_class_name, 'abbreviation' => $c->abbreviation]);

    $itemToClassMap = $rawClassItems->pluck('expense_class_id', 'expense_class_item_id')->toArray();

    $getBucket = function (int $classItemId) use ($classMap, $itemToClassMap): string {
        $classId = $itemToClassMap[$classItemId] ?? null;
        if ($classId === null) return 'mooe';
        $cls   = $classMap->get($classId);
        if (!$cls) return 'mooe';
        $abbr  = strtoupper(trim($cls['abbreviation'] ?? ''));
        if ($abbr === 'PS')                     return 'ps';
        if ($abbr === 'CO')                     return 'co';
        if ($abbr === 'MOOE' || $abbr === 'FE') return 'mooe';
        $name = strtolower($cls['expense_class_name']);
        if (str_contains($name, 'personal')) return 'ps';
        if (str_contains($name, 'capital'))  return 'co';
        return 'mooe';
    };

    // ── Dept budget plans ─────────────────────────────────────────────────
    $deptPlans = DepartmentBudgetPlan::with([
            'items',
            'items.expenseItem',
            'items.expenseItem.classification',
        ])
        ->where('budget_plan_id', $budgetPlanId)
        ->whereIn('dept_id', $gfDeptIds)
        ->get();

    // PS / MOOE / CO per dept
    $deptAmounts = [];
    foreach ($deptPlans as $dp) {
        $ps = 0; $mooe = 0; $co = 0;
        foreach ($dp->items as $item) {
            $amt = (float) $item->total_amount;
            if ($amt == 0) continue;
            $bucket = $getBucket($item->expense_item_id);
            if ($bucket === 'ps')      $ps   += $amt;
            elseif ($bucket === 'co')  $co   += $amt;
            else                       $mooe += $amt;
        }
        $existing = $deptAmounts[$dp->dept_id] ?? ['ps' => 0, 'mooe' => 0, 'co' => 0];
        $deptAmounts[$dp->dept_id] = [
            'ps'   => $existing['ps']   + $ps,
            'mooe' => $existing['mooe'] + $mooe,
            'co'   => $existing['co']   + $co,
        ];
    }

    // SPA per dept (from AIP programs)
    $deptBudgetPlanIds = $deptPlans->pluck('dept_budget_plan_id')->toArray();
    $aipItems = DeptBpForm4Item::whereIn('dept_budget_plan_id', $deptBudgetPlanIds)->get();
    $planToDept = $deptPlans->pluck('dept_id', 'dept_budget_plan_id')->toArray();
    $deptSpa = [];
    foreach ($aipItems as $ai) {
        $deptId = $planToDept[$ai->dept_budget_plan_id] ?? null;
        if ($deptId === null) continue;
        $deptSpa[$deptId] = ($deptSpa[$deptId] ?? 0) + (float) $ai->total_amount;
    }

    // ── Build category blocks — include ALL categories and ALL depts ──────
    $catGroups = [];
    foreach ($gfDepts as $d) {
        $catGroups[$d->dept_category_id][] = $d;
    }

    // Sort categories by their ID to maintain consistent order
    ksort($catGroups);

    $categoryBlocks = [];
    foreach ($catGroups as $catId => $depts) {
        $rows = [];
        foreach ($depts as $d) {
            // Use zeros if no budget plan data exists — department still appears
            $a   = $deptAmounts[$d->dept_id] ?? ['ps' => 0, 'mooe' => 0, 'co' => 0];
            $spa = $deptSpa[$d->dept_id] ?? 0;
            $rows[] = [
                'dept_id'   => $d->dept_id,
                'dept_name' => $d->dept_name,
                'ps'        => $a['ps'],
                'mooe'      => $a['mooe'],
                'co'        => $a['co'],
                'spa'       => $spa,
                'total'     => $a['ps'] + $a['mooe'] + $a['co'] + $spa,
            ];
        }

        // ↓ NO filter — keep all rows even if total is zero
        $totPS   = array_sum(array_column($rows, 'ps'));
        $totMOOE = array_sum(array_column($rows, 'mooe'));
        $totCO   = array_sum(array_column($rows, 'co'));
        $totSPA  = array_sum(array_column($rows, 'spa'));

        $cat = $categories->get($catId);
        $categoryBlocks[] = [
            'category_id'   => $catId,
            'category_name' => $cat?->dept_category_name ?? "Category {$catId}",
            'rows'          => $rows,
            'totals'        => [
                'ps'    => $totPS,
                'mooe'  => $totMOOE,
                'co'    => $totCO,
                'spa'   => $totSPA,
                'total' => $totPS + $totMOOE + $totCO + $totSPA,
            ],
        ];
    }

    // ── Special Plans ─────────────────────────────────────────────────────
    $specialPlanDefs = [
        ['key' => 'gad',       'label' => 'Gender and Development Program, (GAD)',             'source' => 'gad'],
        ['key' => 'lcpc',      'label' => 'Loc. Cncl for the Prtctn of Chldrn Prg. (LCPC)',    'source' => 'unified', 'slug' => 'lcpc-plan'],
        ['key' => 'lydp',      'label' => 'Local Youth Development Program, (LYDP)',            'source' => 'unified', 'slug' => 'lydp-plan'],
        ['key' => 'sc',        'label' => 'Senior Citizens Contri. & Welfare',                  'source' => 'unified', 'slug' => 'sc-plan'],
        ['key' => 'sc_ppa',    'label' => 'Social Voc. Rehab. For PWD',                         'source' => 'unified', 'slug' => 'sc-ppa-plan'],
        ['key' => 'mpoc',      'label' => 'Peace & Order and Public Safety Plan, (POPS PLAN)',  'source' => 'unified', 'slug' => 'mpoc-plan'],
        ['key' => 'drugs',     'label' => "PPA's on Illegal Drugs",                             'source' => 'unified', 'slug' => 'drugs-plan'],
        ['key' => 'arts',      'label' => 'Culture & Arts Plan',                                'source' => 'unified', 'slug' => 'arts-plan'],
        ['key' => 'nutrition', 'label' => 'Nutrition Action Plan',                              'source' => 'unified', 'slug' => 'nutrition-plan'],
        ['key' => 'aids',      'label' => "PPA's to Combat AIDS",                               'source' => 'unified', 'slug' => 'aids-plan'],
    ];

    $specialPlans = [];
    foreach ($specialPlanDefs as $def) {
        try {
            if ($def['source'] === 'gad') {
                $total = (float) \DB::table('gad_entries')
                    ->where('budget_plan_id', $budgetPlanId)
                    ->sum('total_amount');
            } else {
                $planType = str_replace('-', '_', str_replace('-plan', '', $def['slug']));
                $total = (float) \DB::table('unified_plan_items')
                    ->where('budget_plan_id', $budgetPlanId)
                    ->where('plan_type', $planType)
                    ->sum('total_amount');
            }
        } catch (\Throwable) {
            $total = 0.0;
        }
        // Always include — show dash when zero
        $specialPlans[] = ['label' => $def['label'], 'total' => $total];
    }

    // ── MDF & LDRRMF ──────────────────────────────────────────────────────
    $gfFund = $this->getGfFundTotals($budgetPlanId);
    $mdf    = $gfFund['nta']   * 0.20;
    $ldrrmf = $gfFund['total'] * 0.05;

    // ── Grand totals ──────────────────────────────────────────────────────
    $grandPS   = array_sum(array_column(array_column($categoryBlocks, 'totals'), 'ps'));
    $grandMOOE = array_sum(array_column(array_column($categoryBlocks, 'totals'), 'mooe'));
    $grandCO   = array_sum(array_column(array_column($categoryBlocks, 'totals'), 'co'));
    $grandSPA  = array_sum(array_column(array_column($categoryBlocks, 'totals'), 'spa'));
    $subTotal  = $grandPS + $grandMOOE + $grandCO + $grandSPA;
    $statutory = $mdf + $ldrrmf;
    $grandTotal= $subTotal + $statutory;

    return [
        'year'            => $year,
        'lgu'             => strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
        'category_blocks' => $categoryBlocks,
        'special_plans'   => $specialPlans,
        'mdf'             => $mdf,
        'ldrrmf'          => $ldrrmf,
        'grand_ps'        => $grandPS,
        'grand_mooe'      => $grandMOOE,
        'grand_co'        => $grandCO,
        'grand_spa'       => $grandSPA,
        'sub_total'       => $subTotal,
        'statutory'       => $statutory,
        'grand_total'     => $grandTotal,
    ];
}

public function form6PDF(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        'filter'         => 'nullable|string',
    ]);

    try {
        $this->clearViewCache();
        $filter = $request->input('filter', 'all');
        $data   = $this->buildForm6Data((int) $request->budget_plan_id, $filter);
        $html   = $this->renderHtml('form6', $data);
        $pdf    = $this->makePdf($html, 'portrait');
        $suffix = $filter === 'all' ? '' : ('_' . strtoupper($filter));
        return $this->pdfResponse(
            $pdf,
            "LBP_Form6_FY{$data['year']}{$suffix}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

// ── 2. buildForm6Data ─────────────────────────────────────────────────────

private function buildForm6Data(int $budgetPlanId, string $filter = 'all'): array
{
    $plan = BudgetPlan::findOrFail($budgetPlanId);
    $year = (int) $plan->year;

    // All templates ordered
    $templates = Form6Template::orderBy('sort_order')->get();

    // Special account departments
    $specialDepts = Department::with('category')
        ->get()
        ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts');

    $forms = [];

    // ── General Fund ──────────────────────────────────────────────────────
    if ($filter === 'all' || $filter === 'general-fund') {
        $forms[] = $this->buildOneForm6(
            $budgetPlanId, 'general-fund', $templates,
            label: 'General Fund',
            isSpecial: false,
        );
    }

    // ── Special Accounts ──────────────────────────────────────────────────
    foreach ($specialDepts as $dept) {
        $source = $this->sourceKeyForDept($dept);
        if ($filter !== 'all' && $filter !== $source) continue;

        $forms[] = $this->buildOneForm6(
            $budgetPlanId, $source, $templates,
            label: $dept->dept_name . ', (' . $dept->dept_abbreviation . ')',
            isSpecial: true,
        );
    }

    return [
        'year'  => $year,
        'lgu'   => strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
        'forms' => $forms,
    ];
}

private function buildOneForm6(
    int    $budgetPlanId,
    string $source,
    \Illuminate\Support\Collection $templates,
    string $label,
    bool   $isSpecial,
): array {
    $items = Form6Item::where('budget_plan_id', $budgetPlanId)
        ->where('source', $source)
        ->get()
        ->keyBy('form6_template_id');

    $rows = $templates->map(fn (Form6Template $tpl) => [
        'form6_template_id' => $tpl->form6_template_id,
        'code'              => $tpl->code,
        'label'             => $tpl->label,
        'parent_code'       => $tpl->parent_code,
        'sort_order'        => $tpl->sort_order,
        'show_peso_sign'    => (bool) $tpl->show_peso_sign,
        'is_section'        => (bool) $tpl->is_section,
        'is_computed'       => (bool) $tpl->is_computed,
        'level'             => (int)  $tpl->level,
        'amount'            => $items->get($tpl->form6_template_id)
                                ? (float) $items->get($tpl->form6_template_id)->amount
                                : 0.0,
    ])->values()->toArray();

    $parentCodes   = array_filter(array_column($rows, 'parent_code'));
    $parentCodeSet = array_flip($parentCodes);

    // $rows is already plain arrays — keyBy stores arrays, not objects
    $rowsByCode = collect($rows)->keyBy('code');
    $computed   = [];

    $computeAmt = function (array $r) use (&$computed, &$computeAmt, $rowsByCode, $rows): float {
        if (isset($computed[$r['code']])) return $computed[$r['code']];
        if ($r['is_computed']) {
            $children = array_filter($rows, fn ($c) => $c['parent_code'] === $r['code']);
            $sum = 0.0;
            foreach ($children as $child) {
                $childRow = $rowsByCode->get($child['code']);
                if ($childRow) $sum += $computeAmt($childRow); // ← removed ->toArray()
            }
            $computed[$r['code']] = $sum > 0 ? $sum : (float) $r['amount'];
            return $computed[$r['code']];
        }
        $computed[$r['code']] = (float) $r['amount'];
        return $computed[$r['code']];
    };

    foreach ($rows as $r) { $computeAmt($r); }

    $grandTotal = 0.0;
    foreach ($rows as $r) {
        if ($r['is_section'])                  continue;
        if (isset($parentCodeSet[$r['code']])) continue;
        $grandTotal += $computed[$r['code']] ?? (float) $r['amount'];
    }

    return [
        'label'       => $label,
        'source'      => $source,
        'is_special'  => $isSpecial,
        'rows'        => $rows,
        'grand_total' => $grandTotal,
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// ADD THESE METHODS to UnifiedReportController
// Place them alongside the other form methods (form6PDF, summary, etc.)
// ═══════════════════════════════════════════════════════════════════════════

// ── POST /api/reports/unified/form7pdf ───────────────────────────────────
//
// Add to routes:
//   Route::post('form7pdf', [UnifiedReportController::class, 'form7PDF']);
//
// Body params:
//   budget_plan_id  (required)
//   filter          (optional) 'all' | 'general-fund' | 'occ' | 'pm' | 'sh'
//   download        (optional) boolean
// ─────────────────────────────────────────────────────────────────────────

// ── POST /api/reports/unified/mdf20pdf ───────────────────────────────────
public function mdf20PDF(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
    ]);

    try {
        $this->clearViewCache();
        $data = $this->buildMdf20Data((int) $request->budget_plan_id);
        $html = $this->renderHtml('mdf20', $data);
        $pdf  = $this->makePdf($html, 'portrait');
        return $this->pdfResponse(
            $pdf,
            "LBP_20MDF_FY{$data['year']}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/reports/unified/pscomputationpdf
// ═══════════════════════════════════════════════════════════════════════════
public function psComputationPDF(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
    ]);

    try {
        $this->clearViewCache();
        $data = $this->buildPsComputationData((int) $request->budget_plan_id);
        $html = $this->renderHtml('pscomputation', $data);
        $pdf  = $this->makePdf($html, 'portrait');
        return $this->pdfResponse(
            $pdf,
            "PS_Computation_FY{$data['year']}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

private function buildPsComputationData(int $budgetPlanId): array
{
    $activePlan   = BudgetPlan::findOrFail($budgetPlanId);
    $proposedYear = (int) $activePlan->year;
    $incomeYear   = $proposedYear - 2;
    $lgu          = strtoupper($activePlan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL');

    // ── Manual values ─────────────────────────────────────────────────────
    $values = \App\Models\PsComputationValue::firstOrCreate(
        ['budget_plan_id' => $budgetPlanId],
        ['total_income' => 0, 'non_recurring_income' => 0, 'excess_amount' => 0]
    );

    // ── Aggregates from dept_bp_form2_items (GF only) ─────────────────────
    $specialCatId = \App\Models\DepartmentCategory::where('dept_category_name', 'Special Accounts')
        ->value('dept_category_id');

    $aggregates = \DB::table('dept_bp_form2_items as f2')
        ->join('department_budget_plans as dbp', 'dbp.dept_budget_plan_id', '=', 'f2.dept_budget_plan_id')
        ->join('departments as d',               'd.dept_id',               '=', 'dbp.dept_id')
        ->join('expense_class_items as ei',      'ei.expense_class_item_id','=', 'f2.expense_item_id')
        ->where('dbp.budget_plan_id', $budgetPlanId)
        ->when($specialCatId, fn ($q, $id) => $q->where('d.dept_category_id', '!=', $id))
        ->groupBy('ei.expense_class_item_name', 'ei.expense_class_item_acc_code')
        ->select(
            'ei.expense_class_item_name     as item_name',
            \DB::raw('SUM(f2.total_amount)  as total')
        )
        ->get()
        ->pluck('total', 'item_name')
        ->map(fn ($v) => (float) $v);

    $agg = fn (string $name): float => (float) ($aggregates->get($name) ?? 0);

    // Section A
    $salariesWages = $agg('Salaries and Wages - Regular');

    // Section B
    $retirementInsurance = $agg('Retirement and Life Insurance Premiums');
    $pagIbig             = $agg('Pag-IBIG Contributions');
    $philhealth          = $agg('PhilHealth Contributions');
    $ecInsurance         = $agg('Employees Compensation Insurance Premiums');
    $subtotalB           = $retirementInsurance + $pagIbig + $philhealth + $ecInsurance;

    // Section C
    $pera               = $agg('Personal Economic Relief Allowance (PERA)');
    $representation     = $agg('Representation Allowance (RA)');
    $transportation     = $agg('Transportation Allowance (TA)');
    $clothing           = $agg('Clothing/Uniform Allowance');
    $magnaCarta         = $agg('Subsistence Allowance');
    $hazardPay          = $agg('Hazard Pay');
    $honoraria          = $agg('Honoraria');
    $overtimePay        = $agg('Overtime and Night Pay');
    $cashGift           = $agg('Cash Gift');
    $midYearBonus       = $agg('Mid-Year Bonus');
    $yearEndBonus       = $agg('Year End Bonus');
    $terminalLeave      = $agg('Terminal Leave Benefits');
    $productivityInc    = $agg('Productivity Incentive Allowance');
    $monetization       = $agg('Other Personnel Benefits');
    $subtotalC          = $pera + $representation + $transportation + $clothing
                        + $magnaCarta + $hazardPay + $honoraria + $overtimePay
                        + $cashGift + $midYearBonus + $yearEndBonus
                        + $terminalLeave + $productivityInc + $monetization;

    $totalPs = $salariesWages + $subtotalB + $subtotalC;

    // Top section calculations
    $totalIncome         = (float) $values->total_income;
    $nonRecurring        = (float) $values->non_recurring_income;
    $excessAmount        = (float) $values->excess_amount;
    $totalRealizedIncome = $totalIncome - $nonRecurring;
    $psLimitation        = $totalRealizedIncome * 0.45;
    $totalWaived         = $terminalLeave + $monetization;
    $amountAllowable     = $psLimitation - $totalPs - $excessAmount + $totalWaived;

    return [
        'year'              => $proposedYear,
        'income_year'       => $incomeYear,
        'lgu'               => $lgu,
        // Top section
        'total_income'           => $totalIncome,
        'non_recurring'          => $nonRecurring,
        'total_realized'         => $totalRealizedIncome,
        'ps_limitation'          => $psLimitation,
        'total_ps_gf'            => $totalPs,
        'excess_amount'          => $excessAmount,
        'terminal_leave_gf'      => $terminalLeave,
        'monetization_gf'        => $monetization,
        'total_waived'           => $totalWaived,
        'amount_allowable'       => $amountAllowable,
        // Detail
        'salaries_wages'          => $salariesWages,
        'retirement_insurance'    => $retirementInsurance,
        'pag_ibig'                => $pagIbig,
        'philhealth'              => $philhealth,
        'ec_insurance'            => $ecInsurance,
        'subtotal_b'              => $subtotalB,
        'pera'                    => $pera,
        'representation'          => $representation,
        'transportation'          => $transportation,
        'clothing'                => $clothing,
        'magna_carta'             => $magnaCarta,
        'hazard_pay'              => $hazardPay,
        'honoraria'               => $honoraria,
        'overtime_pay'            => $overtimePay,
        'cash_gift'               => $cashGift,
        'mid_year_bonus'          => $midYearBonus,
        'year_end_bonus'          => $yearEndBonus,
        'terminal_leave'          => $terminalLeave,
        'productivity_incentive'  => $productivityInc,
        'monetization'            => $monetization,
        'subtotal_c'              => $subtotalC,
        'total_ps'                => $totalPs,
    ];
}

// ═══════════════════════════════════════════════════════════════════════════
// POST /api/reports/unified/calamity5pdf
// ═══════════════════════════════════════════════════════════════════════════
public function calamity5PDF(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        'filter'         => 'nullable|string',
    ]);

    try {
        $this->clearViewCache();
        $filter = $request->input('filter', 'all');
        $data   = $this->buildCalamity5Data((int) $request->budget_plan_id, $filter);
        $html   = $this->renderHtml('calamity5', $data);
        $pdf    = $this->makePdf($html, 'landscape');
        $suffix = $filter === 'all' ? '' : ('_' . strtoupper($filter));
        return $this->pdfResponse(
            $pdf,
            "5pct_CalamityFund_FY{$data['year']}{$suffix}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

private function buildCalamity5Data(int $budgetPlanId, string $filter = 'all'): array
{
    $plan = BudgetPlan::findOrFail($budgetPlanId);
    $year = (int) $plan->year;
    $lgu  = strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL');

    $specialDepts = Department::with('category')
        ->get()
        ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts');

    $forms = [];

    // ── General Fund ──────────────────────────────────────────────────────
    if ($filter === 'all' || $filter === 'general-fund') {
        $forms[] = $this->buildOneCalamity5($budgetPlanId, 'general-fund', 'GENERAL FUND', false, $year);
    }

    // ── Special Accounts ──────────────────────────────────────────────────
    foreach ($specialDepts as $dept) {
        $source = $this->sourceKeyForDept($dept);
        if ($filter !== 'all' && $filter !== $source) continue;
        $forms[] = $this->buildOneCalamity5(
            $budgetPlanId,
            $source,
            'SPECIAL ACCOUNT for ' . $dept->dept_name,
            true,
            $year
        );
    }

    // The blade renders the first form's data for single-source preview.
    // When filter is 'all', the blade iterates $all_forms.
    // For single-source previews, $forms[0] IS the correct filtered form
    // because the general-fund block is skipped when filter !== 'all' && filter !== 'general-fund'.
    // However we must ensure the blade iterates all_forms for 'all', and uses
    // the single matching form for specific filters.
    $primaryForm = $forms[0] ?? ['label' => '', 'is_special' => false, 'categories' => [], 'summary' => []];

    return [
        'year'       => $year,
        'lgu'        => $lgu,
        'label'      => $primaryForm['label'],
        'is_special' => $primaryForm['is_special'],
        'categories' => $primaryForm['categories'],
        'summary'    => $primaryForm['summary'],
        'all_forms'  => $forms,
    ];
}

private function buildOneCalamity5(
    int    $budgetPlanId,
    string $source,
    string $label,
    bool   $isSpecial,
    int    $year
): array {
    // Load items grouped by category
    $categories = \App\Models\LdrrmfipCategory::where('is_active', true)
        ->orderBy('sort_order')
        ->with(['items' => function ($q) use ($budgetPlanId, $source) {
            $q->where('budget_plan_id', $budgetPlanId)
              ->where('source', $source)
              ->orderBy('ldrrmfip_item_id');
        }])
        ->get()
        ->map(fn ($cat) => [
            'name'           => $cat->name,
            'items'          => $cat->items->map(fn ($i) => [
                'description'         => $i->description,
                'implementing_office' => $i->implementing_office ?? 'LDRRMO',
                'starting_date'       => $i->starting_date,
                'completion_date'     => $i->completion_date,
                'expected_output'     => $i->expected_output,
                'funding_source'      => $i->funding_source ?? 'LDRRMF',
                'mooe'                => (float) $i->mooe,
                'co'                  => (float) $i->co,
                'total'               => (float) ($i->mooe + $i->co),
            ])->toArray(),
            'subtotal_mooe'  => (float) $cat->items->sum('mooe'),
            'subtotal_co'    => (float) $cat->items->sum('co'),
            'subtotal_total' => (float) $cat->items->sum(fn ($i) => $i->mooe + $i->co),
        ])
        ->filter(fn ($cat) => count($cat['items']) > 0)
        ->values()
        ->toArray();

    // Compute 5% calamity fund (same logic as LdrrmfipController)
    $total70 = (float) LdrrmfipItem::where('budget_plan_id', $budgetPlanId)
        ->where('source', $source)
        ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')
        ->value('grand');

    $calamityFund = $this->computeCalamity5Fund($budgetPlanId, $source);
    $reserved30   = round($calamityFund - $total70, 2);

    return [
        'label'      => $label,
        'is_special' => $isSpecial,
        'categories' => $categories,
        'summary'    => [
            'total_70pct'   => round($total70, 2),
            'reserved_30'   => $reserved30,
            'calamity_fund' => $calamityFund,
        ],
    ];
}

private function computeCalamity5Fund(int $planId, string $source): float
{
    $nonIncomeParent = \DB::table('income_fund_objects')
        ->where('source', $source)
        ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
        ->first(['id']);

    if (!$nonIncomeParent && $source === 'general-fund') {
        $nonIncomeParent = \DB::table('income_fund_objects')
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);
    }

    $excludeIds = [];
    if ($nonIncomeParent) {
        $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
        $excludeIds[] = $nonIncomeParent->id;
    }

    $query = \DB::table('income_fund_amounts')
        ->where('budget_plan_id', $planId)
        ->where('source', $source);

    if (!empty($excludeIds)) {
        $query->whereNotIn('income_fund_object_id', $excludeIds);
    }

    return round((float) $query->sum('proposed_amount') * 0.05, 2);
}

public function form7PDF(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        'filter'         => 'nullable|string',
    ]);

    try {
        $this->clearViewCache();
        $filter = $request->input('filter', 'all');
        $data   = $this->buildForm7Data((int) $request->budget_plan_id, $filter);
        $html   = $this->renderHtml('form7', $data);
        $pdf    = $this->makePdf($html, 'portrait');
        $suffix = $filter === 'all' ? '' : ('_' . strtoupper($filter));
        return $this->pdfResponse(
            $pdf,
            "LBP_Form7_FY{$data['year']}{$suffix}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

private function buildMdf20Data(int $budgetPlanId): array
{
    $activePlan   = BudgetPlan::findOrFail($budgetPlanId);
    $proposedYear = (int) $activePlan->year;
    $currentYear  = $proposedYear - 1;
    $pastYear     = $proposedYear - 2;

    $currentPlan = BudgetPlan::where('year', $currentYear)->first();
    $pastPlan    = BudgetPlan::where('year', $pastYear)->first();

    $relevantPlanIds = array_values(array_filter([
        $budgetPlanId,
        $currentPlan?->budget_plan_id,
        $pastPlan?->budget_plan_id,
    ]));

    // ── Load categories (exclude special accounts via is_debt_servicing flag
    //    and include everything — we split by category name below) ──────────
    $categories = MdfCategory::orderBy('sort_order')
        ->with([
            'items' => function ($q) use ($relevantPlanIds) {
                $q->where('is_active', true)
                  ->orderBy('sort_order')
                  ->with([
                      'snapshots' => fn ($sq) => $sq->whereIn('budget_plan_id', $relevantPlanIds),
                  ]);
            },
        ])
        ->get();

    // ── Debt payments ─────────────────────────────────────────────────────
    $obligationIds = DebtObligation::where('is_active', true)
        ->pluck('obligation_id')->all();

    $debtPayments = collect();
    if ($obligationIds && $relevantPlanIds) {
        $debtPayments = DebtPayment::whereIn('obligation_id', $obligationIds)
            ->whereIn('budget_plan_id', $relevantPlanIds)
            ->get()
            ->groupBy(fn ($p) => "{$p->obligation_id}_{$p->budget_plan_id}");
    }

    $pay = function (int $obligationId, ?int $planId, string $field) use ($debtPayments): float {
        if (!$planId) return 0.0;
        $row = $debtPayments->get("{$obligationId}_{$planId}")?->first();
        return $row ? (float) $row->$field : 0.0;
    };

    $fields5 = ['past_total', 'cur_sem1', 'cur_sem2', 'cur_total', 'proposed'];

    $categoryRows = $categories->map(function (MdfCategory $cat) use (
        $activePlan, $currentPlan, $pastPlan, $pay, $budgetPlanId, $fields5
    ) {
        $items = $cat->items->map(function (MdfItem $item) use (
            $activePlan, $currentPlan, $pastPlan, $pay, $budgetPlanId
        ) {
            // ── Debt rows ─────────────────────────────────────────────────
            if ($item->obligation_id && $item->debt_type) {
                $dueField = $item->debt_type === 'principal' ? 'principal_due'  : 'interest_due';
                $s1Field  = $item->debt_type === 'principal' ? 'principal_sem1' : 'interest_sem1';

                $pastTotal = $pay($item->obligation_id, $pastPlan?->budget_plan_id,    $dueField);
                $curTotal  = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $dueField);
                $curSem1   = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $s1Field);
                $curSem2   = max(0, $curTotal - $curSem1);
                $proposed  = $pay($item->obligation_id, $budgetPlanId,                 $dueField);

                // if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) return null;
if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) {
                    if ($item->debt_type === 'principal') {
                        $obligation = DebtObligation::find($item->obligation_id);
                        if ($obligation) {
                            $totalPaid = DebtPayment::where('obligation_id', $item->obligation_id)
                                ->sum('principal_due');
                            $balance = (float) $obligation->principal_amount - (float) $totalPaid;
                            if ($balance <= 0) {
                                return null;
                            }
                            // Balance remains — keep principal row visible
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
                return [
                    'item_id'      => $item->item_id,
                    'name'         => $item->name,
                    'account_code' => $item->account_code ?? '',
                    'is_debt_row'  => true,
                    'debt_type'    => $item->debt_type,
                    'obligation_id'=> $item->obligation_id,
                    'past_total'   => $pastTotal,
                    'cur_sem1'     => $curSem1,
                    'cur_sem2'     => $curSem2,
                    'cur_total'    => $curTotal,
                    'proposed'     => $proposed,
                ];
            }

            // ── Regular rows ──────────────────────────────────────────────
            $byPlan      = $item->snapshots->keyBy('budget_plan_id');
            $activeSnap  = $byPlan->get($budgetPlanId);
            $currentSnap = $currentPlan ? $byPlan->get($currentPlan->budget_plan_id) : null;
            $pastSnap    = $pastPlan    ? $byPlan->get($pastPlan->budget_plan_id)    : null;

            $pastTotal = (float) ($pastSnap?->total_amount  ?? 0);
            $curTotal  = (float) ($currentSnap?->total_amount ?? 0);
            $curSem1   = (float) ($currentSnap?->sem1_actual  ?? 0);
            $curSem2   = max(0, $curTotal - $curSem1);
            $proposed  = (float) ($activeSnap?->total_amount  ?? 0);

            // if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) return null;
if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) {
                    if ($item->debt_type === 'principal') {
                        $obligation = DebtObligation::find($item->obligation_id);
                        if ($obligation) {
                            $totalPaid = DebtPayment::where('obligation_id', $item->obligation_id)
                                ->sum('principal_due');
                            $balance = (float) $obligation->principal_amount - (float) $totalPaid;
                            if ($balance <= 0) {
                                return null;
                            }
                            // Balance remains — keep principal row visible
                        } else {
                            return null;
                        }
                    } else {
                        return null;
                    }
                }
            return [
                'item_id'      => $item->item_id,
                'name'         => $item->name,
                'account_code' => $item->account_code ?? '',
                'is_debt_row'  => false,
                'debt_type'    => null,
                'obligation_id'=> null,
                'past_total'   => $pastTotal,
                'cur_sem1'     => $curSem1,
                'cur_sem2'     => $curSem2,
                'cur_total'    => $curTotal,
                'proposed'     => $proposed,
            ];
        })
        ->filter()
        ->values();

        if ($items->isEmpty()) return null;

        return [
            'category_id'       => $cat->category_id,
            'name'              => $cat->name,
            'is_debt_servicing' => (bool) $cat->is_debt_servicing,
            'sort_order'        => $cat->sort_order,
            'items'             => $items->toArray(),
            'totals' => [
                'past_total' => $items->sum('past_total'),
                'cur_sem1'   => $items->sum('cur_sem1'),
                'cur_sem2'   => $items->sum('cur_sem2'),
                'cur_total'  => $items->sum('cur_total'),
                'proposed'   => $items->sum('proposed'),
            ],
        ];
    })
    ->filter()
    ->values()
    ->toArray();

    $grandTotals = [
        'past_total' => array_sum(array_column(array_column($categoryRows, 'totals'), 'past_total')),
        'cur_sem1'   => array_sum(array_column(array_column($categoryRows, 'totals'), 'cur_sem1')),
        'cur_sem2'   => array_sum(array_column(array_column($categoryRows, 'totals'), 'cur_sem2')),
        'cur_total'  => array_sum(array_column(array_column($categoryRows, 'totals'), 'cur_total')),
        'proposed'   => array_sum(array_column(array_column($categoryRows, 'totals'), 'proposed')),
    ];

    return [
        'year'          => $proposedYear,
        'current_year'  => $currentYear,
        'past_year'     => $pastYear,
        'lgu'           => strtoupper($activePlan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
        'category_rows' => $categoryRows,
        'grand_totals'  => $grandTotals,
    ];
}

// ── buildForm7Data ────────────────────────────────────────────────────────

private function buildForm7Data(int $budgetPlanId, string $filter = 'all'): array
{
    $plan = BudgetPlan::findOrFail($budgetPlanId);
    $year = (int) $plan->year;

    $specialDepts = Department::with('category')
        ->get()
        ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts');

    $forms = [];

    // ── General Fund ──────────────────────────────────────────────────────
    if ($filter === 'all' || $filter === 'general-fund') {
        $forms[] = $this->buildOneForm7($budgetPlanId, label: 'General Fund', isSpecial: false);
    }

    // ── Special Accounts ──────────────────────────────────────────────────
    foreach ($specialDepts as $dept) {
        $source = $this->sourceKeyForDept($dept);
        if ($filter !== 'all' && $filter !== $source) continue;

        $forms[] = $this->buildOneForm7(
            $budgetPlanId,
            label: $dept->dept_name . ', (' . $dept->dept_abbreviation . ')',
            isSpecial: true,
            deptId: $dept->dept_id,
        );
    }

    return [
        'year'  => $year,
        'lgu'   => strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
        'forms' => $forms,
    ];
}

// ── buildOneForm7 ─────────────────────────────────────────────────────────
//
// Reuses the Form7Controller logic but returns a data array for blade
// instead of a JSON response.
// ─────────────────────────────────────────────────────────────────────────

private function buildOneForm7(
    int    $budgetPlanId,
    string $label,
    bool   $isSpecial,
    ?int   $deptId = null,
): array {
    // ── Category → column map ─────────────────────────────────────────────
    $categories        = \DB::table('department_categories')->get();
    $categoryColumnMap = [];
    foreach ($categories as $cat) {
        $col = $this->form7CategoryToColumn($cat->dept_category_name);
        if ($col) $categoryColumnMap[$cat->dept_category_id] = $col;
    }

    // ── dept_budget_plan_id → column ──────────────────────────────────────
    // For special account: only the one SA dept
    // For general fund:    all non-SA depts
    $deptQuery = \DB::table('department_budget_plans as dbp')
        ->join('departments as d',           'd.dept_id',           '=', 'dbp.dept_id')
        ->join('department_categories as dc', 'dc.dept_category_id', '=', 'd.dept_category_id')
        ->where('dbp.budget_plan_id', $budgetPlanId)
        ->select('dbp.dept_budget_plan_id', 'd.dept_category_id', 'd.dept_id');

    if ($isSpecial && $deptId) {
        $deptQuery->where('d.dept_id', $deptId);
    } else {
        // exclude special accounts for general fund
        $saIds = \DB::table('department_categories')
            ->whereRaw("LOWER(dept_category_name) LIKE '%special account%'")
            ->pluck('dept_category_id')->toArray();
        if (!empty($saIds)) {
            $deptQuery->whereNotIn('d.dept_category_id', $saIds);
        }
    }

    $deptRows = $deptQuery->get();
    $deptPlanCategoryMap = [];
    foreach ($deptRows as $row) {
        $col = $categoryColumnMap[$row->dept_category_id] ?? null;
        if ($col) $deptPlanCategoryMap[$row->dept_budget_plan_id] = $col;
    }

    // ── PS / MOOE / CO rows ───────────────────────────────────────────────
    $form2Rows = $this->form7BuildForm2Rows($budgetPlanId, $deptPlanCategoryMap);

    // ── FE obligations ────────────────────────────────────────────────────
    $feObligations = [];
    $feSubtotal    = ['general_public_services'=>0,'social_services'=>0,'economic_services'=>0,'other_services'=>0,'total'=>0];

    if (!$isSpecial) {
        $feObligations = $this->form7BuildFeObligations($budgetPlanId);
        $feTotal = 0.0;
        foreach ($feObligations as $ob) $feTotal += $ob['principal'] + $ob['interest'];
        $feSubtotal = [
            'general_public_services' => $feTotal,
            'social_services'         => 0.0,
            'economic_services'       => 0.0,
            'other_services'          => 0.0,
            'total'                   => $feTotal,
        ];
    }

    // ── AIP rows ──────────────────────────────────────────────────────────
    $aipRows = $this->form7BuildAipRows($budgetPlanId, $deptPlanCategoryMap);

    // ── Assemble sections ─────────────────────────────────────────────────
    $psRows   = $form2Rows['PS']   ?? [];
    $mooeRows = $form2Rows['MOOE'] ?? [];
    $coRows   = $form2Rows['CO']   ?? [];

    $sections = [
        [
            'section_code'  => 'PS',
            'section_label' => 'Personal Services, (P.S.)',
            'rows'          => $psRows,
            'obligations'   => [],
            'subtotal'      => $this->form7SumRows($psRows),
        ],
        [
            'section_code'  => 'MOOE',
            'section_label' => 'Maint. & Othr Oprtng Expns, (MOOE)',
            'rows'          => $mooeRows,
            'obligations'   => [],
            'subtotal'      => $this->form7SumRows($mooeRows),
        ],
        [
            'section_code'  => 'FE',
            'section_label' => 'Financial Expenses (F.E.)',
            'rows'          => [],
            'obligations'   => $feObligations,
            'subtotal'      => $feSubtotal,
        ],
        [
            'section_code'  => 'CO',
            'section_label' => 'Capital Outlay (C.O.)',
            'rows'          => $coRows,
            'obligations'   => [],
            'subtotal'      => $this->form7SumRows($coRows),
        ],
        [
            'section_code'  => 'SPA',
            'section_label' => 'Special Prps. Apprprtns.',
            'rows'          => $aipRows,
            'obligations'   => [],
            'subtotal'      => $this->form7SumRows($aipRows),
        ],
    ];

    // Grand total
    $grandTotal = ['general_public_services'=>0.0,'social_services'=>0.0,'economic_services'=>0.0,'other_services'=>0.0,'total'=>0.0];
    foreach ($sections as $s) {
        foreach (array_keys($grandTotal) as $col) {
            $grandTotal[$col] += $s['subtotal'][$col] ?? 0.0;
        }
    }

    return [
        'label'       => $label,
        'is_special'  => $isSpecial,
        'sections'    => $sections,
        'grand_total' => $grandTotal,
    ];
}

// ── Form 7 helpers ────────────────────────────────────────────────────────

private function form7CategoryToColumn(string $name): ?string
{
    $lower = strtolower($name);
    if (str_contains($lower, 'general public service')) return 'general_public_services';
    if (str_contains($lower, 'social service'))         return 'social_services';
    if (str_contains($lower, 'economic service'))       return 'economic_services';
    if (str_contains($lower, 'special account'))        return null; // excluded
    return 'other_services';
}

private function form7BuildForm2Rows(int $budgetPlanId, array $deptPlanCategoryMap): array
{
    $validIds = array_keys($deptPlanCategoryMap);
    if (empty($validIds)) return [];

    $items = \DB::table('dept_bp_form2_items as f2')
        ->join('expense_class_items as eci',   'eci.expense_class_item_id', '=', 'f2.expense_item_id')
        ->join('expense_classifications as ec', 'ec.expense_class_id',       '=', 'eci.expense_class_id')
        ->whereIn('f2.dept_budget_plan_id', $validIds)
        ->where('f2.total_amount', '>', 0)
        ->select(
            'f2.dept_budget_plan_id',
            'eci.expense_class_item_id',
            'eci.expense_class_item_name',
            'eci.expense_class_item_acc_code',
            'ec.abbreviation as class_abbr',
            'f2.total_amount'
        )
        ->get();

    $grouped = [];
    foreach ($items as $item) {
        $abbr = strtoupper($item->class_abbr ?? '');
        if (!in_array($abbr, ['PS', 'MOOE', 'CO'])) continue;
        $col = $deptPlanCategoryMap[$item->dept_budget_plan_id] ?? null;
        if (!$col) continue;

        $id = $item->expense_class_item_id;
        if (!isset($grouped[$abbr][$id])) {
            $grouped[$abbr][$id] = [
                'item_name'               => $item->expense_class_item_name,
                'account_code'            => $item->expense_class_item_acc_code ?? '',
                'general_public_services' => 0.0,
                'social_services'         => 0.0,
                'economic_services'       => 0.0,
                'other_services'          => 0.0,
            ];
        }
        $grouped[$abbr][$id][$col] += (float) $item->total_amount;
    }

    $result = [];
    foreach ($grouped as $abbr => $rows) {
        $result[$abbr] = [];
        foreach ($rows as $row) {
            $row['total'] = $row['general_public_services']
                          + $row['social_services']
                          + $row['economic_services']
                          + $row['other_services'];
            $result[$abbr][] = $row;
        }
    }
    return $result;
}

private function form7BuildFeObligations(int $budgetPlanId): array
{
    $payments = \DB::table('debt_payments as dp')
        ->join('debt_obligations as dob', 'dob.obligation_id', '=', 'dp.obligation_id')
        ->where('dp.budget_plan_id', $budgetPlanId)
        ->where(function ($q) {
            $q->where('dp.principal_due', '>', 0)
              ->orWhere('dp.interest_due',  '>', 0);
        })
        ->select(
            'dob.creditor',
            'dob.purpose',
            \DB::raw('COALESCE(dp.principal_due, 0) as principal'),
            \DB::raw('COALESCE(dp.interest_due,  0) as interest')
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

private function form7BuildAipRows(int $budgetPlanId, array $deptPlanCategoryMap): array
{
    $validIds = array_keys($deptPlanCategoryMap);
    if (empty($validIds)) return [];

    $items = \DB::table('dept_bp_form4_items as f4')
        ->join('aip_programs as ap', 'ap.aip_program_id', '=', 'f4.aip_program_id')
        ->whereIn('f4.dept_budget_plan_id', $validIds)
        ->where('f4.total_amount', '>', 0)
        ->select(
            'f4.dept_budget_plan_id',
            'ap.aip_program_id',
            'ap.aip_reference_code',
            'ap.program_description',
            'f4.total_amount'
        )
        ->get();

    $grouped = [];
    foreach ($items as $item) {
        $col    = $deptPlanCategoryMap[$item->dept_budget_plan_id] ?? null;
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

private function form7SumRows(array $rows): array
{
    $sum = ['general_public_services'=>0.0,'social_services'=>0.0,'economic_services'=>0.0,'other_services'=>0.0,'total'=>0.0];
    foreach ($rows as $row) {
        foreach (array_keys($sum) as $col) {
            $sum[$col] += $row[$col] ?? 0.0;
        }
    }
    return $sum;
}

// ── Helper: get GF fund totals (NTA + total income) ──────────────────────
private function getGfFundTotals(int $budgetPlanId): array
{
    try {
        $rows = \DB::table('income_fund_amounts')
            ->join('income_fund_objects', 'income_fund_amounts.income_fund_object_id', '=', 'income_fund_objects.id')
            ->where('income_fund_amounts.budget_plan_id', $budgetPlanId)
            ->where('income_fund_amounts.source', 'general-fund')
            ->select('income_fund_objects.id', 'income_fund_objects.parent_id',
                     'income_fund_objects.name', 'income_fund_amounts.proposed_amount')
            ->get();

        // Leaf rows only (not parents)
        $parentIds = $rows->whereNotNull('parent_id')->pluck('parent_id')->unique()->toArray();
        $leafRows  = $rows->filter(fn ($r) => !in_array($r->id, $parentIds));
        $total     = $leafRows->sum(fn ($r) => (float) $r->proposed_amount);

        $ntaRow = $rows->first(fn ($r) => preg_match('/national.*tax.*allotment/i', $r->name ?? ''));
        $nta    = (float) ($ntaRow->proposed_amount ?? 0);

        return ['total' => $total, 'nta' => $nta];
    } catch (\Throwable) {
        return ['total' => 0.0, 'nta' => 0.0];
    }
}

    // ═══════════════════════════════════════════════════════
    // POST /api/reports/unified/generate-all
    //
    // Body params:
    //   budget_plan_id  integer  (required)
    //   forms           array    (required) — subset of ['form1','form2','form3','form4','form5']
    //
    // Output order (per spec):
    //   1. General Fund:  Form 1, Forms 2-3-4 all-depts, Form 5
    //   2. Each Special Account dept (category = "special accounts"):
    //      Form 1 (filtered), Forms 2-3-4 for that dept
    // ═══════════════════════════════════════════════════════
    public function generateAll(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'forms'          => 'required|array|min:1',
            'forms.*' => 'in:form1,form2,form3,form4,form5,form6,form7,summary,mdf20,calamity5,pscomputation',
            // 'forms.*' => 'in:form1,form2,form3,form4,form5,form6,form7,summary,mdf20,calamity5',
            // 'forms.*' => 'in:form1,form2,form3,form4,form5,form6,form7,summary,mdf20',
        ]);

        try {
            $this->clearViewCache();

            $bpId  = (int) $request->budget_plan_id;
            $forms = $request->forms;
            $plan  = BudgetPlan::findOrFail($bpId);
            $year  = $plan->year;

            $zipPath = sys_get_temp_dir() . '/LBP_AllForms_FY' . $year . '_' . time() . '.zip';
            $zip     = new ZipArchive();
            if ($zip->open($zipPath, ZipArchive::CREATE | ZipArchive::OVERWRITE) !== true) {
                throw new \RuntimeException('Cannot create ZIP archive.');
            }

            $deptForms = array_values(array_intersect($forms, ['form2', 'form3', 'form4']));

            // ── Section 1: General Fund ───────────────────────────────────
            $sectionGF = '01_GeneralFund/';

            if (in_array('form1', $forms)) {
                $data = $this->buildForm1Data($bpId, 'general-fund');
                $html = $this->renderHtml('form1', $data);
                $zip->addFromString($sectionGF . "Form1_GeneralFund_FY{$year}.pdf",
                    $this->makePdf($html, 'portrait'));
            }

            if (!empty($deptForms)) {
                // All departments (general fund only — category != special accounts)
                $generalDeptIds = Department::with('category')
                    ->get()
                    ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) !== 'special accounts')
                    ->pluck('dept_id');

                foreach ($generalDeptIds as $deptId) {
                    $fakeRequest = new Request([
                        'budget_plan_id' => $bpId,
                        'department'     => (string) $deptId,
                        'forms'          => $deptForms,
                    ]);
                    $reportData = $this->buildDeptData($fakeRequest);
                    if (empty($reportData['departments'])) continue;

                    $deptName = $reportData['departments'][0]['department']->dept_abbreviation
                        ?? $reportData['departments'][0]['department']->dept_name;
                    $html = $this->renderHtml('dept', null, $deptForms, $reportData);
                    $label = implode('-', array_map('strtoupper', $deptForms));
                    $zip->addFromString(
                        $sectionGF . "Forms_{$label}_{$deptName}_FY{$year}.pdf",
                        $this->makePdf($html, 'portrait')
                    );
                }
            }

            if (in_array('form5', $forms)) {
                $data = $this->buildForm5Data($bpId);
                $html = $this->renderHtml('form5', $data);
                $zip->addFromString($sectionGF . "Form5_Indebtedness_FY{$year}.pdf",
                    $this->makePdf($html, 'landscape'));
            }


            if (in_array('form6', $forms)) {
                $data = $this->buildForm6Data($bpId, 'general-fund');
                $html = $this->renderHtml('form6', $data);
                $zip->addFromString($sectionGF . "Form6_StatutoryObligations_GF_FY{$year}.pdf",
                    $this->makePdf($html, 'portrait'));
            }

            if (in_array('form7', $forms)) {
                $data = $this->buildForm7Data($bpId, 'general-fund');
                $html = $this->renderHtml('form7', $data);
                $zip->addFromString($sectionGF . "Form7_FundAllocationBySector_GF_FY{$year}.pdf",
                    $this->makePdf($html, 'portrait'));
            }

            if (in_array('summary', $forms)) {
                $data = $this->buildSummaryData($bpId);
                $html = $this->renderHtml('summary', $data);
                $zip->addFromString($sectionGF . "SummaryOfExpenditures_FY{$year}.pdf",
                    $this->makePdf($html, 'portrait'));
            }

            if (in_array('pscomputation', $forms)) {
                $data = $this->buildPsComputationData($bpId);
                $html = $this->renderHtml('pscomputation', $data);
                $zip->addFromString($sectionGF . "PS_Computation_FY{$year}.pdf",
                    $this->makePdf($html, 'portrait'));
            }

            if (in_array('mdf20', $forms)) {
                $data = $this->buildMdf20Data($bpId);
                $html = $this->renderHtml('mdf20', $data);
                $zip->addFromString($sectionGF . "20MDF_FY{$year}.pdf",
                    $this->makePdf($html, 'portrait'));
            }

            if (in_array('calamity5', $forms)) {
                $data = $this->buildCalamity5Data($bpId, 'general-fund');
                $html = $this->renderHtml('calamity5', $data);
                $zip->addFromString($sectionGF . "5pct_CalamityFund_GF_FY{$year}.pdf",
                    $this->makePdf($html, 'landscape'));
            }

            // ── Section 2: Special Account departments ───────────────────
            $specialDepts = Department::with('category')
                ->get()
                ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts');

            $saIdx = 2;
            foreach ($specialDepts as $dept) {
                $sourceKey   = $this->sourceKeyForDept($dept);
                $saAbbr      = strtoupper($dept->dept_abbreviation ?? $dept->dept_name);
                $sectionSA   = sprintf('%02d_SA_%s/', $saIdx++, $saAbbr);

                if (in_array('form1', $forms)) {
                    $data = $this->buildForm1Data($bpId, $sourceKey);
                    $html = $this->renderHtml('form1', $data);
                    $zip->addFromString(
                        $sectionSA . "Form1_{$saAbbr}_FY{$year}.pdf",
                        $this->makePdf($html, 'portrait')
                    );
                }

                if (in_array('form6', $forms)) {
                    $data = $this->buildForm6Data($bpId, $sourceKey);
                    $html = $this->renderHtml('form6', $data);
                    $zip->addFromString(
                        $sectionSA . "Form6_StatutoryObligations_{$saAbbr}_FY{$year}.pdf",
                        $this->makePdf($html, 'portrait')
                    );
                }

                if (in_array('form7', $forms)) {
                    $data = $this->buildForm7Data($bpId, $sourceKey);
                    $html = $this->renderHtml('form7', $data);
                    $zip->addFromString(
                        $sectionSA . "Form7_FundAllocationBySector_{$saAbbr}_FY{$year}.pdf",
                        $this->makePdf($html, 'portrait')
                    );
                }

                if (in_array('calamity5', $forms)) {
                    $data = $this->buildCalamity5Data($bpId, $sourceKey);
                    $html = $this->renderHtml('calamity5', $data);
                    $zip->addFromString(
                        $sectionSA . "5pct_CalamityFund_{$saAbbr}_FY{$year}.pdf",
                        $this->makePdf($html, 'landscape')
                    );
                }

                if (!empty($deptForms)) {
                    $fakeRequest = new Request([
                        'budget_plan_id' => $bpId,
                        'department'     => (string) $dept->dept_id,
                        'forms'          => $deptForms,
                    ]);
                    $reportData = $this->buildDeptData($fakeRequest);
                    if (!empty($reportData['departments'])) {
                        $html  = $this->renderHtml('dept', null, $deptForms, $reportData);
                        $label = implode('-', array_map('strtoupper', $deptForms));
                        $zip->addFromString(
                            $sectionSA . "Forms_{$label}_{$saAbbr}_FY{$year}.pdf",
                            $this->makePdf($html, 'portrait')
                        );
                    }
                }
            }

            $zip->close();

return response()->stream(function () use ($zipPath) {
    $handle = fopen($zipPath, 'rb');
    while (!feof($handle)) {
        echo fread($handle, 65536);
        ob_flush();
        flush();
    }
    fclose($handle);
    @unlink($zipPath);
}, 200, [
    'Content-Type'              => 'application/zip',
    'Content-Disposition'       => "attachment; filename=\"LBP_AllForms_FY{$year}.zip\"",
    'Content-Length'            => filesize($zipPath),
    'Cache-Control'             => 'no-cache, no-store',
    'X-Accel-Buffering'         => 'no',
]);

        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // HTML RENDERER — uses unified blade, mode dispatch
    // ═══════════════════════════════════════════════════════
    private function renderHtml(
        string $mode,
        ?array $data,
        array $forms = [],
        ?array $reportData = null
    ): string {
        $signatories = $this->buildSignatories();
        return view('reports.budget_forms_unified', compact('mode', 'data', 'forms', 'reportData', 'signatories'))->render();
    }

    // ═══════════════════════════════════════════════════════
    // PDF BUILDER
    // ═══════════════════════════════════════════════════════
    private function makePdf(string $html, string $orientation = 'portrait'): string
    {
        $options = new Options();
        $options->set('isHtml5ParserEnabled', true);
        $options->set('isRemoteEnabled', false);
        $options->set('defaultFont', 'DejaVu Sans');

        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html, 'UTF-8');

        // Portrait legal: 8.5in × 14in = 612pt × 1008pt
        // Landscape legal: 14in × 8.5in = 1008pt × 612pt
        if ($orientation === 'landscape') {
            $dompdf->setPaper([0, 0, 1008, 612], 'landscape');
        } else {
            $dompdf->setPaper([0, 0, 612, 1008], 'portrait');
        }

        $dompdf->render();
        return $dompdf->output();
    }

    private function pdfResponse(string $pdf, string $filename, bool $download): \Illuminate\Http\Response
    {
        $disposition = $download ? 'attachment' : 'inline';
        return response($pdf)
            ->header('Content-Type', 'application/pdf')
            ->header('Content-Disposition', "{$disposition}; filename=\"{$filename}\"");
    }

    private function errorResponse(\Throwable $e): \Illuminate\Http\JsonResponse
    {
        \Log::error('UnifiedReport failed', [
            'message' => $e->getMessage(),
            'file'    => $e->getFile(),
            'line'    => $e->getLine(),
        ]);
        return response()->json([
            'error' => $e->getMessage(),
            'file'  => str_replace(base_path(), '', $e->getFile()),
            'line'  => $e->getLine(),
        ], 500);
    }

    // ═══════════════════════════════════════════════════════
    // DATA BUILDERS (reuse logic from original controllers)
    // ═══════════════════════════════════════════════════════

    // ── Form 1 data (mirrors LbpForm1Controller::buildAllForms) ──────────
    private function buildForm1Data(int $budgetPlanId, string $filter = 'all'): array
    {
        $activePlan   = BudgetPlan::findOrFail($budgetPlanId);
        $proposedYear = (int) $activePlan->year;
        $currentYear  = $proposedYear - 1;
        $pastYear     = $proposedYear - 2;

        $pastPlan    = BudgetPlan::where('year', $pastYear)->first();
        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        $expenseItems    = ExpenseClassItem::with('classification')
            ->where('is_active', true)
            ->orderBy('expense_class_item_id')
            ->get()->keyBy('expense_class_item_id');
        $classifications = ExpenseClassification::all()->keyBy('expense_class_id');

        $departments  = Department::with('category')->get();
        $generalDepts = $departments->filter(
            fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) !== 'special accounts'
        );
        $specialDepts = $departments->filter(
            fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts'
        );

        $forms = [];

        if ($filter === 'all' || $filter === 'general-fund') {
            $forms[] = $this->buildOneForm1(
                'General Fund', 'general-fund', $generalDepts,
                $activePlan, $currentPlan, $pastPlan,
                $expenseItems, $classifications,
                $proposedYear, $currentYear, $pastYear,
            );
        }

        foreach ($specialDepts as $dept) {
            $source = $this->sourceKeyForDept($dept);
            if ($filter !== 'all' && $filter !== $source) continue;
            $forms[] = $this->buildOneForm1(
                'Special Account : ' . $dept->dept_name . ', ' . $dept->dept_abbreviation,
                $source, collect([$dept]),
                $activePlan, $currentPlan, $pastPlan,
                $expenseItems, $classifications,
                $proposedYear, $currentYear, $pastYear,
            );
        }

        return [
            'budget_plan'   => $activePlan,
            'proposed_year' => $proposedYear,
            'current_year'  => $currentYear,
            'past_year'     => $pastYear,
            'forms'         => $forms,
        ];
    }

    private function buildOneForm1(
        string $label, string $source, $depts,
        BudgetPlan $activePlan, ?BudgetPlan $currentPlan, ?BudgetPlan $pastPlan,
        $expenseItems, $classifications,
        int $proposedYear, int $currentYear, int $pastYear,
    ): array {
        $deptIds = $depts->pluck('dept_id')->toArray();

        $proposedPlanIds = DepartmentBudgetPlan::where('budget_plan_id', $activePlan->budget_plan_id)
            ->whereIn('dept_id', $deptIds)->pluck('dept_budget_plan_id')->toArray();
        $currentPlanIds  = $currentPlan
            ? DepartmentBudgetPlan::where('budget_plan_id', $currentPlan->budget_plan_id)
                ->whereIn('dept_id', $deptIds)->pluck('dept_budget_plan_id')->toArray()
            : [];
        $pastPlanIds     = $pastPlan
            ? DepartmentBudgetPlan::where('budget_plan_id', $pastPlan->budget_plan_id)
                ->whereIn('dept_id', $deptIds)->pluck('dept_budget_plan_id')->toArray()
            : [];

        return [
            'label'         => $label,
            'source'        => $source,
            'expense_rows'  => $this->aggregateExpenseItems($expenseItems, $classifications, $proposedPlanIds, $currentPlanIds, $pastPlanIds),
            // 'mdf_rows'      => $this->aggregateMdfRegularItems($activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id),
            // 'mdf_debt_rows' => $this->aggregateMdfDebtRows($activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id),
            'mdf_rows'      => $source === 'general-fund' ? $this->aggregateMdfRegularItems($activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id) : [],
            'mdf_debt_rows' => $source === 'general-fund' ? $this->aggregateMdfDebtRows($activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id) : [],
            'aip_rows'      => $this->aggregateAipPrograms($deptIds, $activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id),
            'income'        => $this->buildIncomeFundData($source, $activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id),
            'ldrrmf_rows'   => $this->buildLdrrmfRows($source, $activePlan->budget_plan_id, $currentPlan?->budget_plan_id, $pastPlan?->budget_plan_id),
        ];
    }

    // ── Form 2/3/4 data (mirrors BudgetReportController::buildReportData) ─
    private function buildDeptData(Request $request): array
    {
        $budgetPlan   = BudgetPlan::findOrFail($request->budget_plan_id);
        $proposedYear = (int) $budgetPlan->year;
        $currentYear  = $proposedYear - 1;
        $pastYear     = $proposedYear - 2;
        $forms        = $request->forms;

        $departments = $request->department === 'all'
            ? Department::orderBy('dept_name')->get()
            : tap(Department::where('dept_id', $request->department)->get(), fn ($c) => abort_if($c->isEmpty(), 404));

        $currentBudgetPlan = BudgetPlan::where('year', $currentYear)->first();
        $pastBudgetPlan    = BudgetPlan::where('year', $pastYear)->first();

        $deptReports = [];

        foreach ($departments as $dept) {
            $proposedPlan = DepartmentBudgetPlan::with(['items.expenseItem.classification', 'budgetPlan'])
                ->where('dept_id', $dept->dept_id)
                ->where('budget_plan_id', $budgetPlan->budget_plan_id)
                ->first();
            if (! $proposedPlan) continue;

            $currentPlan = $currentBudgetPlan
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $currentBudgetPlan->budget_plan_id)->first()
                : null;
            $pastPlan = $pastBudgetPlan
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $pastBudgetPlan->budget_plan_id)->first()
                : null;

            $report = [
                'department'    => $dept,
                'proposed_year' => $proposedYear,
                'current_year'  => $currentYear,
                'past_year'     => $pastYear,
                'dept_head'     => $this->getDeptHead($dept->dept_id),
            ];
            if (in_array('form2', $forms)) $report['form2'] = $this->buildForm2($proposedPlan, $currentPlan, $pastPlan);
            if (in_array('form3', $forms)) $report['form3'] = $this->buildForm3($proposedPlan, $currentPlan, $currentYear, $proposedYear);
            if (in_array('form4', $forms)) $report['form4'] = $this->buildForm4($proposedPlan, $dept);

            $deptReports[] = $report;
        }

        return ['budget_plan' => $budgetPlan, 'departments' => $deptReports];
    }

    // ── Form 5 data (mirrors ReportForm5controller::buildData) ───────────
    private function buildForm5Data(int $budgetPlanId): array
    {
        $plan        = BudgetPlan::findOrFail($budgetPlanId);
        $obligations = DebtObligation::orderBy('sort_order')->orderBy('obligation_id')->get();
        $rows        = [];

        foreach ($obligations as $ob) {
            $prevAgg = $ob->payments()->where('budget_plan_id', '!=', $budgetPlanId)
                ->selectRaw('SUM(principal_due) as prev_principal, SUM(interest_due) as prev_interest')
                ->first();
            $prevPrincipal = (float) ($prevAgg->prev_principal ?? 0);
            $prevInterest  = (float) ($prevAgg->prev_interest  ?? 0);

            $currentPayment = $ob->payments()->where('budget_plan_id', $budgetPlanId)->first();
            $curPrincipal   = (float) ($currentPayment->principal_due ?? 0);
            $curInterest    = (float) ($currentPayment->interest_due  ?? 0);

            $balance = (float) $ob->principal_amount - $prevPrincipal - $curPrincipal;

            if ($balance <= 0 && $currentPayment === null && ($prevPrincipal + $prevInterest) === 0.0) continue;

            $termLines  = array_map('trim', explode("\n", trim($ob->term), 2));
            $rows[] = [
                'creditor'           => $ob->creditor,
                'date_contracted'    => $ob->date_contracted,
                'term_line1'         => $termLines[0] ?? '',
                'term_line2'         => $termLines[1] ?? '',
                'principal_amount'   => (float) $ob->principal_amount,
                'purpose'            => $ob->purpose,
                'previous_principal' => $prevPrincipal,
                'previous_interest'  => $prevInterest,
                'previous_total'     => $prevPrincipal + $prevInterest,
                'current_principal'  => $curPrincipal,
                'current_interest'   => $curInterest,
                'current_total'      => $curPrincipal + $curInterest,
                'balance_principal'  => $balance,
            ];
        }

        $fields  = ['principal_amount','previous_principal','previous_interest','previous_total',
                    'current_principal','current_interest','current_total','balance_principal'];
        $totals  = array_fill_keys($fields, 0.0);
        foreach ($rows as $r) foreach ($fields as $f) $totals[$f] += $r[$f];

        return [
            'budget_plan' => $plan,
            'year'        => (int) $plan->year,
            'lgu'         => strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
            'rows'        => $rows,
            'totals'      => $totals,
        ];
    }

    // ═══════════════════════════════════════════════════════
    // FORM 2 / 3 / 4 BUILDERS (ported from BudgetReportController)
    // ═══════════════════════════════════════════════════════

    // private function buildForm2($proposedPlan, $currentPlan, $pastPlan): array
    // {
    //     $items = [];
    //     foreach ($proposedPlan->items as $proposedItem) {
    //         $expenseItem = $proposedItem->expenseItem;
    //         if (! $expenseItem) continue;

    //         $currentItem = $currentPlan
    //             ? BudgetPlanForm2Item::where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
    //                 ->where('expense_item_id', $expenseItem->expense_class_item_id)->first()
    //             : null;
    //         $pastItem = $pastPlan
    //             ? BudgetPlanForm2Item::where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
    //                 ->where('expense_item_id', $expenseItem->expense_class_item_id)->first()
    //             : null;

    //         $items[] = [
    //             'classification' => $expenseItem->classification->expense_class_name ?? 'Uncategorized',
    //             'description'    => $expenseItem->expense_class_item_name,
    //             'account_code'   => $expenseItem->expense_class_item_acc_code,
    //             'past_total'     => (float) ($pastItem?->obligation_amount ?? 0),  // ← FIXED: use obligation_amount
    //             'current_sem1'   => (float) ($currentItem?->sem1_amount    ?? 0),
    //             'current_sem2'   => (float) ($currentItem?->sem2_amount    ?? 0),
    //             'current_total'  => (float) ($currentItem?->total_amount   ?? 0),
    //             'proposed'       => (float) $proposedItem->total_amount,
    //         ];
    //     }

    //     // ── Special Programs (AIP Form 4 items) ──────────────────────────────
    //     // Build a union of all AIP programs that appear in ANY of the three
    //     // periods (proposed / current / past).  This ensures programs that exist
    //     // in earlier years still show up even when the proposed year has no
    //     // Form 4 entries yet.

    //     // Load form4 items for each period (keyed by aip_program_id)
    //     $proposedAip = DeptBpForm4Item::with('aipProgram')
    //         ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
    //         ->get()
    //         ->keyBy('aip_program_id');

    //     $currentAip = $currentPlan
    //         ? DeptBpForm4Item::with('aipProgram')
    //             ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
    //             ->get()
    //             ->keyBy('aip_program_id')
    //         : collect();

    //     $pastAip = $pastPlan
    //         ? DeptBpForm4Item::with('aipProgram')
    //             ->where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
    //             ->get()
    //             ->keyBy('aip_program_id')
    //         : collect();

    //     // Union of all program IDs across the three periods
    //     $allProgramIds = $proposedAip->keys()
    //         ->merge($currentAip->keys())
    //         ->merge($pastAip->keys())
    //         ->unique()
    //         ->sort()
    //         ->values();

    //     $specialPrograms = [];
    //     foreach ($allProgramIds as $programId) {
    //         $proposedRow = $proposedAip->get($programId);
    //         $currentRow  = $currentAip->get($programId);
    //         $pastRow     = $pastAip->get($programId);

    //         // Resolve the AIP program meta from whichever period has it
    //         $aipProgram = $proposedRow?->aipProgram
    //             ?? $currentRow?->aipProgram
    //             ?? $pastRow?->aipProgram;

    //         if (! $aipProgram) continue;

    //         // $pastTotal    = (float) ($pastRow?->total_amount ?? 0);
    //         $pastTotal    = (float) ($pastRow?->obligation_amount ?? 0);  // ← FIXED
    //         $curSem1      = (float) ($currentRow?->sem1_amount ?? 0);
    //         $curSem2      = (float) ($currentRow?->sem2_amount ?? 0);
    //         $curTotal     = (float) ($currentRow?->total_amount
    //                         ?? (($currentRow?->sem1_amount ?? 0) + ($currentRow?->sem2_amount ?? 0)));
    //         $proposed     = (float) ($proposedRow?->total_amount ?? 0);

    //         // Skip entirely if there is absolutely no data in any period
    //         if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) continue;

    //         $specialPrograms[] = [
    //             'aip_reference_code'  => $aipProgram->aip_reference_code,
    //             'program_description' => $aipProgram->program_description,
    //             'past_total'          => $pastTotal,
    //             'current_sem1'        => $curSem1,
    //             'current_sem2'        => $curSem2,
    //             'current_total'       => $curTotal,
    //             'proposed'            => $proposed,
    //         ];
    //     }

    //     return compact('items', 'specialPrograms');
    // }
    private function buildForm2($proposedPlan, $currentPlan, $pastPlan): array
{
    $items = [];
    foreach ($proposedPlan->items as $proposedItem) {
        $expenseItem = $proposedItem->expenseItem;
        if (! $expenseItem) continue;

        $currentItem = $currentPlan
            ? BudgetPlanForm2Item::where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
                ->where('expense_item_id', $expenseItem->expense_class_item_id)->first()
            : null;
        $pastItem = $pastPlan
            ? BudgetPlanForm2Item::where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
                ->where('expense_item_id', $expenseItem->expense_class_item_id)->first()
            : null;

        $items[] = [
            'classification' => $expenseItem->classification->expense_class_name ?? 'Uncategorized',
            'description'    => $expenseItem->expense_class_item_name,
            'account_code'   => $expenseItem->expense_class_item_acc_code,
            // ↓ FIXED: past year ACTUAL = obligation_amount (what was actually spent/obligated)
            //          NOT total_amount (which is the appropriation/budget)
            'past_total'     => (float) ($pastItem?->obligation_amount ?? 0),
            'current_sem1'   => (float) ($currentItem?->sem1_amount    ?? 0),
            'current_sem2'   => (float) ($currentItem?->sem2_amount    ?? 0),
            'current_total'  => (float) ($currentItem?->total_amount   ?? 0),
            'proposed'       => (float) $proposedItem->total_amount,
        ];
    }

    // ── Special Programs (AIP Form 4 items) ──────────────────────────────────
    $proposedAip = DeptBpForm4Item::with('aipProgram')
        ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
        ->get()
        ->keyBy('aip_program_id');

    $currentAip = $currentPlan
        ? DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
            ->get()
            ->keyBy('aip_program_id')
        : collect();

    $pastAip = $pastPlan
        ? DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
            ->get()
            ->keyBy('aip_program_id')
        : collect();

    $allProgramIds = $proposedAip->keys()
        ->merge($currentAip->keys())
        ->merge($pastAip->keys())
        ->unique()
        ->sort()
        ->values();

    $specialPrograms = [];
    foreach ($allProgramIds as $programId) {
        $proposedRow = $proposedAip->get($programId);
        $currentRow  = $currentAip->get($programId);
        $pastRow     = $pastAip->get($programId);

        $aipProgram = $proposedRow?->aipProgram
            ?? $currentRow?->aipProgram
            ?? $pastRow?->aipProgram;

        if (! $aipProgram) continue;

        // ↓ FIXED: past year ACTUAL = obligation_amount
        $pastTotal = (float) ($pastRow?->obligation_amount ?? 0);
        $curSem1   = (float) ($currentRow?->sem1_amount    ?? 0);
        $curSem2   = (float) ($currentRow?->sem2_amount    ?? 0);
        $curTotal  = (float) ($currentRow?->total_amount
                    ?? (($currentRow?->sem1_amount ?? 0) + ($currentRow?->sem2_amount ?? 0)));
        $proposed  = (float) ($proposedRow?->total_amount  ?? 0);

        if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) continue;

        $specialPrograms[] = [
            'aip_reference_code'  => $aipProgram->aip_reference_code,
            'program_description' => $aipProgram->program_description,
            'past_total'          => $pastTotal,
            'current_sem1'        => $curSem1,
            'current_sem2'        => $curSem2,
            'current_total'       => $curTotal,
            'proposed'            => $proposed,
        ];
    }

    return compact('items', 'specialPrograms');
}

    private function buildForm3($proposedPlan, $currentPlan, int $currentYear, int $proposedYear): array
    {
        $proposedSnapshots   = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
            ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)->get();
        $currentSnapshotsRaw = $currentPlan
            ? BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)->get()
            : collect();

        $proposedVersion = $this->resolveVersionFromSnapshots($proposedSnapshots)
            ?? SalaryStandardVersion::where('is_active', true)->first();
        $currentVersion  = $this->resolveVersionFromSnapshots($currentSnapshotsRaw) ?? $proposedVersion;

        $lbcCurrent      = $currentVersion?->lbc_reference  ?? null;
        $trancheCurrent  = $this->formatTranche($currentVersion);
        $lbcProposed     = $proposedVersion?->lbc_reference ?? null;
        $trancheProposed = $this->formatTranche($proposedVersion);

        $proposedKeyed    = $proposedSnapshots->keyBy('plantilla_position_id');
        $currentSnapshots = $currentSnapshotsRaw->keyBy('plantilla_position_id');

        // ── Master list: UNION of both years ──────────────────────────────────
        // Proposed year drives the list, but we also include positions that
        // exist in the current year but are gone (or vacant) in the budget year.
        // This ensures Position A (2026 active, 2027 vacant/missing) still shows.
        $allPositionIds = $proposedKeyed->keys()
            ->merge($currentSnapshots->keys())
            ->unique()
            ->sortBy(fn ($posId) => (int) (
                ($proposedKeyed->get($posId) ?? $currentSnapshots->get($posId))
                    ?->plantillaPosition?->new_item_number
                ?? ($proposedKeyed->get($posId) ?? $currentSnapshots->get($posId))
                    ?->plantillaPosition?->old_item_number
                ?? 9999
            ))->values();

        if ($allPositionIds->isEmpty()) {
            return [
                'rows'            => [],
                'lbcCurrent'      => $lbcCurrent,
                'lbcProposed'     => $lbcProposed,
                'trancheCurrent'  => $trancheCurrent,
                'trancheProposed' => $trancheProposed,
            ];
        }

        $rows      = [];
        $newItemNo = 1;

        foreach ($allPositionIds as $positionId) {
            $proposed  = $proposedKeyed->get($positionId);   // budget year record (may be null)
            $current   = $currentSnapshots->get($positionId); // current year record (may be null)
            $plantilla = $proposed?->plantillaPosition ?? $current?->plantillaPosition;

            // ── Incumbent name: ALWAYS from BUDGET YEAR ───────────────────────
            // If vacant or missing in budget year → "Vacant"
            // Even if Person A held it in 2026, if 2027 is vacant → show "Vacant"
            $budgetYearPersonnel = $proposed?->personnel;
            $incumbentName = 'Vacant';
            if ($budgetYearPersonnel) {
                $parts = array_filter([
                    $budgetYearPersonnel->first_name,
                    $budgetYearPersonnel->middle_name
                        ? strtoupper(substr($budgetYearPersonnel->middle_name, 0, 1)) . '.'
                        : null,
                    $budgetYearPersonnel->last_name,
                    $budgetYearPersonnel->name_suffix ?? null,
                ]);
                $incumbentName = implode(' ', $parts) ?: 'Vacant';
            }

            // ── Current year column: ALWAYS from the current year snapshot ─────
            // These are the ACTUAL 2026 values for that position.
            // If no current year record exists → null/0 (truly new position).
            $currentSalaryGrade = $current?->salary_grade ?? null;
            $currentStep        = $current?->step         ?? null;
            $currentAmount      = (float) ($current?->annual_rate ?? 0);

            // ── Budget year column: from proposed snapshot ────────────────────
            // If position is vacant/missing in budget year → 0
            $proposedSalaryGrade = $proposed?->salary_grade ?? $currentSalaryGrade; // grade doesn't change
            $proposedStep        = $proposed?->step         ?? null;
            $proposedAmount      = (float) ($proposed?->annual_rate ?? 0);

            // ── Increase/Decrease ─────────────────────────────────────────────
            // Only meaningful when current year has data.
            // If position is new (no current record) → 0
            $increaseDecrease = ($current !== null)
                ? $proposedAmount - $currentAmount
                : 0.0;

            $rows[] = [
                'old_item_number'     => $plantilla?->old_item_number ?? null,
                'new_item_number'     => $plantilla?->new_item_number ?? (string) $newItemNo,
                'position_title'      => $plantilla?->position_title  ?? '',
                'incumbent'           => $incumbentName,
                'effective_date_note' => $proposed?->step_effective_date
                    ? $proposed->step_effective_date->format('M d, Y')
                    : null,

                // Separate grade for each column — grade is tied to position not person
                // but step and amount differ per year
                'salary_grade'        => $proposedSalaryGrade ?? $currentSalaryGrade,

                // Current year (2026) — real values from that year's snapshot
                'step_current'        => $currentStep,
                'current_amount'      => $currentAmount,

                // Budget year (2027) — proposed values
                'step_proposed'       => $proposedStep,
                'proposed_amount'     => $proposedAmount,

                'annual_increment'    => $proposed?->annual_increment !== null
                    ? (float) $proposed->annual_increment
                    : null,
                'increase_decrease'   => $increaseDecrease,
            ];
            $newItemNo++;
        }

        return [
            'rows'            => $rows,
            'lbcCurrent'      => $lbcCurrent,
            'lbcProposed'     => $lbcProposed,
            'trancheCurrent'  => $trancheCurrent,
            'trancheProposed' => $trancheProposed,
        ];
    }

    private function buildForm4($proposedPlan, Department $dept): array
    {
        $aipItems = DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
            ->orderBy('dept_bp_form4_item_id')->get();

        return [
            'rows' => $aipItems->map(fn ($item) => [
                'aip_reference_code'    => $item->aipProgram?->aip_reference_code,
                'program_description'   => $item->aipProgram?->program_description,
                'major_final_output'    => $item->major_final_output,
                'performance_indicator' => $item->performance_indicator,
                'target'                => $item->target,
                'ps_amount'             => (float) ($item->ps_amount    ?? 0),
                'mooe_amount'           => (float) ($item->mooe_amount  ?? 0),
                'co_amount'             => (float) ($item->co_amount    ?? 0),
                'total_amount'          => (float) ($item->total_amount ?? 0),
            ])->toArray(),
            'mandate'                => $dept->mandate                ?? '',
            'mission'                => $dept->mission                ?? '',
            'vision'                 => $dept->vision                 ?? '',
            'organizational_outcome' => $dept->organizational_outcome ?? '',
        ];
    }

    // ═══════════════════════════════════════════════════════
    // FORM 1 — EXPENSE / MDF / AIP / INCOME / LDRRMF
    // (Ported verbatim from LbpForm1Controller)
    // ═══════════════════════════════════════════════════════

    private function aggregateExpenseItems($expenseItems, $classifications, array $proposedPlanIds, array $currentPlanIds, array $pastPlanIds): array
    {
        $sum = fn (array $planIds, string $field) => $planIds
            ? BudgetPlanForm2Item::whereIn('dept_budget_plan_id', $planIds)
                ->selectRaw("expense_item_id, SUM({$field}) as total")
                ->groupBy('expense_item_id')->pluck('total', 'expense_item_id')
                ->map(fn ($v) => (float) $v)->toArray()
            : [];

        $proposedByItem = $sum($proposedPlanIds, 'total_amount');
        $currentSem1    = $sum($currentPlanIds,  'sem1_amount');
        $currentSem2    = $sum($currentPlanIds,  'sem2_amount');
        $currentTotal   = $sum($currentPlanIds,  'total_amount');
        $pastTotal      = $sum($pastPlanIds,      'total_amount');

        $allItemIds = array_unique(array_merge(array_keys($proposedByItem), array_keys($currentSem1), array_keys($pastTotal)));
        sort($allItemIds);

        $grouped = []; $clsOrder = [];
        foreach ($allItemIds as $itemId) {
            $item = $expenseItems->get($itemId);
            if (! $item) continue;
            $past = $pastTotal[$itemId]      ?? 0;
            $sem1 = $currentSem1[$itemId]    ?? 0;
            $sem2 = $currentSem2[$itemId]    ?? 0;
            $curr = $currentTotal[$itemId]   ?? 0;
            $prop = $proposedByItem[$itemId] ?? 0;
            if ($past == 0 && $sem1 == 0 && $sem2 == 0 && $curr == 0 && $prop == 0) continue;

            $clsId   = $item->expense_class_id;
            $clsName = $classifications->get($clsId)?->expense_class_name ?? 'Other';
            if (! isset($grouped[$clsId])) { $grouped[$clsId] = ['class_name' => $clsName, 'class_id' => $clsId, 'items' => []]; $clsOrder[] = $clsId; }
            $grouped[$clsId]['items'][] = [
                'item_id' => $itemId, 'name' => $item->expense_class_item_name,
                'account_code' => $item->expense_class_item_acc_code ?? '',
                'past_total' => $past, 'current_sem1' => $sem1, 'current_sem2' => $sem2,
                'current_total' => $curr, 'proposed' => $prop,
            ];
        }
        $result = [];
        foreach ($clsOrder as $clsId) $result[] = $grouped[$clsId];
        return $result;
    }

    private function aggregateMdfRegularItems(int $proposedBpId, ?int $currentBpId, ?int $pastBpId): array
    {
        $items = MdfItem::where('is_active', true)->whereNull('obligation_id')
            ->orderBy('sort_order')->orderBy('name')->get();
        if ($items->isEmpty()) return [];

        $itemIds         = $items->pluck('item_id')->toArray();
        $relevantPlanIds = array_values(array_filter([$proposedBpId, $currentBpId, $pastBpId]));
        $snapshots       = MdfSnapshot::whereIn('item_id', $itemIds)->whereIn('budget_plan_id', $relevantPlanIds)
            ->get()->groupBy('item_id');

        $rows = [];
        foreach ($items as $item) {
            $byPlan      = ($snapshots->get($item->item_id) ?? collect())->keyBy('budget_plan_id');
            $activeSnap  = $byPlan->get($proposedBpId);
            $currentSnap = $currentBpId ? $byPlan->get($currentBpId) : null;
            $pastSnap    = $pastBpId    ? $byPlan->get($pastBpId)    : null;
            $past = (float) ($pastSnap?->total_amount    ?? 0);
            $cur  = (float) ($currentSnap?->total_amount ?? 0);
            $sem1 = (float) ($currentSnap?->sem1_actual  ?? 0);
            $prop = (float) ($activeSnap?->total_amount  ?? 0);
            if ($past == 0 && $cur == 0 && $prop == 0) continue;
            $rows[] = [
                'name' => $item->name, 'account_code' => $item->account_code ?? '',
                'past_total' => $past, 'current_sem1' => $sem1, 'current_sem2' => max(0, $cur - $sem1),
                'current_total' => $cur, 'proposed' => $prop,
            ];
        }
        return $rows;
    }

    private function aggregateMdfDebtRows(int $proposedBpId, ?int $currentBpId, ?int $pastBpId): array
    {
        $obligations = DebtObligation::where('is_active', true)->orderBy('sort_order')->orderBy('obligation_id')->get();
        if ($obligations->isEmpty()) return [];

        $relevantPlanIds = array_values(array_filter([$proposedBpId, $currentBpId, $pastBpId]));
        $payments = DebtPayment::whereIn('obligation_id', $obligations->pluck('obligation_id'))
            ->whereIn('budget_plan_id', $relevantPlanIds)->get()
            ->groupBy(fn ($p) => "{$p->obligation_id}_{$p->budget_plan_id}");

        $pay = fn (int $obId, ?int $planId, string $field): float =>
            $planId ? (float) ($payments->get("{$obId}_{$planId}")?->first()?->$field ?? 0) : 0.0;

        $rows = [];
        foreach ($obligations as $ob) {
            foreach (['principal', 'interest'] as $type) {
                $dueField = $type === 'principal' ? 'principal_due'  : 'interest_due';
                $s1Field  = $type === 'principal' ? 'principal_sem1' : 'interest_sem1';
                $past = $pay($ob->obligation_id, $pastBpId,     $dueField);
                $cur  = $pay($ob->obligation_id, $currentBpId,  $dueField);
                $sem1 = $pay($ob->obligation_id, $currentBpId,  $s1Field);
                $prop = $pay($ob->obligation_id, $proposedBpId, $dueField);
                if ($past == 0 && $cur == 0 && $prop == 0) continue;
                $rows[] = [
                    'obligation_name' => $ob->creditor, 'debt_type' => $type, 'account_code' => '',
                    'past_total' => $past, 'current_sem1' => $sem1, 'current_sem2' => max(0, $cur - $sem1),
                    'current_total' => $cur, 'proposed' => $prop,
                ];
            }
        }
        return $rows;
    }

    private function aggregateAipPrograms(array $deptIds, int $proposedBpId, ?int $currentBpId, ?int $pastBpId): array
    {
        $proposedDeptPlanIds = DepartmentBudgetPlan::where('budget_plan_id', $proposedBpId)->whereIn('dept_id', $deptIds)
            ->pluck('dept_budget_plan_id', 'dept_id')->toArray();
        $currentDeptPlanIds  = $currentBpId
            ? DepartmentBudgetPlan::where('budget_plan_id', $currentBpId)->whereIn('dept_id', $deptIds)
                ->pluck('dept_budget_plan_id', 'dept_id')->toArray()
            : [];
        $pastDeptPlanIds     = $pastBpId
            ? DepartmentBudgetPlan::where('budget_plan_id', $pastBpId)->whereIn('dept_id', $deptIds)
                ->pluck('dept_budget_plan_id', 'dept_id')->toArray()
            : [];

        $proposedItems = DeptBpForm4Item::with('aipProgram')
            ->whereIn('dept_budget_plan_id', array_values($proposedDeptPlanIds))->get();
        $currentItems  = $currentBpId
            ? DeptBpForm4Item::with('aipProgram')
                ->whereIn('dept_budget_plan_id', array_values($currentDeptPlanIds))->get()->groupBy('aip_program_id')
            : collect();
        $pastItems     = $pastBpId
            ? DeptBpForm4Item::with('aipProgram')
                ->whereIn('dept_budget_plan_id', array_values($pastDeptPlanIds))->get()->groupBy('aip_program_id')
            : collect();

        $planToDept = array_flip($proposedDeptPlanIds);
        $rows = [];
        foreach ($proposedItems as $item) {
            $aipId   = $item->aip_program_id;
            $deptId  = $planToDept[$item->dept_budget_plan_id] ?? 0;
            $curGrp  = $currentItems->get($aipId, collect());
            $pastGrp = $pastItems->get($aipId, collect());
            $rows[]  = [
                'dept_id' => $deptId,
                'aip_reference_code'  => $item->aipProgram?->aip_reference_code ?? '',
                'program_description' => $item->aipProgram?->program_description ?? '–',
                'past_total'          => (float) $pastGrp->sum('total_amount'),
                'current_sem1'        => (float) $curGrp->sum('sem1_amount'),
                'current_sem2'        => (float) $curGrp->sum('sem2_amount'),
                'current_total'       => (float) $curGrp->sum('total_amount'),
                'proposed'            => (float) $item->total_amount,
            ];
        }
        usort($rows, fn ($a, $b) => $a['dept_id'] <=> $b['dept_id'] ?: strcmp($a['aip_reference_code'], $b['aip_reference_code']));
        return $rows;
    }

    private function buildIncomeFundData(string $source, int $proposedBpId, ?int $currentBpId, ?int $pastBpId): array
    {
        $objects = IncomeFundObject::where('source', $source)->orderBy('sort_order')->get();

        // $loadAmounts = function (?int $bpId) use ($source): array {
        //     if (! $bpId) return [];
        //     return IncomeFundAmount::where('budget_plan_id', $bpId)->where('source', $source)->get()
        //         ->keyBy('income_fund_object_id')
        //         ->map(fn ($r) => [
        //             'sem1_actual'     => (float) $r->sem1_actual,
        //             'sem2_actual'     => (float) $r->sem2_actual,
        //             'proposed_amount' => (float) $r->proposed_amount,
        //         ])->toArray();
        // };
        $loadAmounts = function (?int $bpId) use ($source): array {
            if (! $bpId) return [];
            return IncomeFundAmount::where('budget_plan_id', $bpId)->where('source', $source)->get()
                ->keyBy('income_fund_object_id')
                ->map(fn ($r) => [
                    'sem1_actual'       => (float) $r->sem1_actual,
                    'sem2_actual'       => (float) $r->sem2_actual,
                    'proposed_amount'   => (float) $r->proposed_amount,
                    'obligation_amount' => (float) ($r->obligation_amount ?? 0),
                ])->toArray();
        };

        $pastAmts     = $loadAmounts($pastBpId);
        $currentAmts  = $loadAmounts($currentBpId);
        $proposedAmts = $loadAmounts($proposedBpId);

        $rawRows = [];
        $idToRow = [];
        $nameToId= [];

        foreach ($objects as $obj) {
            $id   = $obj->id;
            $past = $pastAmts[$id]     ?? [];
            $cur  = $currentAmts[$id]  ?? [];
            $prop = $proposedAmts[$id] ?? [];
            // $row  = [
            //     'id' => $id, 'parent_id' => $obj->parent_id, 'name' => $obj->name,
            //     'code' => $obj->code, 'level' => (int) $obj->level, 'is_subtotal' => false,
            //     'past_total'    => $past['proposed_amount'] ?? 0.0,
            //     'current_sem1'  => $cur['sem1_actual']      ?? 0.0,
            //     'current_sem2'  => $cur['sem2_actual']      ?? 0.0,
            //     'current_total' => $cur['proposed_amount']  ?? 0.0,
            //     'proposed'      => $prop['proposed_amount'] ?? 0.0,
            // ];
            $row  = [
                'id' => $id, 'parent_id' => $obj->parent_id, 'name' => $obj->name,
                'code' => $obj->code, 'level' => (int) $obj->level, 'is_subtotal' => false,
                'past_total'    => $past['obligation_amount'] ?? ($past['proposed_amount'] ?? 0.0), // use obligation if available
                'current_sem1'  => $cur['sem1_actual']        ?? 0.0,
                'current_sem2'  => $cur['sem2_actual']         ?? 0.0,
                'current_total' => $cur['proposed_amount']     ?? 0.0,
                'proposed'      => $prop['proposed_amount']    ?? 0.0,
            ];
            $rawRows[]            = $row;
            $idToRow[$id]         = $row;
            $nameToId[$obj->name] = $id;
        }

        $childrenMap = [];
        foreach ($rawRows as $r) if ($r['parent_id'] !== null) $childrenMap[$r['parent_id']][] = $r['id'];

        $sumDesc = function (int $pid, string $field) use (&$sumDesc, &$idToRow, &$childrenMap): float {
            $total = 0.0;
            foreach ($childrenMap[$pid] ?? [] as $cid) {
                $child = $idToRow[$cid] ?? null;
                if ($child) $total += (float) ($child[$field] ?? 0);
                $total += $sumDesc($cid, $field);
            }
            return $total;
        };

        $subtotalConfigs = [
            'general-fund' => [
                ['afterId' => 13,  'name' => 'Total Tax Revenue',         'level' => 3, 'parentId' => 4  ],
                ['afterId' => 32,  'name' => 'Total Non-Tax Revenue',     'level' => 3, 'parentId' => 14 ],
                ['afterId' => 44,  'name' => 'Total External Sources',    'level' => 2, 'parentId' => 33 ],
                ['afterId' => 49,  'name' => 'Total Non-Income Receipts', 'level' => 2, 'parentId' => 45 ],
            ],
            'default' => [
                ['afterName' => 'iii. Other Taxes',        'name' => 'Total Tax Revenue',         'level' => 3, 'parentName' => '1. Tax Revenue'         ],
                ['afterName' => 'c. Other Service Income', 'name' => 'Total Non-Tax Revenue',     'level' => 3, 'parentName' => '2. Non-Tax Revenue'     ],
                ['afterName' => 'd. Subsidy from OCC',     'name' => 'Total External Sources',    'level' => 2, 'parentName' => 'B. External Source'     ],
                ['afterName' => 'a. Acquisition of Loans','name' => 'Total Non-Income Receipts', 'level' => 2, 'parentName' => 'C. Non-Income Receipts' ],
            ],
        ];

        $configs = $subtotalConfigs[$source] ?? $subtotalConfigs['default'];
        $result  = [];

        foreach ($rawRows as $row) {
            $result[] = $row;
            foreach ($configs as $cfg) {
                $triggered = false;
                if (isset($cfg['afterId'])   && $cfg['afterId']   === $row['id'])   $triggered = true;
                if (isset($cfg['afterName']) && $cfg['afterName'] === $row['name']) $triggered = true;
                if (! $triggered) continue;

                $parentId = $cfg['parentId'] ?? ($nameToId[$cfg['parentName'] ?? ''] ?? null);
                if (! $parentId) continue;

                $fields5  = ['past_total', 'current_sem1', 'current_sem2', 'current_total', 'proposed'];
                $result[] = [
                    'id' => null, 'parent_id' => null, 'name' => $cfg['name'],
                    'code' => '', 'level' => $cfg['level'], 'is_subtotal' => true,
                    'past_total'    => $sumDesc($parentId, 'past_total'),
                    'current_sem1'  => $sumDesc($parentId, 'current_sem1'),
                    'current_sem2'  => $sumDesc($parentId, 'current_sem2'),
                    'current_total' => $sumDesc($parentId, 'current_total'),
                    'proposed'      => $sumDesc($parentId, 'proposed'),
                ];
            }
        }
        return $result;
    }

    private function buildLdrrmfRows(string $source, int $proposedBpId, ?int $currentBpId, ?int $pastBpId): array
    {
        $computeCalamityFund = function (?int $bpId) use ($source): float {
            if (! $bpId) return 0.0;
            try {
                $nonIncomeParent = \DB::table('income_fund_objects')
                    ->where('source', $source)->whereRaw("LOWER(name) LIKE '%non-income receipt%'")->first(['id']);
                if (! $nonIncomeParent && $source === 'general-fund')
                    $nonIncomeParent = \DB::table('income_fund_objects')->whereRaw("LOWER(name) LIKE '%non-income receipt%'")->first(['id']);

                $excludeIds = [];
                if ($nonIncomeParent) {
                    $excludeIds = $this->collectDescendantIds($nonIncomeParent->id);
                    $excludeIds[] = $nonIncomeParent->id;
                }
                $query = \DB::table('income_fund_amounts')->where('budget_plan_id', $bpId)->where('source', $source);
                if (! empty($excludeIds)) $query->whereNotIn('income_fund_object_id', $excludeIds);
                return round((float) $query->sum('proposed_amount') * 0.05, 2);
            } catch (\Throwable) { return 0.0; }
        };

        $compute70 = fn (?int $bpId): float => $bpId
            ? (float) \DB::table('ldrrmfip_items')->where('budget_plan_id', $bpId)->where('source', $source)
                ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')->value('grand')
            : 0.0;

        $past5  = $computeCalamityFund($pastBpId);
        $curr5  = $computeCalamityFund($currentBpId);
        $prop5  = $computeCalamityFund($proposedBpId);
        $past70 = $compute70($pastBpId);
        $curr70 = $compute70($currentBpId);
        $prop70 = $compute70($proposedBpId);

        if ($past5 == 0 && $curr5 == 0 && $prop5 == 0) return [];

        return [
            ['name' => '5% LDRRM Fund Prog./Proj. (net of 70%PdA)', 'account_code' => '5-02', 'kind' => 'ldrrmf',
             'past_total' => max(0, $past5 - $past70), 'current_sem1' => 0.0, 'current_sem2' => 0.0,
             'current_total' => max(0, $curr5 - $curr70), 'proposed' => max(0, $prop5 - $prop70)],
            ['name' => '70% Pre-Disaster Act. (JMC 2013-1, R.A. 10121)', 'account_code' => '5-02', 'kind' => 'ldrrmf-70',
             'past_total' => $past70, 'current_sem1' => 0.0, 'current_sem2' => 0.0,
             'current_total' => $curr70, 'proposed' => $prop70],
        ];
    }

    // ═══════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════

    private function resolveVersionFromSnapshots($snapshots): ?SalaryStandardVersion
    {
        foreach ($snapshots as $snap) {
            if (! empty($snap->salary_standard_version_id)) {
                $version = SalaryStandardVersion::find($snap->salary_standard_version_id);
                if ($version) return $version;
            }
            if ($snap->salary_grade && $snap->step && $snap->monthly_rate) {
                $gradeStep = SalaryGradeStep::with('version')
                    ->where('salary_grade', $snap->salary_grade)
                    ->where('step', $snap->step)
                    ->where('salary', $snap->monthly_rate)->first();
                if ($gradeStep?->version) return $gradeStep->version;
            }
        }
        return null;
    }

    private function formatTranche(?SalaryStandardVersion $version): ?string
    {
        if (! $version) return null;
        $parts = array_filter([$version->tranche ?? null, $version->income_class ?? null]);
        return implode(', ', $parts) ?: null;
    }

    private function sourceKeyForDept($dept): string
    {
        $abbr = strtolower($dept->dept_abbreviation ?? '');
        $name = strtolower($dept->dept_name ?? '');
        if ($abbr === 'sh'  || str_contains($name, 'slaughter'))      return 'sh';
        if ($abbr === 'occ' || str_contains($name, 'opol community')) return 'occ';
        if ($abbr === 'pm'  || str_contains($name, 'public market'))  return 'pm';
        return strtolower($abbr) ?: 'general-fund';
    }

    private function collectDescendantIds(int $parentId): array
    {
        $ids = [];
        $children = \DB::table('income_fund_objects')->where('parent_id', $parentId)->pluck('id');
        foreach ($children as $childId) {
            $ids[] = $childId;
            array_push($ids, ...$this->collectDescendantIds($childId));
        }
        return $ids;
    }

    // ═══════════════════════════════════════════════════════
    // SIGNATORY HELPER
    // Returns ['name' => '...', 'title' => '...'] for a given keyword
    // Searches plantilla_positions by position_title LIKE %keyword%
    // then gets the latest assignment → personnel full name.
    // ═══════════════════════════════════════════════════════
    private function getSignatory(string $keyword, ?int $deptId = null): array
    {
        $query = PlantillaPosition::with(['assignments.personnel'])
            ->where('is_active', true)
            ->whereRaw('LOWER(position_title) LIKE ?', ['%' . strtolower($keyword) . '%']);

        if ($deptId !== null) {
            $query->where('dept_id', $deptId);
        }

        // Lowest new_item_number = 1st/head position
        $position = $query->orderByRaw('CAST(new_item_number AS UNSIGNED)')->first();

        if (! $position) {
            return ['name' => strtoupper($keyword), 'title' => ucwords($keyword)];
        }

        $assignment = $position->assignments->first();
        $personnel  = $assignment?->personnel;

        $name = 'Vacant';
        if ($personnel) {
            $parts = array_filter([
                $personnel->first_name  ?? null,
                $personnel->middle_name ? strtoupper(substr($personnel->middle_name, 0, 1)) . '.' : null,
                $personnel->last_name   ?? null,
            ]);
            $name = implode(' ', $parts) ?: 'Vacant';
        }

        return [
            'name'  => strtoupper($name),
            'title' => $position->position_title,
        ];
    }

    // Fetch all signatories needed across all forms
    // private function buildSignatories(): array
    // {
    //     // Fetch 1st position of each specific department by dept_name keyword
    //     // Using name instead of abbreviation avoids parentheses/format issues
    //     return [
    //         'budget_officer'  => $this->getDeptHeadByName('budget'),
    //         'administrator'   => $this->getDeptHeadByName('administration'),
    //         'mpdc'            => $this->getDeptHeadByName('planning and development'),
    //         'treasurer'       => $this->getDeptHeadByName('treasurer'),
    //         'mayor'           => $this->getDeptHeadByName('mayor'),
    //         'hrmo'            => $this->getDeptHeadByName('human resources'),
    //         'accountant'      => $this->getDeptHeadByName('accounting'),
    //     ];
    // }
    private function buildSignatories(): array
    {
        return [
            'budget_officer'  => $this->getDeptHeadByName('budget'),
            'administrator'   => $this->getDeptHeadByName('administration'),
            'mpdc'            => $this->getDeptHeadByName('planning and development'),
            'treasurer'       => $this->getDeptHeadByName('treasurer'),
            'mayor'           => $this->getDeptHeadByName('mayor'),
            'hrmo'            => $this->getDeptHeadByName('human resources'),
            'accountant'      => $this->getDeptHeadByName('accounting'),
            'drrm_officer'    => $this->getDeptHeadByName('disaster'),
        ];
    }

    private function getDeptHeadByName(string $keyword): array
    {
        $dept = Department::whereRaw('LOWER(dept_name) LIKE ?', ['%' . strtolower($keyword) . '%'])
            ->first();

        if (! $dept) {
            return ['name' => strtoupper($keyword), 'title' => ucwords($keyword)];
        }

        return $this->getDeptHead($dept->dept_id);
    }

    // Get the 1st position of a specific department (for Form 2 "Prepared by")
    // ═══════════════════════════════════════════════════════
    // DEPARTMENT HEAD OVERRIDES
    // Some departments don't have plantilla positions or the
    // actual head is not in the plantilla. Add overrides here.
    // Key = dept_name substring (lowercase), value = [name, title]
    // ═══════════════════════════════════════════════════════
    private function getDeptHeadOverrides(): array
    {
        return [
            'circuit trial court' => [
                'name'  => 'ATTY. JAYFRANCIS D. BAGO',
                'title' => 'Municipal Mayor',
            ],
            'local governance operations' => [
                'name'  => 'CONSUELO B. BARBASO',
                'title' => 'MLGOO-DILG',
            ],
            'philippine national police' => [
                'name'  => 'P/Maj. TEODORO P. DE ORO',
                'title' => 'Chief OMPS',
            ],
            'bureau of fire' => [
                'name'  => 'F/SINSP HARLEY GLENN B. GALPO',
                'title' => 'Fire Marshall - Opol BFP',
            ],
            'hrmo' => [
                'name'  => 'JOSEPH A. ACTUB',
                'title' => 'HRMO Designate',
            ],
        ];
    }

    private function getDeptHead(int $deptId): array
    {
        // Check override table first
        $dept = Department::find($deptId);
        if ($dept) {
            foreach ($this->getDeptHeadOverrides() as $keyword => $sig) {
                if (str_contains(strtolower($dept->dept_name), $keyword)) {
                    return $sig;
                }
            }
        }

        $position = PlantillaPosition::with(['assignments.personnel'])
            ->where('dept_id', $deptId)
            ->where('is_active', true)
            ->orderByRaw('CAST(new_item_number AS UNSIGNED)')
            ->first();

        if (! $position) {
            return ['name' => 'DEPARTMENT HEAD', 'title' => 'Department Head'];
        }

        // Just get whoever is assigned to this position
        $assignment = $position->assignments->first();
        $personnel  = $assignment?->personnel;

        $name = 'Vacant';
        if ($personnel) {
            $parts = array_filter([
                $personnel->first_name  ?? null,
                $personnel->middle_name ? strtoupper(substr($personnel->middle_name, 0, 1)) . '.' : null,
                $personnel->last_name   ?? null,
            ]);
            $name = implode(' ', $parts) ?: 'Vacant';
        }

        return [
            'name'  => strtoupper($name),
            'title' => $position->position_title,
        ];
    }

    private function clearViewCache(): void
    {
        $viewsDir = storage_path('framework/views');
        if (! is_dir($viewsDir)) return;
        $files = glob($viewsDir . DIRECTORY_SEPARATOR . '*.php');
        if ($files) foreach ($files as $f) @unlink($f);
    }

}
