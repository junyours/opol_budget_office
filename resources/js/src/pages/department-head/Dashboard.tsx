import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "../../services/api";
import { useAuth } from "../../hooks/useAuth";
import { DepartmentBudgetPlan, BudgetPlan } from "../../types/api";
import { LoadingState } from "../common/LoadingState";
import { Button } from "../../components/ui/button";
import { Badge } from "../../components/ui/badge";
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
import { MoreHorizontalIcon, X } from "lucide-react";
import { PlusIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

// ─── Status config ────────────────────────────────────────────────────────────

const statusConfig: Record<
  string,
  { label: string; dot: string; badge: string }
> = {
  draft: {
    label: "Draft",
    dot:   "bg-amber-400",
    badge: "text-amber-700 bg-amber-50 border-amber-200",
  },
  submitted: {
    label: "Submitted",
    dot:   "bg-blue-400",
    badge: "text-blue-700 bg-blue-50 border-blue-200",
  },
  approved: {
    label: "Approved",
    dot:   "bg-emerald-400",
    badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
  },
};

const getStatusCfg = (status: string) =>
  statusConfig[status] ?? {
    label: status,
    dot:   "bg-gray-400",
    badge: "text-gray-600 bg-gray-50 border-gray-200",
  };

// ─── Component ────────────────────────────────────────────────────────────────

const DepartmentHeadDashboard: React.FC = () => {
  const { user } = useAuth();

  const [plans, setPlans]                   = useState<DepartmentBudgetPlan[]>([]);
  const [activePlan, setActivePlan]         = useState<BudgetPlan | null>(null);
  const [loading, setLoading]               = useState(true);
  const [showCreateConfirm, setShowCreateConfirm] = useState(false);
  const [showDraftAlert, setShowDraftAlert] = useState(false);
  const [justCreated, setJustCreated]       = useState(false);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (loading || !activePlan) return;
    const hasDraft = plans.some(
      (p) => p.status === "draft" && p.budget_plan_id === activePlan.budget_plan_id
    );
    if (hasDraft && !justCreated) setShowDraftAlert(true);
  }, [plans, loading, activePlan, justCreated]);

  const fetchData = async () => {
    try {
      const [parentRes, deptRes] = await Promise.all([
        API.get("/budget-plans"),
        API.get("/department-budget-plans"),
      ]);
      const parentPlans: BudgetPlan[] = parentRes.data.data;
      const active = parentPlans.find((p) => p.is_active) ?? null;
      setActivePlan(active);

      const all: DepartmentBudgetPlan[] = deptRes.data.data;
      setPlans(all.filter((p) => p.dept_id === user?.dept_id));
    } catch {
      toast.error("Failed to load budget plans.");
    } finally {
      setLoading(false);
    }
  };

  // ── Create ────────────────────────────────────────────────────────────────

  const handleCreatePlan = () => {
    if (!activePlan) {
      toast.error("No active budget plan. Please contact admin.");
      return;
    }
    if (plans.some((p) => p.budget_plan_id === activePlan.budget_plan_id)) {
      toast.error("You already have a budget plan for the active year.");
      return;
    }
    setShowCreateConfirm(true);
  };

  const createPlan = async () => {
    setShowCreateConfirm(false);
    const promise = API.post("/department-budget-plans", {
      budget_plan_id: activePlan!.budget_plan_id,
      dept_id:        user?.dept_id,
    }).then(() => {
      setJustCreated(true);
      fetchData();
    });
    toast.promise(promise, {
      loading: "Creating budget plan…",
      success: "Budget plan created.",
      error:   "Failed to create budget plan.",
    });
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  // const handleDelete = async (planId: number) => {
  //   try {
  //     await API.delete(`/department-budget-plans/${planId}`);
  //     toast.success("Budget plan deleted.");
  //     fetchData();
  //   } catch {
  //     toast.error("Failed to delete budget plan.");
  //   }
  // };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;

  // The draft for the active plan (used in the alert)
  const draftPlan = plans.find(
    (p) => p.status === "draft" && p.budget_plan_id === activePlan?.budget_plan_id
  );

  return (
    <div className="p-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Department Head
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            Dashboard
          </h1>
        </div>
        {/* <Button
          size="sm"
          onClick={handleCreatePlan}
          disabled={!activePlan}
          className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          New Budget Plan
        </Button> */}
      </div>

      {/* ── No active plan warning ───────────────────────────────────────── */}
      {!activePlan && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
          <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
          <div>
            <p className="text-sm font-medium text-gray-900">No active budget plan</p>
            <p className="text-[11px] text-gray-500 mt-0.5">
              The admin hasn't activated a budget plan yet. Please check back later.
            </p>
          </div>
        </div>
      )}

      {/* ── Budget Plans Table ───────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {plans.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            No budget plans yet.{" "}
            {activePlan && (
              <button
                onClick={handleCreatePlan}
                className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
              >
                Create one now
              </button>
            )}
          </div>
        ) : (
          <table className="w-full text-[12px] border-collapse">
            <thead>
              <tr>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-32">
                  Fiscal Year
                </th>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                  Status
                </th>
                <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                  Created
                </th>
                <th className="border-b border-gray-200 bg-white px-2 py-2.5 text-center align-bottom w-12" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {plans.map((plan) => {
                const cfg = getStatusCfg(plan.status);
                return (
                  <tr key={plan.dept_budget_plan_id} className="hover:bg-gray-50/60 transition-colors">

                    {/* Year */}
                    <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums text-sm">
                      {plan.budget_plan?.year ?? "N/A"}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
                        <span
                          className={cn(
                            "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                            cfg.badge
                          )}
                        >
                          {cfg.label}
                        </span>
                      </span>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3 text-gray-400 text-[11px]">
                      {plan.created_at
                        ? new Date(plan.created_at).toLocaleDateString("en-PH", {
                            year: "numeric", month: "short", day: "numeric",
                          })
                        : "—"}
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                            <MoreHorizontalIcon className="w-4 h-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          {plan.status === "draft" ? (
                            <>
                              <DropdownMenuItem asChild>
                                <Link to={`/department-budget-plans/${plan.dept_budget_plan_id}`}>
                                  Edit
                                </Link>
                              </DropdownMenuItem>
                              {/* <DropdownMenuSeparator /> */}
                              {/* <DropdownMenuItem
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                onClick={() => handleDelete(plan.dept_budget_plan_id)}
                              >
                                Delete
                              </DropdownMenuItem> */}
                            </>
                          ) : (
                            <DropdownMenuItem asChild>
                              <Link to={`/department-budget-plans/${plan.dept_budget_plan_id}`}>
                                View
                              </Link>
                            </DropdownMenuItem>
                          )}
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

      {/* ════════════════════════════════════════════════════════════════════
          Create Confirm Dialog
      ════════════════════════════════════════════════════════════════════ */}
      <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Create budget plan?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              This will create a draft budget plan for{" "}
              <span className="font-medium text-gray-700">FY {activePlan?.year}</span>.
              You can start adding items right away.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
                onClick={createPlan}
              >
                Create
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════════════════════════════════════════════════════════════════
          Draft Alert — fixed bottom-right toast-style
      ════════════════════════════════════════════════════════════════════ */}
      {showDraftAlert && draftPlan && (
        <div className="fixed bottom-5 right-5 z-50 w-80 animate-in fade-in slide-in-from-bottom-3 duration-300">
          <div className="bg-white border border-amber-200 rounded-xl shadow-lg p-4 relative">
            {/* Close */}
            <button
              onClick={() => setShowDraftAlert(false)}
              className="absolute top-3 right-3 text-gray-300 hover:text-gray-600 transition-colors"
              aria-label="Close"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <div className="flex items-start gap-3 pr-4">
              <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <InformationCircleIcon className="w-4 h-4 text-amber-600" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-gray-900 leading-tight">
                  Draft Budget Plan
                </p>
                <p className="text-[11px] text-gray-500 mt-1 leading-snug">
                  You have a draft plan for{" "}
                  <span className="font-medium text-gray-700">
                    FY {draftPlan.budget_plan?.year}
                  </span>
                  . Finalize and submit it to the Local Budget Officer for review.
                </p>
                <Link
                  to={`/department-budget-plans/${draftPlan.dept_budget_plan_id}`}
                  className="inline-block mt-2 text-[11px] font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600"
                  onClick={() => setShowDraftAlert(false)}
                >
                  Open draft →
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DepartmentHeadDashboard;