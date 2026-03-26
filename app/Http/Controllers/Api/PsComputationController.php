<?php
// app/Http/Controllers/Api/PsComputationController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\DepartmentCategory;
use App\Models\PsComputationValue;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PsComputationController extends Controller
{
    // ══════════════════════════════════════════════════════════════════════════
    // PS_ITEMS maps internal keys → EXACT expense_class_item_name strings.
    //
    // Magna Carta Benefits for Public Health Workers = Subsistence Allowance
    // Hazard Pay = Hazard Pay expense item (MC Health Benefits + MC PSW RA 9433)
    // Laundry Allowance is NOT shown on the PS Computation sheet.
    // ══════════════════════════════════════════════════════════════════════════

    private const PS_ITEMS = [
        // ── Section A ────────────────────────────────────────────────────────
        'salaries_wages'          => 'Salaries and Wages - Regular',

        // ── Section B ────────────────────────────────────────────────────────
        'retirement_insurance'    => 'Retirement and Life Insurance Premiums',
        'pag_ibig'                => 'Pag-IBIG Contributions',
        'philhealth'              => 'PhilHealth Contributions',
        'ec_insurance'            => 'Employees Compensation Insurance Premiums',

        // ── Section C ────────────────────────────────────────────────────────
        'pera'                    => 'Personal Economic Relief Allowance (PERA)',
        'representation'          => 'Representation Allowance (RA)',
        'transportation'          => 'Transportation Allowance (TA)',
        'clothing'                => 'Clothing/Uniform Allowance',
        'magna_carta'             => 'Subsistence Allowance',   // Magna Carta Benefits for Public Health Workers
        'hazard_pay'              => 'Hazard Pay',              // MC Health Benefits + MC PSW RA 9433
        'honoraria'               => 'Honoraria',
        'overtime_pay'            => 'Overtime and Night Pay',
        'cash_gift'               => 'Cash Gift',
        'mid_year_bonus'          => 'Mid-Year Bonus',          // same acc_code as Year End → name-only lookup
        'year_end_bonus'          => 'Year End Bonus',
        'terminal_leave'          => 'Terminal Leave Benefits',
        'productivity_incentive'  => 'Productivity Incentive Allowance',
        'monetization'            => 'Other Personnel Benefits',
    ];

    // ══════════════════════════════════════════════════════════════════════════
    // GET /api/ps-computation/debug?budget_plan_id=X
    // ══════════════════════════════════════════════════════════════════════════

    public function debug(Request $request): JsonResponse
    {
        $activePlan = $this->resolvePlan($request->query('budget_plan_id'));
        if (! $activePlan) {
            return response()->json(['message' => 'No active budget plan found.'], 404);
        }

        $rows = DB::table('dept_bp_form2_items as f2')
            ->join('department_budget_plans as dbp', 'dbp.dept_budget_plan_id', '=', 'f2.dept_budget_plan_id')
            ->join('departments as d',               'd.dept_id',               '=', 'dbp.dept_id')
            ->join('expense_class_items as ei',      'ei.expense_class_item_id','=', 'f2.expense_item_id')
            ->where('dbp.budget_plan_id', $activePlan->budget_plan_id)
            ->when($this->specialAccountsCatId(), fn($q, $id) =>
                $q->where('d.dept_category_id', '!=', $id)
            )
            ->groupBy('ei.expense_class_item_name', 'ei.expense_class_item_acc_code')
            ->orderBy('ei.expense_class_item_acc_code')
            ->select(
                'ei.expense_class_item_acc_code as acc_code',
                'ei.expense_class_item_name     as item_name',
                DB::raw('SUM(f2.total_amount)   as total')
            )
            ->get();

        return response()->json([
            'budget_plan_id'     => $activePlan->budget_plan_id,
            'year'               => $activePlan->year,
            'special_accts_cat'  => $this->specialAccountsCatId(),
            'rows'               => $rows,
            'ps_items_constants' => self::PS_ITEMS,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // GET /api/ps-computation?budget_plan_id=X
    // ══════════════════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $activePlan = $this->resolvePlan($request->query('budget_plan_id'));
        if (! $activePlan) {
            return response()->json(['message' => 'No active budget plan found.'], 404);
        }

        $proposedYear = (int) $activePlan->year;
        $incomeYear   = $proposedYear - 2;

        $values = PsComputationValue::firstOrCreate(
            ['budget_plan_id' => $activePlan->budget_plan_id],
            ['total_income' => 0, 'non_recurring_income' => 0, 'excess_amount' => 0]
        );

        $aggregates = $this->fetchAggregates($activePlan->budget_plan_id);

        $byName = $aggregates
            ->groupBy('item_name')
            ->map(fn($group) => $group->sum('total'));

        $agg = function (string $key) use ($byName): float {
            $name = self::PS_ITEMS[$key] ?? null;
            if (! $name) return 0.0;
            return (float) ($byName->get($name) ?? 0);
        };

        // ── Section A ─────────────────────────────────────────────────────
        $salariesWages = $agg('salaries_wages');

        // ── Section B ─────────────────────────────────────────────────────
        $retirementInsurance = $agg('retirement_insurance');
        $pagIbig             = $agg('pag_ibig');
        $philhealth          = $agg('philhealth');
        $ecInsurance         = $agg('ec_insurance');
        $subtotalB           = $retirementInsurance + $pagIbig + $philhealth + $ecInsurance;

        // ── Section C ─────────────────────────────────────────────────────
        $pera            = $agg('pera');
        $representation  = $agg('representation');
        $transportation  = $agg('transportation');
        $clothing        = $agg('clothing');
        $magnaCarta      = $agg('magna_carta');   // Subsistence Allowance
        $hazardPay       = $agg('hazard_pay');    // Hazard Pay expense item
        $honoraria       = $agg('honoraria');
        $overtimePay     = $agg('overtime_pay');
        $cashGift        = $agg('cash_gift');
        $midYearBonus    = $agg('mid_year_bonus');
        $yearEndBonus    = $agg('year_end_bonus');
        $terminalLeave   = $agg('terminal_leave');
        $productivityInc = $agg('productivity_incentive');
        $monetization    = $agg('monetization');

        // Note: laundry is intentionally excluded from the PS Computation sheet
        $subtotalC = $pera + $representation + $transportation + $clothing
                   + $magnaCarta + $hazardPay
                   + $honoraria + $overtimePay
                   + $cashGift + $midYearBonus + $yearEndBonus
                   + $terminalLeave + $productivityInc + $monetization;

        $totalPs = $salariesWages + $subtotalB + $subtotalC;

        $totalIncome         = (float) $values->total_income;
        $nonRecurring        = (float) $values->non_recurring_income;
        $totalRealizedIncome = $totalIncome - $nonRecurring;
        $psLimitation        = $totalRealizedIncome * 0.45;

        $terminalLeaveGF = $terminalLeave;
        $monetizationGF  = $monetization;
        $totalWaived     = $totalPs + $terminalLeaveGF + $monetizationGF;
        $amountAllowable = $psLimitation - $totalWaived;

        return response()->json([
            'budget_plan' => [
                'budget_plan_id' => $activePlan->budget_plan_id,
                'year'           => $proposedYear,
            ],
            'income_year'       => $incomeYear,
            'ps_computation_id' => $values->ps_computation_id,

            'manual' => [
                'total_income'         => $totalIncome,
                'non_recurring_income' => $nonRecurring,
                'excess_amount'        => (float) $values->excess_amount,
            ],

            'top' => [
                'total_realized_income' => $totalRealizedIncome,
                'ps_limitation'         => $psLimitation,
                'total_ps_gf'           => $totalPs,
                'excess_amount'         => (float) $values->excess_amount,
                'terminal_leave_gf'     => $terminalLeaveGF,
                'monetization_gf'       => $monetizationGF,
                'total_waived'          => $totalWaived,
                'amount_allowable'      => $amountAllowable,
            ],

            'detail' => [
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
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/ps-computation/save
    // ══════════════════════════════════════════════════════════════════════════

    public function save(Request $request): JsonResponse
    {
        $v = $request->validate([
            'budget_plan_id'       => 'required|integer|exists:budget_plans,budget_plan_id',
            'total_income'         => 'required|numeric|min:0',
            'non_recurring_income' => 'required|numeric|min:0',
            'excess_amount'        => 'required|numeric|min:0',
        ]);

        $values = PsComputationValue::updateOrCreate(
            ['budget_plan_id' => $v['budget_plan_id']],
            [
                'total_income'         => $v['total_income'],
                'non_recurring_income' => $v['non_recurring_income'],
                'excess_amount'        => $v['excess_amount'],
            ]
        );

        return response()->json(['data' => $values]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Private helpers
    // ══════════════════════════════════════════════════════════════════════════

    private function resolvePlan(?string $budgetPlanId): ?BudgetPlan
    {
        if ($budgetPlanId) {
            return BudgetPlan::find($budgetPlanId);
        }
        return BudgetPlan::where('is_active', true)->latest('budget_plan_id')->first();
    }

    private function specialAccountsCatId(): ?int
    {
        return DepartmentCategory::where('dept_category_name', 'Special Accounts')
            ->value('dept_category_id');
    }

    private function fetchAggregates(int $budgetPlanId)
    {
        $specialAccountsCatId = $this->specialAccountsCatId();

        return DB::table('dept_bp_form2_items as f2')
            ->join('department_budget_plans as dbp', 'dbp.dept_budget_plan_id', '=', 'f2.dept_budget_plan_id')
            ->join('departments as d',               'd.dept_id',               '=', 'dbp.dept_id')
            ->join('expense_class_items as ei',      'ei.expense_class_item_id','=', 'f2.expense_item_id')
            ->where('dbp.budget_plan_id', $budgetPlanId)
            ->when($specialAccountsCatId, fn($q, $id) =>
                $q->where('d.dept_category_id', '!=', $id)
            )
            ->groupBy('ei.expense_class_item_name', 'ei.expense_class_item_acc_code')
            ->select(
                'ei.expense_class_item_name     as item_name',
                'ei.expense_class_item_acc_code as acc_code',
                DB::raw('SUM(f2.total_amount)   as total')
            )
            ->get();
    }
}