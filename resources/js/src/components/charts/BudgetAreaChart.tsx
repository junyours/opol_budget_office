import React, { useState, useEffect, useMemo } from "react";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from "recharts";
import { Card as ShadcnCard } from "../ui/card";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "../ui/select";
import { useBudgetPlans, useDepartmentsLite, useYearTotals, DepartmentLite, YearTotalRow } from "../../hooks/useDashboardQueries";
import { BudgetPlan } from "../../types/api";
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

// y0 = oldest year (2025) · y1 = middle year (2026) · y2 = current year (2027)
const YEAR_COLORS: Record<string, string> = {
  y0: "#16a34a", // green
  y1: "#2563eb", // blue
  y2: "#f97316", // orange
};

// ─── Pure computation (no API calls) ─────────────────────────────────────────

/**
 * Compute per-dept expenditure map from already-fetched data.
 */
function computeDeptExpForPlan(
  rows: YearTotalRow[],
  departments: DepartmentLite[],
  filter: FundFilter
): Record<string, number> {
  const deptMap = new Map<number, DepartmentLite>(departments.map(d => [d.dept_id, d]));

  const result: Record<string, number> = {};
  rows
    .filter((row: YearTotalRow) => {
      const d = deptMap.get(row.dept_id);
      if (!d) return false;
      if (filter === "general") return d.dept_category_id !== SPECIAL_CAT_ID;
      if (filter === "special") return d.dept_category_id === SPECIAL_CAT_ID;
      return true;
    })
    .forEach((row: YearTotalRow) => {
      const d = deptMap.get(row.dept_id)!;
      const abbr = d.dept_abbreviation ?? d.dept_name.slice(0, 6);
      result[abbr] = (result[abbr] ?? 0) + row.total;
    });

  return result;
}

// ─── Tooltip ──────────────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label, yearLabels }: any) => {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => {
    const order: Record<string, number> = { y2: 0, y1: 1, y0: 2 };
    return (order[a.dataKey] ?? 9) - (order[b.dataKey] ?? 9);
  });
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-3.5 py-3 min-w-[180px]">
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
  <div className="flex items-center bg-muted/50 rounded-lg p-0.5 gap-0.5 border border-border flex-shrink-0">
    {FILTER_OPTIONS.map(opt => (
      <button
        key={opt.value}
        onClick={() => onChange(opt.value)}
        className={cn(
          "px-2.5 py-1.5 rounded-md text-[10px] sm:text-[11px] font-semibold transition-all duration-150 whitespace-nowrap flex-shrink-0",
          value === opt.value
            ? "bg-primary text-primary-foreground shadow-sm"
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

export const BudgetAreaChart: React.FC<BudgetAreaChartProps> = ({ className }) => {
  const { data: plans = [], isLoading: plansLoading } = useBudgetPlans();
  const { data: departments = [], isLoading: deptsLoading } = useDepartmentsLite();
  const isMobile = useIsMobile();

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

  const planId0 = plansForYears[0]?.budget_plan_id;
  const planId1 = plansForYears[1]?.budget_plan_id;
  const planId2 = plansForYears[2]?.budget_plan_id;

  const { data: yearTotals = {}, isLoading: expLoading } = useYearTotals([planId0, planId1, planId2]);

  const rowsForPlan = (planId: number | undefined): YearTotalRow[] =>
    planId ? (yearTotals[String(planId)] ?? []) : [];

  const allDepts = useMemo(() => {
    const expData = [planId0, planId1, planId2].map(pid =>
      computeDeptExpForPlan(rowsForPlan(pid), departments, fundFilter)
    );

    const withData = new Set<string>();
    expData.forEach(yearData => Object.keys(yearData).forEach(k => withData.add(k)));

    return [...departments]
      .filter(d => {
        if (fundFilter === "general") return d.dept_category_id !== SPECIAL_CAT_ID;
        if (fundFilter === "special") return d.dept_category_id === SPECIAL_CAT_ID;
        return true;
      })
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(d => d.dept_abbreviation ?? d.dept_name.slice(0, 6))
      .filter(abbr => withData.has(abbr));
  }, [yearTotals, planId0, planId1, planId2, departments, fundFilter]);

  const expData = useMemo(() => {
    return [planId0, planId1, planId2].map(pid =>
      computeDeptExpForPlan(rowsForPlan(pid), departments, fundFilter)
    );
  }, [yearTotals, planId0, planId1, planId2, departments, fundFilter]);

  const chartData = useMemo(() => {
    if (allDepts.length === 0) return [];
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
    return expData.map(d => Object.values(d).reduce((s, v) => s + v, 0));
  }, [expData]);

  const subtitleLabel =
    fundFilter === "general" ? "General Fund" :
    fundFilter === "special" ? "Special Accounts" : "All Funds";

  return (
    <ShadcnCard
      className={cn(
        "rounded-lg shadow-sm overflow-hidden w-full",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        className
      )}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b border-border">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
              <ChartBarIcon className="w-3.5 h-3.5 text-indigo-500" />
            </div>
            <div className="min-w-0">
              <p className="text-eyebrow">
                Department Expenditures
              </p>
              <p className="text-section-title mt-0.5 truncate">
                3-Year Comparison · {subtitleLabel}
              </p>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-2 sm:flex-shrink-0 overflow-x-auto">
            <FundToggle value={fundFilter} onChange={setFundFilter} />
            <Select
              value={String(centerYear)}
              onValueChange={v => setSelectedYear(Number(v))}
            >
              {/* trigger below gets ml-auto to push it to the far right */}
             <SelectTrigger className="w-[112px] h-8 text-xs font-semibold bg-muted/50 border-border text-foreground rounded-lg focus:ring-0 focus:ring-offset-0 flex-shrink-0 ml-auto">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent className="bg-white border-border text-foreground rounded-lg">
                {selectablePlans.map(p => (
                  <SelectItem
                    key={p.budget_plan_id}
                    value={String(p.year)}
                    className="text-xs focus:bg-muted focus:text-foreground"
                  >
                    FY {p.year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Year pills */}
        <div className="mt-3 inline-flex flex-col sm:flex-row w-full sm:w-auto rounded-lg border border-border bg-muted/30 divide-y sm:divide-y-0 sm:divide-x divide-border overflow-hidden">
          {(["y0", "y1", "y2"] as const).map((key, i) => (
            <div
              key={key}
              className="flex items-center gap-2 px-3 py-1.5 min-w-0"
            >
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: YEAR_COLORS[key] }} />
              <span className="text-[11px] font-semibold text-foreground flex-shrink-0">{targetYears[i]}</span>
              {!loading && (
                <span className="text-[11px] font-mono text-muted-foreground truncate">{pesoC(totals[i])}</span>
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
              <div className="w-8 h-8 rounded-full border-2 border-muted border-t-indigo-500 animate-spin" />
              <p className="text-subtitle">Loading expenditure data…</p>
            </div>
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[260px] flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
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

              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />

              <XAxis
                dataKey="dept"
                interval={0}
                angle={isMobile ? -90 : -35}
                textAnchor="end"
                tick={{ fontSize: isMobile ? 8 : 9, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                height={isMobile ? 60 : 44}
              />
              <YAxis
                tickFormatter={v => pesoC(v)}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontWeight: 600 }}
                tickLine={false}
                axisLine={false}
                width={60}
              />

              <Tooltip
                content={<CustomTooltip yearLabels={yearLabels} />}
                cursor={{ stroke: "hsl(var(--border))", strokeWidth: 1 }}
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

      {/* Legend */}
      {!loading && chartData.length > 0 && (
        <div className="px-5 pb-4 flex items-center justify-center gap-5">
          {(["y0", "y1", "y2"] as const).map(key => {
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
    </ShadcnCard>
  );
};

export default BudgetAreaChart;
