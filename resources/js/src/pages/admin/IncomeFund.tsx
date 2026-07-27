import React, { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import API from "@/src/services/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { Skeleton } from "@/src/components/ui/skeleton";
import { IncomeFundResponse, IncomeFundRow } from "../../types/api";
import { toast } from "sonner";
import { useAuth } from "@/src/hooks/useAuth";
import { cn } from "@/src/lib/utils";
import { Card as ShadcnCard } from "@/src/components/ui/card";
import { sanitizeMoneyDigits } from "@/src/utils/moneyInput";
import { useIsMobile } from "@/src/hooks/use-mobile";
// ─── Types ────────────────────────────────────────────────────────────────────

interface DisplayRow extends IncomeFundRow {
  isSubtotal?: boolean;
  isGrandTotal?: boolean;
}

interface SourceConfig {
  id: string;
  name: string;
  path: string;
}

// ─── Subtotal configs ─────────────────────────────────────────────────────────

const subtotalConfigs: Record<
  string,
  Array<{
    afterId?: number;
    afterName?: string;
    name: string;
    level: number;
    parentId?: number;
    parentName?: string;
  }>
> = {
  "general-fund": [
    { afterId: 13,  name: "Total Tax Revenue",        level: 3, parentId: 4  },
    { afterId: 32,  name: "Total Non-Tax Revenue",    level: 3, parentId: 14 },
    { afterId: 44,  name: "Total External Source",    level: 2, parentId: 33 },
    { afterId: 49,  name: "Total Non-Income Receipts",level: 2, parentId: 45 },
  ],
  occ: [
    { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
    { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
    { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
    { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
  ],
  pm: [
    { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
    { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
    { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
    { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
  ],
  sh: [
    { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
    { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
    { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
    { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
  ],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtNum = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "–";
  return "₱" + Math.round(val).toLocaleString("en-PH");
};

const fmtPct = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "–";
  return val.toFixed(2) + "%";
};

const fmtInput = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "";
  const hasDecimals = val % 1 !== 0;
  return val.toLocaleString("en-PH", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: 2,
  });
};

// Pressing Enter blurs the field, triggering the existing onBlur save handlers.
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
  if (e.key === "Enter") {
    e.preventDefault();
    e.currentTarget.blur();
  }
};

// Sanitizing + clamping lives in src/utils/moneyInput.ts so every money input
// in the app shares the exact same MAX_AMOUNT ceiling.
const sanitizeNumericInput = sanitizeMoneyDigits;

// ─── Column color tokens ──────────────────────────────────────────────────────
const COL_PAST    = "bg-green-100/50  border-green-200";
const COL_CURR    = "bg-blue-100/50   border-blue-200";
const COL_BUDGET  = "bg-orange-100/50 border-orange-200";

const COL_PAST_SUB   = "bg-green-100   border-green-300";
const COL_CURR_SUB   = "bg-blue-100    border-blue-300";
const COL_BUDGET_SUB = "bg-orange-100  border-orange-300";

const COL_PAST_GRAND   = "text-green-300  border-green-900/40  bg-green-950/20";
const COL_CURR_GRAND   = "text-blue-300   border-blue-900/40   bg-blue-950/20";
const COL_BUDGET_GRAND = "text-orange-300 border-orange-900/40 bg-orange-950/20";

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <ShadcnCard className="rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full table-fixed text-[12px] border-collapse" style={{ minWidth: 1400 }}>
          <thead>
            {/* Row 1 — group headers */}
            <tr>
               <th className="sticky left-0 z-30 border-b border-r border-border bg-card px-4 py-2.5 min-w-[260px]">
                <Skeleton className="h-3 w-32 rounded" />
              </th>
              {/* Past Year (Actual) — green */}
              <th className="border-b border-r border-green-300 bg-green-100 px-3 py-2.5 w-32">
                <Skeleton className="h-3 w-10 mx-auto rounded bg-green-300" />
              </th>
              {/* Current — blue, spans 3 */}
              <th colSpan={3} className="border-b border-r border-l border-blue-300 bg-blue-100 px-3 py-2 text-center">
                <Skeleton className="h-3 w-36 mx-auto rounded bg-blue-300" />
              </th>
              {/* Budget — orange */}
              <th className="border-b border-r border-orange-300 bg-orange-100 px-3 py-2.5 w-52">
                <Skeleton className="h-3 w-24 mx-auto rounded bg-orange-300" />
              </th>
              {/* Neutral */}
              <th className="border-b border-r border-border bg-card px-3 py-2.5 w-28">
                <Skeleton className="h-3 w-16 ml-auto rounded" />
              </th>
              <th className="border-b border-border bg-card px-3 py-2.5 w-24">
                <Skeleton className="h-3 w-12 ml-auto rounded" />
              </th>
            </tr>
            {/* Row 2 — current year sub-headers */}
             <tr>
              <th className="border-b border-r border-border bg-card" />
              <th className="border-b border-r border-green-300 bg-green-100" />
              <th className="border-b border-r border-l border-blue-300 bg-blue-100 px-3 py-1.5 w-32">
                <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-300" />
              </th>
              <th className="border-b border-r border-blue-300 bg-blue-100 px-3 py-1.5 w-32">
                <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-300" />
              </th>
              <th className="border-b border-r border-blue-300 bg-blue-100 px-3 py-1.5 w-32">
                <Skeleton className="h-2.5 w-12 ml-auto rounded bg-blue-300" />
              </th>
              <th className="border-b border-r border-orange-300 bg-orange-100" />
              <th className="border-b border-r border-border bg-card" />
              <th className="border-b border-border bg-card" />
            </tr>
            {/* Row 3 — column numbers */}
            <tr className="border-b-2 border-border">
              <td className="border-r border-border bg-card sticky left-0" />
              <td className="border-r border-l border-green-300 bg-green-100 px-3 py-1 text-center text-eyebrow text-green-500">(1)</td>
                <td className="border-r border-l border-blue-300  bg-blue-100  px-3 py-1 text-center text-eyebrow text-blue-500">(2)</td>
                <td className="border-r         border-blue-300  bg-blue-100  px-3 py-1 text-center text-eyebrow text-blue-500">(3)</td>
                <td className="border-r         border-blue-300  bg-blue-100  px-3 py-1 text-center text-eyebrow text-blue-500">(4)</td>
                <td className="border-r border-l border-orange-300 bg-orange-100 px-3 py-1 text-center text-eyebrow text-orange-500">(5)</td>
                <td className="border-r border-border bg-card px-3 py-1 text-center text-eyebrow text-muted-foreground/50">(6)</td>
                <td className="border-border bg-card px-3 py-1 text-center text-eyebrow text-muted-foreground/50">(7)</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 18 }).map((_, ri) => {
              const isSubtotal = ri === 5 || ri === 11;
              const bg = isSubtotal ? "bg-muted/50" : "";
              const widths = ["w-4/5","w-full","w-3/4","w-5/6","w-2/3","w-full","w-4/5","w-3/5"];
              const nameW  = widths[ri % widths.length];
              return (
                <tr key={ri} className={bg} style={{ animationDelay: `${ri * 40}ms` }}>
                  <td className={cn("sticky left-0 z-10 border-r border-border px-4 py-2.5", bg || "bg-card")}>
                    <Skeleton className={cn("h-3 rounded", nameW, isSubtotal && "bg-gray-200")} style={{ marginLeft: `${(ri % 4) * 12}px` }} />
                  </td>
                  <td className={cn("border-r border-l px-3 py-2.5", COL_PAST)}>
                    <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 0 ? "w-16" : "w-20", "bg-green-100")} />
                  </td>
                  <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
                    {isSubtotal
                      ? <Skeleton className="h-3 w-20 ml-auto rounded bg-blue-100" />
                      : <Skeleton className="h-7 w-full rounded-md bg-blue-100" />
                    }
                  </td>
                  <td className={cn("border-r px-3 py-2.5", COL_CURR)}>
                    <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-20", "bg-blue-100")} />
                  </td>
                  <td className={cn("border-r px-3 py-2.5", COL_CURR)}>
                    <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 1 ? "w-20" : "w-16", "bg-blue-100")} />
                  </td>
                  <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
                    {isSubtotal
                      ? <Skeleton className="h-3 w-20 ml-auto rounded bg-orange-100" />
                      : <Skeleton className="h-7 w-full rounded-md bg-orange-100" />
                    }
                  </td>
                  <td className="border-r border-gray-100 px-3 py-2.5">
                    <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-12")} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Skeleton className="h-3 w-10 ml-auto rounded" />
                  </td>
                </tr>
              );
            })}
          </tbody>
         <tfoot>
            <tr className="bg-foreground">
              <td className="sticky left-0 z-10 bg-foreground px-4 py-3">
                <Skeleton className="h-3 w-48 rounded bg-background/20" />
              </td>
              <td className={cn("px-3 py-3 border-l", COL_PAST_GRAND)}>
                <Skeleton className="h-3 w-20 ml-auto rounded bg-green-900/40" />
              </td>
              {[0,1,2].map(i => (
                <td key={i} className={cn("px-3 py-3 border-l", COL_CURR_GRAND)}>
                  <Skeleton className="h-3 w-16 ml-auto rounded bg-blue-900/40" />
                </td>
              ))}
              <td className={cn("px-3 py-3 border-l", COL_BUDGET_GRAND)}>
                <Skeleton className="h-3 w-20 ml-auto rounded bg-orange-900/40" />
              </td>
             <td className="px-3 py-3 border-l border-background/20">
                <Skeleton className="h-3 w-16 ml-auto rounded bg-background/20" />
              </td>
              <td className="px-3 py-3 border-l border-background/20">
                <Skeleton className="h-3 w-10 ml-auto rounded bg-background/20" />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </ShadcnCard>
  );
}

export default function IncomeFundPage() {
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [rows, setRows]             = useState<IncomeFundRow[]>([]);
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  const [currentSource, setCurrentSource] = useState<string>("general-fund");

const savedValues = useRef<Map<number, { current_sem1: number | null; proposed: number | null; past_obligation: number | null }>>(new Map()) as React.MutableRefObject<Map<number, { current_sem1: number | null; proposed: number | null; past_obligation: number | null }>>;
  const seededSources = useRef<Set<string>>(new Set()) as React.MutableRefObject<Set<string>>;

  // ── Draft input state (prevents cursor jump on delete/type — same pattern as Form2) ──
  const [inputDraft, setInputDraft] = useState<Map<string, string>>(new Map());
  const cursorRef = useRef<{ el: HTMLInputElement; pos: number } | null>(null);

  useEffect(() => {
    if (cursorRef.current) {
      const { el, pos } = cursorRef.current;
      el.setSelectionRange(pos, pos);
      cursorRef.current = null;
    }
  });

  const getDraftValue = (key: string, raw: number | null) =>
    inputDraft.has(key) ? inputDraft.get(key)! : fmtInput(raw);

  const setDraft = (key: string, digits: string, el?: HTMLInputElement, cursorPos?: number) => {
    if (el !== undefined && cursorPos !== undefined) {
      cursorRef.current = { el, pos: cursorPos };
    }
    setInputDraft((prev) => new Map(prev).set(key, digits));
  };

  const clearDraft = (key: string) => {
    setInputDraft((prev) => {
      const n = new Map(prev);
      n.delete(key);
      return n;
    });
  };


  const availableSources = useMemo<SourceConfig[]>(() => {
    const src: SourceConfig[] = [];
    if (user?.role === "admin" || user?.role === "super-admin" || user?.role === "viewer") {
    src.push(
        { id: "general-fund", name: "General Fund",           path: "income-general-fund" },
        { id: "sh",           name: "Slaughterhouse",         path: "sh-fund"             },
        { id: "occ",          name: "Opol Community College", path: "occ-fund"            },
        { id: "pm",           name: "Public Market",          path: "pm-fund"             }
    );
    } else if (user?.role === "department-head") {
      const path = window.location.pathname;
      if (path.includes("sh-fund"))  src.push({ id: "sh",  name: "Slaughterhouse",         path: "sh-fund"  });
      if (path.includes("occ-fund")) src.push({ id: "occ", name: "Opol Community College", path: "occ-fund" });
      if (path.includes("pm-fund"))  src.push({ id: "pm",  name: "Public Market",          path: "pm-fund"  });
    }
    return src;
  }, [user]);

useEffect(() => {
    const path = window.location.pathname;
    if      (path.includes("sh-fund"))  setCurrentSource("sh");
    else if (path.includes("occ-fund")) setCurrentSource("occ");
    else if (path.includes("pm-fund"))  setCurrentSource("pm");
    else                                setCurrentSource("general-fund");
  }, []);

  const sourceName = (id: string) =>
    ({ "general-fund": "General Fund", sh: "Slaughterhouse", occ: "Opol Community College", pm: "Public Market" }[id] ?? id);

  // ── TanStack fetch ─────────────────────────────────────────────────────────
  const { data: queryData, isLoading: loading } = useQuery<IncomeFundResponse>({
    queryKey: ['income-fund', currentSource],
    queryFn: () => API.get<IncomeFundResponse>(`/income-fund?source=${currentSource}`)
      .then(r => r.data),
  });

  // ── Sync query data → local rows state ────────────────────────────────────
  const meta = queryData ? {
    year: queryData.year, past_year: queryData.past_year,
    current_year: queryData.current_year, source: queryData.source,
    records_exist: queryData.records_exist,
  } : null;

  useEffect(() => {
    if (!queryData) return;

    if (queryData.past_plan_missing) {
      toast.warning(
        `Budget plan for ${queryData.past_year} does not exist. Create it first to enable past year obligation amount entries.`,
        { duration: 5000 }
      );
    }

    const data = queryData.data.map((row) => ({
      ...row,
      past:            row.past            != null ? Number(row.past)            : null,
      past_obligation: row.past_obligation != null ? Number(row.past_obligation) : null,
      current_sem1:    row.current_sem1    != null ? Number(row.current_sem1)    : null,
      current_sem2:    row.current_sem2    != null ? Number(row.current_sem2)    : null,
      current_total:   row.current_total   != null ? Number(row.current_total)   : null,
      proposed:        row.proposed        != null ? Number(row.proposed)        : null,
    }));

    setRows(data);
    savedValues.current.clear();
    data.forEach((r) =>
      savedValues.current.set(r.id, { current_sem1: r.current_sem1, proposed: r.proposed, past_obligation: r.past_obligation })
    );
  }, [queryData]);

  // ── Seed effect — runs once per source if records don't exist yet ──────────
  useEffect(() => {
    if (!queryData || queryData.records_exist) return;
    if (seededSources.current.has(currentSource)) return;
    if (rows.length === 0) return;

    seededSources.current.add(currentSource);
    API.post('/income-fund/save', { rows, source: currentSource })
      .then(() => {
        rows.forEach((r) =>
          savedValues.current.set(r.id, { current_sem1: r.current_sem1, proposed: r.proposed, past_obligation: r.past_obligation })
        );
        // Mark as seeded in cache so revisiting doesn't re-seed
        queryClient.setQueryData(['income-fund', currentSource], (old: IncomeFundResponse | undefined) =>
          old ? { ...old, records_exist: true } : old
        );
        toast.success(`Initial data saved for ${sourceName(currentSource)}`);
      })
      .catch(() => toast.error(`Failed to save initial data for ${sourceName(currentSource)}`));
  }, [queryData, rows, currentSource]);

  // ── Save mutation ──────────────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: (payload: { rows: IncomeFundRow[]; source: string }) =>
      API.post('/income-fund/save', payload),
    onSuccess: (_, variables) => {
      // Update cache with current rows so revisiting shows latest values
      queryClient.setQueryData(['income-fund', variables.source], (old: IncomeFundResponse | undefined) =>
        old ? { ...old, data: variables.rows } : old
      );
    },
  });

  const handleSourceChange = (id: string) => {
    setCurrentSource(id);
    savedValues.current.clear();
  };

const update = (rowId: number, field: "current_sem1" | "proposed", value: number | null) => {
    setRows((prev) => {
      const copy = [...prev];
      const i = copy.findIndex((r) => r.id === rowId);
      if (i === -1) return prev;
      const row = { ...copy[i], [field]: value };
      if (field === "current_sem1") row.current_sem2 = value !== null ? (row.current_total ?? 0) - value : null;
      copy[i] = row;
      return copy;
    });
  };

  const saveRow = useCallback(
    async (rowId: number) => {
      if (savingRows.has(rowId)) return;
      const row = rows.find((r) => r.id === rowId);
      if (!row) return;

      const last = savedValues.current.get(rowId);
      if (
        last &&
        last.current_sem1 === row.current_sem1 &&
        last.proposed === row.proposed &&
        last.past_obligation === row.past_obligation
      ) return;

      setSavingRows((prev) => new Set(prev).add(rowId));
      const promise = saveMutation.mutateAsync({ rows, source: currentSource }).then(() =>
        savedValues.current.set(rowId, { current_sem1: row.current_sem1, proposed: row.proposed, past_obligation: row.past_obligation })
      );
      toast.promise(promise, {
        loading: "Saving…",
        success: "Saved successfully",
        error: (err: any) => `Save failed: ${err?.response?.data?.message ?? err?.message}`,
      });
      try { await promise; } finally {
        setSavingRows((prev) => { const n = new Set(prev); n.delete(rowId); return n; });
      }
    },
    [rows, savingRows, currentSource]
  );

const handleSem1Change = (rowId: number, raw: string, el?: HTMLInputElement, cursorPos?: number) => {
    const n = sanitizeNumericInput(raw);
    const cappedPos = cursorPos !== undefined ? Math.min(cursorPos, n.length) : cursorPos;
    setDraft(`${rowId}_sem1`, n, el, cappedPos);
    update(rowId, "current_sem1", n === "" ? null : Number(n));
  };

  const handleAmountChange = (rowId: number, raw: string, el?: HTMLInputElement, cursorPos?: number) => {
    const n = sanitizeNumericInput(raw);
    const cappedPos = cursorPos !== undefined ? Math.min(cursorPos, n.length) : cursorPos;
    setDraft(`${rowId}_proposed`, n, el, cappedPos);
    update(rowId, "proposed", n === "" ? null : Number(n));
  };

  const handlePastObligationChange = (
  rowId: number,
  raw: string,
  el?: HTMLInputElement,
  cursorPos?: number,
) => {
  const n = sanitizeNumericInput(raw);
  const cappedPos = cursorPos !== undefined ? Math.min(cursorPos, n.length) : cursorPos;
  setDraft(`${rowId}_past_obligation`, n, el, cappedPos);
  const value = n === "" ? null : Number(n);
  setRows((prev) => {
    const copy = [...prev];
    const i = copy.findIndex((r) => r.id === rowId);
    if (i === -1) return prev;
    copy[i] = { ...copy[i], past_obligation: value };
    return copy;
  });
};

const savePastObligation = useCallback(
  async (rowId: number, value: number | null) => {
    if (savingRows.has(rowId)) return;
    const last = savedValues.current.get(rowId);
    if (last && last.past_obligation === value) return;

    setSavingRows((prev) => new Set(prev).add(rowId));

    // Build the rows payload with the updated past_obligation injected
    const updatedRows = rows.map((r) =>
      r.id === rowId ? { ...r, past_obligation: value } : r
    );

    const promise = saveMutation.mutateAsync({
      rows: updatedRows,
      source: currentSource,
    }).then(() => {
      savedValues.current.set(rowId, {
        ...(savedValues.current.get(rowId) ?? { current_sem1: null, proposed: null, past_obligation: null }),
        past_obligation: value,
      });
    });

    toast.promise(promise, {
      loading: "Saving…",
      success: "Saved successfully",
      error: (err: any) => `Save failed: ${err?.response?.data?.message ?? err?.message}`,
    });

    try { await promise; } finally {
      setSavingRows((prev) => { const n = new Set(prev); n.delete(rowId); return n; });
    }
  },
  [rows, savingRows, currentSource]
);

  const displayRows = useMemo(() => {
    if (!rows.length) return [];
    const childrenMap = new Map<number, IncomeFundRow[]>();
    rows.forEach((r) => {
      if (r.parent_id !== null) {
        if (!childrenMap.has(r.parent_id)) childrenMap.set(r.parent_id, []);
        childrenMap.get(r.parent_id)!.push(r);
      }
    });
    const nameToId = new Map(rows.map((r) => [r.name, r.id]));
    const sumDesc = (
      pid: number,
      field: keyof Pick<IncomeFundRow, "past" | "current_total" | "proposed" | "past_obligation" | "current_sem1" | "current_sem2">
    ) => {
      let total = 0;
      const stack = [pid];
      while (stack.length) {
        const p = stack.pop()!;
        (childrenMap.get(p) ?? []).forEach((c) => { total += c[field] ?? 0; stack.push(c.id); });
      }
      return total;
    };
    const result: DisplayRow[] = [];
    const subtotals: DisplayRow[] = [];
    const configs = subtotalConfigs[currentSource] ?? subtotalConfigs["general-fund"];
    for (const row of rows) {
      result.push({ ...row, isSubtotal: false, isGrandTotal: false });
      const cfg = configs.find((c) =>
        (c.afterId && c.afterId === row.id) || (c.afterName && row.name === c.afterName)
      );
      if (cfg) {
        const pid = cfg.parentId ?? (cfg.parentName ? nameToId.get(cfg.parentName) : undefined);
        if (pid) {
        const sub: DisplayRow = {
            id: -Date.now() - Math.random(),
            parent_id: null,
            code: "",
            name: cfg.name,
            level: cfg.level,
            past: sumDesc(pid, "past"),
            past_obligation: sumDesc(pid, "past_obligation"),
            current_total: sumDesc(pid, "current_total"),
            current_sem1: sumDesc(pid, "current_sem1"),
            current_sem2: sumDesc(pid, "current_sem2"),
            proposed: sumDesc(pid, "proposed"),
            isSubtotal: true,
            isGrandTotal: false,
          };
          subtotals.push(sub);
          result.push(sub);
        }
      }
    }
    const beginningCash = rows.find((r) => r.name === "Beginning Cash Balance");
    const filteredSubs  = subtotals.filter((r) => r.name !== "Total Non-Income Receipts");
    const grand = (f: keyof Pick<IncomeFundRow, "past" | "past_obligation" | "current_total" | "proposed" | "current_sem1" | "current_sem2">) =>
      (beginningCash?.[f] ?? 0) + filteredSubs.reduce((a, r) => a + (r[f] ?? 0), 0);

    result.push({
      id: -999,
      parent_id: null,
      code: "",
      name: "Total Available Resources for Appropriations",
      level: 0,
      past: grand("past"),
      past_obligation: grand("past_obligation"),
      current_total: grand("current_total"),
      current_sem1: grand("current_sem1"),
      current_sem2: grand("current_sem2"),
      proposed: grand("proposed"),
      isSubtotal: false,
      isGrandTotal: true,
    });
    return result;
  }, [rows, currentSource]);

  const isEditable = (row: DisplayRow) =>
    !row.isSubtotal && !row.isGrandTotal && row.name !== "Beginning Cash Balance";

  const isPastEditable = (row: DisplayRow) =>
    !row.isSubtotal && !row.isGrandTotal;

const isViewer   = user?.role === "viewer";
  const isAdmin    = user?.role === "admin" || user?.role === "super-admin";
  const canEditPastAndSem1   = isAdmin;
  const canEditBudgetYear    = isAdmin;

  // ── Table renderer ─────────────────────────────────────────────────────────

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full table-fixed text-[12px] border-collapse" style={{ minWidth: 1400 }}>
        <colgroup>
          <col style={{ minWidth: 250 }} /> {/* Object of Expenditure — floor width, grows with remaining space */}
          <col style={{ width: 190 }} /> {/* Past Year (Actual) */}
          <col style={{ width: 190 }} /> {/* 1st Semester */}
          <col style={{ width: 190 }} /> {/* 2nd Semester */}
          <col style={{ width: 190 }} /> {/* Total */}
          <col style={{ width: 190 }} /> {/* Budget Year */}
          <col style={{ width: 140 }} />  {/* Increase / Decrease */}
          <col style={{ width: 140 }} />  {/* % Change */}
        </colgroup>
        <thead>
          <tr>
            <th rowSpan={3} className="sticky left-0 z-30 border-b border-r border-border bg-card px-4 py-2.5 text-left align-bottom text-table-header shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]">
              Object of Expenditure
            </th>
            <th rowSpan={2} className="border-b border-r border-green-300 bg-green-100 px-3 py-2.5 text-center align-bottom text-table-header text-green-800 w-40">
              Past Year (Actual)<br />
              <span className="text-meta font-normal normal-case text-green-600">{meta?.past_year}</span>
            </th>
            <th colSpan={3} className="border-b border-r border-l border-blue-300 bg-blue-100 px-3 py-2 text-center text-eyebrow text-blue-800">
              Current Year {meta?.current_year} (Estimate)
            </th>
            <th rowSpan={2} className="border-b border-r border-orange-300 bg-orange-100 px-3 py-2.5 text-center align-bottom text-table-header text-orange-800 w-40">
              {meta?.year} Budget Year
            </th>
             <th rowSpan={2} className="border-b border-r border-border bg-card px-3 py-2.5 text-right align-bottom text-table-header w-20">
              Increase /<br />Decrease
            </th>
            <th rowSpan={2} className="border-b border-border bg-card px-3 py-2.5 text-right align-bottom text-table-header w-16">
              % Change
            </th>
          </tr>
          <tr>
            <th className="border-b border-r border-l border-blue-300 bg-blue-100 px-3 py-1.5 text-right text-eyebrow text-blue-700 w-40">
              1st Semester<br />(Actual)
            </th>
            <th className="border-b border-r border-blue-300 bg-blue-100 px-3 py-1.5 text-right text-eyebrow text-blue-700 w-40">
              2nd Semester<br />(Estimate)
            </th>
            <th className="border-b border-r border-blue-300 bg-blue-100 px-3 py-1.5 text-right text-eyebrow text-blue-700 w-40">
              Total
            </th>
          </tr>
          <tr className="border-b-2 border-border">
            <td className="border-r border-l border-green-300 bg-green-100 px-3 py-1 text-center text-eyebrow text-green-500">(1)</td>
            <td className="border-r border-l border-blue-300  bg-blue-100   px-3 py-1 text-center text-eyebrow text-blue-500">(2)</td>
            <td className="border-r         border-blue-300    bg-blue-100   px-3 py-1 text-center text-eyebrow text-blue-500">(3)</td>
            <td className="border-r         border-blue-300    bg-blue-100   px-3 py-1 text-center text-eyebrow text-blue-500">(4)</td>
            <td className="border-r border-l border-orange-300 bg-orange-100 px-3 py-1 text-center text-eyebrow text-orange-500">(5)</td>
            <td className="border-r         border-border    bg-card     px-3 py-1 text-center text-eyebrow text-muted-foreground/50">(6)</td>
            <td className="border-r         border-border    bg-card     px-3 py-1 text-center text-eyebrow text-muted-foreground/50">(7)</td>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {displayRows.map((row, rowIdx) => {
            const total    = row.current_total ?? 0;
            const proposed = row.proposed ?? 0;
            const increase = proposed - total;
            const percent  = total === 0
              ? (proposed === 0 ? null : 100)
              : (increase / total) * 100;

            const editable = isEditable(row);
            const isSaving = savingRows.has(row.id);
            const indent   = row.level * 16;

            const incColor = increase > 0 ? "text-green-600" : increase < 0 ? "text-red-500" : "text-gray-500";
            const pctColor = percent !== null
              ? percent > 0 ? "text-green-600" : percent < 0 ? "text-red-500" : "text-gray-500"
              : "";

            if (row.isGrandTotal) {
              return (
                <tr key={row.id} className="bg-foreground text-background">
                  <td className="sticky left-0 z-10 bg-foreground px-4 py-3 text-table-header text-background/70 shadow-[2px_0_4px_-2px_rgba(0,0,0,0.3)]">
                    {row.name}
                  </td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_PAST_GRAND)}>{fmtNum(row.past_obligation)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.current_sem1)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.current_sem2)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.current_total)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_BUDGET_GRAND)}>{fmtNum(row.proposed)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-background/20", incColor)}>{fmtNum(increase)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-background/20", pctColor)}>{fmtPct(percent)}</td>
                </tr>
              );
            }

            if (row.isSubtotal) {
  return (
    <tr key={row.id} className="bg-muted/50">
      <td className="sticky left-0 z-10 bg-muted px-4 py-2.5 text-table-grand-total text-foreground border-r border-border shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]" style={{ paddingLeft: indent + 16 }}>
        {row.name}
      </td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-foreground/80 tabular-nums border-l", "bg-green-100 border-green-300")}>{fmtNum(row.past_obligation)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-foreground/80 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.current_sem1)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-foreground/80 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.current_sem2)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-foreground/80 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.current_total)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-foreground/80 tabular-nums border-l", COL_BUDGET_SUB)}>{fmtNum(row.proposed)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-border", incColor)}>{fmtNum(increase)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-border", pctColor)}>{fmtPct(percent)}</td>
                </tr>
              );
            }

            return (
              <tr key={row.id} className="bg-card hover:bg-muted/40 transition-colors">
                <td className="sticky left-0 z-10 bg-card border-r border-border px-4 py-2.5 text-foreground/90 max-w-[260px] shadow-[2px_0_4px_-2px_rgba(0,0,0,0.15)]" style={{ paddingLeft: indent + 16 }}>
                  <span className="line-clamp-2">{row.name}</span>
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-r border-green-300", "bg-green-100/50")}>
                  {isPastEditable(row) && canEditPastAndSem1 ? (
  <input
    type="text"
    inputMode="decimal"
    className="w-full text-right text-table-secondary font-mono h-7 px-2 rounded border bg-white border-green-300 focus:outline-none focus:ring-2 focus:ring-green-300 tabular-nums placeholder:text-gray-300"
    value={getDraftValue(`${row.id}_past_obligation`, row.past_obligation)}
    onChange={(e) => {
      const pos = e.target.selectionStart ?? e.target.value.length;
      handlePastObligationChange(row.id, e.target.value, e.target, pos);
    }}
    onBlur={() => {
      clearDraft(`${row.id}_past_obligation`);
      savePastObligation(row.id, row.past_obligation);
    }}
    onKeyDown={blurOnEnter}
    tabIndex={1000 + rowIdx}
    placeholder="0"
  />
) : (
  <div className="text-right font-mono text-foreground/70 tabular-nums px-2">{fmtNum(row.past_obligation)}</div>
)}
                </td>
                <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
                  {editable && canEditPastAndSem1 ? (
  <input type="text" inputMode="decimal"
    className={cn("w-full text-right text-table-secondary font-mono h-7 px-2 rounded border bg-card",
      "border-border focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300",
      "placeholder:text-muted-foreground/50 tabular-nums", isSaving && "opacity-50 pointer-events-none")}    // value={fmtInput(row.sem1)}
    value={getDraftValue(`${row.id}_sem1`, row.current_sem1)}
    onChange={(e) => {
      const pos = e.target.selectionStart ?? e.target.value.length;
      handleSem1Change(row.id, e.target.value, e.target, pos);
    }}
    onBlur={() => { clearDraft(`${row.id}_sem1`); saveRow(row.id); }}
    onKeyDown={blurOnEnter}
    tabIndex={2000 + rowIdx}
    disabled={isSaving}
    placeholder="0"
  />
) : (
  <div className="text-right font-mono text-muted-foreground tabular-nums px-2">{fmtNum(row.current_sem1)}</div>
)}
                </td>
                <td className={cn("border-r px-3 py-2.5 text-right font-mono text-muted-foreground tabular-nums", COL_CURR)}>{fmtNum(row.current_sem2)}</td>
                <td className={cn("border-r px-3 py-2.5 text-right font-mono text-foreground/70 tabular-nums", COL_CURR)}>{fmtNum(row.current_total)}</td>
                <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
                  {editable && canEditBudgetYear ? (
  <input type="text" inputMode="decimal"
    className={cn("w-full text-right text-table-secondary font-mono h-7 px-2 rounded border bg-card",
      "border-border focus:outline-none focus:ring-2 focus:ring-orange-300",
      "tabular-nums placeholder:text-muted-foreground/50", isSaving && "opacity-50 pointer-events-none")}
    value={getDraftValue(`${row.id}_proposed`, row.proposed)}
    onChange={(e) => {
      const pos = e.target.selectionStart ?? e.target.value.length;
      handleAmountChange(row.id, e.target.value, e.target, pos);
    }}
    onBlur={() => { clearDraft(`${row.id}_proposed`); saveRow(row.id); }}
    onKeyDown={blurOnEnter}
    tabIndex={3000 + rowIdx}
    disabled={isSaving}
    placeholder="0"
    autoComplete="off"
  />
) : (
  <div className="text-right font-mono text-muted-foreground tabular-nums px-2">{fmtNum(row.proposed)}</div>
)}
                </td>
                <td className={cn("border-r border-border px-3 py-2.5 text-right font-mono tabular-nums", incColor)}>{fmtNum(increase)}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", pctColor)}>{fmtPct(percent)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  // ── Mobile card renderer (stacked layout — no horizontal table scroll) ─────
  const renderMobileList = () => (
    <div className="space-y-2">
      {displayRows.map((row, rowIdx) => {
        const total    = row.current_total ?? 0;
        const proposed = row.proposed ?? 0;
        const increase = proposed - total;
        const percent  = total === 0
          ? (proposed === 0 ? null : 100)
          : (increase / total) * 100;

        const editable  = isEditable(row);
        const isSaving  = savingRows.has(row.id);
        const indent    = row.level * 10;
        const incColor  = increase > 0 ? "text-green-600" : increase < 0 ? "text-red-500" : "text-gray-500";
        const pctColor  = percent !== null
          ? percent > 0 ? "text-green-600" : percent < 0 ? "text-red-500" : "text-gray-500"
          : "";

        const cardBase = row.isGrandTotal
          ? "bg-foreground text-background"
          : row.isSubtotal
          ? "bg-muted/50"
          : "bg-card";

        return (
          <div key={row.id} className={cn("rounded-lg border border-border p-3", cardBase)}>
            <p
              className={cn(
                "text-[13px] font-semibold mb-2",
                row.isGrandTotal ? "text-background" : "text-foreground",
              )}
              style={{ paddingLeft: row.isSubtotal || (!row.isGrandTotal && !row.isSubtotal) ? indent : 0 }}
            >
              {row.name}
            </p>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              {/* Past Year (Actual) — green */}
              <div className={cn("rounded-md border px-2 py-1.5", row.isGrandTotal ? COL_PAST_GRAND : row.isSubtotal ? COL_PAST_SUB : COL_PAST)}>
                <p className={cn("mb-0.5", row.isGrandTotal ? "text-green-300/70" : "text-green-700/70")}>Past Year (Actual)</p>
                {isPastEditable(row) && canEditPastAndSem1 ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className="w-full text-right font-mono h-7 px-2 rounded border bg-white border-green-300 focus:outline-none focus:ring-2 focus:ring-green-300 tabular-nums"
                    value={getDraftValue(`${row.id}_past_obligation`, row.past_obligation)}
                    onChange={(e) => {
                      const pos = e.target.selectionStart ?? e.target.value.length;
                      handlePastObligationChange(row.id, e.target.value, e.target, pos);
                    }}
                    onBlur={() => { clearDraft(`${row.id}_past_obligation`); savePastObligation(row.id, row.past_obligation); }}
                    onKeyDown={blurOnEnter}
                    placeholder="0"
                  />
                ) : (
                  <p className={cn("font-mono text-right", row.isGrandTotal ? "text-green-300" : "text-green-900")}>{fmtNum(row.past_obligation)}</p>
                )}
              </div>

              {/* Budget Year — orange */}
              <div className={cn("rounded-md border px-2 py-1.5", row.isGrandTotal ? COL_BUDGET_GRAND : row.isSubtotal ? COL_BUDGET_SUB : COL_BUDGET)}>
                <p className={cn("mb-0.5", row.isGrandTotal ? "text-orange-300/70" : "text-orange-700/70")}>Budget Year {meta?.year}</p>
                {editable && canEditBudgetYear ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={cn("w-full text-right font-mono h-7 px-2 rounded border bg-white border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300 tabular-nums", isSaving && "opacity-50 pointer-events-none")}
                    value={getDraftValue(`${row.id}_proposed`, row.proposed)}
                    onChange={(e) => {
                      const pos = e.target.selectionStart ?? e.target.value.length;
                      handleAmountChange(row.id, e.target.value, e.target, pos);
                    }}
                    onBlur={() => { clearDraft(`${row.id}_proposed`); saveRow(row.id); }}
                    onKeyDown={blurOnEnter}
                    disabled={isSaving}
                    placeholder="0"
                  />
                ) : (
                  <p className={cn("font-mono text-right font-semibold", row.isGrandTotal ? "text-orange-300" : "text-orange-900")}>{fmtNum(row.proposed)}</p>
                )}
              </div>

              {/* 1st Semester — blue */}
              <div className={cn("rounded-md border px-2 py-1.5", row.isGrandTotal ? COL_CURR_GRAND : row.isSubtotal ? COL_CURR_SUB : COL_CURR)}>
                <p className={cn("mb-0.5", row.isGrandTotal ? "text-blue-300/70" : "text-blue-700/70")}>1st Sem {meta?.current_year}</p>
                {editable && canEditPastAndSem1 ? (
                  <input
                    type="text"
                    inputMode="decimal"
                    className={cn("w-full text-right font-mono h-7 px-2 rounded border bg-white border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-300 tabular-nums", isSaving && "opacity-50 pointer-events-none")}
                    value={getDraftValue(`${row.id}_sem1`, row.current_sem1)}
                    onChange={(e) => {
                      const pos = e.target.selectionStart ?? e.target.value.length;
                      handleSem1Change(row.id, e.target.value, e.target, pos);
                    }}
                    onBlur={() => { clearDraft(`${row.id}_sem1`); saveRow(row.id); }}
                    onKeyDown={blurOnEnter}
                    disabled={isSaving}
                    placeholder="0"
                  />
                ) : (
                  <p className={cn("font-mono text-right", row.isGrandTotal ? "text-blue-300" : "text-blue-900")}>{fmtNum(row.current_sem1)}</p>
                )}
              </div>

              {/* 2nd Semester — blue (auto, read-only) */}
              <div className={cn("rounded-md border px-2 py-1.5", row.isGrandTotal ? COL_CURR_GRAND : row.isSubtotal ? COL_CURR_SUB : COL_CURR)}>
                <p className={cn("mb-0.5", row.isGrandTotal ? "text-blue-300/70" : "text-blue-700/70")}>2nd Sem (auto)</p>
                <p className={cn("font-mono text-right", row.isGrandTotal ? "text-blue-300" : "text-blue-900")}>{fmtNum(row.current_sem2)}</p>
              </div>

              {/* Increase / Decrease — neutral, full width */}
              <div className="rounded-md border border-border bg-card px-2 py-1.5">
                <p className="text-muted-foreground/60 mb-0.5">Increase / Decrease</p>
                <p className={cn("font-mono text-right", incColor)}>{fmtNum(increase)}</p>
              </div>

              {/* % Change — neutral, full width */}
              <div className="rounded-md border border-border bg-card px-2 py-1.5">
                <p className="text-muted-foreground/60 mb-0.5">% Change</p>
                <p className={cn("font-mono text-right", pctColor)}>{fmtPct(percent)}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );

  const renderLegend = () => (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-table-secondary">
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />
        <span className="text-green-600 font-semibold">Green</span> = Past Year (Actual)
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
        <span className="text-blue-600 font-semibold">Blue</span> = Current year · 2nd sem derived automatically
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
        <span className="text-orange-600 font-semibold">Orange</span> = Budget year · enter amount directly
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-muted border border-border inline-block" />
        Subtotals and grand total are computed automatically
      </span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

 const renderContent = () => (
    <>
      {isMobile ? (
        loading ? (
          <div className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-lg" />
            ))}
          </div>
        ) : renderMobileList()
      ) : (
        <ShadcnCard className="rounded-xl overflow-hidden shadow-sm">
          {loading ? <TableSkeleton /> : renderTable()}
        </ShadcnCard>
      )}
      {!loading && renderLegend()}
    </>
  );
  if (availableSources.length > 1) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-eyebrow">LBP Form 1 · Receipts Program</span>
          </div>
          <h1 className="text-page-title">Income Fund</h1>
        </div>
        <Tabs value={currentSource} onValueChange={handleSourceChange} className="w-full">
           <TabsList className="h-9 bg-muted border border-border rounded-lg p-1 mb-5 w-fit max-w-full flex-wrap justify-start">
            {availableSources.map((s) => (
              <TabsTrigger key={s.id} value={s.id}
                className="text-subtitle px-4 rounded-md data-[state=active]:bg-primary data-[state=active]:shadow-sm data-[state=active]:text-primary-foreground text-muted-foreground hover:text-foreground">
                {s.name}
              </TabsTrigger>
            ))}
          </TabsList>
          {availableSources.map((s) => (
            <TabsContent key={s.id} value={s.id} className="mt-0">
              {renderContent()}
            </TabsContent>
          ))}
        </Tabs>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-eyebrow">Receipts Program</span>
          <span className="text-eyebrow text-muted-foreground/50">·</span>
          <span className="text-meta">{/* remove font-medium since text-meta has font-weight */}FY {meta?.past_year} – {meta?.year}</span>
          <span className="text-eyebrow text-muted-foreground/50">·</span>
          <span className="text-meta">{meta?.source ? sourceName(meta.source) : sourceName(currentSource)}</span>
        </div>
        <h1 className="text-page-title">Income Fund</h1>
      </div>
      {renderContent()}
    </div>
  );
}
