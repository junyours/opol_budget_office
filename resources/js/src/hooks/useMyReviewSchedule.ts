import { useQuery } from '@tanstack/react-query';
import API from '@/src/services/api';
import { useActiveBudgetPlan } from './useActiveBudgetPlan';
import { DepartmentReviewSchedule } from '@/src/types/api';

export function useMyReviewSchedule(enabled: boolean) {
  const { activePlan } = useActiveBudgetPlan();

  return useQuery<DepartmentReviewSchedule | null>({
    queryKey: ['my-review-schedule', activePlan?.budget_plan_id],
    queryFn: () =>
      API.get('/department-review-schedules/my-schedule', {
        params: { budget_plan_id: activePlan?.budget_plan_id },
      })
        .then(r => r.data?.data ?? null)
        .catch(() => null),
    enabled: enabled && !!activePlan?.budget_plan_id,
    staleTime: 60_000,
  });
}
