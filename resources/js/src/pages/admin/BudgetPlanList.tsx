import React, { useEffect, useState } from "react";
import API from "../../services/api";
import { BudgetPlan } from "../../types/api";
import { LoadingState } from "../common/LoadingState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Badge } from "../../components/ui/badge";
import { Switch } from "../../components/ui/switch";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../../components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

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
  const [plans, setPlans]     = useState<BudgetPlanWithOpen[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Create dialog ──────────────────────────────────────────────────────────
  const [createOpen, setCreateOpen]   = useState(false);
  const [newYear, setNewYear]         = useState<number>(new Date().getFullYear() + 1);
  const [newActive, setNewActive]     = useState(false);
  const [creating, setCreating]       = useState(false);

  // ── Edit status dialog ─────────────────────────────────────────────────────
  const [editPlan, setEditPlan]       = useState<BudgetPlanWithOpen | null>(null);
  const [editActive, setEditActive]   = useState(false);
  const [editOpen, setEditOpen]       = useState(false);
  const [saving, setSaving]           = useState(false);

  // ── Activate confirm ───────────────────────────────────────────────────────
  const [activateTarget, setActivateTarget] = useState<BudgetPlanWithOpen | null>(null);

  // ── Close submissions (is_open → false) ───────────────────────────────────
  // Step 1: show warning with list of draft depts
  // Step 2: admin clicks OK → close + auto-submit
  const [closeTarget, setCloseTarget]     = useState<BudgetPlanWithOpen | null>(null);
  const [draftDepts, setDraftDepts]       = useState<DraftDept[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(false);
  const [closingPlan, setClosingPlan]     = useState(false);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  useEffect(() => { fetchPlans(); }, []);

  const fetchPlans = async () => {
    setLoading(true);
    try {
      const res = await API.get("/budget-plans");
      const sorted = (res.data.data as BudgetPlanWithOpen[]).sort((a, b) => b.year - a.year);
      setPlans(sorted);
    } catch {
      toast.error("Failed to load budget plans.");
    } finally {
      setLoading(false);
    }
  };

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleCreate = async () => {
    if (!newYear) return;
    setCreating(true);
    try {
      const res  = await API.post("/budget-plans", { year: newYear, is_active: newActive });
      const created = res.data.data;
      const deptCount = created.department_plans?.length ?? 0;
      toast.success(`Budget plan ${created.year} created — ${deptCount} department plan${deptCount !== 1 ? "s" : ""} initialized.`);
      setCreateOpen(false);
      setNewYear(new Date().getFullYear() + 1);
      setNewActive(false);
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
    // Reopening is instant — no warning needed
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

    // Closing → fetch draft departments first to show warning
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
      const res = await API.post(`/budget-plans/${closeTarget.budget_plan_id}/close`);
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Budget Administration
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            Budget Plans
          </h1>
        </div>
        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New Budget Plan
        </Button>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {plans.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            No budget plans yet.{" "}
            <button onClick={() => setCreateOpen(true)} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
              Create the first one
            </button>
          </div>
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-24">Year</th>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Status</th>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Submissions</th>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Dept. Plans</th>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Created</th>
                <th className="border-b border-gray-200 bg-white px-2 py-2.5 text-center align-bottom w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map(plan => {
                const deptCount = (plan as any).department_plans?.length ?? "–";
                return (
                  <tr key={plan.budget_plan_id} className={cn("hover:bg-gray-50/60 transition-colors", plan.is_active && "bg-emerald-50/30")}>

                    {/* Year */}
                    <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums text-sm">{plan.year}</td>

                    {/* Active status */}
                    <td className="px-4 py-3">
                      {plan.is_active ? (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          Active
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium">Inactive</span>
                      )}
                    </td>

                    {/* is_open toggle */}
                    <td className="px-4 py-3">
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
                        <span className="text-[10px] text-gray-300">Active plan only</span>
                      )}
                    </td>

                    {/* Dept count */}
                    <td className="px-4 py-3 text-gray-500 tabular-nums">{deptCount}</td>

                    {/* Created */}
                    <td className="px-4 py-3 text-gray-400">
                      {new Date(plan.created_at).toLocaleDateString("en-PH", { year: "numeric", month: "short", day: "numeric" })}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                            <MoreHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => openEdit(plan)}>Edit Status</DropdownMenuItem>
                          {/* {!plan.is_active && (
                            <DropdownMenuItem onClick={() => {
                              const hasActive = plans.some(p => p.is_active);
                              if (hasActive) setActivateTarget(plan);
                              else doActivate(plan.budget_plan_id);
                            }}>
                              Set as Active
                            </DropdownMenuItem>
                          )} */}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
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
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">New Budget Plan</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              Department plans for all departments will be auto-initialized.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Fiscal Year <span className="text-red-400">*</span></Label>
              <Input type="number" value={newYear} onChange={e => setNewYear(parseInt(e.target.value))} className="h-9 text-sm font-mono" />
            </div>
            <div className="flex items-center justify-between py-1">
              <div>
                <p className="text-xs font-semibold text-gray-600">Set as Active</p>
                <p className="text-[10px] text-gray-400 mt-0.5">Will deactivate the current active plan</p>
              </div>
              <Switch checked={newActive} onCheckedChange={setNewActive} />
            </div>
            {newActive && plans.some(p => p.is_active) && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5">
                <p className="text-[11px] text-amber-700 font-medium">
                  Budget Plan Year {plans.find(p => p.is_active)?.year} will be deactivated.
                </p>
              </div>
            )}
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setCreateOpen(false)} disabled={creating}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800" onClick={handleCreate} disabled={creating || !newYear}>
              {creating ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Creating…</> : "Create Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ EDIT STATUS DIALOG ════════ */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-sm rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">Edit Budget Plan</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">Budget Plan Year {editPlan?.year}</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-gray-600">Active</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{editActive ? "This plan is active" : "This plan is inactive"}</p>
              </div>
              <Switch checked={editActive} onCheckedChange={setEditActive} />
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setEditOpen(false)} disabled={saving}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800" onClick={handleSaveEdit} disabled={saving}>
              {saving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ ACTIVATE CONFIRM ════════ */}
      <AlertDialog open={!!activateTarget} onOpenChange={o => { if (!o) setActivateTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Activate Budget Plan Year {activateTarget?.year}?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-amber-600">FY {plans.find(p => p.is_active)?.year}</span> will be deactivated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
                onClick={() => activateTarget && doActivate(activateTarget.budget_plan_id)} disabled={saving}>
                {saving ? "Activating…" : "Activate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════ CLOSE SUBMISSIONS WARNING ════════ */}
      <AlertDialog open={!!closeTarget} onOpenChange={o => { if (!o) { setCloseTarget(null); setDraftDepts([]); } }}>
        <AlertDialogContent className="rounded-2xl max-w-md border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
          <AlertDialogHeader className="flex-shrink-0">
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
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
                      <p className="text-[11px] font-semibold text-amber-800 uppercase tracking-wide">
                        {draftDepts.length} dept{draftDepts.length > 1 ? "s" : ""} still in draft — will be auto-submitted
                      </p>
                      <span className="text-[10px] text-amber-500 font-medium tabular-nums">
                        {draftDepts.length} total
                      </span>
                    </div>
                    {/* Scrollable list — caps at ~200px so dialog never overflows */}
                    <ul className="overflow-y-auto max-h-[200px] divide-y divide-amber-100">
                      {draftDepts.map(d => (
                        <li key={d.dept_budget_plan_id} className="flex items-center gap-2 px-3 py-1.5 text-[11px] text-amber-700">
                          <span className="w-1 h-1 rounded-full bg-amber-400 flex-shrink-0" />
                          <span className="font-semibold flex-shrink-0 w-10 truncate">{d.dept_abbreviation}</span>
                          <span className="text-amber-600 truncate">{d.dept_name}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 text-[12px] text-emerald-700 font-medium">
                    ✓ All departments have already submitted their plans.
                  </div>
                )}
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
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
