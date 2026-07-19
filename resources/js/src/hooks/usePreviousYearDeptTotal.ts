import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan, DepartmentBudgetPlan, ExpenseItem, ExpenseClassification } from '../types/api';
import { useAipProgramData } from './useAipProgramData';

const CLASS_PS   = "Personal Services";
const CLASS_MOOE = "Maintenance and Other Operating Expenses";
const CLASS_CO   = "Capital Outlay";

export interface UsePreviousYearDeptTotalResult {
  previousPlan: BudgetPlan | null;
  previousTotal: number | null; // null = no prior-year plan/data exists at all
  previousPS: number | null;
  previousMOOE: number | null;
  previousCO: number | null;
  loading: boolean;
}

export function usePreviousYearDeptTotal(
  deptId?: number,
  currentYear?: number,
): UsePreviousYearDeptTotalResult {
  const { data: allPlans = [], isLoading: plansListLoading } = useQuery<BudgetPlan[]>({
    queryKey: ['budget-plans'],
    queryFn: () => API.get('/budget-plans').then(r => r.data?.data ?? []),
  });

  const previousPlan = useMemo(() => {
    if (!currentYear) return null;
    return allPlans.find(p => p.year === currentYear - 1) ?? null;
  }, [allPlans, currentYear]);

  const previousPlanId = previousPlan?.budget_plan_id;

  const { data: deptPlans = [], isLoading: deptPlansLoading } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['dept-budget-plans', previousPlanId ?? 'none'],
    queryFn: () =>
      API.get('/department-budget-plans', {
        params: { budget_plan_id: previousPlanId },
      }).then(r => r.data?.data ?? []),
    enabled: !!previousPlanId,
  });

  const { programs: previousAipPrograms, loading: aipLoading } = useAipProgramData(previousPlanId);

  // Shared caches with useExpenseData — same query keys, so no duplicate fetch
  // once useExpenseData has already loaded these for the current year.
  const { data: expenseItems = [], isLoading: itemsLoading } = useQuery<ExpenseItem[]>({
    queryKey: ['expense-class-items'],
    queryFn: () => API.get('/expense-class-items').then(r => r.data.data),
  });
  const { data: classifications = [], isLoading: classLoading } = useQuery<ExpenseClassification[]>({
    queryKey: ['expense-classifications'],
    queryFn: () => API.get('/expense-classifications').then(r => r.data.data),
  });

  const loading =
    plansListLoading ||
    (!!previousPlanId && (deptPlansLoading || aipLoading)) ||
    itemsLoading ||
    classLoading;

  const expenseItemMap = useMemo(() => {
    const classMap = new Map(classifications.map(c => [c.expense_class_id, c.expense_class_name]));
    return new Map(
      expenseItems.map(i => [i.expense_class_item_id, classMap.get(i.expense_class_id) ?? '']),
    );
  }, [expenseItems, classifications]);

  const { previousTotal, previousPS, previousMOOE, previousCO } = useMemo(() => {
    if (!deptId || !previousPlanId) {
      return { previousTotal: null, previousPS: null, previousMOOE: null, previousCO: null };
    }

    const deptPlan = deptPlans.find(
      p => p.dept_id === deptId && p.budget_plan_id === previousPlanId,
    );

    let ps = 0, mooe = 0, co = 0;
    (deptPlan?.items ?? []).forEach(item => {
      const amt = parseFloat(String(item.total_amount)) || 0;
      const cls = expenseItemMap.get(item.expense_item_id);
      if (cls === CLASS_PS) ps += amt;
      else if (cls === CLASS_MOOE) mooe += amt;
      else if (cls === CLASS_CO) co += amt;
    });

    const aipTotal = previousAipPrograms
      .filter(p => p.dept_id === deptId)
      .reduce((sum, p) => sum + (p.total_amount ?? 0), 0);

    return {
      previousTotal: ps + mooe + co + aipTotal,
      previousPS: ps,
      previousMOOE: mooe,
      previousCO: co,
    };
  }, [deptPlans, previousAipPrograms, expenseItemMap, deptId, previousPlanId]);

  return { previousPlan, previousTotal, previousPS, previousMOOE, previousCO, loading };
}
