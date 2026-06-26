import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { UserGroupIcon, ChevronRightIcon } from "@heroicons/react/24/outline";
import { Progress } from "@/src/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { InformationCircleIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PsTop {
  total_ps_gf:       number;
  terminal_leave_gf: number;
  monetization_gf:   number;
}

interface PsManual {
  total_income:         number;
  non_recurring_income: number;
}

interface PsResponse {
  budget_plan: { budget_plan_id: number; year: number };
  income_year: number;
  manual:      PsManual;
  top:         PsTop;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const peso = (v: number) =>
  `₱${Math.abs(v).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const pesoC = (v: number): string => {
  const a = Math.abs(v);
  if (a >= 1_000_000) return `₱${(a / 1_000_000).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (a >= 1_000)     return `₱${(a / 1_000).toLocaleString("en-PH",     { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
  return peso(v);
};

// ─── Shimmer ─────────────────────────────────────────────────────────────────

function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-lg bg-muted animate-pulse", className)} />
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function Row({
  label, value, sub, accent = "default", bold = false, indent = false,
}: {
  label: string; value: number; sub?: string;
  accent?: "default" | "blue" | "green" | "red" | "amber";
  bold?: boolean; indent?: boolean;
}) {
  const colors: Record<string, string> = {
    default: "text-zinc-700",
    blue:    "text-blue-600",
    green:   "text-emerald-600",
    red:     "text-red-600",
    amber:   "text-amber-600",
  };
  return (
    <div className={cn("flex items-center justify-between py-2", indent && "pl-4")}>
      <div className="flex-1 min-w-0">
        <p className={cn("text-[11.5px] leading-snug", bold ? "font-semibold text-zinc-900" : "text-zinc-500")}>
          {label}
        </p>
        {sub && <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>}
      </div>
      <p className={cn("font-mono tabular-nums text-[12px] ml-3 flex-shrink-0", bold ? "font-bold" : "font-medium", colors[accent])}>
        {value < 0 ? `-${peso(value)}` : peso(value)}
      </p>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export function PsLimitationCard({
  planId, style,
}: {
  planId: number | undefined;
  style?: React.CSSProperties;
}) {
  const navigate = useNavigate();

  const { data, isLoading } = useQuery<PsResponse>({
    queryKey: ["ps-computation", planId],
    queryFn:  () => API.get<PsResponse>(`/ps-computation?budget_plan_id=${planId}`).then(r => r.data),
    enabled:  !!planId,
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const totalIncome    = data?.manual.total_income         ?? 0;
  const nonRecurring   = data?.manual.non_recurring_income ?? 0;
  const realized       = totalIncome - nonRecurring;
  const limitation     = realized * 0.45;
  const totalPs        = data?.top.total_ps_gf             ?? 0;
  const terminalLeave  = data?.top.terminal_leave_gf       ?? 0;
  const monetization   = data?.top.monetization_gf         ?? 0;
  const waived         = terminalLeave + monetization;
  const netPs          = totalPs - waived;
  const allowable      = limitation - netPs;
  const utilisationPct = limitation > 0 ? Math.min((netPs / limitation) * 100, 100) : 0;
  const isOver         = allowable < 0;
  const year           = data?.budget_plan.year;
  const incYear        = data?.income_year;

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading || !planId) {
    return (
      <div style={style} className="bg-card rounded-2xl border border-border shadow-sm p-5 space-y-4 animate-in fade-in duration-500">
        <div className="flex items-center gap-3">
          <Shimmer className="w-9 h-9 rounded-xl" />
          <div className="space-y-1.5">
            <Shimmer className="h-2.5 w-32" />
            <Shimmer className="h-4 w-44" />
          </div>
        </div>
        <Shimmer className="h-20 w-full rounded-xl" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex justify-between">
              <Shimmer className={cn("h-3", i % 2 === 0 ? "w-40" : "w-32")} />
              <Shimmer className="h-3 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      style={style}
      className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both"
    >
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-5 pt-5 pb-4 border-b border-zinc-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center flex-shrink-0">
            <UserGroupIcon className="w-5 h-5 text-cyan-600" />
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] uppercase text-zinc-400 leading-none">
              Personnel Services
            </p>
            <p className="text-[14px] font-semibold text-zinc-900 mt-0.5 leading-none">
              PS Limitation
            </p>
          </div>
        </div>
        <button
          onClick={() => navigate("/admin/ps-computation")}
          className="flex items-center gap-1 text-sm text-zinc-400 hover:text-zinc-800 transition-colors font-medium"
        >
          View <ChevronRightIcon className="w-3 h-3" />
        </button>
      </div>

      <div className="p-5 space-y-4">

        {/* ── Amount Allowable hero ───────────────────────────────────── */}
        <div className={cn(
          "rounded-2xl border-2 px-4 py-3.5 flex items-center justify-between",
          isOver
            ? "bg-red-50   border-red-200"
            : "bg-emerald-50 border-emerald-200"
        )}>
          <div>
            <p className={cn(
              "text-[10px] font-bold uppercase tracking-widest mb-1",
              isOver ? "text-red-500" : "text-emerald-600"
            )}>
              Amount Allowable
            </p>
            <p className={cn(
              "font-mono font-bold tabular-nums text-xl leading-none",
              isOver ? "text-red-700" : "text-emerald-700"
            )}>
              {isOver ? `-${peso(allowable)}` : peso(allowable)}
            </p>
            <p className={cn("text-[10px] mt-1", isOver ? "text-red-400" : "text-emerald-500")}>
              PS Limit − Net PS Budget
            </p>
          </div>
          <div className={cn(
            "rounded-xl border px-3 py-2 text-center flex-shrink-0",
            isOver ? "bg-red-100 border-red-200" : "bg-emerald-100 border-emerald-200"
          )}>
            <p className={cn(
              "text-xl font-bold font-mono tabular-nums leading-none",
              isOver ? "text-red-700" : "text-emerald-700"
            )}>
              {Math.round(utilisationPct)}%
            </p>
            <p className={cn("text-[9px] font-semibold uppercase tracking-widest mt-0.5", isOver ? "text-red-500" : "text-emerald-600")}>
              utilized
            </p>
          </div>
        </div>

        {/* ── Progress bar ────────────────────────────────────────────── */}
        <div className="space-y-1.5">
          <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-700",
                utilisationPct >= 100 ? "bg-red-500"
                : utilisationPct >= 80  ? "bg-amber-400"
                : "bg-cyan-500"
              )}
              style={{ width: `${utilisationPct}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
            <span>{pesoC(netPs)} net PS</span>
            <span>of {pesoC(limitation)} limit</span>
          </div>
        </div>

        {/* ── Breakdown rows ──────────────────────────────────────────── */}
       {/* PS Limitation — standalone */}
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 px-3">
          <Row
            label="PS Limitation (45%)"
            sub={incYear ? `Based on ${incYear} realized income` : undefined}
            value={limitation}
            bold
          />
        </div>

        {/* Net PS calculation block */}
        <div className="rounded-xl border border-zinc-100 bg-zinc-50 divide-y divide-zinc-100 overflow-hidden">

          <div className="px-3">
            <Row
              label={`Total PS · FY ${year ?? ""}`}
              sub="Derived from dept budget plans"
              value={totalPs}
              accent="blue"
            />
          </div>

          <div className="px-3">
            <Row
              label="Total Waived Items"
              sub="Terminal Leave + Monetization"
              value={waived}
              bold
            />
          </div>

          <div className={cn("px-3", isOver ? "bg-red-50" : "bg-cyan-50")}>
            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-1.5">
                <p className="text-[11.5px] font-bold text-zinc-900">Net Annual PS Budget</p>
                <TooltipProvider delayDuration={200}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button className="text-zinc-300 hover:text-zinc-500 transition-colors">
                        <InformationCircleIcon className="w-3.5 h-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-[180px] text-center text-xs leading-snug">
                      Total PS minus Waived Items (Terminal Leave + Monetization)
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <p className={cn(
                "font-mono font-bold tabular-nums text-[13px]",
                isOver ? "text-red-600" : "text-cyan-700"
              )}>
                {peso(netPs)}
              </p>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
