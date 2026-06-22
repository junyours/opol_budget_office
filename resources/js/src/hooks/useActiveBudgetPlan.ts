
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { BudgetPlan } from '@/src/types/api';

export function useActiveBudgetPlan() {
//   const { data: activePlan = null, isLoading: loading } = useQuery<BudgetPlan | null>({
//     queryKey: ['budget-plan-active'],
//     queryFn:  () =>
//       API.get('/budget-plans/active')
//         .then(r => r.data?.data ?? null)
//         .catch(() => null),     // returns null if no active plan (404)
//   });

const { data: activePlan = null, isLoading: loading } = useQuery<BudgetPlan | null>({
    queryKey: ['budget-plan-active'],
    queryFn:  () =>
      API.get('/budget-plans/active')
        .then(r => r.data?.data ?? null)
        .catch(() => null),     // returns null if no active plan (404)
    staleTime: 5 * 60 * 1000,      // don't refetch on every mount for 5 min
    refetchOnWindowFocus: false,   // don't refetch just because the tab regained focus
  });

  return { activePlan, loading };
}
