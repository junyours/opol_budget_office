import React, { useEffect, useState, useCallback, useRef } from "react";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/src/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Badge } from "@/src/components/ui/badge";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/src/components/ui/tooltip";
import {
  PlusIcon, ArrowPathIcon, TrashIcon, MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { LoadingState } from "@/src/pages/common/LoadingState";
import { Skeleton } from "@/src/components/ui/skeleton";

// ─── Types ────────────────────────────────────────────────────────────────────

interface MdfItem {
  item_id: number;
  category_id: number;
  name: string;
  account_code: string | null;
  obligation_id: number | null;
  debt_type: "principal" | "interest" | null;
  sort_order: number;
  is_debt_row: boolean;
  active_snapshot_id: number | null;
  current_snapshot_id: number | null;
  past_total: number;
  cur_sem1: number;
  cur_sem2: number;
  cur_total: number;
  proposed: number;
  has_prior_data: boolean;
}

interface MdfCategoryTotals {
  past_total: number;
  cur_sem1: number;
  cur_sem2: number;
  cur_total: number;
  proposed: number;
}

interface MdfCategory {
  category_id: number;
  name: string;
  code: string | null;
  is_debt_servicing: boolean;
  sort_order: number;
  items: MdfItem[];
  totals: MdfCategoryTotals;
}

interface MdfYears {
  proposed: number;
  current: number;
  past: number;
  active_plan_id: number;
  current_plan_id: number | null;
  past_plan_id: number | null;
}

interface MdfResponse {
  budget_plan: { budget_plan_id: number; year: number };
  years: MdfYears;
  categories: MdfCategory[];
  grand_totals: MdfCategoryTotals;
}

interface ExistingMdfItem {
  item_id: number;
  category_id: number;
  category_name: string | null;
  name: string;
  account_code: string | null;
}

interface MdfSnapshotResponse {
  snapshot_id: number;
  item_id: number;
  budget_plan_id: number;
  total_amount: number;
  sem1_actual: number;
}

// ─── Column color tokens ──────────────────────────────────────────────────────

const C_PAST_TH  = "bg-green-50 border-green-200 text-green-700";
const C_PAST_TD  = "bg-green-50/30 border-green-100";
const C_PAST_SUB = "bg-green-50 border-green-200";
const C_PAST_GT  = "bg-green-950/20 border-green-900/40 text-green-300";

const C_CURR_TH  = "bg-blue-50 border-blue-200 text-blue-700";
const C_CURR_TD  = "bg-blue-50/30 border-blue-100";
const C_CURR_SUB = "bg-blue-50 border-blue-200";
const C_CURR_GT  = "bg-blue-950/20 border-blue-900/40 text-blue-300";

const C_BUDG_TH  = "bg-orange-50 border-orange-200 text-orange-700";
const C_BUDG_TD  = "bg-orange-50/30 border-orange-100";
const C_BUDG_SUB = "bg-orange-50 border-orange-200";
const C_BUDG_GT  = "bg-orange-950/20 border-orange-900/40 text-orange-300";

// ─── Number helpers ───────────────────────────────────────────────────────────

const enPH = (v: number) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));

const fmt      = (v: number | null | undefined) => (!v ? "–" : enPH(v));
const fmtPeso  = (v: number) => (v === 0 ? "–" : `₱ ${enPH(v)}`);
const parseNum = (s: string) => { const n = parseFloat(s.replace(/,/g, "").trim()); return isNaN(n) ? 0 : n; };
const toStr    = (v: number) => (v === 0 ? "" : enPH(v));
const commaFmt = (raw: string) => {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  return parseInt(digits, 10).toLocaleString("en-PH");
};

// ─── AmountInput ──────────────────────────────────────────────────────────────

interface AmountInputProps {
  value: string;
  disabled?: boolean;
  readOnly?: boolean;
  onChange: (v: string) => void;
  onBlur: () => void;
  colorClass?: string;
}

function AmountInput({ value, disabled, readOnly, onChange, onBlur, colorClass = "focus:ring-gray-400 focus:border-gray-400" }: AmountInputProps) {
  const [focused, setFocused] = useState(false);
  const [draft,   setDraft]   = useState(value);
  const atFocus               = useRef<number>(0);

  useEffect(() => { if (!focused) setDraft(value); }, [value, focused]);

  if (disabled || readOnly) {
    return (
      <span className={cn("block w-full text-right text-[12px] font-mono tabular-nums px-2 py-1.5", disabled ? "text-gray-400" : "text-gray-600")}>
        {value ? enPH(parseNum(value)) : "–"}
      </span>
    );
  }

  return (
    <input type="text" inputMode="numeric"
      value={focused ? draft : value}
      placeholder="0"
      onFocus={() => { setFocused(true); atFocus.current = parseNum(value); setDraft(value.replace(/,/g, "")); }}
      onChange={(e) => { const f = commaFmt(e.target.value); setDraft(f); onChange(f); }}
      onBlur={() => {
        setFocused(false);
        const n = parseNum(draft);
        const fin = n === 0 ? "" : enPH(n);
        setDraft(fin); onChange(fin);
        if (n !== atFocus.current) onBlur();
      }}
      className={cn("w-full text-right text-[12px] font-mono tabular-nums h-8 px-2.5 rounded-md border bg-white",
        "border-gray-200 focus:outline-none focus:ring-2", colorClass, "placeholder:text-gray-300 transition-colors")}
    />
  );
}

// ─── MDF Table Skeleton ───────────────────────────────────────────────────────

function MdfTableSkeleton() {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 1080 }}>
        <colgroup>
          <col /><col style={{ width: "7%" }} /><col style={{ width: "11%" }} />
          <col style={{ width: "11%" }} /><col style={{ width: "11%" }} />
          <col style={{ width: "10%" }} /><col style={{ width: "13%" }} />
        </colgroup>
        <thead>
          <tr>
            <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-left">
              <Skeleton className="h-3 w-36 rounded" />
            </th>
            <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-center">
              <Skeleton className="h-3 w-14 mx-auto rounded" />
            </th>
            <th className="border-b border-r bg-green-50 border-green-200 px-3 py-2.5 text-right">
              <Skeleton className="h-3 w-16 ml-auto rounded bg-green-200" />
              <Skeleton className="h-2 w-20 ml-auto rounded bg-green-100 mt-1" />
            </th>
            <th colSpan={3} className="border-b border-r border-l bg-blue-50 border-blue-200 px-3 py-2 text-center">
              <Skeleton className="h-3 w-32 mx-auto rounded bg-blue-200" />
            </th>
            <th className="border-b border-r bg-orange-50 border-orange-200 px-3 py-2.5 text-right">
              <Skeleton className="h-3 w-16 ml-auto rounded bg-orange-200" />
              <Skeleton className="h-2 w-20 ml-auto rounded bg-orange-100 mt-1" />
            </th>
          </tr>
          <tr className="border-b-2 border-gray-200">
            <td className="border-r border-gray-200 bg-white px-3 py-1.5 text-[9px] text-gray-300">(1)</td>
            <td className="border-r border-gray-200 bg-white px-3 py-1.5 text-[9px] text-gray-300">(2)</td>
            <td className="border-r border-l bg-green-50 border-green-200 px-3 py-1.5 text-center text-[9px] text-green-300">(3)</td>
            <td className="border-r border-l bg-blue-50 border-blue-200 px-3 py-1.5 text-right">
              <Skeleton className="h-2.5 w-14 ml-auto rounded bg-blue-200" />
            </td>
            <td className="border-r bg-blue-50 border-blue-200 px-3 py-1.5 text-right">
              <Skeleton className="h-2.5 w-14 ml-auto rounded bg-blue-200" />
            </td>
            <td className="border-r bg-blue-50 border-blue-200 px-3 py-1.5 text-center text-[9px] text-blue-300">(6)</td>
            <td className="border-r bg-orange-50 border-orange-200 px-3 py-1.5 text-center text-[9px] text-orange-300">(7)</td>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {/* Two category blocks */}
          {[0, 1].map(gi => (
            <React.Fragment key={gi}>
              <tr className="bg-gray-50 border-y border-gray-200">
                <td colSpan={7} className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className={cn("h-3 rounded", gi === 0 ? "w-44" : "w-52")} />
                    <Skeleton className="h-7 w-20 rounded-lg" />
                  </div>
                </td>
              </tr>
              {Array.from({ length: gi === 0 ? 4 : 3 }).map((_, ri) => (
                <tr key={ri} style={{ animationDelay: `${(gi * 4 + ri) * 40}ms` }}>
                  <td className="border-r border-gray-100 px-3 py-2.5 align-top">
                    <Skeleton className={cn("h-3 rounded", ri % 3 === 0 ? "w-4/5" : ri % 3 === 1 ? "w-full" : "w-3/4")}
                      style={{ marginLeft: ri % 2 === 1 ? 16 : 4 }} />
                  </td>
                  <td className="border-r border-gray-100 px-3 py-2.5 text-center">
                    <Skeleton className="h-3 w-10 mx-auto rounded" />
                  </td>
                  <td className="border-r border-l px-3 py-2.5 bg-green-50/30 border-green-100">
                    <Skeleton className={cn("h-3 ml-auto rounded bg-green-100", ri % 2 === 0 ? "w-16" : "w-20")} />
                  </td>
                  <td className="border-r border-l px-2 py-2 bg-blue-50/30 border-blue-100">
                    <Skeleton className="h-8 w-full rounded-md bg-blue-100" />
                  </td>
                  <td className="border-r px-3 py-2.5 bg-blue-50/30 border-blue-100">
                    <Skeleton className={cn("h-3 ml-auto rounded bg-blue-100", ri % 2 === 0 ? "w-14" : "w-18")} />
                  </td>
                  <td className="border-r px-3 py-2.5 bg-blue-50/30 border-blue-100">
                    <Skeleton className={cn("h-3 ml-auto rounded bg-blue-100", ri % 2 === 0 ? "w-20" : "w-16")} />
                  </td>
                  <td className="border-r border-l px-2 py-2 bg-orange-50/30 border-orange-100">
                    <Skeleton className="h-8 w-full rounded-md bg-orange-100" />
                  </td>
                </tr>
              ))}
              {/* Subtotal */}
              <tr className="border-t border-gray-200">
                <td colSpan={2} className="px-3 py-2 bg-gray-100 border-r border-gray-200">
                  <Skeleton className="h-3 w-14 ml-auto rounded bg-gray-200" />
                </td>
                <td className="px-3 py-2 bg-green-50 border-l border-green-200">
                  <Skeleton className="h-3 w-16 ml-auto rounded bg-green-100" />
                </td>
                {[0,1,2].map(i => (
                  <td key={i} className="px-3 py-2 bg-blue-50 border-l border-blue-200">
                    <Skeleton className="h-3 w-16 ml-auto rounded bg-blue-100" />
                  </td>
                ))}
                <td className="px-3 py-2 bg-orange-50 border-l border-orange-200">
                  <Skeleton className="h-3 w-16 ml-auto rounded bg-orange-100" />
                </td>
              </tr>
            </React.Fragment>
          ))}
        </tbody>
        <tfoot>
          <tr className="bg-gray-900">
            <td colSpan={2} className="px-3 py-3 border-r border-gray-700">
              <Skeleton className="h-3 w-48 ml-auto rounded bg-gray-700" />
            </td>
            <td className="px-3 py-3 border-l bg-green-950/20 border-green-900/40">
              <Skeleton className="h-3 w-16 ml-auto rounded bg-green-900/40" />
            </td>
            {[0,1,2].map(i => (
              <td key={i} className="px-3 py-3 border-l bg-blue-950/20 border-blue-900/40">
                <Skeleton className="h-3 w-16 ml-auto rounded bg-blue-900/40" />
              </td>
            ))}
            <td className="px-3 py-3 border-l bg-orange-950/20 border-orange-900/40">
              <Skeleton className="h-3 w-16 ml-auto rounded bg-orange-900/40" />
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}

// ─── Add-Item Dialog ──────────────────────────────────────────────────────────

interface AddItemDialogProps {
  open: boolean;
  categoryId: number;
  categoryName: string;
  activePlanId: number;
  onClose: () => void;
  onCreated: (item: MdfItem) => void;
}

function AddItemDialog({ open, categoryId, categoryName, activePlanId, onClose, onCreated }: AddItemDialogProps) {
  const [mode,    setMode]    = useState<"choose" | "search" | "new">("choose");
  const [name,    setName]    = useState("");
  const [code,    setCode]    = useState("");
  const [saving,  setSaving]  = useState(false);
  const [search,  setSearch]  = useState("");
  const [results, setResults] = useState<ExistingMdfItem[]>([]);
  const [fetching,setFetching]= useState(false);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reset = () => { setMode("choose"); setName(""); setCode(""); setSearch(""); setResults([]); };

  useEffect(() => {
    if (mode !== "search") return;
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!search.trim()) { setResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setFetching(true);
      try {
        const res = await API.get<{ data: ExistingMdfItem[] }>(`/mdf-items?search=${encodeURIComponent(search)}`);
        setResults(res.data.data);
      } catch { setResults([]); }
      finally { setFetching(false); }
    }, 300);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [search, mode]);

  const handleSelectExisting = async (existing: ExistingMdfItem) => {
    setSaving(true);
    try {
      const snapRes = await API.post<{ data: MdfSnapshotResponse }>("/mdf-funds/save-proposed", {
        item_id: existing.item_id, budget_plan_id: activePlanId, total_amount: 0,
      });
      const synthetic: MdfItem = {
        item_id: existing.item_id, category_id: existing.category_id, name: existing.name,
        account_code: existing.account_code, obligation_id: null, debt_type: null,
        sort_order: 999, is_debt_row: false,
        active_snapshot_id: snapRes.data.data?.snapshot_id ?? null, current_snapshot_id: null,
        past_total: 0, cur_sem1: 0, cur_sem2: 0, cur_total: 0, proposed: 0, has_prior_data: true,
      };
      toast.success(`"${existing.name}" added.`);
      onCreated(synthetic); reset();
    } catch { toast.error("Failed to add item."); }
    finally { setSaving(false); }
  };

  const handleCreateNew = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const itemRes = await API.post<{ data: MdfItem }>("/mdf-items", {
        category_id: categoryId, name: name.trim(), account_code: code.trim() || null,
      });
      const newItem = itemRes.data.data;
      await API.post("/mdf-funds/save-proposed", { item_id: newItem.item_id, budget_plan_id: activePlanId, total_amount: 0 });
      onCreated({ ...newItem, has_prior_data: true, past_total: 0, cur_sem1: 0, cur_sem2: 0, cur_total: 0, proposed: 0 });
      toast.success("Item added."); reset();
    } catch { toast.error("Failed to add item."); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) { reset(); onClose(); } }}>
      <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden" aria-describedby={undefined}>
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">Add Line Item</DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">{categoryName}</p>
        </DialogHeader>

        {mode === "choose" && (
          <div className="px-6 py-6 space-y-3">
            <p className="text-[12px] text-gray-500 mb-4">How would you like to add an item?</p>
            {[
              { m: "search" as const, icon: MagnifyingGlassIcon, title: "Search existing items", sub: "Re-use an item from a previous year's MDF plan" },
              { m: "new"    as const, icon: PlusIcon,             title: "Add new item",           sub: "Create a brand-new line item for this category" },
            ].map(({ m, icon: Icon, title, sub }) => (
              <button key={m} onClick={() => setMode(m)}
                className="w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all text-left group">
                <span className="mt-0.5 w-8 h-8 rounded-lg bg-gray-100 group-hover:bg-gray-200 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Icon className="w-4 h-4 text-gray-600" />
                </span>
                <div>
                  <p className="text-[13px] font-semibold text-gray-800">{title}</p>
                  <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {mode === "search" && (
          <div className="flex flex-col" style={{ maxHeight: 420 }}>
            <div className="px-6 pt-4 pb-3 border-b border-gray-100">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search item name…" className="h-9 text-sm pl-9" autoFocus />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 px-3 py-2">
              {fetching && <div className="flex items-center justify-center py-6 text-gray-400 text-sm gap-2"><span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />Searching…</div>}
              {!fetching && search && results.length === 0 && <p className="text-center py-6 text-[12px] text-gray-400">No items found for "{search}"</p>}
              {!fetching && !search && <p className="text-center py-6 text-[12px] text-gray-400">Type to search existing MDF items</p>}
              {!fetching && results.map(item => (
                <button key={item.item_id} onClick={() => handleSelectExisting(item)} disabled={saving}
                  className="w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-[12px] font-medium text-gray-800">{item.name}</p>
                    {item.category_name && <p className="text-[10px] text-gray-400 mt-0.5">{item.category_name}</p>}
                  </div>
                  {item.account_code && <span className="text-[10px] text-gray-400 font-mono ml-2 flex-shrink-0">{item.account_code}</span>}
                </button>
              ))}
            </div>
            <div className="px-6 py-3 border-t border-gray-100">
              <Button variant="ghost" size="sm" className="h-7 text-xs text-gray-500" onClick={() => setMode("choose")}>← Back</Button>
            </div>
          </div>
        )}

        {mode === "new" && (
          <>
            <div className="px-6 py-5 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 block">Item Name <span className="text-red-400">*</span></label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Land Banking / Land Acquisition Program"
                  className="h-9 text-sm" autoFocus onKeyDown={e => e.key === "Enter" && handleCreateNew()} />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-600 block">Account Code <span className="font-normal text-gray-400">(optional)</span></label>
                <Input value={code} onChange={e => setCode(e.target.value)} placeholder="e.g. 8-01-01" className="h-9 text-sm" />
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500" onClick={() => setMode("choose")} disabled={saving}>← Back</Button>
              <Button size="sm" onClick={handleCreateNew} disabled={saving || !name.trim()} className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800">
                {saving ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</> : "Add Item"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function MDFFund() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

  const [categories, setCategories] = useState<MdfCategory[]>([]);
  const [years,      setYears]      = useState<MdfYears | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [syncing,    setSyncing]    = useState(false);

  const [proposedEdits, setProposedEdits] = useState<Record<number, string>>({});
  const [sem1Edits,     setSem1Edits]     = useState<Record<number, string>>({});

  const savedProposed = useRef<Map<number, number>>(new Map());
  const savedSem1     = useRef<Map<number, number>>(new Map());

  const proposedRef   = useRef(proposedEdits);
  const sem1Ref       = useRef(sem1Edits);
  const categoriesRef = useRef(categories);
  const yearsRef      = useRef(years);
  useEffect(() => { proposedRef.current   = proposedEdits; }, [proposedEdits]);
  useEffect(() => { sem1Ref.current       = sem1Edits;     }, [sem1Edits]);
  useEffect(() => { categoriesRef.current = categories;    }, [categories]);
  useEffect(() => { yearsRef.current      = years;         }, [years]);

  const [addDialog,    setAddDialog]    = useState<{ open: boolean; categoryId: number; categoryName: string } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MdfItem | null>(null);
  const [deleting,     setDeleting]     = useState(false);

  const activePlanId = activePlan?.budget_plan_id ?? null;
  const budgetYear   = activePlan?.year ?? new Date().getFullYear();

  const seedItems = useCallback((items: MdfItem[]) => {
    setProposedEdits(prev => {
      const next = { ...prev };
      items.forEach(item => {
        if (next[item.item_id] === undefined) { next[item.item_id] = toStr(item.proposed); savedProposed.current.set(item.item_id, item.proposed); }
      });
      return next;
    });
    setSem1Edits(prev => {
      const next = { ...prev };
      items.forEach(item => {
        if (next[item.item_id] === undefined) { next[item.item_id] = toStr(item.cur_sem1); savedSem1.current.set(item.item_id, item.cur_sem1); }
      });
      return next;
    });
  }, []);

  const fetchData = useCallback(async () => {
    if (!activePlanId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res = await API.get<MdfResponse>(`/mdf-funds?budget_plan_id=${activePlanId}`);
      const mdf = res.data;
      setCategories(mdf.categories);
      setYears(mdf.years);
      const allItems = mdf.categories.flatMap(c => c.items);
      const pSeed: Record<number, string> = {};
      const sSeed: Record<number, string> = {};
      savedProposed.current.clear();
      savedSem1.current.clear();
      allItems.forEach(item => {
        pSeed[item.item_id] = toStr(item.proposed);
        sSeed[item.item_id] = toStr(item.cur_sem1);
        savedProposed.current.set(item.item_id, item.proposed);
        savedSem1.current.set(item.item_id, item.cur_sem1);
      });
      setProposedEdits(pSeed);
      setSem1Edits(sSeed);
    } catch { toast.error("Failed to load MDF data."); }
    finally { setLoading(false); }
  }, [activePlanId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const computedCategories = categories.map(cat => {
    const items = cat.items.map(item => {
      const proposed = parseNum(proposedEdits[item.item_id] ?? "");
      const sem1     = parseNum(sem1Edits[item.item_id]     ?? "");
      return { ...item, proposed, cur_sem1: sem1, cur_sem2: Math.max(0, item.cur_total - sem1) };
    });
    return {
      ...cat, items,
      totals: {
        past_total: items.reduce((s, i) => s + i.past_total, 0),
        cur_sem1:   items.reduce((s, i) => s + i.cur_sem1,   0),
        cur_sem2:   items.reduce((s, i) => s + i.cur_sem2,   0),
        cur_total:  items.reduce((s, i) => s + i.cur_total,  0),
        proposed:   items.reduce((s, i) => s + i.proposed,   0),
      },
    };
  });

  const grandTotals = computedCategories.reduce(
    (acc, cat) => ({
      past_total: acc.past_total + cat.totals.past_total,
      cur_sem1:   acc.cur_sem1   + cat.totals.cur_sem1,
      cur_sem2:   acc.cur_sem2   + cat.totals.cur_sem2,
      cur_total:  acc.cur_total  + cat.totals.cur_total,
      proposed:   acc.proposed   + cat.totals.proposed,
    }),
    { past_total: 0, cur_sem1: 0, cur_sem2: 0, cur_total: 0, proposed: 0 }
  );

  const handleProposedBlur = useCallback((itemId: number) => {
    const y = yearsRef.current;
    if (!y) return;
    const cur  = parseNum(proposedRef.current[itemId] ?? "");
    const last = savedProposed.current.get(itemId);
    if (last === cur) return;
    const promise = API.post("/mdf-funds/save-proposed", { item_id: itemId, budget_plan_id: y.active_plan_id, total_amount: cur })
      .then(() => savedProposed.current.set(itemId, cur));
    toast.promise(promise, { loading: "Saving…", success: "Saved",
      error: (e: any) => `Save failed: ${e?.response?.data?.message ?? e?.message ?? "Unknown error"}` });
  }, []);

  const handleSem1Blur = useCallback((itemId: number) => {
    const y = yearsRef.current;
    if (!y?.current_plan_id) return;
    const rawSem1 = parseNum(sem1Ref.current[itemId] ?? "");
    let curTotal = 0;
    for (const cat of categoriesRef.current) {
      const found = cat.items.find(i => i.item_id === itemId);
      if (found) { curTotal = found.cur_total; break; }
    }
    const clamped = Math.min(Math.max(rawSem1, 0), curTotal);
    if (clamped !== rawSem1) setSem1Edits(prev => ({ ...prev, [itemId]: toStr(clamped) }));
    const last = savedSem1.current.get(itemId);
    if (last === clamped) return;
    const promise = API.post("/mdf-funds/save-sem1", { item_id: itemId, budget_plan_id: y.current_plan_id, sem1_actual: clamped })
      .then(() => {
        savedSem1.current.set(itemId, clamped);
        setCategories(prev => prev.map(cat => ({
          ...cat, items: cat.items.map(item => item.item_id === itemId
            ? { ...item, cur_sem1: clamped, cur_sem2: Math.max(0, item.cur_total - clamped) } : item),
        })));
      });
    toast.promise(promise, { loading: "Saving…", success: "Saved",
      error: (e: any) => `Save failed: ${e?.response?.data?.message ?? e?.message ?? "Unknown error"}` });
  }, []);

  const handleItemCreated = useCallback((categoryId: number, newItem: MdfItem) => {
    setCategories(prev => prev.map(cat =>
      cat.category_id !== categoryId ? cat
        : { ...cat, items: [...cat.items, { ...newItem, has_prior_data: true }] }
    ));
    seedItems([newItem]);
  }, [seedItems]);

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    const target = deleteTarget;
    setDeleting(true);
    setCategories(prev => prev.map(cat =>
      cat.category_id !== target.category_id ? cat
        : { ...cat, items: cat.items.filter(i => i.item_id !== target.item_id) }
    ));
    setDeleteTarget(null);
    try {
      await API.delete(`/mdf-items/${target.item_id}`);
      setProposedEdits(prev => { const n = { ...prev }; delete n[target.item_id]; return n; });
      setSem1Edits(prev     => { const n = { ...prev }; delete n[target.item_id]; return n; });
      savedProposed.current.delete(target.item_id);
      savedSem1.current.delete(target.item_id);
      toast.success(`"${target.name}" deleted.`);
    } catch {
      setCategories(prev => prev.map(cat =>
        cat.category_id !== target.category_id ? cat : { ...cat, items: [...cat.items, target] }
      ));
      toast.error("Delete failed. Item restored.");
    } finally { setDeleting(false); }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await API.post<{ message: string }>("/mdf-funds/sync-debt-items");
      toast.success(res.data.message);
      await fetchData();
    } catch { toast.error("Sync failed."); }
    finally { setSyncing(false); }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  // Do NOT return LoadingState here — it blocks the page header from rendering.
  // Instead, the skeleton renders inline inside the table card below.
  // Only show "no plan" if we're fully done loading and still have nothing.
  if (!planLoading && !activePlan) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <p className="text-gray-500 text-sm">No active budget plan found.</p>
        <p className="text-gray-400 text-xs">Activate a budget plan to manage MDF records.</p>
      </div>
    </div>
  );

  const thBase = "border-b border-r px-3 py-2.5 align-bottom text-[11px] uppercase tracking-wide font-semibold";

  return (
    <div className="p-6">

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form No. 5-A</span>
            <span className="text-gray-300 text-[10px]">·</span>
            {planLoading
              ? <Skeleton className="h-3 w-16 rounded" />
              : <span className="text-[10px] font-medium text-gray-400">FY {budgetYear}</span>
            }
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">20% Municipal Development Fund</h1>
          <p className="text-[12px] text-gray-400 mt-0.5">Opol, Misamis Oriental</p>
        </div>
        <Button size="sm" variant="outline" onClick={handleSync} disabled={syncing}
          className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
          <ArrowPathIcon className={cn("w-3.5 h-3.5", syncing && "animate-spin")} />
          Sync Debt Items
        </Button>
      </div>

      {/* ── Table ───────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {(planLoading || loading) ? (
          <MdfTableSkeleton />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 1080 }}>
              <colgroup>
                <col /><col style={{ width: "7%" }} /><col style={{ width: "11%" }} />
                <col style={{ width: "11%" }} /><col style={{ width: "11%" }} />
                <col style={{ width: "10%" }} /><col style={{ width: "13%" }} />
              </colgroup>

              <thead>
                <tr>
                  <th className={cn(thBase, "bg-white border-gray-200 text-left text-gray-700")}>Object of Expenditure</th>
                  <th className={cn(thBase, "bg-white border-gray-200 text-center text-gray-500")}>Acct. Code</th>
                  <th className={cn(thBase, "text-right", C_PAST_TH)}>
                    {years?.past ?? "–"}
                    <span className="block text-[9px] font-normal normal-case tracking-normal text-green-500">Past Year Actual</span>
                  </th>
                  <th colSpan={3} className={cn("border-b border-r border-l px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest", C_CURR_TH)}>
                    Current Year {years?.current ?? "–"}
                  </th>
                  <th className={cn(thBase, "text-right", C_BUDG_TH)}>
                    {years?.proposed ?? budgetYear}
                    <span className="block text-[9px] font-normal normal-case tracking-normal text-orange-500">Budget Year</span>
                  </th>
                </tr>
                <tr className="border-b-2 border-gray-200">
                  <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(1)</td>
                  <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(2)</td>
                  <td className={cn("border-r border-l px-3 py-1.5 text-center text-[9px] italic normal-case tracking-normal", C_PAST_TH, "font-normal text-green-500")}>(3) total</td>
                  <td className={cn("border-r border-l px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide", C_CURR_TH)}>
                    1st Sem (4)<span className="block text-[9px] normal-case tracking-normal font-normal text-blue-400">editable</span>
                  </td>
                  <td className={cn("border-r px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide", C_CURR_TH)}>
                    2nd Sem (5)<span className="block text-[9px] normal-case tracking-normal font-normal text-blue-400">computed</span>
                  </td>
                  <td className={cn("border-r px-3 py-1.5 text-right text-[10px] font-medium uppercase tracking-wide", C_CURR_TH)}>Total (6)</td>
                  <td className={cn("border-r px-3 py-1.5 text-right text-[9px] normal-case tracking-normal font-medium", C_BUDG_TH)}>(7) editable</td>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {computedCategories.length === 0 ? (
                  <tr><td colSpan={7} className="text-center py-14 text-gray-400 text-sm">No MDF data found.</td></tr>
                ) : computedCategories.map(cat => (
                  <React.Fragment key={`cat-${cat.category_id}`}>
                    <tr className="bg-gray-50 border-y border-gray-200">
                      <td colSpan={7} className="px-4 py-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">{cat.name}</span>
                            {cat.is_debt_servicing && (
                              <Badge variant="outline" className="text-[10px] font-semibold text-blue-600 bg-blue-50 border-blue-200 px-2 py-0.5 normal-case tracking-normal">
                                Auto-filled from Form 5
                              </Badge>
                            )}
                          </div>
                          {!cat.is_debt_servicing && (
                            <TooltipProvider delayDuration={300}>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button size="sm" variant="outline" className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
                                    onClick={() => setAddDialog({ open: true, categoryId: cat.category_id, categoryName: cat.name })}>
                                    <PlusIcon className="w-3.5 h-3.5" />Add Item
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent side="left" className="text-xs">Add item in {cat.name}</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}
                        </div>
                      </td>
                    </tr>

                    {cat.items.length === 0 ? (
                      <tr key={`empty-${cat.category_id}`}>
                        <td colSpan={7} className="px-4 py-3 text-[12px] text-gray-400 italic">
                          No expense items.{" "}
                          {!cat.is_debt_servicing && (
                            <button className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
                              onClick={() => setAddDialog({ open: true, categoryId: cat.category_id, categoryName: cat.name })}>
                              Add the first item
                            </button>
                          )}
                        </td>
                      </tr>
                    ) : cat.items.map(item => {
                      const isDebt   = item.is_debt_row;
                      const sem1Str  = sem1Edits[item.item_id]     ?? "";
                      const propStr  = proposedEdits[item.item_id] ?? "";
                      const liveSem2 = Math.max(0, item.cur_total - parseNum(sem1Str));
                      return (
                        <tr key={`item-${item.item_id}`} className="hover:bg-gray-50/60 transition-colors">
                          <td className="border-r border-gray-100 px-3 py-2.5 align-top">
                            <div className="flex items-center justify-between gap-1">
                              <span className={cn("text-[12px]",
                                item.debt_type === "interest"  && "pl-8 text-gray-400 italic",
                                item.debt_type === "principal" && "pl-4 font-medium text-gray-800",
                                !item.obligation_id            && "pl-4 text-gray-800")}>
                                {item.obligation_id
                                  ? item.debt_type === "principal"
                                    ? `${item.name.replace(" - Principal", "")} – Principal`
                                    : "– Interest"
                                  : item.name}
                              </span>
                              <div className="flex items-center gap-1.5 flex-shrink-0">
                                {item.obligation_id && <Badge variant="outline" className="text-[9px] border-blue-200 text-blue-600 bg-blue-50 px-1 py-0">auto</Badge>}
                                {!item.obligation_id && (
                                  <button className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove item" onClick={() => setDeleteTarget(item)}>
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="border-r border-gray-100 px-3 py-2.5 text-center text-[11px] text-gray-400 align-top">{item.account_code ?? ""}</td>
                          <td className={cn("border-r border-l px-3 py-2.5 text-right font-mono text-gray-600 align-top tabular-nums select-none", C_PAST_TD)}>{fmt(item.past_total)}</td>
                          <td className={cn("border-r border-l px-2 py-2 align-top", C_CURR_TD)}>
                            {isDebt || !item.has_prior_data ? (
                              <span className="block w-full text-right text-[12px] font-mono px-2 py-1.5 text-gray-400">{isDebt ? fmt(item.cur_sem1) : "–"}</span>
                            ) : (
                              <AmountInput value={sem1Str} colorClass="focus:ring-blue-300 focus:border-blue-300"
                                onChange={v => setSem1Edits(prev => ({ ...prev, [item.item_id]: v }))}
                                onBlur={() => handleSem1Blur(item.item_id)} />
                            )}
                          </td>
                          <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-500 align-top tabular-nums select-none", C_CURR_TD)}>{!item.has_prior_data ? "–" : fmt(liveSem2)}</td>
                          <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-600 align-top tabular-nums select-none", C_CURR_TD)}>{!item.has_prior_data ? "–" : fmt(item.cur_total)}</td>
                          <td className={cn("border-r border-l px-2 py-2 align-top", C_BUDG_TD)}>
                            {isDebt ? (
                              <span className="block w-full text-right text-[12px] font-mono px-2.5 py-1.5 text-gray-500 tabular-nums">{fmt(item.proposed)}</span>
                            ) : (
                              <AmountInput value={propStr} colorClass="focus:ring-orange-300 focus:border-orange-300"
                                onChange={v => setProposedEdits(prev => ({ ...prev, [item.item_id]: v }))}
                                onBlur={() => handleProposedBlur(item.item_id)} />
                            )}
                          </td>
                        </tr>
                      );
                    })}

                    {cat.items.length > 0 && (
                      <tr className="border-t border-gray-200">
                        <td colSpan={2} className="px-3 py-2 text-right text-[11px] font-semibold text-gray-600 uppercase tracking-wide bg-gray-100 border-r border-gray-200">Subtotal</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-700 tabular-nums border-l", C_PAST_SUB)}>{fmt(cat.totals.past_total)}</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-700 tabular-nums border-l", C_CURR_SUB)}>{fmt(cat.totals.cur_sem1)}</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-700 tabular-nums border-l", C_CURR_SUB)}>{fmt(cat.totals.cur_sem2)}</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-700 tabular-nums border-l", C_CURR_SUB)}>{fmt(cat.totals.cur_total)}</td>
                        <td className={cn("px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-700 tabular-nums border-l", C_BUDG_SUB)}>{fmt(cat.totals.proposed)}</td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>

              {computedCategories.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-900 text-white">
                    <td colSpan={2} className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500 border-r border-gray-700">
                      Grand Total – Municipal Development Fund
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_PAST_GT)}>
                      {grandTotals.past_total === 0 ? <span className="text-gray-700">–</span> : fmtPeso(grandTotals.past_total)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_CURR_GT)}>
                      {grandTotals.cur_sem1 === 0 ? <span className="text-blue-900">–</span> : fmtPeso(grandTotals.cur_sem1)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_CURR_GT)}>
                      {grandTotals.cur_sem2 === 0 ? <span className="text-blue-900">–</span> : fmtPeso(grandTotals.cur_sem2)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_CURR_GT)}>
                      {grandTotals.cur_total === 0 ? <span className="text-blue-900">–</span> : fmtPeso(grandTotals.cur_total)}
                    </td>
                    <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", C_BUDG_GT)}>
                      {grandTotals.proposed === 0 ? <span className="text-orange-900">–</span> : fmtPeso(grandTotals.proposed)}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ────────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />
          <span className="text-green-600 font-semibold">Green</span> = Past year actual (read-only)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
          <span className="text-blue-600 font-semibold">Blue</span> = Current year · Sem 1 editable · Sem 2 auto-computed
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
          <span className="text-orange-600 font-semibold">Orange</span> = Budget year · editable · auto-saves on blur
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
          Debt-servicing rows — auto-filled from Form 5
        </span>
      </div>

      {/* ── Add Item Dialog ─────────────────────────────────────────────── */}
      {addDialog && activePlanId && (
        <AddItemDialog open={addDialog.open} categoryId={addDialog.categoryId} categoryName={addDialog.categoryName}
          activePlanId={activePlanId} onClose={() => setAddDialog(null)}
          onCreated={newItem => { handleItemCreated(addDialog.categoryId, newItem); setAddDialog(null); }} />
      )}

      {/* ── Delete Confirmation ─────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={open => { if (!open && !deleting) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">Remove item?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{deleteTarget?.name}</span>{" "}and all its snapshot data will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" disabled={deleting}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={handleConfirmDelete} disabled={deleting}>
                {deleting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin mr-1.5" />Removing…</> : "Remove Item"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}