import React, { useMemo, useState, useEffect } from "react";
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
    PieChart,
    Pie,
    Cell,
    Legend,
} from "recharts";
import { useAuth } from "@/src/hooks/useAuth";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { useAipProgramData } from "@/src/hooks/useAipProgramData";
import { useExpenseTotals } from "@/src/hooks/useExpenseTotals";
import { usePreviousYearDeptTotal } from "@/src/hooks/usePreviousYearDeptTotal";
import { useQuery } from "@tanstack/react-query";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { X } from "lucide-react";
import {
    CurrencyDollarIcon,
    UserGroupIcon,
    DocumentTextIcon,
    ArrowTrendingUpIcon,
    ClipboardDocumentListIcon,
    InformationCircleIcon,
    BuildingOfficeIcon,
    ExclamationTriangleIcon,
    BuildingStorefrontIcon,
    ArrowTrendingDownIcon,
} from "@heroicons/react/24/outline";
import { useIsMobile } from "@/src/hooks/use-mobile";
import { AnnouncementsCarousel } from "@/src/components/cards/AnnouncementsCarousel";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n >= 1_000_000
        ? `₱${(n / 1_000_000).toFixed(2)}M`
        : n >= 1_000
          ? `₱${(n / 1_000).toFixed(1)}K`
          : `₱${n.toFixed(0)}`;

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

const fmtFull = (n: number) =>
    `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const CLASS_PS   = "Personal Services";
const CLASS_MOOE = "Maintenance and Other Operating Expenses";
const CLASS_CO   = "Capital Outlay";

// ─── Skeleton pieces ─────────────────────────────────────────────────────────

const Shimmer = ({ className }: { className?: string }) => (
    <div className={cn("rounded-lg bg-muted animate-pulse", className)} />
);

const CardSkeleton = () => (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm space-y-3">
        <Shimmer className="h-7 w-7 rounded-md" />
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-7 w-28" />
        <Shimmer className="h-2.5 w-full" />
    </div>
);

const ChartSkeleton = ({ h = "h-52" }: { title?: string; h?: string }) => (
    <div className="bg-card border border-border rounded-lg p-4 shadow-sm">
        <div className="space-y-1 mb-4">
            <Shimmer className="h-2.5 w-24" />
            <Shimmer className="h-4 w-36" />
        </div>
        <Shimmer className={cn(h, "w-full rounded-lg")} />
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
    rawValue: number;
    sub?: string;
    yoyChangePct?: number | null;
    previousValue?: number | null;
    previousYear?: number;
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
    icon: Icon,
    label,
    value,
    rawValue,
    sub,
    yoyChangePct,
    previousValue,
    previousYear,
    accent = "blue",
    delay = 0,
}) => {
    const a = accentMap[accent];
    const isMobile = useIsMobile();
    return (
        <Reveal delay={delay}>
            <div className={cn("bg-card border border-border rounded-lg shadow-sm hover:shadow-md transition-shadow h-full", isMobile ? "p-3.5" : "p-4")}>
                <div className={cn("rounded-md flex items-center justify-center flex-shrink-0", a.tile, isMobile ? "w-7 h-7 mb-2" : "w-7 h-7 mb-3")}>
                    <Icon className={cn(isMobile ? "w-3.5 h-3.5" : "w-3.5 h-3.5", a.icon)} />
                </div>
                <p className="text-eyebrow mb-1">
                    {label}
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <p className={cn("font-semibold text-foreground tabular-nums leading-none", isMobile ? "text-[18px]" : "text-[22px]")}>
                        {value}
                    </p>
                    {yoyChangePct != null && (
                        <span
                            className={cn(
                                "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                yoyChangePct >= 0
                                    ? "text-emerald-700 bg-emerald-50"
                                    : "text-red-700 bg-red-50",
                            )}
                            title={
                                previousValue != null
                                    ? `vs FY ${(previousYear ?? 0)}: ${fmt(previousValue)}`
                                    : undefined
                            }
                        >
                            {yoyChangePct >= 0 ? (
                                <ArrowTrendingUpIcon className="w-3 h-3" />
                            ) : (
                                <ArrowTrendingDownIcon className="w-3 h-3" />
                            )}
                            {Math.abs(yoyChangePct).toFixed(2)}%
                        </span>
                    )}
                </div>
                <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{fmtFull(rawValue)}</p>
                {sub && (
                    <p className={cn("text-[11px] text-muted-foreground leading-snug", isMobile ? "mt-1" : "mt-1.5")}>{sub}</p>
                )}
            </div>
        </Reveal>
    );
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const ChartTip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const total = payload.reduce((s: number, p: any) => s + (p.value ?? 0), 0);
    return (
        <div className="bg-white border border-border rounded-xl shadow-lg p-3 text-xs max-w-[220px]">
            {label && <p className="font-semibold text-foreground/80 mb-2 truncate">{label}</p>}
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 mt-1">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.color }} />
                    <span className="text-muted-foreground">{p.name}:</span>
                    <span className="font-semibold text-foreground tabular-nums">{fmt(p.value)}</span>
                </div>
            ))}
            {payload.length > 1 && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-muted-foreground" />
                    <span className="text-muted-foreground">Total:</span>
                    <span className="font-bold text-foreground tabular-nums">{fmt(total)}</span>
                </div>
            )}
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
    <div className="flex items-center gap-2 mb-4">
        <div className={cn("w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0", iconBg)}>
            <Icon className={cn("w-3.5 h-3.5", iconColor)} />
        </div>
        <div>
            <p className="text-eyebrow leading-none mb-0.5">
                {eyebrow}
            </p>
            <p className="text-section-title leading-none">{title}</p>
        </div>
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const DepartmentHeadDashboard: React.FC = () => {
    const isMobile = useIsMobile();
    const { user } = useAuth();
    const deptId = user?.dept_id;

    const { activePlan, loading: planLoading } = useActiveBudgetPlan();
    const { programs, loading: aipLoading } = useAipProgramData(activePlan?.budget_plan_id, deptId);
    const { data: expenseTotals, isLoading: expLoading } = useExpenseTotals(activePlan?.budget_plan_id, deptId);
    const deptPlan = expenseTotals?.dept_budget_plan_id
        ? { dept_budget_plan_id: expenseTotals.dept_budget_plan_id, status: expenseTotals.status }
        : null;
    const {
        previousTotal,
        previousPS,
        previousMOOE,
        previousCO,
        loading: prevYearLoading,
    } = usePreviousYearDeptTotal(deptId ?? undefined, activePlan?.year);

    const [showDraftAlert, setShowDraftAlert] = useState(false);





    const isSpecialAccountDept = useMemo(() => {
        if (!user || (user as any).role !== "department-head") return false;
        const d = (user as any)?.department;
        if (!d) return false;
        const n = d.dept_name?.toLowerCase() ?? "";
        const c = d.dept_abbreviation?.toLowerCase() ?? "";
        return (
            n.includes("opol community college") ||
            n.includes("slaughterhouse") ||
            n.includes("public market") ||
            c === "occ" || c === "pm" || c === "sh"
        );
    }, [user]);

const deptSource = useMemo(() => {
    const abbr = ((user as any)?.department?.dept_abbreviation ?? "").toLowerCase();
    return abbr; // "occ", "sh", or "pm"
}, [user]);

const { data: specialFund, isLoading: specialFundLoading } = useQuery({
    queryKey: ["special-fund-my-dept", deptSource, activePlan?.budget_plan_id],
    queryFn: () =>
        API.get("/income-fund", {
            params: { source: deptSource },
        }).then((r) => r.data?.data ?? r.data ?? []),
    enabled: !!deptSource && !!activePlan && isSpecialAccountDept,
});

const { data: ldrrmfSummary } = useQuery({
    queryKey: ["ldrrmf-summary-dept", deptSource, activePlan?.budget_plan_id],
    queryFn: () =>
        API.get("/ldrrmfip/summary", {
            params: {
                budget_plan_id: activePlan?.budget_plan_id,
                source: deptSource,
            },
        }).then((r) => {
            const d = r.data?.data ?? r.data ?? {};
            return { allocated70: Number(d.total_70pct ?? 0) };
        }).catch(() => ({ allocated70: 0 })),
    enabled: !!deptSource && !!activePlan && isSpecialAccountDept,
});

const sfAllocated70 = ldrrmfSummary?.allocated70 ?? 0;

    const { total: sfTotal, nonTaxRevenue: sfNonTax } = useMemo(() => {
        const allItems: any[] = Array.isArray(specialFund) ? specialFund : [];
        if (!allItems.length) return { total: 0, nonTaxRevenue: 0 };

        const parentIds = new Set(allItems.map((i: any) => i.parent_id).filter(Boolean));
        const leaves = allItems.filter((i: any) => !parentIds.has(i.id) && i.proposed != null);
        const total = leaves.reduce((s: number, i: any) => s + parseFloat(i.proposed ?? 0), 0);

        // REPLACE WITH
const nonTaxNode = allItems.find(
    (i: any) => i.name?.toLowerCase().includes("non-tax") && parentIds.has(i.id),
);
        const desc = new Set<number>();
        if (nonTaxNode) {
            const queue = [nonTaxNode.id];
            while (queue.length) {
                const pid = queue.shift()!;
                allItems.forEach((i: any) => {
                    if (i.parent_id === pid) { desc.add(i.id); queue.push(i.id); }
                });
            }
        }
        const nonTaxRevenue = leaves
            .filter((i: any) => desc.has(i.id))
            .reduce((s: number, i: any) => s + parseFloat(i.proposed ?? 0), 0);

        return { total, nonTaxRevenue };
    }, [specialFund]);

    const isLoading = planLoading || aipLoading || expLoading;

    useEffect(() => {
        if (!isLoading && deptPlan && deptPlan.status === "draft" && activePlan) {
            setShowDraftAlert(true);
        }
    }, [isLoading, deptPlan, activePlan]);

    // ── Derived ───────────────────────────────────────────────────────────────

    // `programs` is already scoped server-side to this department (see useAipProgramData call above)
    const myPrograms = programs;

    const totalExpensePS   = expenseTotals?.ps ?? 0;
    const totalExpenseMOOE = expenseTotals?.mooe ?? 0;
    const totalExpenseCO   = expenseTotals?.co ?? 0;
    const totalExpense     = expenseTotals?.total ?? 0;

    const aipTotalPS   = useMemo(() => myPrograms.reduce((s, p) => s + p.total_ps, 0), [myPrograms]);
    const aipTotalMOOE = useMemo(() => myPrograms.reduce((s, p) => s + p.total_mooe, 0), [myPrograms]);
    const aipTotalCO   = useMemo(() => myPrograms.reduce((s, p) => s + p.total_co, 0), [myPrograms]);
    const aipTotal     = useMemo(() => myPrograms.reduce((s, p) => s + p.total_amount, 0), [myPrograms]);

    const totalProposedExpenditure = totalExpense + aipTotal;

    // Year-over-year % change vs the prior year's plan for this department.
    // null means "no comparison available" (no prior plan, or prior total was 0).
    const yoyChangePct = useMemo(() => {
        if (previousTotal == null || previousTotal === 0) return null;
        return ((totalProposedExpenditure - previousTotal) / previousTotal) * 100;
    }, [totalProposedExpenditure, previousTotal]);

    const yoyPSChangePct = useMemo(() => {
        if (previousPS == null || previousPS === 0) return null;
        return ((totalExpensePS - previousPS) / previousPS) * 100;
    }, [totalExpensePS, previousPS]);

    const yoyMOOEChangePct = useMemo(() => {
        if (previousMOOE == null || previousMOOE === 0) return null;
        return ((totalExpenseMOOE - previousMOOE) / previousMOOE) * 100;
    }, [totalExpenseMOOE, previousMOOE]);

    const yoyCOChangePct = useMemo(() => {
        if (previousCO == null || previousCO === 0) return null;
        return ((totalExpenseCO - previousCO) / previousCO) * 100;
    }, [totalExpenseCO, previousCO]);

    const barData = useMemo(
        () =>
            [...myPrograms]
                .sort((a, b) => b.total_amount - a.total_amount)
                .slice(0, 6)
                .map((p) => ({
                    name:
                        p.program_description.length > 20
                            ? p.program_description.slice(0, 20) + "…"
                            : p.program_description,
                    PS: p.total_ps,
                    MOOE: p.total_mooe,
                    CO: p.total_co,
                })),
        [myPrograms],
    );

    const pieData = useMemo(
        () =>
            [
                { name: "Personal Services", value: totalExpensePS,   color: "hsl(var(--cat-1))" },
                { name: "MOOE",              value: totalExpenseMOOE, color: "hsl(var(--fin-income))" },
                { name: "Capital Outlay",    value: totalExpenseCO,   color: "hsl(var(--fin-mdf))" },
            ].filter((d) => d.value > 0),
        [totalExpensePS, totalExpenseMOOE, totalExpenseCO],
    );

    const radialData = useMemo(() => {
        if (!aipTotal) return [];
        return [
            { name: "PS",   value: pct(aipTotalPS,   aipTotal), fill: "hsl(var(--cat-1))" },
            { name: "MOOE", value: pct(aipTotalMOOE, aipTotal), fill: "hsl(var(--fin-income))" },
            { name: "CO",   value: pct(aipTotalCO,   aipTotal), fill: "hsl(var(--fin-mdf))" },
        ];
    }, [aipTotal, aipTotalPS, aipTotalMOOE, aipTotalCO]);

    

    const dept     = (user as any)?.department;
    const deptName = dept?.dept_name ?? "Your Department";
    const deptAbbr = dept?.dept_abbreviation ?? "";

    // REPLACE WITH
const isSpecialAccount = isSpecialAccountDept;
const sfCal    = sfNonTax * 0.05;          // mandatory appropriation
const sfQrf    = sfCal * 0.30;
const sfPredis = sfCal * 0.70;
const sfExp    = totalExpense + sfCal;     // expense items + calamity fund
const sfUnap   = sfTotal - sfExp;          // simplified: total - (items + cal)
    const sfUPos   = sfUnap >= 0;
    // REPLACE WITH — Expenditures slice = items only, Calamity is separate slice
const sfPieData =
    sfTotal > 0
        ? [
              { name: "Expenditures",           value: totalExpense,        color: "hsl(var(--muted-foreground))" },
              { name: "5% Calamity",            value: sfCal,               color: "hsl(var(--fin-qrf))" },
              { name: "Unappropriated Balance", value: Math.max(0, sfUnap), color: "hsl(var(--chart-2))" },
          ].filter((d) => d.value > 0)
        : [];

    // const statusCfg: Record<string, { label: string; cls: string }> = {
    //     draft:     { label: "Draft",     cls: "text-amber-700 bg-amber-50 border-amber-200"       },
    //     submitted: { label: "Submitted", cls: "text-blue-700 bg-blue-50 border-blue-200"          },
    //     approved:  { label: "Approved",  cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    // };

    const statusCfg: Record<string, { label: string; cls: string }> = {
        draft:         { label: "Draft",         cls: "text-amber-700 bg-amber-50 border-amber-200"       },
        submitted:     { label: "Submitted",     cls: "text-blue-700 bg-blue-50 border-blue-200"          },
        under_review:  { label: "Under Review",  cls: "text-violet-700 bg-violet-50 border-violet-200"    },
        approved:      { label: "Approved",      cls: "text-emerald-700 bg-emerald-50 border-emerald-200" },
    };

    const planStatus = deptPlan?.status ?? "draft";
    const sCfg = statusCfg[planStatus] ?? statusCfg.draft;

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

            <div className="min-h-screen bg-muted/30 p-3 sm:p-5 pb-20">

                {/* ── Page header ───────────────────────────────────────────── */}
                <Reveal delay={0}>
                    <div className="flex items-end justify-between gap-4 mb-4">
                        <div className="flex-shrink-0">
                            <p className="text-eyebrow">
                                {new Date().toLocaleDateString("en-US", {
                                    weekday: "long",
                                    year: "numeric",
                                    month: "long",
                                    day: "numeric",
                                })}
                            </p>
                            <h1 className="text-page-title">
                                Overview
                            </h1>
                        </div>
                        <div className="flex-1 min-w-0">
                            <AnnouncementsCarousel />
                        </div>
                    </div>
                </Reveal>

                {/* ── No active plan notice ──────────────────────────────────── */}
                {!planLoading && !activePlan && (
                    <Reveal delay={40}>
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3 mb-4">
                            <InformationCircleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-foreground">No active budget plan</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">
                                    The admin hasn't activated a budget plan yet.
                                </p>
                            </div>
                        </div>
                    </Reveal>
                )}

                {/* ── Row 1: Stat cards ─────────────────────────────────────── */}
                {isLoading ? (
                    <div className={cn(isMobile ? "grid grid-cols-2 gap-3" : "flex gap-3 sm:gap-4", "mb-4")}>
                        {[...Array(5)].map((_, i) => <CardSkeleton key={i} />)}
                    </div>
                ) : (
                    <div className={cn(
                        isMobile ? "grid grid-cols-2 gap-3" : "flex gap-3 sm:gap-4 items-stretch",
                        "mb-4",
                    )}>

                        {/* Budget plan year */}
                        <Reveal delay={40} className={isMobile ? "" : "flex-shrink-0 w-[190px]"}>
                            <div className="bg-card border border-border rounded-lg p-3.5 shadow-sm hover:shadow-md transition-shadow h-full relative overflow-hidden">
                                <span className="absolute top-3.5 right-3.5 flex h-1.5 w-1.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                </span>
                                <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center mb-3 flex-shrink-0">
                                    <DocumentTextIcon className="w-3.5 h-3.5 text-blue-500" />
                                </div>
                                <p className="text-eyebrow mb-1">
                                    Budget Plan Year
                                </p>
                                <p className="text-metric leading-none">
                                    {activePlan ? `${activePlan.year}` : "—"}
                                </p>
                                <p className="text-metric-support mt-1.5">
                                    {activePlan ? "Currently active" : "No active plan"}
                                </p>
                            </div>
                        </Reveal>

                        {!isMobile && <div className="w-px bg-border my-2 flex-shrink-0" />}

                        {/* Total proposed expenditure */}
                        <Reveal delay={60} className={cn(isMobile ? "col-span-2" : "flex-1")}>
                            {deptPlan ? (
                                <Link
                                    to={`/department-budget-plans/${deptPlan.dept_budget_plan_id}`}
                                    className="group bg-card border border-border rounded-lg p-4 shadow-sm hover:shadow-md hover:border-blue-300 transition-all h-full flex flex-col cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-7 h-7 rounded-md bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center flex-shrink-0">
                                            <CurrencyDollarIcon className="w-3.5 h-3.5 text-blue-600" />
                                        </div>
                                        <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded-full border", sCfg.cls)}>
                                            {sCfg.label}
                                        </span>
                                    </div>
                                    <p className="text-eyebrow mb-1">
                                        Total Proposed Expenditure
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-metric leading-none">
                                            {fmt(totalProposedExpenditure)}
                                        </p>
                                        {!prevYearLoading && yoyChangePct !== null && (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                                    yoyChangePct >= 0
                                                        ? "text-emerald-700 bg-emerald-50"
                                                        : "text-red-700 bg-red-50",
                                                )}
                                                title={`vs FY ${(activePlan?.year ?? 0) - 1}: ${fmt(previousTotal ?? 0)}`}
                                            >
                                                {yoyChangePct >= 0 ? (
                                                    <ArrowTrendingUpIcon className="w-3 h-3" />
                                                ) : (
                                                    <ArrowTrendingDownIcon className="w-3 h-3" />
                                                )}
                                                {Math.abs(yoyChangePct).toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{fmtFull(totalProposedExpenditure)}</p>
                                    <p className="text-metric-support mt-1 group-hover:text-blue-500 transition-colors">
                                        Expense items + Special programs →
                                    </p>
                                </Link>
                            ) : (
                                <div className="bg-card border border-border rounded-lg p-4 shadow-sm h-full flex flex-col">
                                    <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center mb-3 flex-shrink-0">
                                        <CurrencyDollarIcon className="w-3.5 h-3.5 text-blue-600" />
                                    </div>
                                    <p className="text-eyebrow mb-1">
                                        Total Proposed Expenditure
                                    </p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <p className="text-metric leading-none">
                                            {fmt(totalProposedExpenditure)}
                                        </p>
                                        {!prevYearLoading && yoyChangePct !== null && (
                                            <span
                                                className={cn(
                                                    "inline-flex items-center gap-0.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full",
                                                    yoyChangePct >= 0
                                                        ? "text-emerald-700 bg-emerald-50"
                                                        : "text-red-700 bg-red-50",
                                                )}
                                                title={`vs FY ${(activePlan?.year ?? 0) - 1}: ${fmt(previousTotal ?? 0)}`}
                                            >
                                                {yoyChangePct >= 0 ? (
                                                    <ArrowTrendingUpIcon className="w-3 h-3" />
                                                ) : (
                                                    <ArrowTrendingDownIcon className="w-3 h-3" />
                                                )}
                                                {Math.abs(yoyChangePct).toFixed(2)}%
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{fmtFull(totalProposedExpenditure)}</p>
                                    <p className="text-metric-support mt-1">
                                        Expense items + Special programs
                                    </p>
                                </div>
                            )}
                        </Reveal>

                        <StatCard
                            icon={ArrowTrendingUpIcon}
                            label="Personnel Services"
                            value={fmt(totalExpensePS)}
                            rawValue={totalExpensePS}
                            sub={`${pct(totalExpensePS, totalExpense)}% of expense items`}
                            yoyChangePct={prevYearLoading ? undefined : yoyPSChangePct}
                            previousValue={previousPS}
                            previousYear={(activePlan?.year ?? 0) - 1}
                            accent="violet"
                            delay={110}
                        />
                        <StatCard
                            icon={DocumentTextIcon}
                            label="MOOE"
                            value={fmt(totalExpenseMOOE)}
                            rawValue={totalExpenseMOOE}
                            sub={`${pct(totalExpenseMOOE, totalExpense)}% of expense items`}
                            yoyChangePct={prevYearLoading ? undefined : yoyMOOEChangePct}
                            previousValue={previousMOOE}
                            previousYear={(activePlan?.year ?? 0) - 1}
                            accent="cyan"
                            delay={160}
                        />
                        <div className={isMobile ? "col-span-2" : "contents"}>
                            <StatCard
                                icon={BuildingOfficeIcon}
                                label="Capital Outlay"
                                value={fmt(totalExpenseCO)}
                                rawValue={totalExpenseCO}
                                sub={`${pct(totalExpenseCO, totalExpense)}% of expense items`}
                                yoyChangePct={prevYearLoading ? undefined : yoyCOChangePct}
                                previousValue={previousCO}
                                previousYear={(activePlan?.year ?? 0) - 1}
                                accent="amber"
                                delay={210}
                            />
                        </div>
                    </div>
                )}

                {/* ── Row 2: AIP Radial + Bar ────────────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 sm:gap-4 mb-4">

                    {/* Radial: AIP PS/MOOE/CO split */}
                    {isLoading ? (
                        <ChartSkeleton h="h-56" />
                    ) : (
                        <Reveal delay={260}>
                            <div className="bg-card border border-border rounded-lg p-4 shadow-sm h-full">
                                <SectionHead
                                    eyebrow="Special Program Allocation"
                                    title="PS / MOOE / CO"
                                    icon={CurrencyDollarIcon}
                                    iconBg="bg-indigo-50"
                                    iconColor="text-indigo-600"
                                />
                                {radialData.length === 0 ? (
                                    <div className="h-48 flex items-center justify-center text-muted-foreground/60 text-sm">
                                        No Special Program data yet
                                    </div>
                                ) : (
                                    <>
                                        <ResponsiveContainer width="100%" height={180}>
                                            <RadialBarChart
                                                cx="50%"
                                                cy="50%"
                                                innerRadius="28%"
                                                outerRadius="88%"
                                                data={radialData}
                                                startAngle={90}
                                                endAngle={-270}
                                            >
                                                <RadialBar
                                                    dataKey="value"
                                                    cornerRadius={5}
                                                    background={{ fill: "hsl(var(--muted))" }}
                                                    label={{
                                                        position: "insideStart",
                                                        fill: "#fff",
                                                        fontSize: 10,
                                                        fontWeight: 700,
                                                    }}
                                                />
                                                <Legend
                                                    iconType="circle"
                                                    iconSize={7}
                                                    formatter={(v) => (
                                                        <span className="text-[11px] text-muted-foreground">{v}</span>
                                                    )}
                                                />
                                                <Tooltip
                                                    formatter={(v: number) => [`${v}%`]}
                                                    contentStyle={{
                                                        borderRadius: 12,
                                                        border: "1px solid hsl(var(--border))",
                                                        fontSize: 11,
                                                    }}
                                                />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                                            {[
                                                { label: "PS",   val: fmt(aipTotalPS),   color: "text-indigo-600", bg: "bg-indigo-50" },
                                                { label: "MOOE", val: fmt(aipTotalMOOE), color: "text-cyan-600",   bg: "bg-cyan-50"   },
                                                { label: "CO",   val: fmt(aipTotalCO),   color: "text-amber-600", bg: "bg-amber-50"  },
                                            ].map((d) => (
                                                <div key={d.label} className={cn("rounded-lg py-2 text-center", d.bg)}>
                                                    <p className={cn("text-[13px] font-bold tabular-nums", d.color)}>
                                                        {d.val}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground font-semibold">{d.label}</p>
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
                        <div className="lg:col-span-2">
                            <ChartSkeleton h="h-56" />
                        </div>
                    ) : (
                        <Reveal delay={310} className="lg:col-span-2">
                            <div className="bg-card border border-border rounded-lg p-4 shadow-sm h-full">
                                <div className={cn("flex mb-4", isMobile ? "flex-col gap-3" : "items-start justify-between")}>
                                    <div className="flex items-center gap-2">
                                        <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0">
                                            <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-eyebrow leading-none mb-0.5">
                                                Special Programs
                                            </p>
                                            <p className="text-section-title leading-none">
                                                Programs by Expenditure
                                            </p>
                                        </div>
                                    </div>
                                    <div className={cn(isMobile ? "text-left" : "text-right flex-shrink-0 ml-3")}>
                                        <p className="text-eyebrow">
                                            Total Special Program Expenditures
                                        </p>
                                        <p className="text-[18px] font-semibold text-violet-600 tabular-nums leading-none">
                                            {fmt(aipTotal)}
                                        </p>
                                        <p className="text-[10px] text-muted-foreground mt-0.5">
                                            {myPrograms.length} program{myPrograms.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                {barData.length === 0 ? (
                                    <div className="h-52 flex items-center justify-center text-muted-foreground/60 text-sm">
                                        No Special programs for this department
                                    </div>
                                ) : (
                                    <ResponsiveContainer width="100%" height={230}>
                                        <BarChart
                                            data={barData}
                                            margin={{ top: 0, right: 8, left: 0, bottom: 36 }}
                                            barSize={9}
                                            barGap={2}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="hsl(var(--border))"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                                                angle={-30}
                                                textAnchor="end"
                                                interval={0}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                                                tickFormatter={fmt}
                                                tickLine={false}
                                                axisLine={false}
                                                width={54}
                                            />
                                            <Tooltip content={<ChartTip />} />
                                            <Bar dataKey="PS"   name="PS"   fill="hsl(var(--cat-1))" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="MOOE" name="MOOE" fill="hsl(var(--fin-income))" radius={[3, 3, 0, 0]} />
                                            <Bar dataKey="CO"   name="CO"   fill="hsl(var(--fin-mdf))" radius={[3, 3, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Reveal>
                    )}
                </div>

                {/* ── Row 4: Special Account Fund (conditional) ─────────────── */}
                {isSpecialAccount && (
                    <Reveal delay={460}>
                        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden mb-4">

                            <div className="px-4 pt-4 pb-3 border-b border-border flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0">
                                        <BuildingStorefrontIcon className="w-3.5 h-3.5 text-violet-500" />
                                    </div>
                                    <div>
                                        <p className="text-eyebrow leading-none mb-0.5">
                                            Estimated Revenue
                                        </p>
                                        <p className="text-section-title leading-none">
                                            Special Account · {deptAbbr || deptName}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 space-y-4">
                                <div className={cn("grid gap-3", isMobile ? "grid-cols-1" : "grid-cols-12")}>

                                    {/* Estimated Revenue */}
                                    <div className={cn(isMobile ? "" : "col-span-3", "bg-muted/40 rounded-lg border border-border p-3.5")}>
                                        <p className="text-eyebrow mb-2">
                                            Estimated Revenue
                                        </p>
                                        {specialFundLoading ? (
                                            <div className="h-7 w-24 rounded-lg bg-muted animate-pulse" />
                                        ) : (
                                            <>
                                                <p className="text-2xl font-semibold text-foreground tabular-nums leading-none">
                                                    {fmt(sfTotal)}
                                                </p>
                                                <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                                                    ₱{Math.round(sfTotal).toLocaleString("en-PH")}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Expenditures */}
                                    <div className={cn(isMobile ? "" : "col-span-3", "bg-muted/40 rounded-lg border border-border p-3.5")}>
                                        <p className="text-eyebrow mb-2 flex items-center gap-1">
                                            <ArrowTrendingDownIcon className="w-3 h-3 text-muted-foreground" />
                                            Expenditures
                                        </p>
                                        {expLoading ? (
                                            <div className="h-7 w-24 rounded-lg bg-muted animate-pulse" />
                                        ) : (
                                            <>
                                                <p className="text-2xl font-semibold text-foreground tabular-nums leading-none">
                                                    {fmt(sfExp)}
                                                </p>
                                                <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                                                    ₱{Math.round(sfExp).toLocaleString("en-PH")}
                                                </p>
                                            </>
                                        )}
                                    </div>

                                    {/* Pie + legend */}
                                    <div className={cn(isMobile ? "" : "col-span-6", "flex items-center gap-3")}>
                                        {specialFundLoading || expLoading ? (
                                            <div className="flex-1 flex items-center justify-center">
                                                <div className="w-24 h-24 rounded-full bg-muted animate-pulse" />
                                            </div>
                                        ) : sfPieData.length > 0 ? (
                                            <>
                                                <div className="w-[96px] flex-shrink-0">
                                                    <p className="text-eyebrow text-center mb-1">
                                                        Allocation
                                                    </p>
                                                    <ResponsiveContainer width="100%" height={88}>
                                                        <PieChart>
                                                            <Pie
                                                                data={sfPieData}
                                                                cx="50%"
                                                                cy="50%"
                                                                innerRadius={24}
                                                                outerRadius={42}
                                                                paddingAngle={2}
                                                                dataKey="value"
                                                                strokeWidth={0}
                                                            >
                                                                {sfPieData.map((e, i) => (
                                                                    <Cell key={i} fill={e.color} />
                                                                ))}
                                                            </Pie>
                                                            <Tooltip
                                                                formatter={(v: number) => [
                                                                    `₱${Math.round(v).toLocaleString("en-PH")}`,
                                                                ]}
                                                                contentStyle={{
                                                                    borderRadius: 12,
                                                                    border: "1px solid hsl(var(--border))",
                                                                    fontSize: 11,
                                                                }}
                                                            />
                                                        </PieChart>
                                                    </ResponsiveContainer>
                                                </div>

                                                <div className="flex-1 space-y-1.5 min-w-0">
                                                    <div className="flex items-center justify-between gap-1">
                                                        <div className="flex items-center gap-1.5 min-w-0">
                                                            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-muted-foreground" />
                                                            <span className="text-xs text-muted-foreground font-medium truncate">Expenditures</span>
                                                        </div>
                                                        <span className="text-xs text-foreground/80 font-semibold font-mono flex-shrink-0">
                                                            {fmt(sfExp)}
                                                        </span>
                                                    </div>

                                                    <div className="rounded-lg border border-border bg-muted/40 px-2 py-1.5 space-y-1">
                                                        <div className="flex items-center justify-between">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0 bg-fin-qrf" />
                                                                <span className="text-eyebrow">
                                                                    5% Calamity
                                                                </span>
                                                            </div>
                                                            <span className="text-[10px] font-semibold font-mono text-muted-foreground">
                                                                {fmt(sfCal)}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-center justify-between pl-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-1 h-1 rounded-full flex-shrink-0 bg-fin-qrf" />
                                                                <span className="text-[10px] text-muted-foreground">30% QRF</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-muted-foreground">{fmt(sfQrf)}</span>
                                                        </div>
                                                        <div className="flex items-center justify-between pl-3">
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="w-1 h-1 rounded-full flex-shrink-0 bg-fin-predisaster" />
                                                                <span className="text-[10px] text-muted-foreground">70% Pre-Disaster</span>
                                                            </div>
                                                            <span className="text-[10px] font-mono text-muted-foreground">{fmt(sfPredis)}</span>
                                                        </div>
                                                    </div>

                                                    {(() => {
                                                        const zero = Math.round(sfUnap * 100) === 0;
                                                        const pos = zero || sfUnap > 0;
                                                        return (
                                                            <div className="rounded-lg border border-border bg-card px-2 py-1.5">
                                                                <div className="flex items-center gap-1.5 mb-0.5">
                                                                    <span className={cn(
                                                                        "text-[9px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                                                                        pos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                                                                    )}>
                                                                        {zero ? "BALANCED" : pos ? "UNALLOCATED" : "OVER-APPROPRIATED"}
                                                                    </span>
                                                                </div>
                                                                <p className={cn(
                                                                    "text-sm font-semibold font-mono",
                                                                    pos ? "text-emerald-700" : "text-red-600",
                                                                )}>
                                                                    {pos ? "+" : ""}₱{Math.round(Math.abs(sfUnap)).toLocaleString("en-PH")}
                                                                </p>
                                                            </div>
                                                        );
                                                    })()}
                                                </div>
                                            </>
                                        ) : (
                                            <div className="flex-1 flex items-center justify-center opacity-20">
                                                <BuildingStorefrontIcon className="w-10 h-10 text-muted-foreground" />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* 5% Calamity Fund detail panel */}
                                {sfNonTax > 0 && (
                                    <div className="rounded-lg border border-border overflow-hidden">
                                        <div className="bg-muted/40 px-4 py-3 flex items-center justify-between border-b border-border">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                                                    <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-500" />
                                                </div>
                                                <div>
                                                    <p className="text-eyebrow">
                                                        5% Calamity Fund
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground mt-0.5">
                                                        of Non-Tax Revenue · R.A. 10121
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-base font-semibold text-foreground">
                                                    ₱{Math.round(sfCal).toLocaleString("en-PH")}
                                                </p>
                                                <p className="text-[10px] text-muted-foreground font-mono">budgeted</p>
                                            </div>
                                        </div>

                                        <div className={cn("grid bg-card", isMobile ? "grid-cols-1" : "grid-cols-2")}>
                                            <div className={cn("px-4 py-3 space-y-1.5", isMobile ? "border-b border-border" : "border-r border-border")}>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-eyebrow">
                                                        30% QRF
                                                    </p>
                                                    <span className="text-[9px] text-muted-foreground">
                                                        reserved
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        ₱{Math.round(sfQrf).toLocaleString("en-PH")}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        / ₱{Math.round(sfQrf).toLocaleString("en-PH")}
                                                    </p>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">reserved · not yet disbursed</p>
                                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-fin-qrf rounded-full" style={{ width: "100%" }} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground">Available</span>
                                                    <span className="text-[10px] font-medium font-mono">
                                                        ₱{Math.round(sfQrf).toLocaleString("en-PH")}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="px-4 py-3 space-y-1.5">
                                                <div className="flex items-center justify-between">
                                                    <p className="text-eyebrow">
                                                        70% Pre-Disaster
                                                    </p>
                                                    <span className="text-[9px] text-muted-foreground">
                                                        {sfPredis > 0 ? `${Math.round((sfAllocated70 / sfPredis) * 100)}%` : "0%"}
                                                    </span>
                                                </div>
                                                <div className="flex items-baseline gap-1">
                                                    <p className="text-sm font-semibold text-foreground">
                                                        ₱{Math.round(sfAllocated70).toLocaleString("en-PH")}
                                                    </p>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        / ₱{Math.round(sfPredis).toLocaleString("en-PH")}
                                                    </p>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground">allocated</p>
                                                <div className="h-1 bg-muted rounded-full overflow-hidden">
                                                    <div className="h-full bg-fin-predisaster rounded-full transition-all duration-700"
                                                        style={{ width: sfPredis > 0 ? `${Math.min(100, (sfAllocated70 / sfPredis) * 100)}%` : "0%" }} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-[10px] text-muted-foreground">Remaining</span>
                                                    <span className="text-[10px] font-medium font-mono">
                                                        ₱{Math.round(Math.max(0, sfPredis - sfAllocated70)).toLocaleString("en-PH")}
                                                    </span>
                                                </div>
                                                <p className="text-[10px] text-muted-foreground/60">JMC 2013-1 · R.A. 10121</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </Reveal>
                )}

                </div>

            {/* ── Draft Proposal Notification ────────────────────────────────── */}
            {showDraftAlert && deptPlan && deptPlan.status === "draft" && (
                <div className="fixed bottom-5 right-5 z-50 w-80 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div className="bg-card border border-amber-200 rounded-lg shadow-lg p-4 relative">
                        <button
                            onClick={() => setShowDraftAlert(false)}
                            className="absolute top-3 right-3 text-muted-foreground/50 hover:text-foreground transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-start gap-3 pr-4">
                            <div className="w-7 h-7 rounded-md bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <InformationCircleIcon className="w-3.5 h-3.5 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-foreground leading-tight">
                                    Draft Proposal
                                </p>
                                <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                                    You have an unsubmitted proposal for{" "}
                                    <span className="font-medium text-foreground/80">FY {activePlan?.year}</span>.
                                </p>
                                <Link
                                    to={`/department-budget-plans/${deptPlan.dept_budget_plan_id}`}
                                    className="inline-block mt-2 text-[11px] font-semibold text-foreground underline underline-offset-2 hover:text-muted-foreground"
                                    onClick={() => setShowDraftAlert(false)}
                                >
                                    Open draft →
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default DepartmentHeadDashboard;
