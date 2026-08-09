import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

export interface ExpenseTotals {
  ps: number;
  mooe: number;
  co: number;
  total: number;
  dept_budget_plan_id: number | null;
  status: string | null;
}

export function useExpenseTotals(budgetPlanId?: number, deptId?: number | null) {
  return useQuery<ExpenseTotals>({
    queryKey: ['expense-totals', budgetPlanId, deptId ?? 'none'],
    queryFn: () =>
      API.get('/department-budget-plans/expense-totals', {
        params: { budget_plan_id: budgetPlanId, dept_id: deptId },
      }).then(r => r.data?.data),
    enabled: !!budgetPlanId && !!deptId,
  });
}
