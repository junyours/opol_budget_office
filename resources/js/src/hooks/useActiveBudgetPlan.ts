
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan } from '@/src/types/api';

export function useActiveBudgetPlan() {
  const { data: activePlan = null, isLoading: loading } = useQuery<BudgetPlan | null>({
    queryKey: ['budget-plan-active'],
    queryFn:  () =>
      API.get('/budget-plans/active')
        .then(r => r.data?.data ?? null)
        .catch(() => null),     // returns null if no active plan (404)
  });

  return { activePlan, loading };
}