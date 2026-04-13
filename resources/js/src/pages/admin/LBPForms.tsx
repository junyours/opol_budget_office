import React, { useEffect, useState, useMemo, useCallback } from 'react';
import API from '../../services/api';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { DepartmentBudgetPlan, ExpenseClassification, ExpenseItem } from '../../types/api';
import Form2 from '@/src/pages/department-head/Form2';
import Form3 from '@/src/pages/department-head/Form3';
import Form4 from '@/src/pages/department-head/Form4';
import { LoadingState } from '../common/LoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
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
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';

// ─── Panel entrance animation ─────────────────────────────────────────────────
const PANEL_CSS = `
@keyframes _panelIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  ._panelIn { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;
let _panelAnimInjected = false;
function ensurePanelAnim() {
  if (_panelAnimInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = PANEL_CSS;
  document.head.appendChild(el);
  _panelAnimInjected = true;
}

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { label: string; badge: string; dot: string; activeBadge: string }> = {
  draft: {
    label:       'Draft',
    badge:       'text-amber-700 bg-amber-50 border-amber-200',
    activeBadge: 'text-amber-300 bg-white/10 border-white/20',
    dot:         'bg-amber-400',
  },
  submitted: {
    label:       'Submitted',
    badge:       'text-blue-700 bg-blue-50 border-blue-200',
    activeBadge: 'text-blue-200 bg-white/10 border-white/20',
    dot:         'bg-blue-400',
  },
  approved: {
    label:       'Approved',
    badge:       'text-emerald-700 bg-emerald-50 border-emerald-200',
    activeBadge: 'text-emerald-200 bg-white/10 border-white/20',
    dot:         'bg-emerald-500',
  },
};
const getStatusCfg = (s: string) => STATUS_CFG[s] ?? STATUS_CFG.draft;

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeptPlanWithName extends DepartmentBudgetPlan {
  dept_name:         string;
  dept_abbreviation: string;
  dept_logo:         string | null;
}

// ─── Dept Avatar ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
];

function deptColorClass(deptId: number, active: boolean) {
  if (active) return 'bg-white/15 text-white';
  return AVATAR_COLORS[deptId % AVATAR_COLORS.length];
}

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL ?? '/storage';

function DeptAvatar({
  logo,
  abbreviation,
  name,
  deptId,
  active,
  size = 'md',
}: {
  logo: string | null;
  abbreviation: string;
  name: string;
  deptId: number;
  active: boolean;
  size?: 'sm' | 'md';
}) {
  const dim   = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const text  = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const label = abbreviation
    ? abbreviation.replace(/[()]/g, '').trim().slice(0, 4)
    : name.slice(0, 2).toUpperCase();

  if (logo) {
    return (
      <div className={cn(dim, 'rounded-lg overflow-hidden flex-shrink-0 border border-gray-200/60')}>
        <img
          src={`${STORAGE_URL}/${logo}`}
          alt={abbreviation || name}
          className="w-full h-full object-cover"
          onError={e => {
            (e.currentTarget.parentElement as HTMLElement).innerHTML =
              `<span class="${cn(dim, 'rounded-lg flex items-center justify-center font-bold', text, deptColorClass(deptId, active))}">${label}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      dim, 'rounded-lg flex items-center justify-center flex-shrink-0 font-bold transition-colors',
      text,
      deptColorClass(deptId, active),
    )}>
      {label}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const LBPForms: React.FC = () => {
  useEffect(() => { ensurePanelAnim(); }, []);
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const activePlanId = activePlan?.budget_plan_id;

  const [deptPlans,       setDeptPlans]       = useState<DeptPlanWithName[]>([]);
  const [classifications, setClassifications] = useState<ExpenseClassification[]>([]);
  const [expenseItems,    setExpenseItems]     = useState<ExpenseItem[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [selectedPlanId,  setSelectedPlanId]  = useState<number | null>(null);
  const [pastYearPlan,       setPastYearPlan]       = useState<DepartmentBudgetPlan | null>(null);
  const [obligationYearPlan, setObligationYearPlan] = useState<DepartmentBudgetPlan | null>(null);
  const [loadingPast,        setLoadingPast]        = useState(false);
  const [activeFormTab,   setActiveFormTab]   = useState('2');
  const [search,          setSearch]         = useState('');
  const [panelKey,        setPanelKey]       = useState(0);
  const [approveTarget,   setApproveTarget]  = useState<DeptPlanWithName | null>(null);
  const [rejectTarget,    setRejectTarget]   = useState<DeptPlanWithName | null>(null);
  const [acting,          setActing]         = useState(false);
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // ── Fetch all dept plans (sidebar list + classifications) ──────────────────
  const fetchAll = useCallback(async () => {
    if (!activePlanId) return;
    try {
      const [plansRes, classRes, itemsRes] = await Promise.all([
        API.get('/department-budget-plans', { params: { budget_plan_id: activePlanId } }),
        API.get('/expense-classifications'),
        API.get('/expense-class-items'),
      ]);

      const raw: DepartmentBudgetPlan[] = plansRes.data.data ?? [];
      const enriched: DeptPlanWithName[] = raw
        .map(p => ({
          ...p,
          dept_name:         p.department?.dept_name         ?? 'Unknown',
          dept_abbreviation: p.department?.dept_abbreviation ?? '',
          dept_logo:         p.department?.logo              ?? null,
        }))
        // .sort((a, b) => a.dept_name.localeCompare(b.dept_name));
        .sort((a, b) => a.dept_id - b.dept_id);

      setDeptPlans(enriched);
      setClassifications(classRes.data.data ?? []);
      setExpenseItems(itemsRes.data.data ?? []);

      if (!selectedPlanId && enriched.length > 0) {
        const firstSubmitted = enriched.find(p => p.status === 'submitted');
        setSelectedPlanId((firstSubmitted ?? enriched[0]).dept_budget_plan_id);
      }
    } catch {
      toast.error('Failed to load department plans.');
    } finally {
      setLoading(false);
    }
  }, [activePlanId, selectedPlanId]);

  useEffect(() => { if (activePlanId) fetchAll(); }, [activePlanId]);

  // ── Fetch past year plans for the selected department ─────────────────────
  // Extracted so it can be called independently (e.g. after an item update)
  // without triggering a full sidebar reload.
  const fetchPastPlans = useCallback(async (deptId: number) => {
    if (!activePlan) return;
    setLoadingPast(true);
    setPastYearPlan(null);
    setObligationYearPlan(null);
    try {
      const [pastResult, oblResult] = await Promise.allSettled([
        API.get(`/department-budget-plans/by-dept-year/${deptId}/${activePlan.year - 1}`),
        API.get(`/department-budget-plans/by-dept-year/${deptId}/${activePlan.year - 2}`),
      ]);
      setPastYearPlan(pastResult.status === 'fulfilled' ? pastResult.value.data.data : null);
      setObligationYearPlan(oblResult.status === 'fulfilled' ? oblResult.value.data.data : null);
    } finally {
      setLoadingPast(false);
    }
  }, [activePlan]);

  const selectedPlan = useMemo(
    () => deptPlans.find(p => p.dept_budget_plan_id === selectedPlanId) ?? null,
    [deptPlans, selectedPlanId]
  );

  // Re-fetch past plans whenever the selected department changes
  useEffect(() => {
    if (!selectedPlan || !activePlan) return;
    fetchPastPlans(selectedPlan.dept_id);
  }, [selectedPlanId]); // intentionally only on selectedPlanId to avoid loop

  const handleSelectPlan = (id: number) => {
    if (id === selectedPlanId) return;
    setSelectedPlanId(id);
    setPanelKey(k => k + 1);
  };

  // ── Called by Form2 when an item is saved ─────────────────────────────────
  // Refreshes BOTH the past year plans (so obligation amounts reappear)
  // AND the dept plans list (so status badges stay current).
  // Does NOT reset loadingPast so the form doesn't flash a skeleton.
  const handleItemUpdate = useCallback(async () => {
    if (!selectedPlan || !activePlan) return;

    // Silently refresh past year plans so updated obligation amounts appear
    // without wiping local Form2 state (Form2 handles its own optimistic update,
    // but we also need the props to reflect truth for the next render cycle).
    try {
      const [pastResult, oblResult] = await Promise.allSettled([
        API.get(`/department-budget-plans/by-dept-year/${selectedPlan.dept_id}/${activePlan.year - 1}`),
        API.get(`/department-budget-plans/by-dept-year/${selectedPlan.dept_id}/${activePlan.year - 2}`),
      ]);
      if (pastResult.status === 'fulfilled') setPastYearPlan(pastResult.value.data.data);
      if (oblResult.status === 'fulfilled') setObligationYearPlan(oblResult.value.data.data);
    } catch { /* silent */ }

    // Also refresh the sidebar list (non-blocking — don't await)
    fetchAll();
  }, [selectedPlan, activePlan, fetchAll]);

  // ── Actions ────────────────────────────────────────────────────────────────
  const handleApprove = async () => {
    if (!approveTarget) return;
    setActing(true);
    try {
      await API.post(`/department-budget-plans/${approveTarget.dept_budget_plan_id}/approve`);
      toast.success(`${approveTarget.dept_abbreviation} plan approved.`);
      setApproveTarget(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to approve.');
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActing(true);
    try {
      await API.post(`/department-budget-plans/${rejectTarget.dept_budget_plan_id}/reject`);
      toast.success(`${rejectTarget.dept_abbreviation} plan returned to draft.`);
      setRejectTarget(null);
      fetchAll();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to return to draft.');
    } finally { setActing(false); }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
//   const filteredPlans = useMemo(() => {
//     const q = search.toLowerCase();
//     if (!q) return deptPlans;
//     return deptPlans.filter(
//       p =>
//         p.dept_name.toLowerCase().includes(q) ||
//         p.dept_abbreviation.toLowerCase().includes(q)
//     );
//   }, [deptPlans, search]);

// Collect unique department categories (requires dept_category on your type — adjust field name as needed)
const deptCategories = useMemo(() => {
  const cats = deptPlans
    .map(p => p.department?.category?.dept_category_name ?? null)
    .filter((c): c is string => !!c);
  return Array.from(new Set(cats)).sort();
}, [deptPlans]);

const filteredPlans = useMemo(() => {
  const q = search.toLowerCase();
  return deptPlans.filter(p => {
    const matchSearch =
      !q ||
      p.dept_name.toLowerCase().includes(q) ||
      p.dept_abbreviation.toLowerCase().includes(q);

    const matchStatus =
      statusFilter === 'all' || p.status === statusFilter;

    const matchCategory =
      categoryFilter === 'all' ||
      (p.department?.category?.dept_category_name ?? '') === categoryFilter;

    return matchSearch && matchStatus && matchCategory;
  });
}, [deptPlans, search, statusFilter, categoryFilter]);

  const counts = useMemo(() => ({
    submitted: deptPlans.filter(p => p.status === 'submitted').length,
    approved:  deptPlans.filter(p => p.status === 'approved').length,
    draft:     deptPlans.filter(p => p.status === 'draft').length,
  }), [deptPlans]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (planLoading || loading) return <LoadingState />;
  if (!activePlan) return (
    <div className="p-6 flex items-center justify-center h-full">
      <p className="text-center text-gray-400 text-sm">
        No active budget plan found. Please activate one in Budget Plans.
      </p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 overflow-hidden w-full">

      {/* ══ LEFT RAIL ══ */}
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-gray-50/40 flex flex-col py-4 px-2 gap-0.5 overflow-y-auto">

        <div className="px-2.5 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-0.5">
            LBP Forms Review
          </p>
          <p className="text-[13px] font-semibold text-gray-800">FY {activePlan.year}</p>
        </div>

        {/* Summary pills */}
        <div className="px-2.5 mb-3 flex flex-wrap gap-1.5">
          {counts.submitted > 0 && (
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
              {counts.submitted} to review
            </span>
          )}
          {counts.approved > 0 && (
            <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              {counts.approved} approved
            </span>
          )}
          {counts.draft > 0 && (
            <span className="text-[10px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
              {counts.draft} draft
            </span>
          )}
        </div>

        {/* Search */}
        {/* Search */}
<div className="px-1 mb-2">
  <div className="relative">
    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    <Input
      placeholder="Search…"
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="pl-8 h-8 text-xs border-gray-200 bg-white"
    />
  </div>
</div>

{/* Status filter */}
<div className="px-1 mb-1">
  <p className="px-1.5 mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
    Status
  </p>
  <div className="flex flex-col gap-0.5">
    {(['all', 'draft', 'submitted', 'approved'] as const).map(s => {
      const labels: Record<string, string> = {
        all: 'All', draft: 'Draft', submitted: 'Submitted', approved: 'Approved',
      };
      const dots: Record<string, string> = {
        all: 'bg-gray-400', draft: 'bg-amber-400',
        submitted: 'bg-blue-400', approved: 'bg-emerald-500',
      };
      const active = statusFilter === s;
      return (
        <button
          key={s}
          onClick={() => setStatusFilter(s)}
          className={cn(
            'flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-all',
            active
              ? 'bg-gray-900 text-white font-medium'
              : 'text-gray-600 hover:bg-white/70 hover:text-gray-800',
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[s])} />
          {labels[s]}
          {s !== 'all' && (
            <span className={cn(
              'ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
              active
                ? 'text-gray-300 bg-white/10 border-white/20'
                : STATUS_CFG[s]?.badge ?? '',
            )}>
              {deptPlans.filter(p => p.status === s).length}
            </span>
          )}
        </button>
      );
    })}
  </div>
</div>

{/* Category filter — only shown if there are categories */}
{deptCategories.length > 0 && (
  <div className="px-1 mb-2">
    <p className="px-1.5 mb-1 mt-2 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
      Category
    </p>
    <div className="flex flex-col gap-0.5">
      {(['all', ...deptCategories]).map(cat => {
        const active = categoryFilter === cat;
        return (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat)}
            className={cn(
              'flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-all truncate',
              active
                ? 'bg-gray-900 text-white font-medium'
                : 'text-gray-600 hover:bg-white/70 hover:text-gray-800',
            )}
          >
            {cat === 'all' ? 'All Categories' : cat}
          </button>
        );
      })}
    </div>
  </div>
)}

{/* Divider before list */}
<div className="border-t border-gray-100 mx-2 mb-2" />

        {/* Department list */}
        {filteredPlans.length === 0 ? (
          <p className="px-2.5 py-6 text-xs text-gray-400 text-center">No departments found.</p>
        ) : (
          filteredPlans.map(plan => {
            const cfg    = getStatusCfg(plan.status);
            const active = plan.dept_budget_plan_id === selectedPlanId;

            return (
              <button
                key={plan.dept_budget_plan_id}
                onClick={() => handleSelectPlan(plan.dept_budget_plan_id)}
                className={cn(
                  'group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-left transition-all',
                  active
                    ? 'bg-gray-900 shadow-sm border border-gray-800 text-white'
                    : 'text-gray-600 hover:bg-white/70 hover:text-gray-800 border border-transparent',
                )}
              >
                <DeptAvatar
                  logo={plan.dept_logo}
                  abbreviation={plan.dept_abbreviation}
                  name={plan.dept_name}
                  deptId={plan.dept_id}
                  active={active}
                  size="sm"
                />

                <div className="flex-1 min-w-0">
                  <span className={cn(
                    'text-[12px] font-medium leading-tight block truncate',
                    active ? 'text-white' : 'text-gray-800',
                  )}>
                    {plan.dept_abbreviation
                      ? plan.dept_abbreviation.replace(/[()]/g, '').trim()
                      : plan.dept_name}
                  </span>
                  {active && (
                    <span className={cn(
                      'text-[10px] leading-tight block truncate mt-0.5',
                      active ? 'text-gray-300' : 'text-gray-400',
                    )}>
                      {plan.dept_name}
                    </span>
                  )}
                </div>

                <span className={cn(
                  'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                  active ? cfg.activeBadge : cfg.badge,
                )}>
                  {cfg.label}
                </span>
              </button>
            );
          })
        )}
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 min-w-0 w-0 flex flex-col overflow-hidden bg-gray-50/20">
        {!selectedPlan ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a department to review their forms.
          </div>
        ) : (
          <div
            key={panelKey}
            className="flex-1 flex flex-col overflow-hidden"
            style={{ animation: '_panelIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            {/* Plan header */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <DeptAvatar
                  logo={selectedPlan.dept_logo}
                  abbreviation={selectedPlan.dept_abbreviation}
                  name={selectedPlan.dept_name}
                  deptId={selectedPlan.dept_id}
                  active={false}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-900 leading-tight truncate">
                    {selectedPlan.dept_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const cfg = getStatusCfg(selectedPlan.status);
                      return (
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          cfg.badge,
                        )}>
                          <span className={cn('w-1 h-1 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    <span className="text-[11px] text-gray-400">FY {activePlan.year}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {selectedPlan.status === 'submitted' && (
                  <>
                    <Button size="sm" variant="outline"
                      onClick={() => setRejectTarget(selectedPlan)}
                      className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
                      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                      Return to Draft
                    </Button>
                    <Button size="sm"
                      onClick={() => setApproveTarget(selectedPlan)}
                      className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
                      <CheckCircleIcon className="w-3.5 h-3.5" />
                      Approve
                    </Button>
                  </>
                )}
                {selectedPlan.status === 'approved' && (
                  <Button size="sm" variant="outline"
                    onClick={() => setRejectTarget(selectedPlan)}
                    className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600">
                    <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
                    Return to Draft
                  </Button>
                )}
              </div>
            </div>

            {/* Forms area */}
            <div className="flex-1 overflow-y-auto px-6 py-5">
              {loadingPast ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-72 rounded-lg" />
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
              ) : (
                <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
                  <TabsList className="h-9 bg-white border border-gray-200 rounded-lg p-1 inline-flex gap-0.5 mb-4">
                    <TabsTrigger value="2" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-gray-900 data-[state=active]:text-white text-gray-500">
                      Form 2 — Expenditures
                    </TabsTrigger>
                    <TabsTrigger value="3" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-gray-900 data-[state=active]:text-white text-gray-500">
                      Form 3 — Personnel
                    </TabsTrigger>
                    <TabsTrigger value="4" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-gray-900 data-[state=active]:text-white text-gray-500">
                      Form 4 — AIP Programs
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="2">
                    <Form2
                      plan={selectedPlan}
                      pastYearPlan={pastYearPlan}
                      obligationYearPlan={obligationYearPlan}
                      classifications={classifications}
                      expenseItems={expenseItems}
                      isEditable={isAdmin}
                      isAdmin={isAdmin}
                      onItemUpdate={handleItemUpdate}
                    />
                  </TabsContent>
                  <TabsContent value="3">
                    <Form3
                      plan={selectedPlan}
                      pastYearPlan={pastYearPlan}
                      departmentId={selectedPlan.dept_id}
                      isEditable={isAdmin}
                      isAdmin={isAdmin}
                    />
                  </TabsContent>
                  <TabsContent value="4">
                    <Form4 plan={selectedPlan} isEditable={isAdmin} />
                  </TabsContent>
                </Tabs>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════ APPROVE CONFIRM ════ */}
      <AlertDialog open={!!approveTarget} onOpenChange={o => { if (!o) setApproveTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Approve {approveTarget?.dept_abbreviation}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              This will mark the budget plan for{' '}
              <span className="font-medium text-gray-700">{approveTarget?.dept_name}</span> as
              approved. The department head will not be able to edit it further.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={acting}>
                {acting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Approving…</> : 'Approve'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════ RETURN TO DRAFT CONFIRM ════ */}
      <AlertDialog open={!!rejectTarget} onOpenChange={o => { if (!o) setRejectTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Return to draft?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              The budget plan for{' '}
              <span className="font-medium text-gray-700">{rejectTarget?.dept_name}</span> will be
              returned to draft so the department head can revise and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={handleReject} disabled={acting}>
                {acting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Returning…</> : 'Return to Draft'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LBPForms;
