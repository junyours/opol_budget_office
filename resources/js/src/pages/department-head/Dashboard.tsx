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
import { useExpenseData } from "@/src/hooks/useExpenseData";
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
} from "@heroicons/react/24/outline";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    n >= 1_000_000
        ? `₱${(n / 1_000_000).toFixed(2)}M`
        : n >= 1_000
          ? `₱${(n / 1_000).toFixed(1)}K`
          : `₱${n.toFixed(0)}`;

const pct = (a: number, b: number) => (b === 0 ? 0 : Math.round((a / b) * 100));

// Classification name constants
const CLASS_PS = "Personal Services";
const CLASS_MOOE = "Maintenance and Other Operating Expenses";
const CLASS_CO = "Capital Outlay";

// ─── Skeleton pieces ─────────────────────────────────────────────────────────

const Shimmer = ({ className }: { className?: string }) => (
    <div className={cn("rounded-lg bg-zinc-100 animate-pulse", className)} />
);

const CardSkeleton = () => (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm space-y-3">
        <Shimmer className="h-9 w-9 rounded-xl" />
        <Shimmer className="h-3 w-20" />
        <Shimmer className="h-7 w-28" />
        <Shimmer className="h-2.5 w-full" />
    </div>
);

const ChartSkeleton = ({
    title,
    h = "h-52",
}: {
    title?: string;
    h?: string;
}) => (
    <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
        <div className="space-y-1 mb-4">
            <Shimmer className="h-2.5 w-24" />
            <Shimmer className="h-4 w-36" />
        </div>
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
    blue: { tile: "bg-blue-50", icon: "text-blue-600" },
    violet: { tile: "bg-violet-50", icon: "text-violet-600" },
    cyan: { tile: "bg-cyan-50", icon: "text-cyan-600" },
    emerald: { tile: "bg-emerald-50", icon: "text-emerald-600" },
    amber: { tile: "bg-amber-50", icon: "text-amber-600" },
    rose: { tile: "bg-rose-50", icon: "text-rose-600" },
};

const StatCard: React.FC<StatCardProps> = ({
    icon: Icon,
    label,
    value,
    sub,
    accent = "blue",
    delay = 0,
}) => {
    const a = accentMap[accent];
    return (
        <Reveal delay={delay}>
            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow h-full">
                <div
                    className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center mb-3 flex-shrink-0",
                        a.tile,
                    )}
                >
                    <Icon className={cn("w-[18px] h-[18px]", a.icon)} />
                </div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                    {label}
                </p>
                <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-none">
                    {value}
                </p>
                {sub && (
                    <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">
                        {sub}
                    </p>
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
        <div className="bg-white border border-zinc-200 rounded-xl shadow-lg p-3 text-xs max-w-[220px]">
            {label && (
                <p className="font-semibold text-zinc-700 mb-2 truncate">
                    {label}
                </p>
            )}
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2 mt-1">
                    <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ background: p.color }}
                    />
                    <span className="text-zinc-500">{p.name}:</span>
                    <span className="font-semibold text-zinc-800 tabular-nums">
                        {fmt(p.value)}
                    </span>
                </div>
            ))}
            {payload.length > 1 && (
                <div className="flex items-center gap-2 mt-2 pt-2 border-t border-zinc-100">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-zinc-400" />
                    <span className="text-zinc-500">Total:</span>
                    <span className="font-bold text-zinc-900 tabular-nums">
                        {fmt(total)}
                    </span>
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
    <div className="flex items-center gap-2.5 mb-4">
        <div
            className={cn(
                "w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0",
                iconBg,
            )}
        >
            <Icon className={cn("w-4 h-4", iconColor)} />
        </div>
        <div>
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 leading-none mb-0.5">
                {eyebrow}
            </p>
            <p className="text-[13px] font-bold text-zinc-800 leading-none">
                {title}
            </p>
        </div>
    </div>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const DepartmentHeadDashboard: React.FC = () => {
    const { user } = useAuth();
    const deptId = user?.dept_id;

    const { activePlan, loading: planLoading } = useActiveBudgetPlan();
    const { programs, loading: aipLoading } = useAipProgramData(
        activePlan?.budget_plan_id,
    );
    const {
        items,
        amountMap,
        loading: expLoading,
    } = useExpenseData(activePlan?.budget_plan_id);

    // Draft notification state
    const [showDraftAlert, setShowDraftAlert] = useState(false);

    // This dept's budget plan record
    const { data: deptPlan, isLoading: deptPlanLoading } = useQuery({
        queryKey: ["my-dept-plan", activePlan?.budget_plan_id, deptId],
        queryFn: () =>
            API.get("/department-budget-plans", {
                params: { budget_plan_id: activePlan?.budget_plan_id },
            }).then(
                (r) =>
                    (r.data?.data ?? []).find(
                        (p: any) => p.dept_id === deptId,
                    ) ?? null,
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
                (r.data?.data ?? []).filter((p: any) => p.dept_id === deptId),
            ),
        enabled: !!deptId,
    });

    const isLoading =
        planLoading || aipLoading || expLoading || deptPlanLoading;

    // Show draft alert when data is ready
    useEffect(() => {
        if (
            !isLoading &&
            deptPlan &&
            deptPlan.status === "draft" &&
            activePlan
        ) {
            setShowDraftAlert(true);
        }
    }, [isLoading, deptPlan, activePlan]);

    // ── Derived ───────────────────────────────────────────────────────────────

    const myPrograms = useMemo(
        () => programs.filter((p) => p.dept_id === deptId),
        [programs, deptId],
    );

    // ── Expense-item based totals (scoped to this dept) ───────────────────────

    // Build a map: expense_item_id → classificationName for this dept's items
    const expenseItemClassMap = useMemo(() => {
        const m = new Map<number, string>();
        items.forEach((item) => {
            m.set(item.expense_class_item_id, item.classificationName);
        });
        return m;
    }, [items]);

    // Sum amounts for this dept's expense items by classification
    const { totalExpensePS, totalExpenseMOOE, totalExpenseCO, totalExpense } =
        useMemo(() => {
            let ps = 0,
                mooe = 0,
                co = 0;
            items.forEach((item) => {
                const amt =
                    amountMap.get(`${deptId}-${item.expense_class_item_id}`) ??
                    0;
                const cls = item.classificationName;
                if (cls === CLASS_PS) ps += amt;
                else if (cls === CLASS_MOOE) mooe += amt;
                else if (cls === CLASS_CO) co += amt;
            });
            return {
                totalExpensePS: ps,
                totalExpenseMOOE: mooe,
                totalExpenseCO: co,
                totalExpense: ps + mooe + co,
            };
        }, [items, amountMap, deptId]);

    // AIP program totals (for radial chart)
    const aipTotalPS = useMemo(
        () => myPrograms.reduce((s, p) => s + p.total_ps, 0),
        [myPrograms],
    );
    const aipTotalMOOE = useMemo(
        () => myPrograms.reduce((s, p) => s + p.total_mooe, 0),
        [myPrograms],
    );
    const aipTotalCO = useMemo(
        () => myPrograms.reduce((s, p) => s + p.total_co, 0),
        [myPrograms],
    );
    const aipTotal = useMemo(
        () => myPrograms.reduce((s, p) => s + p.total_amount, 0),
        [myPrograms],
    );

    // Total proposed expenditure = expense items total + AIP total
    const totalProposedExpenditure = totalExpense + aipTotal;

    // Bar chart — top 6 AIP programs
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

    // Pie — PS / MOOE / CO from expense items
    const pieData = useMemo(() => {
        const data = [
            {
                name: "Personal Services",
                value: totalExpensePS,
                color: "#6366f1",
            },
            { name: "MOOE", value: totalExpenseMOOE, color: "#22d3ee" },
            { name: "Capital Outlay", value: totalExpenseCO, color: "#f59e0b" },
        ].filter((d) => d.value > 0);
        return data;
    }, [totalExpensePS, totalExpenseMOOE, totalExpenseCO]);

    // Radial — AIP allocation %
    const radialData = useMemo(() => {
        if (!aipTotal) return [];
        return [
            { name: "PS", value: pct(aipTotalPS, aipTotal), fill: "#6366f1" },
            {
                name: "MOOE",
                value: pct(aipTotalMOOE, aipTotal),
                fill: "#22d3ee",
            },
            { name: "CO", value: pct(aipTotalCO, aipTotal), fill: "#f59e0b" },
        ];
    }, [aipTotal, aipTotalPS, aipTotalMOOE, aipTotalCO]);

    // Plantilla
    const filled = (plantilla as any[]).filter(
        (p) => p.assignments?.[0]?.personnel_id != null,
    ).length;
    const fillRate = pct(filled, plantilla.length);

    const dept = (user as any)?.department;
    const deptName = dept?.dept_name ?? "Your Department";
    const deptAbbr = dept?.dept_abbreviation ?? "";

    const statusCfg: Record<string, { label: string; cls: string }> = {
        draft: {
            label: "Draft",
            cls: "text-amber-700 bg-amber-50 border-amber-200",
        },
        submitted: {
            label: "Submitted",
            cls: "text-blue-700 bg-blue-50 border-blue-200",
        },
        approved: {
            label: "Approved",
            cls: "text-emerald-700 bg-emerald-50 border-emerald-200",
        },
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

            <div className="min-h-screen bg-zinc-50/50 p-6 pb-20">
                {/* ── Page header ───────────────────────────────────────────── */}
                <Reveal delay={0}>
                    <div className="flex items-start justify-between mb-7">
                        <div>
                            {/* <span className="text-[10px] font-semibold tracking-[0.14em] uppercase text-zinc-400">
                                {deptAbbr ? `${deptAbbr} · ` : ""}Department
                                Dashboard
                            </span> */}
                            <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
                                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
                            </p>
                            <h1 className="text-[22px] font-bold text-zinc-900 tracking-tight mt-0.5 leading-tight">
                                Overview
                            </h1>
                            {/* <p className="text-[12px] text-zinc-400 mt-0.5">
                                Budget Overview
                            </p> */}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0"></div>
                    </div>
                </Reveal>

                {/* ── No active plan notice ──────────────────────────────────── */}
                {!planLoading && !activePlan && (
                    <Reveal delay={40}>
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 mb-6">
                            <InformationCircleIcon className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-sm font-medium text-zinc-900">
                                    No active budget plan
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-0.5">
                                    The admin hasn't activated a budget plan
                                    yet.
                                </p>
                            </div>
                        </div>
                    </Reveal>
                )}

                {/* ── Stat cards ────────────────────────────────────────────── */}
                {isLoading ? (
                    <div className="flex gap-4 mb-6">
                        {[...Array(5)].map((_, i) => (
                            <CardSkeleton key={i} />
                        ))}
                    </div>
                ) : (
                    <div className="flex gap-4 mb-6 items-stretch">
                        {/* Active Plan */}
                        <Reveal delay={40} className="flex-shrink-0 w-[190px]">
                            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow h-full relative overflow-hidden">
                                <span className="absolute top-4 right-4 flex h-2 w-2">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
                                    <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
                                </span>
                                <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center mb-3 flex-shrink-0">
                                    <DocumentTextIcon className="w-[18px] h-[18px] text-blue-500" />
                                </div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                                    Budget Plan Year
                                </p>
                                <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-none">
                                    {activePlan ? `${activePlan.year}` : "—"}
                                </p>
                                <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">
                                    {activePlan
                                        ? "Currently active"
                                        : "No active plan"}
                                </p>
                            </div>
                        </Reveal>

                        {/* Vertical divider */}
                        <div className="w-px bg-zinc-200 my-2 flex-shrink-0" />

                        {/* Total Proposed Expenditure — clickable card with status */}
                        <Reveal delay={60} className="flex-1">
                            {deptPlan ? (
                                <Link
                                    to={`/department-budget-plans/${deptPlan.dept_budget_plan_id}`}
                                    className="group bg-white border border-blue-100 rounded-2xl p-5 shadow-sm hover:shadow-md hover:border-blue-300 hover:bg-blue-50/30 transition-all h-full flex flex-col cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="w-9 h-9 rounded-xl bg-blue-50 group-hover:bg-blue-100 transition-colors flex items-center justify-center flex-shrink-0">
                                            <CurrencyDollarIcon className="w-[18px] h-[18px] text-blue-600" />
                                        </div>
                                        <span
                                            className={cn(
                                                "text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                                                sCfg.cls,
                                            )}
                                        >
                                            {sCfg.label}
                                        </span>
                                    </div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                                        Total Proposed Expenditure
                                    </p>
                                    <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-none">
                                        {fmt(totalProposedExpenditure)}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug group-hover:text-blue-500 transition-colors">
                                        Expense items + AIP programs →
                                    </p>
                                </Link>
                            ) : (
                                <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm h-full flex flex-col">
                                    <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center mb-3 flex-shrink-0">
                                        <CurrencyDollarIcon className="w-[18px] h-[18px] text-blue-600" />
                                    </div>
                                    <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 mb-1">
                                        Total Proposed Expenditure
                                    </p>
                                    <p className="text-[22px] font-bold text-zinc-900 tabular-nums leading-none">
                                        {fmt(totalProposedExpenditure)}
                                    </p>
                                    <p className="text-[11px] text-zinc-400 mt-1.5 leading-snug">
                                        Expense items + AIP programs
                                    </p>
                                </div>
                            )}
                        </Reveal>

                        <StatCard
                            icon={ArrowTrendingUpIcon}
                            label="Personnel Services"
                            value={fmt(totalExpensePS)}
                            sub={`${pct(totalExpensePS, totalExpense)}% of expense items`}
                            accent="violet"
                            delay={110}
                        />
                        <StatCard
                            icon={DocumentTextIcon}
                            label="MOOE"
                            value={fmt(totalExpenseMOOE)}
                            sub={`${pct(totalExpenseMOOE, totalExpense)}% of expense items`}
                            accent="cyan"
                            delay={160}
                        />
                        <StatCard
                            icon={BuildingOfficeIcon}
                            label="Capital Outlay"
                            value={fmt(totalExpenseCO)}
                            sub={`${pct(totalExpenseCO, totalExpense)}% of expense items`}
                            accent="amber"
                            delay={210}
                        />
                    </div>
                )}

                {/* ── Row 2: Radial + Grouped Bar ───────────────────────────── */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                    {/* Radial: AIP PS/MOOE/CO split */}
                    {isLoading ? (
                        <ChartSkeleton h="h-56" />
                    ) : (
                        <Reveal delay={260}>
                            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full">
                                <SectionHead
                                    eyebrow="AIP Program Allocation"
                                    title="PS / MOOE / CO"
                                    icon={CurrencyDollarIcon}
                                    iconBg="bg-indigo-50"
                                    iconColor="text-indigo-600"
                                />
                                {radialData.length === 0 ? (
                                    <div className="h-48 flex items-center justify-center text-zinc-300 text-sm">
                                        No AIP data yet
                                    </div>
                                ) : (
                                    <>
                                        <ResponsiveContainer
                                            width="100%"
                                            height={180}
                                        >
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
                                                    background={{
                                                        fill: "#f4f4f5",
                                                    }}
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
                                                        <span className="text-[11px] text-zinc-500">
                                                            {v}
                                                        </span>
                                                    )}
                                                />
                                                <Tooltip
                                                    formatter={(v: number) => [
                                                        `${v}%`,
                                                    ]}
                                                    contentStyle={{
                                                        borderRadius: 12,
                                                        border: "1px solid #e4e4e7",
                                                        fontSize: 11,
                                                    }}
                                                />
                                            </RadialBarChart>
                                        </ResponsiveContainer>
                                        <div className="grid grid-cols-3 gap-1.5 mt-1">
                                            {[
                                                {
                                                    label: "PS",
                                                    val: fmt(aipTotalPS),
                                                    color: "text-indigo-600",
                                                    bg: "bg-indigo-50",
                                                },
                                                {
                                                    label: "MOOE",
                                                    val: fmt(aipTotalMOOE),
                                                    color: "text-cyan-600",
                                                    bg: "bg-cyan-50",
                                                },
                                                {
                                                    label: "CO",
                                                    val: fmt(aipTotalCO),
                                                    color: "text-amber-600",
                                                    bg: "bg-amber-50",
                                                },
                                            ].map((d) => (
                                                <div
                                                    key={d.label}
                                                    className={cn(
                                                        "rounded-xl py-2 text-center",
                                                        d.bg,
                                                    )}
                                                >
                                                    <p
                                                        className={cn(
                                                            "text-[13px] font-bold tabular-nums",
                                                            d.color,
                                                        )}
                                                    >
                                                        {d.val}
                                                    </p>
                                                    <p className="text-[10px] text-zinc-400 font-semibold">
                                                        {d.label}
                                                    </p>
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
                            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm h-full">
                                <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                                            <ClipboardDocumentListIcon className="w-4 h-4 text-violet-600" />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 leading-none mb-0.5">
                                                AIP Programs
                                            </p>
                                            <p className="text-[13px] font-bold text-zinc-800 leading-none">
                                                Programs by Expenditure
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right flex-shrink-0 ml-3">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400">
                                            Total AIP Expenditures
                                        </p>
                                        <p className="text-[18px] font-bold text-violet-600 tabular-nums leading-none">
                                            {fmt(aipTotal)}
                                        </p>
                                        <p className="text-[10px] text-zinc-400 mt-0.5">
                                            {myPrograms.length} program
                                            {myPrograms.length !== 1 ? "s" : ""}
                                        </p>
                                    </div>
                                </div>
                                {barData.length === 0 ? (
                                    <div className="h-52 flex items-center justify-center text-zinc-300 text-sm">
                                        No AIP programs for this department
                                    </div>
                                ) : (
                                    <ResponsiveContainer
                                        width="100%"
                                        height={230}
                                    >
                                        <BarChart
                                            data={barData}
                                            margin={{
                                                top: 0,
                                                right: 8,
                                                left: 0,
                                                bottom: 36,
                                            }}
                                            barSize={9}
                                            barGap={2}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="#f4f4f5"
                                                vertical={false}
                                            />
                                            <XAxis
                                                dataKey="name"
                                                tick={{
                                                    fontSize: 9,
                                                    fill: "#a1a1aa",
                                                }}
                                                angle={-30}
                                                textAnchor="end"
                                                interval={0}
                                                tickLine={false}
                                                axisLine={false}
                                            />
                                            <YAxis
                                                tick={{
                                                    fontSize: 9,
                                                    fill: "#a1a1aa",
                                                }}
                                                tickFormatter={fmt}
                                                tickLine={false}
                                                axisLine={false}
                                                width={54}
                                            />
                                            <Tooltip content={<ChartTip />} />
                                            <Bar
                                                dataKey="PS"
                                                name="PS"
                                                fill="#6366f1"
                                                radius={[3, 3, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="MOOE"
                                                name="MOOE"
                                                fill="#22d3ee"
                                                radius={[3, 3, 0, 0]}
                                            />
                                            <Bar
                                                dataKey="CO"
                                                name="CO"
                                                fill="#f59e0b"
                                                radius={[3, 3, 0, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                )}
                            </div>
                        </Reveal>
                    )}
                </div>

                {/* ── Row 3: Expense Classification Breakdown + Plantilla ────── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                    {/* Pie: PS / MOOE / CO from expense items */}
                    {isLoading ? (
                        <ChartSkeleton h="h-44" />
                    ) : (
                        <Reveal delay={360}>
                            <div className="bg-white border border-zinc-100 rounded-2xl p-5 shadow-sm">
                                <SectionHead
                                    eyebrow="Expense Classification"
                                    title="Expense Classification Breakdown"
                                    icon={DocumentTextIcon}
                                    iconBg="bg-amber-50"
                                    iconColor="text-amber-600"
                                />
                                {pieData.length === 0 ? (
                                    <div className="h-44 flex items-center justify-center text-zinc-300 text-sm">
                                        No expense data
                                    </div>
                                ) : (
                                    <div className="flex items-center gap-4">
                                        <ResponsiveContainer
                                            width={160}
                                            height={160}
                                        >
                                            <PieChart>
                                                <Pie
                                                    data={pieData}
                                                    cx="50%"
                                                    cy="50%"
                                                    innerRadius={42}
                                                    outerRadius={70}
                                                    dataKey="value"
                                                    stroke="none"
                                                    paddingAngle={2}
                                                >
                                                    {pieData.map((d, i) => (
                                                        <Cell
                                                            key={i}
                                                            fill={d.color}
                                                        />
                                                    ))}
                                                </Pie>
                                                <Tooltip
                                                    formatter={(v: number) => [
                                                        fmt(v),
                                                    ]}
                                                    contentStyle={{
                                                        borderRadius: 12,
                                                        border: "1px solid #e4e4e7",
                                                        fontSize: 11,
                                                    }}
                                                />
                                            </PieChart>
                                        </ResponsiveContainer>
                                        <div className="flex-1 space-y-3 min-w-0">
                                            {pieData.map((d) => (
                                                <div
                                                    key={d.name}
                                                    className="space-y-1"
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span
                                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                                            style={{
                                                                background:
                                                                    d.color,
                                                            }}
                                                        />
                                                        <span className="text-[11px] text-zinc-500 truncate flex-1">
                                                            {d.name}
                                                        </span>
                                                        <span className="text-[11px] font-semibold text-zinc-700 tabular-nums">
                                                            {fmt(d.value)}
                                                        </span>
                                                    </div>
                                                    <div className="ml-4 h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-[width] duration-700"
                                                            style={{
                                                                width: `${pct(d.value, totalExpense)}%`,
                                                                background:
                                                                    d.color,
                                                            }}
                                                        />
                                                    </div>
                                                    <p className="ml-4 text-[10px] text-zinc-400">
                                                        {pct(
                                                            d.value,
                                                            totalExpense,
                                                        )}
                                                        % of total
                                                    </p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </Reveal>
                    )}

                    {/* Plantilla */}
                    {plantillaLoading ? (
                        <ChartSkeleton h="h-44" />
                    ) : (
                        <Reveal delay={400}>
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
                                        <span className="text-zinc-400">
                                            {filled} filled
                                        </span>
                                        <span className="font-bold text-emerald-600">
                                            {fillRate}%
                                        </span>
                                        <span className="text-zinc-400">
                                            {(plantilla as any[]).length -
                                                filled}{" "}
                                            vacant
                                        </span>
                                    </div>
                                </div>
                                {/* Position rows */}
                                <div className="space-y-1 max-h-48 overflow-y-auto pr-1">
                                    {(plantilla as any[])
                                        .slice(0, 8)
                                        .map((pos) => {
                                            const assigned =
                                                pos.assignments?.[0]
                                                    ?.personnel_id != null;
                                            return (
                                                <div
                                                    key={
                                                        pos.plantilla_position_id
                                                    }
                                                    className="flex items-center gap-2 py-1"
                                                >
                                                    <span
                                                        className={cn(
                                                            "w-1.5 h-1.5 rounded-full flex-shrink-0",
                                                            assigned
                                                                ? "bg-emerald-400"
                                                                : "bg-zinc-200",
                                                        )}
                                                    />
                                                    <span className="text-[11px] text-zinc-600 truncate flex-1">
                                                        {pos.position_title}
                                                    </span>
                                                    <span className="text-[10px] text-zinc-400 tabular-nums font-mono">
                                                        SG {pos.salary_grade}
                                                    </span>
                                                </div>
                                            );
                                        })}
                                    {(plantilla as any[]).length > 8 && (
                                        <p className="text-center text-[10px] text-zinc-400 pt-1">
                                            +{(plantilla as any[]).length - 8}{" "}
                                            more positions
                                        </p>
                                    )}
                                    {(plantilla as any[]).length === 0 && (
                                        <p className="text-center text-[11px] text-zinc-300 py-4">
                                            No positions found
                                        </p>
                                    )}
                                </div>
                            </div>
                        </Reveal>
                    )}
                </div>
            </div>

            {/* ── Draft Proposal Notification ────────────────────────────────── */}
            {showDraftAlert && deptPlan && deptPlan.status === "draft" && (
                <div className="fixed bottom-5 right-5 z-50 w-80 animate-in fade-in slide-in-from-bottom-3 duration-300">
                    <div className="bg-white border border-amber-200 rounded-2xl shadow-lg p-4 relative">
                        <button
                            onClick={() => setShowDraftAlert(false)}
                            className="absolute top-3 right-3 text-zinc-300 hover:text-zinc-600 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                        <div className="flex items-start gap-3 pr-4">
                            <div className="w-7 h-7 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <InformationCircleIcon className="w-4 h-4 text-amber-600" />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[13px] font-semibold text-zinc-900 leading-tight">
                                    Draft Proposal
                                </p>
                                <p className="text-[11px] text-zinc-500 mt-1 leading-snug">
                                    You have an unsubmitted proposal for{" "}
                                    <span className="font-medium text-zinc-700">
                                        FY {activePlan?.year}
                                    </span>
                                    .
                                </p>
                                <Link
                                    to={`/department-budget-plans/${deptPlan.dept_budget_plan_id}`}
                                    className="inline-block mt-2 text-[11px] font-semibold text-zinc-900 underline underline-offset-2 hover:text-zinc-600"
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
