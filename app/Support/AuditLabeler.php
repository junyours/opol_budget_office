<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/**
 * Turns a model instance into human-readable text for the audit log.
 * Everything here is best-effort and must never throw.
 */
class AuditLabeler
{
    /** Friendly names for model classes (falls back to Str::headline). */
    private const TYPES = [
        'BudgetPlanForm2Item'       => 'Expense Item (Form 2)',
        'BudgetPlanForm3Assignment' => 'Plantilla Assignment (Form 3)',
        'DeptBpForm3Assignments'    => 'Plantilla Assignment (Form 3)',
        'BudgetPlanForm4Item'       => 'Program (Form 4)',
        'DeptBpForm4Item'           => 'Program (Form 4)',
        'BudgetPlanForm6Item'       => 'Form 6 Item',
        'Form6Item'                 => 'Form 6 Item',
        'DepartmentBudgetPlan'      => 'Department Budget Plan',
        'BudgetPlan'                => 'Budget Plan',
        'ExpenseClassItem'          => 'Expense Item',
        'ExpenseClassification'     => 'Expense Classification',
        'IncomeFundObject'          => 'Income Item',
        'IncomeFundAmount'          => 'Income Amount',
        'AIPProgram'                => 'AIP Program',
        'GADEntry'                  => 'GAD Entry',
        'MDFFund'                   => 'MDF Fund',
        'MDFFundAmount'             => 'MDF Amount',
        'MdfItem'                   => 'MDF Item',
        'MdfSnapshot'               => 'MDF Item Amount',
        'MdfCategory'               => 'MDF Category',
        'LdrrmfipItem'              => 'LDRRMFIP Item',
        'LdrrmfipCategory'          => 'LDRRMFIP Category',
        'DepartmentReviewSchedule'  => 'Review Schedule',
        'PlantillaPosition'         => 'Plantilla Position',
        'PlantillaAssignment'       => 'Plantilla Assignment',
        'SalaryStandardVersion'     => 'Salary Tranche',
        'SalaryGradeStep'           => 'Salary Grade Step',
        'DashboardAnnouncement'     => 'Announcement',
        'BudgetCallMemo'            => 'Budget Call Memo',
        'User'                      => 'User Account',
        'SystemSetting'             => 'System Setting',
        'PsSetting'                 => 'PS Setting',
        'PsComputationValue'        => 'PS Computation',
        'UnifiedPlanItem'           => 'Plan Item',
        'DebtObligation'            => 'Debt Obligation',
        'DebtPayment'               => 'Debt Payment',
        'LepHeaderSetting'          => 'LEP Header Setting',
        'DepartmentPlantillaBudget' => 'Plantilla Budget',
    ];

    /** Models that are "rows added to a plan" → logged as ADD instead of CREATE. */
    public const ADD_TYPES = [
        'BudgetPlanForm2Item', 'BudgetPlanForm3Assignment', 'DeptBpForm3Assignments',
        'BudgetPlanForm4Item', 'DeptBpForm4Item', 'BudgetPlanForm6Item', 'Form6Item',
        'PlantillaAssignment', 'UnifiedPlanItem', 'GADEntry', 'LdrrmfipItem',
    ];

    /** Friendlier field names (everything else → Str::headline). */
    private const FIELDS = [
        'total_amount'      => 'Proposed Amount',
        'sem1_amount'       => 'Sem 1 Amount',
        'sem2_amount'       => 'Sem 2 Amount',
        'obligation_amount' => 'Obligation (Actual)',
        'is_active'         => 'Active',
        'is_open'           => 'Open for Submission',
        'must_change_pass'  => 'Must Change Password',
        'dept_id'           => 'Department',
        'fname'             => 'First Name',
        'mname'             => 'Middle Name',
        'lname'             => 'Last Name',
        'pin'               => 'PIN',
    ];

    /** Columns tried (in order) when a model has no dedicated label rule. */
    private const NAME_COLUMNS = [
        'expense_class_item_name', 'dept_name', 'dept_category_name', 'expense_class_name',
        'position_title', 'title', 'name', 'label', 'creditor', 'program_description',
        'row_label', 'description', 'gad_activity', 'account_code', 'code',
        'original_filename', 'office_name', 'username',
    ];

    public static function type(Model $m): string
    {
        $base = class_basename($m);
        return self::TYPES[$base] ?? Str::headline($base);
    }

    public static function isAddType(Model $m): bool
    {
        return in_array(class_basename($m), self::ADD_TYPES, true);
    }

    public static function field(string $field): string
    {
        return self::FIELDS[$field] ?? Str::headline($field);
    }

    public static function label(Model $m): string
    {
        $label = null;

        try {
            $label = match (class_basename($m)) {
                'BudgetPlanForm2Item'  => self::form2Item($m),
                'DepartmentBudgetPlan' => self::deptPlan($m),
                'BudgetPlan'           => 'Budget Plan ' . $m->year,
                'Personnel'            => trim(($m->last_name ?? '') . ', ' . ($m->first_name ?? ''), ', '),
                'User'                 => trim(($m->fname ?? '') . ' ' . ($m->lname ?? '')) . ' (@' . ($m->username ?? '?') . ')',
                'SystemSetting'        => 'System Settings',
                'MdfSnapshot'          => self::mdfSnapshot($m),
                'DebtPayment'          => self::debtPayment($m),
                'LdrrmfipItem'         => self::ldrrmfipItem($m),
                'MDFFund'              => $m->object_of_expenditure ?: self::generic($m),
                'MDFFundAmount'        => $m->mdfFund?->object_of_expenditure ?: self::generic($m),
                'IncomeFundAmount'     => $m->object?->name ?: self::generic($m),
                'BudgetPlanForm6Item'  => $m->expenseItem?->expense_class_item_name ?: self::generic($m),
                'Form6Item'            => self::form6Item($m),
                'DeptBpForm4Item'      => $m->aipProgram?->program_description ?: self::generic($m),
                'BudgetPlanForm3Assignment',
                'DeptBpForm3Assignments' => self::assignment($m, $m->plantillaPosition),
                'PlantillaAssignment'  => self::assignment($m, $m->plantilla_position),
                'DepartmentPlantillaBudget' => self::plantillaBudget($m),
                'SalaryStandardVersion' => self::salaryVersion($m),
                'SalaryGradeStep'      => self::salaryStep($m),
                'PsSetting'            => $m->key ?: self::generic($m),
                'PsComputationValue'   => $m->budgetPlan?->year ? 'PS Computation ' . $m->budgetPlan->year : null,
                'DepartmentReviewSchedule' => self::reviewSchedule($m),
                default                => self::generic($m),
            };
        } catch (\Throwable) {
            $label = null;
        }

        if (!$label || !trim($label)) {
            $label = class_basename($m) . ' #' . ($m->getKey() ?? '?');
        }

        return Str::limit(trim($label), 200, '…');
    }

    // ── Specific rules ────────────────────────────────────────────────────────

    private static function form2Item(Model $m): string
    {
        $item = $m->expenseItem;
        $dept = $m->budgetPlan?->department;

        $name = $item?->expense_class_item_name ?: ('Item #' . $m->expense_item_id);
        return $dept ? "{$name} — {$dept->dept_name}" : $name;
    }

    private static function deptPlan(Model $m): string
    {
        $dept = $m->department;
        return ($dept?->dept_name ?: ('Dept #' . $m->dept_id)) . ' Budget Plan';
    }

        private static function mdfSnapshot(Model $m): ?string
    {
        return $m->item?->name ?: self::generic($m);
    }

    private static function debtPayment(Model $m): ?string
    {
        // withTrashed(): the loan may have been archived after the payment row was written.
        $ob       = $m->obligation()->withTrashed()->first(['creditor', 'purpose']);
        $creditor = trim((string) ($ob?->creditor ?? ''));
        $purpose  = trim((string) ($ob?->purpose ?? ''));

        if ($creditor !== '' && $purpose !== '') {
            return $creditor . ' — ' . Str::limit($purpose, 60, '…');
        }
        if ($creditor !== '') {
            return $creditor;
        }
        return $purpose !== '' ? Str::limit($purpose, 80, '…') : null;
    }

    private static function ldrrmfipItem(Model $m): ?string
    {
        $desc = trim((string) ($m->description ?? ''));

        // "__QRF_30__" is the internal marker of the 30% Quick Response Fund row.
        if ($desc === '__QRF_30__') {
            return 'Quick Response Fund (30% QRF)';
        }
        return $desc !== '' ? $desc : null;
    }

    private static function form6Item(Model $m): ?string
    {
        $name = $m->template?->label;
        if (!is_string($name) || trim($name) === '') {
            return null;
        }
        $source = is_string($m->source) && $m->source !== '' ? Str::headline($m->source) : null;
        return $source ? "{$name} ({$source})" : $name;
    }

    private static function assignment(Model $m, ?Model $position): ?string
    {
        $p      = $m->personnel;
        $person = $p ? trim(($p->last_name ?? '') . ', ' . ($p->first_name ?? ''), ', ') : '';
        $parts  = array_filter([$position?->position_title, $person], fn ($v) => is_string($v) && trim($v) !== '');

        return $parts ? implode(' — ', $parts) : null;
    }

    private static function plantillaBudget(Model $m): ?string
    {
        $parts = array_filter([$m->position?->position_title, $m->incumbent_name], fn ($v) => is_string($v) && trim($v) !== '');

        return $parts ? implode(' — ', $parts) : null;
    }

    private static function salaryVersion(Model $m): ?string
    {
        $parts = [];
        if ($m->tranche !== null && trim((string) $m->tranche) !== '') {
            $parts[] = 'Tranche ' . $m->tranche;
        }
        if (is_string($m->lbc_reference) && trim($m->lbc_reference) !== '') {
            $parts[] = $m->lbc_reference;
        }
        return $parts ? implode(' — ', $parts) : null;
    }

    private static function salaryStep(Model $m): ?string
    {
        if ($m->salary_grade === null) {
            return null;
        }
        $label   = 'Salary Grade ' . $m->salary_grade . ($m->step !== null ? ', Step ' . $m->step : '');
        $tranche = $m->version?->tranche;

        return ($tranche !== null && $tranche !== '') ? "{$label} (Tranche {$tranche})" : $label;
    }

    private static function reviewSchedule(Model $m): ?string
    {
        $date  = $m->review_date;
        $date  = $date instanceof \DateTimeInterface ? $date->format('M j, Y') : (is_string($date) ? $date : null);
        $parts = array_filter([$m->department?->dept_name, $date], fn ($v) => is_string($v) && trim($v) !== '');

        return $parts ? implode(' — ', $parts) : null;
    }

    

    private static function generic(Model $m): ?string
    {
        foreach (self::NAME_COLUMNS as $col) {
            $v = $m->getAttribute($col);
            if (is_string($v) && trim($v) !== '') {
                return $v;
            }
        }
        return null;
    }
}
