import { useEffect, useState } from "react";
import { Card, CardContent } from "@/src/components/ui/card";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { LoadingState } from "@/src/pages/common/LoadingState";
import { Skeleton } from "@/src/components/ui/skeleton";
import { cn } from "@/src/lib/utils";

// ─── Column color tokens ─────────────────────────────────────────────────────
// Headers/backgrounds → soft orange tint (derived/estimated data)
// Amount values       → blue (same as "derived" pattern in IncomeFund 2nd sem)
// Subtotal column     → stronger orange tint, bold
// Grand Total bar     → gray-900

const C_INC_TH  = "bg-orange-50 border-orange-200 text-orange-700";
const C_INC_TD  = "bg-orange-50/40 border-orange-100";
const C_INC_NUM = "text-blue-600";   // derived amounts → blue

const C_TOT_TH  = "bg-orange-100 border-orange-300 text-orange-800";
const C_TOT_TD  = "bg-orange-100 border-orange-200";
const C_TOT_NUM = "text-orange-900 font-bold";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomeColumn {
  object_id: number;
  name:      string;
  amount:    number;
}

interface DeptRow {
  dept_id:           number;
  dept_name:         string;
  dept_abbreviation: string;
  logo:              string | null;
  source:            string;
  columns:           IncomeColumn[];
  total:             number;
}

interface ConsolidatedResponse {
  budget_plan_id: number;
  year:           number;
  departments:    DeptRow[];
  grand_total:    number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-PH", {
    minimumFractionDigits:  2,
    maximumFractionDigits:  2,
  }).format(v);

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL ?? "/storage";

// Rotating colour pairs for dept avatar (same logic as LBPForms)
const AVATAR_COLORS = [
  "bg-blue-100 text-blue-700",
  "bg-violet-100 text-violet-700",
  "bg-teal-100 text-teal-700",
  "bg-amber-100 text-amber-700",
  "bg-rose-100 text-rose-700",
  "bg-sky-100 text-sky-700",
  "bg-orange-100 text-orange-700",
  "bg-pink-100 text-pink-700",
  "bg-emerald-100 text-emerald-700",
  "bg-indigo-100 text-indigo-700",
];

function DeptAvatar({ dept }: { dept: DeptRow }) {
  const label = dept.dept_abbreviation
    ? dept.dept_abbreviation.replace(/[()]/g, "").trim().slice(0, 4)
    : dept.dept_name.slice(0, 2).toUpperCase();
  const colorClass = AVATAR_COLORS[dept.dept_id % AVATAR_COLORS.length];

  if (dept.logo) {
    return (
      <div className="w-9 h-9 rounded-lg overflow-hidden flex-shrink-0 border border-gray-200">
        <img
          src={`${STORAGE_URL}/${dept.logo}`}
          alt={dept.dept_abbreviation || dept.dept_name}
          className="w-full h-full object-cover"
          onError={e => {
            (e.currentTarget.parentElement as HTMLElement).innerHTML =
              `<div class="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] ${colorClass}">${label}</div>`;
          }}
        />
      </div>
    );
  }
  return (
    <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center font-bold text-[11px] flex-shrink-0", colorClass)}>
      {label}
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function PageSkeleton() {
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <Skeleton className="h-3 w-48 rounded" />
        <Skeleton className="h-7 w-80 rounded" />
        <Skeleton className="h-3 w-64 rounded" />
      </div>
      {/* Table placeholder */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="border-b border-gray-200 bg-gray-50/60 px-4 py-3 flex items-center gap-4">
          <Skeleton className="h-3 w-32 rounded" />
          {[1,2,3,4].map(i => <Skeleton key={i} className="h-3 w-24 rounded ml-4" />)}
          <Skeleton className="h-3 w-20 rounded ml-auto" />
        </div>
        {[0,1,2].map(ri => (
          <div key={ri} className={cn("px-4 py-4 border-b border-gray-100 flex items-start gap-4", ri % 2 === 1 && "bg-gray-50/30")}>
            <div className="flex items-center gap-3 w-48 flex-shrink-0">
              <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
              <div className="space-y-1.5 flex-1">
                <Skeleton className="h-3 w-full rounded" />
                <Skeleton className="h-2.5 w-3/4 rounded" />
              </div>
            </div>
            {[1,2,3,4].map(ci => <Skeleton key={ci} className="h-3 w-24 rounded ml-4 mt-1" />)}
            <Skeleton className="h-3 w-20 rounded ml-auto mt-1" />
          </div>
        ))}
        {/* Grand total */}
        <div className="px-4 py-3 bg-gray-900/5 border-t-2 border-gray-200 flex justify-between items-center">
          <Skeleton className="h-3 w-28 rounded bg-gray-200" />
          <Skeleton className="h-4 w-32 rounded bg-gray-200" />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ConsolidatedSpecialIncomePage() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const [data,    setData]    = useState<ConsolidatedResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activePlan?.budget_plan_id) return;
    setLoading(true);
    API.get(`/consolidated-special-income?budget_plan_id=${activePlan.budget_plan_id}`)
      .then(r => setData(r.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [activePlan?.budget_plan_id]);

  if (planLoading) return <LoadingState />;

  if (!activePlan) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <p className="text-gray-500 text-sm">No active budget plan found.</p>
        <p className="text-gray-400 text-xs">Activate a budget plan to view consolidated income.</p>
      </div>
    </div>
  );

  if (loading || !data) return <PageSkeleton />;

  const { departments, grand_total, year } = data;

  // ── The table is a "cross-tab pivot":
  //    Each department has its own set of columns (different income items).
  //    We render each department as a section with its own header row + data row.

  const th  = "border-b border-r border-gray-200 bg-white px-3 py-2.5 text-left text-[10px] font-semibold text-gray-500 uppercase tracking-wide align-bottom";
  const thR = cn(th, "text-right");
  const thInc = cn(thR, C_INC_TH);  // income item column header — green

  return (
    <div className="p-6">

      {/* ── Page header ──────────────────────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Consolidated Estimated Income
          </span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-gray-400">Special Account, CY {year}</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-gray-400">Municipality of Opol, Misamis Oriental</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Consolidated Special Account Income
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          Estimated income per department from special-account sources
        </p>
      </div>

      {/* ── Summary cards ────────────────────────────────────────────────── */}
      <div className={cn("grid gap-3 mb-7", `grid-cols-${Math.min(departments.length + 1, 5)}`)}>
        {departments.map(dept => (
          <Card key={dept.dept_id}>
            <CardContent className="pt-4 pb-3 px-4 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <DeptAvatar dept={dept} />
                <span className="text-[11px] font-semibold text-gray-700 truncate leading-tight">
                  {dept.dept_abbreviation || dept.dept_name}
                </span>
              </div>
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Est. Income</p>
                <p className="text-[15px] font-bold font-mono tabular-nums text-gray-900 leading-tight mt-0.5">
                  ₱ {fmt(dept.total)}
                </p>
              </div>
            </CardContent>
          </Card>
        ))}
        {/* Grand total card — dark */}
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-4 pb-3 px-4 flex flex-col gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Grand Total</p>
            <p className="text-[15px] font-bold font-mono tabular-nums text-white leading-tight">
              ₱ {fmt(grand_total)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ── Empty state ───────────────────────────────────────────────────── */}
      {departments.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-14 text-center text-gray-400 text-sm shadow-sm">
          No special-account departments found. Ensure department categories include "Special Account".
        </div>
      )}

      {/* ── Per-department pivot sections ────────────────────────────────── */}
      {departments.map((dept, di) => (
        <div key={dept.dept_id} className={cn("mb-8", di > 0 && "mt-2")}>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            {dept.columns.length === 0 ? (
              <div className="px-6 py-8 text-center text-gray-400 text-sm">
                No income items with values found for this department in the current budget plan.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-[12px] border-collapse">
                  <thead>
                    <tr>
                      {/* Department column — empty header, dept name in body */}
                      <th className={cn(th, "w-48 bg-gray-50/60")}>Department</th>
                      {/* Dynamic income item columns — green */}
                      {dept.columns.map(col => (
                        <th key={col.object_id} className={cn(thInc, "min-w-[140px]")}>
                          {col.name}
                        </th>
                      ))}
                      {/* Total column — green subtotal (read-only, same as Form5 subtotal row) */}
                      <th className={cn("border-b border-r px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-wide align-bottom w-40", C_TOT_TH)}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="hover:bg-gray-50/30 transition-colors">
                      {/* Dept name cell */}
                      <td className="border-r border-gray-100 px-3 py-3 align-top">
                        <div className="flex items-center gap-2.5">
                          <DeptAvatar dept={dept} />
                          <div className="min-w-0">
                            <p className="text-[12px] font-semibold text-gray-800 leading-tight truncate">
                              {dept.dept_abbreviation || dept.dept_name}
                            </p>
                            <p className="text-[10px] text-gray-400 truncate">{dept.dept_name}</p>
                          </div>
                        </div>
                      </td>
                      {/* Income item amounts — orange tint bg, blue derived amounts */}
                      {dept.columns.map(col => (
                        <td
                          key={col.object_id}
                          className={cn(
                            "border-r border-l px-3 py-3 text-right font-mono tabular-nums align-top",
                            C_INC_TD,
                            col.amount > 0 ? C_INC_NUM : "text-orange-200"
                          )}
                        >
                          {col.amount > 0 ? `₱ ${fmt(col.amount)}` : "—"}
                        </td>
                      ))}
                      {/* Total cell — orange tint, blue bold amount */}
                      <td className={cn("px-3 py-3 text-right font-mono tabular-nums align-top border-l", C_TOT_TD)}>
                        <span className={C_TOT_NUM}>₱ {fmt(dept.total)}</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* ── Grand Total row ───────────────────────────────────────────────── */}
      {departments.length > 0 && (
        <div className="bg-gray-900 rounded-xl px-6 py-4 flex items-center justify-between mt-4 shadow-sm">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">Grand Total</p>
            <p className="text-[12px] font-medium text-gray-400 mt-0.5">
              All special-account departments · CY {year}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-500 mb-1">Estimated Income</p>
            <p className="text-2xl font-bold font-mono tabular-nums text-white">
              ₱ {fmt(grand_total)}
            </p>
          </div>
        </div>
      )}

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
          <span className="text-orange-600 font-semibold">Orange</span> = Derived estimated income (read-only)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
          <span className="text-blue-600 font-semibold">Blue</span> = Computed amounts
        </span>
        <span className="ml-auto">Columns vary per department based on their income fund items</span>
      </div>
    </div>
  );
}