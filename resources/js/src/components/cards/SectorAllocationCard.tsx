import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { useDepartmentsLite } from "@/src/hooks/useDashboardQueries";
import { useForm7GeneralFundSummary } from "@/src/hooks/useForm7Queries"; // adjust path to wherever that file lives
import {
  BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip,
} from "recharts";
import { Card as ShadcnCard } from "@/src/components/ui/card";
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

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted animate-pulse", className)} />
  );
}

// ─── Sector colours — matches the hsl(var(--cat-*)) tokens used across the dashboard ──

const SECTOR_COLORS = {
  general_public_services: "hsl(var(--cat-1))",
  social_services:         "hsl(var(--cat-2))",
  economic_services:       "hsl(var(--cat-3))",
  other_services:          "hsl(var(--cat-4))",
} as const;

const SECTOR_LABELS = {
  general_public_services: "Gen. Public Svc",
  social_services:         "Social Svc",
  economic_services:       "Economic Svc",
  other_services:          "Other Svc",
} as const;

// ─── Section display config ───────────────────────────────────────────────────
// PS/MOOE/FE/CO/SPA aren't part of the shared cat-*/fin-* token set, so these
// keep their own distinct hues — matching the accent colors already used for
// similarly "extra" categories (violet, blue, rose, amber, emerald) elsewhere
// in the app (e.g. BreakdownCard's PS/MOOE/CO rows).

const SECTION_DISPLAY: Record<string, { label: string; shortLabel: string; dot: string }> = {
  PS:   { label: "Personal Services",                 shortLabel: "PS",   dot: "#7c3aed" },
  MOOE: { label: "Maint. & Other Operating Expenses",  shortLabel: "MOOE", dot: "#2563eb" },
  FE:   { label: "Financial Expenses",                 shortLabel: "FE",   dot: "#e11d48" },
  CO:   { label: "Capital Outlay",                     shortLabel: "CO",   dot: "#d97706" },
  SPA:  { label: "Special Purpose Appropriations",     shortLabel: "SPA",  dot: "#059669" },
};

// ─── Custom tooltip ───────────────────────────────────────────────────────────

const SectorBarTip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white border border-border rounded-xl shadow-lg px-3 py-2.5 min-w-[160px] space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground mb-1.5">{label}</p>
      {payload.map((p: any) => (
        <div key={p.dataKey} className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: p.fill }} />
            <span className="text-[10px] text-muted-foreground">{p.name}</span>
          </div>
          <span className="text-[10px] font-semibold font-mono text-foreground">{pesoC(p.value)}</span>
        </div>
      ))}
      <div className="border-t border-border pt-1 mt-1 flex justify-between">
        <span className="text-[10px] text-muted-foreground">Total</span>
        <span className="text-[10px] font-semibold font-mono text-foreground">
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
    <div className="rounded-lg border border-border mt-3 grid grid-cols-2 sm:grid-cols-4 divide-y sm:divide-y-0 divide-x-0 sm:divide-x divide-border [&>*:nth-child(odd)]:border-r sm:[&>*:nth-child(odd)]:border-r-0">
      {sectors.map(s => (
        <div key={s.key} className="p-2.5 min-w-0 border-border">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <p className="text-[9px] font-medium text-muted-foreground leading-tight truncate">{s.label}</p>
          </div>
          <p className="text-sm font-semibold text-foreground tabular-nums leading-none truncate">{pesoC(grandTotal[s.key])}</p>
          <p className="text-[9px] font-mono text-muted-foreground mt-1 truncate">{peso(grandTotal[s.key])}</p>
        </div>
      ))}
    </div>
  );
};

// ─── Section subtotal chips ───────────────────────────────────────────────────

const SectionChips: React.FC<{ sections: Form7Section[] }> = ({ sections }) => {
  const valid = sections.filter(sec => SECTION_DISPLAY[sec.section_code]);
  return (
    <div className="rounded-full border border-border mt-3 flex divide-x divide-border overflow-hidden">
      {valid.map(sec => {
        const cfg = SECTION_DISPLAY[sec.section_code];
        return (
          <div key={sec.section_code} className="px-2.5 py-1 flex items-center gap-1.5 flex-1 justify-center min-w-0">
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: cfg.dot }} />
            <span className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">{cfg.shortLabel}</span>
            <span className="text-[11px] font-medium font-mono tabular-nums text-foreground whitespace-nowrap">{pesoC(sec.subtotal.total)}</span>
          </div>
        );
      })}
    </div>
  );
};

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
         <p className="text-[10px] font-medium text-muted-foreground">{eyebrow}</p>
          <p className={cn("text-sm font-bold mt-0.5", accentClass)}>{title}</p>
        </div>
        {grandTotal && (
          <div className="text-right">
            <p className="text-[9px] font-medium text-muted-foreground">Grand Total</p>
            <p className="text-base font-semibold tabular-nums text-foreground">{pesoC(grandTotal.total)}</p>
            <p className="text-[9px] font-mono text-muted-foreground">{peso(grandTotal.total)}</p>
          </div>
        )}
      </div>

      {/* Section chips */}
      {isLoading ? (
        <div className="flex gap-2">
          {[0,1,2,3].map(i => <Shimmer key={i} className="h-9 w-20 rounded-full" />)}
        </div>
      ) : isError ? (
        <p className="text-xs text-red-500">Failed to load data.</p>
      ) : sections.length === 0 ? (
        <p className="text-xs text-muted-foreground/60">No data yet.</p>
      ) : (
        <SectionChips sections={sections} />
      )}

      {/* Grouped bar chart */}
      {isLoading ? (
        <Shimmer className="h-36 w-full" />
      ) : hasData ? (
        isSA ? (
          <ChartContainer config={chartConfig} className="h-[148px] w-full">
            <BarChart
              data={chartData}
              layout="vertical"
              barCategoryGap="30%"
              margin={{ top: 2, right: 48, left: 0, bottom: 2 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
              <XAxis
                type="number"
                tickFormatter={v => pesoC(v)}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                type="category"
                dataKey="section"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
                width={36}
              />
              <RechartsTooltip content={<SectorBarTip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
              <Bar
                dataKey="saTotal"
                name="Total"
                radius={[0, 3, 3, 0]}
                maxBarSize={20}
                label={{ position: "right", formatter: (v: number) => pesoC(v), fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
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
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="section"
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))", fontWeight: 700 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tickFormatter={v => pesoC(v)}
                tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={52}
              />
              <RechartsTooltip content={<SectorBarTip />} cursor={{ fill: "hsl(var(--muted))", radius: 4 }} />
              {(["general_public_services","social_services","economic_services","other_services"] as const).map(key => (
                <Bar key={key} dataKey={key} name={SECTOR_LABELS[key]} fill={SECTOR_COLORS[key]} radius={[3,3,0,0]} maxBarSize={18} />
              ))}
            </BarChart>
          </ChartContainer>
        )
      ) : (
        <div className="h-36 flex flex-col items-center justify-center gap-2 text-muted-foreground/40">
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

// function useSaForm7Summary(planId: number | undefined, calamityFund: number = 0) {
//   const { data: departments = [] } = useDepartmentsLite();

//  // Build one synthetic Form7Response for all three SA combined.
//   //
//   // IMPORTANT: this needs the FULL (non-light) department-budget-plans payload
//   // — item-level rows with expense_item.classification.abbreviation — to bucket
//   // amounts into PS/MOOE/FE/CO/SPA. The dashboard's shared `['dept-budget-plans', planId]`
//   // cache entry is the ?light=1 shape (items_total only, no items[]), so this MUST
//   // use its own query key or it silently reads that cached light payload instead
//   // (plan.items becomes undefined and the whole classification loop no-ops).
//   const { data: deptPlans = [], isLoading: plansLoading } = useQuery<any[]>({
//     queryKey: ["form7-sa-dept-budget-plans-full", planId],
//     queryFn:  () =>
//       API.get("/department-budget-plans", { params: { "filter[budget_plan_id]": planId } })
//         .then(r => r.data?.data ?? []),
//     enabled: !!planId,
//   });

//   // AIP program amounts (PS/MOOE/CO breakdown) — same source useDeptExpenditures
//   // and useSpecialDeptExpenditures use. Without this, SA totals only reflect
//   // Form2 line items and undercount by whatever's entered as AIP programs.
//   //
//   // Own query key for the same reason as above: the shared `['aip-programs', planId]`
//   // cache entry is fetched elsewhere with `fields: 'dept_id,total_amount'`, which
//   // omits total_ps/total_mooe/total_co that this component reads.
//   const { data: aipPrograms = [], isLoading: aipLoading } = useQuery<any[]>({
//     queryKey: ["form7-sa-aip-programs-full", planId],
//     queryFn:  () =>
//       API.get("/aip-programs", { params: { budget_plan_id: planId } })
//         .then(r => r.data?.data ?? []),
//     enabled: !!planId,
//   });

//   const result = useMemo<Form7Response | undefined>(() => {
//     if (!deptPlans.length || !departments.length) return undefined;

//     const saAbbrs = new Set(["SH","OCC","PM"]);
//     const saDepts = departments.filter((d: any) => saAbbrs.has((d.dept_abbreviation ?? "").toUpperCase()));
//     const saDeptIds = new Set(saDepts.map((d: any) => d.dept_id));

//     const saPlans = deptPlans.filter((p: any) => saDeptIds.has(p.dept_id));

//     // For SA, sector breakdown is not meaningful — all amounts go in "total" only
//     // We still build the same shape so the panel renders consistently
//     const ZERO_SUB: SectionSubtotal = { general_public_services:0, social_services:0, economic_services:0, other_services:0, total:0 };

//     const sectionMap = new Map<string, SectionSubtotal>();

//     saPlans.forEach((plan: any) => {
//       const items: any[] = plan.items ?? [];
//       items.forEach((item: any) => {
//         const amt = parseFloat(String(item.total_amount)) || 0;
//         if (amt === 0) return;
//         // const classId = item.expense_item?.classification?.expense_class_id ?? item.expense_item?.expense_class_id ?? 2;
//         // const codeMap: Record<number,string> = { 1:"PS", 2:"MOOE", 3:"FE", 4:"CO" };
//         // const code = codeMap[classId] ?? "MOOE";

//         const rawAbbr = String(item.expense_item?.classification?.abbreviation ?? "").toUpperCase();
//         const code = ["PS","MOOE","FE","CO","SPA"].includes(rawAbbr) ? rawAbbr : "MOOE";

//         if (!sectionMap.has(code)) sectionMap.set(code, { ...ZERO_SUB });
//         sectionMap.get(code)!.total += amt;
//       });
//     });

//     // AIP program amounts — same as useSpecialDeptExpenditures/useDeptExpenditures,
//     // which add `aip.total_amount` on top of Form2 items. Here we fold the PS/MOOE/CO
//     // breakdown in directly so it lands in the right section bars.
//     aipPrograms
//       .filter((p: any) => saDeptIds.has(p.dept_id))
//       .forEach((p: any) => {
//         const ps   = parseFloat(String(p.total_ps))   || 0;
//         const mooe = parseFloat(String(p.total_mooe)) || 0;
//         const co   = parseFloat(String(p.total_co))   || 0;

//         if (ps > 0) {
//           if (!sectionMap.has("PS")) sectionMap.set("PS", { ...ZERO_SUB });
//           sectionMap.get("PS")!.total += ps;
//         }
//         if (mooe > 0) {
//           if (!sectionMap.has("MOOE")) sectionMap.set("MOOE", { ...ZERO_SUB });
//           sectionMap.get("MOOE")!.total += mooe;
//         }
//         if (co > 0) {
//           if (!sectionMap.has("CO")) sectionMap.set("CO", { ...ZERO_SUB });
//           sectionMap.get("CO")!.total += co;
//         }
//       });

//     // Fold the 5% Calamity Fund (30% QRF + 70% Pre-Disaster) into FE —
//     // it's computed separately (5% of non-tax revenue), not entered as a
//     // dept plan line item, so it's added here to match the GF total.
//     if (calamityFund > 0) {
//       if (!sectionMap.has("FE")) sectionMap.set("FE", { ...ZERO_SUB });
//       sectionMap.get("FE")!.total += calamityFund;
//     }

//     const sections: Form7Section[] = [];
//     const ORDER = ["PS","MOOE","FE","CO","SPA"];
//     ORDER.forEach(code => {
//       const sub = sectionMap.get(code);
//       if (!sub || sub.total === 0) return;
//       sections.push({
//         section_code:  code,
//         section_label: code,
//         subtotal:      sub,
//       });
//     });

//     const grandTotal = sections.reduce((acc, s) => ({ ...acc, total: acc.total + s.subtotal.total }), { ...ZERO_SUB });

//     return { sections: { sections, grand_total: grandTotal } };
//   }, [deptPlans, aipPrograms, departments, calamityFund]);

//   return { data: result, isLoading: plansLoading || aipLoading || !planId, isError: false };
// }

function useSaForm7Summary(planId: number | undefined, calamityFund: number = 0) {
  const { data: departments = [] } = useDepartmentsLite();

  // Lean: dept_id + classification code + total, aggregated in SQL.
  // Replaces the previous full department-budget-plans fetch (every Form2
  // item, with nested expense_item.classification, per department — ~900kB).
  const { data: sectionTotals = [], isLoading: sectionsLoading } = useQuery<any[]>({
    queryKey: ["form7-sa-section-totals", planId],
    queryFn: () =>
      API.get("/department-budget-plans/section-totals", { params: { budget_plan_id: planId } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });

  // Lean: dept_id + total_ps/total_mooe/total_co, aggregated in SQL.
  // Replaces the previous full aip-programs fetch (descriptions, reference
  // codes, every line item, for every department — ~83kB).
  const { data: aipTotals = [], isLoading: aipLoading } = useQuery<any[]>({
    queryKey: ["form7-sa-aip-section-totals", planId],
    queryFn: () =>
      API.get("/aip-programs", { params: { budget_plan_id: planId, fields: "dept_id,total_ps,total_mooe,total_co" } })
        .then(r => r.data?.data ?? []),
    enabled: !!planId,
  });

  const result = useMemo<Form7Response | undefined>(() => {
    if (!departments.length) return undefined;
    if (!sectionTotals.length && !aipTotals.length) return undefined;

    const saAbbrs = new Set(["SH", "OCC", "PM"]);
    const saDepts = departments.filter((d: any) => saAbbrs.has((d.dept_abbreviation ?? "").toUpperCase()));
    const saDeptIds = new Set(saDepts.map((d: any) => d.dept_id));

    const ZERO_SUB: SectionSubtotal = { general_public_services: 0, social_services: 0, economic_services: 0, other_services: 0, total: 0 };
    const sectionMap = new Map<string, SectionSubtotal>();

    sectionTotals
      .filter((row: any) => saDeptIds.has(row.dept_id))
      .forEach((row: any) => {
        const code = ["PS", "MOOE", "FE", "CO", "SPA"].includes(row.code) ? row.code : "MOOE";
        if (!sectionMap.has(code)) sectionMap.set(code, { ...ZERO_SUB });
        sectionMap.get(code)!.total += row.total;
      });

    // AIP program amounts (PS/MOOE/CO) — same treatment useSpecialDeptExpenditures
    // and useDeptExpenditures give them, folded into the matching section bucket.
    aipTotals
      .filter((row: any) => saDeptIds.has(row.dept_id))
      .forEach((row: any) => {
        if (row.total_ps > 0) {
          if (!sectionMap.has("PS")) sectionMap.set("PS", { ...ZERO_SUB });
          sectionMap.get("PS")!.total += row.total_ps;
        }
        if (row.total_mooe > 0) {
          if (!sectionMap.has("MOOE")) sectionMap.set("MOOE", { ...ZERO_SUB });
          sectionMap.get("MOOE")!.total += row.total_mooe;
        }
        if (row.total_co > 0) {
          if (!sectionMap.has("CO")) sectionMap.set("CO", { ...ZERO_SUB });
          sectionMap.get("CO")!.total += row.total_co;
        }
      });

    // Fold the 5% Calamity Fund into FE — computed separately (5% of non-tax
    // revenue), not entered as a dept plan line item.
    if (calamityFund > 0) {
      if (!sectionMap.has("FE")) sectionMap.set("FE", { ...ZERO_SUB });
      sectionMap.get("FE")!.total += calamityFund;
    }

    const sections: Form7Section[] = [];
    const ORDER = ["PS", "MOOE", "FE", "CO", "SPA"];
    ORDER.forEach(code => {
      const sub = sectionMap.get(code);
      if (!sub || sub.total === 0) return;
      sections.push({ section_code: code, section_label: code, subtotal: sub });
    });

    const grandTotal = sections.reduce((acc, s) => ({ ...acc, total: acc.total + s.subtotal.total }), { ...ZERO_SUB });

    return { sections: { sections, grand_total: grandTotal } };
  }, [sectionTotals, aipTotals, departments, calamityFund]);

  return { data: result, isLoading: sectionsLoading || aipLoading || !planId, isError: false };
}

// ─── Main card ────────────────────────────────────────────────────────────────

interface Props {
  planId: number | undefined;
  style?: React.CSSProperties;
  calamityFund?: number;
}

export const SectorAllocationCard: React.FC<Props> = ({ planId, style, calamityFund = 0 }) => {
  // GF — lean summary endpoint (section subtotals only, no item rows)
  const {
    data:      gfData,
    isLoading: gfLoading,
    isError:   gfError,
  } = useForm7GeneralFundSummary(planId);

  // SA — synthetic from dept-budget-plans (same source as useForm7SpecialAccount)
  const { data: saData, isLoading: saLoading, isError: saError } = useSaForm7Summary(planId, calamityFund);

  return (
    <ShadcnCard
      style={style}
      className={cn(
        "rounded-lg shadow-sm overflow-hidden",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
      )}
    >
      {/* Card header */}
      <div className="px-4 pt-4 pb-3 border-b border-border flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
          <ChartBarIcon className="w-3.5 h-3.5 text-indigo-500" />
        </div>
        <div>
          <p className="text-[10px] font-medium text-muted-foreground">LBP Form 7</p>
          <p className="text-sm font-semibold text-foreground">Fund Allocation by Sector</p>
        </div>
      </div>

      <div className="p-4 space-y-5">

        {/* TOP — General Fund */}
        <AllocationPanel
          eyebrow="General Fund"
          title="PS · MOOE · CO · SPA by Sector"
          accentClass="text-foreground"
          data={gfData}
          isLoading={gfLoading}
          isError={gfError}
        />

        <div className="border-t border-border" />

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
    </ShadcnCard>
  );
};

export default SectorAllocationCard;
