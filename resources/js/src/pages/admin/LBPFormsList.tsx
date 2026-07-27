import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import API from '../../services/api';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { DepartmentBudgetPlan } from '../../types/api';
import { LoadingState } from '../../components/states/LoadingState';
import { Input } from '@/src/components/ui/input';
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

const CATEGORY_BG: Record<number, string> = {
  1: 'bg-cat-1/5',
  2: 'bg-cat-2/5',
  3: 'bg-cat-3/5',
  4: 'bg-cat-4/5',
};
const getCategoryBg = (id: number | undefined) =>
  CATEGORY_BG[id ?? 0] ?? 'bg-gray-50';

const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700', 'bg-violet-100 text-violet-700', 'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700', 'bg-rose-100 text-rose-700', 'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700', 'bg-pink-100 text-pink-700', 'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
];
const avatarColor = (deptId: number) => AVATAR_COLORS[deptId % AVATAR_COLORS.length];

// ─── Stagger animation (injected once) ─────────────────────────────────────
const CARD_ANIM_CSS = `
@keyframes _cardIn {
  from { opacity: 0; transform: translateY(8px) scale(0.98); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
@media (prefers-reduced-motion: reduce) {
  ._cardAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
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

function DeptLogo({ logo, abbreviation, name, deptId }: {
  logo: string | null; abbreviation: string; name: string; deptId: number;
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
    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center font-bold text-[12px] flex-shrink-0', avatarColor(deptId))}>
      {label}
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

  // ── Search (debounced) + filters ────────────────────────────────────────────
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 300);
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');

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

  if (planLoading || deptPlansLoading) return <LoadingState />;
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
    <div className="h-full min-h-0 overflow-y-auto p-6">
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

        <div className="flex flex-wrap gap-1.5">
          {(['all', 'draft', 'submitted', 'under_review', 'approved'] as const).map(s => {
            const labels: Record<string, string> = {
              all: 'All', draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved',
            };
            const active = statusFilter === s;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'text-xs font-medium px-3 py-1.5 rounded-full border transition-colors',
                  active ? 'bg-gray-900 border-gray-900 text-white' : 'border-gray-200 text-gray-600 bg-white hover:bg-gray-50',
                )}
              >
                {labels[s]}
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
          return groupedPlans.map(group => (
          <div key={group.categoryName} className="mb-7 last:mb-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-gray-400 mb-2.5">
              {group.categoryName}
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
              {group.plans.map(plan => {
                const delay = Math.min(cardIdx++ * 45, 500);
                const cfg = getStatusCfg(plan.status);
                const proposed = proposedTotalByPlan.get(plan.dept_budget_plan_id) ?? 0;
                const past = pastTotalByDeptId.get(plan.dept_id) ?? 0;
                const diff = proposed - past;
                const pct = pctOf(past, diff);
                const hasComparison = past > 0;

                const catBg = getCategoryBg(plan.department?.dept_category_id);

                return (
                  <button
                    key={plan.dept_budget_plan_id}
                    onClick={() => navigate(`/admin/lbp-forms/${plan.dept_budget_plan_id}`)}
                    className="_cardAnim text-left bg-white rounded-2xl border border-gray-200/70 p-6 transition-all hover:border-gray-300 hover:shadow-[0_2px_20px_rgba(0,0,0,0.06)] flex flex-col gap-5"
                    style={{
                      opacity: 0,
                      animation: `_cardIn 300ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
                    }}
                  >
                    {/* Top row — logo + status */}
                    <div className="flex items-start justify-between gap-2">
                      <DeptLogo
                        logo={plan.dept_logo}
                        abbreviation={plan.dept_abbreviation}
                        name={plan.dept_name}
                        deptId={plan.dept_id}
                      />
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-gray-400">
                        <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                        {cfg.label}
                      </span>
                    </div>

                    {/* Title */}
                    <div>
                      <p className="text-[13px] text-gray-400 truncate mb-1 tracking-tight">
                        {plan.dept_name}
                      </p>
                      <p className="text-[19px] font-semibold text-gray-900 leading-tight tracking-tight truncate">
                        {plan.dept_abbreviation ? plan.dept_abbreviation.replace(/[()]/g, '').trim() : plan.dept_name}
                      </p>
                      {getCategoryName(plan) && (
                        <p className="text-[12px] text-gray-400 mt-1 tracking-tight">
                          {getCategoryName(plan)}
                        </p>
                      )}
                    </div>

                    {/* Proposed amount — the single focal point */}
                    <div className="pt-5 border-t border-gray-100">
                      <p className="text-[12px] text-gray-400 mb-1 tracking-tight">
                        Proposed {activePlan.year}
                      </p>
                      <p className="text-[26px] font-semibold text-gray-900 tracking-tight leading-tight truncate">
                        {proposed === 0 ? '–' : fmtP(proposed)}
                      </p>
                      {hasComparison && (
                        <p className={cn(
                          'text-[13px] mt-1 tracking-tight',
                          diff > 0 ? 'text-emerald-600' : diff < 0 ? 'text-red-500' : 'text-gray-400',
                        )}>
                          {diff >= 0 ? '↑ ' : '↓ '}{fmtP(Math.abs(diff))} ({Math.abs(pct).toFixed(1)}%) vs. last year
                        </p>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ));
        })()
      )}
    </div>
  );
};

export default LBPFormsList;
