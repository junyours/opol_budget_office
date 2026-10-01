import React, { useEffect, useState, useMemo } from "react";
import API from "../../services/api";
import { BudgetPlan } from "../../types/api";
import { LoadingState } from "../../components/states/LoadingState";
import { Button } from "../../components/ui/button";
// import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import { PlusIcon, ExclamationCircleIcon, CalendarDaysIcon } from "@heroicons/react/24/outline";
// import { useQueryClient } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { useAuth } from "../../hooks/useAuth";
import { Card as ShadcnCard } from "../../components/ui/card";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";

const PER_PAGE = 10;


// ─── Extended type ────────────────────────────────────────────────────────────

interface BudgetPlanWithOpen extends BudgetPlan {
  is_open: boolean;
}

interface DraftDept {
  dept_budget_plan_id: number;
  dept_name: string;
  dept_abbreviation: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

const BudgetPlanList: React.FC = () => {
//   const [plans, setPlans]     = useState<BudgetPlanWithOpen[]>([]);
//   const [loading, setLoading] = useState(true);
const { data: plans = [], isLoading: loading, refetch: refetchPlans } = useQuery<BudgetPlanWithOpen[]>({
  // Distinct key: ['budget-plans'] is shared with lean consumers (Dashboard, charts)
  // that cache only budget_plan_id/year/is_active — reusing it here dropped
  // created_at / is_open / department_plans. The prefix is unchanged, so existing
  // invalidateQueries({ queryKey: ['budget-plans'] }) calls still refresh this query.
  queryKey: ['budget-plans', 'admin-list'],
  queryFn: () =>
    API.get('/budget-plans', { params: { with_department_plans: 1 } })
      .then(r => r.data.data as BudgetPlanWithOpen[]),
  select: (data) => [...data].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    return b.year - a.year;
  }),
});

  // ── Create dialog ──────────────────────────────────────────────────────────
  const CURRENT_YEAR = new Date().getFullYear();
  const MIN_YEAR = CURRENT_YEAR - 1;
  const MAX_YEAR = CURRENT_YEAR + 10;

  const [createOpen, setCreateOpen]   = useState(false);
  const [newYear, setNewYear]         = useState<number | "">(CURRENT_YEAR + 1);
  const [newActive, setNewActive]     = useState(true);
  const [creating, setCreating]       = useState(false);

  // Only years in range AND not already used are selectable — removes the
  // error class entirely instead of validating free text after the fact.
  const usedYears = useMemo(() => new Set(plans.map(p => p.year)), [plans]);

  const availableYears = useMemo(() => {
    const years: number[] = [];
    for (let y = MIN_YEAR; y <= MAX_YEAR; y++) {
      if (!usedYears.has(y)) years.push(y);
    }
    return years;
  }, [usedYears, MIN_YEAR, MAX_YEAR]);

  const yearError = newYear === "" ? "Fiscal year is required." : null;

  const openCreateDialog = () => {
    // Default to the first available year at/after next year, falling back
    // to the first available year at all (e.g. if next year is already used).
    const preferred = availableYears.find(y => y >= CURRENT_YEAR + 1) ?? availableYears[0] ?? "";
    setNewYear(preferred);
    setNewActive(true);
    setCreateOpen(true);
  };

  // ── Edit status dialog ─────────────────────────────────────────────────────
  const [editPlan, setEditPlan]       = useState<BudgetPlanWithOpen | null>(null);
  const [editActive, setEditActive]   = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [saving, setSaving]           = useState(false);

  // ── Activate confirm ───────────────────────────────────────────────────────
  const [activateTarget, setActivateTarget] = useState<BudgetPlanWithOpen | null>(null);

  // ── Close submissions ──────────────────────────────────────────────────────
  const [closeTarget, setCloseTarget]     = useState<BudgetPlanWithOpen | null>(null);
  const [draftDepts, setDraftDepts]       = useState<DraftDept[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [closingPlan, setClosingPlan]     = useState(false);

  const queryClient = useQueryClient();

  const { user } = useAuth();
    const isViewer = user?.role === 'viewer';

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const totalPages   = Math.max(1, Math.ceil(plans.length / PER_PAGE));
  const paginated     = plans.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

//   const invalidateActivePlanDependents = () => {
//   queryClient.invalidateQueries({ queryKey: ['budget-plan-active'] });
//   queryClient.invalidateQueries({ queryKey: ['budget-plans'] });
//   queryClient.invalidateQueries({ queryKey: ['dept-budget-plans'] });
//   queryClient.invalidateQueries({ queryKey: ['dept-budget-plans-all'] });
//   queryClient.invalidateQueries({ queryKey: ['income-funds-all'] });
//   queryClient.invalidateQueries({ queryKey: ['income-fund'] });
//   queryClient.invalidateQueries({ queryKey: ['dept-expenditures'] });
//   queryClient.invalidateQueries({ queryKey: ['special-account-exp'] });
//   queryClient.invalidateQueries({ queryKey: ['mdf-fund'] });
//   queryClient.invalidateQueries({ queryKey: ['ldrrmf-summary'] });
//   // nuclear option — invalidate everything if still stale
//   queryClient.invalidateQueries({ queryKey: ['budget-totals'] });
// };
const invalidateActivePlanDependents = () => {
  // Wipe the entire cache — active plan change affects everything.
  // refetchOnMount: false means wiped queries only re-fetch when
  // the user actually visits that page, not all at once.
  queryClient.clear();
};

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchPlans = () => refetchPlans();

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (newYear === "") return;
    setCreating(true);
    try {
    //   const res     = await API.post("/budget-plans", { year: newYear, is_active: newActive });
    const res     = await API.post("/budget-plans", { year: newYear, is_active: newActive, is_open: false });
      const created = res.data.data;
      const deptCount = created.department_plans?.length ?? 0;
    //   toast.success(`Budget plan ${created.year} created — ${deptCount} department plan${deptCount !== 1 ? "s" : ""} initialized.`);
    //   setCreateOpen(false);
    //   setNewYear(new Date().getFullYear() + 1);
    //   setNewActive(false);
    //   fetchPlans();
    toast.success(`Budget plan ${created.year} created — ${deptCount} department plan${deptCount !== 1 ? "s" : ""} initialized.`);
      setCreateOpen(false);
      setNewYear(CURRENT_YEAR + 1);
      setNewActive(false);
      invalidateActivePlanDependents();
      fetchPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to create budget plan.");
    } finally {
      setCreating(false);
    }
  };

  // ── Edit active status ─────────────────────────────────────────────────────

  const openEdit = (plan: BudgetPlanWithOpen) => {
    setEditPlan(plan);
    setEditActive(plan.is_active);
    setEditOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editPlan) return;

    if (editActive && !editPlan.is_active) {
      const hasActive = plans.some(p => p.is_active && p.budget_plan_id !== editPlan.budget_plan_id);
      if (hasActive) { setEditOpen(false); setActivateTarget(editPlan); return; }
      await doActivate(editPlan.budget_plan_id);
      setEditOpen(false);
      return;
    }

    if (!editActive && editPlan.is_active) {
      setSaving(true);
      try {
        await API.put(`/budget-plans/${editPlan.budget_plan_id}`, { is_active: false });
        toast.success("Budget plan deactivated.");
        invalidateActivePlanDependents();
        setEditOpen(false);
        fetchPlans();
      } catch {
        toast.error("Failed to update.");
      } finally {
        setSaving(false);
      }
      return;
    }

    setEditOpen(false);
  };

  // ── Activate ───────────────────────────────────────────────────────────────

  const doActivate = async (planId: number) => {
    setSaving(true);
    try {
      await API.post(`/budget-plans/${planId}/activate`);
      toast.success("Budget plan activated.");
      invalidateActivePlanDependents();
      fetchPlans();
    } catch {
      toast.error("Failed to activate.");
    } finally {
      setSaving(false);
      setActivateTarget(null);
    }
  };

  // ── is_open toggle ─────────────────────────────────────────────────────────

  const handleToggleOpen = async (plan: BudgetPlanWithOpen) => {
    if (!plan.is_open) {
      try {
        await API.put(`/budget-plans/${plan.budget_plan_id}`, { is_open: true });
        toast.success("Submissions reopened.");
        fetchPlans();
      } catch {
        toast.error("Failed to reopen submissions.");
      }
      return;
    }

    setLoadingDrafts(true);
    setCloseTarget(plan);
    try {
      const res = await API.get(`/budget-plans/${plan.budget_plan_id}/draft-departments`);
      setDraftDepts(res.data.data ?? []);
    } catch {
      setDraftDepts([]);
    } finally {
      setLoadingDrafts(false);
    }
  };

  const confirmClose = async () => {
    if (!closeTarget) return;
    setClosingPlan(true);
    try {
      const res       = await API.post(`/budget-plans/${closeTarget.budget_plan_id}/close`);
      const autoCount = res.data.data?.auto_submitted?.length ?? 0;
      toast.success(
        autoCount > 0
          ? `Submissions closed. ${autoCount} draft plan${autoCount > 1 ? "s" : ""} auto-submitted.`
          : "Submissions closed."
      );
      setCloseTarget(null);
      setDraftDepts([]);
      fetchPlans();
    } catch {
      toast.error("Failed to close submissions.");
    } finally {
      setClosingPlan(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;

  return (
    <div className="p-6">

      {/* ── Page Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-eyebrow">
            Budget Administration
          </span>
          <h1 className="text-page-title">
            Budget Plans
          </h1>
          <p className="text-subtitle mt-1">
            Manage annual budget plans and department submission windows.
          </p>
        </div>
        {/* <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New Budget Plan
        </Button> */}
        {!isViewer && (
  <Button
    size="sm"
    onClick={openCreateDialog}
    className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg"
  >
    <PlusIcon className="w-3.5 h-3.5" />
    New Budget Plan
  </Button>
)}
      </div>

      {/* ── Table ── */}
       <ShadcnCard className="rounded-lg shadow-sm overflow-hidden">
        {plans.length === 0 ? (
          <div className="text-center py-14 text-muted-foreground text-sm">
            No budget plans yet.{" "}
            <button
              onClick={openCreateDialog}
              className="text-foreground/70 underline underline-offset-2 font-medium hover:text-foreground"
            >
              Create the first one
            </button>
          </div>
        ) : (
          <>
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                {/* {["Year", "Status", "Submissions", "Dept. Plans", "Created"].map((h, i) => ( */}
                {["Year", "Status", ...(!isViewer ? ["Submissions"] : []), "Department Plans", "Created"].map((h, i) => (
                  <th
                    key={i}
                    className="border-b border-border bg-card px-4 py-2.5 text-left text-table-header"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginated.map(plan => {
                const deptCount = (plan as any).department_plans?.length ?? "–";
                return (
                //   <tr
                //     key={plan.budget_plan_id}
                //     onClick={() => openEdit(plan)}
                //     className={cn(
                //       "hover:bg-gray-50/80 transition-colors cursor-pointer select-none",
                //       plan.is_active && "bg-emerald-50/30"
                //     )}
                //   >
                <tr
  key={plan.budget_plan_id}
  onClick={() => !isViewer && openEdit(plan)}
  className={cn(
    !isViewer && "hover:bg-muted/50 cursor-pointer select-none",
    plan.is_active && "bg-emerald-50/30",
    "transition-colors"
  )}
>
                    {/* Year */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-table-primary tabular-nums">{plan.year}</span>
                        {plan.is_active && (
                          <span className="text-badge bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                            Active
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Active status */}
                    <td className="px-4 py-3">
                      {plan.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-table-header text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-table-secondary">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-300 inline-block" />
                          Inactive
                        </span>
                      )}
                    </td>

                    {/* is_open toggle — stop propagation so row click doesn't fire */}
                    {/* <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={plan.is_open}
                          onCheckedChange={() => handleToggleOpen(plan)}
                          disabled={!plan.is_active}
                          className="data-[state=checked]:bg-blue-600"
                        />
                        <span className={cn(
                          "text-[11px] font-medium",
                          plan.is_open ? "text-blue-600" : "text-gray-400"
                        )}>
                          {plan.is_open ? "Open" : "Closed"}
                        </span>
                      </div>
                      {!plan.is_active && (
                        <span className="text-[10px] text-gray-300 mt-0.5 block">Active plan only</span>
                      )}
                    </td> */}
                    {!isViewer && (
  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
    <div className="flex items-center gap-2">
      <Switch
        checked={plan.is_open}
        onCheckedChange={() => handleToggleOpen(plan)}
        disabled={!plan.is_active}
        className="data-[state=checked]:bg-blue-600"
      />
      <span className={cn("text-table-secondary font-medium", plan.is_open ? "text-blue-600" : "")}>
        {plan.is_open ? "Open" : "Closed"}
      </span>
    </div>
    {!plan.is_active && (
      <span className="text-meta mt-0.5 block">Active plan only</span>
    )}
  </td>
)}

                    {/* Dept count */}
                    <td className="px-4 py-3 text-table-number">{deptCount}</td>

                    {/* Created */}
                    <td className="px-4 py-3 text-table-secondary">
                      {plan.created_at && !isNaN(new Date(plan.created_at).getTime())
                        ? new Date(plan.created_at).toLocaleDateString("en-PH", {
                            year: "numeric", month: "short", day: "numeric",
                          })
                        : "–"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border flex items-center justify-between flex-wrap gap-2">
            {!isViewer ? (
              <p className="text-meta italic">Click a row to edit the plan status</p>
            ) : <span />}
            {totalPages > 1 && (
              <div className="flex items-center gap-3">
                <p className="text-meta">
                  Showing{" "}
                  <span className="font-medium text-foreground/70">
                    {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, plans.length)}
                  </span>{" "}
                  of <span className="font-medium text-foreground/70">{plans.length}</span>
                </p>
                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === 1 && "pointer-events-none opacity-40")}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis className="h-7 w-7 text-[11px]" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={page === p}
                            className={cn(
                              "h-7 w-7 text-[11px] rounded-md cursor-pointer",
                              page === p ? "bg-primary text-primary-foreground hover:bg-primary/90 border-primary" : "text-foreground/70 hover:bg-muted"
                            )}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === totalPages && "pointer-events-none opacity-40")}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </div>
          </>
        )}
      </ShadcnCard>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          Only one plan can be active at a time
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded bg-blue-100 border border-blue-300 inline-block" />
          "Open" allows dept heads to submit plans; "Closed" locks submissions
        </span>
      </div>

      {/* ════════ CREATE DIALOG ════════ */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!creating) setCreateOpen(open); }}>
        <DialogContent className="max-w-sm rounded-2xl border-border gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b border-muted">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <CalendarDaysIcon className="w-4 h-4 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-section-title">New Budget Plan</DialogTitle>
                <DialogDescription className="text-subtitle mt-0.5">
                  Department plans for all departments will be auto-initialized.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-field-label">
                Fiscal Year <span className="text-destructive">*</span>
              </Label>
              {availableYears.length === 0 ? (
                <p className="flex items-center gap-1.5 text-xs text-destructive">
                  <ExclamationCircleIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  No years available in the {MIN_YEAR}–{MAX_YEAR} range — all are already used.
                </p>
              ) : (
                <>
                  <Select
                    value={newYear === "" ? undefined : String(newYear)}
                    onValueChange={v => setNewYear(parseInt(v, 10))}
                  >
                    <SelectTrigger className="h-10 text-sm font-mono tabular-nums">
                      <SelectValue placeholder="Select a year" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableYears.map(y => (
                        <SelectItem key={y} value={String(y)} className="font-mono tabular-nums">
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-meta">Only unused years are shown.</p>
                </>
              )}
            </div>

            <div className="flex items-center justify-between py-1 border-t border-muted pt-4">
              <div>
                <p className="text-field-label">Set as Active</p>
                <p className="text-meta mt-0.5">Will deactivate the current active plan</p>
              </div>
              <Switch checked={newActive} onCheckedChange={setNewActive} />
            </div>

            {newActive && plans.some(p => p.is_active) && (
              <div className="flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <ExclamationCircleIcon className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-table-secondary text-amber-700 font-medium">
                  Budget Plan Year {plans.find(p => p.is_active)?.year} will be deactivated.
                </p>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-muted gap-2">
            <Button
              variant="outline" size="sm"
              className="h-8 text-xs border-border"
              onClick={() => setCreateOpen(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
              onClick={handleCreate}
              disabled={creating || !!yearError || availableYears.length === 0}
            >
              {creating
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</>
                : "Create Plan"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ EDIT STATUS DIALOG ════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-border gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-muted">
            <DialogTitle className="text-section-title">Edit Budget Plan</DialogTitle>
            <DialogDescription className="text-subtitle mt-0.5">
              Budget Plan Year {editPlan?.year}
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-field-label">Active</p>
                <p className="text-meta mt-0.5">
                  {editActive ? "This plan is active" : "This plan is inactive"}
                </p>
              </div>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
          </div>
           <DialogFooter className="px-6 py-4 border-t border-muted gap-2">
            <Button
              variant="outline" size="sm"
              className="h-8 text-xs border-border"
              onClick={() => setEditOpen(false)}
              disabled={saving}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
              onClick={handleSaveEdit}
              disabled={saving}
            >
              {saving
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
                : "Save"
              }
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ ACTIVATE CONFIRM ════════ */}
       <AlertDialog open={!!activateTarget} onOpenChange={o => { if (!o) setActivateTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-section-title">
              Activate Budget Plan Year {activateTarget?.year}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-amber-600">FY {plans.find(p => p.is_active)?.year}</span> will be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-border">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90"
                onClick={() => activateTarget && doActivate(activateTarget.budget_plan_id)}
                disabled={saving}
              >
                {saving ? "Activating…" : "Activate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════ CLOSE SUBMISSIONS WARNING ════════ */}
     <AlertDialog open={!!closeTarget} onOpenChange={o => { if (!o) { setCloseTarget(null); setDraftDepts([]); } }}>
        <AlertDialogContent className="rounded-2xl max-w-md border-border max-h-[90vh] flex flex-col overflow-hidden">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="text-section-title">
              Close submissions for FY {closeTarget?.year}?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="text-sm text-gray-500 space-y-3">
                <p>
                  Department heads will no longer be able to submit their plans.
                  All remaining <span className="font-medium text-gray-700">draft plans will be auto-submitted</span>.
                </p>
                {loadingDrafts ? (
                  <div className="flex items-center gap-2 text-gray-400 text-[12px]">
                    <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
                    Checking drafts…
                  </div>
                ) : draftDepts.length > 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg overflow-hidden">
                    <div className="px-3 pt-2.5 pb-2 border-b border-amber-200 flex items-center justify-between">
                      <p className="text-table-header text-amber-800">
                        {draftDepts.length} dept{draftDepts.length > 1 ? "s" : ""} still in draft — will be auto-submitted
                      </p>
                      <span className="text-meta text-amber-500 tabular-nums">
                        {draftDepts.length} total
                      </span>
                    </div>
                    <ul className="overflow-y-auto max-h-[200px] divide-y divide-amber-100">
                      {draftDepts.map(d => (
                        <li key={d.dept_budget_plan_id} className="flex items-center gap-2 px-3 py-1.5 text-table-secondary text-amber-700">
                          <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                          <span className="font-semibold flex-shrink-0 w-10 truncate">{d.dept_abbreviation}</span>
                          <span className="text-amber-600 truncate">{d.dept_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-subtitle text-emerald-700 font-medium">
                    ✓ All departments have already submitted their plans.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-border">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className="h-8 text-xs bg-primary hover:bg-primary/90"
                onClick={confirmClose}
                disabled={closingPlan || loadingDrafts}
              >
                {closingPlan
                  ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Closing…</>
                  : "Close Submissions"
                }
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default BudgetPlanList;
