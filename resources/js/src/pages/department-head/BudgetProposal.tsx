import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import API from "@/src/services/api";
import { useAuth } from "@/src/hooks/useAuth";
import { DepartmentBudgetPlan, BudgetPlan } from "@/src/types/api";
import { Button } from "@/src/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { MoreHorizontalIcon } from "lucide-react";
import { PlusIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";

// ─── Status helpers ───────────────────────────────────────────────────────────

const statusConfig: Record<
    string,
    { label: string; dot: string; badge: string }
> = {
    draft: {
        label: "Draft",
        dot: "bg-amber-400",
        badge: "text-amber-700 bg-amber-50 border-amber-200",
    },
    submitted: {
        label: "Submitted",
        dot: "bg-blue-400",
        badge: "text-blue-700 bg-blue-50 border-blue-200",
    },
    approved: {
        label: "Approved",
        dot: "bg-emerald-400",
        badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
    },
};
const getStatusCfg = (s: string) =>
    statusConfig[s] ?? {
        label: s,
        dot: "bg-gray-400",
        badge: "text-gray-600 bg-gray-50 border-gray-200",
    };

// ─── Skeleton row ─────────────────────────────────────────────────────────────

const RowSkeleton = ({ delay = 0 }: { delay?: number }) => (
    <tr
        style={{
            opacity: 0,
            animation: `rowReveal .35s ease forwards`,
            animationDelay: `${delay}ms`,
        }}
    >
        <td className="px-4 py-3">
            <div className="h-4 w-16 bg-zinc-100 rounded animate-pulse" />
        </td>
        <td className="px-4 py-3">
            <div className="h-5 w-24 bg-zinc-100 rounded-full animate-pulse" />
        </td>
        <td className="px-4 py-3">
            <div className="h-3 w-28 bg-zinc-100 rounded animate-pulse" />
        </td>
        <td className="px-2 py-3">
            <div className="h-6 w-6 bg-zinc-100 rounded animate-pulse ml-auto" />
        </td>
    </tr>
);

// ─── Component ────────────────────────────────────────────────────────────────

const BudgetProposal: React.FC = () => {
    const { user } = useAuth();

    const [plans, setPlans] = useState<DepartmentBudgetPlan[]>([]);
    const [activePlan, setActivePlan] = useState<BudgetPlan | null>(null);
    const [loading, setLoading] = useState(true);
    const [showCreateConfirm, setShowCreateConfirm] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const [parentRes, deptRes] = await Promise.all([
                API.get("/budget-plans"),
                API.get("/department-budget-plans"),
            ]);
            const parentPlans: BudgetPlan[] = parentRes.data.data;
            setActivePlan(parentPlans.find((p) => p.is_active) ?? null);

            const all: DepartmentBudgetPlan[] = deptRes.data.data;
            setPlans(all.filter((p) => p.dept_id === user?.dept_id));
        } catch {
            toast.error("Failed to load budget plans.");
        } finally {
            setLoading(false);
        }
    };

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
            dept_id: user?.dept_id,
        }).then(() => {
            fetchData();
        });
        toast.promise(promise, {
            loading: "Creating budget plan…",
            success: "Budget plan created.",
            error: "Failed to create budget plan.",
        });
    };

    return (
        <>
            <style>{`
        @keyframes rowReveal {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .page-in { animation: pageIn .4s cubic-bezier(.22,.68,0,1.2) forwards; }
      `}</style>

            <div className="p-6 min-h-screen bg-zinc-50/40 page-in">
                {/* ── Header ─────────────────────────────────────────────────── */}
                <div className="flex items-center justify-between mb-7">
                    <div>
                        <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-400">
                            Department Head
                        </span>
                        <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight mt-0.5">
                            Budget Proposal
                        </h1>
                        <p className="text-[12px] text-zinc-400 mt-0.5">
                            Manage your department's budget plans for each
                            fiscal year
                        </p>
                    </div>
                    {/* <Button
                        size="sm"
                        onClick={handleCreatePlan}
                        disabled={!activePlan}
                        className="gap-1.5 text-xs h-8 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-40 rounded-xl"
                    >
                        <PlusIcon className="w-3.5 h-3.5" />
                        New Proposal
                    </Button>*/}
                </div>

                {/* ── No active plan ───────────────────────────────────────────── */}
                {!activePlan && !loading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
                        <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
                        <div>
                            <p className="text-sm font-medium text-zinc-900">
                                No active budget plan
                            </p>
                            <p className="text-[11px] text-zinc-500 mt-0.5">
                                The admin hasn't activated a budget plan yet.
                                Please check back later.
                            </p>
                        </div>
                    </div>
                )}

                {/* ── Active plan chip ─────────────────────────────────────────── */}
                {activePlan && !loading && (
                    <div className="flex items-center gap-2 mb-5">
                        <div className="bg-white border border-zinc-100 rounded-xl px-3 py-1.5 shadow-sm flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            <span className="text-[11px] font-semibold text-zinc-600">
                                Active: FY {activePlan.year}
                            </span>
                        </div>
                        {activePlan.is_open ? (
                            <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                                Open for Submissions
                            </span>
                        ) : (
                            <span className="text-[10px] font-semibold text-zinc-500 bg-zinc-100 border border-zinc-200 rounded-full px-2 py-0.5">
                                Closed
                            </span>
                        )}
                    </div>
                )}

                {/* ── Table ───────────────────────────────────────────────────── */}
                <div className="bg-white border border-zinc-100 rounded-2xl overflow-hidden shadow-sm">
                    {loading ? (
                        <table className="w-full text-[12px]">
                            <thead>
                                <tr className="border-b border-zinc-100">
                                    {[
                                        "Fiscal Year",
                                        "Status",
                                        "Created",
                                        "",
                                    ].map((h) => (
                                        <th
                                            key={h}
                                            className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 bg-zinc-50/60"
                                        >
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {[0, 70, 140].map((d) => (
                                    <RowSkeleton key={d} delay={d} />
                                ))}
                            </tbody>
                        </table>
                    ) : plans.length === 0 ? (
                        <div className="text-center py-16 px-4">
                            <div className="w-12 h-12 bg-zinc-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <InformationCircleIcon className="w-6 h-6 text-zinc-400" />
                            </div>
                            <p className="text-zinc-500 text-sm font-medium mb-1">
                                No budget proposals yet
                            </p>
                            <p className="text-zinc-400 text-[12px] mb-4">
                                Create your first budget proposal for FY{" "}
                                {activePlan?.year}.
                            </p>
                            {activePlan && (
                                <Button
                                    size="sm"
                                    onClick={handleCreatePlan}
                                    className="text-xs h-8 bg-zinc-900 hover:bg-zinc-800 rounded-xl"
                                >
                                    <PlusIcon className="w-3.5 h-3.5 mr-1.5" />
                                    Create Proposal
                                </Button>
                            )}
                        </div>
                    ) : (
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="border-b border-zinc-100">
                                    <th className="bg-zinc-50/60 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400 w-36">
                                        Fiscal Year
                                    </th>
                                    <th className="bg-zinc-50/60 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                        Status
                                    </th>
                                    <th className="bg-zinc-50/60 px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                                        Created
                                    </th>
                                    <th className="bg-zinc-50/60 px-2 py-3 w-12" />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-50">
                                {plans.map((plan, i) => {
                                    const cfg = getStatusCfg(plan.status);
                                    const isActive =
                                        plan.budget_plan_id ===
                                        activePlan?.budget_plan_id;
                                    return (
                                        <tr
                                            key={plan.dept_budget_plan_id}
                                            className="hover:bg-zinc-50/60 transition-colors"
                                            style={{
                                                opacity: 0,
                                                animation:
                                                    "rowReveal .35s ease forwards",
                                                animationDelay: `${i * 60}ms`,
                                            }}
                                        >
                                            <td className="px-4 py-3">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-sm font-bold text-zinc-900 tabular-nums">
                                                        {plan.budget_plan
                                                            ?.year ?? "N/A"}
                                                    </span>
                                                    {isActive && (
                                                        <span className="text-[9px] font-semibold bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full">
                                                            Active
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="flex items-center gap-1.5">
                                                    <span
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                            cfg.dot,
                                                        )}
                                                    />
                                                    <span
                                                        className={cn(
                                                            "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
                                                            cfg.badge,
                                                        )}
                                                    >
                                                        {cfg.label}
                                                    </span>
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-zinc-400 text-[11px]">
                                                {plan.created_at
                                                    ? new Date(
                                                          plan.created_at,
                                                      ).toLocaleDateString(
                                                          "en-PH",
                                                          {
                                                              year: "numeric",
                                                              month: "short",
                                                              day: "numeric",
                                                          },
                                                      )
                                                    : "—"}
                                            </td>
                                            <td className="px-2 py-2.5 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger
                                                        asChild
                                                    >
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-7 text-zinc-400 hover:text-zinc-700"
                                                        >
                                                            <MoreHorizontalIcon className="w-4 h-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent
                                                        align="end"
                                                        className="w-36 rounded-xl"
                                                    >
                                                        <DropdownMenuItem
                                                            asChild
                                                        >
                                                            <Link
                                                                to={`/department-budget-plans/${plan.dept_budget_plan_id}`}
                                                            >
                                                                {plan.status ===
                                                                "draft"
                                                                    ? "Edit"
                                                                    : "View"}
                                                            </Link>
                                                        </DropdownMenuItem>
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
            </div>

            {/* ── Create Confirm Dialog ───────────────────────────────────────── */}
            <AlertDialog
                open={showCreateConfirm}
                onOpenChange={setShowCreateConfirm}
            >
                <AlertDialogContent className="rounded-2xl max-w-sm border-zinc-200">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-[15px] font-semibold text-zinc-900">
                            Create budget proposal?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-zinc-500">
                            This will create a draft proposal for{" "}
                            <span className="font-medium text-zinc-700">
                                FY {activePlan?.year}
                            </span>
                            .
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-8 text-xs border-zinc-200 rounded-xl"
                            >
                                Cancel
                            </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                            <Button
                                size="sm"
                                className="h-8 text-xs bg-zinc-900 hover:bg-zinc-800 rounded-xl"
                                onClick={createPlan}
                            >
                                Create
                            </Button>
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
};

export default BudgetProposal;
