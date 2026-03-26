<?php

namespace App\Services;

use Illuminate\Support\Facades\DB;

/**
 * AggregateTotalsService
 *
 * Single source of truth for all named expense aggregates.
 *
 * Consumed by:
 *   - AggregateTotalsController  →  REST API  (GET /api/totals, GET /api/totals/{key})
 *   - Form6Controller            →  direct injection, no HTTP round-trip
 *
 * ── How to add a new total ─────────────────────────────────────────────────
 *   Add ONE entry to DEFINITIONS.  Both the API and any service consumer
 *   will pick it up automatically.  No other files need changing.
 * ──────────────────────────────────────────────────────────────────────────
 */
class AggregateTotalsService
{
    /**
     * Registry of all named aggregates.
     *
     * Keys:
     *   label            – human-readable name returned to the frontend
     *   expense_names    – one or more expense_class_item_name patterns
     *                      (case-insensitive LIKE; multiple entries are OR-ed
     *                       and their amounts are summed together)
     *   exclude_category – (optional) dept_category_name fragment whose
     *                      departments are excluded from the sum.
     *                      Defaults to 'Special Account'.
     */
    private const DEFINITIONS = [

        // ── PS Allowances ──────────────────────────────────────────────────
        'retirementGratuity' => [
            'label'         => 'Retirement Gratuity',
            'expense_names' => ['Retirement Gratuity'],
        ],

        'terminalLeave' => [
            'label'         => 'Terminal Leave Benefits',
            'expense_names' => ['Terminal Leave Benefits'],
        ],

        'otherPersonnelBenefits' => [
            'label'         => 'Other Personnel Benefits',
            'expense_names' => ['Other Personnel Benefits'],
        ],

        'ecip' => [
            'label'         => 'Employees Compensation Insurance Premiums',
            'expense_names' => ['Employees Compensation Insurance Premiums'],
        ],

        'philHealth' => [
            'label'         => 'PhilHealth Contributions',
            'expense_names' => ['PhilHealth Contributions'],
        ],

        'pagIbig' => [
            'label'         => 'Pag-IBIG Contributions',
            'expense_names' => ['Pag-IBIG Contributions'],
        ],

        'retirementAndLifeInsurance' => [
            'label'         => 'Retirement and Life Insurance Premiums',
            'expense_names' => ['Retirement and Life Insurance Premiums'],
        ],

        // ── Convenience rollup ────────────────────────────────────────────
        'psAllowancesTotal' => [
            'label'         => 'Total PS Allowances (Form 6 relevant)',
            'expense_names' => [
                'Retirement Gratuity',
                'Terminal Leave Benefits',
                'Other Personnel Benefits',
                'Employees Compensation Insurance Premiums',
                'PhilHealth Contributions',
                'Pag-IBIG Contributions',
                'Retirement and Life Insurance Premiums',
            ],
        ],

        // ── Extend here ───────────────────────────────────────────────────
        // 'salariesAndWages' => [
        //     'label'         => 'Salaries and Wages',
        //     'expense_names' => [
        //         'Salaries and Wages - Regular',
        //         'Salaries and Wages - Casual/Contractual',
        //     ],
        // ],
    ];

    // ─────────────────────────────────────────────────────────────────────
    // Public API
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Compute a single named total.
     *
     * @throws \InvalidArgumentException for an unregistered key
     */
    public function compute(int $budgetPlanId, string $key): float
    {
        $this->assertKey($key);
        return $this->sum($budgetPlanId, self::DEFINITIONS[$key]);
    }

    /**
     * Compute multiple named totals in one call.
     *
     * @param  string[] $keys  Subset of DEFINITIONS keys; pass [] for all.
     * @return array<string, float>  [ 'philHealth' => 12345.67, … ]
     */
    public function computeMultiple(int $budgetPlanId, array $keys = []): array
    {
        $defs = empty($keys)
            ? self::DEFINITIONS
            : array_intersect_key(self::DEFINITIONS, array_flip($keys));

        $results = [];
        foreach ($defs as $key => $definition) {
            $results[$key] = $this->sum($budgetPlanId, $definition);
        }

        return $results;
    }

    /**
     * Return all key → label pairs without touching the DB.
     *
     * @return array<string, string>  [ 'philHealth' => 'PhilHealth Contributions', … ]
     */
    public function labels(): array
    {
        return array_map(fn ($def) => $def['label'], self::DEFINITIONS);
    }

    /**
     * Return every registered key.
     *
     * @return string[]
     */
    public function keys(): array
    {
        return array_keys(self::DEFINITIONS);
    }

    /**
     * Return the active budget_plan_id, or null when none is active.
     */
    public function activeBudgetPlanId(): ?int
    {
        $id = DB::table('budget_plans')
            ->where('is_active', true)
            ->value('budget_plan_id');

        return $id ? (int) $id : null;
    }

    // ─────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────

    /**
     * Core query: resolve IDs → filter depts → sum amounts.
     */
    private function sum(int $budgetPlanId, array $definition): float
    {
        $excludeFragment = $definition['exclude_category'] ?? 'Special Account';

        // 1. expense_class_item_ids matching any of the name patterns
        $patterns = array_map('strtolower', $definition['expense_names']);

        $expenseItemIds = DB::table('expense_class_items')
            ->where(function ($q) use ($patterns) {
                foreach ($patterns as $p) {
                    $q->orWhereRaw('LOWER(expense_class_item_name) LIKE ?', ["%{$p}%"]);
                }
            })
            ->pluck('expense_class_item_id');

        if ($expenseItemIds->isEmpty()) {
            return 0.0;
        }

        // 2. dept_budget_plan_ids for this plan, excluding Special Accounts depts
        $excludedDeptIds = DB::table('departments')
            ->join(
                'department_categories',
                'departments.dept_category_id',
                '=',
                'department_categories.dept_category_id'
            )
            ->whereRaw(
                'LOWER(department_categories.dept_category_name) LIKE ?',
                ['%' . strtolower($excludeFragment) . '%']
            )
            ->pluck('departments.dept_id');

        $deptPlanQuery = DB::table('department_budget_plans')
            ->where('budget_plan_id', $budgetPlanId);

        if ($excludedDeptIds->isNotEmpty()) {
            $deptPlanQuery->whereNotIn('dept_id', $excludedDeptIds);
        }

        $deptPlanIds = $deptPlanQuery->pluck('dept_budget_plan_id');

        if ($deptPlanIds->isEmpty()) {
            return 0.0;
        }

        // 3. Sum
        return (float) DB::table('dept_bp_form2_items')
            ->whereIn('dept_budget_plan_id', $deptPlanIds)
            ->whereIn('expense_item_id', $expenseItemIds)
            ->sum('total_amount');
    }

    private function assertKey(string $key): void
    {
        if (!array_key_exists($key, self::DEFINITIONS)) {
            throw new \InvalidArgumentException(
                "Unknown aggregate key \"{$key}\". "
                . 'Available: ' . implode(', ', array_keys(self::DEFINITIONS))
            );
        }
    }
}
