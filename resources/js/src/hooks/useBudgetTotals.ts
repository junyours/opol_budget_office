import { BudgetPlan } from '../types/api';
import {
  useAllFunds, useDepartmentsLite, DepartmentLite,
  useDepartmentBudgetPlans, useAipPrograms,
  DepartmentBudgetPlanLite,
} from './useDashboardQueries';

const SPECIAL_ACCOUNTS_CATEGORY_ID = 4;

export interface BudgetTotals {
  gfExpenditure:  number;
  shExpenditure:  number;
  occExpenditure: number;
  pmExpenditure:  number;
  shCalamity:     number;  // 5% of SH non-tax revenue
  occCalamity:    number;  // 5% of OCC non-tax revenue
  pmCalamity:     number;  // 5% of PM non-tax revenue
}

export interface UseBudgetTotalsResult {
  totals:  BudgetTotals;
  loading: boolean;
}

const EMPTY: BudgetTotals = {
  gfExpenditure: 0, shExpenditure: 0,
  occExpenditure: 0, pmExpenditure: 0,
  shCalamity: 0, occCalamity: 0, pmCalamity: 0,
};

function computeTotals(
  plans:       DepartmentBudgetPlanLite[],
  depts:       DepartmentLite[],
  aipPrograms: { dept_id: number; total_amount: number }[],
  shNonTax:    number,
  occNonTax:   number,
  pmNonTax:    number,
): BudgetTotals {
  const deptMap = new Map<number, DepartmentLite>(depts.map(d => [d.dept_id, d]));

  const aipByDept = new Map<number, number>();
  aipPrograms.forEach(p => {
    aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
  });

  const result = { ...EMPTY };

  // Calamity fund is a mandatory appropriation — treat it as an expenditure
  result.shCalamity  = shNonTax  * 0.05;
  result.occCalamity = occNonTax * 0.05;
  result.pmCalamity  = pmNonTax  * 0.05;

  plans.forEach(plan => {
    const dept = deptMap.get(plan.dept_id);
    if (!dept) return;

    const form2Total = parseFloat(plan.items_total as any) || 0;
    const aipTotal = aipByDept.get(plan.dept_id) ?? 0;
    const deptTotal = form2Total + aipTotal;
    if (deptTotal === 0) return;

    const isSpecial = dept.dept_category_id === SPECIAL_ACCOUNTS_CATEGORY_ID;
    if (!isSpecial) {
      result.gfExpenditure += deptTotal;
    } else {
      const abbr = (dept.dept_abbreviation ?? '').trim().toUpperCase();
      if      (abbr === 'SH')  result.shExpenditure  += deptTotal;
      else if (abbr === 'OCC') result.occExpenditure += deptTotal;
      else if (abbr === 'PM')  result.pmExpenditure  += deptTotal;
    }
  });

  return result;
}

// Reads from the SAME cache entries as the rest of the dashboard (no
// duplicate fetches, no colliding query keys, no items/items_total mismatch).
export function useBudgetTotals(activePlan: BudgetPlan | null): UseBudgetTotalsResult {
  const planId = activePlan?.budget_plan_id;

  const { data: plans = [], isLoading: plansLoading } = useDepartmentBudgetPlans(planId);
  const { data: depts = [], isLoading: deptsLoading } = useDepartmentsLite();

  const { data: aipPrograms = [], isLoading: aipLoading } = useAipPrograms(
    planId,
    (rows: any[]) => rows.map(p => ({ dept_id: p.dept_id, total_amount: parseFloat(p.total_amount) || 0 })),
  );

  // Need non-tax revenue for each special account to compute 5% calamity fund
  const { data: funds, isLoading: fundsLoading } = useAllFunds();

  const loading = plansLoading || deptsLoading || aipLoading || fundsLoading;

  return {
    totals: loading ? EMPTY : computeTotals(
      plans, depts, aipPrograms,
      funds?.sh.nonTaxRevenue  ?? 0,
      funds?.occ.nonTaxRevenue ?? 0,
      funds?.pm.nonTaxRevenue  ?? 0,
    ),
    loading,
  };
}
