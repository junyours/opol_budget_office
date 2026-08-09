import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import API from '../../services/api';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { DepartmentBudgetPlan } from '../../types/api';
import { LoadingState } from '../../components/states/LoadingState';
import { Skeleton } from '@/src/components/ui/skeleton';
import { Input } from '@/src/components/ui/input';
import { useLBPFormsListStore } from '../../store/lbpFormsListStore';
import { CardContent } from '@/src/components/ui/card';
import { Badge } from '@/src/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/src/components/ui/select';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtP  = (n: number) => `₱${fmt(n)}`;
const pctOf = (base: number, diff: number) =>
  base === 0 ? (diff === 0 ? 0 : 100) : (diff / base) * 100;

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL ?? '/storage';

const STATUS_CFG: Record<string, { label: string; badge: string; dot: string }> = {
  draft:        { label: 'Draft',        badge: 'text-amber-700 bg-amber-50 border-amber-200',     dot: 'bg-amber-400' },
  submitted:    { label: 'Submitted',    badge: 'text-blue-700 bg-blue-50 border-blue-200',         dot: 'bg-blue-400' },
  under_review: { label: 'Under Review', badge: 'text-indigo-700 bg-indigo-50 border-indigo-200',   dot: 'bg-indigo-400' },
  approved:     { label: 'Approved',     badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',dot: 'bg-emerald-500' },
};
const getStatusCfg = (s: string) => STATUS_CFG[s] ?? STATUS_CFG.draft;

const CATEGORY_DOT: Record<number, string> = {
  1: 'bg-cat-1',
  2: 'bg-cat-2',
  3: 'bg-cat-3',
  4: 'bg-cat-4',
};
const getCategoryDot = (id: number | undefined) =>
  CATEGORY_DOT[id ?? 0] ?? 'bg-gray-300';

// Gradient palette inspired by the reference cards (Business/Festive/Health/Finance/Gaming).
// Vivid, saturated top fading to near-white at the bottom. Cycles by category id.
const CATEGORY_PALETTE = [
  { bg: 'bg-gradient-to-b from-[#FFEBAF] to-[#FFF5D6]', hoverBorder: 'hover:border-[#F0D68A]', text: 'text-gray-900', sub: 'text-gray-700' }, // yellow
  { bg: 'bg-gradient-to-b from-[#B1E8FD] to-[#D6F2FE]', hoverBorder: 'hover:border-[#96D6F2]', text: 'text-gray-900', sub: 'text-gray-700' }, // blue
  { bg: 'bg-gradient-to-b from-[#FFCDFA] to-[#FFE6FD]', hoverBorder: 'hover:border-[#F2B4E2]', text: 'text-gray-900', sub: 'text-gray-700' }, // pink
  { bg: 'bg-gradient-to-b from-[#C5E9C5] to-[#E0F4E0]', hoverBorder: 'hover:border-[#A6DDA4]', text: 'text-gray-900', sub: 'text-gray-700' }, // green
];
const getCategoryPalette = (id: number | undefined) =>
  CATEGORY_PALETTE[(id ?? 0) % CATEGORY_PALETTE.length];

// Colored pill per category — same order/hue family as CATEGORY_PALETTE above.
const CATEGORY_BADGE = [
  'bg-amber-50 text-amber-700 border-amber-200',     // yellow
  'bg-sky-50 text-sky-700 border-sky-200',           // blue
  'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200', // pink
  'bg-emerald-50 text-emerald-700 border-emerald-200', // green
];
const getCategoryBadge = (id: number | undefined) =>
  CATEGORY_BADGE[(id ?? 0) % CATEGORY_BADGE.length];

// Logo/avatar background follows category, same hue family as CATEGORY_BADGE.
const CATEGORY_AVATAR = [
  'bg-amber-100 text-amber-700',    // yellow
  'bg-sky-100 text-sky-700',        // blue
  'bg-fuchsia-100 text-fuchsia-700',// pink
  'bg-emerald-100 text-emerald-700',// green
];
const avatarColor = (categoryId: number | undefined) =>
  CATEGORY_AVATAR[(categoryId ?? 0) % CATEGORY_AVATAR.length];

// ─── Stagger animation (injected once) ─────────────────────────────────────
const CARD_ANIM_CSS = `
@keyframes _cardIn {
  from { opacity: 0; transform: translateY(10px) scale(0.97); filter: blur(2px); }
  60%  { filter: blur(0); }
  to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
}
@keyframes _headerIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
._cardAnim {
  will-change: transform, opacity, filter;
}
._headerAnim {
  will-change: transform, opacity;
}
@media (prefers-reduced-motion: reduce) {
  ._cardAnim, ._headerAnim {
    animation: none !important; opacity: 1 !important; transform: none !important; filter: none !important;
  }
}`;

let _cardAnimInjected = false;
function ensureCardAnim() {
  if (_cardAnimInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = CARD_ANIM_CSS;
  document.head.appendChild(el);
  _cardAnimInjected = true;
}

interface DeptPlanWithName extends DepartmentBudgetPlan {
  dept_name: string;
  dept_abbreviation: string;
  dept_logo: string | null;
}

function DeptLogo({ logo, abbreviation, name, categoryId }: {
  logo: string | null; abbreviation: string; name: string; categoryId: number | undefined;
}) {
  const label = abbreviation
    ? abbreviation.replace(/[()]/g, '').trim().slice(0, 4)
    : name.slice(0, 2).toUpperCase();

  const [imgFailed, setImgFailed] = useState(false);
  const hasValidLogo = !!logo && logo.trim() !== '';

  if (hasValidLogo && !imgFailed) {
    return (
      <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 bg-gray-50">
        <img
          src={`${STORAGE_URL}/${logo}`}
          alt={abbreviation || name}
          className="w-full h-full object-cover"
          onError={() => setImgFailed(true)}
        />
      </div>
    );
  }
  return (
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px] flex-shrink-0', avatarColor(categoryId))}>
      {label}
    </div>
  );
}

// ─── Loading skeleton ───────────────────────────────────────────────────────
function DeptCardSkeleton() {
  return (
    <div className="rounded-2xl border-2 border-gray-200 overflow-hidden flex flex-col bg-white">
      <div className="flex flex-col gap-5 px-6 pt-6 pb-5">
        <div className="flex items-start justify-between gap-2">
          <Skeleton className="w-10 h-10 rounded-xl" />
          <Skeleton className="w-20 h-5 rounded-full" />
        </div>
        <div className="flex flex-col gap-2">
          <Skeleton className="h-3 w-3/4 rounded" />
          <Skeleton className="h-5 w-1/2 rounded" />
          <Skeleton className="h-5 w-24 rounded-full mt-1" />
        </div>
      </div>
      <div className="px-6 py-5 border-t border-black/5 flex flex-col items-end gap-2">
        <Skeleton className="h-3 w-20 rounded" />
        <Skeleton className="h-6 w-32 rounded" />
        <Skeleton className="h-3 w-28 rounded" />
      </div>
    </div>
  );
}

// ─── Debounce hook ──────────────────────────────────────────────────────────
function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(t);
  }, [value, delayMs]);
  return debounced;
}

// ─── Component ────────────────────────────────────────────────────────────────

const LBPFormsList: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const activePlanId = activePlan?.budget_plan_id;

  useEffect(() => {
    ensureCardAnim();
  }, []);

  // Only play the staggered entrance once per browser session — otherwise
  // every time you navigate back from a card's detail page, all cards
  // replay the fade-in from scratch, which reads as janky rather than smooth.
  const hasAnimatedRef = React.useRef(
    typeof sessionStorage !== 'undefined' && sessionStorage.getItem('lbpFormsListAnimated') === '1',
  );
  useEffect(() => {
    if (!hasAnimatedRef.current && typeof sessionStorage !== 'undefined') {
      sessionStorage.setItem('lbpFormsListAnimated', '1');
    }
  }, []);

  const { data: categoryList = [] } = useQuery<{ dept_category_id: number; dept_category_name: string }[]>({
    queryKey: ['department-categories'],
    queryFn: () => API.get('/department-categories').then(r => r.data.data ?? []),
  });
  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categoryList.forEach(c => { map[c.dept_category_id] = c.dept_category_name; });
    return map;
  }, [categoryList]);

  const { data: rawDeptPlans = [], isLoading: deptPlansLoading } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['department-budget-plans', activePlanId],
    queryFn: () =>
      API.get('/department-budget-plans', { params: { budget_plan_id: activePlanId, include: 'category' } })
        .then(r => r.data.data ?? []),
    enabled: !!activePlanId,
  });

  const deptPlans: DeptPlanWithName[] = useMemo(() => {
    return rawDeptPlans
      .map(p => ({
        ...p,
        dept_name:         p.department?.dept_name         ?? 'Unknown',
        dept_abbreviation: p.department?.dept_abbreviation ?? '',
        dept_logo:         p.department?.logo              ?? null,
      }))
      .sort((a, b) => {
        const catA = a.department?.dept_category_id ?? 999;
        const catB = b.department?.dept_category_id ?? 999;
        if (catA !== catB) return catA - catB;
        return (a.department?.sort_order ?? 0) - (b.department?.sort_order ?? 0);
      });
  }, [rawDeptPlans]);

  // ── Current + past totals for every department — ONE request instead of the
  //    ~4-per-department fan-out this used to be (past-plan lookup, past AIP,
  //    current AIP, all repeated per department). Computed server-side.
  const { data: totalsData = [] } = useQuery<{
    dept_id: number;
    dept_budget_plan_id: number;
    current_total: number;
    past_total: number;
  }[]>({
    queryKey: ['department-budget-plans-totals', activePlanId],
    queryFn: () =>
      API.get('/department-budget-plans/totals', { params: { budget_plan_id: activePlanId } })
        .then(r => r.data.data ?? []),
    enabled: !!activePlanId,
  });

  const proposedTotalByPlan = useMemo(() => {
    const map = new Map<number, number>();
    totalsData.forEach(t => map.set(t.dept_budget_plan_id, t.current_total));
    return map;
  }, [totalsData]);

  const pastTotalByDeptId = useMemo(() => {
    const map = new Map<number, number>();
    totalsData.forEach(t => map.set(t.dept_id, t.past_total));
    return map;
  }, [totalsData]);

  // ── Search (debounced) + filters — persisted in Zustand so they survive
  //    navigating away to a card's detail page and back ─────────────────────
  const searchInput = useLBPFormsListStore(s => s.search);
  const setSearchInput = useLBPFormsListStore(s => s.setSearch);
  const statusFilter = useLBPFormsListStore(s => s.statusFilter);
  const setStatusFilter = useLBPFormsListStore(s => s.setStatusFilter);
  const categoryFilter = useLBPFormsListStore(s => s.categoryFilter);
  const setCategoryFilter = useLBPFormsListStore(s => s.setCategoryFilter);
  const debouncedSearch = useDebouncedValue(searchInput, 300);

  const getCategoryName = useCallback(
    (p: DeptPlanWithName) =>
      p.department?.category?.dept_category_name
      ?? categoryMap[p.department?.dept_category_id ?? -1]
      ?? null,
    [categoryMap],
  );

  const deptCategories = useMemo(() => {
    const cats = deptPlans.map(getCategoryName).filter((c): c is string => !!c);
    return Array.from(new Set(cats)).sort();
  }, [deptPlans, getCategoryName]);

  // Plans matching search + category but NOT status — used to compute the
  // per-tab counts so switching status tabs doesn't make the counts shift.
  const plansForCounting = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return deptPlans.filter(p => {
      const matchSearch =
        !q ||
        p.dept_name.toLowerCase().includes(q) ||
        p.dept_abbreviation.toLowerCase().includes(q);
      const matchCategory = categoryFilter === 'all' || (getCategoryName(p) ?? '') === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [deptPlans, debouncedSearch, categoryFilter, getCategoryName]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { draft: 0, submitted: 0, under_review: 0, approved: 0 };
    plansForCounting.forEach(p => { counts[p.status] = (counts[p.status] ?? 0) + 1; });
    return counts;
  }, [plansForCounting]);

  const filteredPlans = useMemo(() => {
    const q = debouncedSearch.toLowerCase().trim();
    return deptPlans.filter(p => {
      const matchSearch =
        !q ||
        p.dept_name.toLowerCase().includes(q) ||
        p.dept_abbreviation.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || p.status === statusFilter;
      const matchCategory = categoryFilter === 'all' || (getCategoryName(p) ?? '') === categoryFilter;
      return matchSearch && matchStatus && matchCategory;
    });
  }, [deptPlans, debouncedSearch, statusFilter, categoryFilter, getCategoryName]);

  const groupedPlans = useMemo(() => {
    const map = new Map<string, { categoryName: string; categoryId: number; plans: DeptPlanWithName[] }>();
    filteredPlans.forEach(plan => {
      const categoryName = getCategoryName(plan) ?? 'Uncategorized';
      const categoryId = plan.department?.dept_category_id ?? 9999;
      if (!map.has(categoryName)) map.set(categoryName, { categoryName, categoryId, plans: [] });
      map.get(categoryName)!.plans.push(plan);
    });
    return Array.from(map.values()).sort((a, b) => a.categoryId - b.categoryId);
  }, [filteredPlans, getCategoryName]);

  // ── Deep link from notification bell (dept_id in location.state) ───────────
  useEffect(() => {
    const incoming = (location.state as { deptId?: number } | null)?.deptId;
    if (!incoming || !deptPlans.length) return;
    const match = deptPlans.find(p => p.dept_id === incoming);
    if (match) {
      navigate(`/admin/lbp-forms/${match.dept_budget_plan_id}`, { replace: true });
    }
  }, [deptPlans, location.state, navigate]);

  // Restore scroll position via a callback ref — fires the instant the
  // scroll container is actually attached to the DOM, independent of which
  // loading flag resolved last. A useEffect here was unreliable because its
  // dependency array (deptPlansLoading, filteredPlans.length) could stay
  // unchanged even when planLoading flipped later, so it never re-fired
  // once the container existed.
  //
  // We read the stored value imperatively (getState()) instead of
  // subscribing to it, so scrolling doesn't re-render this component on
  // every pixel — only setScrollTop (a stable function reference) is
  // subscribed to.
  const setScrollTop = useLBPFormsListStore(s => s.setScrollTop);
  const scrollRef = useCallback((node: HTMLDivElement | null) => {
    if (node) {
      node.scrollTop = useLBPFormsListStore.getState().scrollTop;
    }
  }, []);

  if (planLoading || deptPlansLoading) {
    return (
      <div className="h-full min-h-0 overflow-y-auto p-6">
        <div className="mb-5">
          <Skeleton className="h-3 w-40 mb-2 rounded" />
          <Skeleton className="h-6 w-52 rounded" />
        </div>
        <div className="flex flex-wrap items-center gap-2.5 mb-5">
          <Skeleton className="h-9 flex-1 min-w-[220px] max-w-sm rounded-md" />
          <Skeleton className="h-9 w-16 rounded-full" />
          <Skeleton className="h-9 w-20 rounded-full" />
          <Skeleton className="h-9 w-28 rounded-full" />
          <Skeleton className="h-9 w-24 rounded-full" />
          <Skeleton className="h-9 w-[180px] rounded-md" />
        </div>
        <Skeleton className="h-3 w-40 mb-2.5 rounded" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <DeptCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }
  if (!activePlan) {
    return (
      <div className="p-6 flex items-center justify-center h-full">
        <p className="text-center text-gray-400 text-sm">
          No active budget plan found. Please activate one in Budget Plans.
        </p>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={e => setScrollTop(e.currentTarget.scrollTop)}
      className="h-full min-h-0 overflow-y-auto p-6"
    >
      {/* ── Header ── */}
      <div className="mb-5">
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-0.5">
          Budget Proposals Review
        </p>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight">
          Budget Year {activePlan.year}
        </h1>
      </div>

      {/* ── Search + filters ── */}
      <div className="flex flex-wrap items-center gap-2.5 mb-5">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            placeholder="Search by department or abbreviation…"
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            className="pl-9 h-9 text-sm border-gray-200 bg-white"
          />
        </div>

        <div className="flex items-center rounded-lg border border-gray-200 bg-white p-0.5">
          {(['all', 'draft', 'submitted', 'under_review', 'approved'] as const).map(s => {
            const labels: Record<string, string> = {
              all: 'All', draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved',
            };
            const active = statusFilter === s;
            const count = s === 'all' ? null : statusCounts[s] ?? 0;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5',
                  active ? 'bg-gray-900 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-50',
                )}
              >
                {labels[s]}
                {count !== null && (
                  <span className={cn(
                    'text-[10px] font-semibold px-1.5 py-0.5 rounded-full leading-none',
                    active ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500',
                  )}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {deptCategories.length > 0 && (
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-9 text-xs border-gray-200 bg-white w-[180px]">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {deptCategories.map(cat => (
                <SelectItem key={cat} value={cat} className="text-xs">{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      {/* ── Grouped cards ── */}
      {filteredPlans.length === 0 ? (
        <p className="text-center text-sm text-gray-400 py-16">No departments found.</p>
      ) : (
        (() => {
          let cardIdx = 0;
          let groupIdx = 0;
          return groupedPlans.map(group => {
            const headerDelay = Math.min(groupIdx++ * 60, 240);
            return (
          <div key={group.categoryName} className="mb-7 last:mb-0">
            <p
              className={cn('text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5', !hasAnimatedRef.current && '_headerAnim')}
              style={!hasAnimatedRef.current ? { opacity: 0, animation: `_headerIn 380ms cubic-bezier(0.16,1,0.3,1) ${headerDelay}ms both` } : undefined}
            >
              {group.categoryName}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.plans.map(plan => {
                // Tighter stagger step + lower cap: with many cards, a big
                // per-card delay makes the tail end feel like a separate,
                // late wave instead of one continuous reveal.
                const delay = Math.min(cardIdx++ * 35, 380);
                const cfg = getStatusCfg(plan.status);
                const proposed = proposedTotalByPlan.get(plan.dept_budget_plan_id) ?? 0;
                const past = pastTotalByDeptId.get(plan.dept_id) ?? 0;
                const diff = proposed - past;
                const pct = pctOf(past, diff);
                const hasComparison = past > 0;

                const palette = getCategoryPalette(plan.department?.dept_category_id);

                return (
                  <button
                    key={plan.dept_budget_plan_id}
                    onClick={() => navigate(`/admin/lbp-forms/${plan.dept_budget_plan_id}`)}
                    className={cn(
                      '_cardAnim appearance-none text-left rounded-2xl border-2 border-gray-200 outline-none shadow-none ring-0 transition-all duration-200 ease-out overflow-hidden',
                      'hover:scale-[1.035]',
                      palette.hoverBorder,
                      'flex flex-col bg-white',
                    )}
                    style={
                      hasAnimatedRef.current
                        ? { boxShadow: 'none', WebkitAppearance: 'none', MozAppearance: 'none' }
                        : {
                            opacity: 0,
                            animation: `_cardIn 420ms cubic-bezier(0.16,1,0.3,1) ${delay}ms both`,
                            boxShadow: 'none',
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                          }
                    }
                  >
                    <div className="flex flex-col gap-5 px-6 pt-6 pb-5">
                      {/* Top row — logo + status */}
                      <div className="flex items-start justify-between gap-2">
                        <DeptLogo
                          logo={plan.dept_logo}
                          abbreviation={plan.dept_abbreviation}
                          name={plan.dept_name}
                          categoryId={plan.department?.dept_category_id}
                        />
                        <Badge variant="outline" className={cn('gap-1.5 font-medium', cfg.badge)}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </Badge>
                      </div>

                      {/* Title */}
                      <div>
                        <p className="text-[13px] truncate mb-1 tracking-tight text-gray-500">
                          {plan.dept_name}
                        </p>
                        <p className="text-[19px] font-semibold leading-tight tracking-tight truncate text-gray-900">
                          {plan.dept_abbreviation ? plan.dept_abbreviation.replace(/[()]/g, '').trim() : plan.dept_name}
                        </p>
                        {getCategoryName(plan) && (
                          <span className={cn(
                            'inline-flex items-center mt-2 px-2 py-0.5 rounded-full text-[11px] font-medium border',
                            getCategoryBadge(plan.department?.dept_category_id),
                          )}>
                            {getCategoryName(plan)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Proposed amount — white footer, amber accent */}
                    <CardContent className="px-6 py-5 bg-white border-t border-black/5 text-right">
                      <p className="text-[12px] mb-1 tracking-tight text-amber-600">
                        Proposed {activePlan.year}
                      </p>
                      <p className="text-[26px] font-semibold tracking-tight leading-tight truncate text-amber-600">
                        {proposed === 0 ? '–' : fmtP(proposed)}
                      </p>
                      {hasComparison && (
                        <p className={cn(
                          'text-[13px] mt-1 tracking-tight',
                          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400',
                        )}>
                          {diff >= 0 ? '↑ ' : '↓ '}{fmtP(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%) vs. current year
                        </p>
                      )}
                    </CardContent>
                  </button>
                );
              })}
            </div>
          </div>
            );
          });
        })()
      )}
    </div>
  );
};

export default LBPFormsList;
