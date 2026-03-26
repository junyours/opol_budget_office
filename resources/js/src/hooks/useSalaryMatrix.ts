import { useQuery, useQueryClient } from '@tanstack/react-query';
import API from '../services/api';
import { SalaryStandardVersion, SalaryGradeStep } from '../types/api';

export function useSalaryMatrix() {
  const queryClient = useQueryClient();

  // Always fetch fresh � staleTime: 0 + refetchOnMount/Focus ensures PersonnelServices
  // always uses the currently active tranche, even after activating a different one
  // from TranchePage without a page reload.
  const { data: versions = [], isLoading: versionsLoading } = useQuery<SalaryStandardVersion[]>({
    queryKey: ['salary-standard-versions'],
    queryFn:  () => API.get('/salary-standard-versions').then(r => r.data?.data ?? []),
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
  });

  const activeVersion = versions.find(v => v.is_active) ?? null;

  // Query key includes the active version ID � if the active version changes,
  // React Query automatically fetches the new version's steps.
  const { data: rawSteps = [], isLoading: stepsLoading } = useQuery<SalaryGradeStep[]>({
    queryKey: ['salary-grade-steps', activeVersion?.salary_standard_version_id],
    queryFn:  () =>
      API.get('/salary-grade-steps', {
        params: { salary_standard_version_id: activeVersion!.salary_standard_version_id },
      }).then(r => r.data?.data?.map((s: any) => ({ ...s, amount: s.salary })) ?? []),
    enabled:              !!activeVersion,
    staleTime:            0,
    refetchOnMount:       true,
    refetchOnWindowFocus: true,
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
