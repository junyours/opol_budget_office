import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label as ShadcnLabel } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from "../../components/ui/dialog";
import {
  Carousel, CarouselContent, CarouselItem,
  CarouselNext, CarouselPrevious,
  useCarousel,
} from "../../components/ui/carousel";
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  RadialBarChart, RadialBar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PolarGrid, PolarRadiusAxis,
  Label as RechartsLabel,
} from "recharts";
import { ChartContainer, type ChartConfig } from "../../components/ui/chart";
import { useSalaryMatrix } from "../../hooks/useSalaryMatrix";
import { useBudgetTotals } from "../../hooks/useBudgetTotals";
import { cn } from "@/src/lib/utils";
import {
  PlusIcon, ChevronRightIcon, BuildingOffice2Icon,
  DocumentTextIcon, CurrencyDollarIcon, UserGroupIcon,
  ChartBarIcon, BriefcaseIcon, BanknotesIcon,
  ClipboardDocumentListIcon, ArrowTrendingUpIcon,
  ArrowTrendingDownIcon, CheckCircleIcon, ClockIcon,
  ExclamationTriangleIcon, BuildingStorefrontIcon,
} from "@heroicons/react/24/outline";
import { Department } from "../../types/api";
import {
  useDepartments, useBudgetPlans, useDepartmentBudgetPlans,
  useAllFunds,
  useMdfFund, useLdrrmfSummary, useDeptExpenditures,
  useCreateBudgetPlan,
} from "../../hooks/useDashboardQueries";

import { BudgetAreaChart } from "@/src/components/charts/BudgetAreaChart";
import { BreakdownCard } from "@/src/components/cards/BreakDownCard";

const getInitials = (d: Department) =>
  (d.dept_abbreviation ?? d.dept_name).slice(0, 2).toUpperCase();

const peso = (v: number) => `₱${Math.round(v).toLocaleString("en-PH")}`;

const pesoC = (v: number): string => {
  if (v >= 1_000_000_000) {
    const n = Math.floor(v / 1_000_000) / 1_000;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}B`;
  }
  if (v >= 1_000_000) {
    const n = Math.floor(v / 1_000) / 1_000;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
  }
  if (v >= 1_000) {
    const n = Math.floor(v / 1) / 1_000;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}K`;
  }
  return `₱${Math.floor(v).toLocaleString('en-PH')}`;
};

const st = (i: number): React.CSSProperties => ({ animationDelay: `${i * 60}ms` });

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg px-3 py-2 min-w-[150px]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: p?.color ?? p?.fill }} />
        <span className="text-sm font-bold text-zinc-700">{name}</span>
      </div>
      <p className="text-sm font-semibold text-zinc-900 font-mono">{peso(value)}</p>
    </div>
  );
};

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg px-3 py-2 min-w-[140px]">
      <p className="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-1">{label}</p>
      <p className="text-sm font-semibold text-zinc-900 font-mono">{pesoC(payload[0].value)}</p>
      <p className="text-xs text-zinc-500 font-mono">{peso(payload[0].value)}</p>
    </div>
  );
};

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={cn("relative overflow-hidden rounded-2xl bg-zinc-100 animate-in fade-in duration-700 fill-mode-both", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/70 to-transparent" />
    </div>
  );
}

function DeptAvatars({ depts, max = 8 }: { depts: Department[]; max?: number }) {
  const visible = depts.slice(0, max), rest = depts.length - max;
  return (
    <div className="flex -space-x-1.5 flex-wrap">
      {visible.map(d => (
        <Avatar key={d.dept_id} className="h-6 w-6 rounded-full border-2 border-white shadow-sm">
          <AvatarImage src={d.logo ? `/storage/${d.logo}` : undefined} />
          <AvatarFallback className="text-[9px] font-bold bg-zinc-100 text-zinc-500">{getInitials(d)}</AvatarFallback>
        </Avatar>
      ))}
      {rest > 0 && (
        <div className="h-6 w-6 rounded-full border-2 border-white bg-zinc-400 flex items-center justify-center text-[9px] font-bold text-white">+{rest}</div>
      )}
    </div>
  );
}

function Card({ children, className, style, onClick }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      style={style}
      className={cn(
        "bg-white rounded-2xl border border-zinc-100 shadow-sm",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        onClick && "cursor-pointer hover:border-zinc-200 hover:shadow-md transition-all",
        className
      )}
    >
      {children}
    </div>
  );
}

function Money({ v, loading, size = "lg", cls = "text-zinc-900", sub = "text-zinc-400" }: {
  v: number | null; loading: boolean;
  size?: "xs" | "sm" | "md" | "lg" | "xl"; cls?: string; sub?: string;
}) {
  if (loading) return (
    <div className="space-y-1.5">
      <Shimmer className={cn("rounded-lg",
        size === "xl" ? "h-10 w-40" : size === "lg" ? "h-7 w-32" : size === "md" ? "h-6 w-24" : "h-5 w-20"
      )} />
      <Shimmer className="h-3 w-28 rounded" />
    </div>
  );
  if (v === null) return <p className="text-zinc-300 font-bold text-lg">—</p>;
  return (
    <div>
      <p className={cn("font-semibold leading-none tabular-nums tracking-tight",
        size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : size === "sm" ? "text-base" : "text-sm",
        cls
      )}>{pesoC(v)}</p>
      <p className={cn("font-mono mt-1.5 text-[10px]", sub)}>{peso(v)}</p>
    </div>
  );
}

function UnapBadge({ value, compact = false }: { value: number; compact?: boolean }) {
  const pos = value >= 0;
  return (
    <div className={cn(
      "rounded-xl border flex items-center justify-between",
      compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
      pos ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
    )}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pos ? "#10b981" : "#ef4444" }} />
        <p className={cn("font-semibold uppercase tracking-widest truncate", compact ? "text-[10px]" : "text-xs", pos ? "text-emerald-700" : "text-red-600")}>Unappropriated Balance</p>
      </div>
      <p className={cn("font-semibold font-mono tabular-nums ml-2 flex-shrink-0", compact ? "text-xs" : "text-sm", pos ? "text-emerald-700" : "text-red-600")}>
        {pos ? "+" : ""}{peso(value)}
      </p>
    </div>
  );
}

const CarouselDots = ({ count }: { count: number }) => {
  const { api } = useCarousel();
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    if (!api) return;
    setCurrent(api.selectedScrollSnap());
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: count }).map((_, i) => (
        <button
          key={i}
          onClick={() => api?.scrollTo(i)}
          className={cn(
            "rounded-full transition-all duration-300",
            i === current
              ? "w-3 h-1.5 bg-zinc-500"
              : "w-1.5 h-1.5 bg-zinc-200 hover:bg-zinc-300"
          )}
        />
      ))}
    </div>
  );
};

const ApprovalProgressCard: React.FC<{
  style: React.CSSProperties;
  completion: number;
  totalWithPlan: number;
  approvedDepts: Department[];
  submittedDepts: Department[];
  draftDepts: Department[];
}> = ({ style, completion, totalWithPlan, approvedDepts, submittedDepts, draftDepts }) => {

  const [activeIdx, setActiveIdx] = useState(0);
  const [visible, setVisible] = useState(true);

  const statuses = [
    { label: "Approved",  depts: approvedDepts,  color: "#10b981", icon: <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#10b981" }} /> },
    { label: "Submitted", depts: submittedDepts, color: "#3b82f6", icon: <DocumentTextIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#3b82f6" }} /> },
    { label: "Draft",     depts: draftDepts,     color: "#f59e0b", icon: <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#f59e0b" }} /> },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIdx(prev => (prev + 1) % statuses.length);
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const s = statuses[activeIdx];

  const radialConfig = {
  completion: {
    label: "Approved",
    color: "#10b981"  // ← color goes in config
  },
} satisfies ChartConfig;

  return (
    <Card style={style} className="col-span-6 lg:col-span-5 p-4 flex flex-col">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
          <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-zinc-400">Approval Progress</p>
      </div>

      <div className="flex items-center gap-5 flex-1">

        {/* Radial chart — shadcn ChartContainer style */}
        <div className="relative w-24 h-24 flex-shrink-0">
          <ChartContainer config={radialConfig} className="w-full h-full">
  <RadialBarChart
    data={[{ name: "completion", value: completion, fill: "var(--color-completion)" }]}  // ← use var(), not hex
    startAngle={90}
    endAngle={90 - (completion / 100) * 360}
    innerRadius={55}
    outerRadius={15}
  >
    <PolarGrid
      gridType="circle"
      radialLines={false}
      stroke="none"
      className="first:fill-muted last:fill-background"
      polarRadius={[40, 30]}
    />
    <RadialBar dataKey="value" background />
    <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
      <RechartsLabel
        content={(props: any) => {
          const vb = props?.viewBox as { cx?: number; cy?: number } | undefined;
          if (!vb?.cx || !vb?.cy) return null;
          return (
            <text x={vb.cx} y={vb.cy} textAnchor="middle" dominantBaseline="middle">
              <tspan x={vb.cx} y={vb.cy} style={{ fontSize: 16, fontWeight: 700, fill: "#18181b" }}>
                {completion}%
              </tspan>
              <tspan x={vb.cx} y={vb.cy + 14} style={{ fontSize: 9, fill: "#a1a1aa" }}>
                approved
              </tspan>
            </text>
          );
        }}
      />
    </PolarRadiusAxis>
  </RadialBarChart>
</ChartContainer>
        </div>

        {/* Fading status card */}
        <div className="flex-1 min-w-0">

          {/* Dot indicators */}
          <div className="flex items-center gap-1.5 mb-3">
            {statuses.map((st, i) => (
              <button
                key={st.label}
                onClick={() => {
                  setVisible(false);
                  setTimeout(() => { setActiveIdx(i); setVisible(true); }, 400);
                }}
                className="rounded-full transition-all duration-300"
                style={{
                  width: i === activeIdx ? 12 : 6,
                  height: 6,
                  background: i === activeIdx ? s.color : "#e4e4e7",
                }}
              />
            ))}
          </div>

          {/* Fixed-height container — prevents layout shift on switch */}
          <div className="relative min-w-0" style={{ height: 100 }}>
            <div
              style={{
                transition: "opacity 400ms ease, transform 400ms ease",
                opacity: visible ? 1 : 0,
                transform: visible ? "translateY(0)" : "translateY(6px)",
                position: "absolute",
                inset: 0,
              }}
              className="rounded-2xl bg-zinc-50 border border-zinc-100 p-3.5"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {s.icon}
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">{s.label}</span>
                </div>
                <span className="text-2xl font-bold text-zinc-900">{s.depts.length}</span>
              </div>

              <div className="h-1 rounded-full bg-zinc-200 overflow-hidden mb-2.5">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: totalWithPlan > 0 ? `${(s.depts.length / totalWithPlan) * 100}%` : "0%",
                    background: s.color,
                  }}
                />
              </div>

              {s.depts.length > 0
                ? <DeptAvatars depts={s.depts} max={10} />
                : <p className="text-[10px] text-zinc-300">None yet</p>
              }
            </div>
          </div>

        </div>
      </div>
    </Card>
  );
};


const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activeVersion, loading: matrixLoading } = useSalaryMatrix();

  const [createOpen, setCreateOpen] = useState(false);
  const [newYear,    setNewYear]    = useState(new Date().getFullYear() + 1);
  const [newActive,  setNewActive]  = useState(false);

  const { data: departments = [], isLoading: deptsLoading } = useDepartments();
  const { data: plans = [],       isLoading: plansLoading } = useBudgetPlans();

  const activePlan = plans.find(p => p.is_active) ?? null;
  const planId     = activePlan?.budget_plan_id;

  const { data: deptBudgetPlans = [] } = useDepartmentBudgetPlans(planId);

  const { data: funds } = useAllFunds();
  const fundsReady = funds !== undefined;
  const gf  = funds?.gf  ?? null;
  const sh  = funds?.sh  ?? null;
  const occ = funds?.occ ?? null;
  const pm  = funds?.pm  ?? null;

  const { data: mdfAllocated = 0, isLoading: mdfLoading } = useMdfFund(planId);
  const { data: ldrrmfData,       isLoading: ldrLoading  } = useLdrrmfSummary(planId);
  const { data: deptExp = [],     isLoading: deptExpLoading } = useDeptExpenditures(planId, departments);
  const { totals: exp, loading: expLoading } = useBudgetTotals(activePlan);

  const shExpTotal  = exp.shExpenditure;
  const occExpTotal = exp.occExpenditure;
  const pmExpTotal  = exp.pmExpenditure;

  const createPlan = useCreateBudgetPlan();

  const handleCreatePlan = async () => {
    if (!newYear) return;
    try {
      const created = await createPlan.mutateAsync({ year: newYear, is_active: newActive });
      toast.success(`FY ${created.year} created — ${created.department_plans?.length ?? 0} dept plans initialized.`);
      setCreateOpen(false);
      setNewYear(new Date().getFullYear() + 1);
      setNewActive(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed.");
    }
  };

  const draftDepts     = deptBudgetPlans.filter(p => p.status === 'draft').map(p => p.department).filter(Boolean) as Department[];
  const submittedDepts = deptBudgetPlans.filter(p => p.status === 'submitted').map(p => p.department).filter(Boolean) as Department[];
  const approvedDepts  = deptBudgetPlans.filter(p => p.status === 'approved').map(p => p.department).filter(Boolean) as Department[];
  const withPlanIds    = new Set(deptBudgetPlans.map(p => p.dept_id));
  const missingDepts   = departments.filter(d => !withPlanIds.has(d.dept_id));
  const totalWithPlan  = draftDepts.length + submittedDepts.length + approvedDepts.length;
  const completion     = totalWithPlan > 0 ? Math.round((approvedDepts.length / totalWithPlan) * 100) : 0;

  const allocLoading = mdfLoading || ldrLoading;
  const specialExpLoading = expLoading;

  // const ldrrmf30Actual = ldrrmfData?.reserved30 ?? 0;
  // const ldrrmf70Actual = ldrrmfData?.total70    ?? 0;
  const ldrrmf70Actual = ldrrmfData?.total70 ?? 0;
  // QRF (30%) is a reserved fund — the "used" amount is the full 30% allocation.
  // Actual QRF spending is not tracked separately; show full qrf as the allocated value.
  // Once qrf is computed below, we use it directly.
  const mdfActual      = mdfAllocated;

  // const ldrrmf = (gf?.total ?? 0) * 0.05;
  // const qrf    = ldrrmf * 0.30;
  // const predis = ldrrmf * 0.70;
  // const mdf    = (gf?.nta ?? 0) * 0.20;

  // const mdfRemaining      = Math.max(0, mdf - mdfActual);
  // const ldrrmf30Remaining = Math.max(0, qrf - ldrrmf30Actual);
  // const ldrrmf70Remaining = Math.max(0, predis - ldrrmf70Actual);
  const ldrrmf = (gf?.total ?? 0) * 0.05;
  const qrf    = ldrrmf * 0.30;
  const predis = ldrrmf * 0.70;
  const mdf    = (gf?.nta ?? 0) * 0.20;

  // QRF is reserved (not yet disbursed) — actual used = 0 until spending is recorded.
  // Show qrf as fully allocated to itself (100% reserved, 0% spent).
  const ldrrmf30Actual    = 0;
  const ldrrmf30Remaining = qrf;  // entire QRF is still available
  const mdfRemaining      = Math.max(0, mdf - mdfActual);
  const ldrrmf70Remaining = Math.max(0, predis - ldrrmf70Actual);

  // const ldrrmfPieTotal = qrf + ldrrmf70Actual;
  const ldrrmfPieTotal = qrf + ldrrmf70Actual; // qrf is always fully reserved
  const mdfPieValue    = mdfActual;
  const gfUnap         = Math.max(0, (gf?.total ?? 0) - exp.gfExpenditure - mdfPieValue - ldrrmfPieTotal);

  const shCal        = (sh?.nonTaxRevenue  ?? 0) * 0.05;
  const occCal       = (occ?.nonTaxRevenue ?? 0) * 0.05;
  const pmCal        = (pm?.nonTaxRevenue  ?? 0) * 0.05;
  const specialTotal = (sh?.total ?? 0) + (occ?.total ?? 0) + (pm?.total ?? 0);
  const specialExp   = shExpTotal + occExpTotal + pmExpTotal;
  const specialCal   = shCal + occCal + pmCal;
  const specialUnap  = Math.max(0, specialTotal - specialExp - specialCal);

  const gfPie = fundsReady && (gf?.total ?? 0) > 0 ? [
    { name: "Expenditures",           value: exp.gfExpenditure, color: "#a1a1aa" },
    { name: "20% MDF",                value: mdfPieValue,       color: "#f59e0b" },
    { name: "5% · 30% QRF",          value: qrf,               color: "#f43f5e" },
    { name: "5% · 70% Pre-Disaster",  value: ldrrmf70Actual,    color: "#fb923c" },
    { name: "Unappropriated Balance", value: gfUnap,            color: "#10b981" },
  ].filter(d => d.value > 0) : [];

  const specialPie = fundsReady && specialTotal > 0 ? [
    { name: "Slaughterhouse", value: sh?.total  ?? 0, color: "#8b5cf6" },
    { name: "OCC",            value: occ?.total ?? 0, color: "#0ea5e9" },
    { name: "Public Market",  value: pm?.total  ?? 0, color: "#f59e0b" },
  ].filter(d => d.value > 0) : [];

  const quickLinks = [
    { label: "Budget Plans",       href: "/admin/budget-plans",       icon: DocumentTextIcon,          iconColor: "text-blue-500"    },
    { label: "Departments",        href: "/admin/departments",         icon: BuildingOffice2Icon,       iconColor: "text-violet-500"  },
    { label: "Salary Tranche",     href: "/admin/tranche",             icon: BriefcaseIcon,             iconColor: "text-orange-500"  },
    { label: "Income Fund",        href: "/admin/income-general-fund", icon: BanknotesIcon,             iconColor: "text-emerald-600" },
    { label: "Personnel Services", href: "/admin/personnel-services",  icon: UserGroupIcon,             iconColor: "text-cyan-600"    },
    { label: "LBP Reports",        href: "/admin/reports",             icon: ChartBarIcon,              iconColor: "text-indigo-500"  },
    { label: "Stmt. of Indebt.",   href: "/admin/lbp-form5",           icon: ClipboardDocumentListIcon, iconColor: "text-rose-500"    },
    { label: "20% MDF Fund",       href: "/admin/mdf-fund",            icon: CurrencyDollarIcon,        iconColor: "text-amber-600"   },
  ];

  const handleDeptBarClick = (data: any) => {
    const payload = data?.activePayload?.[0]?.payload;
    if (!payload?.dept_id) return;
    navigate("/admin/lbp-forms", { state: { deptId: payload.dept_id } });
    };

  const loading = deptsLoading || plansLoading || matrixLoading;

  if (loading) {
    return (
      <div className="p-5 space-y-4">
        <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        <div className="space-y-2">
          <Shimmer className="h-3 w-52" style={st(0)} />
          <Shimmer className="h-7 w-44" style={st(1)} />
        </div>
        <div className="grid grid-cols-12 gap-4">
          {[0,1,2,3].map(i => <Shimmer key={i} className="col-span-6 lg:col-span-3 h-28" style={st(i + 2)} />)}
        </div>
        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12 lg:col-span-7 space-y-4">
            <Shimmer className="h-72 w-full" style={st(6)} />
            <Shimmer className="h-52 w-full" style={st(7)} />
          </div>
          <Shimmer className="col-span-12 lg:col-span-5 h-[500px]" style={st(8)} />
        </div>
        <Shimmer className="h-36 w-full" style={st(9)} />
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="p-5 pb-10">
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-end justify-between animate-in fade-in duration-500" style={st(0)}>
            <div>
              {/* <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
                Municipal Budget Office · Opol, Misamis Oriental
              </p>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight mt-0.5 leading-none">
                Dashboard
              </h1> */}
              <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight mt-0.5 leading-none">
                Overview
              </h1>
            </div>
            {!activePlan && (
              <Button size="sm" onClick={() => setCreateOpen(true)}
                className="gap-1.5 text-xs h-8 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl">
                <PlusIcon className="w-3.5 h-3.5" /> New Budget Plan
              </Button>
            )}
          </div>

          {/* ── ROW 1 ── */}
          <div className="grid grid-cols-12 gap-4 items-stretch">

            {/* Active Plan */}
            <Card style={st(1)} onClick={() => navigate("/admin/budget-plans")}
              className="col-span-6 lg:col-span-3 p-4 relative overflow-hidden flex flex-col">
              {activePlan && (
                <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
                  <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  <span className="text-[11px] font-medium text-emerald-500 tracking-wide ml-2">Active</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 mb-3.5">
                <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-4 h-4 text-blue-500" />
                </div>
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-zinc-400 leading-none">Budget Plan Year</p>
                  {/* {activePlan && (
                    // <p className="text-[11px] text-zinc-400 mt-0.5">Fiscal Year {activePlan.year}</p>
                  )} */}
                </div>
              </div>
              <div className="flex-1">
                <p className="text-[13px] font-medium text-zinc-500 leading-snug">Proposed Annual Budget</p>
                <p className="text-3xl font-semibold text-zinc-900 tracking-tight leading-none mt-1">
                  {activePlan ? activePlan.year : "—"}
                </p>
              </div>
              <div className="border-t border-zinc-100 pt-2.5 flex items-center justify-between mt-4">
                <span className="text-[10px] text-zinc-400">Budget Plans</span>
                <ChevronRightIcon className="w-3 h-3 text-zinc-400" />
              </div>
            </Card>

            {/* Departments */}
            <Card style={st(2)} onClick={() => navigate("/admin/departments")}
              className="col-span-6 lg:col-span-2 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-violet-50 flex items-center justify-center flex-shrink-0">
                  <BuildingOffice2Icon className="w-4 h-4 text-violet-500" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-zinc-400 leading-none">Departments</p>
              </div>
              <div className="flex-1">
                <p className="text-3xl font-semibold text-zinc-900 tracking-tight leading-none">
                  {departments.length}
                </p>
                <p className="text-[12px] text-zinc-400 mt-1">Registered Offices</p>
              </div>
              <div className="border-t border-zinc-100 pt-2.5 flex items-center justify-between mt-4">
                <span className="text-[10px] text-zinc-400">View all</span>
                <ChevronRightIcon className="w-3 h-3 text-zinc-400" />
              </div>
            </Card>

            {/* Salary Tranche */}
            <Card style={st(3)} onClick={() => navigate("/admin/tranche")}
              className="col-span-6 lg:col-span-2 p-4 flex flex-col">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
                  <BriefcaseIcon className="w-4 h-4 text-orange-500" />
                </div>
                <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-zinc-400 leading-none">Salary Tranche</p>
              </div>
              <div className="flex-1">
                <p className="text-lg font-semibold text-zinc-900 leading-tight truncate">
                  {activeVersion?.lbc_reference ?? "—"}
                </p>
                <p className="text-[11px] text-zinc-400 mt-1 truncate">
                  {activeVersion ? `${activeVersion.tranche} · ${activeVersion.income_class}` : "No active tranche"}
                </p>
              </div>
              <div className="border-t border-zinc-100 pt-2.5 flex items-center justify-between mt-4">
                <span className="text-[10px] text-zinc-400">Salary Standards</span>
                <ChevronRightIcon className="w-3 h-3 text-zinc-400" />
              </div>
            </Card>

            {/* Approval Progress */}
            <ApprovalProgressCard
              style={st(4)}
              completion={completion}
              totalWithPlan={totalWithPlan}
              approvedDepts={approvedDepts}
              submittedDepts={submittedDepts}
              draftDepts={draftDepts}
            />

          </div>

          {/* ── ROW 2 ── */}
          <div className="grid grid-cols-12 gap-4 items-start">

            {/* LEFT */}
            <div className="col-span-12 lg:col-span-7 space-y-4">

              {/* General Fund */}
              <Card style={st(5)} className="overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <ArrowTrendingUpIcon className="w-5 h-5 text-emerald-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">Estimated Revenue</p>
                      <p className="text-sm font-semibold text-zinc-900 mt-0.5">General Fund</p>
                    </div>
                  </div>
                  <button onClick={() => navigate("/admin/income-general-fund")}
                    className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-800 transition-colors font-medium">
                    View <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-5 space-y-3">
                  <div className="grid grid-cols-12 gap-3">

                    <div className="col-span-3 bg-zinc-50 rounded-2xl border border-zinc-100 p-3.5">
                      <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">Estimated Revenue</p>
                      <Money v={!fundsReady ? null : (gf?.total ?? 0)} loading={!fundsReady} size="lg" />
                    </div>

                    <div className="col-span-3 bg-zinc-50 rounded-2xl border border-zinc-100 p-3.5">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-500 mb-2 flex items-center gap-1">
                        <ArrowTrendingDownIcon className="w-3 h-3 text-zinc-400" />Expenditures
                      </p>
                      <Money
                        v={expLoading || allocLoading ? null : exp.gfExpenditure + mdfActual + ldrrmfPieTotal}
                        loading={expLoading || allocLoading}
                        size="lg"
                      />
                      {!expLoading && !allocLoading && (
                        <div className="mt-2 space-y-0.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[9px] text-zinc-400">Dept. expenses</span>
                            <span className="text-[9px] font-mono text-zinc-500">{pesoC(exp.gfExpenditure)}</span>
                          </div>
                          {mdfActual > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-zinc-400">20% MDF</span>
                              <span className="text-[9px] font-mono text-zinc-500">{pesoC(mdfActual)}</span>
                            </div>
                          )}
                          {ldrrmfPieTotal > 0 && (
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] text-zinc-400">5% LDRRMF</span>
                              <span className="text-[9px] font-mono text-zinc-500">{pesoC(ldrrmfPieTotal)}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="col-span-6 flex items-center gap-2">
                      {!fundsReady || expLoading ? (
                        <div className="flex-1 flex items-center justify-center">
                          <Shimmer className="w-24 h-24 rounded-full" />
                        </div>
                      ) : gfPie.length > 0 ? (
                        <>
                          <div className="w-[96px] flex-shrink-0">
                            <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 text-center mb-1">Allocation</p>
                            <ResponsiveContainer width="100%" height={88}>
                              <PieChart>
                                <Pie data={gfPie} cx="50%" cy="50%" innerRadius={24} outerRadius={42} paddingAngle={2} dataKey="value" strokeWidth={0}>
                                  {gfPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                                </Pie>
                                <Tooltip content={<PieTip />} />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                          <div className="flex-1 space-y-1.5 min-w-0">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#a1a1aa" }} />
                                <span className="text-xs text-zinc-500 font-medium truncate">Expenditures</span>
                              </div>
                              <span className="text-xs text-zinc-700 font-semibold font-mono flex-shrink-0">{pesoC(exp.gfExpenditure)}</span>
                            </div>
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#f59e0b" }} />
                                <span className="text-xs text-zinc-500 font-medium truncate">20% MDF</span>
                              </div>
                              <span className="text-xs text-zinc-700 font-semibold font-mono flex-shrink-0">{pesoC(mdfPieValue)}</span>
                            </div>
                            <div className="rounded-lg border border-zinc-100 bg-zinc-50 px-2 py-1.5 space-y-1">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#f43f5e" }} />
                                  <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">5% LDRRMF</span>
                                </div>
                                <span className="text-[10px] font-semibold font-mono text-zinc-500">{pesoC(ldrrmfPieTotal)}</span>
                              </div>
                              <div className="flex items-center justify-between pl-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#f43f5e" }} />
                                  <span className="text-[10px] text-zinc-400">30% QRF</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500">{pesoC(qrf)}</span>
                              </div>
                              <div className="flex items-center justify-between pl-3">
                                <div className="flex items-center gap-1.5">
                                  <span className="w-1 h-1 rounded-full flex-shrink-0" style={{ background: "#fb923c" }} />
                                  <span className="text-[10px] text-zinc-400">70% Pre-Disaster</span>
                                </div>
                                <span className="text-[10px] font-mono text-zinc-500">{pesoC(ldrrmf70Actual)}</span>
                              </div>
                            </div>
                            <div className={cn("rounded-lg border px-2 py-1.5", gfUnap >= 0 ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                              <div className="flex items-center gap-1 mb-0.5">
                                <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "#10b981" }} />
                                <p className={cn("text-[10px] font-semibold uppercase tracking-widest", gfUnap >= 0 ? "text-emerald-700" : "text-red-600")}>
                                  Unappropriated Balance
                                </p>
                              </div>
                              <p className={cn("text-sm font-semibold font-mono", gfUnap >= 0 ? "text-emerald-700" : "text-red-600")}>
                                {gfUnap >= 0 ? "+" : ""}{peso(gfUnap)}
                              </p>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="flex-1 flex items-center justify-center opacity-20">
                          <ChartBarIcon className="w-10 h-10 text-zinc-400" />
                        </div>
                      )}
                    </div>
                  </div>

                  {(gf?.nta ?? 0) > 0 && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-3.5">
                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500 mb-2">NTA · National Tax Allotment</p>
                        <Money v={!fundsReady ? null : (gf?.nta ?? 0)} loading={!fundsReady} size="md" />
                      </div>
                      <div className="bg-zinc-50 rounded-2xl border border-zinc-100 p-3.5 space-y-2">
                        <div className="flex items-center justify-between">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">20% MDF</p>
                          <span className="text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-200 rounded px-1.5 py-0.5">
                            {mdf > 0 ? `${Math.round((mdfActual / mdf) * 100)}%` : "0%"} allocated
                          </span>
                        </div>
                        <div className="flex items-baseline gap-1">
                          {allocLoading
                            ? <Shimmer className="h-5 w-24 rounded" />
                            : <><p className="text-base font-semibold text-amber-700">{pesoC(mdfActual)}</p>
                                <p className="text-[10px] text-zinc-400">/ {pesoC(mdf)}</p></>}
                        </div>
                        <div className="h-1 bg-amber-100 rounded-full overflow-hidden">
                          <div className="h-full bg-amber-400 rounded-full transition-all duration-700"
                            style={{ width: mdf > 0 ? `${Math.min(100, (mdfActual / mdf) * 100)}%` : "0%" }} />
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-zinc-400">Unallocated</span>
                          <span className="text-[10px] font-semibold font-mono text-amber-600">{pesoC(mdfRemaining)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {(gf?.total ?? 0) > 0 && fundsReady && (
                    <div className="rounded-2xl border border-zinc-100 overflow-hidden">
                      <div className="bg-zinc-50 px-4 py-3 flex items-center justify-between border-b border-zinc-100">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                            <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-500" />
                          </div>
                          <div>
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-600">5% LDRRMF</p>
                            <p className="text-[10px] text-zinc-400 mt-0.5">Local Disaster Risk Reduction Mgmt. Fund</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-base font-semibold text-zinc-900">{peso(ldrrmf)}</p>
                          <p className="text-[10px] text-zinc-400 font-mono">budgeted</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 bg-white">
                        <div className="px-4 py-3 border-r border-zinc-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">30% QRF</p>
                            {/* <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1 py-0.5">
                              {qrf > 0 ? `${Math.round((ldrrmf30Actual / qrf) * 100)}%` : "0%"}
                            </span> */}
                            <span className="text-[9px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded px-1 py-0.5">
                              reserved
                            </span>
                          </div>
                          {/* <div className="flex items-baseline gap-1">
                            {allocLoading ? <Shimmer className="h-4 w-16 rounded" />
                              : <><p className="text-sm font-semibold text-rose-700">{peso(ldrrmf30Actual)}</p>
                                  <p className="text-[10px] text-zinc-400">/ {peso(qrf)}</p></>}
                          </div>
                          <p className="text-[10px] text-zinc-400">allocated</p>
                          <div className="h-1 bg-rose-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full transition-all duration-700"
                              style={{ width: qrf > 0 ? `${Math.min(100, (ldrrmf30Actual / qrf) * 100)}%` : "0%" }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">Remaining</span>
                            <span className="text-[10px] font-semibold font-mono text-rose-500">{peso(ldrrmf30Remaining)}</span>
                          </div> */}
                          <div className="flex items-baseline gap-1">
                            {allocLoading ? <Shimmer className="h-4 w-16 rounded" />
                              : <><p className="text-sm font-semibold text-rose-700">{peso(qrf)}</p>
                                  <p className="text-[10px] text-zinc-400">/ {peso(qrf)}</p></>}
                          </div>
                          <p className="text-[10px] text-zinc-400">reserved · not yet disbursed</p>
                          <div className="h-1 bg-rose-100 rounded-full overflow-hidden">
                            <div className="h-full bg-rose-400 rounded-full transition-all duration-700"
                              style={{ width: "100%" }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">Available</span>
                            <span className="text-[10px] font-semibold font-mono text-rose-500">{peso(qrf)}</span>
                          </div>
                        </div>
                        <div className="px-4 py-3 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">70% Pre-Disaster</p>
                            <span className="text-[9px] font-semibold text-orange-600 bg-orange-50 border border-orange-200 rounded px-1 py-0.5">
                              {predis > 0 ? `${Math.round((ldrrmf70Actual / predis) * 100)}%` : "0%"}
                            </span>
                          </div>
                          <div className="flex items-baseline gap-1">
                            {allocLoading ? <Shimmer className="h-4 w-16 rounded" />
                              : <><p className="text-sm font-semibold text-orange-700">{peso(ldrrmf70Actual)}</p>
                                  <p className="text-[10px] text-zinc-400">/ {peso(predis)}</p></>}
                          </div>
                          <p className="text-[10px] text-zinc-400">allocated</p>
                          <div className="h-1 bg-orange-100 rounded-full overflow-hidden">
                            <div className="h-full bg-orange-400 rounded-full transition-all duration-700"
                              style={{ width: predis > 0 ? `${Math.min(100, (ldrrmf70Actual / predis) * 100)}%` : "0%" }} />
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] text-zinc-400">Remaining</span>
                            <span className="text-[10px] font-semibold font-mono text-orange-500">{peso(ldrrmf70Remaining)}</span>
                          </div>
                          <p className="text-[10px] text-zinc-300">JMC 2013-1 · R.A. 10121</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </Card>

              {/* Dept Expenditure Chart */}
              <Card style={st(6)} className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <ChartBarIcon className="w-4 h-4 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">Department Expenditures</p>
                      <p className="text-sm font-semibold text-zinc-900 mt-0.5">General Fund</p>
                    </div>
                  </div>
                  {!deptExpLoading && deptExp.length > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">Grand Total</p>
                      <p className="text-base font-semibold text-zinc-900 tabular-nums">
                        {pesoC(deptExp.reduce((sum, d) => sum + d.total, 0))}
                      </p>
                      <p className="text-[10px] font-mono text-zinc-400">
                        {peso(deptExp.reduce((sum, d) => sum + d.total, 0))}
                      </p>
                    </div>
                  )}
                </div>
                {deptExpLoading ? (
                  <Shimmer className="h-44 w-full" />
                ) : deptExp.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center gap-2 text-zinc-300">
                    <ChartBarIcon className="w-10 h-10" />
                    <p className="text-xs">No expenditure data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptExp} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={16} onClick={handleDeptBarClick} style={{ cursor: "pointer" }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                      <XAxis
                        dataKey="abbr"
                        interval={0}
                        angle={-35}
                        textAnchor="end"
                        tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 700 }}
                        tickLine={false}
                        axisLine={false}
                        height={40}
                      />
                      <YAxis tickFormatter={v => pesoC(v)} tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 600 }} tickLine={false} axisLine={false} width={56} />
                      <Tooltip content={<BarTip />} cursor={{ fill: "#f9f9f9", radius: 4 }} />
                      <Bar dataKey="total" name="Expenditure" radius={[4, 4, 0, 0]}>
                        {deptExp.map((_, i) => <Cell key={i} fill={`hsl(${220 + i * 18}, 70%, ${62 - i * 2}%)`} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <BreakdownCard activePlan={activePlan} style={st(7)} />
            </div>

            {/* RIGHT */}
            <div className="col-span-12 lg:col-span-5 space-y-4">

              {/* Special Accounts */}
              <Card style={st(7)} className="overflow-hidden">
                <div className="px-5 pt-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <BuildingStorefrontIcon className="w-5 h-5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">Estimated Revenue</p>
                      <p className="text-sm font-semibold text-zinc-900 mt-0.5">Special Accounts</p>
                    </div>
                  </div>
                  <button onClick={() => navigate("/admin/consolidated-special-income")}
                    className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-800 transition-colors font-medium">
                    View <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-5 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center justify-center">
                      {!fundsReady ? (
                        <Shimmer className="w-28 h-28 rounded-full" />
                      ) : specialPie.length > 0 ? (
                        <ResponsiveContainer width="100%" height={140}>
                          <PieChart>
                            <Pie data={specialPie} cx="50%" cy="50%" innerRadius={36} outerRadius={62} paddingAngle={3} dataKey="value" strokeWidth={0}>
                              {specialPie.map((e, i) => <Cell key={i} fill={e.color} />)}
                            </Pie>
                            <Tooltip content={<PieTip />} />
                          </PieChart>
                        </ResponsiveContainer>
                      ) : (
                        <div className="w-28 h-28 rounded-full border-4 border-dashed border-zinc-200 flex flex-col items-center justify-center gap-1">
                          <BuildingStorefrontIcon className="w-6 h-6 text-zinc-300" />
                          <p className="text-[9px] text-zinc-300 text-center leading-tight px-2">No revenue data</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-center gap-2.5">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-1">Combined Revenue</p>
                        <Money v={!fundsReady ? null : specialTotal} loading={!fundsReady} size="md" />
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400 mb-1">Expenditures</p>
                        <Money v={specialExpLoading ? null : specialExp} loading={specialExpLoading} size="sm" />
                      </div>
                      {fundsReady && (
                        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-2.5 py-2">
                          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-500">5% Calamity (combined)</p>
                          <p className="text-sm font-semibold text-zinc-800">{pesoC(specialCal)}</p>
                          <p className="text-xs text-zinc-400 font-mono">{peso(specialCal)}</p>
                        </div>
                      )}
                      {fundsReady && !specialExpLoading && <UnapBadge value={specialUnap} compact />}
                    </div>
                  </div>

                  <div className="border-t border-zinc-100" />

                  <Carousel opts={{ align: "start", loop: true }} className="w-full">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-zinc-400">Per Account</p>
                      <div className="flex items-center gap-2">
                        <CarouselDots count={3} />
                        <CarouselPrevious className="static h-7 w-7 translate-y-0 border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 rounded-xl" />
                        <CarouselNext    className="static h-7 w-7 translate-y-0 border-zinc-200 bg-white hover:bg-zinc-50 text-zinc-500 rounded-xl" />
                      </div>
                    </div>
                    <CarouselContent className="-ml-3">
                      {[
                        { label: "Slaughterhouse", abbr: "SH",  data: sh,  expV: shExpTotal,  cal: shCal,  accentColor: "#8b5cf6" },
                        { label: "OCC",            abbr: "OCC", data: occ, expV: occExpTotal, cal: occCal, accentColor: "#0ea5e9" },
                        { label: "Public Market",  abbr: "PM",  data: pm,  expV: pmExpTotal,  cal: pmCal,  accentColor: "#f59e0b" },
                      ].map(({ label, abbr, data, expV, cal, accentColor }) => {
                        const rev  = data?.total ?? 0;
                        const unap = Math.max(0, rev - expV - cal);
                        const uPos = unap >= 0;
                        const qrfV = cal * 0.30;
                        const preV = cal * 0.70;
                        return (
                          <CarouselItem key={abbr} className="pl-3 basis-full">
                            <div className="rounded-2xl border border-zinc-100 bg-zinc-50 p-4 space-y-3">
                              <div className="flex items-center gap-2">
                                <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                                <p className="text-sm font-semibold text-zinc-800 uppercase tracking-wide">{label}</p>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div className="bg-white rounded-xl p-3 border border-zinc-100">
                                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Estimated Revenue</p>
                                  {!fundsReady ? <Shimmer className="h-5 w-full" /> : (
                                    <><p className="text-base font-semibold text-zinc-800">{pesoC(rev)}</p>
                                    <p className="text-xs font-mono text-zinc-400">{peso(rev)}</p></>
                                  )}
                                </div>
                                <div className="bg-white rounded-xl p-3 border border-zinc-100">
                                  <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-1">Expenditure</p>
                                  {specialExpLoading ? <Shimmer className="h-5 w-full" /> : (
                                    <><p className="text-base font-semibold text-zinc-700">{pesoC(expV)}</p>
                                    <p className="text-xs font-mono text-zinc-400">{peso(expV)}</p></>
                                  )}
                                </div>
                              </div>
                              {fundsReady && (data?.nonTaxRevenue ?? 0) > 0 && (
                                <div className="rounded-xl border border-zinc-200 overflow-hidden bg-white">
                                  <div className="px-3 py-2 flex items-center justify-between border-b border-zinc-100">
                                    <div className="flex items-center gap-1.5">
                                      <ExclamationTriangleIcon className="w-3.5 h-3.5 text-rose-400 flex-shrink-0" />
                                      <div>
                                        <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-600">5% Calamity Fund</p>
                                        <p className="text-[10px] text-zinc-400">of Non-Tax Revenue</p>
                                      </div>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-sm font-semibold text-zinc-800">{pesoC(cal)}</p>
                                      <p className="text-xs text-zinc-400 font-mono">{peso(cal)}</p>
                                    </div>
                                  </div>
                                  <div className="grid grid-cols-2">
                                    <div className="px-3 py-2 border-r border-zinc-100">
                                      <p className="text-[10px] font-semibold uppercase text-zinc-500">30% QRF</p>
                                      <p className="text-sm font-semibold text-zinc-700">{pesoC(qrfV)}</p>
                                      <p className="text-xs text-zinc-400 font-mono">{peso(qrfV)}</p>
                                    </div>
                                    <div className="px-3 py-2">
                                      <p className="text-[10px] font-semibold uppercase text-zinc-500">70% Pre-Disaster</p>
                                      <p className="text-sm font-semibold text-zinc-700">{pesoC(preV)}</p>
                                      <p className="text-xs text-zinc-400 font-mono">{peso(preV)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                              <div className={cn("rounded-xl border px-3 py-2 flex items-center justify-between", uPos ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200")}>
                                <div className="flex items-center gap-1.5">
                                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: uPos ? "#10b981" : "#ef4444" }} />
                                  <p className={cn("text-[10px] font-semibold uppercase tracking-widest", uPos ? "text-emerald-700" : "text-red-600")}>Unappropriated Balance</p>
                                </div>
                                <p className={cn("text-sm font-semibold font-mono", uPos ? "text-emerald-700" : "text-red-600")}>
                                  {uPos ? "+" : ""}{peso(unap)}
                                </p>
                              </div>
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>
              </Card>

              {/* Quick Links */}
              <Card style={st(8)} className="p-5">
                <p className="text-[10px] font-semibold tracking-[0.12em] uppercase text-zinc-400 mb-4">Quick Links</p>
                <div className="grid grid-cols-4 gap-2">
                  {quickLinks.map(link => (
                    <button key={link.href} onClick={() => navigate(link.href)}
                      className="flex flex-col items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 p-3 text-center hover:bg-zinc-100 hover:border-zinc-200 transition-all group">
                      <div className="w-8 h-8 rounded-xl bg-white border border-zinc-100 flex items-center justify-center">
                        <link.icon className={cn("w-4 h-4", link.iconColor)} />
                      </div>
                      <span className="text-[10px] font-medium text-zinc-600 group-hover:text-zinc-900 leading-tight">{link.label}</span>
                    </button>
                  ))}
                </div>
              </Card>

            </div>
          </div>

          {/* Missing depts warning */}
           {/* ── AREA CHART ROW ── */}
          <BudgetAreaChart />

          {/* Missing depts warning */}
          {activePlan && missingDepts.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both rounded-2xl border border-zinc-200 bg-zinc-50 p-4 flex items-start gap-3" style={st(9)}>
              <div className="w-7 h-7 rounded-xl bg-white border border-zinc-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-zinc-800">
                  {missingDepts.length} department{missingDepts.length !== 1 ? "s" : ""} without a budget plan
                </p>
                <p className="text-sm text-zinc-500 mt-0.5">
                  {missingDepts.map(d => d.dept_abbreviation ?? d.dept_name).join(" · ")}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Create Budget Plan Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-sm rounded-2xl border-zinc-200 gap-0 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-zinc-100">
              <DialogTitle className="text-base font-semibold text-zinc-900">New Budget Plan</DialogTitle>
              <DialogDescription className="text-xs text-zinc-400 mt-0.5">
                Department plans for all departments will be auto-initialized.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <ShadcnLabel className="text-xs font-semibold text-zinc-600">
                  Fiscal Year <span className="text-red-400">*</span>
                </ShadcnLabel>
                <Input type="number" value={newYear} onChange={e => setNewYear(parseInt(e.target.value))}
                  className="h-9 text-sm font-mono" placeholder={String(new Date().getFullYear() + 1)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold text-zinc-600">Set as Active</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">Will deactivate the current active plan</p>
                </div>
                <Switch checked={newActive} onCheckedChange={setNewActive} />
              </div>
              {newActive && activePlan && (
                <div className="rounded-xl bg-zinc-50 border border-zinc-200 px-3 py-2.5">
                  <p className="text-sm text-zinc-700 font-semibold">FY {activePlan.year} will be deactivated.</p>
                </div>
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-zinc-100 gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border-zinc-200"
                onClick={() => setCreateOpen(false)} disabled={createPlan.isPending}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-zinc-900 hover:bg-zinc-800"
                onClick={handleCreatePlan} disabled={createPlan.isPending || !newYear}>
                {createPlan.isPending
                  ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Creating…</>
                  : "Create Plan"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
};

export default AdminDashboard;
