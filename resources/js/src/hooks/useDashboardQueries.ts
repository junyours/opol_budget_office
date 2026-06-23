
import { useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan, Department, DepartmentBudgetPlan } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

// export interface FundData { total: number; nta: number; nonTaxRevenue: number }
export interface FundData { total: number; nta: number; nonTaxRevenue: number; localSource: number }
// export interface DeptExpenditure { dept_id: number; abbr: string; total: number }
export interface DeptExpenditure { dept_id: number; abbr: string; total: number; categoryId: number }
export interface SpecialAccountExpenditures {
  sh:       number;
  occ:      number;
  pm:       number;
  combined: number;
}

const SPECIAL_CAT_ID = 4;
// const EMPTY_FUND: FundData = { total: 0, nta: 0, nonTaxRevenue: 0 };
const EMPTY_FUND: FundData = { total: 0, nta: 0, nonTaxRevenue: 0, localSource: 0 }
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
    const res = await API.get('/income-fund', { params: { source } });
    const rows: any[] = res.data?.data ?? [];
    if (rows.length === 0) return EMPTY_FUND;

    const parentIds = new Set(rows.filter((r: any) => r.parent_id !== null).map((r: any) => r.parent_id));
    const leafRows  = rows.filter((r: any) => !parentIds.has(r.id));
    const total     = leafRows.reduce((s: number, r: any) => s + (parseFloat(r.proposed) || 0), 0);
    const ntaRow    = rows.find((r: any) => /national[\s\S]*tax[\s\S]*allotment/i.test(r.name ?? ''));

    // Non-Tax Revenue subtree
    const ntrParent = rows.find((r: any) => /non[\s-]*tax[\s\S]*revenue/i.test(r.name ?? '') && parentIds.has(r.id));
    let nonTaxRevenue = 0;
    if (ntrParent) {
      const stack = [ntrParent.id];
      while (stack.length) {
        const pid = stack.pop()!;
        rows.forEach((r: any) => {
          if (r.parent_id === pid) {
            if (!parentIds.has(r.id)) nonTaxRevenue += parseFloat(r.proposed) || 0;
            else stack.push(r.id);
          }
        });
      }
    }

    // Tax Revenue subtree
    const taxParent = rows.find((r: any) => /^(?!.*non).*tax[\s\S]*revenue/i.test(r.name ?? '') && parentIds.has(r.id));
    let taxRevenue = 0;
    if (taxParent) {
      const stack = [taxParent.id];
      while (stack.length) {
        const pid = stack.pop()!;
        rows.forEach((r: any) => {
          if (r.parent_id === pid) {
            if (!parentIds.has(r.id)) taxRevenue += parseFloat(r.proposed) || 0;
            else stack.push(r.id);
          }
        });
      }
    }

    return {
      total,
      nta: parseFloat(ntaRow?.proposed) || 0,
      nonTaxRevenue,
      localSource: taxRevenue + nonTaxRevenue,
    };
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

// ─── Base Hooks ───────────────────────────────────────────────────────────────

// export function useAllFunds() {
//   return useQuery<AllFundsData>({
//     queryKey: queryKeys.allFunds,
//     queryFn:  async () => {
//       const [gfRes, shRes, occRes, pmRes] = await Promise.allSettled([
//         fetchFund('general-fund'),
//         fetchFund('sh'),
//         fetchFund('occ'),
//         fetchFund('pm'),
//       ]);
//       return {
//         gf:  gfRes.status  === 'fulfilled' ? gfRes.value  : EMPTY_FUND,
//         sh:  shRes.status  === 'fulfilled' ? shRes.value  : EMPTY_FUND,
//         occ: occRes.status === 'fulfilled' ? occRes.value : EMPTY_FUND,
//         pm:  pmRes.status  === 'fulfilled' ? pmRes.value  : EMPTY_FUND,
//       };
//     },
//     staleTime: 10 * 60 * 1000,
//     retry: false,
//   });
// }

// export function useAllFunds() {
//   const gf  = useQuery<FundData>({ queryKey: ['income-fund', 'general-fund'], queryFn: () => fetchFund('general-fund') });
//   const sh  = useQuery<FundData>({ queryKey: ['income-fund', 'sh'],           queryFn: () => fetchFund('sh') });
//   const occ = useQuery<FundData>({ queryKey: ['income-fund', 'occ'],          queryFn: () => fetchFund('occ') });
//   const pm  = useQuery<FundData>({ queryKey: ['income-fund', 'pm'],           queryFn: () => fetchFund('pm') });
// export function useAllFunds() {
//   const gf  = useQuery<FundData>({ queryKey: ['fund-summary', 'general-fund'], queryFn: () => fetchFund('general-fund') });
//   const sh  = useQuery<FundData>({ queryKey: ['fund-summary', 'sh'],           queryFn: () => fetchFund('sh') });
//   const occ = useQuery<FundData>({ queryKey: ['fund-summary', 'occ'],          queryFn: () => fetchFund('occ') });
//   const pm  = useQuery<FundData>({ queryKey: ['fund-summary', 'pm'],           queryFn: () => fetchFund('pm') });

//   return {
//     data: (gf.data && sh.data && occ.data && pm.data)
//       ? { gf: gf.data, sh: sh.data, occ: occ.data, pm: pm.data }
//       : undefined,
//     isLoading: gf.isLoading || sh.isLoading || occ.isLoading || pm.isLoading,
//   };
// }

function deriveFundData(rows: any[]): FundData {
  if (!rows?.length) return EMPTY_FUND;

  const parentIds = new Set(rows.filter((r: any) => r.parent_id !== null).map((r: any) => r.parent_id));
  const leafRows  = rows.filter((r: any) => !parentIds.has(r.id));
  const total     = leafRows.reduce((s: number, r: any) => s + (parseFloat(r.proposed) || 0), 0);
  const ntaRow    = rows.find((r: any) => /national[\s\S]*tax[\s\S]*allotment/i.test(r.name ?? ''));

  const sumSubtree = (predicate: RegExp): number => {
    const parent = rows.find((r: any) => predicate.test(r.name ?? '') && parentIds.has(r.id));
    if (!parent) return 0;
    let result = 0;
    const stack = [parent.id];
    while (stack.length) {
      const pid = stack.pop()!;
      rows.forEach((r: any) => {
        if (r.parent_id === pid) {
          if (!parentIds.has(r.id)) result += parseFloat(r.proposed) || 0;
          else stack.push(r.id);
        }
      });
    }
    return result;
  };

  const nonTaxRevenue = sumSubtree(/non[\s-]*tax[\s\S]*revenue/i);
  const taxRevenue    = sumSubtree(/^(?!.*non).*tax[\s\S]*revenue/i);

  return {
    total,
    nta:         parseFloat(ntaRow?.proposed) || 0,
    nonTaxRevenue,
    localSource: taxRevenue + nonTaxRevenue,
  };
}

export function useAllFunds() {
  const gf  = useQuery({ queryKey: ['income-fund', 'general-fund'], queryFn: () => API.get('/income-fund?source=general-fund').then(r => r.data) });
  const sh  = useQuery({ queryKey: ['income-fund', 'sh'],           queryFn: () => API.get('/income-fund?source=sh').then(r => r.data) });
  const occ = useQuery({ queryKey: ['income-fund', 'occ'],          queryFn: () => API.get('/income-fund?source=occ').then(r => r.data) });
  const pm  = useQuery({ queryKey: ['income-fund', 'pm'],           queryFn: () => API.get('/income-fund?source=pm').then(r => r.data) });

  return {
    data: (gf.data && sh.data && occ.data && pm.data) ? {
      gf:  deriveFundData(gf.data.data),
      sh:  deriveFundData(sh.data.data),
      occ: deriveFundData(occ.data.data),
      pm:  deriveFundData(pm.data.data),
    } : undefined,
    isLoading: gf.isLoading || sh.isLoading || occ.isLoading || pm.isLoading,
  };
}

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: queryKeys.departments,
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
  });
}

export function useBudgetPlans() {
  return useQuery<BudgetPlan[]>({
    queryKey: queryKeys.budgetPlans,
    queryFn:  () => API.get('/budget-plans').then(r => r.data?.data ?? []),
  });
}

// export function useDepartmentBudgetPlans(budgetPlanId: number | undefined) {
//   return useQuery<DepartmentBudgetPlan[]>({
//     queryKey: queryKeys.deptBudgetPlans(budgetPlanId!),
//     queryFn:  () =>
//       API.get('/department-budget-plans', {
//         params: { 'filter[budget_plan_id]': budgetPlanId },
//       }).then(r => r.data?.data ?? []),
//     enabled:   !!budgetPlanId,
//     staleTime: 5 * 60 * 1000,
//   });
// }
export function useDepartmentBudgetPlans(budgetPlanId: number | undefined) {
  return useQuery<DepartmentBudgetPlan[]>({
    queryKey: queryKeys.deptBudgetPlans(budgetPlanId!),
    queryFn:  () =>
      API.get('/department-budget-plans', {
        params: { 'filter[budget_plan_id]': budgetPlanId },
      }).then(r => r.data?.data ?? []),
    enabled: !!budgetPlanId,
  });
}

/** Shared AIP programs — same key as useBudgetTotals & useAipProgramData */
// export function useAipPrograms(budgetPlanId: number | undefined) {
//   return useQuery<any[]>({
//     queryKey: queryKeys.aipPrograms(budgetPlanId!),
//     queryFn:  () =>
//       API.get('/aip-programs', { params: { budget_plan_id: budgetPlanId } })
//         .then(r => r.data?.data ?? []),
//     enabled:   !!budgetPlanId,
//     staleTime: 5 * 60 * 1000,
//   });
// }

export function useAipPrograms(budgetPlanId: number | undefined) {
  return useQuery<any[]>({
    queryKey: queryKeys.aipPrograms(budgetPlanId!),
    queryFn:  () =>
      API.get('/aip-programs', { params: { budget_plan_id: budgetPlanId } })
        .then(r => r.data?.data ?? []),
    enabled: !!budgetPlanId,
  });
}

// export function useFund(source: string) {
//   return useQuery<FundData>({
//     queryKey: queryKeys.fund(source),
//     queryFn:  () => fetchFund(source),
//     staleTime: 10 * 60 * 1000,
//     retry: false,
//   });
// }

export function useMdfFund(budgetPlanId: number | undefined) {
  return useQuery<number>({
    queryKey: queryKeys.mdfFund(budgetPlanId!),
    queryFn:  () =>
      API.get('/mdf-funds', { params: { budget_plan_id: budgetPlanId } })
        .then(r => (r.data?.grand_totals?.proposed ?? 0) as number)
        .catch((err: any) => {
          if (err?.response?.status === 404) return 0;
          throw err;
        }),
    enabled: !!budgetPlanId,
    retry: false,
  });
}

export function useLdrrmfSummary(budgetPlanId: number | undefined) {
  return useQuery<{ reserved30: number; total70: number }>({
    queryKey: queryKeys.ldrrmfSummary(budgetPlanId!),
    queryFn:  () =>
      API.get('/ldrrmfip/summary', {
        params: { budget_plan_id: budgetPlanId, source: 'general-fund' },
      })
      .then(r => {
        const d = r.data?.data ?? r.data;
        return {
          reserved30: (d?.reserved_30 ?? 0) as number,
          total70:    (d?.total_70pct  ?? 0) as number,
        };
      })
      .catch((err: any) => {
        if (err?.response?.status === 404) return { reserved30: 0, total70: 0 };
        throw err;
      }),
    enabled: !!budgetPlanId,
    retry: false,
  });
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
  departments: Department[],
): { data: DeptExpenditure[]; isLoading: boolean } {
  const { data: deptPlans = [],   isLoading: plansLoading } = useDepartmentBudgetPlans(budgetPlanId);
  const { data: aipPrograms = [], isLoading: aipLoading }   = useAipPrograms(budgetPlanId);

  const isLoading = !budgetPlanId || plansLoading || aipLoading || departments.length === 0;

  const data = useMemo<DeptExpenditure[]>(() => {
    if (!budgetPlanId || departments.length === 0 || deptPlans.length === 0) return [];

    const deptMap = new Map<number, Department>(departments.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    return deptPlans
      .filter((dp: DepartmentBudgetPlan) => {
        const d = deptMap.get(dp.dept_id);
        return d && d.dept_category_id !== SPECIAL_CAT_ID;
      })
      .map((dp: DepartmentBudgetPlan) => {
        const d     = deptMap.get(dp.dept_id)!;
        const form2 = (dp.items ?? []).reduce(
          (s: number, i: any) => s + (parseFloat(i.total_amount) || 0), 0
        );
        const aip = aipByDept.get(dp.dept_id) ?? 0;
//         return {
//           dept_id: dp.dept_id,
//           abbr:    d.dept_abbreviation ?? d.dept_name.slice(0, 6),
//           total:   form2 + aip,
//         };
//       })
//       .filter((r: DeptExpenditure) => r.total > 0)
//       .sort((a: DeptExpenditure, b: DeptExpenditure) => a.dept_id - b.dept_id);
//   }, [deptPlans, aipPrograms, departments, budgetPlanId]);

//   return { data, isLoading };
// }
// export function useSpecialDeptExpenditures(

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
  departments: Department[],
): { data: DeptExpenditure[]; isLoading: boolean } {
  const { data: deptPlans = [],   isLoading: plansLoading } = useDepartmentBudgetPlans(budgetPlanId);
  const { data: aipPrograms = [], isLoading: aipLoading }   = useAipPrograms(budgetPlanId);

  const isLoading = !budgetPlanId || plansLoading || aipLoading || departments.length === 0;

  const data = useMemo<DeptExpenditure[]>(() => {
    if (!budgetPlanId || departments.length === 0 || deptPlans.length === 0) return [];

    const deptMap = new Map<number, Department>(departments.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    return deptPlans
      .filter((dp: DepartmentBudgetPlan) => {
        const d = deptMap.get(dp.dept_id);
        return d && d.dept_category_id === SPECIAL_CAT_ID; // ← only special accounts
      })
      .map((dp: DepartmentBudgetPlan) => {
        const d     = deptMap.get(dp.dept_id)!;
        const form2 = (dp.items ?? []).reduce(
          (s: number, i: any) => s + (parseFloat(i.total_amount) || 0), 0
        );
        const aip = aipByDept.get(dp.dept_id) ?? 0;
//         return {
//           dept_id: dp.dept_id,
//           abbr:    d.dept_abbreviation ?? d.dept_name.slice(0, 6),
//           total:   form2 + aip,
//         };
//       })
//       .filter((r: DeptExpenditure) => r.total > 0)
//       .sort((a: DeptExpenditure, b: DeptExpenditure) => a.dept_id - b.dept_id);
//   }, [deptPlans, aipPrograms, departments, budgetPlanId]);

//   return { data, isLoading };
// }
// export function useSpecialAccountExpenditures(

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
  departments: Department[],
): { data: SpecialAccountExpenditures; isLoading: boolean } {
  const { data: deptPlans = [],   isLoading: plansLoading } = useDepartmentBudgetPlans(budgetPlanId);
  const { data: aipPrograms = [], isLoading: aipLoading }   = useAipPrograms(budgetPlanId);

  const isLoading = !budgetPlanId || plansLoading || aipLoading || departments.length === 0;

  const data = useMemo<SpecialAccountExpenditures>(() => {
    if (!budgetPlanId || departments.length === 0 || deptPlans.length === 0) return EMPTY_SPECIAL_EXP;

    const specialDepts = departments.filter(d => d.dept_category_id === SPECIAL_CAT_ID);
    if (specialDepts.length === 0) return EMPTY_SPECIAL_EXP;

    const deptMap = new Map<number, Department>(specialDepts.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    const totals: Record<string, number> = { SH: 0, OCC: 0, PM: 0 };

    deptPlans
      .filter((dp: DepartmentBudgetPlan) => deptMap.has(dp.dept_id))
      .forEach((dp: DepartmentBudgetPlan) => {
        const d    = deptMap.get(dp.dept_id)!;
        const abbr = (d.dept_abbreviation ?? '').toUpperCase();
        if (!(abbr in totals)) return;

        const form2 = (dp.items ?? []).reduce(
          (s: number, i: any) => s + (parseFloat(i.total_amount) || 0), 0
        );
        const aip = aipByDept.get(dp.dept_id) ?? 0;
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
