
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';

export interface AipProgramEntry {
  aip_program_id:      number;
  aip_reference_code:  string | null;
  program_description: string;
  dept_id:             number;
  is_active:           boolean;
  total_ps:            number;
  total_mooe:          number;
  total_co:            number;
  total_amount:        number;
}

export function useAipProgramData(activePlanId?: number) {
  const { data: programs = [], isLoading: loading } = useQuery<AipProgramEntry[]>({
    queryKey: ['aip-programs', activePlanId],
    queryFn:  () =>
      API.get('/aip-programs', { params: { budget_plan_id: activePlanId } })
        .then(r => r.data?.data ?? []),
    enabled: !!activePlanId,
  });

  const programsByDept = new Map<number, AipProgramEntry[]>();
  programs.forEach(prog => {
    const list = programsByDept.get(prog.dept_id) ?? [];
    list.push(prog);
    programsByDept.set(prog.dept_id, list);
  });

  return { programs, programsByDept, loading };
}