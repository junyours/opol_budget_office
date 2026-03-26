import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

export interface Form7Row {
  item_name:               string;
  account_code:            string;
  general_public_services: number;
  social_services:         number;
  economic_services:       number;
  other_services:          number;
  total:                   number;
}

export interface Form7FeObligation {
  creditor:  string;
  purpose:   string;
  principal: number;
  interest:  number;
}

export interface SectionSubtotal {
  general_public_services: number;
  social_services:         number;
  economic_services:       number;
  other_services:          number;
  total:                   number;
}

export interface Form7Section {
  section_code:  string;
  section_label: string;
  rows:          Form7Row[];
  obligations?:  Form7FeObligation[];
  subtotal:      SectionSubtotal;
}

export interface Form7Data {
  sections:    { sections: Form7Section[]; grand_total: SectionSubtotal };
  grand_total: SectionSubtotal;
}

export const SPECIAL_ACCOUNT_SOURCES = [
  { id: 'sh',  label: 'Slaughterhouse',        abbr: 'SH'  },
  { id: 'occ', label: 'Opol Community College', abbr: 'OCC' },
  { id: 'pm',  label: 'Public Market',          abbr: 'PM'  },
] as const;

export type SpecialAccountId = typeof SPECIAL_ACCOUNT_SOURCES[number]['id'];

export const form7QueryKeys = {
  generalFund:    (planId: number) => ['form7', 'general-fund', planId]         as const,
  specialAccount: (source: string, planId: number) => ['form7', source, planId] as const,
};

export function useForm7GeneralFund(planId: number | undefined) {
  return useQuery<Form7Data>({
    queryKey: form7QueryKeys.generalFund(planId!),
    queryFn:  () =>
      API.get('/form7', { params: { budget_plan_id: planId } })
        .then(r => r.data.data),
    enabled:   !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useForm7SpecialAccount(
  source: SpecialAccountId,
  planId: number | undefined
) {
  const { data: departments = [] } = useQuery<{ dept_id: number; dept_abbreviation: string | null; dept_name: string }[]>({
    queryKey: ['departments'],
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
  });

  const abbr = source.toUpperCase();
  const dept = departments.find(d => (d.dept_abbreviation ?? '').toUpperCase() === abbr);

  return useQuery<Form7Data>({
    queryKey: form7QueryKeys.specialAccount(source, planId!),
    queryFn:  async () => {
      const res = await API.get('/department-budget-plans', {
        params: { 'filter[budget_plan_id]': planId },
      });
      const plans: any[] = res.data?.data ?? [];
      const deptPlan = plans.find((p: any) => p.dept_id === dept!.dept_id);
      const items: any[] = deptPlan?.items ?? [];

      const sectionMap = new Map<string, { code: string; label: string; rows: Form7Row[] }>();

      items.forEach((item: any) => {
        const amt = parseFloat(String(item.total_amount)) || 0;
        if (amt === 0) return;

        const classId   = item.expense_item?.classification?.expense_class_id
                       ?? item.expense_item?.expense_class_id
                       ?? 2;
        const codeMap:  Record<number, string> = { 1: 'PS', 2: 'MOOE', 3: 'FE', 4: 'CO' };
        const labelMap: Record<number, string> = {
          1: 'Personal Services',
          2: 'Maintenance and Other Operating Expenses',
          3: 'Financial Expenses',
          4: 'Capital Outlay',
        };
        const code  = codeMap[classId]  ?? 'MOOE';
        const label = labelMap[classId] ?? 'Other';

        if (!sectionMap.has(code)) sectionMap.set(code, { code, label, rows: [] });

        sectionMap.get(code)!.rows.push({
          item_name:               item.expense_item?.expense_class_item_name ?? `Item ${item.expense_item_id}`,
          account_code:            item.expense_item?.expense_class_item_acc_code ?? '',
          general_public_services: 0,
          social_services:         0,
          economic_services:       0,
          other_services:          0,
          total:                   amt,
        });
      });

      const ZERO_SUB: SectionSubtotal = {
        general_public_services: 0, social_services: 0,
        economic_services: 0, other_services: 0, total: 0,
      };

      const sections: Form7Section[] = [];
      sectionMap.forEach(({ code, label, rows }) => {
        const sectionTotal = rows.reduce((s, r) => s + r.total, 0);
        sections.push({
          section_code:  code,
          section_label: label,
          rows,
          subtotal: { ...ZERO_SUB, total: sectionTotal },
        });
      });

      const grandTotal = sections.reduce((s, sec) => s + sec.subtotal.total, 0);
      return {
        sections: { sections, grand_total: { ...ZERO_SUB, total: grandTotal } },
        grand_total: { ...ZERO_SUB, total: grandTotal },
      };
    },
    enabled:   !!planId && !!dept,  // ← KEY FIX: wait for dept to resolve
    staleTime: 5 * 60 * 1000,
  });
}