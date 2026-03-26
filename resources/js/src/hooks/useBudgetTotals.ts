
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan, Department, DepartmentBudgetPlan } from '../types/api';

const SPECIAL_ACCOUNTS_CATEGORY_ID = 4;

export interface BudgetTotals {
  gfExpenditure:  number;
  shExpenditure:  number;
  occExpenditure: number;
  pmExpenditure:  number;
}

export interface UseBudgetTotalsResult {
  totals:  BudgetTotals;
  loading: boolean;
}

const EMPTY: BudgetTotals = {
  gfExpenditure: 0, shExpenditure: 0,
  occExpenditure: 0, pmExpenditure: 0,
};

function computeTotals(plans: DepartmentBudgetPlan[], depts: Department[]): BudgetTotals {
  const deptMap = new Map<number, Department>(depts.map(d => [d.dept_id, d]));
  const result  = { ...EMPTY };

  plans.forEach(plan => {
    const dept = deptMap.get(plan.dept_id);
    if (!dept) return;

    const deptTotal = (plan.items ?? []).reduce(
      (sum, item) => sum + (parseFloat(String(item.total_amount)) || 0), 0
    );
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

export function useBudgetTotals(activePlan: BudgetPlan | null): UseBudgetTotalsResult {
  const planId = activePlan?.budget_plan_id;

  const { data: plans = [], isLoading: plansLoading } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['dept-budget-plans', planId!],  // ← was 'budget-totals-dps'
    queryFn:  () =>
      API.get('/department-budget-plans', { params: { 'filter[budget_plan_id]': planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });

  const { data: depts = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],           // ← same key as useDepartments — shared cache!
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
  });

  return {
    totals:  plansLoading || deptsLoading ? EMPTY : computeTotals(plans, depts),
    loading: plansLoading || deptsLoading,
  };
}