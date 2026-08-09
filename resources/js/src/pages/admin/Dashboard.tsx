import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label as ShadcnLabel } from "../../components/ui/label";
import { Switch } from "../../components/ui/switch";
import { Card as ShadcnCard } from "../../components/ui/card";
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
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip,
  RadialBarChart, RadialBar,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  PolarGrid, PolarRadiusAxis,
  Label as RechartsLabel,
} from "recharts";
import { ChartContainer, type ChartConfig } from "../../components/ui/chart";
import { useActiveSalaryVersion } from "../../hooks/useSalaryMatrix";
import { useBudgetTotals } from "../../hooks/useBudgetTotals";
import { cn } from "@/src/lib/utils";
import {
  PlusIcon, ChevronRightIcon, BuildingOffice2Icon,
  DocumentTextIcon, CurrencyDollarIcon, UserGroupIcon,
  ChartBarIcon, BriefcaseIcon, BanknotesIcon,
  ClipboardDocumentListIcon, ArrowTrendingUpIcon,
  ArrowTrendingDownIcon, CheckCircleIcon, ClockIcon,
  ExclamationTriangleIcon, BuildingStorefrontIcon,
InformationCircleIcon, BuildingLibraryIcon, ShieldExclamationIcon,
BoltIcon, LifebuoyIcon,
} from "@heroicons/react/24/outline";
import {
Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../../components/ui/tooltip";
import { Department } from "../../types/api";
import {
  useDepartmentsLite, useBudgetPlans, useDepartmentBudgetPlans,
  useAllFunds,
  useMdfFund, useLdrrmfSummary, useLdrrmfSummarySource, useDeptExpenditures,
  useCreateBudgetPlan,
} from "../../hooks/useDashboardQueries";

import { BudgetAreaChart } from "@/src/components/charts/BudgetAreaChart";
import { BreakdownCard } from "@/src/components/cards/BreakdownCard";
import { SectorAllocationCard } from "@/src/components/cards/SectorAllocationCard";

import { useNotificationStore } from "@/src/store/useNotificationStore";
import { BellIcon } from "@heroicons/react/24/outline";
import { formatDistanceToNow } from "date-fns"; // optional — or use a simple formatter below

import { PsLimitationCard } from "@/src/components/cards/PsLimitationCard";
import { AnnouncementsCarousel } from "@/src/components/cards/AnnouncementsCarousel";
import { useAuth } from "../../hooks/useAuth";
import API from "../../services/api";

const getInitials = (d: Department) =>
  (d.dept_abbreviation ?? d.dept_name).slice(0, 2).toUpperCase();

// const peso = (v: number) => `₱${Math.round(v).toLocaleString("en-PH")}`;

const peso = (v: number) => `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// REPLACE WITH
const pesoC = (v: number): string => {
  if (v >= 1_000_000_000) {
    const n = v / 1_000_000_000;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
  }
  if (v >= 1_000_000) {
    const n = v / 1_000_000;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  }
  if (v >= 1_000) {
    const n = v / 1_000;
    return `₱${n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
  }
  return `₱${v.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const st = (i: number): React.CSSProperties => ({ animationDelay: `${i * 60}ms` });

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 640 : false
  );
  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);
  return isMobile;
};

// Treat anything that rounds to ₱0.00 as fully appropriated (avoids float-precision false positives)
const isZeroAmount = (v: number) => Math.round(v * 100) === 0;

const PieTip = ({ active, payload }: any) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-3 py-2 min-w-[150px]">
      <div className="flex items-center gap-1.5 mb-1">
        <span className="w-2 h-2 rounded-full" style={{ background: p?.color ?? p?.fill }} />
        <span className="text-sm font-bold text-foreground/80">{name}</span>
      </div>
      <p className="text-sm font-semibold text-foreground font-mono">{peso(value)}</p>
    </div>
  );
};

const BarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-3 py-2 min-w-[140px]">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-1">{label}</p>
      <p className="text-sm font-semibold text-foreground font-mono">{pesoC(payload[0].value)}</p>
      <p className="text-xs text-muted-foreground font-mono">{peso(payload[0].value)}</p>
    </div>
  );
};

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={cn("relative overflow-hidden rounded-2xl bg-muted animate-in fade-in duration-700 fill-mode-both", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-background/70 to-transparent" />
    </div>
  );
}


const DeptAvatars = React.memo(function DeptAvatars({ depts, max = 8 }: { depts: Department[]; max?: number }) {
  const visible = depts.slice(0, max), rest = depts.length - max;
  return (
    <div className="flex -space-x-1.5 flex-wrap">
      {visible.map(d => (
        <Avatar key={d.dept_id} className="h-6 w-6 rounded-full border-2 border-white shadow-sm">
          <AvatarImage src={d.logo ? `/storage/${d.logo}` : undefined} />
          <AvatarFallback className="text-[9px] font-bold bg-muted text-muted-foreground">{getInitials(d)}</AvatarFallback>
        </Avatar>
      ))}
      {rest > 0 && (
        <div className="h-6 w-6 rounded-full border-2 border-white bg-muted-foreground flex items-center justify-center text-[9px] font-bold text-white">+{rest}</div>
      )}
    </div>
  );
});

// Dashboard-local wrapper around shadcn/ui's <Card>: adds the entrance
// animation + hover affordance every dashboard tile shares, while staying
// a real shadcn Card underneath (rounded-xl border bg-card shadow).
function Card({ children, className, style, onClick }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <ShadcnCard
      onClick={onClick}
      style={style}
      className={cn(
        "rounded-2xl shadow-sm",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        onClick && "cursor-pointer hover:border-foreground/20 hover:shadow-md transition-all",
        className
      )}
    >
      {children}
    </ShadcnCard>
  );
}

function Money({ v, loading, size = "lg", cls = "text-foreground", sub = "text-muted-foreground" }: {
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
  if (v === null) return <p className="text-muted-foreground/60 font-bold text-lg">—</p>;
  return (
    <div>
      <p className={cn("font-semibold leading-none tabular-nums tracking-tight truncate",
        size === "xl" ? "text-4xl" : size === "lg" ? "text-2xl" : size === "md" ? "text-lg" : size === "sm" ? "text-base" : "text-sm",
        cls
      )}>{pesoC(v)}</p>
      <p className={cn("font-mono mt-1.5 text-[10px] truncate", sub)}>{peso(v)}</p>
    </div>
  );
}

function UnapBadge({ value, compact = false }: { value: number; compact?: boolean }) {
  const zero = isZeroAmount(value);
  const pos = zero || value > 0;
  return (
    <div className={cn(
      "rounded-xl border flex items-center justify-between",
      compact ? "px-2.5 py-1.5" : "px-3 py-2.5",
      pos ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"
    )}>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: pos ? "hsl(var(--chart-2))" : "hsl(var(--destructive))" }} />
        <p className={cn("font-semibold uppercase tracking-widest truncate", compact ? "text-[10px]" : "text-xs", pos ? "text-emerald-700" : "text-red-600")}>
          {zero ? "Fully Appropriated" : pos ? "Unappropriated Balance" : "Over-Appropriated"}
        </p>
      </div>
      <p className={cn("font-semibold font-mono tabular-nums ml-2 flex-shrink-0", compact ? "text-xs" : "text-sm", pos ? "text-emerald-700" : "text-red-600")}>
        {zero ? "" : pos ? "+" : ""}{peso(Math.abs(value))}
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
              ? "w-3 h-1.5 bg-muted-foreground"
              : "w-1.5 h-1.5 bg-border hover:bg-muted-foreground/60"
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
  underReviewDepts: Department[];
  draftDepts: Department[];
}> = ({ style, completion, totalWithPlan, approvedDepts, submittedDepts, underReviewDepts, draftDepts }) => {

  const [activeIdx, setActiveIdx] = useState(() => {
    if (approvedDepts.length > 0) return 0;
    if (underReviewDepts.length > 0) return 1;
    if (submittedDepts.length > 0) return 2;
    if (draftDepts.length > 0) return 3;
    return 0;
  });
  const [visible, setVisible] = useState(true);

  const statuses = [
    { label: "Approved",     depts: approvedDepts,    color: "hsl(var(--chart-2))", icon: <CheckCircleIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--chart-2))" }} /> },
    { label: "Under Review", depts: underReviewDepts,  color: "#8b5cf6", icon: <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#8b5cf6" }} /> },
    { label: "Submitted",    depts: submittedDepts,    color: "hsl(var(--cat-1))", icon: <DocumentTextIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--cat-1))" }} /> },
    { label: "Draft",        depts: draftDepts,        color: "hsl(var(--fin-mdf))", icon: <ClockIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "hsl(var(--fin-mdf))" }} /> },
  ];

  // Only rotate through statuses that actually have departments in them.
  // If everything is Approved (100%), there's nothing else to show, so stay put.
  const nonEmptyCount = statuses.filter(s => s.depts.length > 0).length;

  useEffect(() => {
    if (nonEmptyCount <= 1) return; // nothing to rotate to — stay on the one that has data

    const interval = setInterval(() => {
      setVisible(false);
      setTimeout(() => {
        setActiveIdx(prev => {
          // skip empty statuses when advancing
          let next = prev;
          for (let i = 0; i < statuses.length; i++) {
            next = (next + 1) % statuses.length;
            if (statuses[next].depts.length > 0) break;
          }
          return next;
        });
        setVisible(true);
      }, 400);
    }, 5000);
    return () => clearInterval(interval);
  }, [nonEmptyCount]);

  const s = statuses[activeIdx];

  const radialConfig = {
  completion: {
    label: "Approved",
    color: "hsl(var(--chart-2))"  // ← color goes in config
  },
} satisfies ChartConfig;

  return (
  <Card style={style} className="col-span-12 lg:col-span-5 p-3.5 flex flex-col rounded-lg">
    <div className="flex items-center gap-2 mb-4">
      <div className="w-7 h-7 rounded-md bg-emerald-50 flex items-center justify-center flex-shrink-0">
        <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
      </div>
      <p className="text-eyebrow">Approval Progress</p>
    </div>

    <div className="flex items-center gap-5 flex-1">
      <div className="relative w-24 h-24 flex-shrink-0">
        <ChartContainer config={radialConfig} className="w-full h-full">
          <RadialBarChart
            data={[{ name: "completion", value: completion, fill: "var(--color-completion)" }]}
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
                      <tspan x={vb.cx} y={vb.cy} style={{ fontSize: 16, fontWeight: 700, fill: "hsl(var(--foreground))" }}>
                        {completion}%
                      </tspan>
                      <tspan x={vb.cx} y={vb.cy + 14} style={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}>
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

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 mb-3">
          {statuses.map((st, i) => (
            <button
              key={st.label}
              onClick={() => { setVisible(false); setTimeout(() => { setActiveIdx(i); setVisible(true); }, 400); }}
              className="rounded-full transition-all duration-300"
              style={{ width: i === activeIdx ? 12 : 6, height: 6, background: i === activeIdx ? s.color : "hsl(var(--border))" }}
            />
          ))}
        </div>

        <div className="relative min-w-0" style={{ height: 100 }}>
          {statuses.map((st, i) => (
            <div
              key={st.label}
              style={{
                transition: "opacity 400ms ease, transform 400ms ease",
                opacity: i === activeIdx ? (visible ? 1 : 0) : 0,
                transform: i === activeIdx ? (visible ? "translateY(0)" : "translateY(6px)") : "translateY(6px)",
                position: "absolute", inset: 0,
                pointerEvents: i === activeIdx ? "auto" : "none",
              }}
              className="rounded-md bg-muted/40 border border-border p-3"
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-1.5">
                  {st.icon}
                  <span className="text-[10px] font-medium text-muted-foreground">{st.label}</span>
                </div>
                <span className="text-xl font-semibold text-foreground">{st.depts.length}</span>
              </div>
              <div className="h-1 rounded-full bg-border overflow-hidden mb-2">
                <div className="h-full rounded-full transition-all duration-700"
                  style={{ width: totalWithPlan > 0 ? `${(st.depts.length / totalWithPlan) * 100}%` : "0%", background: st.color }} />
              </div>
              {st.depts.length > 0
                ? <DeptAvatars depts={st.depts} max={10} />
                : <p className="text-[10px] text-muted-foreground/60">None yet</p>}
            </div>
          ))}
        </div>
      </div>
    </div>
  </Card>
);
};

const typeConfig: Record<string, { label: string; color: string; bg: string; border: string }> = {
  budget_submitted: { label: "Submitted",  color: "text-blue-600",   bg: "bg-blue-50",    border: "border-blue-200"   },
  budget_approved:  { label: "Approved",   color: "text-emerald-600",bg: "bg-emerald-50", border: "border-emerald-200" },
  budget_returned:  { label: "Returned",   color: "text-amber-600",  bg: "bg-amber-50",   border: "border-amber-200"  },
};

const timeAgo = (date: string | Date) => {
  const diff = Date.now() - new Date(date).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const RecentActivityCard: React.FC<{
  style: React.CSSProperties;
  activePlanYear: number | null;
}> = ({ style, activePlanYear }) => {
  return (
    <Card style={style} className="overflow-hidden">
      <div className="px-4 pt-4 pb-3 border-b border-muted">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
            <BellIcon className="w-4 h-4 text-muted-foreground" />
          </div>
          <div>
            <p className="text-eyebrow leading-none">Recent Activity</p>
            {activePlanYear && (
              <p className="text-[10px] text-muted-foreground mt-0.5">FY {activePlanYear}</p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center gap-2 min-h-[465px] text-muted-foreground/60">
        <BellIcon className="w-8 h-8" />
        <p className="text-xs">No recent activity</p>
      </div>
    </Card>
  );
};

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const isMobile = useIsMobile();
  const { data: activeVersion = null, isLoading: matrixLoading } = useActiveSalaryVersion();

  const [createOpen, setCreateOpen] = useState(false);
  const [newYear,    setNewYear]    = useState(new Date().getFullYear() + 1);
  const [newActive,  setNewActive]  = useState(false);

  const { data: departments = [], isLoading: deptsLoading } = useDepartmentsLite();
  const { data: plans = [],       isLoading: plansLoading } = useBudgetPlans();

  const activePlan = useMemo(() => plans.find(p => p.is_active) ?? null, [plans]);
  const planId     = activePlan?.budget_plan_id;

  const { data: deptBudgetPlans = [] } = useDepartmentBudgetPlans(planId);

  const { data: funds } = useAllFunds();
  const fundsReady = funds !== undefined;
  const gf  = funds?.gf  ?? null;
  const sh  = funds?.sh  ?? null;
  const occ = funds?.occ ?? null;
  const pm  = funds?.pm  ?? null;

  const { data: mdfAllocated = 0, isLoading: mdfLoading } = useMdfFund(planId);
//   const { data: ldrrmfData,       isLoading: ldrLoading  } = useLdrrmfSummary(planId);
const { data: ldrrmfData,       isLoading: ldrLoading  } = useLdrrmfSummary(planId);
const { data: ldrrmfSh  = { reserved30: 0, total70: 0 } } = useLdrrmfSummarySource(planId, 'sh');
const { data: ldrrmfOcc = { reserved30: 0, total70: 0 } } = useLdrrmfSummarySource(planId, 'occ');
const { data: ldrrmfPm  = { reserved30: 0, total70: 0 } } = useLdrrmfSummarySource(planId, 'pm');
//   const { data: deptExp = [],     isLoading: deptExpLoading } = useDeptExpenditures(planId, departments);
const { data: deptExp = [], isLoading: deptExpLoading } = useDeptExpenditures(planId, departments);
  const { totals: exp, loading: expLoading } = useBudgetTotals(activePlan);

//   const shExpTotal  = exp.shExpenditure  + exp.shCalamity;
// const occExpTotal = exp.occExpenditure + exp.occCalamity;
// const pmExpTotal  = exp.pmExpenditure  + exp.pmCalamity;

//   const gfLocalSource = gf?.localSource ?? 0;
const gfLocalSource = gf?.localSource ?? 0;
  const overallTotal  = gfLocalSource + (sh?.total ?? 0) + (occ?.total ?? 0) + (pm?.total ?? 0);

  // % change of Estimated Revenue vs prior fiscal year (active plan year − 1)
  const gfPrevYear      = activePlan ? activePlan.year - 1 : null;
  const gfPrevTotal     = gf?.previousTotal ?? 0;
  const gfChangePercent = fundsReady && !isZeroAmount(gfPrevTotal)
    ? (((gf?.total ?? 0) - gfPrevTotal) / gfPrevTotal) * 100
    : null;

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

  const draftDepts       = useMemo(() => deptBudgetPlans.filter(p => p.status === 'draft').map(p => p.department).filter(Boolean) as Department[], [deptBudgetPlans]);
  const submittedDepts   = useMemo(() => deptBudgetPlans.filter(p => p.status === 'submitted').map(p => p.department).filter(Boolean) as Department[], [deptBudgetPlans]);
  const underReviewDepts = useMemo(() => deptBudgetPlans.filter(p => p.status === 'under_review').map(p => p.department).filter(Boolean) as Department[], [deptBudgetPlans]);
  const approvedDepts    = useMemo(() => deptBudgetPlans.filter(p => p.status === 'approved').map(p => p.department).filter(Boolean) as Department[], [deptBudgetPlans]);
  const withPlanIds      = new Set(deptBudgetPlans.map(p => p.dept_id));
  const missingDepts     = departments.filter(d => !withPlanIds.has(d.dept_id));
  const totalWithPlan    = draftDepts.length + submittedDepts.length + underReviewDepts.length + approvedDepts.length;
  const completion       = totalWithPlan > 0 ? Math.round((approvedDepts.length / totalWithPlan) * 100) : 0;

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
//   const ldrrmf = (gf?.total ?? 0) * 0.05;
//   const qrf    = ldrrmf * 0.30;
//   const predis = ldrrmf * 0.70;

// const roundMoney = (value: number) =>
//   Math.round((value + Number.EPSILON) * 100) / 100;

// const ldrrmf = roundMoney((gf?.total ?? 0) * 0.05);
// const qrf = roundMoney(ldrrmf * 0.30);
// const predis = roundMoney(ldrrmf - qrf);
const roundMoney = (value: number) =>
  Math.round((value + Number.EPSILON) * 100) / 100;

const ldrrmf = roundMoney((gf?.total ?? 0) * 0.05);

// Round 30% first (in integer cents to dodge float drift), then 70% is
// whatever's left over — this is what financial systems do, and it's the
// only way the two halves are guaranteed to sum back to the total.
const ldrrmfCents = Math.round(ldrrmf * 100);
const qrfCents = Math.round(ldrrmfCents * 0.30);
const qrf = qrfCents / 100;
const predis = (ldrrmfCents - qrfCents) / 100;


  const mdf    = (gf?.nta ?? 0) * 0.20;

  // QRF is reserved (not yet disbursed) — actual used = 0 until spending is recorded.
  // Show qrf as fully allocated to itself (100% reserved, 0% spent).
  const ldrrmf30Actual    = 0;
  const ldrrmf30Remaining = qrf;  // entire QRF is still available
  const mdfRemaining      = Math.max(0, mdf - mdfActual);
//   const ldrrmf70Remaining = Math.max(0, predis - ldrrmf70Actual);
const ldrrmf70Remaining = predis - ldrrmf70Actual;
  // const ldrrmfPieTotal = qrf + ldrrmf70Actual;
//   const ldrrmfPieTotal = qrf + ldrrmf70Actual; // qrf is always fully reserved
const ldrrmfPieTotal = roundMoney(qrf + ldrrmf70Actual);
  const mdfPieValue    = mdfActual;
  //const gfUnap         = Math.max(0, (gf?.total ?? 0) - exp.gfExpenditure - mdfPieValue - ldrrmfPieTotal);

//   const gfUnap = (gf?.total ?? 0) - exp.gfExpenditure - mdfPieValue - ldrrmfPieTotal;
const gfUnap = (gf?.total ?? 0) - exp.gfExpenditure - mdfPieValue - ldrrmfPieTotal;

  const gfExpPercent = fundsReady && (gf?.total ?? 0) > 0
    ? ((exp.gfExpenditure + mdfActual + ldrrmfPieTotal) / (gf?.total ?? 0)) * 100
    : null;

  const shCal        = (sh?.nonTaxRevenue  ?? 0) * 0.05;
  const occCal       = (occ?.nonTaxRevenue ?? 0) * 0.05;
  const pmCal        = (pm?.nonTaxRevenue  ?? 0) * 0.05;
//   const specialTotal = (sh?.total ?? 0) + (occ?.total ?? 0) + (pm?.total ?? 0);
const specialTotal = (sh?.total ?? 0) + (occ?.total ?? 0) + (pm?.total ?? 0);
  const overallEstimatedIncome = (gf?.total ?? 0) + specialTotal;

  // TODO: replace with DB fetch when population table is ready
  const POPULATION = { count: 66_836, year: 2024, surveyor: "POPCEN" } as const;
//   const perCapita  = overallEstimatedIncome > 0 ? overallEstimatedIncome / POPULATION.count : null;
// //   const specialExp   = shExpTotal + occExpTotal + pmExpTotal;
// //   const specialCal   = shCal + occCal + pmCal;
// // //   const specialUnap  = Math.max(0, specialTotal - specialExp - specialCal);
// // const specialUnap  = specialTotal - specialExp - specialCal;
// const specialExp   = shExpTotal + occExpTotal + pmExpTotal; // already includes calamity (shExpTotal = expenditure + calamity)
//   const specialCal   = shCal + occCal + pmCal;
// //   const specialUnap  = Math.max(0, specialTotal - specialExp - specialCal);
// const specialUnap  = specialTotal - specialExp; // do NOT subtract specialCal again — it's already folded into specialExp

const perCapita  = overallEstimatedIncome > 0 ? overallEstimatedIncome / POPULATION.count : null;

  const overallPrevTotal = (gf?.previousTotal ?? 0) + (sh?.previousTotal ?? 0) + (occ?.previousTotal ?? 0) + (pm?.previousTotal ?? 0);
  const overallChangePercent = fundsReady && !isZeroAmount(overallPrevTotal)
    ? ((overallEstimatedIncome - overallPrevTotal) / overallPrevTotal) * 100
    : null;

  const overallPrevLocalSource = (gf?.previousLocalSource ?? 0) + (sh?.previousTotal ?? 0) + (occ?.previousTotal ?? 0) + (pm?.previousTotal ?? 0);
  const overallLocalSourceChangePercent = fundsReady && !isZeroAmount(overallPrevLocalSource)
    ? ((overallTotal - overallPrevLocalSource) / overallPrevLocalSource) * 100
    : null;

  // QRF (30%) is always treated as reserved/used. The 70% Pre-Disaster portion
  // only counts what's actually been allocated (ldrrmf items entered) —
  // NOT the full theoretical 70% ceiling, even if nothing has been allocated yet.
  const shQrf  = shCal  * 0.30;
  const occQrf = occCal * 0.30;
  const pmQrf  = pmCal  * 0.30;

  const shExpTotal  = exp.shExpenditure;
const occExpTotal = exp.occExpenditure;
const pmExpTotal  = exp.pmExpenditure;

const combinedQrf        = shQrf + occQrf + pmQrf;
const combinedPreDisaster = ldrrmfSh.total70 + ldrrmfOcc.total70 + ldrrmfPm.total70;
const combinedCalamity   = combinedQrf + combinedPreDisaster;
// console.log("combinedQrf:", combinedQrf, "combinedPreDisaster:", combinedPreDisaster, "combinedCalamity:", combinedCalamity);
// console.log("shCal:", shCal, "occCal:", occCal, "pmCal:", pmCal);
// console.log("ldrrmfSh:", ldrrmfSh, "ldrrmfOcc:", ldrrmfOcc, "ldrrmfPm:", ldrrmfPm);

  const specialExp   = shExpTotal + occExpTotal + pmExpTotal;
  const specialCal   = shCal + occCal + pmCal; // kept for the "5% Calamity (combined)" display card only
  const specialUnap = specialTotal - specialExp - combinedCalamity;

  const overallExpenditure = (exp.gfExpenditure + mdfActual + ldrrmfPieTotal) + (specialExp + combinedCalamity);



  const gfPie = fundsReady && (gf?.total ?? 0) > 0 ? [
    { name: "Expenditures",           value: exp.gfExpenditure, color: "hsl(var(--fin-expenditure))" },
    { name: "20% MDF",                value: mdfPieValue,       color: "hsl(var(--fin-mdf))" },
    { name: "5% · 30% QRF",          value: qrf,               color: "hsl(var(--fin-qrf))" },
    { name: "5% · 70% Pre-Disaster",  value: ldrrmf70Actual,    color: "hsl(var(--fin-predisaster))" },
    //{ name: "Unappropriated Balance", value: gfUnap,            color: "hsl(var(--chart-2))" },
    { name: "Unappropriated Balance", value: Math.abs(gfUnap),  color: gfUnap >= 0 ? "hsl(var(--chart-2))" : "hsl(var(--fin-qrf))" },
  ].filter(d => d.value > 0) : [];

  const specialPie = fundsReady && specialTotal > 0 ? [
    { name: "Slaughterhouse", value: sh?.total  ?? 0, color: "hsl(var(--cat-2))" },
    { name: "OCC",            value: occ?.total ?? 0, color: "hsl(var(--fin-income))" },
    { name: "Public Market",  value: pm?.total  ?? 0, color: "hsl(var(--fin-mdf))" },
  ].filter(d => d.value > 0) : [];

  const specialExpPie = fundsReady && specialExp > 0 ? [
    { name: "Slaughterhouse", value: exp.shExpenditure  ?? 0, color: "hsl(var(--cat-2) / 0.4)" },
    { name: "OCC",            value: exp.occExpenditure ?? 0, color: "hsl(var(--fin-income) / 0.4)" },
    { name: "Public Market",  value: exp.pmExpenditure  ?? 0, color: "hsl(var(--fin-mdf) / 0.4)" },
  ].filter(d => d.value > 0) : [];

 const quickLinks = [
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
      <div className="p-3 sm:p-5 pb-10">
        <div className="space-y-4">

          {/* Header */}
          <div className="flex items-end justify-between gap-4 animate-in fade-in duration-500" style={st(0)}>
            <div className="flex-shrink-0">
              <p className="text-eyebrow">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h1 className="text-page-title">
                Overview
              </h1>
            </div>
            <div className="flex-1 min-w-0">
              <AnnouncementsCarousel />
            </div>
            {!activePlan && (
              <Button size="sm" onClick={() => setCreateOpen(true)}
                className="gap-1.5 text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl flex-shrink-0">
                <PlusIcon className="w-3.5 h-3.5" /> New Budget Plan
              </Button>
            )}
          </div>

          {/* ── ROW 1 ── */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">

           {/* Active Plan */}
<Card style={st(1)} onClick={isViewer ? undefined : () => navigate("/admin/budget-plans")}
  className="col-span-6 lg:col-span-3 p-3.5 relative overflow-hidden flex flex-col rounded-lg">
  {activePlan && (
    <div className="absolute top-3.5 right-3.5 flex items-center gap-1.5">
      <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
      <span className="text-[11px] font-medium text-emerald-500 tracking-wide ml-2">Active</span>
    </div>
  )}
  <div className="flex items-center gap-2 mb-3 pr-14">
    <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
      <DocumentTextIcon className="w-3.5 h-3.5 text-blue-500" />
    </div>
    <p className="text-eyebrow leading-none truncate">Budget Plan Year</p>
  </div>
  <div className="flex-1">
    <p className="text-subtitle leading-snug">Proposed Annual Budget</p>
    <p className="text-metric leading-none mt-1">
      {activePlan ? activePlan.year : "—"}
    </p>
  </div>
  {!isViewer && (
    <div className="border-t border-border pt-2.5 flex items-center justify-between mt-4">
      <span className="text-eyebrow">Budget Plans</span>
      <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
    </div>
  )}
</Card>

{/* Departments */}
<Card style={st(2)} onClick={isViewer ? undefined : () => navigate("/admin/departments")}
  className="col-span-6 lg:col-span-2 p-3.5 flex flex-col rounded-lg">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0">
      <BuildingOffice2Icon className="w-3.5 h-3.5 text-violet-500" />
    </div>
    <p className="text-eyebrow leading-none">Departments</p>
  </div>
  <div className="flex-1">
    <p className="text-metric leading-none">
      {departments.length}
    </p>
    <p className="text-metric-support mt-1">Registered Offices</p>
  </div>
  {!isViewer && (
    <div className="border-t border-border pt-2.5 flex items-center justify-between mt-4">
      <span className="text-eyebrow">View all</span>
      <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
    </div>
  )}
</Card>

{/* Salary Tranche */}
<Card style={st(3)} onClick={isViewer ? undefined : () => navigate("/admin/tranche")}
  className="col-span-6 lg:col-span-2 p-3.5 flex flex-col rounded-lg">
  <div className="flex items-center gap-2 mb-3">
    <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
      <BriefcaseIcon className="w-3.5 h-3.5 text-orange-500" />
    </div>
    <p className="text-eyebrow leading-none">Salary Tranche</p>
  </div>
  <div className="flex-1">
    <p className="text-section-title leading-tight truncate">
      {activeVersion?.lbc_reference ?? "—"}
    </p>
    <p className="text-metric-support mt-1 truncate">
      {activeVersion ? `${activeVersion.tranche} · ${activeVersion.income_class}` : "No active tranche"}
    </p>
  </div>
  {!isViewer && (
    <div className="border-t border-border pt-2.5 flex items-center justify-between mt-4">
      <span className="text-eyebrow">Salary Standards</span>
      <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
    </div>
  )}
</Card>

            {/* Approval Progress */}
            <ApprovalProgressCard
              style={st(4)}
              completion={completion}
              totalWithPlan={totalWithPlan}
              approvedDepts={approvedDepts}
              submittedDepts={submittedDepts}
              underReviewDepts={underReviewDepts}
              draftDepts={draftDepts}
            />

          </div>

          {/* ── ROW 2 ── */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-start">

            {/* LEFT */}
            <div className="col-span-12 lg:col-span-7 space-y-3 sm:space-y-4">

              {/* General Fund */}
<Card style={st(5)} className="overflow-hidden rounded-lg">
  <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className="w-7 h-7 rounded-md bg-blue-50 flex items-center justify-center flex-shrink-0">
        <BanknotesIcon className="w-3.5 h-3.5 text-blue-500" />
      </div>
      <div>
        <p className="text-eyebrow">Estimated Revenue</p>
        <p className="text-section-title mt-0.5">General Fund</p>
      </div>
    </div>
    <button onClick={() => navigate("/admin/income-general-fund")}
      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
      View <ChevronRightIcon className="w-3 h-3" />
    </button>
  </div>

  <div className="p-4 space-y-2">
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

      {/* Estimated Revenue — hero card */}
      <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-sky-400 via-blue-500 to-indigo-500 shadow-md">
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-14 -left-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <svg className="absolute top-2 right-2 w-20 h-20 text-white/10 pointer-events-none" viewBox="0 0 80 80" fill="none">
          <circle cx="60" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="60" cy="20" r="28" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <ArrowTrendingUpIcon className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <p className="text-[11px] text-white/85 font-medium">Estimated Revenue</p>
            </div>
            {gfChangePercent !== null && (
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap",
                "bg-white/15 backdrop-blur-sm border",
                gfChangePercent >= 0 ? "border-emerald-300/40 text-emerald-200" : "border-red-300/40 text-red-200"
              )}>
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  gfChangePercent >= 0 ? "bg-emerald-300" : "bg-red-300"
                )} />
                {gfChangePercent >= 0 ? "+" : ""}{gfChangePercent.toFixed(2)}% vs Current Year {gfPrevYear}
              </span>
            )}
          </div>

          {!fundsReady ? (
            <div className="space-y-1.5">
              <div className="h-7 w-32 bg-white/20 rounded-lg animate-pulse" />
              <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold text-white tabular-nums tracking-tight leading-none">
                {pesoC(gf?.total ?? 0)}
              </p>
              <p className="text-[10px] font-mono text-white/70 mt-1.5">{peso(gf?.total ?? 0)}</p>
            </>
          )}

          <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/70">Local Source (Tax + Non-Tax)</span>
              <span className="text-xs font-semibold tabular-nums text-white">{fundsReady ? peso(gfLocalSource) : "—"}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[11px] text-white/70">NTA (National Tax Allotment)</span>
              <span className="text-xs font-semibold tabular-nums text-white">{fundsReady ? peso(gf?.nta ?? 0) : "—"}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expenditures — hero card */}
      <div className="relative overflow-hidden rounded-xl p-4 bg-gradient-to-br from-orange-400 via-orange-500 to-amber-500 shadow-md">
        <div className="absolute -top-10 -left-10 w-36 h-36 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -bottom-14 -right-10 w-32 h-32 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <svg className="absolute top-2 right-2 w-20 h-20 text-white/10 pointer-events-none" viewBox="0 0 80 80" fill="none">
          <circle cx="60" cy="20" r="18" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="60" cy="20" r="28" stroke="currentColor" strokeWidth="1" />
        </svg>

        <div className="relative">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5">
              <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center flex-shrink-0">
                <ArrowTrendingDownIcon className="w-3.5 h-3.5 text-orange-600" />
              </div>
              <p className="text-[11px] text-white/85 font-medium">Expenditures</p>
            </div>
            {gfExpPercent !== null && (
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold rounded-full px-2 py-0.5 whitespace-nowrap bg-white/15 backdrop-blur-sm border border-white/30 text-white/90">
                {gfExpPercent.toFixed(2)}% of revenue
              </span>
            )}
          </div>

          {expLoading || allocLoading ? (
            <div className="space-y-1.5">
              <div className="h-7 w-32 bg-white/20 rounded-lg animate-pulse" />
              <div className="h-3 w-28 bg-white/10 rounded animate-pulse" />
            </div>
          ) : (
            <>
              <p className="text-2xl font-semibold text-white tabular-nums tracking-tight leading-none">
                {pesoC(exp.gfExpenditure + mdfActual + ldrrmfPieTotal)}
              </p>
              <p className="text-[10px] font-mono text-white/70 mt-1.5">
                {peso(exp.gfExpenditure + mdfActual + ldrrmfPieTotal)}
              </p>
            </>
          )}

          {!expLoading && !allocLoading && (
            <div className="mt-3 pt-3 border-t border-white/20 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-white/70">Department Expenditures</span>
                <span className="text-xs font-semibold tabular-nums text-white">{peso(exp.gfExpenditure)}</span>
              </div>
              {mdfActual > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/70">20% MDF</span>
                  <span className="text-xs font-semibold tabular-nums text-white">{peso(mdfActual)}</span>
                </div>
              )}
              {ldrrmfPieTotal > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-white/70">5% LDRRMF</span>
                  <span className="text-xs font-semibold tabular-nums text-white">{peso(ldrrmfPieTotal)}</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>

    {fundsReady && (() => {
      const zero = isZeroAmount(gfUnap);
      const pos  = zero || gfUnap > 0;
      const over = !zero && !pos;

      return (
        <div className="rounded-lg border border-border bg-card px-4 py-3">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn(
                "text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                zero ? "bg-emerald-100 text-emerald-700" : pos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
              )}>
                {zero ? "BALANCED" : pos ? "UNALLOCATED" : "OVER-APPROPRIATED"}
              </span>
              <p className="text-[11px] text-muted-foreground whitespace-nowrap">
                Revenue − Expenditures
              </p>
            </div>
            <p className={cn(
              "text-base font-bold font-mono tabular-nums flex-shrink-0 inline-flex items-center gap-1",
              zero ? "text-emerald-700" : pos ? "text-emerald-700" : "text-red-600"
            )}>
              {!zero && (
                pos
                  ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                  : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
              )}
              {peso(Math.abs(gfUnap))}
            </p>
          </div>

          {over && (
            <p className="text-[10px] text-red-500 font-medium mt-2 flex items-start gap-1.5">
              <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0 mt-1" />
              <span>Expenditures exceed appropriated revenue — reduce spending or increase revenue to balance</span>
            </p>
          )}
        </div>
      );
    })()}

    {(gf?.nta ?? 0) > 0 && (
      <div className="rounded-lg border p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <BuildingLibraryIcon className="w-3 h-3 flex-shrink-0 text-fin-mdf" /> 20% MDF · From NTA
          </p>
          <span className={cn(
            "text-[10px] font-medium",
            mdfActual > mdf ? "text-red-600" : "text-muted-foreground"
          )}>
            {mdf > 0 ? `${Math.round((mdfActual / mdf) * 100)}%` : "0%"} allocated
          </span>
        </div>
        {allocLoading ? <Shimmer className="h-5 w-24 rounded" /> : (
          <p className="text-base font-semibold text-foreground">{peso(mdfActual)} <span className="text-xs text-muted-foreground font-normal">/ {peso(mdf)}</span></p>
        )}
        <div className="h-1 bg-muted rounded-full overflow-hidden">
          <div className={cn("h-full rounded-full transition-all duration-700", mdfActual > mdf ? "bg-red-500" : "bg-fin-mdf")}
            style={{ width: mdf > 0 ? `${Math.min(100, (mdfActual / mdf) * 100)}%` : "0%" }} />
        </div>
        <div className="flex items-center justify-between text-[11px]">
          <span className={cn(mdfActual > mdf ? "text-red-600 font-medium" : "text-muted-foreground")}>
            {mdfActual > mdf ? "Over-appropriated" : "Unallocated"}
          </span>
          <span className={cn("font-medium", mdfActual > mdf ? "text-red-600" : undefined)}>
            {mdfActual > mdf ? peso(mdfActual - mdf) : peso(mdfRemaining)}
          </span>
        </div>
      </div>
    )}

    {(gf?.total ?? 0) > 0 && fundsReady && (
      <div className="rounded-lg border overflow-hidden">
        <div className="px-3.5 py-2.5 border-b flex items-center justify-between">
          <p className="text-[11px] text-muted-foreground">5% LDRRMF · From Estimated Revenue</p>
          <p className="text-xs font-semibold text-foreground">{peso(ldrrmf)}</p>
        </div>
        <div className="grid grid-cols-2 divide-x">
          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <BoltIcon className="w-3 h-3 flex-shrink-0 text-fin-qrf" /> 30% QRF
              </p>
              <span className="text-[10px] text-muted-foreground">reserved</span>
            </div>
            <p className="text-sm font-semibold text-foreground">{peso(qrf)}</p>
            <div className="h-1 bg-muted rounded-full"><div className="h-full w-full bg-fin-qrf rounded-full" /></div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Available</span>
              <span className="text-[10px] font-medium">{peso(qrf)}</span>
            </div>
          </div>
          <div className="p-3.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                <LifebuoyIcon className="w-3 h-3 flex-shrink-0 text-fin-predisaster" /> 70% Pre-Disaster
              </p>
              <span className="text-[10px] text-muted-foreground">
                {predis > 0 ? `${Math.round((ldrrmf70Actual / predis) * 100)}%` : "0%"}
              </span>
            </div>
            <p className="text-sm font-semibold text-foreground">{peso(ldrrmf70Actual)} <span className="text-[11px] text-muted-foreground font-normal">/ {peso(predis)}</span></p>
            <div className="h-1 bg-muted rounded-full overflow-hidden">
              <div className="h-full bg-fin-predisaster rounded-full transition-all duration-700"
                style={{ width: predis > 0 ? `${Math.min(100, (ldrrmf70Actual / predis) * 100)}%` : "0%" }} />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-muted-foreground">Remaining</span>
              <span className="text-[10px] font-medium">{peso(ldrrmf70Remaining)}</span>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
</Card>

              {/* Dept Expenditure Chart */}
              {/* <Card style={st(6)} className="p-5"> */}

              {/* Overall Income Fund */}
              <Card style={st(6)} className="p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                    <BanknotesIcon className="w-3.5 h-3.5 text-indigo-500" />
                  </div>
                  <div>
                    <p className="text-eyebrow">Combined Estimated Revenue</p>
                    <p className="text-section-title mt-0.5">Overall Income Fund</p>
                  </div>
                </div>

                <div className="mt-2.5 rounded-lg border divide-y lg:divide-y-0 lg:divide-x lg:grid lg:grid-cols-4">
                    {/* Per Capita */}
                  <div className="p-4 min-w-0">
                    <div className="flex items-center gap-1 mb-2">
                      <p className="text-eyebrow text-muted-foreground truncate">Per Capita</p>
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button className="text-muted-foreground/50 hover:text-muted-foreground transition-colors flex-shrink-0">
                              <InformationCircleIcon className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent
                            side="top"
                            className="max-w-[200px] text-center text-xs leading-snug"
                          >
                            Rounded to the nearest centavo. Multiplying back by population
                            may not exactly equal the total due to rounding.
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>

                    {!fundsReady ? (
                      <Shimmer className="h-8 w-24 rounded-lg" />
                    ) : perCapita !== null ? (
                      <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none truncate">
                        {peso(perCapita)}
                      </p>
                    ) : (
                      <p className="text-muted-foreground/40 font-semibold text-2xl">—</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-2">approx. per person</p>

                    <div className="mt-2 pt-2 border-t">
                      <p className="text-[10px] text-muted-foreground/70 truncate">
                        Pop: <span className="font-medium text-foreground/70">{POPULATION.count.toLocaleString("en-PH")}</span> · {POPULATION.year} {POPULATION.surveyor}
                      </p>
                    </div>
                  </div>
                  {/* Overall Income */}
                  <div className="p-4 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="text-eyebrow text-muted-foreground">Overall Income</p>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        {overallChangePercent !== null && (
                          <TooltipProvider delayDuration={200}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className={cn(
                                  "text-[9px] font-semibold rounded-full px-2 py-0.5 cursor-default",
                                  overallChangePercent >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                                )}>
                                  {overallChangePercent >= 0 ? "+" : ""}{overallChangePercent.toFixed(2)}%
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="text-xs">
                                <p className="font-medium">vs Current Year {gfPrevYear}</p>
                                <p className="text-muted-foreground mt-0.5">{peso(overallPrevTotal)}</p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        )}
                        </div>
                    </div>
                    {!fundsReady ? (
                      <Shimmer className="h-8 w-32 rounded-lg" />
                    ) : (
                      <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none truncate">
                        {pesoC(overallEstimatedIncome)}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground mt-2">
                      {fundsReady ? peso(overallEstimatedIncome) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t">GF Total (incl. NTA) + Special Accounts</p>
                  </div>

                  {/* Overall Expenditures */}
                  <div className="p-4 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="text-eyebrow text-muted-foreground">Overall Expenditures</p>
                    </div>
                    {expLoading || allocLoading || specialExpLoading ? (
                      <Shimmer className="h-8 w-32 rounded-lg" />
                    ) : (
                      <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none truncate">
                        {pesoC(overallExpenditure)}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground mt-2">
                      {!expLoading && !allocLoading && !specialExpLoading ? peso(overallExpenditure) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t">GF Expenditures + Special Accounts</p>
                  </div>

                  {/* Overall Local Source */}
                  <div className="p-4 min-w-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <p className="text-eyebrow text-muted-foreground">Overall Local Source</p>
                      {overallLocalSourceChangePercent !== null && (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className={cn(
                                "text-[9px] font-semibold rounded-full px-2 py-0.5 flex-shrink-0 cursor-default",
                                overallLocalSourceChangePercent >= 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                              )}>
                                {overallLocalSourceChangePercent >= 0 ? "+" : ""}{overallLocalSourceChangePercent.toFixed(2)}%
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-xs">
                              <p className="font-medium">vs Current Year {gfPrevYear}</p>
                              <p className="text-muted-foreground mt-0.5">{peso(overallPrevLocalSource)}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                    {!fundsReady ? (
                      <Shimmer className="h-8 w-32 rounded-lg" />
                    ) : (
                      <p className="text-2xl font-semibold text-foreground tabular-nums tracking-tight leading-none truncate">
                        {pesoC(overallTotal)}
                      </p>
                    )}
                    <p className="text-[10px] font-mono text-muted-foreground mt-2">
                      {fundsReady ? peso(overallTotal) : "—"}
                    </p>
                    <p className="text-[10px] text-muted-foreground/70 mt-2 pt-2 border-t">GF Local Source + Special Accounts</p>
                  </div>




                </div>
              </Card>

              {/* Dept Expenditure Chart */}
              <Card style={st(6)} className="p-4 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <ChartBarIcon className="w-3.5 h-3.5 text-indigo-500" />
                    </div>
                    <div>
                      <p className="text-eyebrow">Department Expenditures</p>
                      <p className="text-section-title mt-0.5">General Fund</p>
                    </div>
                  </div>
                  {!deptExpLoading && deptExp.length > 0 && (
                    <div className="text-right">
                      <p className="text-[10px] font-medium text-muted-foreground">Grand Total</p>
                      <p className="text-base font-semibold text-foreground tabular-nums">
                        {pesoC(deptExp.reduce((sum, d) => sum + d.total, 0))}
                      </p>
                      <p className="text-[10px] font-mono text-muted-foreground">
                        {peso(deptExp.reduce((sum, d) => sum + d.total, 0))}
                      </p>
                    </div>
                  )}
                </div>
               {!deptExpLoading && deptExp.length > 0 && (
                  <div className="flex items-center gap-4 mb-3">
                    {[
                      { label: "General Public Svc", color: "hsl(var(--cat-1))" },
                      { label: "Social Services",    color: "hsl(var(--cat-2))" },
                      { label: "Economic Services",  color: "hsl(var(--cat-3))" },
                    ].map(s => (
                      <div key={s.label} className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: s.color }} />
                        <span className="text-[10px] font-medium text-muted-foreground">{s.label}</span>
                      </div>
                    ))}
                  </div>
                )}
                {deptExpLoading ? (
                  <Shimmer className="h-44 w-full" />
                ) : deptExp.length === 0 ? (
                  <div className="h-44 flex flex-col items-center justify-center gap-2 text-muted-foreground/60">
                    <ChartBarIcon className="w-10 h-10" />
                    <p className="text-xs">No expenditure data yet</p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={deptExp} margin={{ top: 4, right: 4, left: 0, bottom: 0 }} barSize={16} onClick={handleDeptBarClick} style={{ cursor: "pointer" }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                      <XAxis
                        dataKey="abbr"
                        interval={0}
                        angle={isMobile ? -90 : -35}
                        textAnchor="end"
                        tick={{ fontSize: isMobile ? 8 : 9, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                        tickLine={false}
                        axisLine={false}
                        height={isMobile ? 60 : 40}
                      />
                      <YAxis tickFormatter={v => pesoC(v)} tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }} tickLine={false} axisLine={false} width={56} />
                      <RechartsTooltip content={<BarTip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
                      <Bar dataKey="total" name="Expenditure" radius={[4, 4, 0, 0]}>
                        {deptExp.map((d, i) => {
                          const fill =
                            d.categoryId === 1 ? "hsl(var(--cat-1))" :
                            d.categoryId === 2 ? "hsl(var(--cat-2))" :
                            d.categoryId === 3 ? "hsl(var(--cat-3))" :
                                                 "hsl(var(--cat-4))";
                          return <Cell key={i} fill={fill} />;
                        })}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </Card>

              <PsLimitationCard planId={planId} style={st(7)} />
            </div>

            {/* RIGHT */}
            <div className="col-span-12 lg:col-span-5 space-y-3 sm:space-y-4">

              {/* Special Accounts */}
              <Card style={st(7)} className="overflow-hidden rounded-lg">
                <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-violet-50 flex items-center justify-center flex-shrink-0">
                      <BuildingStorefrontIcon className="w-3.5 h-3.5 text-violet-500" />
                    </div>
                    <div>
                      <p className="text-eyebrow">Estimated Revenue</p>
                      <p className="text-section-title mt-0.5">Special Accounts</p>
                    </div>
                  </div>
                  <button onClick={() => navigate("/admin/consolidated-special-income")}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium">
                    View <ChevronRightIcon className="w-3 h-3" />
                  </button>
                </div>
                <div className="p-4 space-y-3">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 items-stretch">
  {/* Charts column */}
  <div className="flex flex-col items-center justify-center gap-0.5">
    {!fundsReady ? (
      <Shimmer className="w-32 h-32 rounded-full" />
    ) : specialPie.length > 0 ? (
      <ResponsiveContainer width="100%" height={200} minWidth={200}>
          <PieChart margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
            <Pie data={specialPie} cx="50%" cy="50%" innerRadius={54} outerRadius={82} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {specialPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              <RechartsLabel
                content={(props: any) => {
                  const vb = props?.viewBox as { cx?: number; cy?: number } | undefined;
                  if (!vb?.cx || !vb?.cy) return null;
                  return (
                    <text x={vb.cx} y={vb.cy} textAnchor="middle">
                      <tspan x={vb.cx} y={vb.cy - 6} style={{ fontSize: 17, fontWeight: 700, fill: "hsl(var(--foreground))" }}>
                        {pesoC(specialTotal)}
                      </tspan>
                      <tspan x={vb.cx} y={vb.cy + 12} style={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}>
                        Combined Revenue
                      </tspan>
                    </text>
                  );
                }}
              />
            </Pie>
            {specialExpPie.length > 0 && (
              <Pie data={specialExpPie} cx="50%" cy="50%" innerRadius={86} outerRadius={98} paddingAngle={3} dataKey="value" strokeWidth={0}>
                {specialExpPie.map((e, i) => <Cell key={i} fill={e.color} />)}
              </Pie>
            )}
            <RechartsTooltip content={<PieTip />} />
          </PieChart>
        </ResponsiveContainer>
    ) : (
      <div className="w-32 h-32 rounded-full border-4 border-dashed border-border flex flex-col items-center justify-center gap-1">
        <BuildingStorefrontIcon className="w-6 h-6 text-muted-foreground/60" />
        <p className="text-[9px] text-muted-foreground/60 text-center leading-tight px-2">No revenue data</p>
      </div>
    )}

    {/* Legend for the donut */}
    {fundsReady && specialPie.length > 0 && (
      <div className="flex flex-col items-center gap-1">
        <div className="flex items-center gap-3 flex-wrap justify-center">
          {specialPie.map(e => (
            <div key={e.name} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: e.color }} />
              <span className="text-[10px] text-muted-foreground">{e.name}</span>
            </div>
          ))}
        </div>
        <p className="text-[9px] text-muted-foreground/60">Inner ring: Revenue · Outer ring: Expenditure</p>
      </div>
    )}

    {fundsReady && combinedCalamity > 0 && (() => {
      const calChartConfig = {
        qrf:         { label: "30% QRF",          color: "hsl(var(--fin-qrf))" },
        predisaster: { label: "70% Pre-Disaster", color: "hsl(var(--fin-predisaster))" },
      } satisfies ChartConfig;
      const calChartData = [{ qrf: combinedQrf, predisaster: combinedPreDisaster }];
      const CalTip = ({ active, payload }: any) => {
        if (!active || !payload?.length) return null;
        return (
          <div className="bg-white border border-border rounded-xl shadow-lg px-3 py-2 space-y-1 min-w-[160px]">
            {payload.map((p: any) => (
              <div key={p.dataKey} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
                  <span className="text-[10px] font-semibold text-foreground/70">{calChartConfig[p.dataKey as keyof typeof calChartConfig]?.label}</span>
                </div>
                <span className="text-[10px] font-mono font-semibold text-foreground">{peso(p.value)}</span>
              </div>
            ))}
          </div>
        );
      };
      return (
        <div className="w-full flex justify-center pt-1 pb-0">
          <ChartContainer config={calChartConfig} className="mx-auto w-full" style={{ height: 120 }}>
            <RadialBarChart data={calChartData} endAngle={180} innerRadius={63} outerRadius={118} cy="65%">
              <PolarGrid gridType="circle" radialLines={false} stroke="none" />
              <RadialBar dataKey="qrf"         stackId="a" cornerRadius={5} fill="var(--color-qrf)"         className="stroke-transparent stroke-2" />
              <RadialBar dataKey="predisaster" stackId="a" cornerRadius={5} fill="var(--color-predisaster)" className="stroke-transparent stroke-2" />
              <RechartsTooltip content={<CalTip />} cursor={false} />
              <PolarRadiusAxis tick={false} tickLine={false} axisLine={false}>
                <RechartsLabel
                  content={(props: any) => {
                    const vb = props?.viewBox as { cx?: number; cy?: number } | undefined;
                    if (!vb?.cx || !vb?.cy) return null;
                    return (
                      <text x={vb.cx} y={vb.cy} textAnchor="middle">
                        <tspan x={vb.cx} y={vb.cy - 10} style={{ fontSize: 18, fontWeight: 700, fill: "hsl(var(--foreground))" }}>
                          {pesoC(combinedCalamity)}
                        </tspan>
                        <tspan x={vb.cx} y={vb.cy + 10} style={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}>
                          5% Calamity Combined
                        </tspan>
                      </text>
                    );
                  }}
                />
              </PolarRadiusAxis>
            </RadialBarChart>
          </ChartContainer>
        </div>
      );
    })()}
  </div>

  {/* Stats column */}
  <div className="flex flex-col gap-2">
    <div className="rounded-lg border p-4 min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground mb-2 truncate">Combined Expenditures</p>
      <Money v={specialExpLoading ? null : (specialExp + combinedCalamity)} loading={specialExpLoading} size="md" />
    </div>

    <p className="text-[10px] font-medium text-muted-foreground">5% Calamity Breakdown</p>
    <div className="rounded-lg border divide-y">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BoltIcon className="w-3.5 h-3.5 flex-shrink-0 text-fin-qrf" />
          <div>
            <p className="text-[11px] font-medium text-foreground">30% QRF</p>
            <p className="text-[10px] text-muted-foreground">Quick Response Fund</p>
          </div>
        </div>
        <p className="text-xs font-semibold font-mono text-foreground">{peso(combinedQrf)}</p>
      </div>
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LifebuoyIcon className="w-3.5 h-3.5 flex-shrink-0 text-fin-predisaster" />
          <div>
            <p className="text-[11px] font-medium text-foreground">70% Pre-Disaster</p>
            <p className="text-[10px] text-muted-foreground">Mitigation & Preparedness</p>
          </div>
        </div>
        <p className="text-xs font-semibold font-mono text-foreground">{peso(combinedPreDisaster)}</p>
      </div>
    </div>

    {fundsReady && !specialExpLoading && (() => {
  const zero = isZeroAmount(specialUnap);
  const pos = zero || specialUnap > 0;
  const over = !zero && !pos;

  return (
    <div className="rounded-lg border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-2 min-w-0 mb-1.5">
        <span className={cn(
          "text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
          zero ? "bg-emerald-100 text-emerald-700" : pos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
        )}>
          {zero ? "BALANCED" : pos ? "UNALLOCATED" : "OVER-APPROPRIATED"}
        </span>
        <p className="text-[11px] text-muted-foreground truncate">
          Revenue − Expenditures
        </p>
      </div>
      <p className={cn(
        "text-base font-bold font-mono tabular-nums inline-flex items-center gap-1",
        zero ? "text-emerald-700" : pos ? "text-emerald-700" : "text-red-600"
      )}>
        {!zero && (
          pos
            ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
            : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
        )}
        {peso(Math.abs(specialUnap))}
      </p>

      {over && (
        <p className="text-[10px] text-red-500 font-medium mt-2 flex items-start gap-1.5">
          <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0 mt-1" />
          <span>Expenditures exceed appropriated revenue — reduce spending or increase revenue to balance</span>
        </p>
      )}
    </div>
  );
})()}
  </div>
</div>

                  <div className="border-t border-muted" />

                  <Carousel opts={{ align: "start", loop: true }} className="w-full">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">Per Account</p>
                      <div className="flex items-center gap-2">
                        <CarouselDots count={3} />
                        <CarouselPrevious className="static h-7 w-7 translate-y-0 border-border bg-white hover:bg-muted/50 text-muted-foreground rounded-xl" />
                        <CarouselNext    className="static h-7 w-7 translate-y-0 border-border bg-white hover:bg-muted/50 text-muted-foreground rounded-xl" />
                      </div>
                    </div>
                    <CarouselContent className="-ml-3">
                      {[
                        // { label: "Slaughterhouse", abbr: "SH",  data: sh,  expV: exp.shExpenditure,  cal: shCal,  accentColor: "hsl(var(--cat-2))" },
                        // { label: "OCC",            abbr: "OCC", data: occ, expV: exp.occExpenditure, cal: occCal, accentColor: "hsl(var(--fin-income))" },
                        // { label: "Public Market",  abbr: "PM",  data: pm,  expV: exp.pmExpenditure,  cal: pmCal,  accentColor: "hsl(var(--fin-mdf))" },
                        { label: "Slaughterhouse", abbr: "SH",  data: sh,  expV: exp.shExpenditure,  cal: shCal,  accentColor: "hsl(var(--cat-2))", allocated70: ldrrmfSh.total70  },
        { label: "OCC",            abbr: "OCC", data: occ, expV: exp.occExpenditure, cal: occCal, accentColor: "hsl(var(--fin-income))", allocated70: ldrrmfOcc.total70 },
        { label: "Public Market",  abbr: "PM",  data: pm,  expV: exp.pmExpenditure,  cal: pmCal,  accentColor: "hsl(var(--fin-mdf))", allocated70: ldrrmfPm.total70  },
                    //   ].map(({ label, abbr, data, expV, cal, accentColor }) => {
                    ].map(({ label, abbr, data, expV, cal, accentColor, allocated70 }) => {
                        const rev  = data?.total ?? 0;
                        const calCents = Math.round(cal * 100);
                        const qrfCentsV = Math.round(calCents * 0.30);
                        const qrfV = qrfCentsV / 100;
                        const preV = (calCents - qrfCentsV) / 100;
                        const calActual = qrfV + allocated70;
                        const unap = rev - expV - calActual;
                        const uPos = unap >= 0;

                        // Find the dept_id for this special account by abbreviation
                        const deptEntry = departments.find(d =>
                          (d.dept_abbreviation ?? "").toUpperCase() === abbr.toUpperCase()
                        );
                        const handleViewDept = () => {
                          if (!deptEntry) return;
                          navigate("/admin/lbp-forms", { state: { deptId: deptEntry.dept_id } });
                        };

                        return (
                          <CarouselItem key={abbr} className="pl-3 basis-full">
                            <div className="rounded-lg border p-4 space-y-3">
                              {/* Header */}
                              <div className="flex items-center justify-between pb-3 border-b">
                                <div className="flex items-center gap-2">
                                  <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: accentColor }} />
                                  <p className="text-sm font-semibold text-foreground uppercase tracking-wide">{label}</p>
                                </div>
                                {deptEntry && (
                                  <button
                                    onClick={handleViewDept}
                                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium"
                                  >
                                    View <ChevronRightIcon className="w-3 h-3" />
                                  </button>
                                )}
                              </div>

                              {/* Revenue / Expenditure — side by side, expenditure box includes the breakdown */}
                              <div className="rounded-lg border grid grid-cols-2 divide-x items-stretch">
                                <div className="p-3">
                                  <p className="text-[10px] font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
                                    <ArrowTrendingUpIcon className="w-3 h-3 flex-shrink-0 text-fin-income" /> Estimated Revenue
                                  </p>
                                  {!fundsReady ? <Shimmer className="h-6 w-full" /> : (
                                    <><p className="text-lg font-semibold text-foreground leading-none">{pesoC(rev)}</p>
                                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{peso(rev)}</p></>
                                  )}
                                </div>

                                <div className="p-3">
                                  <div className="flex items-center justify-between mb-1.5 gap-1">
                                    <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1 whitespace-nowrap">
                                      <ArrowTrendingDownIcon className="w-3 h-3 flex-shrink-0 text-fin-expenditure" /> Expenditures
                                    </p>
                                    {fundsReady && !specialExpLoading && rev > 0 && (
                                      <span className="text-[9px] font-semibold text-muted-foreground bg-muted rounded-full px-1.5 py-0.5 whitespace-nowrap">
                                        {(((expV + calActual) / rev) * 100).toFixed(2)}%
                                      </span>
                                    )}
                                  </div>
                                  {specialExpLoading ? <Shimmer className="h-6 w-full" /> : (
                                    <>
                                      <p className="text-lg font-semibold text-foreground leading-none">{pesoC(expV + calActual)}</p>
                                      <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{peso(expV + calActual)}</p>
                                      <div className="mt-2 pt-2 border-t space-y-1">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="text-[9px] text-muted-foreground truncate">Dept. Expenditures</span>
                                          <span className="text-[9px] font-semibold tabular-nums whitespace-nowrap">{peso(expV)}</span>
                                        </div>
                                        {calActual > 0 && (
                                          <div className="flex items-center justify-between gap-1">
                                            <span className="text-[9px] text-muted-foreground truncate">5% Calamity Fund</span>
                                            <span className="text-[9px] font-semibold tabular-nums whitespace-nowrap">{peso(calActual)}</span>
                                          </div>
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {/* 5% Calamity Fund */}
                              {fundsReady && (data?.nonTaxRevenue ?? 0) > 0 && (
                                <div className="rounded-lg border p-3 space-y-2.5">
                                  <div className="flex items-center justify-between">
                                    <p className="text-[11px] text-muted-foreground">5% Calamity Fund · of Non-Tax Revenue</p>
                                    <span className="text-sm font-bold text-foreground tabular-nums">{peso(cal)}</span>
                                  </div>

                                  <div className="rounded-lg border grid grid-cols-2 divide-x">
                                    <div className="p-2.5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <BoltIcon className="w-3 h-3 flex-shrink-0 text-fin-qrf" /> 30% QRF
                                        </p>
                                        <span className="text-[9px] text-muted-foreground">reserved</span>
                                      </div>
                                      <p className="text-sm font-semibold text-foreground">{peso(qrfV)}</p>
                                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full w-full bg-fin-qrf rounded-full" />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground">Available</span>
                                        <span className="text-[10px] font-medium">{peso(qrfV)}</span>
                                      </div>
                                    </div>

                                    <div className="p-2.5 space-y-1">
                                      <div className="flex items-center justify-between">
                                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                          <LifebuoyIcon className="w-3 h-3 flex-shrink-0 text-fin-predisaster" /> 70% Pre-Disaster
                                        </p>
                                        <span className="text-[9px] text-muted-foreground">{preV > 0 ? `${Math.round((allocated70 / preV) * 100)}%` : "0%"}</span>
                                      </div>
                                      <p className="text-sm font-semibold text-foreground">{peso(allocated70)} <span className="text-[10px] text-muted-foreground font-normal">/ {peso(preV)}</span></p>
                                      <div className="h-1 bg-muted rounded-full overflow-hidden">
                                        <div className="h-full bg-fin-predisaster rounded-full transition-all duration-700" style={{ width: preV > 0 ? `${Math.min(100, (allocated70 / preV) * 100)}%` : "0%" }} />
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-[10px] text-muted-foreground">{preV - allocated70 < 0 ? "Over" : "Remaining"}</span>
<span className={cn("text-[10px] font-medium", preV - allocated70 < 0 && "text-red-600")}>
  {peso(Math.abs(preV - allocated70))}
</span>
                                      </div>
                                    </div>
                                  </div>

                                  <p className="text-[9px] text-muted-foreground/60 text-right">JMC 2013-1 · R.A. 10121</p>
                                </div>
                              )}

                              {/* Balance badge */}
                              {(() => {
                                const zero = isZeroAmount(unap);
                                const pos = zero || unap >= 0;
                                const over = !zero && !pos;
                                return (
                                  <div className="rounded-lg border px-4 py-3">
                                    <div className="flex items-center justify-between gap-3 flex-wrap">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <span className={cn(
                                          "text-[10px] font-bold px-1.5 py-0.5 rounded flex-shrink-0",
                                          zero ? "bg-emerald-100 text-emerald-700" : pos ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                                        )}>
                                          {zero ? "BALANCED" : pos ? "UNALLOCATED" : "OVER-APPROPRIATED"}
                                        </span>
                                      </div>
                                      <p className={cn(
                                        "text-sm font-bold font-mono tabular-nums inline-flex items-center gap-1",
                                        zero ? "text-emerald-700" : pos ? "text-emerald-700" : "text-red-600"
                                      )}>
                                        {!zero && (
                                          pos
                                            ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
                                            : <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
                                        )}
                                        {peso(Math.abs(unap))}
                                      </p>
                                    </div>
                                    {over && (
                                      <p className="text-[10px] text-red-500 font-medium mt-2 flex items-start gap-1.5">
                                        <span className="w-1 h-1 rounded-full bg-red-500 flex-shrink-0 mt-1" />
                                        <span>Expenditures exceed appropriated revenue</span>
                                      </p>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </CarouselItem>
                        );
                      })}
                    </CarouselContent>
                  </Carousel>
                </div>
              </Card>



{/* Sector Allocation by Fund */}
<SectorAllocationCard planId={planId} style={st(9)} calamityFund={combinedCalamity} />

{/* Quick Links
// <Card style={st(10)} className="px-5 py-5">
//   <p className="text-eyebrow mb-4">Quick Links</p>
//   <div className="flex items-center gap-3">
//     {quickLinks.map(link => (
//       <button
//         key={link.href}
//         onClick={() => navigate(link.href)}
//         className="flex-1 flex flex-col items-center justify-center gap-2 rounded-xl border border-muted bg-muted/50 px-3 py-4 hover:bg-muted hover:border-border transition-all group min-w-0"
//       >
//         <link.icon className={cn("w-5 h-5 flex-shrink-0", link.iconColor)} />
//         <span className="text-[11px] font-semibold text-foreground/70 group-hover:text-foreground text-center leading-tight">
//           {link.label}
//         </span>
//       </button>
//     ))}
//   </div>
// </Card> */}

            </div>
          </div>

          {/* Missing depts warning */}
           {/* ── AREA CHART ROW ── */}
          <BudgetAreaChart />

          {/* Missing depts warning */}
          {activePlan && missingDepts.length > 0 && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both rounded-2xl border border-border bg-muted p-4 flex items-start gap-3" style={st(9)}>
              <div className="w-7 h-7 rounded-xl bg-background border border-border flex items-center justify-center flex-shrink-0 mt-0.5">
                <ExclamationTriangleIcon className="w-4 h-4 text-amber-500" />
              </div>
              <div>
                <p className="text-section-title">
                  {missingDepts.length} department{missingDepts.length !== 1 ? "s" : ""} without a budget plan
                </p>
                <p className="text-subtitle mt-0.5">
                  {missingDepts.map(d => d.dept_abbreviation ?? d.dept_name).join(" · ")}
                </p>
              </div>
            </div>
          )}

        </div>

        {/* Create Budget Plan Dialog */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="max-w-sm rounded-2xl border-border gap-0 p-0 overflow-hidden">
            <DialogHeader className="px-6 pt-5 pb-4 border-b border-muted">
              <DialogTitle className="text-base font-semibold text-foreground">New Budget Plan</DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                Department plans for all departments will be auto-initialized.
              </DialogDescription>
            </DialogHeader>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <ShadcnLabel className="text-xs font-semibold text-foreground/70">
                  Fiscal Year <span className="text-red-400">*</span>
                </ShadcnLabel>
                <Input type="number" value={newYear} onChange={e => setNewYear(parseInt(e.target.value))}
                  className="h-9 text-sm font-mono" placeholder={String(new Date().getFullYear() + 1)} />
              </div>
              <div className="flex items-center justify-between py-1">
                <div>
                  <p className="text-xs font-semibold text-foreground/70">Set as Active</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Will deactivate the current active plan</p>
                </div>
                <Switch checked={newActive} onCheckedChange={setNewActive} />
              </div>
              {newActive && activePlan && (
                <div className="rounded-xl bg-muted/50 border border-border px-3 py-2.5">
                  <p className="text-sm text-foreground/80 font-semibold">FY {activePlan.year} will be deactivated.</p>
                </div>
              )}
            </div>
            <DialogFooter className="px-6 py-4 border-t border-muted gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs border-border"
                onClick={() => setCreateOpen(false)} disabled={createPlan.isPending}>Cancel</Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-primary hover:bg-primary/90"
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
