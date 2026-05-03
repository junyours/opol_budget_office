import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import API from "../../services/api";
import { BudgetPlan, DepartmentBudgetPlan } from "../../types/api";
import { cn } from "@/src/lib/utils";
import { BanknotesIcon } from "@heroicons/react/24/outline";

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

interface Breakdown {
  ps:  number;
  mooe: number;
  co:  number;
  total: number;
}

const EMPTY: Breakdown = { ps: 0, mooe: 0, co: 0, total: 0 };
const SPECIAL_CAT_ID = 4;

// ─── Fetcher ──────────────────────────────────────────────────────────────────

// expense_type or object_code heuristics:
// PS   → personnel services   (object code starts with "1" or type "ps")
// MOOE → maintenance & other  (object code starts with "2" or type "mooe")
// CO   → capital outlay       (object code starts with "3" or type "co" / "capital")
// Falls back to splitting items by their object_code prefix if present.

async function fetchBreakdown(planId: number): Promise<Breakdown> {
  try {
    const res = await API.get("/department-budget-plans", {
      params: { "filter[budget_plan_id]": planId },
    });
    const allDps: DepartmentBudgetPlan[] = res.data?.data ?? [];

    // Only general fund depts (not special accounts)
    const gfDps = allDps.filter(
      (dp: DepartmentBudgetPlan) => {
        const dept = (dp as any).department;
        return !dept || dept.dept_category_id !== SPECIAL_CAT_ID;
      }
    );

    let ps = 0, mooe = 0, co = 0;

    gfDps.forEach((dp: DepartmentBudgetPlan) => {
      (dp.items ?? []).forEach((item: any) => {
        const amt = parseFloat(item.total_amount) || 0;
        // Try expense_type field first, then object_code prefix
        const type  = (item.expense_type ?? item.type ?? "").toString().toLowerCase();
        const code  = (item.object_code ?? item.code ?? "").toString().trim();

        if (/^ps$|personnel/i.test(type) || code.startsWith("1")) {
          ps += amt;
        } else if (/mooe|maintenance|other/i.test(type) || code.startsWith("2")) {
          mooe += amt;
        } else if (/co$|capital/i.test(type) || code.startsWith("3")) {
          co += amt;
        } else {
          // unknown — distribute into mooe as catch-all
          mooe += amt;
        }
      });
    });

    return { ps, mooe, co, total: ps + mooe + co };
  } catch {
    return EMPTY;
  }
}

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-zinc-100 animate-pulse", className)} />
  );
}

// ─── Bar ─────────────────────────────────────────────────────────────────────

function PropBar({
  ps, mooe, co, total,
}: { ps: number; mooe: number; co: number; total: number }) {
  if (total === 0) return null;
  const psPct   = (ps   / total) * 100;
  const mooePct = (mooe / total) * 100;
  const coPct   = (co   / total) * 100;
  return (
    <div className="h-1.5 rounded-full overflow-hidden flex gap-px bg-zinc-100">
      <div className="h-full rounded-l-full transition-all duration-700 bg-violet-500" style={{ width: `${psPct}%` }} />
      <div className="h-full transition-all duration-700 bg-sky-500"    style={{ width: `${mooePct}%` }} />
      <div className="h-full rounded-r-full transition-all duration-700 bg-amber-500" style={{ width: `${coPct}%` }} />
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

  const { data, isLoading } = useQuery<Breakdown>({
    queryKey: ["gf-breakdown", planId],
    queryFn:  () => fetchBreakdown(planId!),
    enabled:  !!planId,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

  const bd = data ?? EMPTY;

  const rows = [
    {
      label: "Personnel Services",
      abbr:  "PS",
      value: bd.ps,
      color: "#8b5cf6",  // violet
      bg:    "bg-violet-50",
      text:  "text-violet-700",
      pct:   bd.total > 0 ? (bd.ps / bd.total) * 100 : 0,
    },
    {
      label: "Maint. & Other Operating",
      abbr:  "MOOE",
      value: bd.mooe,
      color: "#0ea5e9",  // sky
      bg:    "bg-sky-50",
      text:  "text-sky-700",
      pct:   bd.total > 0 ? (bd.mooe / bd.total) * 100 : 0,
    },
    {
      label: "Capital Outlay",
      abbr:  "CO",
      value: bd.co,
      color: "#f59e0b",  // amber
      bg:    "bg-amber-50",
      text:  "text-amber-700",
      pct:   bd.total > 0 ? (bd.co / bd.total) * 100 : 0,
    },
  ];

  return (
    <div
      style={style}
      className={cn(
        "bg-white rounded-2xl border border-zinc-100 shadow-sm p-5",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 mb-4">
        <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
          <BanknotesIcon className="w-4 h-4 text-emerald-600" />
        </div>
        <div>
          <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
            General Fund · FY {activePlan?.year ?? "—"}
          </p>
          <p className="text-sm font-semibold text-zinc-900 mt-0.5">Expenditure Breakdown</p>
        </div>
      </div>

      {/* Total */}
      <div className="mb-4">
        {isLoading ? (
          <Shimmer className="h-7 w-36 mb-1" />
        ) : (
          <>
            <p className="text-2xl font-semibold text-zinc-900 tabular-nums tracking-tight leading-none">
              {pesoC(bd.total)}
            </p>
            <p className="text-[10px] font-mono text-zinc-400 mt-1">{peso(bd.total)}</p>
          </>
        )}
      </div>

      {/* Proportion bar */}
      {!isLoading && bd.total > 0 && (
        <div className="mb-4">
          <PropBar ps={bd.ps} mooe={bd.mooe} co={bd.co} total={bd.total} />
        </div>
      )}

      {/* Rows */}
      <div className="space-y-2.5">
        {rows.map(row => (
          <div key={row.abbr}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: row.color }} />
                <span className="text-[11px] font-semibold text-zinc-600">{row.abbr}</span>
                <span className="text-[10px] text-zinc-400 truncate hidden sm:block">{row.label}</span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {isLoading ? (
                  <Shimmer className="h-3.5 w-20" />
                ) : (
                  <>
                    <span className="text-[11px] font-mono font-semibold text-zinc-700">
                      {pesoC(row.value)}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-semibold rounded-md px-1.5 py-0.5 tabular-nums",
                        row.bg, row.text
                      )}
                    >
                      {row.pct.toFixed(1)}%
                    </span>
                  </>
                )}
              </div>
            </div>
            {!isLoading && (
              <div className="h-1 rounded-full bg-zinc-100 overflow-hidden">
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
