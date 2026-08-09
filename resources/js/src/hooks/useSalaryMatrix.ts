import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { SalaryStandardVersion, SalaryGradeStep } from '../types/api';

export function useSalaryMatrix() {
  const queryClient = useQueryClient();

const { data: versions = [], isLoading: versionsLoading } = useQuery<SalaryStandardVersion[]>({
    queryKey: ['salary-standard-versions'],
    queryFn:  () => API.get('/salary-standard-versions').then(r => r.data?.data ?? []),
  });

  const activeVersion = versions.find(v => v.is_active) ?? null;

  

const { data: rawSteps = [], isLoading: stepsLoading } = useQuery<SalaryGradeStep[]>({
    queryKey: ['salary-grade-steps', activeVersion?.salary_standard_version_id],
    queryFn:  () =>
      API.get('/salary-grade-steps', {
        params: { salary_standard_version_id: activeVersion!.salary_standard_version_id },
      }).then(r => r.data?.data?.map((s: any) => ({ ...s, amount: s.salary })) ?? []),
    enabled: !!activeVersion,
  });

  // Call this after activating a tranche or uploading a new one to immediately
  // push fresh data to all mounted components using this hook.
  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ['salary-standard-versions'] });
    queryClient.invalidateQueries({ queryKey: ['salary-grade-steps'] });
  };

 return {
    activeVersion,
    matrix:  rawSteps,
    loading: versionsLoading || stepsLoading,
    error:   null,
    refresh,
  };
}

/**
 * Lean variant for widgets (e.g. AdminDashboard's Salary Tranche card) that
 * only need to display which tranche is active — lbc_reference / tranche /
 * income_class. Hits /salary-standard-versions/active instead of fetching
 * every version + the full salary_grade_steps matrix for the active one.
 */
export function useActiveSalaryVersion() {
  return useQuery<SalaryStandardVersion | null>({
    queryKey: ['salary-standard-versions', 'active'],
    queryFn:  () => API.get('/salary-standard-versions/active').then(r => r.data?.data ?? null),
  });
}
