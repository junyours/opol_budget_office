import { useState, useEffect } from 'react';
import API from '../services/api';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface CalamityFundData {
  budget_plan_id: number | null;
  year:           number | null;
  source:         string | null;
  total_tax_revenue_proposed: number | null;
  calamity_fund:  number | null;  // 5%
  pre_disaster:   number | null;  // 3.5% (70 % of 5 %)
  quick_response: number | null;  // 1.5% (30 % of 5 %)
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the 5% Calamity Fund breakdown from the server.
 *
 * Only call this when the department's category is a Special Account
 * (sh | occ | pm).  For general-fund departments pass source = undefined
 * and the hook will return null data immediately.
 *
 * @param budgetPlanId  The active parent budget plan id
 * @param source        Income-fund source key: 'sh' | 'occ' | 'pm' | 'general-fund'
 */
export const useCalamityFund = (
  budgetPlanId: number | undefined,
  source: string | undefined,
) => {
  const [data, setData]       = useState<CalamityFundData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);

  // Only meaningful for special account departments
  const isSpecialAccount = source === 'sh' || source === 'occ' || source === 'pm';

  useEffect(() => {
    if (!budgetPlanId || !isSpecialAccount) {
      setData(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetch = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await API.get('/calamity-fund', {
          params: { budget_plan_id: budgetPlanId, source },
        });
        if (!cancelled) setData(res.data.data);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.response?.data?.message ?? 'Failed to load calamity fund data');
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetch();
    return () => { cancelled = true; };
  }, [budgetPlanId, source, isSpecialAccount]);

  return { data, loading, error, isSpecialAccount };
};