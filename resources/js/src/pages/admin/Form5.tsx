
import { useEffect, useState, useCallback, useRef } from "react";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { LoadingState } from "@/src/pages/common/LoadingState";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/src/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { MoreHorizontalIcon } from "lucide-react";
import { PlusIcon, CheckIcon } from "@heroicons/react/24/outline";

// ─── Column color tokens ──────────────────────────────────────────────────────
// Previous Payments Made → green
// Amount Due             → orange

const C_PREV_TH  = "bg-green-50  border-green-200  text-green-700";
const C_PREV_TD  = "bg-green-50/30  border-green-100";
const C_PREV_NUM = "text-green-400";
const C_PREV_GT  = "bg-green-950/20 border-green-900/40 text-green-300";

const C_DUE_TH   = "bg-orange-50 border-orange-200 text-orange-700";
const C_DUE_TD   = "bg-orange-50/30 border-orange-100";
const C_DUE_NUM  = "text-orange-400";
const C_DUE_GT   = "bg-orange-950/20 border-orange-900/40 text-orange-300";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DebtObligation {
  obligation_id: number;
  creditor: string;
  date_contracted: string;
  term: string;
  principal_amount: number;
  purpose: string;
  previous_principal: number;
  previous_interest: number;
  previous_total: number;
  current_principal: number;
  current_interest: number;
  current_total: number;
  balance_principal: number;
  payment_id: number | null;
  is_active: boolean;
  sort_order: number;
}

interface ObligationForm {
  creditor: string;
  date_contracted: string;
  term: string;
  principal_amount: string;
  purpose: string;
}

const EMPTY_FORM: ObligationForm = {
  creditor: "", date_contracted: "", term: "", principal_amount: "", purpose: "",
};

// ─── Number helpers ───────────────────────────────────────────────────────────

const fmt = (v: number | null | undefined): string => {
  if (v === null || v === undefined || v === 0) return "–";
  return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));
};

const fmtAlways = (v: number): string =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));

const parseFormatted = (s: string): number => {
  const n = parseFloat(s.replace(/,/g, "").trim());
  return isNaN(n) ? 0 : n;
};

const formatWhileTyping = (raw: string): string => {
  let cleaned = raw.replace(/[^\d.]/g, "");
  const dotIdx = cleaned.indexOf(".");
  if (dotIdx !== -1) cleaned = cleaned.slice(0, dotIdx + 1) + cleaned.slice(dotIdx + 1).replace(/\./g, "");
  if (cleaned === "" || cleaned === ".") return cleaned;
  const [intPart, decPart] = cleaned.split(".");
  const formattedInt = intPart ? parseInt(intPart, 10).toLocaleString("en-PH") : "0";
  return decPart !== undefined ? `${formattedInt}.${decPart}` : formattedInt;
};

const formatOnBlur = (raw: string): string => {
  const n = parseFormatted(raw);
  if (n === 0) return "";
  return new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));
};

const seedDisplay = (v: number): string =>
  v === 0 ? "" : new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));

// ─── Table Skeleton ───────────────────────────────────────────────────────────
// Mirrors the 14-column layout of the real table:
// # | Creditor | Date | Term | Principal | Purpose | Prev×3 | Due×3 | Balance | Actions

function TableSkeleton({ budgetYear }: { budgetYear: number }) {
  const thStatic = "border-b border-r border-gray-200 bg-white px-3 py-2.5 align-bottom text-[11px] uppercase tracking-wide";
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse min-w-[1500px]">
          <thead>
            {/* Row 1 — group headers */}
            <tr>
              <th rowSpan={3} className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-center w-8 align-middle text-[11px] font-medium text-gray-400">#</th>
              <th rowSpan={2} className={cn(thStatic, "text-left w-44")}><Skeleton className="h-3 w-14 rounded" /></th>
              <th rowSpan={2} className={cn(thStatic, "text-center w-24")}><Skeleton className="h-3 w-12 mx-auto rounded" /></th>
              <th rowSpan={2} className={cn(thStatic, "text-left w-52")}><Skeleton className="h-3 w-8 rounded" /></th>
              <th rowSpan={2} className={cn(thStatic, "text-right w-32")}><Skeleton className="h-3 w-16 ml-auto rounded" /></th>
              <th rowSpan={2} className={cn(thStatic, "text-left w-40")}><Skeleton className="h-3 w-14 rounded" /></th>
              <th colSpan={3} className={cn("border-b border-r border-l px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest", C_PREV_TH)}>
                Previous Payments Made
              </th>
              <th colSpan={3} className={cn("border-b border-r border-l px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest", C_DUE_TH)}>
                Amount Due — {budgetYear}
              </th>
              <th rowSpan={2} className={cn(thStatic, "text-right w-32 border-l")}><Skeleton className="h-3 w-14 ml-auto rounded" /></th>
              <th rowSpan={3} className="border-b border-gray-200 bg-white px-2 py-2 text-center w-12 align-middle" />
            </tr>
            {/* Row 2 — sub-headers */}
            <tr>
              <th className={cn("border-b border-r border-l px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_PREV_TH)}>Principal</th>
              <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_PREV_TH)}>Interest</th>
              <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_PREV_TH)}>Total</th>
              <th className={cn("border-b border-r border-l px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-32", C_DUE_TH)}>Principal</th>
              <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-32", C_DUE_TH)}>Interest</th>
              <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_DUE_TH)}>Total</th>
            </tr>
            {/* Row 3 — column numbers */}
            <tr className="border-b-2 border-gray-200">
              {["(1)","(2)","(3)","(4)","(5)"].map((n, i) => (
                <td key={i} className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">{n}</td>
              ))}
              {["(6)","(7)","(8)"].map((n, i) => (
                <td key={i} className={cn("border-r px-3 py-1 text-center text-[10px]", i === 0 && "border-l", "bg-green-50 border-green-200 text-green-300")}>{n}</td>
              ))}
              {["(9)","(10)","(11)"].map((n, i) => (
                <td key={i} className={cn("border-r px-3 py-1 text-center text-[10px]", i === 0 && "border-l", "bg-orange-50 border-orange-200 text-orange-300")}>{n}</td>
              ))}
              <td className="border-r border-l border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(12)</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 4 }).map((_, ri) => (
              <tr key={ri} className={ri % 2 === 1 ? "bg-gray-50/30" : ""}>
                {/* # */}
                <td className="border-r border-gray-100 px-3 py-3 text-center align-top">
                  <Skeleton className="h-3 w-4 mx-auto rounded" />
                </td>
                {/* Creditor */}
                <td className="border-r border-gray-100 px-3 py-3 align-top">
                  <Skeleton className={cn("h-3 rounded mb-1.5", ri % 3 === 0 ? "w-4/5" : "w-full")} />
                  <Skeleton className="h-3 w-3/5 rounded" />
                </td>
                {/* Date */}
                <td className="border-r border-gray-100 px-3 py-3 align-top">
                  <Skeleton className="h-3 w-14 mx-auto rounded" />
                </td>
                {/* Term */}
                <td className="border-r border-gray-100 px-3 py-3 align-top">
                  <Skeleton className={cn("h-3 rounded mb-1.5", ri % 2 === 0 ? "w-full" : "w-4/5")} />
                  <Skeleton className="h-3 w-3/5 rounded" />
                </td>
                {/* Principal Amount */}
                <td className="border-r border-gray-100 px-3 py-3 align-top flex justify-end">
                  <Skeleton className="h-3 w-20 rounded" />
                </td>
                {/* Purpose */}
                <td className="border-r border-gray-100 px-3 py-3 align-top">
                  <Skeleton className={cn("h-3 rounded", ri % 3 === 1 ? "w-4/5" : "w-full")} />
                </td>
                {/* Previous ×3 — green tint */}
                {[0,1,2].map(ci => (
                  <td key={ci} className={cn("border-r px-3 py-3 align-top", ci === 0 && "border-l", C_PREV_TD)}>
                    <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-12", "bg-green-100")} />
                  </td>
                ))}
                {/* Amount Due ×3 — orange tint, input-shaped */}
                {[0,1,2].map(ci => (
                  <td key={ci} className={cn("border-r px-2 py-2 align-top", ci === 0 && "border-l", C_DUE_TD)}>
                    <Skeleton className="h-8 w-full rounded-md bg-orange-100" />
                  </td>
                ))}
                {/* Balance */}
                <td className="border-r border-l border-gray-100 px-3 py-3 align-top">
                  <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 0 ? "w-20" : "w-16")} />
                </td>
                {/* Actions */}
                <td className="px-2 py-3 align-top">
                  <Skeleton className="h-7 w-7 rounded-md" />
                </td>
              </tr>
            ))}
          </tbody>
          {/* Footer skeleton */}
          <tfoot>
            <tr className="bg-gray-900">
              <td colSpan={4} className="px-3 py-3">
                <Skeleton className="h-3 w-8 ml-auto rounded bg-gray-700" />
              </td>
              <td className="px-3 py-3 border-l border-gray-700">
                <Skeleton className="h-3 w-20 ml-auto rounded bg-gray-700" />
              </td>
              <td className="px-3 py-3 border-l border-gray-700" />
              {[0,1,2].map(i => (
                <td key={i} className="px-3 py-3 border-l border-green-900/40 bg-green-950/20">
                  <Skeleton className="h-3 w-16 ml-auto rounded bg-green-900/40" />
                </td>
              ))}
              {[0,1,2].map(i => (
                <td key={i} className="px-3 py-3 border-l border-orange-900/40 bg-orange-950/20">
                  <Skeleton className="h-3 w-16 ml-auto rounded bg-orange-900/40" />
                </td>
              ))}
              <td className="px-3 py-3 border-l border-gray-700">
                <Skeleton className="h-3 w-20 ml-auto rounded bg-gray-700" />
              </td>
              <td className="border-l border-gray-700" />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── AmountCell ───────────────────────────────────────────────────────────────

interface AmountCellProps {
  obligationId: number;
  field: "principal" | "interest";
  value: string;
  onChange: (val: string) => void;
  onBlurSave: (obligationId: number, field: "principal" | "interest") => void;
}

function AmountCell({ obligationId, field, value, onChange, onBlurSave }: AmountCellProps) {
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(value);
  const valueAtFocus = useRef<number>(0);

  useEffect(() => { if (!focused) setDraft(value); }, [value, focused]);

  return (
    <input
      type="text"
      inputMode="decimal"
      value={focused ? draft : value}
      onFocus={() => {
        setFocused(true);
        valueAtFocus.current = parseFormatted(value);
        setDraft(value.replace(/,/g, ""));
      }}
      onChange={(e) => {
        const formatted = formatWhileTyping(e.target.value);
        setDraft(formatted);
        onChange(formatted);
      }}
      onBlur={() => {
        setFocused(false);
        const finalized = formatOnBlur(draft);
        setDraft(finalized);
        onChange(finalized);
        if (parseFormatted(finalized) !== valueAtFocus.current) {
          onBlurSave(obligationId, field);
        }
      }}
      placeholder="0"
      className={cn(
        "w-full text-right text-[12px] font-mono",
        "h-8 px-2.5 rounded-md border bg-white",
        "border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300",
        "placeholder:text-gray-300 transition-colors",
      )}
    />
  );
}

// ─── TruncatedCell ────────────────────────────────────────────────────────────

function TruncatedCell({ text, className }: { text: string; className?: string }) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={cn("overflow-hidden leading-snug", className)}
            style={{ display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
            {text}
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-[12px] leading-snug whitespace-pre-wrap bg-gray-900 text-white border-0 shadow-lg">
          {text}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Form5() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

  const [rows, setRows]       = useState<DebtObligation[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [dirty, setDirty]     = useState(false);

  const [edits, setEdits] = useState<Record<number, { principal: string; interest: string }>>({});
  const savedValues = useRef<Map<number, { principal: number; interest: number }>>(new Map());

  const [dialogOpen, setDialogOpen]     = useState(false);
  const [editTarget, setEditTarget]     = useState<DebtObligation | null>(null);
  const [form, setForm]                 = useState<ObligationForm>(EMPTY_FORM);
  const [formErrors, setFormErrors]     = useState<Partial<ObligationForm>>({});
  const [submitting, setSubmitting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DebtObligation | null>(null);

  const editsRef = useRef(edits);
  useEffect(() => { editsRef.current = edits; }, [edits]);
  const rowsRef = useRef(rows);
  useEffect(() => { rowsRef.current = rows; }, [rows]);

  const fetchData = useCallback(async (planId: number) => {
    setLoading(true);
    try {
      const res = await API.get(`/debt-obligations?budget_plan_id=${planId}`);
      const obligations: DebtObligation[] = res.data.data;
      const active = obligations.filter(ob => ob.balance_principal > 0 || ob.payment_id !== null);
      setRows(active);
      const seed: Record<number, { principal: string; interest: string }> = {};
      active.forEach(ob => {
        seed[ob.obligation_id] = {
          principal: seedDisplay(ob.current_principal),
          interest:  seedDisplay(ob.current_interest),
        };
        savedValues.current.set(ob.obligation_id, {
          principal: ob.current_principal,
          interest:  ob.current_interest,
        });
      });
      setEdits(seed);
      setDirty(false);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (activePlan?.budget_plan_id) fetchData(activePlan.budget_plan_id);
  }, [activePlan, fetchData]);

  const computedRows = rows.map(ob => {
    const curP = parseFormatted(edits[ob.obligation_id]?.principal || "");
    const curI = parseFormatted(edits[ob.obligation_id]?.interest  || "");
    return { ...ob, current_principal: curP, current_interest: curI, current_total: curP + curI,
      balance_principal: ob.principal_amount - ob.previous_principal - curP };
  });

  const totals = computedRows.reduce(
    (acc, ob) => ({
      principal_amount:   acc.principal_amount   + ob.principal_amount,
      previous_principal: acc.previous_principal + ob.previous_principal,
      previous_interest:  acc.previous_interest  + ob.previous_interest,
      previous_total:     acc.previous_total     + ob.previous_total,
      current_principal:  acc.current_principal  + ob.current_principal,
      current_interest:   acc.current_interest   + ob.current_interest,
      current_total:      acc.current_total      + ob.current_total,
      balance_principal:  acc.balance_principal  + ob.balance_principal,
    }),
    { principal_amount: 0, previous_principal: 0, previous_interest: 0, previous_total: 0,
      current_principal: 0, current_interest: 0, current_total: 0, balance_principal: 0 }
  );

  const buildItems = (currentEdits: Record<number, { principal: string; interest: string }>) =>
    rowsRef.current.map(ob => ({
      obligation_id: ob.obligation_id,
      principal_due: parseFormatted(currentEdits[ob.obligation_id]?.principal || ""),
      interest_due:  parseFormatted(currentEdits[ob.obligation_id]?.interest  || ""),
    }));

  const handleBlurSave = useCallback((obligationId: number, _field: "principal" | "interest") => {
    if (!activePlan?.budget_plan_id) return;
    const current = editsRef.current[obligationId];
    if (!current) return;
    const last = savedValues.current.get(obligationId);
    const curP = parseFormatted(current.principal);
    const curI = parseFormatted(current.interest);
    if (last && last.principal === curP && last.interest === curI) return;
    const promise = API.post("/debt-obligations/payments/bulk", {
      budget_plan_id: activePlan.budget_plan_id,
      items: buildItems(editsRef.current),
    }).then(() => {
      rowsRef.current.forEach(ob => {
        const e = editsRef.current[ob.obligation_id];
        if (e) savedValues.current.set(ob.obligation_id, {
          principal: parseFormatted(e.principal),
          interest:  parseFormatted(e.interest),
        });
      });
      setDirty(false);
    });
    toast.promise(promise, {
      loading: "Saving…", success: "Saved successfully",
      error: (err: any) => `Save failed: ${err?.response?.data?.message ?? err?.message ?? "Unknown error"}`,
    });
  }, [activePlan]);

  const handleSave = async () => {
    if (!activePlan?.budget_plan_id) return;
    setSaving(true);
    try {
      await API.post("/debt-obligations/payments/bulk", {
        budget_plan_id: activePlan.budget_plan_id,
        items: buildItems(editsRef.current),
      });
      rowsRef.current.forEach(ob => {
        const e = editsRef.current[ob.obligation_id];
        if (e) savedValues.current.set(ob.obligation_id, {
          principal: parseFormatted(e.principal),
          interest:  parseFormatted(e.interest),
        });
      });
      toast.success("Saved successfully");
      setDirty(false);
      await fetchData(activePlan.budget_plan_id);
    } catch (err: any) {
      toast.error(`Save failed: ${err?.response?.data?.message ?? err?.message ?? "Unknown error"}`);
    } finally { setSaving(false); }
  };

  const openAdd = () => { setEditTarget(null); setForm(EMPTY_FORM); setFormErrors({}); setDialogOpen(true); };
  const openEdit = (ob: DebtObligation) => {
    setEditTarget(ob);
    setForm({ creditor: ob.creditor, date_contracted: ob.date_contracted, term: ob.term,
      principal_amount: ob.principal_amount.toString(), purpose: ob.purpose });
    setFormErrors({});
    setDialogOpen(true);
  };

  const validateForm = (): boolean => {
    const errs: Partial<ObligationForm> = {};
    if (!form.creditor.trim())        errs.creditor        = "Required";
    if (!form.date_contracted.trim()) errs.date_contracted = "Required";
    if (!form.term.trim())            errs.term            = "Required";
    if (!form.purpose.trim())         errs.purpose         = "Required";
    if (!form.principal_amount || isNaN(parseFloat(form.principal_amount)))
      errs.principal_amount = "Must be a valid number";
    setFormErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmitObligation = async () => {
    if (!validateForm()) return;
    setSubmitting(true);
    try {
      const payload = { ...form, principal_amount: parseFloat(form.principal_amount) };
      if (editTarget) await API.put(`/debt-obligations/${editTarget.obligation_id}`, payload);
      else            await API.post("/debt-obligations", payload);
      setDialogOpen(false);
      if (activePlan?.budget_plan_id) await fetchData(activePlan.budget_plan_id);
    } catch (e) { console.error(e); }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/debt-obligations/${deleteTarget.obligation_id}`);
      setDeleteTarget(null);
      if (activePlan?.budget_plan_id) await fetchData(activePlan.budget_plan_id);
    } catch (e) { console.error(e); }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (planLoading) return <LoadingState />;
  if (!activePlan) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <p className="text-gray-500 text-sm">No active budget plan found.</p>
        <p className="text-gray-400 text-xs">Activate a budget plan to manage indebtedness records.</p>
      </div>
    </div>
  );

  const budgetYear = activePlan.year ?? new Date().getFullYear();
  const thStatic   = "border-b border-r border-gray-200 bg-white px-3 py-2.5 align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide";

  return (
    <div className="p-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form No. 5</span>
            {/* <span className="text-gray-300 text-[10px]">·</span> */}
            {/* <span className="text-[10px] font-medium text-gray-400">FY {budgetYear}</span> */}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Statement of Indebtedness</h1>
        </div>
        <div className="flex items-center gap-2.5">
          {saving && (
            <span className="text-[11px] text-gray-400 flex items-center gap-1.5">
              <span className="w-3 h-3 border-2 border-gray-300 border-t-gray-500 rounded-full animate-spin inline-block" />
              Saving
            </span>
          )}
          {dirty && !saving && (
            <span className="text-[11px] text-amber-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block" />
              Unsaved
            </span>
          )}
          <Button size="sm" variant="outline" onClick={openAdd}
            className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
            <PlusIcon className="w-3.5 h-3.5" />Add Creditor
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving || !dirty}
            className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white">
            <CheckIcon className="w-3.5 h-3.5" />Save
          </Button>
        </div>
      </div>

      {/* ── Table — skeleton while loading, real table when ready ─────── */}
      {loading ? (
        <TableSkeleton budgetYear={budgetYear} />
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse min-w-[1500px]">
              <thead>
                {/* ── Row 1 ── */}
                <tr>
                  <th rowSpan={3} className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-center w-8 align-middle text-[11px] font-medium text-gray-400">#</th>
                  <th rowSpan={2} className={cn(thStatic, "text-left w-44")}>Creditor</th>
                  <th rowSpan={2} className={cn(thStatic, "text-center w-24")}>Date<br />Contracted</th>
                  <th rowSpan={2} className={cn(thStatic, "text-left w-52")}>Term</th>
                  <th rowSpan={2} className={cn(thStatic, "text-right w-32")}>Principal<br />Amount</th>
                  <th rowSpan={2} className={cn(thStatic, "text-left w-40")}>Purpose</th>
                  <th colSpan={3} className={cn("border-b border-r border-l px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest", C_PREV_TH)}>
                    Previous Payments Made
                  </th>
                  <th colSpan={3} className={cn("border-b border-r border-l px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest", C_DUE_TH)}>
                    Amount Due — {budgetYear}
                  </th>
                  <th rowSpan={2} className={cn(thStatic, "text-right w-32 border-l")}>Balance of<br />Principal</th>
                  <th rowSpan={3} className="border-b border-gray-200 bg-white px-2 py-2 text-center w-12 align-middle" />
                </tr>
                {/* ── Row 2 ── */}
                <tr>
                  <th className={cn("border-b border-r border-l px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_PREV_TH)}>Principal</th>
                  <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_PREV_TH)}>Interest</th>
                  <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_PREV_TH)}>Total</th>
                  <th className={cn("border-b border-r border-l px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-32", C_DUE_TH)}>Principal</th>
                  <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-32", C_DUE_TH)}>Interest</th>
                  <th className={cn("border-b border-r px-3 py-2 text-right text-[10px] font-medium uppercase tracking-wide w-28", C_DUE_TH)}>Total</th>
                </tr>
                {/* ── Row 3 — column numbers ── */}
                <tr className="border-b-2 border-gray-200">
                  {["(1)","(2)","(3)","(4)","(5)"].map((n, i) => (
                    <td key={i} className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">{n}</td>
                  ))}
                  {["(6)","(7)","(8)"].map((n, i) => (
                    <td key={i} className={cn("border-r px-3 py-1 text-center text-[10px]", i === 0 && "border-l", "bg-green-50 border-green-200", C_PREV_NUM)}>{n}</td>
                  ))}
                  {["(9)","(10)","(11)"].map((n, i) => (
                    <td key={i} className={cn("border-r px-3 py-1 text-center text-[10px]", i === 0 && "border-l", "bg-orange-50 border-orange-200", C_DUE_NUM)}>{n}</td>
                  ))}
                  <td className="border-r border-l border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(12)</td>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {computedRows.length === 0 ? (
                  <tr>
                    <td colSpan={14} className="text-center py-14 text-gray-400 text-sm">
                      No indebtedness records.{" "}
                      <button onClick={openAdd} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                        Add the first creditor
                      </button>
                    </td>
                  </tr>
                ) : computedRows.map((ob, idx) => (
                  <tr key={ob.obligation_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="border-r border-gray-100 px-3 py-3 text-gray-400 text-center align-top text-[11px]">{idx + 1}</td>
                    <td className="border-r border-gray-100 px-3 py-3 font-medium text-gray-900 align-top"><TruncatedCell text={ob.creditor} /></td>
                    <td className="border-r border-gray-100 px-3 py-3 text-gray-500 align-top text-center">{ob.date_contracted}</td>
                    <td className="border-r border-gray-100 px-3 py-3 text-gray-500 align-top max-w-[200px]"><TruncatedCell text={ob.term} /></td>
                    <td className="border-r border-gray-100 px-3 py-3 text-right font-mono text-gray-800 align-top tabular-nums">{fmtAlways(ob.principal_amount)}</td>
                    <td className="border-r border-gray-100 px-3 py-3 text-gray-500 align-top max-w-[160px]"><TruncatedCell text={ob.purpose} /></td>
                    {/* Previous — green, read-only */}
                    <td className={cn("border-r border-l px-3 py-3 text-right font-mono text-gray-600 align-top tabular-nums", C_PREV_TD)}>{fmt(ob.previous_principal)}</td>
                    <td className={cn("border-r px-3 py-3 text-right font-mono text-gray-600 align-top tabular-nums", C_PREV_TD)}>{fmt(ob.previous_interest)}</td>
                    <td className={cn("border-r px-3 py-3 text-right font-mono text-gray-700 font-medium align-top tabular-nums", C_PREV_TD)}>{fmt(ob.previous_total)}</td>
                    {/* Amount Due — orange, editable */}
                    <td className={cn("border-r border-l px-2 py-2 align-top", C_DUE_TD)}>
                      <AmountCell obligationId={ob.obligation_id} field="principal"
                        value={edits[ob.obligation_id]?.principal ?? ""}
                        onChange={val => { setEdits(prev => ({ ...prev, [ob.obligation_id]: { ...prev[ob.obligation_id], principal: val } })); setDirty(true); }}
                        onBlurSave={handleBlurSave} />
                    </td>
                    <td className={cn("border-r px-2 py-2 align-top", C_DUE_TD)}>
                      <AmountCell obligationId={ob.obligation_id} field="interest"
                        value={edits[ob.obligation_id]?.interest ?? ""}
                        onChange={val => { setEdits(prev => ({ ...prev, [ob.obligation_id]: { ...prev[ob.obligation_id], interest: val } })); setDirty(true); }}
                        onBlurSave={handleBlurSave} />
                    </td>
                    <td className={cn("border-r px-3 py-3 text-right font-mono text-gray-700 font-medium align-top tabular-nums", C_DUE_TD)}>{fmt(ob.current_total)}</td>
                    {/* Balance */}
                    <td className="border-r border-l border-gray-100 px-3 py-3 text-right font-mono align-top font-semibold tabular-nums">
                      <span className={ob.balance_principal <= 0 ? "text-green-500" : "text-gray-800"}>
                        {fmtAlways(ob.balance_principal)}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 align-top text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                            <MoreHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => openEdit(ob)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={() => setDeleteTarget(ob)}>Delete</DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>

              {computedRows.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-900 text-white">
                    <td colSpan={4} className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500">Total</td>
                    <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{fmtAlways(totals.principal_amount)}</td>
                    <td className="px-3 py-3 text-center text-gray-600 border-l border-gray-700">–</td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_PREV_GT)}>
                      {totals.previous_principal === 0 ? <span className="text-green-900">–</span> : fmtAlways(totals.previous_principal)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_PREV_GT)}>
                      {totals.previous_interest === 0 ? <span className="text-green-900">–</span> : fmtAlways(totals.previous_interest)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_PREV_GT)}>
                      {totals.previous_total === 0 ? <span className="text-green-900">–</span> : fmtAlways(totals.previous_total)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_DUE_GT)}>
                      {totals.current_principal === 0 ? <span className="text-orange-900">–</span> : fmtAlways(totals.current_principal)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_DUE_GT)}>
                      {totals.current_interest === 0 ? <span className="text-orange-900">–</span> : fmtAlways(totals.current_interest)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_DUE_GT)}>
                      {totals.current_total === 0 ? <span className="text-orange-900">–</span> : fmtAlways(totals.current_total)}
                    </td>
                    <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums border-l border-gray-700">
                      {fmtAlways(totals.balance_principal)}
                    </td>
                    <td className="border-l border-gray-700" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* ── Legend ──────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />
          <span className="text-green-600 font-semibold">Green</span> = Previous payments (read-only)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
          <span className="text-orange-600 font-semibold">Orange</span> = Amount due FY {budgetYear} (editable · auto-saves on change)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
          Zero-balance obligations are excluded
        </span>
      </div>

      {/* ── Add / Edit Dialog ──────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">
              {editTarget ? "Edit Creditor" : "Add New Creditor"}
            </DialogTitle>
            <p className="text-xs text-gray-400 mt-0.5">Statement of Indebtedness — LBP Form 5</p>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">(1) Creditor <span className="text-red-400">*</span></Label>
              <Input value={form.creditor} onChange={e => setForm(p => ({ ...p, creditor: e.target.value }))}
                placeholder="e.g. LBP – New Municipal Hall" className={cn("h-9 text-sm", formErrors.creditor && "border-red-300")} />
              {formErrors.creditor && <p className="text-[11px] text-red-500">{formErrors.creditor}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">(2) Date Contracted <span className="text-red-400">*</span></Label>
              <Input value={form.date_contracted} onChange={e => setForm(p => ({ ...p, date_contracted: e.target.value }))}
                placeholder="e.g. Various date Contracted  or  2022" className={cn("h-9 text-sm", formErrors.date_contracted && "border-red-300")} />
              <p className="text-[10px] text-gray-400">Free-text — enter a date or "Various date Contracted"</p>
              {formErrors.date_contracted && <p className="text-[11px] text-red-500">{formErrors.date_contracted}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">(3) Term <span className="text-red-400">*</span></Label>
              <Textarea value={form.term} onChange={e => setForm(p => ({ ...p, term: e.target.value }))}
                placeholder="e.g. 15 years  4% Fixed up to 12/31/22  subject to annual repricing"
                rows={3} className={cn("text-sm resize-none", formErrors.term && "border-red-300")} />
              {formErrors.term && <p className="text-[11px] text-red-500">{formErrors.term}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">(4) Principal Amount <span className="text-red-400">*</span></Label>
              <Input type="number" min="0" step="0.01" value={form.principal_amount}
                onChange={e => setForm(p => ({ ...p, principal_amount: e.target.value }))}
                placeholder="0" className={cn("h-9 text-sm text-right font-mono", formErrors.principal_amount && "border-red-300")} />
              {formErrors.principal_amount && <p className="text-[11px] text-red-500">{formErrors.principal_amount}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">(5) Purpose <span className="text-red-400">*</span></Label>
              <Textarea value={form.purpose} onChange={e => setForm(p => ({ ...p, purpose: e.target.value }))}
                placeholder="e.g. Design and Build New Municipal Hall"
                rows={2} className={cn("text-sm resize-none", formErrors.purpose && "border-red-300")} />
              {formErrors.purpose && <p className="text-[11px] text-red-500">{formErrors.purpose}</p>}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setDialogOpen(false)} disabled={submitting}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800" onClick={handleSubmitObligation} disabled={submitting}>
              {submitting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : editTarget ? "Update" : "Add Creditor"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Delete creditor?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{deleteTarget?.creditor}</span> and all its payment records will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
