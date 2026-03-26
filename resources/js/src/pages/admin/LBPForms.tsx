import React, { useEffect, useState, useMemo } from 'react';
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
// Shows the department logo if available, otherwise shows the abbreviation
// (or first 2 chars of name) as a coloured monogram — same as Settings icon tiles.

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
            // Fall back to monogram if image fails to load
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
  const [pastYearPlan,    setPastYearPlan]    = useState<DepartmentBudgetPlan | null>(null);
  const [loadingPast,     setLoadingPast]     = useState(false);
  const [activeFormTab,   setActiveFormTab]   = useState('2');
  const [search,          setSearch]         = useState('');
  const [panelKey,        setPanelKey]       = useState(0);
  const [approveTarget,   setApproveTarget]  = useState<DeptPlanWithName | null>(null);
  const [rejectTarget,    setRejectTarget]   = useState<DeptPlanWithName | null>(null);
  const [acting,          setActing]         = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  useEffect(() => { if (activePlanId) fetchAll(); }, [activePlanId]);

  const fetchAll = async () => {
    setLoading(true);
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
        .sort((a, b) => a.dept_name.localeCompare(b.dept_name));

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
  };

  const handleSelectPlan = (id: number) => {
    if (id === selectedPlanId) return;
    setSelectedPlanId(id);
    setPanelKey(k => k + 1);
  };

  // ── Past year plan ─────────────────────────────────────────────────────────
  const selectedPlan = useMemo(
    () => deptPlans.find(p => p.dept_budget_plan_id === selectedPlanId) ?? null,
    [deptPlans, selectedPlanId]
  );

  useEffect(() => {
    if (!selectedPlan || !activePlan) return;
    setLoadingPast(true);
    setPastYearPlan(null);
    API.get(`/department-budget-plans/by-dept-year/${selectedPlan.dept_id}/${activePlan.year - 1}`)
      .then(res => setPastYearPlan(res.data.data))
      .catch(() => setPastYearPlan(null))
      .finally(() => setLoadingPast(false));
  }, [selectedPlanId]);

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
  const filteredPlans = useMemo(() => {
    const q = search.toLowerCase();
    if (!q) return deptPlans;
    return deptPlans.filter(
      p =>
        p.dept_name.toLowerCase().includes(q) ||
        p.dept_abbreviation.toLowerCase().includes(q)
    );
  }, [deptPlans, search]);

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

      {/* ══ LEFT RAIL — matches Settings/PlansPage style ══ */}
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-gray-50/40 flex flex-col py-4 px-2 gap-0.5 overflow-y-auto">

        {/* Section label + year */}
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
                {/* Logo or abbreviation avatar */}
                <DeptAvatar
                  logo={plan.dept_logo}
                  abbreviation={plan.dept_abbreviation}
                  name={plan.dept_name}
                  deptId={plan.dept_id}
                  active={active}
                  size="sm"
                />

                {/* Name + status */}
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

                {/* Status badge */}
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
                {/* Larger avatar in the header */}
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
                      classifications={classifications}
                      expenseItems={expenseItems}
                      isEditable={isAdmin}
                      isAdmin={isAdmin}
                      onItemUpdate={fetchAll}
                    />
                  </TabsContent>
                  <TabsContent value="3">
                    <Form3
                      plan={selectedPlan}
                      pastYearPlan={pastYearPlan}
                      departmentId={selectedPlan.dept_id}
                      isEditable={false}
                    />
                  </TabsContent>
                  <TabsContent value="4">
                    <Form4 plan={selectedPlan} isEditable={false} />
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