<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\BudgetPlanForm2Item;
use App\Models\BudgetPlanForm3Assignment;
use App\Models\Department;
use App\Models\DepartmentBudgetPlan;
use App\Models\DeptBpForm4Item;
use App\Models\SalaryGradeStep;
use App\Models\SalaryStandardVersion;
use Dompdf\Dompdf;
use Dompdf\Options;
use Illuminate\Http\Request;

class BudgetReportController extends Controller
{
    /* ═══════════════════════════════════════════════════════
       POST /api/reports/generate
    ═══════════════════════════════════════════════════════ */
    public function generate(Request $request)
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'department'     => 'required|string',
            'forms'          => 'required|array|min:1',
            'forms.*'        => 'in:form2,form3,form4',
        ]);

        try {
            $forms      = $request->forms;
            $reportData = $this->buildReportData($request);

            $options = new Options();
            $options->set('isHtml5ParserEnabled', true);
            $options->set('isRemoteEnabled', false);
            $options->set('defaultFont', 'DejaVu Sans');

            $dompdf = new Dompdf($options);
            $html   = view('reports.budget-forms', compact('reportData', 'forms'))->render();

            $dompdf->loadHtml($html);
            $dompdf->setPaper([0, 0, 612, 1008], 'portrait');
            $dompdf->render();

            $plan      = $reportData['budget_plan'];
            $deptParam = $request->department;
            $filename  = 'Budget_Forms_FY' . $plan->year
                . '_' . ($deptParam === 'all' ? 'AllDepts' : 'Dept' . $deptParam)
                . '_' . implode('-', array_map('strtoupper', $forms))
                . '.pdf';

            $disposition = $request->boolean('download') ? 'attachment' : 'inline';

            return response($dompdf->output())
                ->header('Content-Type', 'application/pdf')
                ->header('Content-Disposition', "{$disposition}; filename=\"{$filename}\"");

        } catch (\Throwable $e) {
            \Log::error('BudgetReport generate() failed', [
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
    }

    /* ═══════════════════════════════════════════════════════
       GET /api/reports/form2  (legacy)
    ═══════════════════════════════════════════════════════ */
    public function generateForm2(Request $request)
    {
        $request->validate([
            'year'       => 'required|integer',
            'department' => 'required|string',
        ]);

        $plan = BudgetPlan::where('year', $request->year)->firstOrFail();
        $request->merge([
            'budget_plan_id' => $plan->budget_plan_id,
            'forms'          => ['form2'],
        ]);

        return $this->generate($request);
    }

    /* ═══════════════════════════════════════════════════════
       DEBUG — GET /api/reports/debug-form3?budget_plan_id=X&department=Y
    ═══════════════════════════════════════════════════════ */
    public function debugForm3(Request $request)
    {
        try {
            $budgetPlan   = BudgetPlan::findOrFail($request->budget_plan_id);
            $proposedYear = (int) $budgetPlan->year;
            $currentYear  = $proposedYear - 1;
            $dept         = Department::findOrFail($request->department);

            $proposedPlan = DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                ->where('budget_plan_id', $budgetPlan->budget_plan_id)
                ->first();

            $currentBudgetPlan = BudgetPlan::where('year', $currentYear)->first();
            $currentPlan = $currentBudgetPlan
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $currentBudgetPlan->budget_plan_id)
                    ->first()
                : null;

            $proposedSnapshots = $proposedPlan
                ? BudgetPlanForm3Assignment::where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
                    ->with(['plantillaPosition', 'personnel'])->get()
                : collect();

            $currentSnapshots = $currentPlan
                ? BudgetPlanForm3Assignment::where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
                    ->with(['plantillaPosition', 'personnel'])->get()
                : collect();

            return response()->json([
                'proposed_year'      => $proposedYear,
                'current_year'       => $currentYear,
                'proposed_plan_id'   => $proposedPlan?->dept_budget_plan_id,
                'current_plan_id'    => $currentPlan?->dept_budget_plan_id,
                'proposed_count'     => $proposedSnapshots->count(),
                'current_count'      => $currentSnapshots->count(),
                'sample_proposed'    => $proposedSnapshots->first()?->toArray(),
                'sample_current'     => $currentSnapshots->first()?->toArray(),
                'active_salary_ver'  => SalaryStandardVersion::where('is_active', true)->first()?->toArray(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'error' => $e->getMessage(),
                'file'  => str_replace(base_path(), '', $e->getFile()),
                'line'  => $e->getLine(),
            ], 500);
        }
    }

    /* ═══════════════════════════════════════════════════════
       HELPER — resolve SalaryStandardVersion from a snapshot collection
       by matching salary_grade + step + monthly_rate to SalaryGradeStep.salary
    ═══════════════════════════════════════════════════════ */
    private function resolveVersionFromSnapshots($snapshots): ?SalaryStandardVersion
{
    foreach ($snapshots as $snap) {
        // ── Primary: use the stored version id (new rows after migration) ──
        if (! empty($snap->salary_standard_version_id)) {
            $version = SalaryStandardVersion::find($snap->salary_standard_version_id);
            if ($version) return $version;
        }
 
        // ── Fallback: reverse-lookup via salary_grade + step + monthly_rate ──
        // Handles old rows saved before the migration added the column.
        if ($snap->salary_grade && $snap->step && $snap->monthly_rate) {
            $gradeStep = SalaryGradeStep::with('version')
                ->where('salary_grade', $snap->salary_grade)
                ->where('step',         $snap->step)
                ->where('salary',       $snap->monthly_rate)
                ->first();
            if ($gradeStep?->version) return $gradeStep->version;
        }
    }
 
    return null;
}

    /* ─── format tranche label ──────────────────────────────────────────── */
    private function formatTranche(?SalaryStandardVersion $version): ?string
    {
        if (! $version) return null;
        $parts = array_filter([
            $version->tranche      ?? null,
            $version->income_class ?? null,
        ]);
        return implode(', ', $parts) ?: null;
    }

    /* ═══════════════════════════════════════════════════════
       DATA BUILDER
    ═══════════════════════════════════════════════════════ */
    private function buildReportData(Request $request): array
    {
        $budgetPlan   = BudgetPlan::findOrFail($request->budget_plan_id);
        $proposedYear = (int) $budgetPlan->year;
        $currentYear  = $proposedYear - 1;
        $pastYear     = $proposedYear - 2;
        $forms        = $request->forms;

        if ($request->department === 'all') {
            $departments = Department::orderBy('dept_name')->get();
        } else {
            $departments = Department::where('dept_id', $request->department)->get();
            abort_if($departments->isEmpty(), 404, 'Department not found');
        }

        $currentBudgetPlan = BudgetPlan::where('year', $currentYear)->first();
        $pastBudgetPlan    = BudgetPlan::where('year', $pastYear)->first();

        $deptReports = [];

        foreach ($departments as $dept) {

            $proposedPlan = DepartmentBudgetPlan::with([
                    'items.expenseItem.classification',
                    'budgetPlan',
                ])
                ->where('dept_id', $dept->dept_id)
                ->where('budget_plan_id', $budgetPlan->budget_plan_id)
                ->first();

            if (! $proposedPlan) continue;

            $currentPlan = $currentBudgetPlan
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $currentBudgetPlan->budget_plan_id)
                    ->first()
                : null;

            $pastPlan = $pastBudgetPlan
                ? DepartmentBudgetPlan::where('dept_id', $dept->dept_id)
                    ->where('budget_plan_id', $pastBudgetPlan->budget_plan_id)
                    ->first()
                : null;

            $report = [
                'department'    => $dept,
                'proposed_year' => $proposedYear,
                'current_year'  => $currentYear,
                'past_year'     => $pastYear,
            ];

            if (in_array('form2', $forms)) {
                $report['form2'] = $this->buildForm2($proposedPlan, $currentPlan, $pastPlan);
            }
            if (in_array('form3', $forms)) {
                $report['form3'] = $this->buildForm3($proposedPlan, $currentPlan, $currentYear, $proposedYear);
            }
            if (in_array('form4', $forms)) {
                $report['form4'] = $this->buildForm4($proposedPlan, $dept);
            }

            $deptReports[] = $report;
        }

        return [
            'budget_plan' => $budgetPlan,
            'departments' => $deptReports,
        ];
    }

    /* ─── FORM 2 ──────────────────────────────────────────────────────── */
    private function buildForm2($proposedPlan, $currentPlan, $pastPlan): array
    {
        $items = [];

        foreach ($proposedPlan->items as $proposedItem) {
            $expenseItem = $proposedItem->expenseItem;
            if (! $expenseItem) continue;

            $currentItem = $currentPlan
                ? BudgetPlanForm2Item::where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
                    ->where('expense_item_id', $expenseItem->expense_class_item_id)
                    ->first()
                : null;

            $pastItem = $pastPlan
                ? BudgetPlanForm2Item::where('dept_budget_plan_id', $pastPlan->dept_budget_plan_id)
                    ->where('expense_item_id', $expenseItem->expense_class_item_id)
                    ->first()
                : null;

            $items[] = [
                'classification' => $expenseItem->classification->expense_class_name ?? 'Uncategorized',
                'description'    => $expenseItem->expense_class_item_name,
                'account_code'   => $expenseItem->expense_class_item_acc_code,
                'past_total'     => (float) ($pastItem?->total_amount    ?? 0),
                'current_sem1'   => (float) ($currentItem?->sem1_amount  ?? 0),
                'current_sem2'   => (float) ($currentItem?->sem2_amount  ?? 0),
                'current_total'  => (float) ($currentItem?->total_amount ?? 0),
                'proposed'       => (float) $proposedItem->total_amount,
            ];
        }

        $aipItems = DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
            ->orderBy('dept_bp_form4_item_id')
            ->get();

        $specialPrograms = $aipItems->map(fn ($item) => [
            'aip_reference_code'  => $item->aipProgram?->aip_reference_code,
            'program_description' => $item->aipProgram?->program_description,
            'past_total'          => 0,
            'current_sem1'        => (float) ($item->sem1_amount ?? 0),
            'current_sem2'        => (float) ($item->sem2_amount ?? 0),
            'current_total'       => (float) (($item->sem1_amount ?? 0) + ($item->sem2_amount ?? 0)),
            'proposed'            => (float) $item->total_amount,
        ])->toArray();

        return compact('items', 'specialPrograms');
    }

    /* ─── FORM 3 ──────────────────────────────────────────────────────── */
    private function buildForm3($proposedPlan, $currentPlan, int $currentYear, int $proposedYear): array
    {
        // ── Load snapshots ────────────────────────────────────────────────
        $proposedSnapshots = BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
            ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
            ->get();

        $currentSnapshotsRaw = $currentPlan
            ? BudgetPlanForm3Assignment::with(['plantillaPosition', 'personnel'])
                ->where('dept_budget_plan_id', $currentPlan->dept_budget_plan_id)
                ->get()
            : collect();

        // ── Resolve LBC / tranche from the actual salary steps used ───────
        // Match salary_grade + step + monthly_rate → SalaryGradeStep.salary
        // → salary_standard_version_id → SalaryStandardVersion
        // This gives us the exact version that was active when the snapshot was saved.
        $proposedVersion = $this->resolveVersionFromSnapshots($proposedSnapshots)
            ?? SalaryStandardVersion::where('is_active', true)->first();

        $currentVersion = $this->resolveVersionFromSnapshots($currentSnapshotsRaw)
            ?? $proposedVersion; // same version is valid — use it for both columns

        $lbcCurrent      = $currentVersion?->lbc_reference ?? null;
        $trancheCurrent  = $this->formatTranche($currentVersion);
        $lbcProposed     = $proposedVersion?->lbc_reference ?? null;
        $trancheProposed = $this->formatTranche($proposedVersion);

        // No proposed snapshots → return empty rows
        if ($proposedSnapshots->isEmpty()) {
            return [
                'rows'            => [],
                'lbcCurrent'      => $lbcCurrent,
                'lbcProposed'     => $lbcProposed,
                'trancheCurrent'  => $trancheCurrent,
                'trancheProposed' => $trancheProposed,
            ];
        }

        // ── Key snapshots for lookup ──────────────────────────────────────
        $proposedKeyed   = $proposedSnapshots->keyBy('plantilla_position_id');
        $currentSnapshots = $currentSnapshotsRaw->keyBy('plantilla_position_id');

        // ── Union of position IDs, sorted by new_item_number ─────────────
        $allPositionIds = $proposedKeyed->keys()
            ->merge($currentSnapshots->keys())
            ->unique()
            ->sortBy(function ($posId) use ($proposedKeyed, $currentSnapshots) {
                $row = $proposedKeyed->get($posId) ?? $currentSnapshots->get($posId);
                $pos = $row?->plantillaPosition;
                return (int) ($pos?->new_item_number ?? $pos?->old_item_number ?? 9999);
            })
            ->values();

        $rows      = [];
        $newItemNo = 1;

        foreach ($allPositionIds as $positionId) {
            $proposed  = $proposedKeyed->get($positionId);
            $current   = $currentSnapshots->get($positionId);
            $plantilla = $proposed?->plantillaPosition ?? $current?->plantillaPosition;
            $personnel = $proposed?->personnel ?? $current?->personnel;

            if ($personnel) {
                $parts = array_filter([
                    $personnel->first_name  ?? null,
                    $personnel->middle_name
                        ? strtoupper(substr($personnel->middle_name, 0, 1)) . '.'
                        : null,
                    $personnel->last_name   ?? null,
                    $personnel->name_suffix ?? null,
                ]);
                $incumbentName = implode(' ', $parts) ?: 'Vacant';
            } else {
                $incumbentName = 'Vacant';
            }

            $rows[] = [
                'old_item_number'     => $plantilla?->old_item_number ?? null,
                'new_item_number'     => $plantilla?->new_item_number ?? (string) $newItemNo,
                'position_title'      => $plantilla?->position_title  ?? '',
                'incumbent'           => $incumbentName,
                'effective_date_note' => null,
                'salary_grade'        => $proposed?->salary_grade ?? $current?->salary_grade ?? null,
                'step_current'        => $current?->step  ?? 1,
                'step_proposed'       => $proposed?->step ?? 1,
                'current_amount'      => (float) ($current?->annual_rate  ?? 0),
                'proposed_amount'     => (float) ($proposed?->annual_rate ?? 0),
                'increase_decrease'   => (float) ($proposed?->annual_rate ?? 0) - (float) ($current?->annual_rate ?? 0),
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

    /* ─── FORM 4 ──────────────────────────────────────────────────────── */
    private function buildForm4($proposedPlan, Department $dept): array
    {
        $aipItems = DeptBpForm4Item::with('aipProgram')
            ->where('dept_budget_plan_id', $proposedPlan->dept_budget_plan_id)
            ->orderBy('dept_bp_form4_item_id')
            ->get();

        $rows = $aipItems->map(fn ($item) => [
            'aip_reference_code'    => $item->aipProgram?->aip_reference_code,
            'program_description'   => $item->aipProgram?->program_description,
            'major_final_output'    => $item->major_final_output,
            'performance_indicator' => $item->performance_indicator,
            'target'                => $item->target,
            'ps_amount'             => (float) ($item->ps_amount    ?? 0),
            'mooe_amount'           => (float) ($item->mooe_amount  ?? 0),
            'co_amount'             => (float) ($item->co_amount    ?? 0),
            'total_amount'          => (float) ($item->total_amount ?? 0),
        ])->toArray();

        return [
            'rows'                   => $rows,
            'mandate'                => $dept->mandate                ?? '',
            'mission'                => $dept->mission                ?? '',
            'vision'                 => $dept->vision                 ?? '',
            'organizational_outcome' => $dept->organizational_outcome ?? '',
        ];
    }
}