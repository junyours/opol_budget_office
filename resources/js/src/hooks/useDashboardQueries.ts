
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan, Department, DepartmentBudgetPlan } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

// export interface FundData { total: number; nta: number; nonTaxRevenue: number }
// export interface FundData { total: number; nta: number; nonTaxRevenue: number; localSource: number }
export interface FundData { total: number; nta: number; nonTaxRevenue: number; localSource: number; previousTotal: number; previousLocalSource: number }
// export interface DeptExpenditure { dept_id: number; abbr: string; total: number }
export interface DeptExpenditure { dept_id: number; abbr: string; total: number; categoryId: number }

/** Matches the ?light=1 shape of /department-budget-plans — no items[] array, just the pre-summed total. */
export interface DepartmentBudgetPlanLite {
  dept_budget_plan_id: number;
  budget_plan_id: number;
  dept_id: number;
  status: string;
  items_total: string | number | null;
  department?: { dept_id: number; dept_name: string; dept_abbreviation?: string; logo?: string | null };
}
export interface SpecialAccountExpenditures {
  sh:       number;
  occ:      number;
  pm:       number;
  combined: number;
}

const SPECIAL_CAT_ID = 4;
// const EMPTY_FUND: FundData = { total: 0, nta: 0, nonTaxRevenue: 0 };
// const EMPTY_FUND: FundData = { total: 0, nta: 0, nonTaxRevenue: 0, localSource: 0 }
const EMPTY_FUND: FundData = { total: 0, nta: 0, nonTaxRevenue: 0, localSource: 0, previousTotal: 0, previousLocalSource: 0 }
const EMPTY_SPECIAL_EXP: SpecialAccountExpenditures = { sh: 0, occ: 0, pm: 0, combined: 0 };

// ─── Fetchers ─────────────────────────────────────────────────────────────────

// export async function fetchFund(source: string): Promise<FundData> {
//   try {
//     const res = await API.get('/income-fund', { params: { source } });
//     const rows: any[] = res.data?.data ?? [];

//     if (rows.length === 0) return EMPTY_FUND;

//     const parentIds = new Set(rows.filter((r: any) => r.parent_id !== null).map((r: any) => r.parent_id));
//     const leafRows  = rows.filter((r: any) => !parentIds.has(r.id));
//     const total     = leafRows.reduce((s: number, r: any) => s + (parseFloat(r.proposed) || 0), 0);
//     const ntaRow    = rows.find((r: any) => /national[\s\S]*tax[\s\S]*allotment/i.test(r.name ?? ''));
//     const ntrParent = rows.find((r: any) => /non[\s-]*tax[\s\S]*revenue/i.test(r.name ?? '') && parentIds.has(r.id));

//     let nonTaxRevenue = 0;
//     if (ntrParent) {
//       const stack = [ntrParent.id];
//       while (stack.length) {
//         const pid = stack.pop()!;
//         rows.forEach((r: any) => {
//           if (r.parent_id === pid) {
//             if (!parentIds.has(r.id)) nonTaxRevenue += parseFloat(r.proposed) || 0;
//             else stack.push(r.id);
//           }
//         });
//       }
//     }

//     return { total, nta: parseFloat(ntaRow?.proposed) || 0, nonTaxRevenue };
//   } catch {
//     return EMPTY_FUND;
//   }
// }

export async function fetchFund(source: string): Promise<FundData> {
  try {
    const res = await API.get('/income-fund/income-summary', { params: { source } });
    return res.data as FundData;
  } catch {
    return EMPTY_FUND;
  }
}

// ─── Query Keys ───────────────────────────────────────────────────────────────

// export const queryKeys = {
//   departments:     ['departments']                                        as const,
//   budgetPlans:     ['budget-plans']                                       as const,
//   deptBudgetPlans: (planId: number) => ['dept-budget-plans', planId]      as const,
//   aipPrograms:     (planId: number) => ['aip-programs', planId]           as const,
// fund: (source: string) => ['fund-summary', source] as const,
//   allFunds:        ['income-funds-all']                                   as const,
//   mdfFund:         (planId: number) => ['mdf-fund', planId]               as const,
//   ldrrmfSummary:   (planId: number) => ['ldrrmf-summary', planId]         as const,
// };
export const queryKeys = {
  departments:     ['departments']                                   as const,
  budgetPlans:     ['budget-plans']                                  as const,
  deptBudgetPlans: (planId: number) => ['dept-budget-plans', planId] as const,
  aipPrograms:     (planId: number) => ['aip-programs', planId]      as const,
  mdfFund:         (planId: number) => ['mdf-fund', planId]          as const,
  ldrrmfSummary:   (planId: number) => ['ldrrmf-summary', planId]    as const,
};

export interface AllFundsData {
  gf:  FundData;
  sh:  FundData;
  occ: FundData;
  pm:  FundData;
}

export function useAllFunds() {
  const gf  = useQuery<FundData>({ queryKey: ['income-fund-summary', 'general-fund'], queryFn: () => fetchFund('general-fund') });
  const sh  = useQuery<FundData>({ queryKey: ['income-fund-summary', 'sh'],           queryFn: () => fetchFund('sh') });
  const occ = useQuery<FundData>({ queryKey: ['income-fund-summary', 'occ'],          queryFn: () => fetchFund('occ') });
  const pm  = useQuery<FundData>({ queryKey: ['income-fund-summary', 'pm'],           queryFn: () => fetchFund('pm') });

  return {
    data: (gf.data && sh.data && occ.data && pm.data)
      ? { gf: gf.data, sh: sh.data, occ: occ.data, pm: pm.data }
      : undefined,
    isLoading: gf.isLoading || sh.isLoading || occ.isLoading || pm.isLoading,
  };
}

export interface DepartmentLite {
  dept_id: number;
  dept_name: string;
  dept_abbreviation?: string;
  dept_category_id: number;
  sort_order?: number;
}

const DEPARTMENT_LITE_FIELDS = 'dept_id,dept_name,dept_abbreviation,dept_category_id,sort_order';

export function useDepartments<T = Department[]>(select?: (data: Department[]) => T) {
  return useQuery<Department[], Error, T>({
    queryKey: queryKeys.departments,
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
    select,
  });
}

/** Trimmed variant — backend only selects the lite columns, so the network payload itself is smaller. */
export function useDepartmentsLite() {
  return useQuery<DepartmentLite[]>({
    queryKey: [...queryKeys.departments, 'lite'],
    queryFn:  () =>
      API.get('/departments', { params: { fields: DEPARTMENT_LITE_FIELDS } })
        .then(r => r.data?.data ?? []),
  });
}

export function useBudgetPlans(enabled: boolean = true) {
  return useQuery<BudgetPlan[]>({
    queryKey: queryKeys.budgetPlans,
    queryFn:  () =>
      API.get('/budget-plans', { params: { fields: 'budget_plan_id,year,is_active' } })
        .then(r => r.data?.data ?? []),
    enabled,
  });
}

export function useDepartmentBudgetPlans(budgetPlanId: number | undefined, enabled: boolean = true) {
  return useQuery<DepartmentBudgetPlanLite[]>({
    queryKey: queryKeys.deptBudgetPlans(budgetPlanId!),
    queryFn:  () =>
      API.get('/department-budget-plans', {
        params: { 'filter[budget_plan_id]': budgetPlanId, light: 1 },
      }).then(r => r.data?.data ?? []),
    enabled: !!budgetPlanId && enabled,

  });
}

/** Shared AIP programs — same key as useBudgetTotals & useAipProgramData */

export function useAipPrograms<T = any[]>(budgetPlanId: number | undefined, select?: (data: any[]) => T) {
  return useQuery<any[], Error, T>({
    queryKey: queryKeys.aipPrograms(budgetPlanId!),
    queryFn:  () =>
      API.get('/aip-programs', { params: { budget_plan_id: budgetPlanId, fields: 'dept_id,total_amount' } })
        .then(r => r.data?.data ?? []),
    enabled: !!budgetPlanId,
    select,
  });
}

const aipDeptTotalsSelect = (rows: any[]) =>
  rows as { dept_id: number; total_amount: number }[];

export function useMdfFund(budgetPlanId: number | undefined) {
  return useQuery<number>({
    queryKey: queryKeys.mdfFund(budgetPlanId!),
    queryFn:  () =>
      API.get('/mdf-funds/total-proposed', { params: { budget_plan_id: budgetPlanId } })
        .then(r => (r.data?.proposed ?? 0) as number)
        .catch((err: any) => {
          if (err?.response?.status === 404) return 0;
          throw err;
        }),
    enabled: !!budgetPlanId,
    retry: false,
  });
}

export function useLdrrmfSummarySource(budgetPlanId: number | undefined, source: string) {
  return useQuery<{ reserved30: number; total70: number; calamityFund: number }>({
    queryKey: ['ldrrmf-calamity-summary', budgetPlanId, source],
    queryFn: () =>
      API.get('/ldrrmfip/calamity-summary', { params: { budget_plan_id: budgetPlanId, source } })
        .then(r => {
          const d = r.data?.data ?? r.data;
          return {
            reserved30:   Number(d?.reserved_30   ?? 0),
            total70:      Number(d?.total_70pct   ?? 0),
            calamityFund: Number(d?.calamity_fund ?? 0),
          };
        })
        .catch((err: any) => {
          if (err?.response?.status === 404) return { reserved30: 0, total70: 0, calamityFund: 0 };
          throw err;
        }),
    enabled: !!budgetPlanId,
    retry: false,
  });
}

export interface LdrrmfPlanSpecialAccount {
  source: string;
  dept_name: string;
  dept_abbreviation: string;
  total_5pct: number;
}

export function useLdrrmfPlanSpecialAccounts() {
  return useQuery<LdrrmfPlanSpecialAccount[]>({
    queryKey: ['ldrrmf-plan', 'special-accounts'],
    queryFn: () =>
      API.get('/ldrrmf-plan').then(r => {
        const sections: any[] = r.data?.data?.special_accounts ?? [];
        return sections.map((s: any) => ({
          source:            String(s.source),
          dept_name:         String(s.dept_name),
          dept_abbreviation: String(s.dept_abbreviation ?? ''),
          total_5pct:        Number(s.budget_year?.total_5pct ?? 0),
        }));
      }),
  });
}

// Delegates to useLdrrmfSummarySource so general-fund shares the exact same
// cache key shape ['ldrrmf-summary', planId, 'general-fund'] as every other
// source — this is what lets LdrrmfipPage reuse data the dashboard already
// fetched, instead of refetching under a different key.
export function useLdrrmfSummary(budgetPlanId: number | undefined) {
  return useLdrrmfSummarySource(budgetPlanId, 'general-fund');
}

// ─── Derived hooks — useMemo, NOT useQuery ────────────────────────────────────
//
// Root cause of the wrong data bug:
//   useQuery's queryFn closes over deptPlans/aipPrograms at the moment the
//   query first becomes enabled. If upstream data hasn't fully loaded yet,
//   the computation runs on empty arrays, caches the wrong result, and never
//   reruns because the queryKey didn't change.
//
// useMemo recomputes synchronously on every render where its deps changed,
// so it always reflects the current upstream data with zero delay.

export function useDeptExpenditures(
  budgetPlanId: number | undefined,
  departments: DepartmentLite[],
): { data: DeptExpenditure[]; isLoading: boolean } {
  const { data: deptPlans = [],   isLoading: plansLoading } = useDepartmentBudgetPlans(budgetPlanId);
  const { data: aipPrograms = [], isLoading: aipLoading }   = useAipPrograms(budgetPlanId, aipDeptTotalsSelect);

  const isLoading = !budgetPlanId || plansLoading || aipLoading || departments.length === 0;

  const data = useMemo<DeptExpenditure[]>(() => {
    if (!budgetPlanId || departments.length === 0 || deptPlans.length === 0) return [];

    const deptMap = new Map<number, DepartmentLite>(departments.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    return deptPlans
      .filter((dp: DepartmentBudgetPlanLite) => {
        const d = deptMap.get(dp.dept_id);
        return d && d.dept_category_id !== SPECIAL_CAT_ID;
      })
      .map((dp: DepartmentBudgetPlanLite) => {
        const d     = deptMap.get(dp.dept_id)!;
        const form2 = parseFloat(dp.items_total as any) || 0;
        const aip   = aipByDept.get(dp.dept_id) ?? 0;

        return {
          dept_id:    dp.dept_id,
          abbr:       d.dept_abbreviation ?? d.dept_name.slice(0, 6),
          total:      form2 + aip,
          categoryId: d.dept_category_id,
        };
      })
      .filter((r: DeptExpenditure) => r.total > 0)
      .sort((a: DeptExpenditure, b: DeptExpenditure) => {
        const da = deptMap.get(a.dept_id);
        const db = deptMap.get(b.dept_id);
        const catA = (da?.dept_category_id ?? 0) * 10000 + (da?.sort_order ?? 0);
        const catB = (db?.dept_category_id ?? 0) * 10000 + (db?.sort_order ?? 0);
        return catA - catB;
      });
  }, [deptPlans, aipPrograms, departments, budgetPlanId]);

  return { data, isLoading };
}
export function useSpecialDeptExpenditures(

  budgetPlanId: number | undefined,
  departments: DepartmentLite[],
): { data: DeptExpenditure[]; isLoading: boolean } {
  const { data: deptPlans = [],   isLoading: plansLoading } = useDepartmentBudgetPlans(budgetPlanId);
  const { data: aipPrograms = [], isLoading: aipLoading }   = useAipPrograms(budgetPlanId, aipDeptTotalsSelect);

  const isLoading = !budgetPlanId || plansLoading || aipLoading || departments.length === 0;

  const data = useMemo<DeptExpenditure[]>(() => {
    if (!budgetPlanId || departments.length === 0 || deptPlans.length === 0) return [];

    const deptMap = new Map<number, DepartmentLite>(departments.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    return deptPlans
      .filter((dp: DepartmentBudgetPlanLite) => {
        const d = deptMap.get(dp.dept_id);
        return d && d.dept_category_id === SPECIAL_CAT_ID; // ← only special accounts
      })
      .map((dp: DepartmentBudgetPlanLite) => {
        const d     = deptMap.get(dp.dept_id)!;
        const form2 = parseFloat(dp.items_total as any) || 0;
        const aip   = aipByDept.get(dp.dept_id) ?? 0;

        return {
          dept_id:    dp.dept_id,
          abbr:       d.dept_abbreviation ?? d.dept_name.slice(0, 6),
          total:      form2 + aip,
          categoryId: d.dept_category_id,
        };
      })
      .filter((r: DeptExpenditure) => r.total > 0)
      .sort((a: DeptExpenditure, b: DeptExpenditure) => a.dept_id - b.dept_id);
  }, [deptPlans, aipPrograms, departments, budgetPlanId]);

  return { data, isLoading };
}
export function useSpecialAccountExpenditures(

  budgetPlanId: number | undefined,
  departments: DepartmentLite[],
): { data: SpecialAccountExpenditures; isLoading: boolean } {
  const { data: deptPlans = [],   isLoading: plansLoading } = useDepartmentBudgetPlans(budgetPlanId);
  const { data: aipPrograms = [], isLoading: aipLoading }   = useAipPrograms(budgetPlanId, aipDeptTotalsSelect);

  const isLoading = !budgetPlanId || plansLoading || aipLoading || departments.length === 0;

  const data = useMemo<SpecialAccountExpenditures>(() => {
    if (!budgetPlanId || departments.length === 0 || deptPlans.length === 0) return EMPTY_SPECIAL_EXP;

    const specialDepts = departments.filter(d => d.dept_category_id === SPECIAL_CAT_ID);
    if (specialDepts.length === 0) return EMPTY_SPECIAL_EXP;

    const deptMap = new Map<number, DepartmentLite>(specialDepts.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    const totals: Record<string, number> = { SH: 0, OCC: 0, PM: 0 };

    deptPlans
      .filter((dp: DepartmentBudgetPlanLite) => deptMap.has(dp.dept_id))
      .forEach((dp: DepartmentBudgetPlanLite) => {
        const d    = deptMap.get(dp.dept_id)!;
        const abbr = (d.dept_abbreviation ?? '').toUpperCase();
        if (!(abbr in totals)) return;

        const form2 = parseFloat(dp.items_total as any) || 0;
        const aip   = aipByDept.get(dp.dept_id) ?? 0;
        totals[abbr] += form2 + aip;
      });

    const sh  = totals['SH']  ?? 0;
    const occ = totals['OCC'] ?? 0;
    const pm  = totals['PM']  ?? 0;

    return { sh, occ, pm, combined: sh + occ + pm };
  }, [deptPlans, aipPrograms, departments, budgetPlanId]);

  return { data, isLoading };
}

// ─── Mutation: Create Budget Plan ─────────────────────────────────────────────

export function useCreateBudgetPlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { year: number; is_active: boolean }) =>
      API.post('/budget-plans', data).then(r => r.data.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetPlans });
      queryClient.invalidateQueries({ queryKey: ['dept-budget-plans'] });
    },
  });
}

// ─── Year totals (lean, multi-plan) ───────────────────────────────────────────
// Powers BudgetAreaChart's 3-year comparison — one call instead of
// 3x useDepartmentBudgetPlans + 3x useAipPrograms.

export interface YearTotalRow { dept_id: number; total: number }
export type YearTotalsMap = Record<string, YearTotalRow[]>;

export function useYearTotals(planIds: (number | undefined)[]) {
  const ids = planIds.filter((id): id is number => !!id);
  const key = [...new Set(ids)].sort((a, b) => a - b).join(',');

  return useQuery<YearTotalsMap>({
    queryKey: ['department-budget-plans-year-totals', key],
    queryFn:  () =>
      API.get('/department-budget-plans/year-totals', { params: { plan_ids: key } })
        .then(r => r.data?.data ?? {}),
    enabled: ids.length > 0,
    
  });
}
