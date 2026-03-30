// components/admin/LdrrmfipPage.tsx
import React, { useEffect, useState, useCallback } from "react";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { LoadingState } from "@/src/pages/common/LoadingState";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/src/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";
import { Skeleton } from "@/src/components/ui/skeleton";
import { useAuth } from "@/src/hooks/useAuth";
import { LdrrmfipUpload } from "@/src/components/ldrrmfip/LdrrmfipUpload";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
// ─── Types ────────────────────────────────────────────────────────────────────

interface FundSource {
  id:               string;
  label:            string;
  type:             "general" | "special";
  dept_abbreviation?: string;
}

interface Category {
  ldrrmfip_category_id: number;
  name: string;
  sort_order: number;
}

interface LdrrmfipItem {
  ldrrmfip_item_id:     number;
  budget_plan_id:       number;
  ldrrmfip_category_id: number;
  source:               string;
  description:          string;
  implementing_office:  string;
  starting_date:        string | null;
  completion_date:      string | null;
  expected_output:      string | null;
  funding_source:       string;
  mooe:                 number;
  co:                   number;
  total:                number;
}

interface CategoryGroup {
  ldrrmfip_category_id: number;
  name:                 string;
  sort_order:           number;
  items:                LdrrmfipItem[];
  subtotal_mooe:        number;
  subtotal_co:          number;
  subtotal_total:       number;
}

interface Summary {
  total_70pct:   number;
  reserved_30:   number;
  calamity_fund: number;
  source:        string;
}

const QUARTERS = ["1st Qrtr", "2nd Qrtr", "3rd Qrtr", "4th Qrtr"];

const EMPTY_FORM = {
  ldrrmfip_category_id: "",
  description:          "",
  implementing_office:  "LDRRMO",
  starting_date:        "",
  completion_date:      "",
  expected_output:      "",
  funding_source:       "LDRRMF",
  mooe:                 "",
  co:                   "",
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const enPH  = (v: number) => v === 0 ? "–" : Math.round(v).toLocaleString("en-PH");
const peso  = (v: number) => v === 0 ? "–" : `₱ ${Math.round(Math.abs(v)).toLocaleString("en-PH")}`;

// ─── Sub-header label for the fund source ─────────────────────────────────────

function sourceFundLabel(source: FundSource): string {
  if (source.type === "general") return "5% Calamity Fund (GENERAL FUND)";
  return `5% Calamity Fund (SPECIAL ACCOUNT for ${source.label.toUpperCase()})`;
}

// --- SKELETON -------------------------------------------------------------
// ─── LDRRMFIP Table Skeleton ──────────────────────────────────────────────────
// Mirrors 10-column layout per category group:
// Description | Impl.Office | StartDate | CompDate | ExpOutput | FundSrc | MOOE | CO | TOTAL | actions

function LdrrmfipTableSkeleton() {
  return (
    <div className="space-y-5">
      {/* Sub-header */}
      <div className="text-center space-y-1.5">
        <Skeleton className="h-3 w-48 mx-auto rounded bg-red-100" />
        <Skeleton className="h-3 w-64 mx-auto rounded" />
      </div>

      {/* Two category groups */}
      {[0, 1].map(gi => (
        <div key={gi} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          <table className="w-full border-collapse text-[12px]">
            <thead>
              {/* Category header with Add button */}
              <tr className="bg-gray-50 border-b border-gray-200">
                <td colSpan={10} className="px-4 py-2">
                  <div className="flex items-center justify-between">
                    <Skeleton className={cn("h-3 rounded", gi === 0 ? "w-48" : "w-36")} />
                    <Skeleton className="h-7 w-20 rounded-lg" />
                  </div>
                </td>
              </tr>
              {/* Column headers — dark slate */}
              <tr className="bg-slate-700">
                {[
                  "w-[28%]","w-[9%]","w-[8%]","w-[8%]","w-[12%]","w-[7%]","w-[9%]","w-[9%]","w-[9%]","w-8"
                ].map((w, ci) => (
                  <th key={ci} className={cn("px-3 py-2 border-r border-slate-600", w)}>
                    <Skeleton className={cn("h-2.5 rounded bg-slate-500", ci === 0 ? "w-4/5" : ci >= 6 ? "w-8 ml-auto" : "w-3/4")} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {Array.from({ length: 3 }).map((_, ri) => (
                <tr key={ri} className={cn(ri % 2 === 1 && "bg-gray-50/40")} style={{ animationDelay: `${(gi * 3 + ri) * 50}ms` }}>
                  {/* Description + delete icon */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <Skeleton className={cn("h-3 rounded", ri % 2 === 0 ? "w-4/5" : "w-3/4")} />
                  </td>
                  {/* Impl office */}
                  <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                    <Skeleton className="h-3 w-14 mx-auto rounded" />
                  </td>
                  {/* Start / completion dates */}
                  <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                    <Skeleton className="h-3 w-12 mx-auto rounded" />
                  </td>
                  <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                    <Skeleton className="h-3 w-12 mx-auto rounded" />
                  </td>
                  {/* Expected output */}
                  <td className="px-3 py-2.5 border-r border-gray-100">
                    <Skeleton className="h-3 w-full rounded" />
                  </td>
                  {/* Funding source badge */}
                  <td className="px-3 py-2.5 border-r border-gray-100 text-center">
                    <Skeleton className="h-5 w-14 mx-auto rounded bg-teal-100" />
                  </td>
                  {/* MOOE */}
                  <td className="px-3 py-2.5 border-r border-gray-100 text-right">
                    <Skeleton className="h-3 w-16 ml-auto rounded" />
                  </td>
                  {/* CO */}
                  <td className="px-3 py-2.5 border-r border-gray-100 text-right">
                    <Skeleton className="h-3 w-10 ml-auto rounded" />
                  </td>
                  {/* Total */}
                  <td className="px-3 py-2.5 border-r border-gray-100 text-right">
                    <Skeleton className="h-3 w-16 ml-auto rounded" />
                  </td>
                  {/* Actions */}
                  <td className="w-8" />
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-200">
                <td colSpan={6} className="px-4 py-2 text-right">
                  <Skeleton className="h-3 w-28 ml-auto rounded bg-gray-200" />
                </td>
                {[0,1,2].map(i => (
                  <td key={i} className="px-3 py-2 border-l border-gray-200">
                    <Skeleton className="h-3 w-16 ml-auto rounded bg-gray-200" />
                  </td>
                ))}
                <td className="w-8" />
              </tr>
            </tfoot>
          </table>
        </div>
      ))}

      {/* Summary footer skeleton */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-[12.5px] border-collapse">
          <tbody>
            {["border-b border-gray-100","border-b border-gray-100","bg-blue-50/40 border-t border-blue-100"].map((cls, i) => (
              <tr key={i} className={cls}>
                <td className="px-5 py-3">
                  <Skeleton className={cn("h-3 rounded", i === 2 ? "w-4/5 bg-blue-100" : "w-3/4")} />
                </td>
                <td className="px-5 py-3 w-52">
                  <Skeleton className={cn("h-4 w-24 ml-auto rounded", i === 2 ? "bg-blue-200" : "bg-gray-200")} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
// ─── Main Component ───────────────────────────────────────────────────────────

export default function LdrrmfipPage() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

  const [sources,     setSources]     = useState<FundSource[]>([]);
  const [activeSource,setActiveSource]= useState<string>("general-fund");
  const [categories,  setCategories]  = useState<Category[]>([]);

  // Per-source state
  const [groupsMap,  setGroupsMap]  = useState<Record<string, CategoryGroup[]>>({});
  const [summaryMap, setSummaryMap] = useState<Record<string, Summary>>({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem,   setEditItem]   = useState<LdrrmfipItem | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);

  const [deleteItem, setDeleteItem] = useState<LdrrmfipItem | null>(null);

  const activePlanId = activePlan?.budget_plan_id ?? null;

  // ── Load sources + categories once ────────────────────────────────────────

  // const { user } = useAuth();
   
  // useEffect(() => {
  //   Promise.all([
  //     API.get("/ldrrmfip/sources"),
  //     API.get("/ldrrmfip/categories"),
  //   ]).then(([srcRes, catRes]) => {
  //     const srcs: FundSource[] = srcRes.data.data ?? [];
  //     setSources(srcs);
  //     setCategories(catRes.data.data ?? []);
  //     if (srcs.length > 0) setActiveSource(srcs[0].id);
  //   }).catch(() => toast.error("Failed to load LDRRMFIP metadata."));
  // }, []);
  const { user } = useAuth();

useEffect(() => {
  Promise.all([
    API.get("/ldrrmfip/sources"),
    API.get("/ldrrmfip/categories"),
  ]).then(([srcRes, catRes]) => {
    let srcs: FundSource[] = srcRes.data.data ?? [];

    // Filter sources based on role + URL path (mirrors IncomeFundPage)
    if (user?.role === "department-head") {
      const path = window.location.pathname;
      if (path.includes("sh-cf"))  srcs = srcs.filter(s => s.id === "sh");
      else if (path.includes("occ-cf")) srcs = srcs.filter(s => s.id === "occ");
      else if (path.includes("pm-cf"))  srcs = srcs.filter(s => s.id === "pm");
    }

    setCategories(catRes.data.data ?? []);
    setSources(srcs);
    if (srcs.length > 0) setActiveSource(srcs[0].id);
  }).catch(() => toast.error("Failed to load LDRRMFIP metadata."));
}, [user]);

  // ── Load data for the active source whenever it or the plan changes ────────

  const fetchSource = useCallback(async (source: string) => {
    if (!activePlanId) return;
    setLoadingMap(prev => ({ ...prev, [source]: true }));
    try {
      const [groupsRes, summaryRes] = await Promise.all([
        API.get("/ldrrmfip",         { params: { budget_plan_id: activePlanId, source } }),
        API.get("/ldrrmfip/summary", { params: { budget_plan_id: activePlanId, source } }),
      ]);
      setGroupsMap(prev  => ({ ...prev,  [source]: groupsRes.data.data   ?? [] }));
      setSummaryMap(prev => ({ ...prev,  [source]: summaryRes.data.data  ?? null }));
    } catch {
      toast.error(`Failed to load data for ${source}.`);
    } finally {
      setLoadingMap(prev => ({ ...prev, [source]: false }));
    }
  }, [activePlanId]);

  useEffect(() => {
    if (activePlanId && activeSource) fetchSource(activeSource);
  }, [activePlanId, activeSource, fetchSource]);

  // ── Dialog helpers ─────────────────────────────────────────────────────────

  const openAdd = (categoryId: number) => {
    setEditItem(null);
    setForm({ ...EMPTY_FORM, ldrrmfip_category_id: String(categoryId) });
    setDialogOpen(true);
  };

  const openEdit = (item: LdrrmfipItem) => {
    setEditItem(item);
    setForm({
      ldrrmfip_category_id: String(item.ldrrmfip_category_id),
      description:          item.description,
      implementing_office:  item.implementing_office,
      starting_date:        item.starting_date   ?? "",
      completion_date:      item.completion_date ?? "",
      expected_output:      item.expected_output ?? "",
      funding_source:       item.funding_source,
      mooe:                 item.mooe > 0 ? String(item.mooe) : "",
      co:                   item.co   > 0 ? String(item.co)   : "",
    });
    setDialogOpen(true);
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!activePlanId) return;
    if (!form.ldrrmfip_category_id) { toast.error("Category is required."); return; }
    if (!form.description.trim())   { toast.error("Description is required."); return; }

    setSaving(true);
    try {
      const payload = {
        budget_plan_id:       activePlanId,
        source:               activeSource,
        ldrrmfip_category_id: Number(form.ldrrmfip_category_id),
        description:          form.description.trim(),
        implementing_office:  form.implementing_office  || "LDRRMO",
        starting_date:        form.starting_date        || null,
        completion_date:      form.completion_date       || null,
        expected_output:      form.expected_output       || null,
        funding_source:       form.funding_source        || "LDRRMF",
        mooe:                 parseFloat(form.mooe as string) || 0,
        co:                   parseFloat(form.co   as string) || 0,
      };

      if (editItem) {
        await API.put(`/ldrrmfip/${editItem.ldrrmfip_item_id}`, payload);
        toast.success("Item updated.");
      } else {
        await API.post("/ldrrmfip", payload);
        toast.success("Item added.");
      }
      setDialogOpen(false);
      fetchSource(activeSource);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      toast.error(e?.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────────

  // const handleDelete = async (item: LdrrmfipItem) => {
  //   if (!confirm(`Remove "${item.description}"?`)) return;
  //   try {
  //     await API.delete(`/ldrrmfip/${item.ldrrmfip_item_id}`);
  //     toast.success("Item removed.");
  //     fetchSource(activeSource);
  //   } catch {
  //     toast.error("Delete failed.");
  //   }
  // };
  const handleDelete = (item: LdrrmfipItem) => {
    setDeleteItem(item);
  };

  const confirmDelete = async () => {
    if (!deleteItem) return;
    try {
      await API.delete(`/ldrrmfip/${deleteItem.ldrrmfip_item_id}`);
      toast.success("Item removed.");
      fetchSource(activeSource);
    } catch {
      toast.error("Delete failed.");
    } finally {
      setDeleteItem(null);
    }
  };

  // ── Guards ─────────────────────────────────────────────────────────────────

  if (planLoading) return <LoadingState />;
  if (!activePlan) return (
    <div className="flex items-center justify-center h-64">
      <p className="text-gray-500 text-sm">No active budget plan found.</p>
    </div>
  );

  const year          = activePlan.year;
  const activeSourceObj = sources.find(s => s.id === activeSource) ?? {
    id: "general-fund", label: "General Fund", type: "general" as const,
  };

  // ── Shared table renderer ──────────────────────────────────────────────────

  const renderTable = (source: string) => {
    const groups  = groupsMap[source]  ?? [];
    const summary = summaryMap[source] ?? null;
    const isLoading = loadingMap[source] ?? false;
    const srcObj  = sources.find(s => s.id === source) ?? activeSourceObj;

   if (isLoading) return <LdrrmfipTableSkeleton />;

    return (
      <div className="space-y-5">

        {/* ── Source sub-header ──────────────────────────────────────────── */}
        <div className="text-center space-y-0.5">
          <p className="text-[11px] font-bold uppercase tracking-widest text-red-500">
            {sourceFundLabel(srcObj)}
          </p>
          <p className="text-[11px] text-gray-400">
            January to December {year} · Municipality of Opol, Misamis Oriental
          </p>
        </div>

        {/* ── Category tables ─────────────────────────────────────────────── */}
        {groups.map((group) => (
          <div key={group.ldrrmfip_category_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full border-collapse text-[12px]">
              <thead>
                {/* Category header row with inline Add Item button */}
                <tr className="bg-gray-50 border-b border-gray-200">
                  <td colSpan={10} className="px-4 py-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-gray-700 uppercase tracking-wide">
                        {group.name}
                      </span>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm" variant="outline"
                            className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
                            onClick={() => { setActiveSource(source); openAdd(group.ldrrmfip_category_id); }}
                          >
                            <PlusIcon className="w-3.5 h-3.5" />
                            Add Item
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="left" className="text-xs">
                          Add item in {group.name}
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </td>
                </tr>

                {/* Column headers */}
                <tr className="bg-slate-700 text-slate-300 text-[10.5px]">
                  <th className="px-3 py-2 text-left font-semibold border-r border-slate-600 w-[28%]">Program/Project/Activity Code and Description</th>
                  <th className="px-3 py-2 text-left font-semibold border-r border-slate-600 w-[9%]">Implementing Office</th>
                  <th className="px-3 py-2 text-center font-semibold border-r border-slate-600 w-[8%]">Starting Date</th>
                  <th className="px-3 py-2 text-center font-semibold border-r border-slate-600 w-[8%]">Completion Date</th>
                  <th className="px-3 py-2 text-left font-semibold border-r border-slate-600 w-[12%]">Expected Output</th>
                  <th className="px-3 py-2 text-center font-semibold border-r border-slate-600 w-[7%]">Funding Source</th>
                  <th className="px-3 py-2 text-right font-semibold border-r border-slate-600 w-[9%]">MOOE</th>
                  <th className="px-3 py-2 text-right font-semibold border-r border-slate-600 w-[9%]">CO</th>
                  <th className="px-3 py-2 text-right font-semibold border-r border-slate-600 w-[9%]">TOTAL</th>
                  <th className="w-8" />
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {group.items.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-6 text-center text-gray-400 text-[12px] italic">
                      No items yet.
                    </td>
                  </tr>
                ) : (
                  group.items.map((item, idx) => (
                    <tr
                      key={item.ldrrmfip_item_id}
                      className={cn(
                        "hover:bg-gray-50/60 transition-colors group",
                        idx % 2 === 1 && "bg-gray-50/40"
                      )}
                    >
                      <td className="px-3 py-2.5 text-gray-800 leading-snug border-r border-gray-100">
                        <div className="flex items-center justify-between gap-1">
                          <button
                            className="text-left hover:text-blue-600 transition-colors leading-snug"
                            onClick={() => { setActiveSource(source); openEdit(item); }}
                            title="Click to edit"
                          >
                            {item.description}
                          </button>
                          <button
                            onClick={() => handleDelete(item)}
                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 opacity-0 group-hover:opacity-100"
                            title="Remove"
                          >
                            <TrashIcon className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600 text-center border-r border-gray-100">{item.implementing_office}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-center border-r border-gray-100">{item.starting_date ?? "–"}</td>
                      <td className="px-3 py-2.5 text-gray-600 text-center border-r border-gray-100">{item.completion_date ?? "–"}</td>
                      <td className="px-3 py-2.5 text-gray-600 leading-snug border-r border-gray-100">{item.expected_output ?? "–"}</td>
                      <td className="px-3 py-2.5 text-center border-r border-gray-100">
                        <span className="text-[10px] font-semibold bg-teal-50 text-teal-700 border border-teal-200 rounded px-1.5 py-0.5">
                          {item.funding_source}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-700 border-r border-gray-100">{enPH(item.mooe)}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums text-gray-700 border-r border-gray-100">{enPH(item.co)}</td>
                      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-gray-900 border-r border-gray-100">{enPH(item.total)}</td>
                      <td className="w-8" />
                    </tr>
                  ))
                )}
              </tbody>

              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-200">
                  <td colSpan={6} className="px-4 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-gray-600">
                    Total {group.name}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-gray-700 border-l border-gray-200">{enPH(group.subtotal_mooe)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-semibold text-gray-700">{enPH(group.subtotal_co)}</td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums font-bold text-gray-900">{enPH(group.subtotal_total)}</td>
                  <td className="w-8" />
                </tr>
              </tfoot>
            </table>
          </div>
        ))}

        {/* ── Summary footer ──────────────────────────────────────────────── */}
        {summary && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-[12.5px] border-collapse">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-5 py-3 text-gray-700">
                    <span className="font-semibold text-gray-900">A.</span>{" "}
                    Total (70% of the 5% CF, Preparedness Fund for CY{year})
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-gray-900 w-52">
                    {peso(summary.total_70pct)}
                  </td>
                </tr>

                <tr className="border-b border-gray-100">
                  <td className="px-5 py-3 text-gray-700">
                    <span className="font-semibold text-gray-900">B.</span>{" "}
                    Total Reserved for Actual Calamity (30%) for Calendar Year {year}
                    <span className="ml-1.5 text-[10.5px] text-gray-400">(C − A)</span>
                  </td>
                  <td className={cn(
                    "px-5 py-3 text-right font-mono tabular-nums font-bold w-52",
                    summary.reserved_30 < 0 ? "text-red-600" : "text-gray-900"
                  )}>
                    {summary.reserved_30 < 0
                      ? `-₱ ${Math.round(Math.abs(summary.reserved_30)).toLocaleString("en-PH")}`
                      : peso(summary.reserved_30)
                    }
                  </td>
                </tr>

                <tr className="bg-blue-50/40 border-t border-blue-100">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-gray-900">C.</span>{" "}
                    <span className="text-gray-700">Total 5% Calamity Fund Reserved for CY{year}</span>{" "}
                    <span className="inline-flex items-center gap-1 ml-1.5 text-[10px] font-semibold
                      bg-blue-100 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 align-middle">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-none" />
                      derived · 5% of {srcObj.type === "general" ? "General Fund" : srcObj.label}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-right font-mono tabular-nums font-bold text-blue-600 w-52">
                    {peso(summary.calamity_fund)}
                  </td>
                </tr>
              </tbody>

            </table>
          </div>
        )}
      </div>
    );
  };

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="p-5 space-y-4">

      {/* ── Page Header ───────────────────────────────────────────────────── */}
      {/* <div>
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">
            LDRRMF Investment Plan
          </span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-semibold text-gray-500">CY {year}</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
          LOCAL DISASTER RISK REDUCTION & MANAGEMENT FUND INVESTMENT PLAN
        </h1>
      </div> */}
      <div className="flex items-center justify-between">
  <div>
    <div className="flex items-center gap-2 mb-0.5">
      <span className="text-[10px] font-bold tracking-[0.14em] uppercase text-gray-400">
        LDRRMF Investment Plan
      </span>
      <span className="text-gray-300 text-[10px]">·</span>
      <span className="text-[10px] font-semibold text-gray-500">CY {year}</span>
    </div>
    <h1 className="text-xl font-bold text-gray-900 tracking-tight leading-tight">
      LOCAL DISASTER RISK REDUCTION & MANAGEMENT FUND INVESTMENT PLAN
    </h1>
  </div>
  {activePlanId && (
    <LdrrmfipUpload
      activePlanId={activePlanId}
      activeSource={activeSource}
      sources={sources}
      categories={categories}
      onSuccess={() => fetchSource(activeSource)}
    />
  )}
</div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      {sources.length > 0 ? (
        <Tabs value={activeSource} onValueChange={setActiveSource} className="w-full">
          <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1">
            {sources.map(src => (
              <TabsTrigger
                key={src.id}
                value={src.id}
                className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500"
              >
                {src.type === "general" ? "General Fund" : src.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {sources.map(src => (
            <TabsContent key={src.id} value={src.id} className="mt-4">
              {renderTable(src.id)}
            </TabsContent>
          ))}
        </Tabs>
      ) : (
        <LoadingState />
      )}

      {/* ── Add / Edit Dialog ──────────────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-[15px]">
              {editItem ? "Edit Item" : "Add New Item"}
              <span className="ml-2 text-[11px] font-normal text-gray-400">
                — {sourceFundLabel(activeSourceObj)}
              </span>
            </DialogTitle>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Functional Classification *</Label>
              <Select
                value={form.ldrrmfip_category_id}
                onValueChange={v => setForm(p => ({ ...p, ldrrmfip_category_id: v }))}
              >
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder="Select category…" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(c => (
                    <SelectItem key={c.ldrrmfip_category_id} value={String(c.ldrrmfip_category_id)}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Program/Project/Activity Description *</Label>
              <Input
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                className="h-8 text-sm"
                placeholder="e.g. Procurement of Road Safety Equipment"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Implementing Office</Label>
              <Input value={form.implementing_office} onChange={e => setForm(p => ({ ...p, implementing_office: e.target.value }))} className="h-8 text-sm" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Funding Source</Label>
              <Input value={form.funding_source} onChange={e => setForm(p => ({ ...p, funding_source: e.target.value }))} className="h-8 text-sm" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Starting Date</Label>
              <Select value={form.starting_date} onValueChange={v => setForm(p => ({ ...p, starting_date: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select quarter…" /></SelectTrigger>
                <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Completion Date</Label>
              <Select value={form.completion_date} onValueChange={v => setForm(p => ({ ...p, completion_date: v }))}>
                <SelectTrigger className="h-8 text-sm"><SelectValue placeholder="Select quarter…" /></SelectTrigger>
                <SelectContent>{QUARTERS.map(q => <SelectItem key={q} value={q}>{q}</SelectItem>)}</SelectContent>
              </Select>
            </div>

            <div className="col-span-2 space-y-1">
              <Label className="text-xs">Expected Output</Label>
              <Input value={form.expected_output} onChange={e => setForm(p => ({ ...p, expected_output: e.target.value }))} className="h-8 text-sm" placeholder="e.g. Increase Level of Response" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">MOOE (₱)</Label>
              <Input type="number" min={0} step={1000} value={form.mooe} onChange={e => setForm(p => ({ ...p, mooe: e.target.value }))} className="h-8 text-sm text-right font-mono" placeholder="0" />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Capital Outlay / CO (₱)</Label>
              <Input type="number" min={0} step={1000} value={form.co} onChange={e => setForm(p => ({ ...p, co: e.target.value }))} className="h-8 text-sm text-right font-mono" placeholder="0" />
            </div>

            <div className="col-span-2 bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between border border-gray-200">
              <span className="text-xs text-gray-500">Total (MOOE + CO)</span>
              <span className="font-mono font-bold text-gray-900 text-sm">
                ₱ {Math.round((parseFloat(form.mooe as string) || 0) + (parseFloat(form.co as string) || 0)).toLocaleString("en-PH")}
              </span>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              {saving ? "Saving…" : editItem ? "Update" : "Add Item"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      
                  <AlertDialog open={!!deleteItem} onOpenChange={open => { if (!open) setDeleteItem(null); }}>
                    <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200 gap-4">
                      <AlertDialogHeader>
                        <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
                          Remove item?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-sm text-zinc-500">
                          <span className="font-medium text-gray-700">"{deleteItem?.description}"</span>
                          {" "}will be permanently deleted from this fund source.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="outline" size="sm" className="rounded-lg border-gray-200 text-gray-700">
                            Cancel
                          </Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button size="sm" className="rounded-lg bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
                            Delete
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
    </div>
  );
}