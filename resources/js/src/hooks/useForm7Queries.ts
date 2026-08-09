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
    enabled: !!planId,
  });
}

export function useForm7SpecialAccount(
  source: SpecialAccountId,
  planId: number | undefined
) {
  return useQuery<Form7Data>({
    queryKey: form7QueryKeys.specialAccount(source, planId!),
    queryFn:  () =>
      API.get('/form7', { params: { budget_plan_id: planId, filter: source } })
        .then(r => r.data.data),
    enabled: !!planId,
  });
}

// ─── Plan lookup (resolve a CY → budget_plan_id) ──────────────────────────────

export interface BudgetPlanSummary {
  budget_plan_id: number;
  year:           number;
}

export function useBudgetPlansList() {
  return useQuery<BudgetPlanSummary[]>({
    queryKey: ['budget-plans', 'list'],
    queryFn:  () =>
      API.get('/budget-plans').then(r => r.data.data ?? r.data),
  });


}
// ─── Lean summary (section subtotals only — no item rows) ────────────────────
// For widgets like SectorAllocationCard that only chart section-level
// subtotals. Same data source as useForm7GeneralFund, but the backend strips
// every line item's name/account_code/per-row breakdown before returning —
// cuts the payload from ~120kB down to a few dozen numbers.

export interface Form7SummarySection {
  section_code:  string;
  section_label: string;
  subtotal:      SectionSubtotal;
}

export interface Form7SummaryData {
  sections: { sections: Form7SummarySection[]; grand_total: SectionSubtotal };
}

export const form7SummaryQueryKeys = {
  generalFund:    (planId: number) => ['form7-summary', 'general-fund', planId]         as const,
  specialAccount: (source: string, planId: number) => ['form7-summary', source, planId] as const,
};

export function useForm7GeneralFundSummary(planId: number | undefined) {
  return useQuery<Form7SummaryData>({
    queryKey: form7SummaryQueryKeys.generalFund(planId!),
    queryFn:  () =>
      API.get('/form7/summary', { params: { budget_plan_id: planId } })
        .then(r => r.data.data),
    enabled: !!planId,
  });
}
