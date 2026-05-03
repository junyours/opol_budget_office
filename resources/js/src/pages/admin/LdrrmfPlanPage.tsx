// components/admin/LdrrmfPlanPage.tsx
import React, { useEffect, useState } from "react";
import API from "@/src/services/api";
import { LoadingState } from "@/src/pages/common/LoadingState";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { CheckCircleIcon, ExclamationTriangleIcon } from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PastData {
  qrf_30:          number;
  preparedness_70: number;
  total_5pct:      number;
}

interface CurrentData {
  qrf_30_sem1:   number;
  qrf_30_sem2:   number;
  qrf_30_total:  number;
  prep_70_sem1:  number;
  prep_70_sem2:  number;
  prep_70_total: number;
  total_sem1:    number;
  total_sem2:    number;
  total_5pct:    number;
}

interface BudgetYearData {
  qrf_30:          number;
  preparedness_70: number;
  total_5pct:      number;
}

interface LdrrmfItem {
  ldrrmfip_item_id:    number;
  description:         string;
  category_name:       string | null;
  implementing_office: string;
  // Budget year
  mooe:                number;
  co:                  number;
  total:               number;
  // Past year
  obligation_amount:   number;
  // Current year
  sem1_amount:         number;
  sem2_amount:         number;
  total_amount:        number;
}

interface SpecialAccountSection {
  source:               string;
  dept_name:            string;
  label:                string;
  past:                 PastData;
  current:              CurrentData;
  budget_year:          BudgetYearData;
  items:                LdrrmfItem[];
  qrf_past_obligation:  number;
  qrf_current_sem1:     number;
  qrf_current_sem2:     number;
  qrf_current_total:    number;
  qrf_past_plan_id:     number | null;
  qrf_current_plan_id:  number | null;
}

interface GrandTotal {
  past:        { total_5pct: number };
  current:     { total_sem1: number; total_sem2: number; total_5pct: number };
  budget_year: { total_5pct: number };
}

interface PlanReport {
  year:             number;
  past_year:        number;
  current_year:     number;
  past_plan_id:     number | null;
  current_plan_id:  number | null;
  special_accounts: SpecialAccountSection[];
  grand_total:      GrandTotal;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const fmtAbs = (v: number): string =>
  v === 0 ? "–" : Math.round(Math.abs(v)).toLocaleString("en-PH");

const fmtPeso = (v: number): string =>
  v === 0 ? "–" : `₱ ${Math.round(Math.abs(v)).toLocaleString("en-PH")}`;

// ─── Match validation ─────────────────────────────────────────────────────────

const TOLERANCE = 1;

function isMatch(derived: number, calculated: number): boolean {
  return Math.abs(derived - calculated) <= TOLERANCE;
}

// ─── MatchBadge ───────────────────────────────────────────────────────────────

interface MatchBadgeProps {
  derived:    number;
  calculated: number;
  label:      string;
}

function MatchBadge({ derived, calculated, label }: MatchBadgeProps) {
  const matched = isMatch(derived, calculated);
  const diff    = derived - calculated;

  const tooltipContent = matched ? (
    <div className="space-y-1 text-[11px] max-w-[240px]">
      <p className="font-semibold text-emerald-300">✓ Values match</p>
      <p className="text-gray-300">
        Derived ({label}): <span className="font-mono text-white">{fmtPeso(derived)}</span>
      </p>
      <p className="text-gray-300">
        Calculated (items sum): <span className="font-mono text-white">{fmtPeso(calculated)}</span>
      </p>
      <p className="text-gray-400 text-[10px]">Difference: ₱0 (within tolerance)</p>
    </div>
  ) : (
    <div className="space-y-1 text-[11px] max-w-[260px]">
      <p className="font-semibold text-red-300">⚠ Values do not match</p>
      <p className="text-gray-300">
        Derived ({label}): <span className="font-mono text-white">{fmtPeso(derived)}</span>
      </p>
      <p className="text-gray-300">
        Calculated (items sum): <span className="font-mono text-white">{fmtPeso(calculated)}</span>
      </p>
      <p className="text-red-300 font-mono text-[10px]">
        Difference: {diff > 0 ? "+" : ""}{fmtPeso(diff)}
        {" "}({diff > 0 ? "derived is higher" : "items exceed derived limit"})
      </p>
      <p className="text-gray-400 text-[10px] border-t border-gray-600 pt-1">
        {diff < 0
          ? "Items in the LDRRMFIP page exceed the allocated fund. Review item amounts."
          : "Remaining budget not yet allocated to items."
        }
      </p>
    </div>
  );

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className={cn(
            "inline-flex items-center gap-0.5 ml-1.5 px-1.5 py-0.5 rounded text-[9.5px] font-semibold cursor-help select-none",
            matched
              ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
              : "bg-red-100 text-red-700 border border-red-200"
          )}>
            {matched
              ? <CheckCircleIcon className="w-3 h-3" />
              : <ExclamationTriangleIcon className="w-3 h-3" />
            }
            {matched ? "matched" : "mismatch"}
          </span>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          className="bg-gray-900 border-gray-700 text-white p-3 rounded-lg shadow-xl"
        >
          {tooltipContent}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function LdrrmfPlanPage() {
  const [report,  setReport]  = useState<PlanReport | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    API.get("/ldrrmf-plan")
      .then(res => setReport(res.data.data ?? null))
      .catch(() => toast.error("Failed to load LDRRMF Plan data."))
      .finally(() => setLoading(false));
  }, []);

  // ── Inline sem1 editing state — MUST be before any early return ──────────
  const [editingValues, setEditingValues] = useState<Record<string, string>>({});
  const [savingKeys,    setSavingKeys]    = useState<Set<string>>(new Set());

  if (loading) return <LoadingState />;
  if (!report) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">No active budget plan found.</p>
    </div>
  );

  const { year, past_year, current_year, special_accounts, grand_total,
          past_plan_id, current_plan_id } = report;

  const fmtInput = (v: number): string =>
    v === 0 ? "" : Math.floor(v).toLocaleString("en-PH");

  const parseInput = (s: string): number =>
    parseFloat(s.replace(/,/g, "")) || 0;

  const handleAmountChange = (key: string, raw: string) => {
  const digits    = raw.replace(/[^0-9.]/g, "");
  const num       = parseFloat(digits) || 0;
  const formatted = num === 0 ? digits : Math.floor(num).toLocaleString("en-PH");
  setEditingValues(prev => ({ ...prev, [key]: digits === "" ? "" : formatted }));
};

const handleAmountFocus = (key: string, currentValue: number) => {
  if (editingValues[key] === undefined) {
    setEditingValues(prev => ({ ...prev, [key]: currentValue === 0 ? "" : Math.floor(currentValue).toLocaleString("en-PH") }));
  }
};

  const handleSem1Blur = async (
  key: string,
  item: LdrrmfItem,
  source: string,
  currentPlanId: number | null
) => {
  if (!currentPlanId) return;
  if (editingValues[key] === undefined) return;
  const raw   = editingValues[key];
  const value = parseInput(raw);
  setEditingValues(prev => { const n = { ...prev }; delete n[key]; return n; });
  if (value === Math.floor(item.sem1_amount)) return;
    setSavingKeys(prev => new Set(prev).add(key));
    const promise = (async () => {
  await API.patch(`/ldrrmfip/upsert-year-amounts`, {
  budget_plan_id: currentPlanId,
  source,
  description:    item.description,
  sem1_amount:    value,
});
  const res = await API.get("/ldrrmf-plan");
  setReport(res.data.data ?? null);
})();
toast.promise(promise, {
  loading: "Saving…",
  success: `${item.description} saved`,
  error:   "Failed to save Sem 1 amount.",
});
try {
  await promise;
} catch {
  /* handled by toast */
} finally {
  setSavingKeys(prev => { const n = new Set(prev); n.delete(key); return n; });
}
  };

  const handleObligationBlur = async (
    item: LdrrmfItem,
    source: string,
    pastPlanId: number | null,
    value: number
  ) => {
    if (!pastPlanId) return;
    try {
      await API.patch(`/ldrrmfip/upsert-year-amounts`, {
        budget_plan_id:       pastPlanId,
        source,
        description:          item.description,
        obligation_amount:    value,
      });
      const res = await API.get("/ldrrmf-plan");
      setReport(res.data.data ?? null);
    } catch {
      toast.error("Failed to save obligation amount.");
    }
  };

  // ── Shared th classes ─────────────────────────────────────────────────────
  // Past Year   → amber tint
  // Current     → emerald tint
  // Budget Year → indigo tint
  const thStatic = "border-b border-r border-gray-200 bg-white px-3 py-2.5 align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide";
  const thPrev   = "border-b border-r border-green-200 bg-green-50 px-3 py-2 text-center text-[10px] font-semibold text-green-700 uppercase tracking-wide";
  const thCurr   = "border-b border-r border-blue-200 bg-blue-50 px-3 py-2 text-center text-[10px] font-semibold text-blue-700 uppercase tracking-wide";
  const thBudget = "border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 align-bottom font-semibold text-orange-700 text-[11px] uppercase tracking-wide text-center";

  return (
    <div className="p-6">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          5% Local Disaster Risk Reduction Management Fund Plan, (LDRRMF Plan) —{" "}
          <span className="text-gray-500 font-normal text-xl">JMC 2013-1, RA-10121</span>
        </h1>
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[13px] text-gray-700">
            <span className="font-semibold text-gray-500">Special Account:</span>{" "}
            {special_accounts.map((sa, i) => (
              <span key={sa.source}>
                {i > 0 && <span className="text-gray-400 mx-1">/</span>}
                <span className="text-gray-800">{sa.dept_name}</span>
              </span>
            ))}
          </p>
          <p className="text-[13px] text-gray-500">
            <span className="font-semibold">Municipality:</span> Opol, Misamis Oriental
          </p>
        </div>
      </div>

      {/* ── Table ─────────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-[12px]" style={{ minWidth: 960 }}>

            {/* ── Column headers — mirrors Form5 banding ──────────────────── */}
            <thead>
              <tr>
                <th rowSpan={3} className={cn(thStatic, "text-left w-[36%]")}>
                  Object of Expenditures
                </th>
                <th rowSpan={3} className={cn(thStatic, "text-center w-[6%]")}>
                  Account<br />Code
                </th>
                {/* Past — bg-gray-50 band */}
                <th rowSpan={2} className={cn(thPrev, "border-l text-center w-[10%]")}>
                  Past Year<br />
                  <span className="text-[9.5px] font-normal normal-case">(Actual) {past_year}</span>
                </th>
                {/* Current — emerald tint band */}
                <th colSpan={3} className="border-b border-r border-l border-blue-200 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest bg-blue-50 text-blue-700">
                  Current Year (Estimate) {current_year}
                </th>
                {/* Budget Year — indigo tint */}
                <th rowSpan={2} className={cn(thBudget, "w-[11%] border-l border-orange-200")}>
                  {year}<br />Budget Year
                </th>
              </tr>
              <tr>
                <th className={cn(thCurr, "border-l w-[9%] text-center")}>
                  1st Semester<br />
                  <span className="text-[9px] font-normal normal-case">(Actual)</span>
                </th>
                <th className={cn(thCurr, "w-[9%] text-center")}>
                  2nd Semester<br />
                  <span className="text-[9px] font-normal normal-case">(Estimate)</span>
                </th>
                <th className={cn(thCurr, "w-[9%] text-center")}>
                  Total
                </th>
              </tr>
              {/* Column number row */}
              <tr className="border-b-2 border-gray-200">
                {["(3)", "(4)", "(5)", "(6)", "(7)"].map((n, i) => (
                  <td
                    key={i}
                    className={cn(
                      "px-3 py-1 text-center text-[10px]",
                      i === 0
                        ? "border-r border-l border-green-200 bg-green-50 text-green-400"
                        : i < 4
                        ? "border-r border-blue-200 bg-blue-50 text-blue-400"
                        : "border-r border-orange-200 bg-orange-50 text-orange-400"
                    )}
                  >
                    {n}
                  </td>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {special_accounts.map((sa, saIdx) => {
                const itemsTotal      = sa.items.reduce((sum, i) => sum + i.total, 0);
                const prep70Matched   = isMatch(sa.budget_year.preparedness_70, itemsTotal);
                const total5pctCalc   = sa.budget_year.qrf_30 + itemsTotal;
                const total5pctMatched = isMatch(sa.budget_year.total_5pct, total5pctCalc);

                return (
                  <React.Fragment key={sa.source}>

                    {/* ── Department section header ──────────────────────── */}
                    <tr className="bg-gray-50">
                      <td
                        colSpan={7}
                        className="px-4 py-2.5 font-bold text-[12.5px] text-gray-900 border-b border-gray-200"
                      >
                        {sa.label}
                      </td>
                    </tr>

                    {/* ── 30% QRF row ──────────────────────────────────── */}
                    {(() => {
                      const qrfObligKey      = `qrf-oblig-${sa.source}`;
                      const qrfSem1Key       = `qrf-sem1-${sa.source}`;
                      const isQrfObligSaving = savingKeys.has(qrfObligKey);
                      const isQrfSem1Saving  = savingKeys.has(qrfSem1Key);

                      const qrfObligDisplay = editingValues[qrfObligKey] !== undefined
                        ? editingValues[qrfObligKey]
                        : fmtInput(sa.qrf_past_obligation);

                      const qrfSem1Display = editingValues[qrfSem1Key] !== undefined
                        ? editingValues[qrfSem1Key]
                        : fmtInput(sa.qrf_current_sem1);

                      const qrfSem1Live  = editingValues[qrfSem1Key] !== undefined
                        ? parseInput(editingValues[qrfSem1Key])
                        : sa.qrf_current_sem1;
                      const qrfSem2Live  = Math.max(0, Math.floor((sa.qrf_current_sem1 + sa.qrf_current_sem2) - qrfSem1Live));
                      const qrfTotalLive = sa.qrf_current_total;

                      return (
                        <tr className="hover:bg-gray-50/60 transition-colors">
                          <td className="px-4 py-3 border-r border-gray-100 text-[12px]">
                            <span className="text-gray-900 font-medium">30% Quick Response Fund (QRF)</span>
                            <span className="ml-1.5 text-[9.5px] text-blue-400 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 font-semibold align-middle">
                              derived
                            </span>
                          </td>
                          <td className="px-3 py-3 border-r border-gray-100 text-center text-gray-300 text-[11px]">—</td>

                          {/* Past — editable obligation */}
                          <td className="px-1.5 py-1.5 border-r border-l border-green-100 bg-green-50/30">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={qrfObligDisplay}
                              placeholder="–"
                              disabled={isQrfObligSaving}
                              className={cn(
                                "w-full text-right font-mono text-[11.5px] rounded px-1.5 py-0.5 placeholder-gray-300 border border-gray-200 bg-white focus:outline-none",
                                isQrfObligSaving
                                  ? "text-gray-400 cursor-wait opacity-50"
                                  : "text-gray-700 focus:ring-2 focus:ring-green-300 focus:border-green-300"
                              )}
                              onFocus={() => handleAmountFocus(qrfObligKey, sa.qrf_past_obligation)}
                              onChange={e => handleAmountChange(qrfObligKey, e.target.value)}
                              onBlur={async () => {
                                if (!past_plan_id) return;
                                if (editingValues[qrfObligKey] === undefined) return;
                                const raw = editingValues[qrfObligKey];
                                setEditingValues(prev => { const n = { ...prev }; delete n[qrfObligKey]; return n; });
                                const value = parseInput(raw);
                                if (value === Math.floor(sa.qrf_past_obligation)) return;
                                setSavingKeys(prev => new Set(prev).add(qrfObligKey));
                                const promise = (async () => {
                                  await API.patch(`/ldrrmfip/upsert-year-amounts`, {
                                    budget_plan_id:    past_plan_id,
                                    source:            sa.source,
                                    description:       '__QRF_30__',
                                    obligation_amount: value,
                                  });
                                  const res = await API.get("/ldrrmf-plan");
                                  setReport(res.data.data ?? null);
                                })();
                                toast.promise(promise, {
                                  loading: "Saving…",
                                  success: "QRF obligation saved",
                                  error:   "Failed to save QRF obligation.",
                                });
                                try { await promise; } catch { /* handled */ } finally {
                                  setSavingKeys(prev => { const n = new Set(prev); n.delete(qrfObligKey); return n; });
                                }
                              }}
                            />
                          </td>

                          {/* Current sem1 — editable */}
                          <td className="px-1.5 py-1.5 border-r border-l border-blue-100 bg-blue-50/30">
                            <input
                              type="text"
                              inputMode="numeric"
                              value={qrfSem1Display}
                              placeholder="–"
                              disabled={isQrfSem1Saving}
                              className={cn(
                                "w-full text-right font-mono text-[11.5px] rounded px-1.5 py-0.5 placeholder-gray-300 border border-gray-200 bg-white focus:outline-none",
                                isQrfSem1Saving
                                  ? "text-gray-400 cursor-wait opacity-50"
                                  : "text-gray-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
                              )}
                              onFocus={() => handleAmountFocus(qrfSem1Key, sa.qrf_current_sem1)}
                              onChange={e => handleAmountChange(qrfSem1Key, e.target.value)}
                              onBlur={async () => {
                                if (!current_plan_id) return;
                                if (editingValues[qrfSem1Key] === undefined) return;
                                const raw = editingValues[qrfSem1Key];
                                setEditingValues(prev => { const n = { ...prev }; delete n[qrfSem1Key]; return n; });
                                const value = parseInput(raw);
                                if (value === Math.floor(sa.qrf_current_sem1)) return;
                                setSavingKeys(prev => new Set(prev).add(qrfSem1Key));
                                const promise = (async () => {
                                  await API.patch(`/ldrrmfip/upsert-year-amounts`, {
                                    budget_plan_id: current_plan_id,
                                    source:         sa.source,
                                    description:    '__QRF_30__',
                                    sem1_amount:    value,
                                  });
                                  const res = await API.get("/ldrrmf-plan");
                                  setReport(res.data.data ?? null);
                                })();
                                toast.promise(promise, {
                                  loading: "Saving…",
                                  success: "QRF Sem 1 saved",
                                  error:   "Failed to save QRF Sem 1.",
                                });
                                try { await promise; } catch { /* handled */ } finally {
                                  setSavingKeys(prev => { const n = new Set(prev); n.delete(qrfSem1Key); return n; });
                                }
                              }}
                            />
                          </td>

                          {/* Current sem2 — read-only, calculated */}
                          <td className="px-3 py-2 border-r border-blue-100 text-right font-mono tabular-nums text-[11.5px] text-gray-500 bg-blue-50/20">
                            {qrfSem2Live > 0 ? qrfSem2Live.toLocaleString("en-PH") : "–"}
                          </td>

                          {/* Current total — read-only */}
                          <td className="px-3 py-2 border-r border-blue-100 text-right font-mono tabular-nums text-[12px] font-bold text-blue-700 bg-blue-50/40">
                            {qrfTotalLive > 0 ? Math.floor(qrfTotalLive).toLocaleString("en-PH") : "–"}
                          </td>

                          {/* Budget year — always derived, read-only */}
                          <td className="px-3 py-3 border-r border-l border-orange-100 text-right font-mono tabular-nums text-[12px] font-bold text-blue-700 bg-orange-50/40">
                            {fmtPeso(sa.budget_year.qrf_30)}
                          </td>
                        </tr>
                      );
                    })()}

                    {/* ── 70% Preparedness section label ────────────────── */}
                    <tr className="bg-gray-50/60">
                      <td colSpan={7} className="px-4 py-1.5 border-b border-gray-100">
                        <div className="flex items-center gap-2">
                          <span className="text-[11.5px] font-semibold text-gray-900">
                            70% Disaster Preparedness
                          </span>
                          <span className="text-[9.5px] text-blue-400 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 font-semibold">
                            derived
                          </span>
                          <MatchBadge
                            derived={sa.budget_year.preparedness_70}
                            calculated={itemsTotal}
                            label="70% of 5% calamity fund"
                          />
                        </div>
                      </td>
                    </tr>

                    {/* ── 70% line items ────────────────────────────────── */}
                    {sa.items.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-8 py-4 text-gray-400 text-[12px] italic border-b border-gray-100">
                          No items entered yet. Add items in the LDRRMFIP page.
                        </td>
                      </tr>
                    ) : (
                      sa.items.map((item) => {
                        const sem1Key      = `${sa.source}-${item.ldrrmfip_item_id}`;
                        const obligKey     = `oblig-${sa.source}-${item.ldrrmfip_item_id}`;
                        const isObligSaving = savingKeys.has(obligKey);
                        const obligDisplay  = editingValues[obligKey] !== undefined
                        ? editingValues[obligKey]
                        : fmtInput(item.obligation_amount);
                        const isSaving = savingKeys.has(sem1Key);
                        const sem1Display = editingValues[sem1Key] !== undefined
                          ? editingValues[sem1Key]
                          : fmtInput(item.sem1_amount);
                        const sem2Computed = Math.max(0, Math.floor(item.total_amount - item.sem1_amount));
                        return (
                          <tr key={item.ldrrmfip_item_id} className="hover:bg-gray-50/40 transition-colors group/item">
                            <td className="px-4 py-2 border-r border-gray-100 text-[12px] text-gray-700 pl-8">
                              <span className="text-gray-300 mr-1.5">·</span>
                              {item.description}
                            </td>
                            <td className="px-3 py-2 border-r border-gray-100 text-center text-gray-300">—</td>

                            {/* Past Year — obligation_amount (editable) */}
                            <td className="px-1.5 py-1.5 border-r border-l border-green-100 bg-green-50/30">
                            <input
                                type="text"
                                inputMode="numeric"
                                value={obligDisplay}
                                placeholder="–"
                                disabled={isObligSaving}
                               className={cn(
  "w-full text-right font-mono text-[11.5px] rounded px-1.5 py-0.5 placeholder-gray-300 border border-gray-200 bg-white focus:outline-none",
  isObligSaving
    ? "text-gray-400 cursor-wait opacity-50"
    : "text-gray-700 focus:ring-2 focus:ring-green-300 focus:border-green-300"
)}
                                onFocus={() => handleAmountFocus(obligKey, item.obligation_amount)}
onChange={e => handleAmountChange(obligKey, e.target.value)}
onBlur={async () => {
  if (!past_plan_id) return;
  if (editingValues[obligKey] === undefined) return;
  const raw = editingValues[obligKey];
  setEditingValues(prev => { const n = { ...prev }; delete n[obligKey]; return n; });
  const value = parseInput(raw);
  if (value === Math.floor(item.obligation_amount)) return;
  setSavingKeys(prev => new Set(prev).add(obligKey));
  const promise = (async () => {
    await API.patch(`/ldrrmfip/upsert-year-amounts`, {
      budget_plan_id:    past_plan_id,
      source:            sa.source,
      description:       item.description,
      obligation_amount: value,
    });
    const res = await API.get("/ldrrmf-plan");
    setReport(res.data.data ?? null);
  })();
  toast.promise(promise, {
    loading: "Saving…",
    success: `${item.description} saved`,
    error:   "Failed to save obligation amount.",
  });
  try {
    await promise;
  } catch {
    /* handled by toast */
  } finally {
    setSavingKeys(prev => { const n = new Set(prev); n.delete(obligKey); return n; });
  }
}}
                            />
                            </td>

                            {/* Current sem1 — editable */}
                            <td className="px-1.5 py-1.5 border-r border-l border-blue-100 bg-blue-50/30">
                              <input
                                type="text"
                                value={sem1Display}
                                placeholder="–"
                                disabled={isSaving}
                                className={cn(
  "w-full text-right font-mono text-[11.5px] rounded px-1.5 py-0.5 placeholder-gray-300 border border-gray-200 bg-white focus:outline-none",
  isSaving
    ? "text-gray-400 cursor-wait opacity-50"
    : "text-gray-700 focus:ring-2 focus:ring-blue-300 focus:border-blue-300"
)}
                                inputMode="numeric"
                                onFocus={() => handleAmountFocus(sem1Key, item.sem1_amount)}
onChange={e => handleAmountChange(sem1Key, e.target.value)}
onBlur={() => handleSem1Blur(sem1Key, item, sa.source, current_plan_id)}
                              />
                            </td>

                            {/* Current sem2 — calculated (total - sem1), read-only */}
                            <td className="px-3 py-2 border-r border-blue-100 text-right font-mono tabular-nums text-[11.5px] text-gray-500 bg-blue-50/20">
                              {sem2Computed > 0 ? sem2Computed.toLocaleString("en-PH") : "–"}
                            </td>

                            {/* Current total — total_amount column */}
                            <td className="px-3 py-2 border-r border-blue-100 text-right font-mono tabular-nums text-[11.5px] font-semibold text-gray-700 bg-blue-50/30">
                              {item.total_amount > 0 ? Math.floor(item.total_amount).toLocaleString("en-PH") : "–"}
                            </td>

                            {/* Budget year — mooe + co */}
                            <td className="px-3 py-2 border-r border-l border-orange-100 text-right font-mono tabular-nums text-[12px] text-blue-600 bg-orange-50/30">
                              {item.total > 0
                                ? Math.floor(item.total).toLocaleString("en-PH")
                                : "–"
                              }
                            </td>
                          </tr>
                        );
                      })
                    )}

                    {/* ── 70% derived subtotal row ──────────────────────── */}
                    <tr className="bg-blue-50/20">
                      <td className="px-4 py-3 border-r border-gray-100 text-[12px]">
                        <span className="text-gray-900 font-semibold">Total 70% Preparedness</span>
                        <span className="ml-1.5 text-[9.5px] italic text-blue-400 font-normal">
                          from Income Fund
                        </span>
                      </td>
                      <td className="px-3 py-3 border-r border-gray-100 text-center text-gray-300">—</td>
                      {/* Past */}
                      <td className="px-3 py-3 border-r border-l border-green-100 text-right font-mono tabular-nums text-[12px] text-gray-800 bg-green-50/40">
                        {fmtPeso(sa.past.preparedness_70)}
                      </td>
                      {/* Current sem1 */}
                      <td className="px-3 py-3 border-r border-l border-blue-100 text-right font-mono tabular-nums text-[12px] text-gray-800 bg-blue-50/40">
                        {fmtAbs(sa.current.prep_70_sem1)}
                      </td>
                      {/* Current sem2 */}
                      <td className="px-3 py-3 border-r border-blue-100 text-right font-mono tabular-nums text-[12px] text-gray-800 bg-blue-50/40">
                        {fmtAbs(sa.current.prep_70_sem2)}
                      </td>
                      {/* Current total */}
                      <td className="px-3 py-3 border-r border-blue-100 text-right font-mono tabular-nums text-[12px] font-bold text-gray-800 bg-blue-50/40">
                        {fmtPeso(sa.current.prep_70_total)}
                      </td>
                      {/* Budget year — calculated (sum of items) */}
                      <td className="px-3 py-3 border-r border-l border-orange-100 text-right bg-orange-50/30">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-gray-800 font-bold font-mono tabular-nums text-[12px]">
                            {fmtPeso(sa.budget_year.preparedness_70)}
                          </span>
                          {!prep70Matched && (
                            <span className="text-gray-400 font-mono tabular-nums text-[10.5px]">
                              calc: {fmtPeso(itemsTotal)}
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Total 5% Calamity Fund row ───────────────────── */}
                    <tr className="border-t-2 border-gray-200 bg-gray-50">
                      <td className="px-4 py-3 border-r border-gray-200 text-[12px]">
                        <span className="font-bold text-gray-900">
                          Total 5% Calamity Fund
                        </span>
                        <span className="text-gray-500 font-normal"> — {sa.dept_name}</span>
                        <span className="ml-1.5 text-[9.5px] text-blue-400 bg-blue-50 border border-blue-200 rounded px-1 py-0.5 font-semibold align-middle">
                          derived
                        </span>
                        <MatchBadge
                          derived={sa.budget_year.total_5pct}
                          calculated={total5pctCalc}
                          label="5% of Total Available Resources"
                        />
                      </td>
                      <td className="px-3 py-3 border-r border-gray-200 text-center text-gray-300">—</td>
                      {/* Past */}
                      <td className="px-3 py-3 border-r border-l border-green-200 text-right font-mono tabular-nums text-[12px] font-bold text-blue-700 bg-green-100/50">
                        {fmtPeso(sa.past.total_5pct)}
                      </td>
                      {/* Current sem1 */}
                      <td className="px-3 py-3 border-r border-l border-blue-200 text-right font-mono tabular-nums text-[12px] font-bold text-blue-700 bg-blue-100/50">
                        {fmtAbs(sa.current.total_sem1)}
                      </td>
                      {/* Current sem2 */}
                      <td className="px-3 py-3 border-r border-blue-200 text-right font-mono tabular-nums text-[12px] font-bold text-blue-700 bg-blue-100/50">
                        {fmtAbs(sa.current.total_sem2)}
                      </td>
                      {/* Current total */}
                      <td className="px-3 py-3 border-r border-blue-200 text-right font-mono tabular-nums text-[12px] font-bold text-blue-700 bg-blue-100/50">
                        {fmtPeso(sa.current.total_5pct)}
                      </td>
                      {/* Budget year — derived + calc */}
                      <td className="px-3 py-3 border-r border-l border-orange-200 text-right bg-orange-100/50">
                        <div className="flex flex-col items-end gap-0.5">
                          <span className="text-blue-700 font-bold font-mono tabular-nums text-[12px]">
                            {fmtPeso(sa.budget_year.total_5pct)}
                          </span>

                        </div>
                      </td>
                    </tr>

                    {/* Spacer between sections */}
                    {saIdx < special_accounts.length - 1 && (
                      <tr>
                        <td colSpan={7} className="py-0.5 bg-white border-0" />
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>

            {/* ── Grand Total footer — mirrors Form5 dark footer ────────── */}
            <tfoot>
              <tr className="bg-gray-900 text-white">
                <td colSpan={2} className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500 border-l border-gray-700">
                  Grand Total 5% Calamity Fund — S.A.
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-green-300 border-l border-green-900/40 bg-green-950/20">
                  {fmtPeso(grand_total.past.total_5pct)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-blue-300 border-l border-blue-900/40 bg-blue-950/20">
                  {fmtPeso(grand_total.current.total_sem1)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-blue-300 border-l border-blue-900/40 bg-blue-950/20">
                  {fmtPeso(grand_total.current.total_sem2)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-blue-300 border-l border-blue-900/40 bg-blue-950/20">
                  {fmtPeso(grand_total.current.total_5pct)}
                </td>
                <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-orange-300 border-l border-orange-900/40 bg-orange-950/20">
                  {fmtPeso(grand_total.budget_year.total_5pct)}
                </td>
              </tr>
              {/* Footer note row — mirrors Form5 */}
              <tr className="bg-gray-900">
                <td colSpan={7} className="px-4 py-2 border-t border-gray-800">
                  <span className="flex items-center gap-1.5 text-[10.5px] text-gray-500">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-400 flex-none" />
                    All blue values are derived from each Special Account's Income Fund (Total Available Resources × 5%). Hover the matched/mismatch badges for details.
                  </span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />
          <span className="text-green-600 font-semibold">Green</span> = Past year (actual)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
          <span className="text-blue-600 font-semibold">Blue</span> = Current year (estimate)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
          <span className="text-orange-600 font-semibold">Orange</span> = Budget year
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-blue-600 inline-block" />
          <span className="text-blue-700 font-semibold">Blue text</span> = value derived from Income Fund
        </span>
        <span className="flex items-center gap-1.5">
          <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500" />
          <span className="text-emerald-600 font-semibold">matched</span> = derived equals items sum
        </span>
        <span className="flex items-center gap-1.5">
          <ExclamationTriangleIcon className="w-3.5 h-3.5 text-red-500" />
          <span className="text-red-600 font-semibold">mismatch</span> = discrepancy — hover for details
        </span>
      </div>
    </div>
  );
}
