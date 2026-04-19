// components/admin/PsComputation.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { LoadingState } from "@/src/pages/common/LoadingState";
import { Skeleton }     from "@/src/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PsManual {
  total_income: number;
  non_recurring_income: number;
  excess_amount: number;
}

interface PsTop {
  total_realized_income: number;
  ps_limitation: number;
  total_ps_gf: number;
  excess_amount: number;
  terminal_leave_gf: number;
  monetization_gf: number;
  total_waived: number;
  amount_allowable: number;
}

interface PsDetail {
  salaries_wages: number;
  retirement_insurance: number;
  pag_ibig: number;
  philhealth: number;
  ec_insurance: number;
  subtotal_b: number;
  pera: number;
  representation: number;
  transportation: number;
  clothing: number;
  magna_carta: number;
  hazard_pay: number;
  honoraria: number;
  overtime_pay: number;
  cash_gift: number;
  mid_year_bonus: number;
  year_end_bonus: number;
  terminal_leave: number;
  productivity_incentive: number;
  monetization: number;
  subtotal_c: number;
  total_ps: number;
}

interface PsResponse {
  budget_plan: { budget_plan_id: number; year: number };
  income_year: number;
  ps_computation_id: number;
  manual: PsManual;
  top: PsTop;
  detail: PsDetail;
}

// ─── Formatters ───────────────────────────────────────────────────────────────

const enPH = (v: number) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 })
    .format(Math.round(Math.abs(v)));

const fmtSigned = (v: number): string => {
  if (v === 0) return "–";
  return v < 0 ? `-${enPH(v)}` : enPH(v);
};

const fmtSignedPeso = (v: number): string => {
  if (v === 0) return "–";
  return v < 0 ? `-₱ ${enPH(v)}` : `₱ ${enPH(v)}`;
};

const parseNum = (s: string) => {
  const n = parseFloat(s.replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
};

const commaFmt = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-PH");
};

// ─── InlineInput ──────────────────────────────────────────────────────────────

function InlineInput({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [focused, setFocused] = useState(false);
  const [draft,   setDraft]   = useState("");
  const atFocus               = useRef(0);
  const display               = value === 0 ? "–" : enPH(value);

  return (
    <input
      type="text"
      inputMode="numeric"
      value={focused ? draft : display}
      placeholder="0"
      onFocus={() => {
        setFocused(true);
        atFocus.current = value;
        setDraft(value === 0 ? "" : String(value));
      }}
      onChange={(e) => setDraft(commaFmt(e.target.value))}
      onBlur={() => {
        setFocused(false);
        const n = parseNum(draft);
        if (n !== atFocus.current) onSave(n);
      }}
      className="text-right font-mono tabular-nums bg-transparent border-b-2 border-dashed
        border-gray-300 focus:outline-none focus:border-blue-400 transition-colors
        w-36 px-1 py-0.5 text-[12.5px] placeholder:text-gray-300"
    />
  );
}

// ─── Sidebar summary card ─────────────────────────────────────────────────────

function SummaryCard({
  label, value, sub, accent = "gray",
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "blue" | "green" | "red" | "gray";
}) {
  const styles: Record<string, string> = {
    blue:  "bg-blue-50  border-blue-200  text-blue-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red:   "bg-red-50   border-red-200   text-red-700",
    gray:  "bg-gray-50  border-gray-200  text-gray-700",
  };
  return (
    <div className={cn("rounded-xl border px-4 py-3", styles[accent])}>
      <p className="text-[10px] font-bold uppercase tracking-widest opacity-60 mb-0.5">{label}</p>
      <p className="font-mono tabular-nums font-bold text-[15px] leading-tight">{value}</p>
      {sub && <p className="text-[10px] opacity-50 mt-0.5">{sub}</p>}
    </div>
  );
}

// ---------------------------------SKELETON ----------------------------------

// ─── PS Computation Skeleton ──────────────────────────────────────────────────
// Mirrors the 2-column layout: big computation table LEFT + sidebar cards RIGHT

function PsSkeleton() {
  return (
    <div className="flex gap-5 items-start">

      {/* ── Computation table ─────────────────────────────────────────── */}
      <div className="flex-1 min-w-0">
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse">
            <tbody>

              {/* Section header — dark */}
              <tr className="bg-slate-800">
                <td colSpan={2} className="py-2 px-3">
                  <Skeleton className="h-3 w-48 rounded bg-slate-600" />
                </td>
              </tr>

              {/* Editable rows — blue dashed underline style */}
              {[0,1].map(i => (
                <tr key={i} className="border-b border-gray-100">
                  <td className="py-3 px-4">
                    <Skeleton className={cn("h-3 rounded", i === 0 ? "w-4/5" : "w-2/3")} />
                  </td>
                  <td className="py-3 px-3 w-40">
                    <Skeleton className="h-5 w-32 ml-auto rounded border-b-2 border-dashed border-gray-200 bg-transparent" />
                  </td>
                </tr>
              ))}

              {/* Computed / derived rows */}
              {Array.from({ length: 8 }).map((_, ri) => (
                <tr key={ri} className={cn("border-b border-gray-100", ri === 3 && "bg-gray-50")}>
                  <td className="py-2.5 px-4" style={{ paddingLeft: `${14 + (ri % 3) * 14}px` }}>
                    <Skeleton className={cn("h-3 rounded", ri % 3 === 0 ? "w-3/4" : ri % 3 === 1 ? "w-1/2" : "w-2/3")} />
                  </td>
                  <td className="py-2.5 px-3 w-40">
                    <Skeleton className={cn("h-3 rounded ml-auto bg-blue-100", ri % 2 === 0 ? "w-24" : "w-20")} />
                  </td>
                </tr>
              ))}

              {/* Amount Allowable — hero row */}
              <tr className="border-t-2 border-gray-200 bg-emerald-50">
                <td className="py-2.5 px-3">
                  <Skeleton className="h-3 w-32 rounded" />
                </td>
                <td className="py-2.5 px-3 w-40">
                  <Skeleton className="h-4 w-28 ml-auto rounded bg-emerald-200" />
                </td>
              </tr>

              {/* Section header 2 */}
              <tr className="bg-slate-800 mt-2">
                <td colSpan={2} className="py-2 px-3">
                  <Skeleton className="h-3 w-64 rounded bg-slate-600" />
                </td>
              </tr>

              {/* Sub-header */}
              <tr className="bg-slate-100 border-b border-slate-200">
                <td colSpan={2} className="py-1.5 px-3">
                  <Skeleton className="h-3 w-48 rounded bg-slate-300" />
                </td>
              </tr>

              {/* Detail rows */}
              {Array.from({ length: 12 }).map((_, ri) => (
                <tr key={ri} className="border-b border-gray-100">
                  <td className="py-2 px-4" style={{ paddingLeft: `${28 + (ri % 2) * 14}px` }}>
                    <Skeleton className={cn("h-3 rounded", ri % 4 === 0 ? "w-4/5" : ri % 4 === 1 ? "w-2/3" : ri % 4 === 2 ? "w-3/4" : "w-1/2")} />
                  </td>
                  <td className="py-2 px-3 w-40">
                    <Skeleton className={cn("h-3 rounded ml-auto bg-blue-100", ri % 3 === 0 ? "w-20" : "w-16")} />
                  </td>
                </tr>
              ))}

              {/* Total PS — dark footer */}
              <tr className="bg-slate-800">
                <td className="py-3 px-5">
                  <Skeleton className="h-3 w-40 rounded bg-slate-600" />
                </td>
                <td className="py-3 px-3 w-40">
                  <Skeleton className="h-4 w-24 ml-auto rounded bg-slate-600" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Sidebar ───────────────────────────────────────────────────── */}
      <div className="w-64 flex-none sticky top-5 space-y-3">
        {/* Hero allowable card */}
        <div className="rounded-2xl border-2 border-emerald-300 bg-emerald-50 px-5 py-4">
          <Skeleton className="h-2.5 w-32 rounded mb-2 bg-emerald-200" />
          <Skeleton className="h-6 w-36 rounded bg-emerald-200" />
          <Skeleton className="h-2.5 w-28 rounded mt-2 bg-emerald-100" />
        </div>
        {/* Status pill */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 flex items-center gap-2">
          <Skeleton className="w-2 h-2 rounded-full flex-none bg-emerald-300" />
          <Skeleton className="h-3 w-28 rounded bg-emerald-200" />
        </div>
        {/* Utilisation bar */}
        <div className="bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <Skeleton className="h-2.5 w-24 rounded" />
            <Skeleton className="h-3 w-8 rounded" />
          </div>
          <Skeleton className="h-1.5 w-full rounded-full bg-gray-100" />
          <div className="mt-1.5 flex justify-between">
            <Skeleton className="h-2.5 w-20 rounded" />
            <Skeleton className="h-2.5 w-20 rounded" />
          </div>
        </div>
        {/* Summary cards */}
        {["bg-blue-50 border-blue-200","bg-gray-50 border-gray-200","bg-gray-50 border-gray-200"].map((cls, i) => (
          <div key={i} className={cn("rounded-xl border px-4 py-3", cls)}>
            <Skeleton className={cn("h-2.5 w-20 rounded mb-2", cls.includes("blue") ? "bg-blue-200" : "bg-gray-200")} />
            <Skeleton className={cn("h-5 w-28 rounded", cls.includes("blue") ? "bg-blue-200" : "bg-gray-200")} />
            <Skeleton className={cn("h-2.5 w-36 rounded mt-1.5", cls.includes("blue") ? "bg-blue-100" : "bg-gray-100")} />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PsComputation() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

  const [data,    setData]    = useState<PsResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const [totalIncome,  setTotalIncome]  = useState(0);
  const [nonRecurring, setNonRecurring] = useState(0);
  const [excessAmount, setExcessAmount] = useState(0);

  const savedRef     = useRef({ total_income: 0, non_recurring_income: 0, excess_amount: 0 });
  const activePlanId = activePlan?.budget_plan_id ?? null;

  const fetchData = useCallback(async () => {
    if (!activePlanId) return;
    setLoading(true);
    try {
      const res = await API.get<PsResponse>(`/ps-computation?budget_plan_id=${activePlanId}`);
      const d = res.data;
      setData(d);
      setTotalIncome(d.manual.total_income);
      setNonRecurring(d.manual.non_recurring_income);
      setExcessAmount(d.manual.excess_amount);
      savedRef.current = { ...d.manual };
    } catch {
      toast.error("Failed to load PS computation data.");
    } finally {
      setLoading(false);
    }
  }, [activePlanId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const save = useCallback((
    patch: Partial<{ total_income: number; non_recurring_income: number; excess_amount: number }>
  ) => {
    if (!activePlanId) return;
    const payload = {
      budget_plan_id:       activePlanId,
      total_income:         patch.total_income         ?? totalIncome,
      non_recurring_income: patch.non_recurring_income ?? nonRecurring,
      excess_amount:        patch.excess_amount        ?? excessAmount,
    };
    const promise = API.post("/ps-computation/save", payload).then(() => {
      savedRef.current = {
        total_income:         payload.total_income,
        non_recurring_income: payload.non_recurring_income,
        excess_amount:        payload.excess_amount,
      };
      fetchData();
    });
    toast.promise(promise, { loading: "Saving…", success: "Saved", error: "Save failed" });
  }, [activePlanId, totalIncome, nonRecurring, excessAmount, fetchData]);

  // ── Guards ────────────────────────────────────────────────────────────────

  if (planLoading) return <LoadingState />;

  if (!activePlan) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <p className="text-gray-500 text-sm">No active budget plan found.</p>
        <p className="text-gray-400 text-xs">Activate a budget plan to view PS computation.</p>
      </div>
    </div>
  );

  const year    = data?.budget_plan.year ?? activePlan.year;
  const incYear = data?.income_year      ?? ((activePlan.year as number) - 2);
  const top     = data?.top;
  const detail  = data?.detail;

  // ── Live computations ─────────────────────────────────────────────────────
  const liveRealized    = totalIncome - nonRecurring;
  const liveLimitation  = liveRealized * 0.45;
  const liveTotalPs     = top?.total_ps_gf ?? 0;
  const terminalLeaveGF = top?.terminal_leave_gf ?? 0;
  const monetizationGF  = top?.monetization_gf  ?? 0;
  const liveWaived      = terminalLeaveGF + monetizationGF;
  const liveAllowable   = liveLimitation - liveWaived;
  const utilisationPct  = liveLimitation > 0
    ? Math.round((liveTotalPs / liveLimitation) * 100)
    : 0;

  // ── Table row helpers ─────────────────────────────────────────────────────

  const DerivedRow = ({ label, value, indent = 0, peso = false }: {
    label: React.ReactNode; value: number; indent?: number; peso?: boolean;
  }) => (
    <tr className="border-b border-gray-100 hover:bg-gray-50/40 transition-colors">
      <td className="py-[7px] pr-3 text-[12.5px] text-gray-700 leading-snug"
          style={{ paddingLeft: `${(indent + 1) * 14}px` }}>{label}</td>
      <td className="py-[7px] px-3 text-right font-mono tabular-nums text-[12.5px] w-40">
        <span className={value < 0 ? "text-red-500" : "text-blue-600"}>
          {peso ? fmtSignedPeso(value) : fmtSigned(value)}
        </span>
      </td>
    </tr>
  );

  const ComputedRow = ({ label, value, indent = 0, bold = false, peso = false }: {
    label: React.ReactNode; value: number; indent?: number; bold?: boolean; peso?: boolean;
  }) => (
    <tr className={cn("border-b border-gray-100", bold && "bg-gray-50")}>
      <td className={cn("py-[7px] pr-3 text-[12.5px] leading-snug", bold ? "font-semibold text-gray-900" : "text-gray-700")}
          style={{ paddingLeft: `${(indent + 1) * 14}px` }}>{label}</td>
      <td className="py-[7px] px-3 text-right font-mono tabular-nums text-[12.5px] w-40">
        <span className={cn(value < 0 ? "text-red-500" : bold ? "font-semibold text-gray-900" : "text-gray-600")}>
          {peso ? fmtSignedPeso(value) : fmtSigned(value)}
        </span>
      </td>
    </tr>
  );

  const LabelRow = ({ label, indent = 0 }: { label: React.ReactNode; indent?: number }) => (
    <tr className="border-b border-gray-100">
      <td className="py-1.5 text-[12.5px] text-gray-500 italic"
          style={{ paddingLeft: `${(indent + 1) * 14}px` }}>{label}</td>
      <td />
    </tr>
  );

  const AllowableRow = ({ value }: { value: number }) => {
    const isNeg = value < 0;
    return (
      <tr className={cn("border-t-2 border-gray-200", isNeg ? "bg-red-50" : "bg-emerald-50")}>
        <td className={cn("py-2.5 px-3 text-[12.5px] font-bold", isNeg ? "text-red-700" : "text-gray-900")}>
          Amount Allowable
        </td>
        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[13px] w-40">
          <span className={isNeg ? "text-red-600" : "text-gray-900"}>{fmtSignedPeso(value)}</span>
        </td>
      </tr>
    );
  };

  const InputRow = ({ label, value, onSave, indent = 0 }: {
    label: React.ReactNode; value: number; onSave: (v: number) => void; indent?: number;
  }) => (
    <tr className="border-b border-gray-100 group hover:bg-blue-50/20 transition-colors">
      <td className="py-1 pr-3 text-[12.5px] text-gray-700 leading-snug"
          style={{ paddingLeft: `${(indent + 1) * 14}px` }}>
        <span className="flex items-center gap-1.5">
          {label}
          <span className="text-[9px] text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity
            bg-blue-50 border border-blue-200 rounded px-1 py-0.5 whitespace-nowrap">
            click to edit
          </span>
        </span>
      </td>
      <td className="py-1 px-3 text-right w-40">
        <InlineInput value={value} onSave={onSave} />
      </td>
    </tr>
  );

  const SectionHeader = ({ children }: { children: React.ReactNode }) => (
    <tr className="bg-slate-800">
      <td colSpan={2} className="py-2 px-3 text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-300">
        {children}
      </td>
    </tr>
  );

  const SubHeader = ({ children }: { children: React.ReactNode }) => (
    <tr className="bg-slate-100 border-b border-slate-200">
      <td colSpan={2} className="py-1.5 px-3 text-[11px] font-bold uppercase tracking-wide text-slate-500">
        {children}
      </td>
    </tr>
  );

  const Divider = () => (
    <tr><td colSpan={2} className="h-px bg-gray-100" /></tr>
  );

  // ─────────────────────────────────────────────────────────────────────────

  return (
    /* Full-width landscape container — no max-width cap */
    <div className="p-5 h-full">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="mb-4 flex items-end justify-between">
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">
              Personnel Services
            </span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] font-medium text-gray-400">Budget Year {year}</span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] text-gray-400">Municipality of Opol, Misamis Oriental</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">PS Computation</h1>
        </div>

        {/* Inline legend */}
        <div className="flex items-center gap-4 text-[10.5px] text-gray-400 pb-0.5">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-sm bg-white border-b-2 border-dashed border-blue-300 inline-block" />
            Editable
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
            <span className="text-blue-500">Derived</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-gray-400 inline-block" />
            Computed
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-red-400 inline-block" />
            <span className="text-red-400">Negative</span>
          </span>
        </div>
      </div>

      {loading ? (
         <PsSkeleton />
      ) : (
        /* ── Landscape: table LEFT, sidebar RIGHT ───────────────────────── */
        <div className="flex gap-5 items-start h-full">

          {/* ── Computation table ─────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full border-collapse">
                <colgroup>
                  <col />
                  <col style={{ width: "160px" }} />
                </colgroup>
                <tbody>

                  <SectionHeader>Income &amp; PS Limitation</SectionHeader>

                  <InputRow
                    label={<>Total Income from sources realized from next preceding year <span className="font-semibold text-gray-900">{incYear}</span></>}
                    value={totalIncome}
                    onSave={(v) => { setTotalIncome(v); save({ total_income: v }); }}
                  />
                  <Divider />
                  <InputRow
                    label="Less : Non-Recurring Income"
                    value={nonRecurring}
                    onSave={(v) => { setNonRecurring(v); save({ non_recurring_income: v }); }}
                  />
                  <ComputedRow
                    label={<>Total Realized Regular Income from next preceding year <span className="font-semibold">({incYear})</span></>}
                    value={liveRealized}
                    bold
                  />
                  <Divider />
                  <ComputedRow label="Less : Personnel Services Limitation (45%)" value={liveLimitation} />
                  <DerivedRow  label={`Total Personnel Services for ${year} - GF`} value={liveTotalPs} />
                  <InputRow
                    label="Excess Amount"
                    value={excessAmount}
                    onSave={(v) => { setExcessAmount(v); save({ excess_amount: v }); }}
                  />
                  <Divider />
                  <LabelRow label="Add: Waived Items" />
                  <DerivedRow  label="Terminal Leave - GF" value={terminalLeaveGF} indent={1} />
                  <DerivedRow  label="Monetization - GF"   value={monetizationGF}  indent={1} />
                  <ComputedRow label="Total Waived Items"   value={liveWaived} bold />
                  <Divider />
                  <AllowableRow value={liveAllowable} />
                  <Divider />
                  <Divider />

                  <SectionHeader>Personnel Services for Existing Plantilla Position</SectionHeader>

                  <SubHeader>A. Salaries / Wages of Current Personnel</SubHeader>
                  <DerivedRow label="Salaries and Wages - Regular" value={detail?.salaries_wages ?? 0} indent={1} peso />
                  <Divider />

                  <SubHeader>B. Statutory &amp; Contractual Obligations</SubHeader>
                  <DerivedRow  label="Retirement &amp; Life Insurance Premiums"  value={detail?.retirement_insurance ?? 0} indent={2} />
                  <DerivedRow  label="Pag-IBIG Contributions"                    value={detail?.pag_ibig             ?? 0} indent={2} />
                  <DerivedRow  label="PhilHealth Contributions"                  value={detail?.philhealth           ?? 0} indent={2} />
                  <DerivedRow  label="Employees Compensation Insurance Premiums" value={detail?.ec_insurance         ?? 0} indent={2} />
                  <ComputedRow label="Sub Total"                                 value={detail?.subtotal_b ?? 0} bold indent={2} peso />
                  <Divider />

                  <SubHeader>C. Existing Allowances &amp; Benefits of Regular Employees</SubHeader>
                  <DerivedRow  label="PERA"                                           value={detail?.pera                  ?? 0} indent={2} peso />
                  <DerivedRow  label="Representation Allowance"                       value={detail?.representation        ?? 0} indent={2} />
                  <DerivedRow  label="Transportation Allowance"                       value={detail?.transportation        ?? 0} indent={2} />
                  <DerivedRow  label="Clothing/Uniform Allowance"                     value={detail?.clothing              ?? 0} indent={2} />
                  <DerivedRow  label="Magna Carta Benefits for Public Health Workers"  value={detail?.magna_carta           ?? 0} indent={2} />
                  <DerivedRow  label="Hazard Pay"                                     value={detail?.hazard_pay            ?? 0} indent={2} />
                  <DerivedRow  label="Honoraria"                                      value={detail?.honoraria             ?? 0} indent={2} />
                  <DerivedRow  label="Overtime Pay"                                   value={detail?.overtime_pay          ?? 0} indent={2} />
                  <DerivedRow  label="Cash Gift"                                      value={detail?.cash_gift             ?? 0} indent={2} />
                  <LabelRow label="Bonus" indent={2} />
                  <DerivedRow  label="Mid-Year Bonus"                       value={detail?.mid_year_bonus        ?? 0} indent={3} />
                  <DerivedRow  label="Year-End Bonus"                       value={detail?.year_end_bonus        ?? 0} indent={3} />
                  <DerivedRow  label="Terminal Leave"                       value={detail?.terminal_leave        ?? 0} indent={2} />
                  <DerivedRow  label="Productivity Enhancement Incentive"   value={detail?.productivity_incentive ?? 0} indent={2} />
                  <DerivedRow  label="Other Benefits (Monetization)"        value={detail?.monetization          ?? 0} indent={2} />
                  <ComputedRow label="Sub Total"                            value={detail?.subtotal_c ?? 0} bold indent={2} peso />
                  <Divider />

                  <tr className="bg-slate-800">
                    <td className="py-3 px-5 text-[11.5px] font-bold uppercase tracking-widest text-slate-300">
                      Total Personnel Services for {year}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums font-bold text-[13px] w-40">
                      <span className={detail && detail.total_ps < 0 ? "text-red-400" : "text-white"}>
                        {detail ? fmtSignedPeso(detail.total_ps) : "–"}
                      </span>
                    </td>
                  </tr>

                </tbody>
              </table>
            </div>
          </div>

          {/* ── Sticky sidebar ────────────────────────────────────────── */}
          <div className="w-64 flex-none sticky top-5 space-y-3">

            {/* Amount Allowable — hero */}
            <div className={cn(
              "rounded-2xl border-2 px-5 py-4 shadow-sm",
              liveAllowable < 0 ? "bg-red-50 border-red-300" : "bg-emerald-50 border-emerald-300"
            )}>
              <p className="text-[9.5px] font-bold uppercase tracking-[0.16em] text-gray-500 mb-1">
                Amount Allowable
              </p>
              <p className={cn(
                "font-mono font-bold tabular-nums leading-none",
                liveAllowable < 0 ? "text-red-600 text-xl" : "text-emerald-700 text-xl"
              )}>
                {fmtSignedPeso(liveAllowable)}
              </p>
              <p className="text-[10px] text-gray-400 mt-1.5">
                PS Limitation − Waived Items
              </p>
            </div>

            {/* Status pill */}
            <div className={cn(
              "rounded-xl border px-4 py-2.5 flex items-center gap-2",
              liveAllowable < 0 ? "bg-red-50 border-red-200" : "bg-emerald-50 border-emerald-200"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full flex-none",
                liveAllowable < 0 ? "bg-red-500" : "bg-emerald-500"
              )} />
              <span className={cn(
                "text-[11px] font-semibold",
                liveAllowable < 0 ? "text-red-700" : "text-emerald-700"
              )}>
                {liveAllowable < 0 ? "Exceeds PS Limit" : "Within PS Limit"}
              </span>
            </div>

            {/* PS Utilisation bar */}
            <div className="bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-500">
                  PS Utilisation
                </p>
                <span className={cn(
                  "text-[12px] font-bold font-mono",
                  utilisationPct > 100 ? "text-red-600"
                  : utilisationPct >= 80 ? "text-amber-600"
                  : "text-gray-800"
                )}>
                  {utilisationPct}%
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-700",
                    utilisationPct > 100 ? "bg-red-500"
                    : utilisationPct >= 80 ? "bg-amber-400"
                    : "bg-blue-500"
                  )}
                  style={{ width: `${Math.min(utilisationPct, 100)}%` }}
                />
              </div>
              <div className="mt-1.5 flex justify-between text-[10px] text-gray-400">
                <span>{fmtSignedPeso(liveTotalPs)}</span>
                <span>of {fmtSignedPeso(liveLimitation)}</span>
              </div>
            </div>

            {/* Key figures */}
            <SummaryCard
              label="Total PS"
              value={fmtSignedPeso(liveTotalPs)}
              sub="Derived from dept budget plans"
              accent="blue"
            />
            <SummaryCard
              label="PS Limitation (45%)"
              value={fmtSignedPeso(liveLimitation)}
              sub={`Based on ${incYear} realized income`}
              accent="gray"
            />
            <SummaryCard
              label="Total Waived Items"
              value={fmtSignedPeso(liveWaived)}
              sub="Terminal Leave + Monetization"
              accent="gray"
            />

          </div>
        </div>
      )}
    </div>
  );
}
