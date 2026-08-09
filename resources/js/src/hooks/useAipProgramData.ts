
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

export interface AipProgramEntry {
  aip_program_id?:      number;
  aip_reference_code?:  string | null;
  program_description: string;
  dept_id?:             number;
  is_active?:           boolean;
  total_ps:            number;
  total_mooe:          number;
  total_co:            number;
  total_amount:        number;
}

export function useAipProgramData(activePlanId?: number, deptId?: number | null) {
  const { data: programs = [], isLoading: loading } = useQuery<AipProgramEntry[]>({
    queryKey: ['aip-programs', activePlanId, deptId ?? 'all'],
    queryFn:  () =>
      API.get('/aip-programs', {
        params: deptId
          ? {
              budget_plan_id: activePlanId,
              dept_id: deptId,
              // Lean payload — only what dept-head dashboards chart.
              fields: 'program_description,total_ps,total_mooe,total_co,total_amount',
            }
          : { budget_plan_id: activePlanId },
      }).then(r => r.data?.data ?? []),
    enabled: !!activePlanId,
  });

  // dept_id is no longer returned when scoped to a single department (the
  // caller already knows which department it asked for), so grouping by
  // dept_id only makes sense for the whole-budget-plan path.
  const programsByDept = new Map<number, AipProgramEntry[]>();
  if (!deptId) {
    programs.forEach(prog => {
      if (prog.dept_id == null) return;
      const list = programsByDept.get(prog.dept_id) ?? [];
      list.push(prog);
      programsByDept.set(prog.dept_id, list);
    });
  }

  return { programs, programsByDept, loading };
}
