// import React, { useEffect, useState } from "react";
// import { Link } from "react-router-dom";
// import API from "../../services/api";
// import { useAuth } from "../../hooks/useAuth";
// import { DepartmentBudgetPlan, BudgetPlan } from "../../types/api";
// import { LoadingState } from "../common/LoadingState";
// import { Button } from "../../components/ui/button";
// import { Badge } from "../../components/ui/badge";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "../../components/ui/alert-dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "../../components/ui/dropdown-menu";
// import { MoreHorizontalIcon, X } from "lucide-react";
// import { PlusIcon, InformationCircleIcon } from "@heroicons/react/24/outline";
// import { toast } from "sonner";
// import { cn } from "@/src/lib/utils";

// // ─── Status config ────────────────────────────────────────────────────────────

// const statusConfig: Record<
//   string,
//   { label: string; dot: string; badge: string }
// > = {
//   draft: {
//     label: "Draft",
//     dot:   "bg-amber-400",
//     badge: "text-amber-700 bg-amber-50 border-amber-200",
//   },
//   submitted: {
//     label: "Submitted",
//     dot:   "bg-blue-400",
//     badge: "text-blue-700 bg-blue-50 border-blue-200",
//   },
//   approved: {
//     label: "Approved",
//     dot:   "bg-emerald-400",
//     badge: "text-emerald-700 bg-emerald-50 border-emerald-200",
//   },
// };

// const getStatusCfg = (status: string) =>
//   statusConfig[status] ?? {
//     label: status,
//     dot:   "bg-gray-400",
//     badge: "text-gray-600 bg-gray-50 border-gray-200",
//   };

// // ─── Component ────────────────────────────────────────────────────────────────

// const DepartmentHeadDashboard: React.FC = () => {
//   const { user } = useAuth();

//   const [plans, setPlans]                   = useState<DepartmentBudgetPlan[]>([]);
//   const [activePlan, setActivePlan]         = useState<BudgetPlan | null>(null);
//   const [loading, setLoading]               = useState(true);
//   const [showCreateConfirm, setShowCreateConfirm] = useState(false);
//   const [showDraftAlert, setShowDraftAlert] = useState(false);
//   const [justCreated, setJustCreated]       = useState(false);

//   // ── Fetch ─────────────────────────────────────────────────────────────────

//   useEffect(() => { fetchData(); }, []);

//   useEffect(() => {
//     if (loading || !activePlan) return;
//     const hasDraft = plans.some(
//       (p) => p.status === "draft" && p.budget_plan_id === activePlan.budget_plan_id
//     );
//     if (hasDraft && !justCreated) setShowDraftAlert(true);
//   }, [plans, loading, activePlan, justCreated]);

//   const fetchData = async () => {
//     try {
//       const [parentRes, deptRes] = await Promise.all([
//         API.get("/budget-plans"),
//         API.get("/department-budget-plans"),
//       ]);
//       const parentPlans: BudgetPlan[] = parentRes.data.data;
//       const active = parentPlans.find((p) => p.is_active) ?? null;
//       setActivePlan(active);

//       const all: DepartmentBudgetPlan[] = deptRes.data.data;
//       setPlans(all.filter((p) => p.dept_id === user?.dept_id));
//     } catch {
//       toast.error("Failed to load budget plans.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Create ────────────────────────────────────────────────────────────────

//   const handleCreatePlan = () => {
//     if (!activePlan) {
//       toast.error("No active budget plan. Please contact admin.");
//       return;
//     }
//     if (plans.some((p) => p.budget_plan_id === activePlan.budget_plan_id)) {
//       toast.error("You already have a budget plan for the active year.");
//       return;
//     }
//     setShowCreateConfirm(true);
//   };

//   const createPlan = async () => {
//     setShowCreateConfirm(false);
//     const promise = API.post("/department-budget-plans", {
//       budget_plan_id: activePlan!.budget_plan_id,
//       dept_id:        user?.dept_id,
//     }).then(() => {
//       setJustCreated(true);
//       fetchData();
//     });
//     toast.promise(promise, {
//       loading: "Creating budget plan…",
//       success: "Budget plan created.",
//       error:   "Failed to create budget plan.",
//     });
//   };

//   // ── Delete ────────────────────────────────────────────────────────────────

//   // const handleDelete = async (planId: number) => {
//   //   try {
//   //     await API.delete(`/department-budget-plans/${planId}`);
//   //     toast.success("Budget plan deleted.");
//   //     fetchData();
//   //   } catch {
//   //     toast.error("Failed to delete budget plan.");
//   //   }
//   // };

//   // ── Render ────────────────────────────────────────────────────────────────

//   if (loading) return <LoadingState />;

//   // The draft for the active plan (used in the alert)
//   const draftPlan = plans.find(
//     (p) => p.status === "draft" && p.budget_plan_id === activePlan?.budget_plan_id
//   );

//   return (
//     <div className="p-6">

//       {/* ── Page Header ─────────────────────────────────────────────────── */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
//             Department Head
//           </span>
//           <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
//             Dashboard
//           </h1>
//         </div>
//         {/* <Button
//           size="sm"
//           onClick={handleCreatePlan}
//           disabled={!activePlan}
//           className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white disabled:opacity-40"
//         >
//           <PlusIcon className="w-3.5 h-3.5" />
//           New Budget Plan
//         </Button> */}
//       </div>

//       {/* ── No active plan warning ───────────────────────────────────────── */}
//       {!activePlan && (
//         <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 mb-6">
//           <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0 mt-1.5" />
//           <div>
//             <p className="text-sm font-medium text-gray-900">No active budget plan</p>
//             <p className="text-[11px] text-gray-500 mt-0.5">
//               The admin hasn't activated a budget plan yet. Please check back later.
//             </p>
//           </div>
//         </div>
//       )}

//       {/* ── Budget Plans Table ───────────────────────────────────────────── */}
//       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//         {plans.length === 0 ? (
//           <div className="text-center py-14 text-gray-400 text-sm">
//             No budget plans yet.{" "}
//             {activePlan && (
//               <button
//                 onClick={handleCreatePlan}
//                 className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
//               >
//                 Create one now
//               </button>
//             )}
//           </div>
//         ) : (
//           <table className="w-full text-[12px] border-collapse">
//             <thead>
//               <tr>
//                 <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-32">
//                   Fiscal Year
//                 </th>
//                 <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
//                   Status
//                 </th>
//                 <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
//                   Created
//                 </th>
//                 <th className="border-b border-gray-200 bg-white px-2 py-2.5 text-center align-bottom w-12" />
//               </tr>
//             </thead>
//             <tbody className="divide-y divide-gray-100">
//               {plans.map((plan) => {
//                 const cfg = getStatusCfg(plan.status);
//                 return (
//                   <tr key={plan.dept_budget_plan_id} className="hover:bg-gray-50/60 transition-colors">

//                     {/* Year */}
//                     <td className="px-4 py-3 font-semibold text-gray-900 tabular-nums text-sm">
//                       {plan.budget_plan?.year ?? "N/A"}
//                     </td>

//                     {/* Status */}
//                     <td className="px-4 py-3">
//                       <span className="flex items-center gap-1.5">
//                         <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
//                         <span
//                           className={cn(
//                             "text-[11px] font-semibold px-2 py-0.5 rounded-full border",
//                             cfg.badge
//                           )}
//                         >
//                           {cfg.label}
//                         </span>
//                       </span>
//                     </td>

//                     {/* Created */}
//                     <td className="px-4 py-3 text-gray-400 text-[11px]">
//                       {plan.created_at
//                         ? new Date(plan.created_at).toLocaleDateString("en-PH", {
//                             year: "numeric", month: "short", day: "numeric",
//                           })
//                         : "—"}
//                     </td>

//                     {/* Actions */}
//                     <td className="px-2 py-2.5 text-right">
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
//                             <MoreHorizontalIcon className="w-4 h-4" />
//                             <span className="sr-only">Open menu</span>
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-36">
//                           {plan.status === "draft" ? (
//                             <>
//                               <DropdownMenuItem asChild>
//                                 <Link to={`/department-budget-plans/${plan.dept_budget_plan_id}`}>
//                                   Edit
//                                 </Link>
//                               </DropdownMenuItem>
//                               {/* <DropdownMenuSeparator /> */}
//                               {/* <DropdownMenuItem
//                                 className="text-red-600 focus:text-red-600 focus:bg-red-50"
//                                 onClick={() => handleDelete(plan.dept_budget_plan_id)}
//                               >
//                                 Delete
//                               </DropdownMenuItem> */}
//                             </>
//                           ) : (
//                             <DropdownMenuItem asChild>
//                               <Link to={`/department-budget-plans/${plan.dept_budget_plan_id}`}>
//                                 View
//                               </Link>
//                             </DropdownMenuItem>
//                           )}
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </td>

//                   </tr>
//                 );
//               })}
//             </tbody>
//           </table>
//         )}
//       </div>

//       {/* ════════════════════════════════════════════════════════════════════
//           Create Confirm Dialog
//       ════════════════════════════════════════════════════════════════════ */}
//       <AlertDialog open={showCreateConfirm} onOpenChange={setShowCreateConfirm}>
//         <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
//           <AlertDialogHeader>
//             <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
//               Create budget plan?
//             </AlertDialogTitle>
//             <AlertDialogDescription className="text-sm text-gray-500">
//               This will create a draft budget plan for{" "}
//               <span className="font-medium text-gray-700">FY {activePlan?.year}</span>.
//               You can start adding items right away.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel asChild>
//               <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
//                 Cancel
//               </Button>
//             </AlertDialogCancel>
//             <AlertDialogAction asChild>
//               <Button
//                 size="sm"
//                 className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
//                 onClick={createPlan}
//               >
//                 Create
//               </Button>
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>

//       {/* ════════════════════════════════════════════════════════════════════
//           Draft Alert — fixed bottom-right toast-style
//       ════════════════════════════════════════════════════════════════════ */}
//       {showDraftAlert && draftPlan && (
//         <div className="fixed bottom-5 right-5 z-50 w-80 animate-in fade-in slide-in-from-bottom-3 duration-300">
//           <div className="bg-white border border-amber-200 rounded-xl shadow-lg p-4 relative">
//             {/* Close */}
//             <button
//               onClick={() => setShowDraftAlert(false)}
//               className="absolute top-3 right-3 text-gray-300 hover:text-gray-600 transition-colors"
//               aria-label="Close"
//             >
//               <X className="h-3.5 w-3.5" />
//             </button>

//             <div className="flex items-start gap-3 pr-4">
//               <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
//                 <InformationCircleIcon className="w-4 h-4 text-amber-600" />
//               </div>
//               <div className="min-w-0">
//                 <p className="text-[13px] font-semibold text-gray-900 leading-tight">
//                   Draft Budget Plan
//                 </p>
//                 <p className="text-[11px] text-gray-500 mt-1 leading-snug">
//                   You have a draft plan for{" "}
//                   <span className="font-medium text-gray-700">
//                     FY {draftPlan.budget_plan?.year}
//                   </span>
//                   . Finalize and submit it to the Local Budget Officer for review.
//                 </p>
//                 <Link
//                   to={`/department-budget-plans/${draftPlan.dept_budget_plan_id}`}
//                   className="inline-block mt-2 text-[11px] font-semibold text-gray-900 underline underline-offset-2 hover:text-gray-600"
//                   onClick={() => setShowDraftAlert(false)}
//                 >
//                   Open draft →
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </div>
//       )}

//     </div>
//   );
// };

// export default DepartmentHeadDashboard;
/**
 * pages/department-head/Dashboard.tsx
 *
 * Department-scoped dashboard — rendered by the shared Dashboard.tsx router
 * when user.role === "department-head".
 *
 * Shows data scoped to the logged-in user's own department:
 *   • Stat cards  — total budget, PS, MOOE, plantilla fill rate
 *   • RadialBarChart — PS / MOOE / CO allocation split
 *   • BarChart       — top AIP programs by expenditure type
 *   • AreaChart      — Semester 1 vs Semester 2 distribution
 *   • PieChart       — expense classification breakdown
 *   • Plantilla fill bar + position list
 *   • AIP program summary table
 *
 * Loading: skeleton shimmer cards + staggered reveal animation
 */

import React, { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  RadialBarChart,
  RadialBar,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import { useAuth } from "@/src/hooks/useAuth";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { useAipProgramData } from "@/src/hooks/useAipProgramData";
import { useExpenseData } from "@/src/hooks/useExpenseData";
import { useQuery } from "@tanstack/react-query";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import {
  CurrencyDollarIcon,
  UserGroupIcon,
  DocumentTextIcon,
  ArrowTrendingUpIcon,
  ClipboardDocumentListIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n >= 1_000_000
    ? `₱${(n / 1_000_000).toFixed(2)}M`
    : n >= 1_000
    ? `₱${(n / 1_000).toFixed(1)}K`
    : `₱${n.toFixed(0)}`;

const pct = (a: number, b: number) =>
  b === 0 ? 0 : Math.round((a / b) * 100);

// ─── Skeleton pieces ─────────────────────────────────────────────────────────

const Shimmer = ({ className }: { className?: string }) => (
  <div
    className={cn("rounded-lg bg-zinc-100 animate-pulse", className)}
  />
);

const CardSkeleton = () => (
  <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm space-y-3">
    <Shimmer className="h-9 w-9 rounded-xl" />
    <Shimmer className="h-3 w-20" />
    <Shimmer className="h-7 w-28" />
    <Shimmer className="h-2.5 w-full" />
  </div>
);

const ChartSkeleton = ({ title, h = "h-52" }: { title?: string; h?: string }) => (
  <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
    {title ? (
      <div className="space-y-1 mb-4">
        <Shimmer className="h-2.5 w-24" />
        <Shimmer className="h-4 w-36" />
      </div>
    ) : (
      <div className="space-y-1 mb-4">
        <Shimmer className="h-2.5 w-20" />
        <Shimmer className="h-4 w-32" />
      </div>
    )}
    <Shimmer className={cn(h, "w-full rounded-xl")} />
  </div>
);

// ─── Stagger reveal ───────────────────────────────────────────────────────────

const Reveal = ({
  children,
  delay = 0,
  className,
}: {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}) => (
  <div
    className={cn("dh-reveal", className)}
    style={{ "--d": `${delay}ms` } as React.CSSProperties}
  >
    {children}
  </div>
);

// ─── Stat card ────────────────────────────────────────────────────────────────

interface StatCardProps {
  icon: React.ElementType;
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "violet" | "cyan" | "emerald" | "amber" | "rose";
  delay?: number;
}

const accentMap = {
  blue:    { tile: "bg-blue-50",    icon: "text-blue-600"    },
  violet:  { tile: "bg-violet-50",  icon: "text-violet-600"  },
  cyan:    { tile: "bg-cyan-50",    icon: "text-cyan-600"    },
  emerald: { tile: "bg-emerald-50", icon: "text-emerald-600" },
  amber:   { tile: "bg-amber-50",   icon: "text-amber-600"   },
  rose:    { tile: "bg-rose-50",    icon: "text-rose-600"    },
};

const StatCard: React.FC<StatCardProps> = ({
  icon: Icon, label, value, sub, accent = "blue", delay = 0,
}) => {
  const a = accentMap[accent];
  return (
    <Reveal delay={delay}>
      <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow h-full">
        <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center mb-3 flex-shrink-0", a.tile)}>
          <Icon className={cn("w-[18px] h-[18px]", a.icon)} />
        </div>
        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 mb-1">{label}</p>
        <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
        {sub && <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">{sub}</p>}
      </div>
    </Reveal>
  );
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-3 text-xs max-w-[200px]">
      {label && <p className="font-semibold text-zinc-700 mb-2 truncate">{label}</p>}
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center gap-2 mt-1">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
          <span className="text-zinc-500">{p.name}:</span>
          <span className="font-semibold text-zinc-800 tabular-nums">{fmt(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Section header ───────────────────────────────────────────────────────────

const SectionHead = ({
  eyebrow,
  title,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  eyebrow: string;
  title: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) => (
  <div className="flex items-center gap-2.5 mb-4">
    <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0", iconBg)}>
      <Icon className={cn("w-4 h-4", iconColor)} />
    </div>
    <div>
      <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 leading-none mb-0.5">{eyebrow}</p>
      <p className="text-[13px] font-bold text-zinc-800 leading-none">{title}</p>
    </div>
  </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const DepartmentHeadDashboard: React.FC = () => {
  const { user } = useAuth();
  const deptId   = user?.dept_id;

  const { activePlan, loading: planLoading }         = useActiveBudgetPlan();
  const { programs, loading: aipLoading }             = useAipProgramData(activePlan?.budget_plan_id);
  const { items, amountMap, loading: expLoading }     = useExpenseData(activePlan?.budget_plan_id);

  // This dept's budget plan record (for semester data)
  const { data: deptPlan, isLoading: deptPlanLoading } = useQuery({
    queryKey: ["my-dept-plan", activePlan?.budget_plan_id, deptId],
    queryFn: () =>
      API.get("/department-budget-plans", {
        params: { budget_plan_id: activePlan?.budget_plan_id },
      }).then((r) =>
        (r.data?.data ?? []).find((p: any) => p.dept_id === deptId) ?? null
      ),
    enabled: !!activePlan && !!deptId,
  });

  // Plantilla positions for this dept
  const { data: plantilla = [], isLoading: plantillaLoading } = useQuery({
    queryKey: ["plantilla-my-dept", deptId],
    queryFn: () =>
      API.get("/plantilla-positions", {
        params: { include: "assignments.personnel" },
      }).then((r) =>
        (r.data?.data ?? []).filter((p: any) => p.dept_id === deptId)
      ),
    enabled: !!deptId,
  });

  const isLoading = planLoading || aipLoading || expLoading || deptPlanLoading;

  // ── Derived ───────────────────────────────────────────────────────────────

  const myPrograms = useMemo(
    () => programs.filter((p) => p.dept_id === deptId),
    [programs, deptId]
  );

  const totalBudget = useMemo(() => myPrograms.reduce((s, p) => s + p.total_amount, 0), [myPrograms]);
  const totalPS     = useMemo(() => myPrograms.reduce((s, p) => s + p.total_ps,     0), [myPrograms]);
  const totalMOOE   = useMemo(() => myPrograms.reduce((s, p) => s + p.total_mooe,   0), [myPrograms]);
  const totalCO     = useMemo(() => myPrograms.reduce((s, p) => s + p.total_co,     0), [myPrograms]);

  // Bar chart — top 6 programs
  const barData = useMemo(() =>
    [...myPrograms]
      .sort((a, b) => b.total_amount - a.total_amount)
      .slice(0, 6)
      .map((p) => ({
        name: p.program_description.length > 20
          ? p.program_description.slice(0, 20) + "…"
          : p.program_description,
        PS:   p.total_ps,
        MOOE: p.total_mooe,
        CO:   p.total_co,
      })),
    [myPrograms]
  );

  // Pie — expense classification for this dept
  const pieData = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach((item) => {
      const amt = amountMap.get(`${deptId}-${item.expense_class_item_id}`) ?? 0;
      if (amt > 0) map.set(item.classificationName, (map.get(item.classificationName) ?? 0) + amt);
    });
    return [...map.entries()]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [items, amountMap, deptId]);

  // Area — semester split across expense items
  const areaData = useMemo(() => {
    if (!deptPlan?.items) return [];
    return deptPlan.items
      .filter((i: any) => Number(i.total_amount) > 0)
      .slice(0, 8)
      .map((i: any) => ({
        name: (i.expense_item?.expense_class_item_name ?? `Item ${i.expense_item_id}`).slice(0, 14),
        Sem1: Number(i.sem1_amount),
        Sem2: Number(i.sem2_amount),
      }));
  }, [deptPlan]);

  // Radial — allocation %
  const radialData = useMemo(() => {
    if (!totalBudget) return [];
    return [
      { name: "PS",   value: pct(totalPS,   totalBudget), fill: "#6366f1" },
      { name: "MOOE", value: pct(totalMOOE, totalBudget), fill: "#22d3ee" },
      { name: "CO",   value: pct(totalCO,   totalBudget), fill: "#f59e0b" },
    ];
  }, [totalBudget, totalPS, totalMOOE, totalCO]);

  // Plantilla
  const filled   = (plantilla as any[]).filter((p) => p.assignments?.[0]?.personnel_id != null).length;
  const fillRate = pct(filled, plantilla.length);

  const PIE_COLORS = ["#6366f1", "#22d3ee", "#f59e0b", "#10b981", "#f43f5e", "#a78bfa"];

  const dept     = (user as any)?.department;
  const deptName = dept?.dept_name ?? "Your Department";
  const deptAbbr = dept?.dept_abbreviation ?? "";

  const statusCfg: Record<string, { label: string; cls: string }> = {
    draft:     { label: "Draft",     cls: "text-amber-700 bg-amber-50 border-amber-200"          },
    submitted: { label: "Submitted", cls: "text-blue-700 bg-blue-50 border-blue-200"             },
    approved:  { label: "Approved",  cls: "text-emerald-700 bg-emerald-50 border-emerald-200"    },
  };
  const planStatus = deptPlan?.status ?? "draft";
  const sCfg       = statusCfg[planStatus] ?? statusCfg.draft;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes dhReveal {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .dh-reveal {
          opacity: 0;
          animation: dhReveal .42s cubic-bezier(.22,.68,0,1.2) both;
          animation-delay: var(--d, 0ms);
        }
        @media (prefers-reduced-motion: reduce) {
          .dh-reveal { animation: none; opacity: 1; }
        }
      `}</style>

      <div className="min-h-screen bg-zinc-50/50 p-6 pb-20">

        {/* ── Page header ───────────────────────────────────────────── */}
        <Reveal delay={0}>
          <div className="flex items-start justify-between mb-7">
            <div>
              <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-400">
                {deptAbbr ? `${deptAbbr} · ` : ""}Department Dashboard
              </span>
              <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight mt-0.5 leading-tight">
                {deptName}
              </h1>
              <p className="text-[12px] text-zinc-400 mt-0.5">
                FY {activePlan?.year ?? "—"} &nbsp;·&nbsp; Budget Overview
              </p>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {deptPlan && !isLoading && (
                <span className={cn("text-[11px] font-semibold px-2.5 py-1 rounded-full border", sCfg.cls)}>
                  {sCfg.label}
                </span>
              )}
              {deptPlan && !isLoading && (
                <Link
                  to={`/department-budget-plans/${deptPlan.dept_budget_plan_id}`}
                  className="text-[12px] font-semibold text-zinc-700 bg-white border border-zinc-200 hover:border-zinc-300 hover:bg-zinc-50 transition-colors px-3 py-1.5 rounded-xl shadow-sm"
                >
                  Open Budget →
                </Link>
              )}
            </div>
          </div>
        </Reveal>

        {/* ── No active plan notice ──────────────────────────────────── */}
        {!planLoading && !activePlan && (
          <Reveal delay={40}>
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
              <InformationCircleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-zinc-900">No active budget plan</p>
                <p className="text-[11px] text-zinc-500 mt-0.5">
                  The admin hasn't activated a budget plan yet.
                </p>
              </div>
            </div>
          </Reveal>
        )}

        {/* ── Stat cards ────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[...Array(4)].map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard
              icon={CurrencyDollarIcon}
              label="Total Budget"
              value={fmt(totalBudget)}
              sub={`${myPrograms.length} AIP program${myPrograms.length !== 1 ? "s" : ""}`}
              accent="blue"
              delay={60}
            />
            <StatCard
              icon={ArrowTrendingUpIcon}
              label="Personnel Services"
              value={fmt(totalPS)}
              sub={`${pct(totalPS, totalBudget)}% of total`}
              accent="violet"
              delay={110}
            />
            <StatCard
              icon={DocumentTextIcon}
              label="MOOE"
              value={fmt(totalMOOE)}
              sub={`${pct(totalMOOE, totalBudget)}% of total`}
              accent="cyan"
              delay={160}
            />
            <StatCard
              icon={UserGroupIcon}
              label="Plantilla Fill Rate"
              value={plantillaLoading ? "—" : `${fillRate}%`}
              sub={plantillaLoading ? "Loading…" : `${filled} of ${plantilla.length} positions`}
              accent="emerald"
              delay={210}
            />
          </div>
        )}

        {/* ── Row 2: Radial + Grouped Bar ───────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">

          {/* Radial: PS/MOOE/CO split */}
          {isLoading ? (
            <ChartSkeleton h="h-56" />
          ) : (
            <Reveal delay={260}>
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full">
                <SectionHead
                  eyebrow="Allocation"
                  title="PS / MOOE / CO Split"
                  icon={CurrencyDollarIcon}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                />
                {radialData.length === 0 ? (
                  <div className="h-48 flex items-center justify-center text-zinc-300 text-sm">No data yet</div>
                ) : (
                  <>
                    <ResponsiveContainer width="100%" height={180}>
                      <RadialBarChart
                        cx="50%" cy="50%"
                        innerRadius="28%" outerRadius="88%"
                        data={radialData}
                        startAngle={90} endAngle={-270}
                      >
                        <RadialBar
                          dataKey="value"
                          cornerRadius={5}
                          background={{ fill: "#f4f4f5" }}
                          label={{ position: "insideStart", fill: "#fff", fontSize: 10, fontWeight: 700 }}
                        />
                        <Legend
                          iconType="circle" iconSize={7}
                          formatter={(v) => <span className="text-[11px] text-zinc-500">{v}</span>}
                        />
                        <Tooltip
                          formatter={(v: number) => [`${v}%`]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 11 }}
                        />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div className="grid grid-cols-3 gap-1.5 mt-1">
                      {[
                        { label: "PS",   val: fmt(totalPS),   color: "text-indigo-600", bg: "bg-indigo-50" },
                        { label: "MOOE", val: fmt(totalMOOE), color: "text-cyan-600",   bg: "bg-cyan-50"   },
                        { label: "CO",   val: fmt(totalCO),   color: "text-amber-600",  bg: "bg-amber-50"  },
                      ].map((d) => (
                        <div key={d.label} className={cn("rounded-xl py-2 text-center", d.bg)}>
                          <p className={cn("text-[13px] font-bold tabular-nums", d.color)}>{d.val}</p>
                          <p className="text-[10px] text-zinc-400 font-semibold">{d.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </Reveal>
          )}

          {/* Bar: top AIP programs */}
          {isLoading ? (
            <div className="lg:col-span-2"><ChartSkeleton h="h-56" /></div>
          ) : (
            <Reveal delay={310} className="lg:col-span-2">
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full">
                <SectionHead
                  eyebrow="AIP Programs"
                  title="Top Programs by Expenditure Type"
                  icon={ClipboardDocumentListIcon}
                  iconBg="bg-violet-50"
                  iconColor="text-violet-600"
                />
                {barData.length === 0 ? (
                  <div className="h-52 flex items-center justify-center text-zinc-300 text-sm">No AIP programs for this department</div>
                ) : (
                  <ResponsiveContainer width="100%" height={230}>
                    <BarChart data={barData} margin={{ top: 0, right: 8, left: 0, bottom: 36 }} barSize={9} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#a1a1aa" }}
                        angle={-30} textAnchor="end" interval={0}
                        tickLine={false} axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#a1a1aa" }}
                        tickFormatter={fmt}
                        tickLine={false} axisLine={false} width={54}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Bar dataKey="PS"   name="PS"   fill="#6366f1" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="MOOE" name="MOOE" fill="#22d3ee" radius={[3, 3, 0, 0]} />
                      <Bar dataKey="CO"   name="CO"   fill="#f59e0b" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {/* ── Row 3: Semester area + Expense pie ────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">

          {/* Area: Sem 1 vs Sem 2 */}
          {isLoading ? <ChartSkeleton h="h-44" /> : (
            <Reveal delay={360}>
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
                <SectionHead
                  eyebrow="Semester Split"
                  title="Sem 1 vs Sem 2 Distribution"
                  icon={ArrowTrendingUpIcon}
                  iconBg="bg-cyan-50"
                  iconColor="text-cyan-600"
                />
                {areaData.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-zinc-300 text-sm">No semester data</div>
                ) : (
                  <ResponsiveContainer width="100%" height={190}>
                    <AreaChart data={areaData} margin={{ top: 0, right: 8, left: 0, bottom: 24 }}>
                      <defs>
                        <linearGradient id="gSem1" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#6366f1" stopOpacity={0}    />
                        </linearGradient>
                        <linearGradient id="gSem2" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%"  stopColor="#22d3ee" stopOpacity={0.18} />
                          <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}    />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9, fill: "#a1a1aa" }}
                        angle={-25} textAnchor="end" interval={0}
                        tickLine={false} axisLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 9, fill: "#a1a1aa" }}
                        tickFormatter={fmt}
                        tickLine={false} axisLine={false} width={50}
                      />
                      <Tooltip content={<ChartTip />} />
                      <Area type="monotone" dataKey="Sem1" name="Sem 1" stroke="#6366f1" strokeWidth={2} fill="url(#gSem1)" dot={false} />
                      <Area type="monotone" dataKey="Sem2" name="Sem 2" stroke="#22d3ee" strokeWidth={2} fill="url(#gSem2)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </Reveal>
          )}

          {/* Pie: expense classification */}
          {isLoading ? <ChartSkeleton h="h-44" /> : (
            <Reveal delay={400}>
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
                <SectionHead
                  eyebrow="Expense Classification"
                  title="MOOE Category Breakdown"
                  icon={DocumentTextIcon}
                  iconBg="bg-amber-50"
                  iconColor="text-amber-600"
                />
                {pieData.length === 0 ? (
                  <div className="h-44 flex items-center justify-center text-zinc-300 text-sm">No expense data</div>
                ) : (
                  <div className="flex items-center gap-4">
                    <ResponsiveContainer width={160} height={160}>
                      <PieChart>
                        <Pie
                          data={pieData}
                          cx="50%" cy="50%"
                          innerRadius={42} outerRadius={70}
                          dataKey="value"
                          stroke="none"
                          paddingAngle={2}
                        >
                          {pieData.map((_, i) => (
                            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(v: number) => [fmt(v)]}
                          contentStyle={{ borderRadius: 12, border: "1px solid #e4e4e7", fontSize: 11 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-2 min-w-0">
                      {pieData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                          />
                          <span className="text-[11px] text-zinc-500 truncate flex-1">{d.name}</span>
                          <span className="text-[11px] font-semibold text-zinc-700 tabular-nums">{fmt(d.value)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          )}
        </div>

        {/* ── Row 4: Plantilla + AIP table ──────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Plantilla */}
          {plantillaLoading ? <ChartSkeleton h="h-36" /> : (
            <Reveal delay={440}>
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full">
                <SectionHead
                  eyebrow="Plantilla"
                  title="Staffing Status"
                  icon={UserGroupIcon}
                  iconBg="bg-emerald-50"
                  iconColor="text-emerald-600"
                />
                {/* Fill bar */}
                <div className="mb-3">
                  <div className="h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 rounded-full transition-[width] duration-700"
                      style={{ width: `${fillRate}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-[10px] mt-1.5">
                    <span className="text-zinc-400">{filled} filled</span>
                    <span className="font-bold text-emerald-600">{fillRate}%</span>
                    <span className="text-zinc-400">{(plantilla as any[]).length - filled} vacant</span>
                  </div>
                </div>
                {/* Position rows */}
                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                  {(plantilla as any[]).slice(0, 8).map((pos) => {
                    const assigned = pos.assignments?.[0]?.personnel_id != null;
                    return (
                      <div key={pos.plantilla_position_id} className="flex items-center gap-2 py-1">
                        <span className={cn(
                          "w-1.5 h-1.5 rounded-full flex-shrink-0",
                          assigned ? "bg-emerald-400" : "bg-zinc-200"
                        )} />
                        <span className="text-[11px] text-zinc-600 truncate flex-1">{pos.position_title}</span>
                        <span className="text-[10px] text-zinc-400 tabular-nums font-mono">SG {pos.salary_grade}</span>
                      </div>
                    );
                  })}
                  {(plantilla as any[]).length > 8 && (
                    <p className="text-center text-[10px] text-zinc-400 pt-1">
                      +{(plantilla as any[]).length - 8} more positions
                    </p>
                  )}
                  {(plantilla as any[]).length === 0 && (
                    <p className="text-center text-[11px] text-zinc-300 py-4">No positions found</p>
                  )}
                </div>
              </div>
            </Reveal>
          )}

          {/* AIP program summary table */}
          {isLoading ? (
            <div className="lg:col-span-2"><ChartSkeleton h="h-36" /></div>
          ) : (
            <Reveal delay={480} className="lg:col-span-2">
              <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full">
                <SectionHead
                  eyebrow="Programs"
                  title="AIP Program Summary"
                  icon={ClipboardDocumentListIcon}
                  iconBg="bg-indigo-50"
                  iconColor="text-indigo-600"
                />
                {myPrograms.length === 0 ? (
                  <div className="h-32 flex items-center justify-center text-zinc-300 text-sm">
                    No AIP programs found for this department
                  </div>
                ) : (
                  <div className="overflow-x-auto -mx-1">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="border-b border-zinc-100">
                          {["Program", "PS", "MOOE", "CO", "Total"].map((h, i) => (
                            <th
                              key={h}
                              className={cn(
                                "pb-2 font-semibold text-[10px] uppercase tracking-wide text-zinc-400",
                                i === 0 ? "text-left" : "text-right"
                              )}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {myPrograms.map((prog) => (
                          <tr key={prog.aip_program_id} className="hover:bg-zinc-50/70 transition-colors">
                            <td className="py-2 pr-3">
                              <div className="flex items-center gap-1.5">
                                {prog.aip_reference_code && (
                                  <span className="font-mono text-[9px] bg-zinc-100 text-zinc-400 px-1.5 py-0.5 rounded-md flex-shrink-0">
                                    {prog.aip_reference_code}
                                  </span>
                                )}
                                <span className="text-zinc-700 font-medium truncate max-w-[180px]">
                                  {prog.program_description}
                                </span>
                              </div>
                            </td>
                            <td className="py-2 text-right tabular-nums text-indigo-600 font-medium">{fmt(prog.total_ps)}</td>
                            <td className="py-2 text-right tabular-nums text-cyan-600   font-medium">{fmt(prog.total_mooe)}</td>
                            <td className="py-2 text-right tabular-nums text-amber-600  font-medium">{fmt(prog.total_co)}</td>
                            <td className="py-2 text-right tabular-nums text-zinc-900   font-bold">{fmt(prog.total_amount)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t-2 border-zinc-200">
                          <td className="pt-2.5 pb-1 font-bold text-zinc-700 text-[11px]">Total</td>
                          <td className="pt-2.5 pb-1 text-right tabular-nums font-bold text-indigo-700">{fmt(totalPS)}</td>
                          <td className="pt-2.5 pb-1 text-right tabular-nums font-bold text-cyan-700">{fmt(totalMOOE)}</td>
                          <td className="pt-2.5 pb-1 text-right tabular-nums font-bold text-amber-700">{fmt(totalCO)}</td>
                          <td className="pt-2.5 pb-1 text-right tabular-nums font-bold text-zinc-900">{fmt(totalBudget)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                )}
              </div>
            </Reveal>
          )}
        </div>

      </div>
    </>
  );
};

export default DepartmentHeadDashboard;