import { keepPreviousData, useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import API from '@/src/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditChange {
  field: string;
  old: string | null;
  new: string | null;
}

export interface AuditLogEntry {
  id: number;
  budget_plan_id: number | null;
  budget_plan_year: number;
  user_id: number | null;
  username: string | null;
  user_name: string | null;
  user_role: string | null;
  user_avatar: string | null;   // stored path, e.g. "avatars/abc.jpg" (null = no photo)
  action: string;
  subject_type: string | null;
  subject_id: string | null;
  subject_label: string | null;
  description: string;
  changes: AuditChange[] | null;
  ip_address: string | null;
  device: string | null;
  created_at: string;
}

export interface AuditLogFilters {
  year: string;     // 'all' | '2027'
  userId: string;   // 'all' | '12'
  action: string;   // 'all' | 'login' | ...
  search: string;
}

/** Keyset ("infinite scroll") page: `next_cursor` is the id to send back as `before_id`. */
export interface AuditLogMeta {
  per_page: number;
  has_more: boolean;
  next_cursor: number | null;
}

export interface AuditLogPage {
  data: AuditLogEntry[];
  meta: AuditLogMeta;
}

/** Rows requested per scroll step. */
export const AUDIT_PAGE_SIZE = 20;

export const auditLogsKey = (f: AuditLogFilters) => ['audit-logs', f] as const;

export interface AuditFilterOptions {
  years: number[];
  users: { user_id: number; username: string; user_name: string | null; user_role: string | null }[];
  actions: string[];
  active_year: number | null;
  can_clear: boolean;
}

// ── Queries ───────────────────────────────────────────────────────────────────
// No refetchInterval, no refetch on focus/mount: data only reloads when the user
// changes a filter, scrolls to the end of the list, or presses the Refresh button.

export function useAuditFilterOptions() {
  return useQuery<AuditFilterOptions>({
    queryKey: ['audit-logs-filters'],
    queryFn: () => API.get('/audit-logs/filters').then((r) => r.data.data),
    staleTime: 10 * 60 * 1000,
  });
}

export function useAuditLogs(f: AuditLogFilters, enabled = true) {
  return useInfiniteQuery({
    queryKey: auditLogsKey(f),
    enabled,
    initialPageParam: null as number | null,
    queryFn: ({ pageParam }): Promise<AuditLogPage> =>
      API.get('/audit-logs', {
        params: {
          budget_plan_year: f.year,
          user_id: f.userId === 'all' ? undefined : f.userId,
          action: f.action === 'all' ? undefined : f.action,
          search: f.search || undefined,
          before_id: pageParam ?? undefined,
          per_page: AUDIT_PAGE_SIZE,
        },
      }).then((r) => ({ data: r.data.data as AuditLogEntry[], meta: r.data.meta as AuditLogMeta })),
    getNextPageParam: (last) => (last.meta.has_more ? last.meta.next_cursor : undefined),
    staleTime: Infinity,          // only the Refresh button / filter change refetches
    placeholderData: keepPreviousData,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

export function useClearAuditLogs() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload: { scope: 'all' | 'year'; year?: number }) =>
      API.delete('/audit-logs', { data: payload }).then((r) => r.data.data as { deleted: number }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['audit-logs'] });
      qc.invalidateQueries({ queryKey: ['audit-logs-filters'] });
    },
  });
}