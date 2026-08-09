import React from "react";
import { BudgetPlan } from "../../types/api";
import { cn } from "@/src/lib/utils";
import { BanknotesIcon } from "@heroicons/react/24/outline";
import { useDepartmentBudgetPlans, useDepartmentsLite, DepartmentLite, DepartmentBudgetPlanLite } from "../../hooks/useDashboardQueries";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const pesoC = (v: number): string => {
  if (v >= 1_000_000_000) {
    const n = Math.floor(v / 1_000_000) / 1_000;
    return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}B`;
  }
  if (v >= 1_000_000) {
    const n = Math.floor(v / 1_000) / 1_000;
    return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}M`;
  }
  if (v >= 1_000) {
    const n = Math.floor(v / 1) / 1_000;
    return `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 3, maximumFractionDigits: 3 })}K`;
  }
  return `₱${Math.floor(v).toLocaleString("en-PH")}`;
};

const peso = (v: number) => `₱${Math.round(v).toLocaleString("en-PH")}`;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Breakdown { ps: number; mooe: number; co: number; total: number }
const EMPTY: Breakdown & { available: boolean } = { ps: 0, mooe: 0, co: 0, total: 0, available: false };
const SPECIAL_CAT_ID = 4;

// ─── Pure computation (no API calls) ─────────────────────────────────────────

// TODO(backend): computeBreakdown needs PS/MOOE/CO classification per item.
// The ?light=1 payload only returns items_total (a single pre-summed number),
// not individual line items — so this card cannot compute a PS/MOOE/CO split
// from the current API response at all. It needs the backend to add e.g.
// ps_total / mooe_total / co_total (via withSum on a classification column)
// to the same DepartmentBudgetPlan::index() response. Until then this
// returns an explicit "unavailable" state instead of a fabricated all-zero
// or wrong split.
function computeBreakdown(
  _deptPlans: DepartmentBudgetPlanLite[],
  _departments: DepartmentLite[],
): Breakdown & { available: boolean } {
  return { ps: 0, mooe: 0, co: 0, total: 0, available: false };
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-muted animate-pulse", className)} />
  );
}

// ─── Bar ─────────────────────────────────────────────────────────────────────

function PropBar({ ps, mooe, co, total }: Breakdown) {
  if (total === 0) return null;
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex gap-px bg-zinc-100">
      <div className="h-full rounded-l-full transition-all duration-700 bg-violet-500" style={{ width: `${(ps   / total) * 100}%` }} />
      <div className="h-full transition-all duration-700 bg-sky-500"                   style={{ width: `${(mooe / total) * 100}%` }} />
      <div className="h-full rounded-r-full transition-all duration-700 bg-amber-500"  style={{ width: `${(co   / total) * 100}%` }} />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface BreakdownCardProps {
  activePlan: BudgetPlan | null;
  style?: React.CSSProperties;
  className?: string;
}

export const BreakdownCard: React.FC<BreakdownCardProps> = ({
  activePlan, style, className,
}) => {
  const planId = activePlan?.budget_plan_id;

  // ── Read from shared cache — zero extra network calls ─────────────────────
  const { data: deptPlans = [], isLoading: plansLoading } = useDepartmentBudgetPlans(planId);
  const { data: departments = [], isLoading: deptsLoading } = useDepartmentsLite();
  // ──────────────────────────────────────────────────────────────────────────

  const isLoading = plansLoading || deptsLoading;
  const bd = isLoading ? EMPTY : computeBreakdown(deptPlans, departments);

  if (!isLoading && !bd.available) {
    return (
      <div
        style={style}
        className={cn(
          "bg-card rounded-2xl border border-border shadow-sm p-5 flex flex-col items-center justify-center gap-2 text-muted-foreground/60 min-h-[220px]",
          className
        )}
      >
        <BanknotesIcon className="w-6 h-6" />
        <p className="text-xs text-center">PS/MOOE/CO breakdown unavailable<br />pending backend update</p>
      </div>
    );
  }

  const rows = [
    {
      label: "Personnel Services",
      abbr:  "PS",
      value: bd.ps,
      color: "#8b5cf6",
      bg:    "bg-violet-50",
      text:  "text-violet-700",
      pct:   bd.total > 0 ? (bd.ps   / bd.total) * 100 : 0,
    },
    {
      label: "Maint. & Other Operating",
      abbr:  "MOOE",
      value: bd.mooe,
      color: "#0ea5e9",
      bg:    "bg-sky-50",
      text:  "text-sky-700",
      pct:   bd.total > 0 ? (bd.mooe / bd.total) * 100 : 0,
    },
    {
      label: "Capital Outlay",
      abbr:  "CO",
      value: bd.co,
      color: "#f59e0b",
      bg:    "bg-amber-50",
      text:  "text-amber-700",
      pct:   bd.total > 0 ? (bd.co   / bd.total) * 100 : 0,
    },
  ];

  return (
    <div
      style={style}
      className={cn(
        "bg-card rounded-2xl border border-border shadow-sm p-5",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-muted flex items-center justify-center flex-shrink-0">
          <BanknotesIcon className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-eyebrow">General Fund · FY {activePlan?.year ?? "—"}</p>
          <p className="text-section-title mt-0.5">Expenditure Breakdown</p>
        </div>
      </div>

      {/* Total */}
      <div className="mb-4">
        {isLoading ? (
          <Shimmer className="h-7 w-36 mb-1" />
        ) : (
          <>
            <p className="text-metric leading-none">{pesoC(bd.total)}</p>
            <p className="text-meta mt-1">{peso(bd.total)}</p>
          </>
        )}
      </div>

      {/* Proportion bar */}
      {!isLoading && bd.total > 0 && (
        <div className="mb-4">
          <PropBar {...bd} />
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2.5">
        {rows.map(row => (
          <div key={row.abbr}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                <span className="text-[11px] font-semibold text-foreground">{row.abbr}</span>
                <span className="text-meta truncate hidden sm:block">{row.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoading ? (
                  <Shimmer className="h-3.5 w-20" />
                ) : (
                  <>
                    <span className="text-[11px] font-mono font-semibold text-foreground">
                      {pesoC(row.value)}
                    </span>
                    <span className={cn("text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums", row.bg, row.text)}>
                      {row.pct.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            </div>
            {!isLoading && (
              <div className="h-1 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{ width: `${row.pct}%`, background: row.color }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default BreakdownCard;
