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
