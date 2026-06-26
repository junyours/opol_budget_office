
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

export interface CalamityFundData {
  budget_plan_id: number | null;
  year:           number | null;
  source:         string | null;
  total_tax_revenue_proposed: number | null;
  calamity_fund:  number | null;
  pre_disaster:   number | null;
  quick_response: number | null;
}

export const useCalamityFund = (
  budgetPlanId: number | undefined,
  source: string | undefined,
) => {
  const isSpecialAccount = source === 'sh' || source === 'occ' || source === 'pm';

  const { data, isLoading, error } = useQuery<CalamityFundData | null>({
    queryKey: ['calamity-fund', budgetPlanId, source],
    queryFn: () =>
      API.get('/calamity-fund', { params: { budget_plan_id: budgetPlanId, source } })
        .then(r => r.data.data),
    enabled: !!budgetPlanId && isSpecialAccount,
  });

  return {
    data: data ?? null,
    loading: isLoading,
    error: error ? (error as any)?.response?.data?.message ?? 'Failed to load calamity fund data' : null,
    isSpecialAccount,
  };
};
