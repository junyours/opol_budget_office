import { useQueries, useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { Department, DepartmentBudgetPlan } from '../types/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface DeptRow {
  dept_id: number;
  dept_name: string;
  ps: number; mooe: number; co: number; spa: number; total: number;
}

export interface CategoryBlock {
  category_id: number;
  category_name: string;
  rows: DeptRow[];
  totals: { ps: number; mooe: number; co: number; spa: number; total: number };
}

export interface SpecialPlanRow { key: string; label: string; total: number; }

export interface AipProgram {
  aip_program_id: number;
  aip_reference_code: string | null;
  program_description: string;
  dept_id: number;
  total_ps: number; total_mooe: number; total_co: number; total_amount: number;
}

interface Form2Item {
  dept_bp_form2_item_id: number;
  expense_item_id: number;
  total_amount: string | number;
  expense_item?: {
    expense_class_item_name: string;
    expense_class_item_acc_code: string | null;
    classification?: { expense_class_id: number; expense_class_name: string; abbreviation: string | null };
  };
}

interface DeptBudgetPlan {
  dept_budget_plan_id: number;
  dept_id: number;
  budget_plan_id: number;
  status: string;
  items: Form2Item[];
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SPECIAL_ACCOUNTS_CATEGORY_ID = 4;

export const SPECIAL_PLANS: {
  key: string; label: string; source: 'gad' | 'unified'; slug?: string;
}[] = [
  { key: 'gad',       label: 'Gender and Development Program, (GAD)',                source: 'gad'                      },
  { key: 'lcpc',      label: 'Loc. Cncl for the Prtctn of Chldrn Prg. (LCPC)',       source: 'unified', slug: 'lcpc-plan'      },
  { key: 'lydp',      label: 'Local Youth Development Program, (LYDP)',               source: 'unified', slug: 'lydp-plan'      },
  { key: 'sc',        label: 'Senior Citizens Contri. & Welfare',                     source: 'unified', slug: 'sc-plan'        },
  { key: 'sc_ppa',    label: 'Social Voc. Rehab. For PWD',                            source: 'unified', slug: 'sc-ppa-plan'    },
  { key: 'mpoc',      label: 'Peace & Order and Public Safety Plan, (POPS PLAN)',     source: 'unified', slug: 'mpoc-plan'      },
  { key: 'drugs',     label: "PPA's on Illegal Drugs",                                source: 'unified', slug: 'drugs-plan'     },
  { key: 'arts',      label: 'Culture & Arts Plan',                                   source: 'unified', slug: 'arts-plan'      },
  { key: 'nutrition', label: 'Nutrition Action Plan',                                 source: 'unified', slug: 'nutrition-plan' },
  { key: 'aids',      label: "PPA's to Combat AIDS",                                  source: 'unified', slug: 'aids-plan'      },
];

// ─── Query Keys ───────────────────────────────────────────────────────────────

export const summaryQueryKeys = {
  departments:       ['departments']                                        as const,
  categories:        ['department-categories']                              as const,
  deptPlans:         (planId: number) => ['dept-budget-plans', planId]      as const,
  aipPrograms:       (planId: number) => ['aip-programs', planId]           as const,
  classifications:   ['expense-classifications']                            as const,
  classItems:        ['expense-class-items']                                as const,
  gfFund:            ['income-fund', 'general-fund']                        as const,
  specialPlan:       (key: string, planId: number) => [key, planId]         as const,
};

// ─── Classification helpers ───────────────────────────────────────────────────

function resolveClassId(item: Form2Item, itemToClassMap: Map<number, number>): number | undefined {
  const fromMap = itemToClassMap.get(item.expense_item_id);
  if (fromMap !== undefined) return fromMap;
  const fromField = (item.expense_item as any)?.expense_class_id as number | undefined;
  if (fromField !== undefined) return fromField;
  return (item.expense_item?.classification as any)?.expense_class_id as number | undefined;
}

function getExpenseBucket(
  item: Form2Item,
  classMap: Map<number, { expense_class_name: string; abbreviation: string | null }>,
  itemToClassMap: Map<number, number>
): 'ps' | 'mooe' | 'co' {
  const classId = resolveClassId(item, itemToClassMap);
  if (classId !== undefined) {
    const cls = classMap.get(classId);
    if (cls) {
      const abbr = (cls.abbreviation ?? '').toUpperCase().trim();
      if (abbr === 'PS')                    return 'ps';
      if (abbr === 'CO')                    return 'co';
      if (abbr === 'MOOE' || abbr === 'FE') return 'mooe';
      const name = cls.expense_class_name.toLowerCase();
      if (name.includes('personal')) return 'ps';
      if (name.includes('capital'))  return 'co';
      return 'mooe';
    }
  }
  return 'mooe';
}

// ─── Core data hooks ──────────────────────────────────────────────────────────

export function useSummaryDepartments() {
  return useQuery<Department[]>({
    queryKey: summaryQueryKeys.departments,
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
  });
}

export function useSummaryCategories() {
  return useQuery<{ dept_category_id: number; dept_category_name: string }[]>({
    queryKey: summaryQueryKeys.categories,
    queryFn:  () => API.get('/department-categories').then(r => r.data?.data ?? r.data ?? []),
    staleTime: 15 * 60 * 1000,
  });
}

export function useSummaryDeptPlans(planId: number | undefined) {
  return useQuery<DeptBudgetPlan[]>({
    queryKey: summaryQueryKeys.deptPlans(planId!),
    queryFn:  () =>
      API.get('/department-budget-plans', { params: { 'filter[budget_plan_id]': planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });
}

export function useSummaryAipPrograms(planId: number | undefined) {
  return useQuery<AipProgram[]>({
    queryKey: summaryQueryKeys.aipPrograms(planId!),
    queryFn:  () =>
      API.get('/aip-programs', { params: { budget_plan_id: planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });
}

export function useExpenseClassifications() {
  return useQuery<{ expense_class_id: number; expense_class_name: string; abbreviation: string | null }[]>({
    queryKey: summaryQueryKeys.classifications,
    queryFn:  () => API.get('/expense-classifications').then(r => r.data?.data ?? r.data ?? []),
    staleTime: 30 * 60 * 1000,
  });
}

export function useExpenseClassItems() {
  return useQuery<{ expense_class_item_id: number; expense_class_id: number }[]>({
    queryKey: summaryQueryKeys.classItems,
    queryFn:  () => API.get('/expense-class-items').then(r => r.data?.data ?? r.data ?? []),
    staleTime: 30 * 60 * 1000,
  });
}

export function useSummaryGfFund() {
  return useQuery<{ total: number; nta: number }>({
    queryKey: summaryQueryKeys.gfFund,
    queryFn:  async () => {
      const res  = await API.get('/income-fund', { params: { source: 'general-fund' } });
      const rows: any[] = res.data?.data ?? [];
      const parentIds   = new Set(rows.filter(r => r.parent_id !== null).map(r => r.parent_id));
      const leafRows    = rows.filter(r => !parentIds.has(r.id));
      const total       = leafRows.reduce((s, r) => s + (parseFloat(r.proposed) || 0), 0);
      const ntaRow      = rows.find(r => /national[\s\S]*tax[\s\S]*allotment/i.test(r.name ?? ''));
      return { total, nta: parseFloat(ntaRow?.proposed) || 0 };
    },
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Special plans hook — all 10 in parallel via useQueries ──────────────────

export function useSpecialPlans(planId: number | undefined) {
  const queries = useQueries({
    queries: SPECIAL_PLANS.map(plan => ({
      queryKey: plan.source === 'gad'
        ? ['gad-entries', planId]
        : [plan.slug!, planId],
      queryFn: async (): Promise<SpecialPlanRow> => {
        if (!planId) return { key: plan.key, label: plan.label, total: 0 };
        try {
          const endpoint = plan.source === 'gad' ? '/gad-entries' : `/${plan.slug}`;
          const r = await API.get(endpoint, { params: { budget_plan_id: planId } });
          return { key: plan.key, label: plan.label, total: (r.data?.grand_total as number) ?? 0 };
        } catch {
          return { key: plan.key, label: plan.label, total: 0 };
        }
      },
      enabled:   !!planId,
      staleTime: 5 * 60 * 1000,
    })),
  });

  return {
    specialPlans:         queries.map(q => q.data).filter(Boolean) as SpecialPlanRow[],
    specialPlansLoading:  queries.some(q => q.isLoading),
  };
}

// ─── Computation helper (pure, exported for useMemo in component) ─────────────

export function computeCategoryBlocks(
  departments: Department[],
  categories:  { dept_category_id: number; dept_category_name: string }[],
  deptPlans:   DeptBudgetPlan[],
  aipPrograms: AipProgram[],
  rawClasses:  { expense_class_id: number; expense_class_name: string; abbreviation: string | null }[],
  rawClassItems: { expense_class_item_id: number; expense_class_id: number }[],
): CategoryBlock[] {
  const classMap = new Map(
    rawClasses.map(c => [c.expense_class_id, { expense_class_name: c.expense_class_name, abbreviation: c.abbreviation }])
  );
  const itemToClassMap = new Map<number, number>(
    rawClassItems.map(ci => [ci.expense_class_item_id, ci.expense_class_id])
  );

  const gfDepts   = departments.filter(d => d.dept_category_id !== SPECIAL_ACCOUNTS_CATEGORY_ID);
  const gfDeptIds = new Set(gfDepts.map(d => d.dept_id));

  // PS / MOOE / CO
  const deptAmounts = new Map<number, { ps: number; mooe: number; co: number }>();
  deptPlans.forEach(plan => {
    if (!gfDeptIds.has(plan.dept_id)) return;
    let ps = 0, mooe = 0, co = 0;
    (plan.items ?? []).forEach((item: Form2Item) => {
      const amt = parseFloat(String(item.total_amount)) || 0;
      if (amt === 0) return;
      const bucket = getExpenseBucket(item, classMap, itemToClassMap);
      if (bucket === 'ps')      ps   += amt;
      else if (bucket === 'co') co   += amt;
      else                      mooe += amt;
    });
    const existing = deptAmounts.get(plan.dept_id) ?? { ps: 0, mooe: 0, co: 0 };
    deptAmounts.set(plan.dept_id, { ps: existing.ps + ps, mooe: existing.mooe + mooe, co: existing.co + co });
  });

  // SPA
  const deptSpa = new Map<number, number>();
  aipPrograms.forEach(prog => {
    if (!gfDeptIds.has(prog.dept_id)) return;
    deptSpa.set(prog.dept_id, (deptSpa.get(prog.dept_id) ?? 0) + (prog.total_amount ?? 0));
  });

  // Category blocks
  const catMap    = new Map(categories.map(c => [c.dept_category_id, c.dept_category_name]));
  const catGroups = new Map<number, Department[]>();
  gfDepts.forEach(d => {
    const list = catGroups.get(d.dept_category_id) ?? [];
    list.push(d);
    catGroups.set(d.dept_category_id, list);
  });

  const blocks: CategoryBlock[] = [];
  catGroups.forEach((depts, catId) => {
    const rows: DeptRow[] = depts
      .map(d => {
        const a   = deptAmounts.get(d.dept_id) ?? { ps: 0, mooe: 0, co: 0 };
        const spa = deptSpa.get(d.dept_id) ?? 0;
        return { dept_id: d.dept_id, dept_name: d.dept_name, ps: a.ps, mooe: a.mooe, co: a.co, spa, total: a.ps + a.mooe + a.co + spa };
      })
      .filter(r => r.total > 0);
    if (rows.length === 0) return;
    const totPS   = rows.reduce((s, r) => s + r.ps,   0);
    const totMOOE = rows.reduce((s, r) => s + r.mooe, 0);
    const totCO   = rows.reduce((s, r) => s + r.co,   0);
    const totSPA  = rows.reduce((s, r) => s + r.spa,  0);
    blocks.push({
      category_id:   catId,
      category_name: catMap.get(catId) ?? `Category ${catId}`,
      rows,
      totals: { ps: totPS, mooe: totMOOE, co: totCO, spa: totSPA, total: totPS + totMOOE + totCO + totSPA },
    });
  });

  return blocks;
}