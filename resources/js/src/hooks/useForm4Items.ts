import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

export function useForm4Items(budgetPlanId: number | undefined | null) {
  return useQuery<any[]>({
    queryKey: ['form4-items', budgetPlanId],
    queryFn: () =>
      API.get('/form4-items', { params: { budget_plan_id: budgetPlanId } })
        .then(r => r.data?.data ?? []),
    enabled: !!budgetPlanId,
  });
}
