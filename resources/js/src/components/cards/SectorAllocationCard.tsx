import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { ChartContainer, ChartConfig } from "@/src/components/ui/chart";
import { ChartBarIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface SectionSubtotal {
  general_public_services: number;
  social_services:         number;
  economic_services:       number;
  other_services:          number;
  total:                   number;
}

interface Form7Section {
  section_code:  string;
  section_label: string;
  subtotal:      SectionSubtotal;
}

interface Form7Response {
  sections: {
    sections:    Form7Section[];
    grand_total: SectionSubtotal;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const peso = (v: number) =>
  `₱${v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pesoC = (v: number): string => {
  if (v >= 1_000_000_000) return `₱${(Math.floor(v / 1_000_000) / 1_000).toLocaleString("en-PH", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}B`;
  if (v >= 1_000_000)     return `₱${(Math.floor(v / 1_000)     / 1_000).toLocaleString("en-PH", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
  if (v >= 1_000)         return `₱${(Math.floor(v)              / 1_000).toLocaleString("en-PH", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}K`;
  return `₱${Math.floor(v).toLocaleString("en-PH")}`;
};

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-muted animate-pulse", className)} />
  );
}

// ─── Sector colours (matches Form7 page column colours) ───────────────────────

// Mirrors the cat-1/2/3/4 CSS variables used in the department sidebar
const SECTOR_COLORS = {
  general_public_services: "var(--color-cat-1, #3b82f6)",
  social_services:         "var(--color-cat-2, #f43f5e)",
  economic_services:       "var(--color-cat-3, #22c55e )",
  other_services:          "var(--color-cat-4, #f59e0b)",
} as const;

const SECTOR_LABELS = {
  general_public_services: "Gen. Public Svc",
  social_services:         "Social Svc",
  economic_services:       "Economic Svc",
  other_services:          "Other Svc",
} as const;

// ─── Section display config ───────────────────────────────────────────────────

const SECTION_DISPLAY: Record<string, { label: string; shortLabel: string; color: string; dot: string; bg: string; border: string }> = {
  PS:   { label: "Personal Services",                  shortLabel: "PS",   color: "text-violet-700",  dot: "#7c3aed", bg: "bg-violet-50",  border: "border-violet-200" },
  MOOE: { label: "Maint. & Other Operating Expenses",  shortLabel: "MOOE", color: "text-blue-700",    dot: "#2563eb", bg: "bg-blue-50",    border: "border-blue-200"   },
  FE:   { label: "Financial Expenses",                 shortLabel: "FE",   color: "text-rose-700",    dot: "#e11d48", bg: "bg-rose-50",    border: "border-rose-200"   },
  CO:   { label: "Capital Outlay",                     shortLabel: "CO",   color: "text-amber-700",   dot: "#d97706", bg: "bg-amber-50",   border: "border-amber-200"  },
  SPA:  { label: "Special Purpose Appropriations",     shortLabel: "SPA",  color: "text-emerald-700", dot: "#059669", bg: "bg-emerald-50", border: "border-emerald-200"},
};
// ─── Custom tooltip ───────────────────────────────────────────────────────────

const SectorBarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-zinc-200 rounded-xl shadow-lg px-3 py-2.5 min-w-[160px] space-y-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-[10px] text-zinc-500">{p.name}</span>
          </div>
          <span className="text-[10px] font-semibold font-mono text-zinc-800">{pesoC(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-zinc-100 pt-1 mt-1 flex justify-between">
        <span className="text-[10px] text-zinc-400">Total</span>
        <span className="text-[10px] font-bold font-mono text-zinc-900">
          {pesoC(payload.reduce((s: number, p: any) => s + (p.value || 0), 0))}
        </span>
      </div>
    </div>
  );
};

// ─── Sector totals row ────────────────────────────────────────────────────────

const SectorTotalsRow: React.FC<{ grandTotal: SectionSubtotal }> = ({ grandTotal }) => {
  const sectors = [
    { key: "general_public_services" as const, label: "General Public Svc", color: SECTOR_COLORS.general_public_services },
    { key: "social_services"         as const, label: "Social Services",     color: SECTOR_COLORS.social_services         },
    { key: "economic_services"       as const, label: "Economic Services",   color: SECTOR_COLORS.economic_services       },
    { key: "other_services"          as const, label: "Other Services",      color: SECTOR_COLORS.other_services          },
  ];

  return (
    <div className="grid grid-cols-4 gap-2 mt-3">
      {sectors.map(s => (
        <div key={s.key} className="rounded-xl bg-zinc-50 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500 leading-tight">{s.label}</p>
          </div>
          <p className="text-sm font-bold text-zinc-800 tabular-nums leading-none">{pesoC(grandTotal[s.key])}</p>
          <p className="text-[9px] font-mono text-zinc-400 mt-1">{peso(grandTotal[s.key])}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Section subtotal chips ───────────────────────────────────────────────────

const SectionChips: React.FC<{ sections: Form7Section[] }> = ({ sections }) => (
  <div className="flex flex-wrap gap-2 mt-3">
    {sections.map(sec => {
      const cfg = SECTION_DISPLAY[sec.section_code];
      if (!cfg) return null;
      return (
        <div key={sec.section_code} className="rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1.5 flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
          <span className={cn("text-[10px] font-semibold uppercase tracking-widest", cfg.color)}>{cfg.shortLabel}</span>
          <span className="text-[11px] font-medium font-mono tabular-nums text-zinc-700">{pesoC(sec.subtotal.total)}</span>
        </div>
      );
    })}
  </div>
);

// ─── Chart config for shadcn ChartContainer ───────────────────────────────────

const chartConfig: ChartConfig = {
  general_public_services: { label: "Gen. Public Svc", color: SECTOR_COLORS.general_public_services },
  social_services:         { label: "Social Svc",       color: SECTOR_COLORS.social_services         },
  economic_services:       { label: "Economic Svc",     color: SECTOR_COLORS.economic_services       },
  other_services:          { label: "Other Svc",        color: SECTOR_COLORS.other_services          },
};

// ─── Inner panel (used for both GF and SA) ────────────────────────────────────

interface PanelProps {
  title:        string;
  eyebrow:      string;
  accentClass:  string;
  data:         Form7Response | undefined;
  isLoading:    boolean;
  isError:      boolean;
  isSA?:        boolean;
}

const AllocationPanel: React.FC<PanelProps> = ({ title, eyebrow, accentClass, data, isLoading, isError, isSA = false }) => {
  const sections    = data?.sections?.sections    ?? [];
  const grandTotal  = data?.sections?.grand_total ?? null;

  // GF: grouped bars per sector. SA: single bar per section (total only).
  const chartData = useMemo(() => {
    const relevant = sections.filter(s => ["PS","MOOE","CO","SPA","FE"].includes(s.section_code));
    return relevant.map(sec => {
      const cfg = SECTION_DISPLAY[sec.section_code];
      if (isSA) {
        return {
          section:  cfg?.shortLabel ?? sec.section_code,
          saTotal:  sec.subtotal.total,
          // keep sector keys at 0 so BarChart renders consistently
          general_public_services: 0,
          social_services:         0,
          economic_services:       0,
          other_services:          0,
        };
      }
      return {
        section:  cfg?.shortLabel ?? sec.section_code,
        saTotal:  0,
        general_public_services: sec.subtotal.general_public_services,
        social_services:         sec.subtotal.social_services,
        economic_services:       sec.subtotal.economic_services,
        other_services:          sec.subtotal.other_services,
      };
    });
  }, [sections, isSA]);

  const hasData = isSA
    ? chartData.some(d => d.saTotal > 0)
    : chartData.some(d =>
        d.general_public_services > 0 || d.social_services > 0 ||
        d.economic_services > 0 || d.other_services > 0
      );

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">{eyebrow}</p>
          <p className={cn("text-sm font-bold mt-0.5", accentClass)}>{title}</p>
        </div>
        {grandTotal && (
          <div className="text-right">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-zinc-400">Grand Total</p>
            <p className="text-base font-bold tabular-nums text-zinc-900">{pesoC(grandTotal.total)}</p>
            <p className="text-[9px] font-mono text-zinc-400">{peso(grandTotal.total)}</p>
          </div>
        )}
      </div>

      {/* Section chips */}
      {isLoading ? (
        <div className="flex gap-2">
          {[0,1,2,3].map(i => <Shimmer key={i} className="h-9 w-20 rounded-xl" />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-red-400">Failed to load data.</p>
      ) : sections.length === 0 ? (
        <p className="text-xs text-zinc-300">No data yet.</p>
      ) : (
        <SectionChips sections={sections} />
      )}

      {/* Grouped bar chart */}
      {isLoading ? (
        <Shimmer className="h-36 w-full rounded-2xl" />
      ) : hasData ? (
        isSA ? (
          <ChartContainer config={chartConfig} className="h-[148px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              barCategoryGap="30%"
              margin={{ top: 2, right: 48, left: 0, bottom: 2 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={v => pesoC(v)}
                tick={{ fontSize: 9, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="section"
                tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <RechartsTooltip content={<SectorBarTip />} cursor={{ fill: "#f9f9f9", radius: 4 }} />
              <Bar
                dataKey="saTotal"
                name="Total"
                radius={[0, 3, 3, 0]}
                maxBarSize={20}
                label={{ position: "right", formatter: (v: number) => pesoC(v), fontSize: 9, fill: "#71717a" }}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.section}
                    fill={SECTION_DISPLAY[
                      Object.keys(SECTION_DISPLAY).find(k => SECTION_DISPLAY[k].shortLabel === entry.section) ?? ""
                    ]?.dot ?? "#8b5cf6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
        ) : (
          <ChartContainer config={chartConfig} className="h-[148px] w-full">
            <BarChart data={chartData} barCategoryGap="28%" barGap={2} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
              <XAxis
                dataKey="section"
                tick={{ fontSize: 9, fill: "#a1a1aa", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={v => pesoC(v)}
                tick={{ fontSize: 9, fill: "#a1a1aa" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <RechartsTooltip content={<SectorBarTip />} cursor={{ fill: "#f9f9f9", radius: 4 }} />
              {(["general_public_services","social_services","economic_services","other_services"] as const).map(key => (
                <Bar key={key} dataKey={key} name={SECTOR_LABELS[key]} fill={SECTOR_COLORS[key]} radius={[3,3,0,0]} maxBarSize={18} />
              ))}
            </BarChart>
          </ChartContainer>
        )
      ) : (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-zinc-200">
          <ChartBarIcon className="w-8 h-8" />
          <p className="text-[10px]">No expenditure data</p>
        </div>
      )}

      {/* Sector totals — GF only; SA totals shown differently */}
      {grandTotal && !isLoading && !isSA && (
        <SectorTotalsRow grandTotal={grandTotal} />
      )}
    </div>
  );
};

// ─── SA fetcher (reuses department-budget-plans, same as useForm7SpecialAccount) ──

function useSaForm7Summary(planId: number | undefined) {
  const { data: departments = [] } = useQuery<any[]>({
    queryKey: ["departments"],
    queryFn:  () => API.get("/departments").then(r => r.data?.data ?? []),
  });

 // Build one synthetic Form7Response for all three SA combined
  const { data: deptPlans = [], isLoading: plansLoading } = useQuery<any[]>({
    queryKey: ["dept-budget-plans", planId],
    queryFn:  () =>
      API.get("/department-budget-plans", { params: { "filter[budget_plan_id]": planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });

  const result = useMemo<Form7Response | undefined>(() => {
    if (!deptPlans.length || !departments.length) return undefined;

    const saAbbrs = new Set(["SH","OCC","PM"]);
    const saDepts = departments.filter((d: any) => saAbbrs.has((d.dept_abbreviation ?? "").toUpperCase()));
    const saDeptIds = new Set(saDepts.map((d: any) => d.dept_id));

    const saPlans = deptPlans.filter((p: any) => saDeptIds.has(p.dept_id));

    // For SA, sector breakdown is not meaningful — all amounts go in "total" only
    // We still build the same shape so the panel renders consistently
    const ZERO_SUB: SectionSubtotal = { general_public_services:0, social_services:0, economic_services:0, other_services:0, total:0 };

    const sectionMap = new Map<string, SectionSubtotal>();

    saPlans.forEach((plan: any) => {
      const items: any[] = plan.items ?? [];
      items.forEach((item: any) => {
        const amt = parseFloat(String(item.total_amount)) || 0;
        if (amt === 0) return;
        // const classId = item.expense_item?.classification?.expense_class_id ?? item.expense_item?.expense_class_id ?? 2;
        // const codeMap: Record<number,string> = { 1:"PS", 2:"MOOE", 3:"FE", 4:"CO" };
        // const code = codeMap[classId] ?? "MOOE";

        const rawAbbr = String(item.expense_item?.classification?.abbreviation ?? "").toUpperCase();
        const code = ["PS","MOOE","FE","CO"].includes(rawAbbr) ? rawAbbr : "MOOE";
        
        if (!sectionMap.has(code)) sectionMap.set(code, { ...ZERO_SUB });
        sectionMap.get(code)!.total += amt;
      });
    });

    const sections: Form7Section[] = [];
    const ORDER = ["PS","MOOE","FE","CO","SPA"];
    ORDER.forEach(code => {
      const sub = sectionMap.get(code);
      if (!sub || sub.total === 0) return;
      sections.push({
        section_code:  code,
        section_label: code,
        subtotal:      sub,
      });
    });

    const grandTotal = sections.reduce((acc, s) => ({ ...acc, total: acc.total + s.subtotal.total }), { ...ZERO_SUB });

    return { sections: { sections, grand_total: grandTotal } };
  }, [deptPlans, departments]);

  return { data: result, isLoading: plansLoading || !planId, isError: false };
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface Props {
  planId: number | undefined;
  style?: React.CSSProperties;
}

export const SectorAllocationCard: React.FC<Props> = ({ planId, style }) => {
  // GF — reuse the same endpoint as Form7 page
  const {
    data:      gfData,
    isLoading: gfLoading,
    isError:   gfError,
  } = useQuery<Form7Response>({
    queryKey: ["form7", "general-fund", planId!],
    queryFn:  () =>
      API.get("/form7", { params: { budget_plan_id: planId } }).then(r => r.data.data),
    enabled: !!planId,
  });

  // SA — synthetic from dept-budget-plans (same source as useForm7SpecialAccount)
  const { data: saData, isLoading: saLoading, isError: saError } = useSaForm7Summary(planId);

  return (
    <div
      style={style}
      className={cn(
        "bg-card rounded-2xl border border-border shadow-sm overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
      )}
    >
      {/* Card header */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center flex-shrink-0">
          <ChartBarIcon className="w-5 h-5 text-indigo-500" />
        </div>
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">LBP Form 7</p>
          <p className="text-sm font-bold text-zinc-900">Fund Allocation by Sector</p>
        </div>
      </div>

      <div className="p-5 space-y-6">

        {/* TOP — General Fund */}
        <AllocationPanel
          eyebrow="General Fund"
          title="PS · MOOE · CO · SPA by Sector"
          accentClass="text-zinc-800"
          data={gfData}
          isLoading={gfLoading}
          isError={gfError}
        />

        <div className="border-t border-zinc-100" />

        {/* BOTTOM — Special Accounts */}
        <AllocationPanel
          eyebrow="Special Accounts (SH · OCC · PM)"
          title="Combined Expenditures by Section"
          accentClass="text-violet-700"
          data={saData}
          isLoading={saLoading}
          isError={saError}
          isSA
        />

      </div>
    </div>
  );
};
