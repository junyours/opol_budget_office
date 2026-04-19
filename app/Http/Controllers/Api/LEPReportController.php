<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\BudgetPlanForm3Assignment;
use App\Models\Department;
use App\Models\DepartmentBudgetPlan;
use App\Models\IncomeFundAmount;
use App\Models\IncomeFundObject;
use App\Models\PlantillaPosition;
use App\Models\SalaryGradeStep;
use App\Models\SalaryStandardVersion;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;

/**
 * LEPReportController
 * ═══════════════════════════════════════════════════════════════════════════
 * Generates Local Expenditure Program (LEP) PDF reports.
 *
 * Endpoints:
 *   POST /api/reports/lep/consolidated-plantilla  — Consolidated Plantilla of Personnel
 *
 * Add to routes/api.php inside the reports throttle group:
 *   Route::post('lep/consolidated-plantilla', [LEPReportController::class, 'consolidatedPlantilla']);
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

        // ── Fetch LEP header settings ─────────────────────────────────────────
        // Try to load from lep_header_settings table; fall back to defaults
        $header = $this->getLepHeaderSettings($budgetPlanId, $activePlan);

        // ── All departments ordered by dept_id ────────────────────────────────
        $specialCategoryId = \App\Models\DepartmentCategory::whereRaw(
            "LOWER(dept_category_name) LIKE '%special account%'"
        )->value('dept_category_id');

        $allDepartments = Department::with('category')
            ->orderBy('dept_id')
            ->get();

        $generalDepts  = $allDepartments->filter(fn ($d) => $d->dept_category_id !== $specialCategoryId);
        $specialDepts  = $allDepartments->filter(fn ($d) => $d->dept_category_id === $specialCategoryId);

        // ── Special account income totals (for the ordinance body) ────────────
        $specialAccountTotals = $this->getSpecialAccountTotals($budgetPlanId, $specialDepts);

        // ── Build plantilla sections ──────────────────────────────────────────
        $sections = [];

        // A. General Fund
        $gfRows = $this->buildPlantillaRows(
            $budgetPlanId,
            $currentPlan?->budget_plan_id,
            $generalDepts->pluck('dept_id')->toArray(),
            $proposedYear,
            $currentYear,
            true // group by department
        );
        $sections[] = [
            'section_label' => 'A. GENERAL FUND',
            'is_special'    => false,
            'dept_groups'   => $gfRows,
        ];

        // B.x. Special Accounts
        $bIdx = 1;
        foreach ($specialDepts as $dept) {
            $rows = $this->buildPlantillaRows(
                $budgetPlanId,
                $currentPlan?->budget_plan_id,
                [$dept->dept_id],
                $proposedYear,
                $currentYear,
                false // single dept, no sub-grouping
            );

            $sections[] = [
            'section_label' => "B.{$bIdx}. SPECIAL ACCOUNT: " . strtoupper($dept->dept_name),
                'is_special'    => true,
                'dept_groups'   => $rows,
            ];
            $bIdx++;
        }

        // ── Grand totals ──────────────────────────────────────────────────────
        $grandCurrentTotal  = 0.0;
        $grandProposedTotal = 0.0;
        foreach ($sections as $sec) {
            foreach ($sec['dept_groups'] as $grp) {
                $grandCurrentTotal  += $grp['total_current'];
                $grandProposedTotal += $grp['total_proposed'];
            }
        }

        // ── Resolve LBC / tranche info from active plan ───────────────────────
        $lepLbcInfo = $this->resolveLbcInfo($budgetPlanId, $proposedYear);

        return [
            'proposed_year'          => $proposedYear,
            'current_year'           => $currentYear,
            'header'                 => $header,
            'sections'               => $sections,
            'special_account_totals' => $specialAccountTotals,
            'grand_current_total'    => $grandCurrentTotal,
            'grand_proposed_total'   => $grandProposedTotal,
            'lep_lbc_current'        => $lepLbcInfo['lbc_current'],
            'lep_lbc_proposed'       => $lepLbcInfo['lbc_proposed'],
            'lep_tranche_current'    => $lepLbcInfo['tranche_current'],
            'lep_tranche_proposed'   => $lepLbcInfo['tranche_proposed'],
            'signatories'            => $this->buildSignatories(),
        ];
    }

    // ─── Build plantilla rows for given dept IDs ──────────────────────────────
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

            // Load snapshots
            $proposedSnapshots = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)->get();
            $currentSnapshotsRaw = $currentPlan
                ? BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                    ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)->get()
                : collect();

            // Resolve versions
            $proposedVersion = $this->resolveVersionFromSnapshots($proposedSnapshots)
                ?? SalaryStandardVersion::where('is_active', true)->first();
            $currentVersion  = $this->resolveVersionFromSnapshots($currentSnapshotsRaw) ?? $proposedVersion;

            $lbcCurrent  = $currentVersion?->lbc_reference  ?? null;
            $lbcProposed = $proposedVersion?->lbc_reference  ?? null;
            $trancheCur  = $this->formatTranche($currentVersion);
            $tranchePro  = $this->formatTranche($proposedVersion);

            // Build rows (same logic as UnifiedReportController::buildForm3)
            $proposedKeyed    = $proposedSnapshots->keyBy('plantilla_position_id');
            $currentSnapshots = $currentSnapshotsRaw->keyBy('plantilla_position_id');

            $masterIds = $proposedKeyed->isNotEmpty()
                ? $proposedKeyed->keys()
                : $currentSnapshots->keys();

            $masterIds = $masterIds->sortBy(fn ($posId) => (int) (
                ($proposedKeyed->get($posId) ?? $currentSnapshots->get($posId))
                    ?->plantillaPosition?->new_item_number
                ?? ($proposedKeyed->get($posId) ?? $currentSnapshots->get($posId))
                    ?->plantillaPosition?->old_item_number
                ?? 9999
            ))->values();

            $rows      = [];
            $newItemNo = 1;

            foreach ($masterIds as $positionId) {
                $proposed  = $proposedKeyed->get($positionId);
                $current   = $currentSnapshots->get($positionId);
                $plantilla = $proposed?->plantillaPosition ?? $current?->plantillaPosition;

                $incumbentChanged = $proposed && $current
                    && ($proposed->personnel_id !== $current->personnel_id);
                $effectiveCurrent = $incumbentChanged ? null : $current;

                $personnel     = $proposed?->personnel ?? (!$proposed ? $current?->personnel : null);
                $incumbentName = 'Vacant';
                if ($personnel) {
                    $parts = array_filter([
                        $personnel->first_name  ?? null,
                        $personnel->middle_name ? strtoupper(substr($personnel->middle_name, 0, 1)) . '.' : null,
                        $personnel->last_name   ?? null,
                        $personnel->name_suffix ?? null,
                    ]);
                    $incumbentName = implode(' ', $parts) ?: 'Vacant';
                }

                $rows[] = [
                    'old_item_number'     => $plantilla?->old_item_number ?? null,
                    'new_item_number'     => $plantilla?->new_item_number ?? (string) $newItemNo,
                    'position_title'      => $plantilla?->position_title  ?? '',
                    'incumbent'           => $incumbentName,
                    'effective_date_note' => $proposed?->step_effective_date
                        ? $proposed->step_effective_date->format('M d, Y')
                        : null,
                    'salary_grade'        => $proposed?->salary_grade ?? $current?->salary_grade ?? null,
                    'step_current'        => $effectiveCurrent?->step ?? null,
                    'current_amount'      => (float) ($effectiveCurrent?->annual_rate ?? 0),
                    'step_proposed'       => $proposed?->step ?? 1,
                    'proposed_amount'     => (float) ($proposed?->annual_rate ?? 0),
                    'annual_increment'    => $proposed?->annual_increment !== null
                        ? (float) $proposed->annual_increment
                        : null,
                    'increase_decrease'   => $incumbentChanged
                        ? 0
                        : (float) ($proposed?->annual_rate ?? 0) - (float) ($effectiveCurrent?->annual_rate ?? 0),
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

    // ─── Special account income fund totals ────────────────────────────────────
    private function getSpecialAccountTotals(int $budgetPlanId, $specialDepts): array
    {
        $totals = [];
        $grandTotal = 0.0;

        foreach ($specialDepts as $dept) {
            $abbr   = strtolower($dept->dept_abbreviation ?? '');
            $name   = strtolower($dept->dept_name ?? '');
            $source = 'general-fund';

            if ($abbr === 'sh'  || str_contains($name, 'slaughter'))      $source = 'sh';
            elseif ($abbr === 'occ' || str_contains($name, 'opol community')) $source = 'occ';
            elseif ($abbr === 'pm'  || str_contains($name, 'public market'))  $source = 'pm';

            // Sum leaf nodes of income fund (excluding non-income receipts)
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

    // ─── Resolve LBC / tranche from the first found snapshot ─────────────────
    private function resolveLbcInfo(int $budgetPlanId, int $proposedYear): array
    {
        $currentYear = $proposedYear - 1;
        $currentPlan = BudgetPlan::where('year', $currentYear)->first();

        // Try to find any snapshot for active plan
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
            'lbc_current'     => $currentVersion?->lbc_reference  ?? null,
            'lbc_proposed'    => $proposedVersion?->lbc_reference  ?? null,
            'tranche_current' => $this->formatTranche($currentVersion),
            'tranche_proposed'=> $this->formatTranche($proposedVersion),
        ];
    }

    // ─── LEP header settings ──────────────────────────────────────────────────
    private function getLepHeaderSettings(int $budgetPlanId, BudgetPlan $plan): array
    {
        // Try loading from DB table first; fall back to defaults
        try {
            $settings = \DB::table('lep_header_settings')
                ->where('budget_plan_id', $budgetPlanId)
                ->first();

            if ($settings) {
                return (array) $settings;
            }
        } catch (\Throwable) {
            // Table might not exist yet
        }

        $lgu = $plan->lgu_name ?? 'OPOL, MISAMIS ORIENTAL';

        return [
            'province'            => 'Province of Misamis Oriental',
            'municipality'        => 'MUNICIPALITY OF ' . strtoupper($lgu),
            'office_name'         => 'OFFICE OF THE SANGGUNIANG BAYAN',
            'office_subtitle'     => 'MUNICIPALITY OF ' . strtoupper($lgu),
            'ordinance_session'   => '2ND SPECIAL SESSION',
            'session_date_text'   => "Began and held at its Mun. Session Hall on the ___ day of ________ Two Thousand Twenty Five at SB Session Hall, {$lgu}, Misamis Oriental",
            'ordinance_number'    => 'APPROPRIATION ORDINANCE NO. ' . $plan->year . ' - ___',
            'ordinance_title'     => 'AN ORDINANCE AUTHORIZING THE ' . $plan->year . ' ANNUAL BUDGET OF ' . strtoupper($lgu),
            'total_budget'        => 0.0,
            'general_fund_amount' => 0.0,
            'total_special_account_amount' => 0.0,
            'introduced_by'       => '',
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
    // HELPERS (copied from UnifiedReportController pattern)
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

    private function buildSignatories(): array
    {
        return [
            'budget_officer' => $this->getDeptHeadByName('budget'),
            'administrator'  => $this->getDeptHeadByName('administration'),
            'mpdc'           => $this->getDeptHeadByName('planning and development'),
            'treasurer'      => $this->getDeptHeadByName('treasurer'),
            'mayor'          => $this->getDeptHeadByName('mayor'),
            'hrmo'           => $this->getDeptHeadByName('human resources'),
            'accountant'     => $this->getDeptHeadByName('accounting'),
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
}
