<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\BudgetPlanForm3Assignment;
use App\Models\Department;
use App\Models\DepartmentBudgetPlan;
use App\Models\DepartmentCategory;
use App\Models\IncomeFundAmount;
use App\Models\IncomeFundObject;
use App\Models\PlantillaPosition;
use App\Models\SalaryGradeStep;
use App\Models\SalaryStandardVersion;
use App\Models\BudgetPlanForm2Item;
use App\Models\DeptBpForm4Item;
use App\Models\Form6Template;
use App\Models\Form6Item;
use App\Models\LdrrmfipItem;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;
use Illuminate\Support\Collection;

/**
 * LEPReportController
 * ═══════════════════════════════════════════════════════════════════════════
 * Generates Local Expenditure Program (LEP) PDF reports.
 */
class LEPReportController extends Controller
{
    // ═══════════════════════════════════════════════════════
    // POST /api/reports/lep/consolidated-plantilla
    // ═══════════════════════════════════════════════════════
    public function consolidatedPlantilla(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        try {
            $this->clearViewCache();
            $data = $this->buildConsolidatedPlantillaData((int) $request->budget_plan_id);
            $html = $this->renderConsolidatedPlantilla($data);
            $pdf  = $this->makePdf($html, 'portrait');

            return $this->pdfResponse(
                $pdf,
                "LEP_ConsolidatedPlantilla_FY{$data['proposed_year']}.pdf",
                $request->boolean('download')
            );
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ═══════════════════════════════════════════════════════
    // DATA BUILDER: Consolidated Plantilla of Personnel
    // ═══════════════════════════════════════════════════════
    private function buildConsolidatedPlantillaData(int $budgetPlanId): array
    {
        $activePlan   = BudgetPlan::findOrFail($budgetPlanId);
        $proposedYear = (int) $activePlan->year;
        $currentYear  = $proposedYear - 1;

        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        $header = $this->getLepHeaderSettings($budgetPlanId, $activePlan);

        $specialCategoryId = DepartmentCategory::whereRaw(
            "LOWER(dept_category_name) LIKE '%special account%'"
        )->value('dept_category_id');

        $allDepartments = Department::with('category')->orderBy('dept_id')->get();
        $generalDepts   = $allDepartments->filter(fn ($d) => $d->dept_category_id !== $specialCategoryId);
        $specialDepts   = $allDepartments->filter(fn ($d) => $d->dept_category_id === $specialCategoryId);

        $specialAccountTotals = $this->getSpecialAccountTotals($budgetPlanId, $specialDepts);

        $sections = [];

        $gfRows = $this->buildPlantillaRows(
            $budgetPlanId,
            $currentPlan?->budget_plan_id,
            $generalDepts->pluck('dept_id')->toArray(),
            $proposedYear,
            $currentYear,
            true
        );
        $sections[] = [
            'section_label' => 'A. GENERAL FUND',
            'is_special'    => false,
            'dept_groups'   => $gfRows,
        ];

        $bIdx = 1;
        foreach ($specialDepts as $dept) {
            $rows = $this->buildPlantillaRows(
                $budgetPlanId,
                $currentPlan?->budget_plan_id,
                [$dept->dept_id],
                $proposedYear,
                $currentYear,
                false
            );
            $sections[] = [
                'section_label' => "B.{$bIdx}. SPECIAL ACCOUNT: " . strtoupper($dept->dept_name),
                'is_special'    => true,
                'dept_groups'   => $rows,
            ];
            $bIdx++;
        }

        $grandCurrentTotal  = 0.0;
        $grandProposedTotal = 0.0;
        foreach ($sections as $sec) {
            foreach ($sec['dept_groups'] as $grp) {
                $grandCurrentTotal  += $grp['total_current'];
                $grandProposedTotal += $grp['total_proposed'];
            }
        }

        $generalFundProposedTotal = $this->getIncomeFundTotal($budgetPlanId, 'general-fund');
        $lepLbcInfo = $this->resolveLbcInfo($budgetPlanId, $proposedYear);

        return [
            'proposed_year'          => $proposedYear,
            'current_year'           => $currentYear,
            'header'                 => $header,
            'sections'               => $sections,
            'special_account_totals' => $specialAccountTotals,
            'grand_current_total'    => $grandCurrentTotal,
            'grand_proposed_total'   => $generalFundProposedTotal,
            'lep_lbc_current'        => $lepLbcInfo['lbc_current'],
            'lep_lbc_proposed'       => $lepLbcInfo['lbc_proposed'],
            'lep_tranche_current'    => $lepLbcInfo['tranche_current'],
            'lep_tranche_proposed'   => $lepLbcInfo['tranche_proposed'],
            'signatories'            => $this->buildSignatories(),
        ];
    }

    // ─── Build plantilla rows ─────────────────────────────────────────────
    private function buildPlantillaRows(
        int   $proposedBpId,
        ?int  $currentBpId,
        array $deptIds,
        int   $proposedYear,
        int   $currentYear,
        bool  $groupByDept
    ): array {
        $groups = [];
        $deptCollection = Department::whereIn('dept_id', $deptIds)->orderBy('dept_id')->get();

        foreach ($deptCollection as $dept) {
            $proposedPlan = DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                ->where('budget_plan_id', $proposedBpId)->first();
            $currentPlan  = $currentBpId
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $currentBpId)->first()
                : null;

            if (!$proposedPlan) continue;

            $proposedSnapshots = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)->get();
            $currentSnapshotsRaw = $currentPlan
                ? BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                    ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)->get()
                : collect();

            $proposedVersion = $this->resolveVersionFromSnapshots($proposedSnapshots)
                ?? SalaryStandardVersion::where('is_active', true)->first();
            $currentVersion  = $this->resolveVersionFromSnapshots($currentSnapshotsRaw) ?? $proposedVersion;

            $lbcCurrent  = $currentVersion?->lbc_reference  ?? null;
            $lbcProposed = $proposedVersion?->lbc_reference  ?? null;
            $trancheCur  = $this->formatTranche($currentVersion);
            $tranchePro  = $this->formatTranche($proposedVersion);

            $proposedKeyed    = $proposedSnapshots->keyBy('plantilla_position_id');
            $currentSnapshots = $currentSnapshotsRaw->keyBy('plantilla_position_id');

            // ── Master list: UNION of both years ──────────────────────────────
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

            $rows      = [];
            $newItemNo = 1;

            foreach ($allPositionIds as $positionId) {
                $proposed  = $proposedKeyed->get($positionId);
                $current   = $currentSnapshots->get($positionId);
                $plantilla = $proposed?->plantillaPosition ?? $current?->plantillaPosition;

                // ── Name: always from budget year ─────────────────────────────
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

                // ── Current year: real 2026 snapshot values ───────────────────
                $currentStep   = $current?->step        ?? null;
                $currentAmount = (float) ($current?->annual_rate ?? 0);

                // ── Budget year: proposed snapshot values ─────────────────────
                $proposedStep   = $proposed?->step       ?? null;
                $proposedAmount = (float) ($proposed?->annual_rate ?? 0);

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
                    'salary_grade'        => $proposed?->salary_grade ?? $current?->salary_grade ?? null,
                    'step_current'        => $currentStep,
                    'current_amount'      => $currentAmount,
                    'step_proposed'       => $proposedStep,
                    'proposed_amount'     => $proposedAmount,
                    'annual_increment'    => $proposed?->annual_increment !== null
                        ? (float) $proposed->annual_increment
                        : null,
                    'increase_decrease'   => $increaseDecrease,
                ];
                $newItemNo++;
            }

            $totalCurrent  = array_sum(array_column($rows, 'current_amount'));
            $totalProposed = array_sum(array_column($rows, 'proposed_amount'));

            $groups[] = [
                'dept_id'        => $dept->dept_id,
                'dept_name'      => strtoupper($dept->dept_name),
                'dept_abbr'      => strtoupper($dept->dept_abbreviation ?? ''),
                'lbc_current'    => $lbcCurrent,
                'lbc_proposed'   => $lbcProposed,
                'tranche_cur'    => $trancheCur,
                'tranche_pro'    => $tranchePro,
                'rows'           => $rows,
                'total_current'  => $totalCurrent,
                'total_proposed' => $totalProposed,
            ];
        }

        return $groups;
    }

    private function getIncomeFundTotal(int $budgetPlanId, string $source): float
    {
        $nonIncomeParent = \DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
            ->first(['id']);

        $excludeIds = [];
        if ($nonIncomeParent) {
            $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
            $excludeIds[] = $nonIncomeParent->id;
        }

        $beginningCashObj = \DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereRaw("LOWER(name) LIKE '%beginning cash%'")
            ->first(['id']);

        $beginningCash = 0.0;
        if ($beginningCashObj) {
            $beginningCash = (float) \DB::table('income_fund_amounts')
                ->where('budget_plan_id', $budgetPlanId)
                ->where('income_fund_object_id', $beginningCashObj->id)
                ->value('proposed_amount');
        }

        $allObjectIds = \DB::table('income_fund_objects')
            ->where('source', $source)
            ->pluck('id');

        $parentIds = \DB::table('income_fund_objects')
            ->where('source', $source)
            ->whereNotNull('parent_id')
            ->pluck('parent_id')
            ->unique();

        $leafIds = $allObjectIds->diff($parentIds)->values();

        $query = \DB::table('income_fund_amounts')
            ->where('budget_plan_id', $budgetPlanId)
            ->where('source', $source)
            ->whereNotIn('income_fund_object_id', $excludeIds)
            ->whereIn('income_fund_object_id', $leafIds);

        return $beginningCash + (float) $query->sum('proposed_amount');
    }

    // ─── Special account income fund totals ──────────────────────────────
    private function getSpecialAccountTotals(int $budgetPlanId, $specialDepts): array
    {
        $totals     = [];
        $grandTotal = 0.0;

        foreach ($specialDepts as $dept) {
            $source = $this->resolveSourceKey($dept);

            $nonIncomeParent = \DB::table('income_fund_objects')
                ->where('source', $source)
                ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
                ->first(['id']);

            $excludeIds = [];
            if ($nonIncomeParent) {
                $excludeIds   = $this->collectDescendantIds($nonIncomeParent->id);
                $excludeIds[] = $nonIncomeParent->id;
            }

            $query = \DB::table('income_fund_amounts')
                ->where('budget_plan_id', $budgetPlanId)
                ->where('source', $source);
            if (!empty($excludeIds)) {
                $query->whereNotIn('income_fund_object_id', $excludeIds);
            }

            $amount = (float) $query->sum('proposed_amount');
            $grandTotal += $amount;

            $totals[] = [
                'dept_name' => $dept->dept_name,
                'dept_abbr' => strtoupper($dept->dept_abbreviation ?? ''),
                'source'    => $source,
                'amount'    => $amount,
            ];
        }

        return [
            'items'       => $totals,
            'grand_total' => $grandTotal,
        ];
    }

    // ─── Resolve LBC / tranche ────────────────────────────────────────────
    private function resolveLbcInfo(int $budgetPlanId, int $proposedYear): array
    {
        $currentYear = $proposedYear - 1;
        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        $anyProposed = BudgetPlanForm3Assignment::whereHas('budgetPlan', function ($q) use ($budgetPlanId) {
            $q->where('budget_plan_id', $budgetPlanId);
        })->first();

        $anyCurrent = $currentPlan
            ? BudgetPlanForm3Assignment::whereHas('budgetPlan', function ($q) use ($currentPlan) {
                $q->where('budget_plan_id', $currentPlan->budget_plan_id);
            })->first()
            : null;

        $proposedVersion = $anyProposed?->salary_standard_version_id
            ? SalaryStandardVersion::find($anyProposed->salary_standard_version_id)
            : SalaryStandardVersion::where('is_active', true)->first();

        $currentVersion = $anyCurrent?->salary_standard_version_id
            ? SalaryStandardVersion::find($anyCurrent->salary_standard_version_id)
            : $proposedVersion;

        return [
            'lbc_current'      => $currentVersion?->lbc_reference  ?? null,
            'lbc_proposed'     => $proposedVersion?->lbc_reference  ?? null,
            'tranche_current'  => $this->formatTranche($currentVersion),
            'tranche_proposed' => $this->formatTranche($proposedVersion),
        ];
    }

    // ─── LEP header settings ──────────────────────────────────────────────
    private function getLepHeaderSettings(int $budgetPlanId, BudgetPlan $plan): array
    {
        try {
            $settings = \DB::table('lep_header_settings')
                ->where('budget_plan_id', $budgetPlanId)
                ->first();
            if ($settings) return (array) $settings;
        } catch (\Throwable) {}

        $lgu = $plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL';

        return [
            'province'                     => 'Province of Misamis Oriental',
            'municipality'                 => 'MUNICIPALITY OF ' . strtoupper($lgu),
            'office_name'                  => 'OFFICE OF THE SANGGUNIANG BAYAN',
            'office_subtitle'              => 'MUNICIPALITY OF ' . strtoupper($lgu),
            'ordinance_session'            => '2ND SPECIAL SESSION',
            'session_date_text'            => "Began and held at its Mun. Session Hall on the ___ day of ________ Two Thousand Twenty Five at SB Session Hall, {$lgu}, Misamis Oriental",
            'ordinance_number'             => 'APPROPRIATION ORDINANCE NO. ' . $plan->year . ' - ___',
            'ordinance_title'              => 'AN ORDINANCE AUTHORIZING THE ' . $plan->year . ' ANNUAL BUDGET OF ' . strtoupper($lgu),
            'total_budget'                 => 0.0,
            'general_fund_amount'          => 0.0,
            'total_special_account_amount' => 0.0,
            'introduced_by'                => '',
        ];
    }

    // ═══════════════════════════════════════════════════════
    // HTML RENDERER
    // ═══════════════════════════════════════════════════════
    private function renderConsolidatedPlantilla(array $data): string
    {
        $this->clearViewCache();
        return view('reports.lep.lepreport', array_merge($data, ['report_type' => 'consolidated_plantilla']))->render();
    }

    // ═══════════════════════════════════════════════════════
    // POST /api/reports/lep/receipts-program
    // ═══════════════════════════════════════════════════════
    public function receiptsProgram(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        try {
            $this->clearViewCache();
            $data = $this->buildReceiptsProgramData((int) $request->budget_plan_id);
            $html = $this->renderReceiptsProgram($data);
            $pdf  = $this->makePdf($html, 'portrait');

            return $this->pdfResponse(
                $pdf,
                "LEP_ReceiptsProgram_FY{$data['proposed_year']}.pdf",
                $request->boolean('download')
            );
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    private function buildReceiptsProgramData(int $budgetPlanId): array
    {
        $activePlan   = BudgetPlan::findOrFail($budgetPlanId);
        $proposedYear = (int) $activePlan->year;
        $currentYear  = $proposedYear - 1;
        $pastYear     = $proposedYear - 2;

        $currentPlan = BudgetPlan::where('year', $currentYear)->first();
        $pastPlan    = BudgetPlan::where('year', $pastYear)->first();

        $specialCategoryId = DepartmentCategory::whereRaw(
            "LOWER(dept_category_name) LIKE '%special account%'"
        )->value('dept_category_id');

        $allDepartments = Department::with('category')->orderBy('dept_id')->get();
        $specialDepts   = $allDepartments->filter(fn ($d) => $d->dept_category_id === $specialCategoryId);

        $forms = [];
        $bIdx  = 1;

        $forms[] = [
            'label'  => 'A. GENERAL FUND',
            'source' => 'general-fund',
            'income' => $this->buildIncomeFundRowsForReceipts(
                'general-fund',
                $budgetPlanId,
                $currentPlan?->budget_plan_id,
                $pastPlan?->budget_plan_id
            ),
        ];

        foreach ($specialDepts as $dept) {
            $source  = $this->resolveSourceKey($dept);
            $forms[] = [
                'label'  => "B.{$bIdx}. SPECIAL ACCOUNT: " . strtoupper($dept->dept_name),
                'source' => $source,
                'income' => $this->buildIncomeFundRowsForReceipts(
                    $source,
                    $budgetPlanId,
                    $currentPlan?->budget_plan_id,
                    $pastPlan?->budget_plan_id
                ),
            ];
            $bIdx++;
        }

        return [
            'proposed_year' => $proposedYear,
            'current_year'  => $currentYear,
            'past_year'     => $pastYear,
            'receipt_forms' => $forms,
            'signatories'   => $this->buildSignatories(),
        ];
    }

    private function buildIncomeFundRowsForReceipts(
        string $source,
        int    $proposedBpId,
        ?int   $currentBpId,
        ?int   $pastBpId
    ): array {
        $objects = IncomeFundObject::where('source', $source)
            ->orderBy('sort_order')
            ->get();

        $loadAmounts = function (?int $bpId) use ($source): array {
            if (!$bpId) return [];
            return IncomeFundAmount::where('budget_plan_id', $bpId)
                ->where('source', $source)
                ->get()
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

        $rawRows  = [];
        $idToRow  = [];
        $nameToId = [];

        foreach ($objects as $obj) {
            $id   = $obj->id;
            $past = $pastAmts[$id]     ?? [];
            $cur  = $currentAmts[$id]  ?? [];
            $prop = $proposedAmts[$id] ?? [];

            $row = [
                'id'            => $id,
                'parent_id'     => $obj->parent_id,
                'name'          => $obj->name,
                'code'          => $obj->code ?? '',
                'level'         => (int) $obj->level,
                'is_subtotal'   => false,
                'past_total'    => $past['obligation_amount'] ?? ($past['proposed_amount'] ?? 0.0),
                'current_sem1'  => $cur['sem1_actual']        ?? 0.0,
                'current_sem2'  => $cur['sem2_actual']        ?? 0.0,
                'current_total' => $cur['proposed_amount']    ?? 0.0,
                'proposed'      => $prop['proposed_amount']   ?? 0.0,
            ];

            $rawRows[]            = $row;
            $idToRow[$id]         = $row;
            $nameToId[$obj->name] = $id;
        }

        $childrenMap = [];
        foreach ($rawRows as $r) {
            if ($r['parent_id'] !== null) {
                $childrenMap[$r['parent_id']][] = $r['id'];
            }
        }

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
                if (!$triggered) continue;

                $parentId = $cfg['parentId'] ?? ($nameToId[$cfg['parentName'] ?? ''] ?? null);
                if (!$parentId) continue;

                $result[] = [
                    'id'            => null,
                    'parent_id'     => null,
                    'name'          => $cfg['name'],
                    'code'          => '',
                    'level'         => $cfg['level'],
                    'is_subtotal'   => true,
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

    private function renderReceiptsProgram(array $data): string
    {
        $this->clearViewCache();
        return view('reports.lep.lepreport', array_merge($data, [
            'report_type' => 'receipts_program',
        ]))->render();
    }

    // ═══════════════════════════════════════════════════════
    // POST /api/reports/lep/form2
    // ═══════════════════════════════════════════════════════
    public function lepForm2(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'department'     => 'nullable|string',
        ]);

        try {
            $this->clearViewCache();
            $data = $this->buildLepForm2Data(
                (int) $request->budget_plan_id,
                $request->input('department', 'all')
            );
            $html = $this->renderLepForm2($data);
            $pdf  = $this->makePdf($html, 'portrait');

            $deptParam = $request->input('department', 'all');
            $suffix    = $deptParam === 'all' ? '' : '_Dept' . $deptParam;

            return $this->pdfResponse(
                $pdf,
                "LEP_Form2_ByOffice{$suffix}_FY{$data['proposed_year']}.pdf",
                $request->boolean('download')
            );
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ── Data builder ──────────────────────────────────────────────────────
    private function buildLepForm2Data(int $budgetPlanId, string $deptFilter = 'all'): array
    {
        $activePlan   = BudgetPlan::findOrFail($budgetPlanId);
        $proposedYear = (int) $activePlan->year;
        $currentYear  = $proposedYear - 1;
        $pastYear     = $proposedYear - 2;

        $currentPlan = BudgetPlan::where('year', $currentYear)->first();
        $pastPlan    = BudgetPlan::where('year', $pastYear)->first();

        $specialCategoryId = DepartmentCategory::whereRaw(
            "LOWER(dept_category_name) LIKE '%special account%'"
        )->value('dept_category_id');

        $allDepts     = Department::with('category')->orderBy('dept_id')->get();
        $gfDepts      = $allDepts->filter(fn ($d) => $d->dept_category_id !== $specialCategoryId);
        $specialDepts = $allDepts->filter(fn ($d) => $d->dept_category_id === $specialCategoryId);

        if ($deptFilter !== 'all') {
            $filteredId   = (int) $deptFilter;
            $gfDepts      = $gfDepts->filter(fn ($d) => $d->dept_id === $filteredId);
            $specialDepts = $specialDepts->filter(fn ($d) => $d->dept_id === $filteredId);
        }

        $sections = [];

        // ── A. General Fund ───────────────────────────────────────────────
        $gfGroups = $this->buildLepForm2DeptGroups(
            $gfDepts->values(),
            $budgetPlanId,
            $currentPlan?->budget_plan_id,
            $pastPlan?->budget_plan_id,
            $proposedYear, $currentYear, $pastYear,
            false,          // isSpecial
            'general-fund'  // sourceKey (LDRRMF rows skipped when isSpecial=false)
        );
        if (!empty($gfGroups)) {
            $sections[] = [
                'section_label' => 'A. GENERAL FUND',
                'is_special'    => false,
                'dept_groups'   => $gfGroups,
            ];
        }

        // ── B.x. Special Accounts ─────────────────────────────────────────
        $bIdx = 1;
        foreach ($specialDepts as $dept) {
            $source   = $this->resolveSourceKey($dept);
            $saGroups = $this->buildLepForm2DeptGroups(
                collect([$dept]),
                $budgetPlanId,
                $currentPlan?->budget_plan_id,
                $pastPlan?->budget_plan_id,
                $proposedYear, $currentYear, $pastYear,
                true,    // isSpecial → triggers LDRRMF row computation
                $source  // sourceKey e.g. 'occ', 'pm', 'sh'
            );
            if (!empty($saGroups)) {
                $sections[] = [
                    'section_label' => "B.{$bIdx}. SPECIAL ACCOUNT: " . strtoupper($dept->dept_name),
                    'is_special'    => true,
                    'dept_groups'   => $saGroups,
                ];
            }
            $bIdx++;
        }

        return [
            'proposed_year'  => $proposedYear,
            'current_year'   => $currentYear,
            'past_year'      => $pastYear,
            'form2_sections' => $sections,
        ];
    }

    // ── Build dept groups ─────────────────────────────────────────────────
    private function buildLepForm2DeptGroups(
        Collection $depts,
        int  $proposedBpId,
        ?int $currentBpId,
        ?int $pastBpId,
        int  $proposedYear,
        int  $currentYear,
        int  $pastYear,
        bool $isSpecial = false,
        ?string $sourceKey = null
    ): array {
        $groups = [];

        foreach ($depts as $dept) {
            $proposedPlan = DepartmentBudgetPlan::with([
                'items',
                'items.expenseItem',
                'items.expenseItem.classification',
            ])
            ->where('dept_id', $dept->dept_id)
            ->where('budget_plan_id', $proposedBpId)
            ->first();

            if (!$proposedPlan) continue;

            $currentPlan = $currentBpId
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $currentBpId)->first()
                : null;

            $pastPlan = $pastBpId
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $pastBpId)->first()
                : null;

            $form2   = $this->buildForm2ForLep($proposedPlan, $currentPlan, $pastPlan);
            $hasData = !empty($form2['items']) || !empty($form2['specialPrograms']);
            if (!$hasData) continue;

            // ── LDRRMF rows (special-account depts only) ──────────────────
            $ldrrmfRows = [];
            if ($isSpecial && $sourceKey) {
                $ldrrmfRows = $this->buildLdrrmfRowsForLep(
                    $sourceKey,
                    $proposedBpId,
                    $currentBpId,
                    $pastBpId
                );
            }

            $groups[] = [
                'dept_id'     => $dept->dept_id,
                'dept_name'   => strtoupper($dept->dept_name),
                'dept_abbr'   => strtoupper($dept->dept_abbreviation ?? ''),
                'dept_head'   => $this->getDeptHead($dept->dept_id),
                'form2'       => $form2,
                'ldrrmf_rows' => $ldrrmfRows,
                'is_special'  => $isSpecial,
            ];
        }

        return $groups;
    }

    // ── buildForm2ForLep ──────────────────────────────────────────────────
    private function buildForm2ForLep($proposedPlan, $currentPlan, $pastPlan): array
    {
        $items = [];
        foreach ($proposedPlan->items as $proposedItem) {
            $expenseItem = $proposedItem->expenseItem;
            if (!$expenseItem) continue;

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
                'past_total'     => (float) ($pastItem?->obligation_amount ?? 0),
                'current_sem1'   => (float) ($currentItem?->sem1_amount    ?? 0),
                'current_sem2'   => (float) ($currentItem?->sem2_amount    ?? 0),
                'current_total'  => (float) ($currentItem?->total_amount   ?? 0),
                'proposed'       => (float) $proposedItem->total_amount,
            ];
        }

        $proposedAip = DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
            ->get()->keyBy('aip_program_id');

        $currentAip = $currentPlan
            ? DeptBpForm4Item::with('aipProgram')
                ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
                ->get()->keyBy('aip_program_id')
            : collect();

        $pastAip = $pastPlan
            ? DeptBpForm4Item::with('aipProgram')
                ->where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
                ->get()->keyBy('aip_program_id')
            : collect();

        $allProgramIds = $proposedAip->keys()
            ->merge($currentAip->keys())
            ->merge($pastAip->keys())
            ->unique()->sort()->values();

        $specialPrograms = [];
        foreach ($allProgramIds as $programId) {
            $proposedRow = $proposedAip->get($programId);
            $currentRow  = $currentAip->get($programId);
            $pastRow     = $pastAip->get($programId);

            $aipProgram = $proposedRow?->aipProgram
                ?? $currentRow?->aipProgram
                ?? $pastRow?->aipProgram;
            if (!$aipProgram) continue;

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

    // ── buildLdrrmfRowsForLep ─────────────────────────────────────────────
    /**
     * Build the three LDRRMF sub-rows for one special-account source.
     *
     * Returns rows keyed by 'kind':
     *   'ldrrmf-5pct'  – total 5 % calamity fund
     *   'ldrrmf-70pct' – 70 % pre-disaster preparedness activities
     *   'ldrrmf-qrf'   – 30 % quick response fund (QRF)
     */
    private function buildLdrrmfRowsForLep(
        string $source,
        int    $proposedBpId,
        ?int   $currentBpId,
        ?int   $pastBpId
    ): array {
        $computeCalamityFund = function (?int $bpId) use ($source): float {
            if (!$bpId) return 0.0;
            try {
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
                    ->where('budget_plan_id', $bpId)
                    ->where('source', $source);

                if (!empty($excludeIds)) {
                    $query->whereNotIn('income_fund_object_id', $excludeIds);
                }

                return round((float) $query->sum('proposed_amount') * 0.05, 2);
            } catch (\Throwable) {
                return 0.0;
            }
        };

        $compute70 = fn (?int $bpId): float => $bpId
            ? (float) \DB::table('ldrrmfip_items')
                ->where('budget_plan_id', $bpId)
                ->where('source', $source)
                ->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')
                ->value('grand')
            : 0.0;

        $past5  = $computeCalamityFund($pastBpId);
        $curr5  = $computeCalamityFund($currentBpId);
        $prop5  = $computeCalamityFund($proposedBpId);

        $past70 = $compute70($pastBpId);
        $curr70 = $compute70($currentBpId);
        $prop70 = $compute70($proposedBpId);

        $pastQrf = max(0, $past5 - $past70);
        $currQrf = max(0, $curr5 - $curr70);
        $propQrf = max(0, $prop5 - $prop70);

        if ($past5 == 0 && $curr5 == 0 && $prop5 == 0) {
            return [];
        }

        return [
            [
                'kind'          => 'ldrrmf-5pct',
                'name'          => '5% Local Disaster Risk Reduction & Mgmt. Fund (LDRRMF)',
                'account_code'  => '5-02',
                'past_total'    => $past5,
                'current_sem1'  => 0.0,
                'current_sem2'  => 0.0,
                'current_total' => $curr5,
                'proposed'      => $prop5,
            ],
            [
                'kind'          => 'ldrrmf-70pct',
                'name'          => '70% Pre-Disaster Preparedness Activities (JMC2013-1, RA 10121)',
                'account_code'  => '5-02',
                'past_total'    => $past70,
                'current_sem1'  => 0.0,
                'current_sem2'  => 0.0,
                'current_total' => $curr70,
                'proposed'      => $prop70,
            ],
            [
                'kind'          => 'ldrrmf-qrf',
                'name'          => 'Quick Response Fund, (QRF) — 30%',
                'account_code'  => '5-02',
                'past_total'    => $pastQrf,
                'current_sem1'  => 0.0,
                'current_sem2'  => 0.0,
                'current_total' => $currQrf,
                'proposed'      => $propQrf,
            ],
        ];
    }

    // ── Renderer ──────────────────────────────────────────────────────────
    private function renderLepForm2(array $data): string
    {
        $this->clearViewCache();
        return view('reports.lep.lepreport', array_merge($data, [
            'report_type' => 'lep_form2',
        ]))->render();
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
        \Log::error('LEPReport failed', [
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
    // HELPERS
    // ═══════════════════════════════════════════════════════

    private function resolveVersionFromSnapshots($snapshots): ?SalaryStandardVersion
    {
        foreach ($snapshots as $snap) {
            if (!empty($snap->salary_standard_version_id)) {
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
        if (!$version) return null;
        $parts = array_filter([$version->tranche ?? null, $version->income_class ?? null]);
        return implode(', ', $parts) ?: null;
    }

    private function collectDescendantIds(int $parentId): array
    {
        $ids      = [];
        $children = \DB::table('income_fund_objects')->where('parent_id', $parentId)->pluck('id');
        foreach ($children as $childId) {
            $ids[] = $childId;
            array_push($ids, ...$this->collectDescendantIds($childId));
        }
        return $ids;
    }

    private function resolveSourceKey($dept): string
    {
        $abbr = strtolower($dept->dept_abbreviation ?? '');
        $name = strtolower($dept->dept_name ?? '');
        if ($abbr === 'sh'  || str_contains($name, 'slaughter'))      return 'sh';
        if ($abbr === 'occ' || str_contains($name, 'opol community')) return 'occ';
        if ($abbr === 'pm'  || str_contains($name, 'public market'))  return 'pm';
        return strtolower($abbr) ?: 'general-fund';
    }

    private function buildSignatories(): array
    {
        return [
            'budget_officer' => $this->getDeptHeadByName('budget'),
            'administrator'  => $this->getDeptHeadByName('administration'),
            'mpdc'           => $this->getDeptHeadByName('planning and development'),
            'treasurer'      => $this->getTreasurerWithFallback(),
            'mayor'          => $this->getDeptHeadByName('mayor'),
            'hrmo'           => $this->getDeptHeadByName('human resources'),
            'accountant'     => $this->getDeptHeadByName('accounting'),
        ];
    }

    private function getTreasurerWithFallback(): array
    {
        $municipalTreasurer = PlantillaPosition::with(['assignments.personnel'])
            ->where('is_active', true)
            ->whereRaw("LOWER(position_title) = 'municipal treasurer'")
            ->first();

        if ($municipalTreasurer) {
            $personnel = $municipalTreasurer->assignments->first()?->personnel;

            if ($personnel) {
                $parts = array_filter([
                    $personnel->first_name  ?? null,
                    $personnel->middle_name
                        ? strtoupper(substr($personnel->middle_name, 0, 1)) . '.'
                        : null,
                    $personnel->last_name   ?? null,
                ]);
                $name = implode(' ', $parts);
                if ($name) {
                    return [
                        'name'  => strtoupper($name),
                        'title' => $municipalTreasurer->position_title,
                    ];
                }
            }

            $assistant = PlantillaPosition::with(['assignments.personnel'])
                ->where('is_active', true)
                ->whereRaw("LOWER(position_title) = 'assistant municipal treasurer'")
                ->first();

            if ($assistant) {
                $aPersonnel = $assistant->assignments->first()?->personnel;
                if ($aPersonnel) {
                    $parts = array_filter([
                        $aPersonnel->first_name  ?? null,
                        $aPersonnel->middle_name
                            ? strtoupper(substr($aPersonnel->middle_name, 0, 1)) . '.'
                            : null,
                        $aPersonnel->last_name   ?? null,
                    ]);
                    $name = implode(' ', $parts);
                    if ($name) {
                        return [
                            'name'  => strtoupper($name),
                            'title' => $assistant->position_title,
                        ];
                    }
                }
            }

            return [
                'name'  => 'VACANT',
                'title' => $municipalTreasurer->position_title,
            ];
        }

        return [
            'name'  => 'VACANT',
            'title' => 'Municipal Treasurer',
        ];
    }

    private function getDeptHeadByName(string $keyword): array
    {
        $dept = Department::whereRaw('LOWER(dept_name) LIKE ?', ['%' . strtolower($keyword) . '%'])->first();
        if (!$dept) return ['name' => strtoupper($keyword), 'title' => ucwords($keyword)];
        return $this->getDeptHead($dept->dept_id);
    }

    private function getDeptHead(int $deptId): array
    {
        $position = PlantillaPosition::with(['assignments.personnel'])
            ->where('dept_id', $deptId)
            ->where('is_active', true)
            ->orderByRaw('CAST(new_item_number AS UNSIGNED)')
            ->first();

        if (!$position) return ['name' => 'DEPARTMENT HEAD', 'title' => 'Department Head'];

        $assignment = $position->assignments->first();
        $personnel  = $assignment?->personnel;
        $name       = 'Vacant';

        if ($personnel) {
            $parts = array_filter([
                $personnel->first_name  ?? null,
                $personnel->middle_name ? strtoupper(substr($personnel->middle_name, 0, 1)) . '.' : null,
                $personnel->last_name   ?? null,
            ]);
            $name = implode(' ', $parts) ?: 'Vacant';
        }

        return ['name' => strtoupper($name), 'title' => $position->position_title];
    }

    private function clearViewCache(): void
    {
        $viewsDir = storage_path('framework/views');
        if (!is_dir($viewsDir)) return;
        $files = glob($viewsDir . DIRECTORY_SEPARATOR . '*.php');
        if ($files) foreach ($files as $f) @unlink($f);
    }

    public function lepForm7(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        'filter'         => 'nullable|string',  // 'all' | 'general-fund' | 'occ' | 'pm' | 'sh'
    ]);

    try {
        $this->clearViewCache();
        $filter = $request->input('filter', 'all');
        $data   = $this->buildLepForm7Data((int) $request->budget_plan_id, $filter);
        $html   = $this->renderLepForm7($data);
        $pdf    = $this->makePdf($html, 'portrait');

        $suffix = $filter === 'all' ? '' : '_' . strtoupper($filter);

        return $this->pdfResponse(
            $pdf,
            "LEP_Form7_SummaryAppropriationsBySector{$suffix}_FY{$data['year']}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

// ── Data builder ──────────────────────────────────────────────────────────
private function buildLepForm7Data(int $budgetPlanId, string $filter = 'all'): array
{
    $activePlan = BudgetPlan::findOrFail($budgetPlanId);
    $year       = (int) $activePlan->year;

    $specialDepts = Department::with('category')
        ->get()
        ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts');

    $forms = [];

    // ── A. General Fund ───────────────────────────────────────────────────
    if ($filter === 'all' || $filter === 'general-fund') {
        $forms[] = $this->buildOneLepForm7($budgetPlanId, label: 'General Fund', isSpecial: false);
    }

    // ── B.x. Special Accounts ─────────────────────────────────────────────
    foreach ($specialDepts as $dept) {
        $source = $this->resolveSourceKey($dept);
        if ($filter !== 'all' && $filter !== $source) continue;

        $forms[] = $this->buildOneLepForm7(
            $budgetPlanId,
            label:     $dept->dept_name . ', (' . $dept->dept_abbreviation . ')',
            isSpecial: true,
            deptId:    $dept->dept_id,
        );
    }

    return [
        'year'  => $year,
        'lgu'   => strtoupper($activePlan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
        'forms' => $forms,
    ];
}

// ── Build one fund block (mirrors UnifiedReportController::buildOneForm7) ─
private function buildOneLepForm7(
    int    $budgetPlanId,
    string $label,
    bool   $isSpecial,
    ?int   $deptId = null
): array {
    // ── Category → sector-column map ──────────────────────────────────────
    $categories        = \DB::table('department_categories')->get();
    $categoryColumnMap = [];
    foreach ($categories as $cat) {
        $col = $this->lepForm7CategoryToColumn($cat->dept_category_name);
        if ($col) $categoryColumnMap[$cat->dept_category_id] = $col;
    }

    // ── Resolve which dept_budget_plan_ids are in scope ───────────────────
    $deptQuery = \DB::table('department_budget_plans as dbp')
        ->join('departments as d',            'd.dept_id',           '=', 'dbp.dept_id')
        ->join('department_categories as dc', 'dc.dept_category_id', '=', 'd.dept_category_id')
        ->where('dbp.budget_plan_id', $budgetPlanId)
        ->select('dbp.dept_budget_plan_id', 'd.dept_category_id', 'd.dept_id');

    if ($isSpecial && $deptId) {
        $deptQuery->where('d.dept_id', $deptId);
    } else {
        // General fund: exclude all special-account depts
        $saIds = \DB::table('department_categories')
            ->whereRaw("LOWER(dept_category_name) LIKE '%special account%'")
            ->pluck('dept_category_id')->toArray();
        if (!empty($saIds)) {
            $deptQuery->whereNotIn('d.dept_category_id', $saIds);
        }
    }

    $deptRows            = $deptQuery->get();
    $deptPlanCategoryMap = [];
    foreach ($deptRows as $row) {
        $col = $categoryColumnMap[$row->dept_category_id] ?? null;
        if ($col) $deptPlanCategoryMap[$row->dept_budget_plan_id] = $col;
    }

    // ── PS / MOOE / CO rows from dept_bp_form2_items ─────────────────────
    $form2Rows = $this->lepForm7BuildForm2Rows($budgetPlanId, $deptPlanCategoryMap);

    // ── FE obligations (general fund only) ───────────────────────────────
    $feObligations = [];
    $feSubtotal    = $this->lepForm7ZeroSubtotal();
    if (!$isSpecial) {
        $feObligations = $this->lepForm7BuildFeObligations($budgetPlanId);
        $feTotal       = 0.0;
        foreach ($feObligations as $ob) $feTotal += $ob['principal'] + $ob['interest'];
        $feSubtotal = [
            'general_public_services' => $feTotal,
            'social_services'         => 0.0,
            'economic_services'       => 0.0,
            'other_services'          => 0.0,
            'total'                   => $feTotal,
        ];
    }

    // ── SPA rows from dept_bp_form4_items ────────────────────────────────
    $aipRows = $this->lepForm7BuildAipRows($budgetPlanId, $deptPlanCategoryMap);

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
            'subtotal'      => $this->lepForm7SumRows($psRows),
        ],
        [
            'section_code'  => 'MOOE',
            'section_label' => 'Maintenance & Other Operating Expenditures, (MOOE)',
            'rows'          => $mooeRows,
            'obligations'   => [],
            'subtotal'      => $this->lepForm7SumRows($mooeRows),
        ],
        [
            'section_code'  => 'FE',
            'section_label' => 'Financial Expenses, (F.E.)',
            'rows'          => [],
            'obligations'   => $feObligations,
            'subtotal'      => $feSubtotal,
        ],
        [
            'section_code'  => 'CO',
            'section_label' => 'Property, Plant & Equipment',
            'rows'          => $coRows,
            'obligations'   => [],
            'subtotal'      => $this->lepForm7SumRows($coRows),
        ],
        [
            'section_code'  => 'SPA',
            'section_label' => 'Special Purpose Appropriations, (SPA)',
            'rows'          => $aipRows,
            'obligations'   => [],
            'subtotal'      => $this->lepForm7SumRows($aipRows),
        ],
    ];

    // ── Grand total ───────────────────────────────────────────────────────
    $grandTotal = $this->lepForm7ZeroSubtotal();
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

// ── Category name → sector column ────────────────────────────────────────
private function lepForm7CategoryToColumn(string $name): ?string
{
    $lower = strtolower($name);
    if (str_contains($lower, 'general public service')) return 'general_public_services';
    if (str_contains($lower, 'social service'))         return 'social_services';
    if (str_contains($lower, 'economic service'))       return 'economic_services';
    if (str_contains($lower, 'special account'))        return null; // excluded
    return 'other_services';
}

// ── Zero-value subtotal skeleton ─────────────────────────────────────────
private function lepForm7ZeroSubtotal(): array
{
    return [
        'general_public_services' => 0.0,
        'social_services'         => 0.0,
        'economic_services'       => 0.0,
        'other_services'          => 0.0,
        'total'                   => 0.0,
    ];
}

// ── PS / MOOE / CO rows from dept_bp_form2_items ─────────────────────────
private function lepForm7BuildForm2Rows(int $budgetPlanId, array $deptPlanCategoryMap): array
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

// ── FE obligation rows ────────────────────────────────────────────────────
private function lepForm7BuildFeObligations(int $budgetPlanId): array
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

// ── AIP / SPA rows ────────────────────────────────────────────────────────
private function lepForm7BuildAipRows(int $budgetPlanId, array $deptPlanCategoryMap): array
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

// ── Sum all sector columns across a set of rows ───────────────────────────
private function lepForm7SumRows(array $rows): array
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
            $sum[$col] += (float) ($row[$col] ?? 0);
        }
    }
    return $sum;
}

// ── Renderer ──────────────────────────────────────────────────────────────
private function renderLepForm7(array $data): string
{
    $this->clearViewCache();
    return view('reports.lep.lepreport', array_merge($data, [
        'report_type'            => 'lep_form7',
        'proposed_year'          => $data['year'],      // ← add this
        'special_account_totals' => ['items' => [], 'grand_total' => 0.0], // ← add this
    ]))->render();
}


// ═══════════════════════════════════════════════════════════════════════════
// FILE: additions to LEPReportController.php
//
// 1. Add these two methods anywhere alongside the other form methods
//    (e.g. after lepForm7 / before the private helper section).
//
// 2. The private buildOneForm6 and resolveSourceKey helpers are already in
//    UnifiedReportController — copy them as shown below, OR (better) call
//    them from a shared trait.  The copy below is self-contained.
// ═══════════════════════════════════════════════════════════════════════════

// ────────────────────────────────────────────────────────────────────────────
// POST /api/reports/lep/form6
//
// Body params:
//   budget_plan_id  int     (required)
//   filter          string  (optional)  'all' | 'general-fund' | 'occ' | 'pm' | 'sh'
//   download        bool    (optional)
// ────────────────────────────────────────────────────────────────────────────
    public function lepForm6(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'filter'         => 'nullable|string',
        ]);

        try {
            $this->clearViewCache();
            $filter = $request->input('filter', 'all');
            $data   = $this->buildLepForm6Data((int) $request->budget_plan_id, $filter);
            $html   = $this->renderLepForm6($data);
            $pdf    = $this->makePdf($html, 'portrait');

            $suffix = $filter === 'all' ? '' : ('_' . strtoupper($filter));

            return $this->pdfResponse(
                $pdf,
                "LEP_Form6_StatutoryObligations{$suffix}_FY{$data['year']}.pdf",
                $request->boolean('download')
            );
        } catch (\Throwable $e) {
            return $this->errorResponse($e);
        }
    }

    // ── Data builder ──────────────────────────────────────────────────────────────
    private function buildLepForm6Data(int $budgetPlanId, string $filter = 'all'): array
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

        // ── General Fund ──────────────────────────────────────────────────────────
        if ($filter === 'all' || $filter === 'general-fund') {
            $forms[] = $this->buildOneLepForm6(
                $budgetPlanId,
                'general-fund',
                $templates,
                label:     'General Fund',
                isSpecial: false,
            );
        }

        // ── Special Accounts ──────────────────────────────────────────────────────
        foreach ($specialDepts as $dept) {
            $source = $this->resolveSourceKey($dept);
            if ($filter !== 'all' && $filter !== $source) continue;

            $forms[] = $this->buildOneLepForm6(
                $budgetPlanId,
                $source,
                $templates,
                label:     $dept->dept_name . ', (' . $dept->dept_abbreviation . ')',
                isSpecial: true,
            );
        }

        return [
            'year'  => $year,
            'lgu'   => strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
            'forms' => $forms,
        ];
    }

    // ── Single-source block builder ───────────────────────────────────────────────
    private function buildOneLepForm6(
        int    $budgetPlanId,
        string $source,
        Collection $templates,
        string $label,
        bool   $isSpecial,
    ): array {
        // Load saved amounts keyed by template id
        $items = Form6Item::where('budget_plan_id', $budgetPlanId)
            ->where('source', $source)
            ->get()
            ->keyBy('form6_template_id');

        // Build flat row array (mirrors UnifiedReportController::buildOneForm6)
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

        // Collect parent codes (so we can detect leaf vs parent at blade level)
        $parentCodes   = array_filter(array_column($rows, 'parent_code'));
        $parentCodeSet = array_flip($parentCodes);

        $rowsByCode = collect($rows)->keyBy('code');
        $computed   = [];

        $computeAmt = function (array $r) use (&$computed, &$computeAmt, $rowsByCode, $rows): float {
            if (isset($computed[$r['code']])) return $computed[$r['code']];
            if ($r['is_computed']) {
                $children = array_filter($rows, fn ($c) => $c['parent_code'] === $r['code']);
                $sum = 0.0;
                foreach ($children as $child) {
                    $childRow = $rowsByCode->get($child['code']);
                    if ($childRow) $sum += $computeAmt($childRow);
                }
                $computed[$r['code']] = $sum > 0 ? $sum : (float) $r['amount'];
                return $computed[$r['code']];
            }
            $computed[$r['code']] = (float) $r['amount'];
            return $computed[$r['code']];
        };

        foreach ($rows as $r) { $computeAmt($r); }

        // Grand total: sum of non-section, non-parent leaf rows
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

    // ── Renderer ──────────────────────────────────────────────────────────────────
    private function renderLepForm6(array $data): string
    {
        $this->clearViewCache();
        return view('reports.lep.lepreport', array_merge([
            'report_type'            => 'lep_form6',
            'data'                   => $data,
            'year'                   => $data['year'],
            'lgu'                    => $data['lgu'],
            'forms'                  => $data['forms'],
            'proposed_year'          => $data['year'],
            // Stubs required by lepreport.blade.php header section
            'header'                 => [],
            'signatories'            => [],
            'special_account_totals' => ['items' => [], 'grand_total' => 0.0],
            'grand_current_total'    => 0.0,
            'grand_proposed_total'   => 0.0,
        ]))->render();
    }


    // ── POST /api/reports/lep/consolidated-calamity5 ─────────────────────────
public function lepConsolidatedCalamity5(Request $request)
{
    $request->validate([
        'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
    ]);

    try {
        $this->clearViewCache();
        $data = $this->buildLepConsolidatedCalamity5Data((int) $request->budget_plan_id);
        $html = $this->renderLepConsolidatedCalamity5($data);
        $pdf  = $this->makePdf($html, 'portrait');

        return $this->pdfResponse(
            $pdf,
            "LEP_5pct_CalamityFund_SA_Consolidated_FY{$data['year']}.pdf",
            $request->boolean('download')
        );
    } catch (\Throwable $e) {
        return $this->errorResponse($e);
    }
}

// ── Data builder (mirrors UnifiedReportController::buildConsolidatedCalamity5Data) ──
private function buildLepConsolidatedCalamity5Data(int $budgetPlanId): array
{
    $plan = BudgetPlan::findOrFail($budgetPlanId);
    $year = (int) $plan->year;

    $pastYear    = $year - 2;
    $currentYear = $year - 1;

    $pastPlan    = BudgetPlan::where('year', $pastYear)->first();
    $currentPlan = BudgetPlan::where('year', $currentYear)->first();

    $specialDepts = Department::with('category')
        ->get()
        ->filter(fn ($d) => strtolower(trim($d->category?->dept_category_name ?? '')) === 'special accounts')
        ->values();

    $sections = [];

    foreach ($specialDepts as $dept) {
        $source = $this->resolveSourceKey($dept);

        // ── Past year: obligation_amount ──────────────────────────────────
        $pastData = $this->buildLepSACalamityPast($pastPlan?->budget_plan_id, $source);

        // ── Current year: total_amount with sem1/sem2 ─────────────────────
        $currentData = $this->buildLepSACalamityCurrent($currentPlan?->budget_plan_id, $source);

        // ── Budget year: mooe + co ────────────────────────────────────────
        $budgetData = $this->buildLepSACalamityBudget($budgetPlanId, $source);

        // ── Items ─────────────────────────────────────────────────────────
        $budgetItems = LdrrmfipItem::where('budget_plan_id', $budgetPlanId)
            ->where('source', $source)
            ->with('category')
            ->orderBy('ldrrmfip_item_id')
            ->get();

        $pastItems = $pastPlan
            ? LdrrmfipItem::where('budget_plan_id', $pastPlan->budget_plan_id)
                ->where('source', $source)->get()->keyBy('description')
            : collect();

        $currentItems = $currentPlan
            ? LdrrmfipItem::where('budget_plan_id', $currentPlan->budget_plan_id)
                ->where('source', $source)->get()->keyBy('description')
            : collect();

        $items = $budgetItems->map(fn ($i) => [
            'ldrrmfip_item_id'    => $i->ldrrmfip_item_id,
            'description'         => $i->description,
            'category_name'       => $i->category?->name,
            'implementing_office' => $i->implementing_office,
            // Past year — obligation_amount (matching Form 2 pattern)
            'obligation_amount'   => (float) ($pastItems->get($i->description)?->obligation_amount ?? 0),
            // Current year
            'sem1_amount'         => (float) ($currentItems->get($i->description)?->sem1_amount    ?? 0),
            'sem2_amount'         => (float) ($currentItems->get($i->description)?->sem2_amount    ?? 0),
            'total_amount'        => (float) ($currentItems->get($i->description)?->total_amount   ?? 0),
            // Budget year
            'mooe'                => (float) $i->mooe,
            'co'                  => (float) $i->co,
            'total'               => (float) $i->total,
        ])->values()->toArray();

        $sections[] = [
            'source'      => $source,
            'dept_name'   => $dept->dept_name,
            'dept_abbr'   => strtoupper($dept->dept_abbreviation ?? ''),
            'dept_title_label'  => 'Mun. Eco. Entrpse., ' . strtoupper($dept->dept_name),
            'dept_total_label'  => strtoupper($dept->dept_name),
            'label'       => strtoupper($dept->dept_abbreviation ?? $dept->dept_name),
            'past'        => $pastData,
            'current'     => $currentData,
            'budget_year' => $budgetData,
            'items'       => $items,
        ];
    }

    $grandTotal = [
        'past'          => array_sum(array_column(array_column($sections, 'past'),        'total_5pct')),
        'current_sem1'  => array_sum(array_column(array_column($sections, 'current'),     'total_sem1')),
        'current_sem2'  => array_sum(array_column(array_column($sections, 'current'),     'total_sem2')),
        'current_total' => array_sum(array_column(array_column($sections, 'current'),     'total_5pct')),
        'budget_year'   => array_sum(array_column(array_column($sections, 'budget_year'), 'total_5pct')),
    ];

    return [
        'year'         => $year,
        'past_year'    => $pastYear,
        'current_year' => $currentYear,
        'lgu'          => strtoupper($plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL'),
        'sources'      => $sections,
        'grand_total'  => $grandTotal,
        'signatories'  => $this->buildSignatories(),
    ];
}

// ── Past: obligation_amount for 70%, calamityFund for total ──────────────
private function buildLepSACalamityPast(?int $planId, string $source): array
{
    if (!$planId) return ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0];

    $total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
        ->where('source', $source)
        ->selectRaw('COALESCE(SUM(obligation_amount), 0) as grand')
        ->value('grand');

    $calamityFund = $this->computeCalamityFundLep($planId, $source);
    $reserved30   = round($calamityFund - $total70, 2);

    return [
        'qrf_30'          => max(0, $reserved30),
        'preparedness_70' => round($total70, 2),
        'total_5pct'      => round($calamityFund, 2),
    ];
}

// ── Current: total_amount + sem1/sem2 split ───────────────────────────────
private function buildLepSACalamityCurrent(?int $planId, string $source): array
{
    $empty = [
        'qrf_30_sem1' => 0, 'qrf_30_sem2' => 0, 'qrf_30_total' => 0,
        'prep_70_sem1'=> 0, 'prep_70_sem2'=> 0, 'prep_70_total'=> 0,
        'total_sem1'  => 0, 'total_sem2'  => 0, 'total_5pct'   => 0,
    ];
    if (!$planId) return $empty;

    $calamity   = $this->computeCalamityFundLep($planId, $source);
    $total70    = (float) LdrrmfipItem::where('budget_plan_id', $planId)
        ->where('source', $source)->selectRaw('COALESCE(SUM(total_amount), 0) as grand')->value('grand');
    $reserved30 = $calamity - $total70;

    $sem1Total  = (float) LdrrmfipItem::where('budget_plan_id', $planId)
        ->where('source', $source)->selectRaw('COALESCE(SUM(sem1_amount), 0) as grand')->value('grand');
    $sem2Total  = (float) LdrrmfipItem::where('budget_plan_id', $planId)
        ->where('source', $source)->selectRaw('COALESCE(SUM(sem2_amount), 0) as grand')->value('grand');

    $sem1Calamity = round($sem1Total + ($reserved30 * ($sem1Total / max($total70, 1))), 2);
    $sem2Calamity = round($calamity - $sem1Calamity, 2);

    return [
        'qrf_30_sem1'   => round($sem1Calamity * 0.30, 2),
        'qrf_30_sem2'   => round($sem2Calamity * 0.30, 2),
        'qrf_30_total'  => round($reserved30, 2),
        'prep_70_sem1'  => round($sem1Total, 2),
        'prep_70_sem2'  => round($sem2Total, 2),
        'prep_70_total' => round($total70, 2),
        'total_sem1'    => round($sem1Calamity, 2),
        'total_sem2'    => round($sem2Calamity, 2),
        'total_5pct'    => round($calamity, 2),
    ];
}

// ── Budget year: mooe + co ────────────────────────────────────────────────
private function buildLepSACalamityBudget(?int $planId, string $source): array
{
    if (!$planId) return ['qrf_30' => 0, 'preparedness_70' => 0, 'total_5pct' => 0];

    $total70 = (float) LdrrmfipItem::where('budget_plan_id', $planId)
        ->where('source', $source)->selectRaw('COALESCE(SUM(mooe + co), 0) as grand')->value('grand');

    $calamityFund = $this->computeCalamityFundLep($planId, $source);
    $reserved30   = $calamityFund - $total70;

    return [
        'qrf_30'          => round(max(0, $reserved30), 2),
        'preparedness_70' => round($total70, 2),
        'total_5pct'      => round($calamityFund, 2),
    ];
}

// ── Calamity fund calculator (5% of Total Available Resources) ────────────
// Mirrors UnifiedReportController::computeCalamity5Fund()
private function computeCalamityFundLep(int $planId, string $source): float
{
    $nonIncomeParent = \DB::table('income_fund_objects')
        ->where('source', $source)
        ->whereRaw("LOWER(name) LIKE '%non-income receipt%'")
        ->first(['id']);

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

// ── Renderer ──────────────────────────────────────────────────────────────
private function renderLepConsolidatedCalamity5(array $data): string
{
    $this->clearViewCache();
    return view('reports.lep.lepreport', array_merge($data, [
        'report_type'            => 'lep_consolidated_calamity5',
        'proposed_year'          => $data['year'],
        'header'                 => [],
        'signatories'            => $data['signatories'],
        'special_account_totals' => ['items' => [], 'grand_total' => 0.0],
        'grand_current_total'    => 0.0,
        'grand_proposed_total'   => 0.0,
    ]))->render();
}
}
