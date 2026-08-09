import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "../services/api";

export interface DashboardAnnouncement {
  id: number;
  type: "announcement" | "phase" | "schedule" | "department";
  title: string;
  description: string | null;
  dept_id: number | null;
  department?: { dept_id: number; dept_name: string; dept_abbreviation: string; logo: string | null } | null;
  accent_color: string;
  icon: string | null;
  event_date: string | null;
  is_active: boolean;
  sort_order: number;
}

export function useDashboardAnnouncements(activeOnly = true) {
  return useQuery({
    queryKey: ["dashboard-announcements", activeOnly],
    queryFn: () =>
      API.get("/dashboard-announcements", { params: activeOnly ? { active_only: 1 } : {} })
        .then(r => (r.data?.data ?? []) as DashboardAnnouncement[]),
  });
}

export function useCreateDashboardAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: Partial<DashboardAnnouncement>) =>
      API.post("/dashboard-announcements", payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-announcements"] }),
  });
}

export function useUpdateDashboardAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...payload }: Partial<DashboardAnnouncement> & { id: number }) =>
      API.put(`/dashboard-announcements/${id}`, payload).then(r => r.data.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-announcements"] }),
  });
}

export function useDeleteDashboardAnnouncement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => API.delete(`/dashboard-announcements/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-announcements"] }),
  });
}

export function useReorderDashboardAnnouncements() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (ids: number[]) => API.post("/dashboard-announcements/reorder", { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["dashboard-announcements"] }),
  });
}
