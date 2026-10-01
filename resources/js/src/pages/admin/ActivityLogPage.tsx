import React, { memo, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { useQueryClient, type InfiniteData } from '@tanstack/react-query';
import {
  ArrowPathIcon,
  ChevronDownIcon,
  ClipboardDocumentListIcon,
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  MagnifyingGlassIcon,
  TrashIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';
import { useAuth } from '../../hooks/useAuth';
import {
  AuditLogEntry,
  AuditLogPage,
  auditLogsKey,
  useAuditFilterOptions,
  useAuditLogs,
  useClearAuditLogs,
} from '../../hooks/useAuditLogs';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Badge } from '@/src/components/ui/badge';
import { Skeleton } from '@/src/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/src/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';

// ── Action badges ─────────────────────────────────────────────────────────────

const ACTION_STYLE: Record<string, { label: string; cls: string }> = {
  login:             { label: 'Login',            cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  logout:            { label: 'Logout',           cls: 'bg-slate-100 text-slate-600 border-slate-200' },
  create:            { label: 'Created',          cls: 'bg-green-50 text-green-700 border-green-200' },
  add:               { label: 'Added',            cls: 'bg-teal-50 text-teal-700 border-teal-200' },
  update:            { label: 'Updated',          cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  delete:            { label: 'Deleted',          cls: 'bg-red-50 text-red-700 border-red-200' },
  submitted:         { label: 'Submitted',        cls: 'bg-sky-50 text-sky-700 border-sky-200' },
  acknowledged:      { label: 'Acknowledged',     cls: 'bg-violet-50 text-violet-700 border-violet-200' },
  approved:          { label: 'Approved',         cls: 'bg-emerald-50 text-emerald-700 border-emerald-300' },
  returned_to_draft: { label: 'Returned to Draft', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
  status_change:     { label: 'Status Change',    cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  activated:         { label: 'Activated',        cls: 'bg-lime-50 text-lime-700 border-lime-200' },
  deactivated:       { label: 'Deactivated',      cls: 'bg-stone-100 text-stone-600 border-stone-200' },
  opened:            { label: 'Reopened',         cls: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  closed:            { label: 'Closed',           cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  bulk_update:       { label: 'Bulk Save',        cls: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200' },
  logs_cleared:      { label: 'Logs Cleared',     cls: 'bg-rose-50 text-rose-700 border-rose-200' },
};

const actionStyle = (a: string) =>
  ACTION_STYLE[a] ?? { label: a.replace(/_/g, ' '), cls: 'bg-gray-50 text-gray-600 border-gray-200' };

const ROLE_STYLE: Record<string, string> = {
  'super-admin':     'bg-red-50 text-red-700 border-red-200',
  admin:             'bg-blue-50 text-blue-700 border-blue-200',
  'department-head': 'bg-amber-50 text-amber-700 border-amber-200',
  'admin-hrmo':      'bg-purple-50 text-purple-700 border-purple-200',
  'admin-ldrrmo':    'bg-orange-50 text-orange-700 border-orange-200',
  viewer:            'bg-gray-50 text-gray-600 border-gray-200',
};

const roleLabel = (r: string | null) =>
  r === 'super-admin' ? 'System Admin' : (r ?? '—').replace(/-/g, ' ');

const ActionBadge: React.FC<{ action: string }> = ({ action }) => {
  const s = actionStyle(action);
  return (
    <Badge variant="outline" className={cn('whitespace-nowrap rounded-full px-2 py-0 text-[10.5px] font-semibold', s.cls)}>
      {s.label}
    </Badge>
  );
};

// ── Formatting ────────────────────────────────────────────────────────────────

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', second: '2-digit' });

const initials = (e: AuditLogEntry) =>
  ((e.user_name || e.username || '?').trim().split(/\s+/).map((p) => p[0]).slice(0, 2).join('') || '?').toUpperCase();

// ── Avatar ────────────────────────────────────────────────────────────────────
// `user_avatar` is the stored path (e.g. "avatars/abc123.jpg"). Every upload gets a NEW file
// name, so one URL never changes content → it is safe to cache for the whole session.
//  • The API returns the path on every row, so there is no extra "fetch user" request.
//  • The browser already de-dupes identical <img> URLs (20 rows by the same user = 1 download);
//    the two Sets below remember what has loaded/failed so a row that re-mounts shows the photo
//    instantly (no fade, no flash of initials) and a broken URL is never retried.
//  • loading="lazy" + decoding="async": photos below the fold are not even requested yet.
const toAvatarUrl = (avatar?: string | null): string | null => {
  if (!avatar) return null;
  if (avatar.startsWith('http')) return avatar;
  return `/storage/${avatar}`;
};

const loadedAvatars = new Set<string>();
const failedAvatars = new Set<string>();

const UserAvatar = memo(function UserAvatar({ url, initials: text }: { url: string | null; initials: string }) {
  const [loaded, setLoaded] = useState(() => !!url && loadedAvatars.has(url));
  const [failed, setFailed] = useState(() => !!url && failedAvatars.has(url));

  return (
    <div className="relative w-8 h-8 rounded-full bg-gray-900 text-white text-[11px] font-semibold flex items-center justify-center shrink-0 overflow-hidden select-none">
      {text}
      {url && !failed && (
        <img
          src={url}
          alt=""
          width={32}
          height={32}
          loading="lazy"
          decoding="async"
          draggable={false}
          onLoad={() => { loadedAvatars.add(url); setLoaded(true); }}
          onError={() => { failedAvatars.add(url); setFailed(true); }}
          className={cn(
            'absolute inset-0 w-full h-full object-cover bg-gray-900 transition-opacity duration-200',
            loaded ? 'opacity-100' : 'opacity-0',
          )}
        />
      )}
    </div>
  );
});

// ── Row ───────────────────────────────────────────────────────────────────────
// memo(): typing in the search box / opening another row does not re-render the whole list.

const LogRow = memo(function LogRow({ e, delay }: { e: AuditLogEntry; delay: number }) {
  const [open, setOpen] = useState(false);
  const changes = e.changes ?? [];
  const mobileDevice = e.device?.includes('(Mobile)');
  const DeviceIcon = mobileDevice ? DevicePhoneMobileIcon : ComputerDesktopIcon;

  return (
    <div
      className="animate-log-row border-b border-gray-100 last:border-0 px-3 sm:px-4 py-3 hover:bg-gray-50/60 transition-colors"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-start gap-3">
        {/* Avatar */}
        <div className="mt-0.5 shrink-0">
          <UserAvatar url={toAvatarUrl(e.user_avatar)} initials={initials(e)} />
        </div>

        {/* Main */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-[13px] font-semibold text-gray-900">@{e.username ?? 'unknown'}</span>
            <Badge
              variant="outline"
              className={cn('rounded-full px-2 py-0 text-[10px] font-medium capitalize', ROLE_STYLE[e.user_role ?? ''] ?? ROLE_STYLE.viewer)}
            >
              {roleLabel(e.user_role)}
            </Badge>
            <ActionBadge action={e.action} />
            {e.subject_type && e.action !== 'login' && e.action !== 'logout' && (
              <span className="text-[10.5px] text-gray-400">{e.subject_type}</span>
            )}
          </div>

          <p className="mt-1 text-[12.5px] text-gray-700 leading-snug break-words">
            {e.subject_label && e.description.includes(': ') && e.action !== 'login' && e.action !== 'logout' ? (
              <>
                <span className="text-gray-500">{e.description.split(': ')[0]}: </span>
                <span className="font-medium text-gray-900">{e.subject_label}</span>
              </>
            ) : (
              e.description
            )}
          </p>

          {/* Inline preview of the first change */}
          {changes.length > 0 && !open && (
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              {changes.slice(0, 2).map((c, i) => (
                <span key={i} className="inline-flex max-w-full flex-wrap items-center gap-1 rounded-md bg-gray-50 border border-gray-200 px-1.5 py-0.5 text-[11px] text-gray-600 break-all">
                  <span className="font-medium text-gray-700">{c.field}</span>
                  {c.old !== null && <span className="line-through text-gray-400">{c.old}</span>}
                  {c.old !== null && <span className="text-gray-300">→</span>}
                  <span className="font-semibold text-gray-900">{c.new ?? '—'}</span>
                </span>
              ))}
              {changes.length > 2 && (
                <button onClick={() => setOpen(true)} className="text-[11px] text-blue-600 hover:underline">
                  +{changes.length - 2} more
                </button>
              )}
            </div>
          )}

          {/* Expanded details (scrolls sideways on narrow phones instead of overflowing) */}
          {open && changes.length > 0 && (
            <div className="mt-2 rounded-lg border border-gray-200 overflow-x-auto max-w-xl">
              <table className="w-full min-w-[260px] text-[11.5px]">
                <thead className="bg-gray-50 text-gray-500">
                  <tr>
                    <th className="text-left font-medium px-2.5 py-1.5">Field</th>
                    <th className="text-left font-medium px-2.5 py-1.5">Before</th>
                    <th className="text-left font-medium px-2.5 py-1.5">After</th>
                  </tr>
                </thead>
                <tbody>
                  {changes.map((c, i) => (
                    <tr key={i} className="border-t border-gray-100">
                      <td className="px-2.5 py-1.5 font-medium text-gray-700">{c.field}</td>
                      <td className="px-2.5 py-1.5 text-gray-400">{c.old ?? '—'}</td>
                      <td className="px-2.5 py-1.5 font-semibold text-gray-900">{c.new ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {changes.length > 2 && open && (
            <button onClick={() => setOpen(false)} className="mt-1 text-[11px] text-gray-400 hover:text-gray-600 inline-flex items-center gap-0.5">
              <ChevronDownIcon className="w-3 h-3 rotate-180" /> Hide details
            </button>
          )}
        </div>

        {/* When / where */}
        <div className="text-right shrink-0 hidden sm:block">
          <p className="text-[12px] font-medium text-gray-800">{fmtDate(e.created_at)}</p>
          <p className="text-[11px] text-gray-500 tabular-nums">{fmtTime(e.created_at)}</p>
          <p className="mt-1 text-[10.5px] text-gray-400 flex items-center justify-end gap-1">
            <DeviceIcon className="w-3 h-3" />
            <span className="font-mono">{e.ip_address ?? '—'}</span>
          </p>
          {e.device && <p className="text-[10.5px] text-gray-400">{e.device.replace(' (Mobile)', '')}</p>}
        </div>
      </div>

      {/* Mobile when/where */}
      <p className="sm:hidden mt-1.5 ml-11 text-[11px] text-gray-400 break-words">
        {fmtDate(e.created_at)} · {fmtTime(e.created_at)} · {e.ip_address ?? '—'}
        {e.device ? ` · ${e.device}` : ''}
      </p>
    </div>
  );
});

const RowsSkeleton: React.FC<{ count?: number }> = ({ count = 8 }) => (
  <div>
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-start gap-3 px-3 sm:px-4 py-3 border-b border-gray-100">
        <Skeleton className="w-8 h-8 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-48 max-w-full" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-8 w-24 hidden sm:block" />
      </div>
    ))}
  </div>
);

// ── Page ──────────────────────────────────────────────────────────────────────

// The list never gets shorter than this, even on a very short (landscape-phone) screen.
const MIN_LIST_HEIGHT = 320;

const ActivityLogPage: React.FC = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === 'super-admin';
  const qc = useQueryClient();

  const { data: options, isError: optionsError } = useAuditFilterOptions();

  const [year, setYear] = useState<string | null>(null); // null = not initialised yet
  const [userId, setUserId] = useState('all');
  const [action, setAction] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');

  // Default the year filter to the active budget plan year (once options arrive).
  useEffect(() => {
    if (year !== null) return;
    if (options) setYear(options.active_year ? String(options.active_year) : 'all');
    else if (optionsError) setYear('all');
  }, [options, optionsError, year]);

  // Debounce search so typing doesn't fire a request per keystroke.
  useEffect(() => {
    const t = setTimeout(() => setSearch(searchInput.trim()), 450);
    return () => clearTimeout(t);
  }, [searchInput]);

  const filters = useMemo(
    () => ({ year: year ?? 'all', userId, action, search }),
    [year, userId, action, search],
  );

  const {
    data,
    isLoading,
    isFetching,
    isFetchingNextPage,
    isError,
    isPlaceholderData,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useAuditLogs(filters, year !== null);
  const clearMut = useClearAuditLogs();

  // Flatten the loaded pages. `delay` staggers the entrance of each batch (first 10 rows of a
  // batch cascade in; the rest follow together, so a big batch never feels slow).
  const rows = useMemo(
    () => (data?.pages ?? []).flatMap((p) => p.data.map((e, i) => ({ e, delay: Math.min(i, 9) * 45 }))),
    [data],
  );
  const hasFilters = userId !== 'all' || action !== 'all' || search !== '' || (year ?? 'all') !== 'all';

  const resetFilters = () => {
    setYear('all');
    setUserId('all');
    setAction('all');
    setSearchInput('');
    setSearch('');
  };

  // ── Table height = the user's screen (same idea as Form 7) ──────────────────
  // Form 7 uses `calc(100vh - 260px)` because its header height is known. This page sits inside
  // Settings and its header + filters wrap differently on phones, so the space above the list is
  // MEASURED instead of guessed: height = window height − list top − page bottom padding.
  const rootRef = useRef<HTMLDivElement>(null);
  const topRef = useRef<HTMLDivElement>(null);     // header + filters block
  const boxRef = useRef<HTMLDivElement>(null);     // the card whose height we set
  const scrollRef = useRef<HTMLDivElement>(null);  // the only scrolling element
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [boxH, setBoxH] = useState<number | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const root = rootRef.current;
      const box = boxRef.current;
      if (!root || !box) return;
      const padBottom = parseFloat(getComputedStyle(root).paddingBottom) || 0;
      const top = box.getBoundingClientRect().top;
      const next = Math.max(MIN_LIST_HEIGHT, Math.floor(window.innerHeight - top - padBottom - 8));
      setBoxH((prev) => (prev === next ? prev : next));
    };

    measure();
    window.addEventListener('resize', measure);
    // Filters wrap onto more/fewer lines when the sidebar toggles or the phone rotates.
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    if (ro && topRef.current) ro.observe(topRef.current);

    return () => {
      window.removeEventListener('resize', measure);
      ro?.disconnect();
    };
  }, []);

  // A new filter starts a new list → go back to the top.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [filters]);

  // ── Infinite scroll: load the next batch just before the bottom comes into view ──
  useEffect(() => {
    const root = scrollRef.current;
    const target = sentinelRef.current;
    // `isError` stops a failing request from being retried in a tight loop (footer has a Retry).
    if (!root || !target || !hasNextPage || isFetchingNextPage || isPlaceholderData || isError) return;

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) fetchNextPage();
      },
      { root, rootMargin: '0px 0px 300px 0px', threshold: 0 },
    );
    io.observe(target);
    return () => io.disconnect();
    // rows.length: after a batch lands the observer is re-created, so if the sentinel is still
    // on screen (tall monitor) the next batch is requested right away until the list fills it.
  }, [hasNextPage, isFetchingNextPage, isPlaceholderData, isError, fetchNextPage, rows.length]);

  // Refresh = re-request ONLY the first batch (not every batch scrolled so far).
  const refresh = () => {
    qc.setQueryData<InfiniteData<AuditLogPage, number | null>>(auditLogsKey(filters), (d) =>
      d ? { pages: d.pages.slice(0, 1), pageParams: d.pageParams.slice(0, 1) } : d,
    );
    scrollRef.current?.scrollTo({ top: 0 });
    refetch();
  };

  // ── Clear dialog (super-admin only) ─────────────────────────────────────────
  const [clearOpen, setClearOpen] = useState(false);
  const [clearScope, setClearScope] = useState<string>('year'); // 'year:2027' | 'all'
  useEffect(() => {
    if (clearOpen) {
      setClearScope(options?.active_year ? `year:${options.active_year}` : 'all');
    }
  }, [clearOpen, options?.active_year]);

  const confirmClear = () => {
    const payload =
      clearScope === 'all'
        ? { scope: 'all' as const }
        : { scope: 'year' as const, year: Number(clearScope.split(':')[1]) };

    clearMut.mutate(payload, {
      onSuccess: (r) => {
        toast.success(`Cleared ${r.deleted} log ${r.deleted === 1 ? 'entry' : 'entries'}.`);
        setClearOpen(false);
        scrollRef.current?.scrollTo({ top: 0 });
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.message ?? 'Failed to clear logs.');
        setClearOpen(false);
      },
    });
  };

  return (
    <div ref={rootRef} className="p-4 sm:p-6 max-w-5xl mx-auto w-full">
      <div ref={topRef}>
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
              <ClipboardDocumentListIcon className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <h2 className="text-[15px] font-semibold text-gray-900 leading-tight">Activity Log</h2>
              <p className="text-[12px] text-gray-500 mt-0.5">
                Who did what, and when — recorded under the active budget plan year.
                {!isSuperAdmin && ' System Admin activity is hidden.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-[12px]"
              disabled={isFetching}
              onClick={refresh}
            >
              <ArrowPathIcon className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')} />
              Refresh
            </Button>

            {isSuperAdmin && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 gap-1.5 text-[12px] text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700"
                onClick={() => setClearOpen(true)}
              >
                <TrashIcon className="w-3.5 h-3.5" />
                Clear logs
              </Button>
            )}
          </div>
        </div>

        {/* Filters — phone: search on its own row, then 2 per row (3 rows instead of 5) */}
        <div className="rounded-xl border border-gray-200 bg-white p-3 mb-3 grid grid-cols-2 gap-2 lg:grid-cols-[1fr_150px_190px_160px_auto]">
          <div className="relative col-span-2 lg:col-span-1">
            <MagnifyingGlassIcon className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search name, user, IP…"
              className="h-8 pl-8 text-[12px]"
            />
          </div>

          <Select value={year ?? 'all'} onValueChange={setYear}>
            <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Budget year" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All years</SelectItem>
              {(options?.years ?? []).map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Budget Year {y}{options?.active_year === y ? ' (active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={userId} onValueChange={setUserId}>
            <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="User" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All users</SelectItem>
              {(options?.users ?? []).map((u) => (
                <SelectItem key={u.user_id} value={String(u.user_id)}>
                  @{u.username}{u.user_name ? ` · ${u.user_name}` : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={action} onValueChange={setAction}>
            <SelectTrigger className="h-8 text-[12px]"><SelectValue placeholder="Action" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All actions</SelectItem>
              {(options?.actions ?? []).map((a) => (
                <SelectItem key={a} value={a}>{actionStyle(a).label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-[12px] text-gray-500 gap-1"
            disabled={!hasFilters}
            onClick={resetFilters}
          >
            <XMarkIcon className="w-3.5 h-3.5" /> Reset
          </Button>
        </div>
      </div>

      {/* List — fixed height = screen; ONLY the inner div scrolls */}
      <div
        ref={boxRef}
        style={{ height: boxH ?? 'calc(100dvh - 320px)' }}
        className={cn(
          'rounded-xl border border-gray-200 bg-white overflow-hidden flex flex-col transition-opacity',
          isFetching && !isLoading && !isFetchingNextPage && 'opacity-70',
        )}
      >
        <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {isLoading || year === null ? (
            <RowsSkeleton count={10} />
          ) : isError && rows.length === 0 ? (
            <div className="py-14 text-center">
              <p className="text-[13px] text-red-600">Could not load the activity log.</p>
              <Button variant="outline" size="sm" className="mt-3 h-8 text-[12px]" onClick={() => refetch()}>Try again</Button>
            </div>
          ) : rows.length === 0 ? (
            <div className="py-14 text-center px-4">
              <ClipboardDocumentListIcon className="w-8 h-8 text-gray-300 mx-auto" />
              <p className="mt-2 text-[13px] font-medium text-gray-700">No activity found</p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {hasFilters ? 'Try changing or resetting the filters.' : 'Actions will appear here once an active budget plan exists.'}
              </p>
            </div>
          ) : (
            <>
              {rows.map(({ e, delay }) => <LogRow key={e.id} e={e} delay={delay} />)}

              {/* Sentinel: when this gets within 300px of the visible area the next batch loads */}
              <div ref={sentinelRef} aria-hidden="true" className="h-px" />

              {isFetchingNextPage && <RowsSkeleton count={2} />}

              {isError && !isFetchingNextPage && (
                <div className="py-4 text-center">
                  <p className="text-[12px] text-red-600">Could not load more.</p>
                  <Button variant="outline" size="sm" className="mt-2 h-7 text-[12px]" onClick={() => fetchNextPage()}>
                    Retry
                  </Button>
                </div>
              )}

              {!hasNextPage && !isError && (
                <p className="py-4 text-center text-[11px] text-gray-400">You’ve reached the end of the log</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Clear dialog */}
      {isSuperAdmin && (
        <AlertDialog open={clearOpen} onOpenChange={(o) => !clearMut.isPending && setClearOpen(o)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Clear activity logs?</AlertDialogTitle>
              <AlertDialogDescription>
                This permanently deletes the selected logs for every user, including System Admin activity.
                It cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>

            <Select value={clearScope} onValueChange={setClearScope}>
              <SelectTrigger className="h-9 text-[13px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(options?.years ?? []).map((y) => (
                  <SelectItem key={y} value={`year:${y}`}>Budget Year {y} only</SelectItem>
                ))}
                <SelectItem value="all">All budget plan years</SelectItem>
              </SelectContent>
            </Select>

            <AlertDialogFooter>
              <AlertDialogCancel disabled={clearMut.isPending}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                disabled={clearMut.isPending}
                onClick={(e) => { e.preventDefault(); confirmClear(); }}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {clearMut.isPending ? 'Clearing…' : 'Yes, clear logs'}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </div>
  );
};

export default ActivityLogPage;