import React, { useState, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "../ui/select";
import { useBudgetPlans, useDepartments } from "../../hooks/useDashboardQueries";
import { useQuery } from "@tanstack/react-query";
import API from "../../services/api";
import { BudgetPlan, Department, DepartmentBudgetPlan } from "../../types/api";
import { cn } from "@/src/lib/utils";
import { ChartBarIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

type FundFilter = "general" | "special" | "all";

const SPECIAL_CAT_ID = 4;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pesoC = (v: number): string => {
  if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toFixed(2)}B`;
  if (v >= 1_000_000)     return `₱${(v / 1_000_000).toFixed(2)}M`;
  if (v >= 1_000)         return `₱${(v / 1_000).toFixed(1)}K`;
  return `₱${Math.round(v).toLocaleString("en-PH")}`;
};

// y0 = lowest year, y1 = middle, y2 = highest
const YEAR_COLORS: Record<string, string> = {
  y0: "#15803D",  // green  — lowest year
  y1: "#2352D9",  // blue   — middle year
  y2: "#C34511",  // red    — highest year
};

const YEAR_BG: Record<string, string> = {
  y0: "rgba(21,128,61,0.07)",
  y1: "rgba(35,82,217,0.07)",
  y2: "rgba(195,69,17,0.07)",
};

// ─── Fetch ────────────────────────────────────────────────────────────────────

async function fetchDeptExpForPlan(
  plan: BudgetPlan,
  departments: Department[],
  filter: FundFilter
): Promise<Record<string, number>> {
  try {
    const [dpRes, aipRes] = await Promise.allSettled([
      API.get("/department-budget-plans", {
        params: { "filter[budget_plan_id]": plan.budget_plan_id },
      }),
      API.get("/aip-programs", { params: { budget_plan_id: plan.budget_plan_id } }),
    ]);

    const allDps: DepartmentBudgetPlan[] =
      dpRes.status === "fulfilled" ? dpRes.value.data?.data ?? [] : [];
    const aipPrograms: any[] =
      aipRes.status === "fulfilled" ? aipRes.value.data?.data ?? [] : [];

    const deptMap = new Map<number, Department>(departments.map(d => [d.dept_id, d]));

    const aipByDept = new Map<number, number>();
    aipPrograms.forEach((p: any) => {
      aipByDept.set(p.dept_id, (aipByDept.get(p.dept_id) ?? 0) + (p.total_amount ?? 0));
    });

    const result: Record<string, number> = {};
    allDps
      .filter((dp: DepartmentBudgetPlan) => {
        const d = deptMap.get(dp.dept_id);
        if (!d) return false;
        if (filter === "general") return d.dept_category_id !== SPECIAL_CAT_ID;
        if (filter === "special") return d.dept_category_id === SPECIAL_CAT_ID;
        return true; // "all"
      })
      .forEach((dp: DepartmentBudgetPlan) => {
        const d = deptMap.get(dp.dept_id)!;
        const abbr = d.dept_abbreviation ?? d.dept_name.slice(0, 6);
        const form2 = (dp.items ?? []).reduce(
          (s: number, i: any) => s + (parseFloat(i.total_amount) || 0),
          0
        );
        const aip = aipByDept.get(dp.dept_id) ?? 0;
        result[abbr] = (result[abbr] ?? 0) + form2 + aip;
      });

    return result;
  } catch {
    return {};
  }
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, yearLabels }: any) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => {
    const order: Record<string, number> = { y2: 0, y1: 1, y0: 2 };
    return (order[a.dataKey] ?? 9) - (order[b.dataKey] ?? 9);
  });
  return (
    <div className="bg-card border border-border rounded-xl shadow-lg px-3.5 py-3 min-w-[180px]">
      <p className="text-eyebrow mb-2">{label}</p>
      {sorted.map((p: any, i: number) => (
        <div key={i} className="flex items-center justify-between gap-4 py-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.stroke }} />
            <span className="text-[11px] text-muted-foreground">{yearLabels?.[p.dataKey] ?? p.dataKey}</span>
          </div>
          <span className="text-[12px] font-semibold font-mono text-foreground">{pesoC(p.value ?? 0)}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Fund Toggle ──────────────────────────────────────────────────────────────

const FILTER_OPTIONS: { value: FundFilter; label: string }[] = [
  { value: "general", label: "General Fund"      },
  { value: "special", label: "Special Accounts"  },
  { value: "all",     label: "All"               },
];

const FundToggle = ({
  value,
  onChange,
}: {
  value: FundFilter;
  onChange: (v: FundFilter) => void;
}) => (
  <div className="flex items-center bg-white rounded-xl p-0.5 gap-0.5 border border-border">
    {FILTER_OPTIONS.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          "px-3 py-1.5 rounded-[10px] text-[11px] font-semibold transition-all duration-150",
          value === opt.value
            ? "bg-foreground text-background shadow-sm"
            : "text-muted-foreground hover:text-foreground"
        )}
      >
        {opt.label}
      </button>
    ))}
  </div>
);

// ─── Main Component ───────────────────────────────────────────────────────────

interface BudgetAreaChartProps {
  className?: string;
}

export const BudgetAreaChart: React.FC<BudgetAreaChartProps> = ({ className }) => {
  const { data: plans = [], isLoading: plansLoading } = useBudgetPlans();
  const { data: departments = [], isLoading: deptsLoading } = useDepartments();

  const [fundFilter, setFundFilter] = useState<FundFilter>("all");

  const activePlan = plans.find(p => p.is_active);
  const maxSelectableYear = (activePlan?.year ?? new Date().getFullYear()) + 1;
  const selectablePlans = [...plans]
    .filter(p => p.year <= maxSelectableYear)
    .sort((a, b) => b.year - a.year);

  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const centerYear =
    selectedYear ?? activePlan?.year ?? selectablePlans[0]?.year ?? new Date().getFullYear();

  const targetYears = [centerYear - 2, centerYear - 1, centerYear];
  const plansForYears = targetYears.map(y => plans.find(p => p.year === y) ?? null);

  const { data: expData, isLoading: expLoading } = useQuery({
    queryKey: ["budget-area-chart", centerYear, fundFilter, departments.map(d => d.dept_id)],
    queryFn: async () =>
      Promise.all(
        plansForYears.map(plan =>
          plan
            ? fetchDeptExpForPlan(plan, departments, fundFilter)
            : Promise.resolve({} as Record<string, number>)
        )
      ),
    enabled: !plansLoading && !deptsLoading && departments.length > 0,
    staleTime: 5 * 60 * 1000,
  });

  // Sort by dept_id, filtered by fund type, only depts with data
  const allDepts = useMemo(() => {
    if (!expData) return [];
    const withData = new Set<string>();
    expData.forEach(yearData => Object.keys(yearData).forEach(k => withData.add(k)));

    return [...departments]
      .filter(d => {
        if (fundFilter === "general") return d.dept_category_id !== SPECIAL_CAT_ID;
        if (fundFilter === "special") return d.dept_category_id === SPECIAL_CAT_ID;
        return true;
      })
      .sort((a, b) => a.dept_id - b.dept_id)
      .map(d => d.dept_abbreviation ?? d.dept_name.slice(0, 6))
      .filter(abbr => withData.has(abbr));
  }, [expData, departments, fundFilter]);

  const chartData = useMemo(() => {
    if (!expData || allDepts.length === 0) return [];
    return allDepts.map(dept => ({
      dept,
      y0: expData[0]?.[dept] ?? 0,
      y1: expData[1]?.[dept] ?? 0,
      y2: expData[2]?.[dept] ?? 0,
    }));
  }, [expData, allDepts]);

  const yearLabels: Record<string, string> = {
    y0: String(targetYears[0]),
    y1: String(targetYears[1]),
    y2: String(targetYears[2]),
  };

  const loading = plansLoading || deptsLoading || expLoading;

  const totals = useMemo(() => {
    if (!expData) return [0, 0, 0];
    return expData.map(d => Object.values(d).reduce((s, v) => s + v, 0));
  }, [expData]);

  const subtitleLabel =
    fundFilter === "general" ? "General Fund" :
    fundFilter === "special" ? "Special Accounts" : "All Funds";

  return (
    <div
      className={cn(
        "bg-card rounded-2xl border border-border shadow-sm overflow-hidden w-full",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        className
      )}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white flex items-center justify-center flex-shrink-0">
              <ChartBarIcon className="w-5 h-5 text-indigo-500" />
            </div>
            <div>
              <p className="text-eyebrow">
                Department Expenditures
              </p>
              <p className="text-section-title mt-0.5">
                3-Year Comparison · {subtitleLabel}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <FundToggle value={fundFilter} onChange={setFundFilter} />
            <Select
              value={String(centerYear)}
              onValueChange={v => setSelectedYear(Number(v))}
            >
              <SelectTrigger className="w-[112px] h-8 text-xs font-semibold bg-zinc-50 border-zinc-200 text-zinc-700 rounded-xl focus:ring-0 focus:ring-offset-0">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-white border-zinc-200 text-zinc-700 rounded-xl">
                {selectablePlans.map(p => (
                  <SelectItem
                    key={p.budget_plan_id}
                    value={String(p.year)}
                    className="text-xs focus:bg-zinc-50 focus:text-zinc-900"
                  >
                    FY {p.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Year pills */}
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          {(["y0", "y1", "y2"] as const).map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-2 rounded-xl border px-3 py-1.5"
              style={{ borderColor: `${YEAR_COLORS[key]}30`, background: YEAR_BG[key] }}
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: YEAR_COLORS[key] }} />
              <span className="text-[11px] font-semibold text-foreground">{targetYears[i]}</span>
              {!loading && (
                <span className="text-[11px] font-mono text-muted-foreground">{pesoC(totals[i])}</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="px-2 pt-4 pb-3">
        {loading ? (
          <div className="h-[260px] flex items-center justify-center">
            <div className="flex flex-col items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 border-indigo-200 border-t-indigo-500 animate-spin" />
              <p className="text-subtitle">Loading expenditure data…</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-zinc-300">
            <ChartBarIcon className="w-10 h-10" />
            <p className="text-subtitle">No expenditure data for selected years</p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={chartData} margin={{ top: 10, right: 16, left: 8, bottom: 0 }}>
              <defs>
                <linearGradient id="gradY0" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={YEAR_COLORS.y0} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={YEAR_COLORS.y0} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="gradY1" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={YEAR_COLORS.y1} stopOpacity={0.18} />
                  <stop offset="95%" stopColor={YEAR_COLORS.y1} stopOpacity={0.01} />
                </linearGradient>
                <linearGradient id="gradY2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={YEAR_COLORS.y2} stopOpacity={0.20} />
                  <stop offset="95%" stopColor={YEAR_COLORS.y2} stopOpacity={0.01} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />

              <XAxis
                dataKey="dept"
                interval={0}
                angle={-35}
                textAnchor="end"
                tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                height={44}
              />
              <YAxis
                tickFormatter={v => pesoC(v)}
                tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />

              <Tooltip
                content={<CustomTooltip yearLabels={yearLabels} />}
                cursor={{ stroke: "#f4f4f5", strokeWidth: 1 }}
              />

              <Area type="monotone" dataKey="y0" stroke={YEAR_COLORS.y0} strokeWidth={1.5}
                fill="url(#gradY0)" dot={false}
                activeDot={{ r: 4, fill: YEAR_COLORS.y0, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="y1" stroke={YEAR_COLORS.y1} strokeWidth={2}
                fill="url(#gradY1)" dot={false}
                activeDot={{ r: 4, fill: YEAR_COLORS.y1, strokeWidth: 0 }} />
              <Area type="monotone" dataKey="y2" stroke={YEAR_COLORS.y2} strokeWidth={2.5}
                fill="url(#gradY2)" dot={false}
                activeDot={{ r: 4, fill: YEAR_COLORS.y2, strokeWidth: 0 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Legend — highest year first */}
      {!loading && chartData.length > 0 && (
        <div className="px-5 pb-4 flex items-center justify-center gap-5">
          {(["y2", "y1", "y0"] as const).map(key => {
            const idx = key === "y2" ? 2 : key === "y1" ? 1 : 0;
            return (
              <div key={key} className="flex items-center gap-1.5">
                <span className="w-3 h-2.5 rounded-sm flex-shrink-0" style={{ background: YEAR_COLORS[key] }} />
                <span className="text-[11px] font-medium text-muted-foreground">{targetYears[idx]}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default BudgetAreaChart;

