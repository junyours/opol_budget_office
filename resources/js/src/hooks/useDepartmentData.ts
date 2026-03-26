
import { useQuery } from '@tanstack/react-query';
import API from '../services/api';
import { Department, DepartmentCategory, DepartmentBudgetPlan } from '../types/api';

const categoryColors = [
  'bg-blue-50 text-blue-700',   'bg-green-50 text-green-700',
  'bg-yellow-50 text-yellow-700','bg-purple-50 text-purple-700',
  'bg-pink-50 text-pink-700',   'bg-indigo-50 text-indigo-700',
  'bg-red-50 text-red-700',     'bg-orange-50 text-orange-700',
];

export interface DepartmentWithMeta extends Department {
  categoryName: string;
  hasPlan:      boolean;
  colorClass:   string;
}

export function useDepartmentData(activePlanId?: number) {
  const { data: rawDepts = [], isLoading: deptsLoading } = useQuery<Department[]>({
    queryKey: ['departments'],   // shared cache with useDepartments
    queryFn:  () => API.get('/departments').then(r => r.data?.data ?? []),
  });

  const { data: categories = [], isLoading: catsLoading } = useQuery<DepartmentCategory[]>({
    queryKey: ['department-categories'],
    queryFn:  () => API.get('/department-categories').then(r => r.data?.data ?? []),
    staleTime: 15 * 60 * 1000,  // categories almost never change
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['dept-budget-plans-all', activePlanId],
    queryFn:  () =>
      API.get('/department-budget-plans', { params: { budget_plan_id: activePlanId } })
        .then(r => r.data?.data ?? []),
    enabled: !!activePlanId,
  });

  // Derive enriched departments only when all data is ready
  const allDepartments: DepartmentWithMeta[] = (() => {
    if (deptsLoading || catsLoading) return [];

    const categoryMap = new Map(categories.map(c => [c.dept_category_id, c.dept_category_name]));
    const colorMap    = new Map(categories.map((c, i) => [c.dept_category_id, categoryColors[i % categoryColors.length]]));
    const planDeptIds = new Set(plans.map(p => p.dept_id));

    return rawDepts.map(dept => ({
      ...dept,
      categoryName: categoryMap.get(dept.dept_category_id) ?? 'Unknown',
      hasPlan:      planDeptIds.has(dept.dept_id),
      colorClass:   colorMap.get(dept.dept_category_id) ?? 'bg-gray-50 text-gray-700',
    }));
  })();

  return {
    allDepartments,
    categories,
    loading: deptsLoading || catsLoading || plansLoading,
  };
}