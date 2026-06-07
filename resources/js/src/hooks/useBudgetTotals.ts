import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan, Department, DepartmentBudgetPlan } from '../types/api';
import { AipProgramEntry } from './useAipProgramData';
import { useAllFunds } from './useDashboardQueries';

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

// REPLACE computeTotals signature + body
function computeTotals(
  plans:       DepartmentBudgetPlan[],
  depts:       Department[],
  aipPrograms: AipProgramEntry[],
  shNonTax:    number,
  occNonTax:   number,
  pmNonTax:    number,
): BudgetTotals {
  const deptMap = new Map<number, Department>(depts.map(d => [d.dept_id, d]));

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

    const form2Total = (plan.items ?? []).reduce(
      (sum, item) => sum + (parseFloat(String(item.total_amount)) || 0), 0
    );
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

// REPLACE useBudgetTotals — add useAllFunds and pass nonTaxRevenue values
export function useBudgetTotals(activePlan: BudgetPlan | null): UseBudgetTotalsResult {
  const planId = activePlan?.budget_plan_id;

  const { data: plans = [], isLoading: plansLoading } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['dept-budget-plans', planId!],
    queryFn:  () =>
      API.get('/department-budget-plans', { params: { 'filter[budget_plan_id]': planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });

  const { data: depts = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
  });

  const { data: aipPrograms = [], isLoading: aipLoading } = useQuery<AipProgramEntry[]>({
    queryKey: ['aip-programs', planId!],
    queryFn:  () =>
      API.get('/aip-programs', { params: { budget_plan_id: planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });

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
