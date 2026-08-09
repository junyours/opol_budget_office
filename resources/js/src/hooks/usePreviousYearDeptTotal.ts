// import { useMemo } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import API from '../services/api';
// import { BudgetPlan, DepartmentBudgetPlan, ExpenseItem, ExpenseClassification } from '../types/api';
// import { useAipProgramData } from './useAipProgramData';

// const CLASS_PS   = "Personal Services";
// const CLASS_MOOE = "Maintenance and Other Operating Expenses";
// const CLASS_CO   = "Capital Outlay";

// export interface UsePreviousYearDeptTotalResult {
//   previousPlan: BudgetPlan | null;
//   previousTotal: number | null; // null = no prior-year plan/data exists at all
//   previousPS: number | null;
//   previousMOOE: number | null;
//   previousCO: number | null;
//   loading: boolean;
// }

// export function usePreviousYearDeptTotal(
//   deptId?: number,
//   currentYear?: number,
// ): UsePreviousYearDeptTotalResult {
//   // Distinct key + fields param — was colliding with useBudgetPlans()'s
//   // ['budget-plans'] cache key while requesting a different (unfiltered) shape.
//   const { data: allPlans = [], isLoading: plansListLoading } = useQuery<BudgetPlan[]>({
//     queryKey: ['budget-plans', 'year-lookup'],
//     queryFn: () =>
//       API.get('/budget-plans', { params: { fields: 'budget_plan_id,year' } })
//         .then(r => r.data?.data ?? []),
//   });

//   const previousPlan = useMemo(() => {
//     if (!currentYear) return null;
//     return allPlans.find(p => p.year === currentYear - 1) ?? null;
//   }, [allPlans, currentYear]);

//   const previousPlanId = previousPlan?.budget_plan_id;

//   const { data: deptPlans = [], isLoading: deptPlansLoading } = useQuery<DepartmentBudgetPlan[]>({
//     queryKey: ['dept-budget-plans', previousPlanId ?? 'none', deptId ?? 'none'],
//     queryFn: () =>
//       API.get('/department-budget-plans', {
//         params: { budget_plan_id: previousPlanId, dept_id: deptId },
//       }).then(r => r.data?.data ?? []),
//     enabled: !!previousPlanId && !!deptId,
//   });

//   const { programs: previousAipPrograms, loading: aipLoading } = useAipProgramData(previousPlanId, deptId);

//   // Shared caches with useExpenseData — same query keys, so no duplicate fetch
//   // once useExpenseData has already loaded these for the current year.
//   const { data: expenseItems = [], isLoading: itemsLoading } = useQuery<ExpenseItem[]>({
//     queryKey: ['expense-class-items'],
//     queryFn: () => API.get('/expense-class-items').then(r => r.data.data),
//   });
//   const { data: classifications = [], isLoading: classLoading } = useQuery<ExpenseClassification[]>({
//     queryKey: ['expense-classifications'],
//     queryFn: () => API.get('/expense-classifications').then(r => r.data.data),
//   });

//   const loading =
//     plansListLoading ||
//     (!!previousPlanId && (deptPlansLoading || aipLoading)) ||
//     itemsLoading ||
//     classLoading;

//   const expenseItemMap = useMemo(() => {
//     const classMap = new Map(classifications.map(c => [c.expense_class_id, c.expense_class_name]));
//     return new Map(
//       expenseItems.map(i => [i.expense_class_item_id, classMap.get(i.expense_class_id) ?? '']),
//     );
//   }, [expenseItems, classifications]);

//   const { previousTotal, previousPS, previousMOOE, previousCO } = useMemo(() => {
//     if (!deptId || !previousPlanId) {
//       return { previousTotal: null, previousPS: null, previousMOOE: null, previousCO: null };
//     }

//     // Both deptPlans and previousAipPrograms are now scoped server-side to
//     // deptId (see the query calls above), so no client-side filtering needed.
//     const deptPlan = deptPlans[0] ?? null;

//     let ps = 0, mooe = 0, co = 0;
//     (deptPlan?.items ?? []).forEach(item => {
//       const amt = parseFloat(String(item.total_amount)) || 0;
//       const cls = expenseItemMap.get(item.expense_item_id);
//       if (cls === CLASS_PS) ps += amt;
//       else if (cls === CLASS_MOOE) mooe += amt;
//       else if (cls === CLASS_CO) co += amt;
//     });

//     const aipTotal = previousAipPrograms
//       .reduce((sum, p) => sum + (p.total_amount ?? 0), 0);

//     return {
//       previousTotal: ps + mooe + co + aipTotal,
//       previousPS: ps,
//       previousMOOE: mooe,
//       previousCO: co,
//     };
//   }, [deptPlans, previousAipPrograms, expenseItemMap, deptId, previousPlanId]);

//   return { previousPlan, previousTotal, previousPS, previousMOOE, previousCO, loading };
// }

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan } from '../types/api';
import { useAipProgramData } from './useAipProgramData';
import { useExpenseTotals } from './useExpenseTotals';

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
  const previousYear = currentYear ? currentYear - 1 : undefined;

  const { data: previousPlan = null, isLoading: plansListLoading } = useQuery<BudgetPlan | null>({
    queryKey: ['budget-plan', 'by-year', previousYear],
    queryFn: () =>
      API.get(`/budget-plans/by-year/${previousYear}`)
        .then(r => r.data?.data ?? null)
        .catch(() => null), // 404 = no plan for that year yet
    enabled: !!previousYear,
  });

  const previousPlanId = previousPlan?.budget_plan_id;

  // Same backend-computed totals endpoint the current year uses — no more
  // fetching the full item catalog + classification list + every line item
  // just to sum three numbers for last year too.
  const { data: expenseTotals, isLoading: expLoading } = useExpenseTotals(previousPlanId, deptId);

  const { programs: previousAipPrograms, loading: aipLoading } = useAipProgramData(previousPlanId, deptId);

  const loading =
    plansListLoading ||
    (!!previousPlanId && (expLoading || aipLoading));

  const { previousTotal, previousPS, previousMOOE, previousCO } = useMemo(() => {
    if (!deptId || !previousPlanId) {
      return { previousTotal: null, previousPS: null, previousMOOE: null, previousCO: null };
    }

    const ps   = expenseTotals?.ps   ?? 0;
    const mooe = expenseTotals?.mooe ?? 0;
    const co   = expenseTotals?.co   ?? 0;

    const aipTotal = previousAipPrograms.reduce((sum, p) => sum + (p.total_amount ?? 0), 0);

    return {
      previousTotal: ps + mooe + co + aipTotal,
      previousPS: ps,
      previousMOOE: mooe,
      previousCO: co,
    };
  }, [expenseTotals, previousAipPrograms, deptId, previousPlanId]);

  return { previousPlan, previousTotal, previousPS, previousMOOE, previousCO, loading };
}
