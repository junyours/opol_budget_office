// components/admin/LdrrmfipPage.tsx
import React, { useEffect, useState, useCallback, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { LoadingState } from "@/src/components/states/LoadingState";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/src/components/ui/tooltip";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/src/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { PlusIcon, TrashIcon, ShieldCheckIcon, PencilSquareIcon } from "@heroicons/react/24/outline";
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

// const QUARTERS = ["1st Qrtr", "2nd Qrtr", "3rd Qrtr", "4th Qrtr"];
const QUARTERS = ["1st Qrtr", "2nd Qrtr", "3rd Qrtr", "4th Qrtr"];

// Legacy categories — hide from empty-state UI only when budget year > 2026
  // (kept in DB for old data, new revision uses the 4 new categories instead)
  const LEGACY_CATEGORY_NAMES = [
    "disaster response & rescue equipment",
    "supplies or inventory",
    "drrm, trainings, seminars & drills",
  ];

  const isLegacyCategory = (name: string, budgetYear: number) =>
    budgetYear > 2026 && LEGACY_CATEGORY_NAMES.includes(name.toLowerCase().trim());

const EMPTY_FORM = {
  ldrrmfip_category_id: "",
  description:          "",
  implementing_office:  "LDRRMO",
  starting_date:        "1st Qrtr",
  completion_date:      "4th Qrtr",
  expected_output:      "",
  funding_source:       "LDRRMF",
  mooe:                 "",
  co:                   "",
};

// ─── Formatters ───────────────────────────────────────────────────────────────

const enPH  = (v: number) => v === 0 ? "–" : v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const peso  = (v: number) => v === 0 ? "–" : `₱ ${Math.round(Math.abs(v)).toLocaleString("en-PH")}`;

// ─── Sub-header label for the fund source ─────────────────────────────────────

function sourceFundLabel(source: FundSource): string {
  if (source.type === "general") return "5% Calamity Fund (GENERAL FUND)";
  return `5% Calamity Fund (SPECIAL ACCOUNT for ${source.label.toUpperCase()})`;
}

import { LdrrmfipTableSkeleton } from "@/src/components/skeleton-loader/LdrrmfipTableSkeleton";

// ─── Main Component ───────────────────────────────────────────────────────────

export default function LdrrmfipPage() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

//   const [sources,     setSources]     = useState<FundSource[]>([]);
//   const [activeSource,setActiveSource]= useState<string>("general-fund");
//   const [categories,  setCategories]  = useState<Category[]>([]);

//   // Per-source state
//   const [groupsMap,  setGroupsMap]  = useState<Record<string, CategoryGroup[]>>({});
//   const [summaryMap, setSummaryMap] = useState<Record<string, Summary>>({});
//   const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});

const [activeSource, setActiveSource] = useState<string>("general-fund");
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editItem,   setEditItem]   = useState<LdrrmfipItem | null>(null);
  const [form,       setForm]       = useState({ ...EMPTY_FORM });
  const [saving,     setSaving]     = useState(false);

 const [deleteItem, setDeleteItem] = useState<LdrrmfipItem | null>(null);

  interface CtxMenu { x: number; y: number; item: LdrrmfipItem; }
  const [ctxMenu, setCtxMenu] = useState<CtxMenu | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

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
//   const { user } = useAuth();
// // const isViewer = user?.role === "viewer";
// // const isViewer = !['admin', 'super-admin', 'admin-ldrrmo'].includes(user?.role ?? '');
// const isEligibleDeptHead = user?.role === 'department-head' && (() => {
//   const dept = (user as any)?.department;
//   if (!dept) return false;
//   const n = (dept.dept_name ?? '').toLowerCase();
//   const c = (dept.dept_abbreviation ?? '').toLowerCase();
//   return n.includes('opol community') || n.includes('slaughterhouse') ||
//          n.includes('public market') || ['occ','pm','sh'].includes(c);
// })();

// const isViewer = isEligibleDeptHead || !['admin', 'super-admin', 'admin-ldrrmo'].includes(user?.role ?? '');

// useEffect(() => {
//   Promise.all([
//     API.get("/ldrrmfip/sources"),
//     API.get("/ldrrmfip/categories"),
//   ]).then(([srcRes, catRes]) => {
//     let srcs: FundSource[] = srcRes.data.data ?? [];

//     // Filter sources based on role + URL path (mirrors IncomeFundPage)
//     if (user?.role === "department-head") {
//       const path = window.location.pathname;
//       if (path.includes("sh-cf"))  srcs = srcs.filter(s => s.id === "sh");
//       else if (path.includes("occ-cf")) srcs = srcs.filter(s => s.id === "occ");
//       else if (path.includes("pm-cf"))  srcs = srcs.filter(s => s.id === "pm");
//     }

//     setCategories(catRes.data.data ?? []);
//     setSources(srcs);
//     if (srcs.length > 0) setActiveSource(srcs[0].id);
//   }).catch(() => toast.error("Failed to load LDRRMFIP metadata."));
// }, [user]);

const { user } = useAuth();
  const isEligibleDeptHead = user?.role === 'department-head' && (() => {
    const dept = (user as any)?.department;
    if (!dept) return false;
    const n = (dept.dept_name ?? '').toLowerCase();
    const c = (dept.dept_abbreviation ?? '').toLowerCase();
    return n.includes('opol community') || n.includes('slaughterhouse') ||
           n.includes('public market') || ['occ','pm','sh'].includes(c);
  })();

  const isViewer = isEligibleDeptHead || !['admin', 'super-admin', 'admin-ldrrmo'].includes(user?.role ?? '');

  const { data: metadata } = useQuery<{ sources: FundSource[]; categories: Category[] }>({
    queryKey: ['ldrrmfip-metadata', user?.role, (user as any)?.department?.dept_abbreviation],
    queryFn: async () => {
      const [srcRes, catRes] = await Promise.all([
        API.get("/ldrrmfip/sources"),
        API.get("/ldrrmfip/categories"),
      ]);
      let srcs: FundSource[] = srcRes.data.data ?? [];

      if (user?.role === "department-head") {
        const path = window.location.pathname;
        if (path.includes("sh-cf"))  srcs = srcs.filter(s => s.id === "sh");
        else if (path.includes("occ-cf")) srcs = srcs.filter(s => s.id === "occ");
        else if (path.includes("pm-cf"))  srcs = srcs.filter(s => s.id === "pm");
      }

      return { sources: srcs, categories: catRes.data.data ?? [] };
    },
    enabled: !!user,
  });

  const sources    = metadata?.sources    ?? [];
  const categories = metadata?.categories ?? [];

  // Default the active tab to the first available source once metadata loads
  useEffect(() => {
    if (sources.length > 0 && !sources.some(s => s.id === activeSource)) {
      setActiveSource(sources[0].id);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sources]);

  // ── Load data for the active source whenever it or the plan changes ────────

//   const fetchSource = useCallback(async (source: string) => {
//     if (!activePlanId) return;
//     setLoadingMap(prev => ({ ...prev, [source]: true }));
//     try {
//       const [groupsRes, summaryRes] = await Promise.all([
//         API.get("/ldrrmfip",         { params: { budget_plan_id: activePlanId, source } }),
//         API.get("/ldrrmfip/summary", { params: { budget_plan_id: activePlanId, source } }),
//       ]);
//       setGroupsMap(prev  => ({ ...prev,  [source]: groupsRes.data.data   ?? [] }));
//       setSummaryMap(prev => ({ ...prev,  [source]: summaryRes.data.data  ?? null }));
//     } catch {
//       toast.error(`Failed to load data for ${source}.`);
//     } finally {
//       setLoadingMap(prev => ({ ...prev, [source]: false }));
//     }
//   }, [activePlanId]);

//   useEffect(() => {
//     if (activePlanId && activeSource) fetchSource(activeSource);
//   }, [activePlanId, activeSource, fetchSource]);
const fetchSourceData = useCallback(async (source: string) => {
    const [groupsRes, summaryRes] = await Promise.all([
      API.get("/ldrrmfip",         { params: { budget_plan_id: activePlanId, source } }),
      API.get("/ldrrmfip/summary", { params: { budget_plan_id: activePlanId, source } }),
    ]);
    return {
      groups:  (groupsRes.data.data  ?? []) as CategoryGroup[],
      summary: (summaryRes.data.data ?? null) as Summary | null,
    };
  }, [activePlanId]);

  const { data: activeSourceData, isLoading: activeSourceLoading } = useQuery<{ groups: CategoryGroup[]; summary: Summary | null }>({
    queryKey: ['ldrrmfip-source', activePlanId, activeSource],
    queryFn:  () => fetchSourceData(activeSource),
    enabled:  !!activePlanId && !!activeSource,
  });

  const groupsMap  = { [activeSource]: activeSourceData?.groups  ?? [] };
  const summaryMap = { [activeSource]: activeSourceData?.summary ?? null };
  const loadingMap = { [activeSource]: activeSourceLoading };

  const fetchSource = useCallback((source: string) => {
    queryClient.invalidateQueries({ queryKey: ['ldrrmfip-source', activePlanId, source] });
  }, [activePlanId, queryClient]);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  const handleRowClick = (e: React.MouseEvent, item: LdrrmfipItem) => {
    e.preventDefault();
    const MENU_W = 175, MENU_H = 100;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, item });
  };

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
        expected_output:      form.expected_output.trim() || "Increase Level of Response",
        funding_source:       form.funding_source        || "LDRRMF",
        mooe:                 parseFloat(form.mooe as string) || 0,
        co:                   parseFloat(form.co   as string) || 0,
        obligation_amount:    0,
        sem1_amount:          0,
        sem2_amount:          0,
        total_amount:         parseFloat(form.mooe as string) + parseFloat(form.co as string) || 0,
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
  const groups    = groupsMap[source]  ?? [];
  const summary   = summaryMap[source] ?? null;
  const isLoading = loadingMap[source] ?? false;
  const srcObj    = sources.find(s => s.id === source) ?? activeSourceObj;

  if (isLoading) return <LdrrmfipTableSkeleton />;

  // Only show categories that have items (or all if empty state needed)
  const categoriesWithItems = groups.filter(g => g.items.length > 0);

  // For empty-state UI: hide legacy categories that have no items —
  // only hidden when budget year > 2026 (kept visible for 2026 and earlier)
  const categoriesWithoutItems = groups.filter(
    g => g.items.length === 0 && !isLegacyCategory(g.name, year)
  );

  return (
    <div className="space-y-5">

      {/* ── Source sub-header ── */}
      <div className="flex items-center justify-center gap-3 py-1">
        <span className="h-px flex-1 max-w-[80px] bg-gray-100 rounded-full" />
        <div className="text-center space-y-0.5">
          <p className="text-sm font-semibold tracking-wide uppercase text-red-500">{sourceFundLabel(srcObj)}</p>
          <p className="text-subtitle">January to December {year}</p>
        </div>
        <span className="h-px flex-1 max-w-[80px] bg-gray-100 rounded-full" />
      </div>

      {/* ── Empty state: no items anywhere ── */}
      {groups.length > 0 && categoriesWithItems.length === 0 && (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-gray-50 px-6 py-10 text-center space-y-3">
          <div className="w-10 h-10 mx-auto rounded-xl bg-red-50 flex items-center justify-center">
            <ShieldCheckIcon className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <p className="text-section-title">No items yet for {year}</p>
            <p className="text-subtitle mt-1">Start by adding your first item to a category below.</p>
          </div>
          {!isViewer && (
            <div className="flex flex-wrap gap-2 justify-center pt-1">
              {groups.filter(g => !isLegacyCategory(g.name, year)).map(g => (
                <button
                  key={g.ldrrmfip_category_id}
                  onClick={() => { setActiveSource(source); openAdd(g.ldrrmfip_category_id); }}
                  className="inline-flex items-center gap-1.5 text-table-secondary px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm"
                >
                  <PlusIcon className="w-3.5 h-3.5" />
                  {g.name}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Categories WITH items — full table ── */}
      {categoriesWithItems.map((group) => (
        <div key={group.ldrrmfip_category_id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
          {/* Category header */}
          <div className="px-4 py-2.5 border-b border-gray-100 flex items-center justify-between">
            <span className="text-section-title">{group.name}</span>
            {!isViewer && (
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
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  {[
                    { label: "Program/Project/Activity Description", cls: "text-left w-[28%]" },
                    { label: "Implementing Office",                   cls: "text-left w-[9%]" },
                    { label: "Starting Date",                         cls: "text-center w-[8%]" },
                    { label: "Completion Date",                       cls: "text-center w-[8%]" },
                    { label: "Expected Output",                       cls: "text-left w-[12%]" },
                    { label: "Funding Source",                        cls: "text-center w-[7%]" },
                    { label: "MOOE",                                  cls: "text-right w-[9%]" },
                    { label: "CO",                                    cls: "text-right w-[9%]" },
                    { label: "Total",                                 cls: "text-right w-[9%]" },
                  ].map(({ label, cls }) => (
                    <th
                      key={label}
                      className={cn("text-table-header border-b  px-3 py-2.5 border-t border-t-gray-100", cls)}
                    >
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-100">
                {group.items.map((item, idx) => (
                  <tr
                    key={item.ldrrmfip_item_id}
                    onClick={(e) => !isViewer && handleRowClick(e, item)}
                    onContextMenu={(e) => !isViewer && handleRowClick(e, item)}
                    className={cn(
                      "transition-colors",
                      idx % 2 === 1 && "bg-gray-50/40",
                      !isViewer && "hover:bg-gray-50/80 cursor-pointer select-none"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <span className="text-table-primary">{item.description}</span>
                    </td>
                    <td className="px-3 py-2.5 text-center"><span className="text-table-secondary">{item.implementing_office}</span></td>
                    <td className="px-3 py-2.5 text-center"><span className="text-table-secondary">{item.starting_date ?? "–"}</span></td>
                    <td className="px-3 py-2.5 text-center"><span className="text-table-secondary">{item.completion_date ?? "–"}</span></td>
                    <td className="px-3 py-2.5"><span className="text-table-secondary">{item.expected_output ?? "–"}</span></td>
                    <td className="px-3 py-2.5 text-center">
                      <span className="text-badge bg-teal-50 text-teal-700 border border-teal-200 rounded-full px-2 py-0.5">
                        {item.funding_source}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-right"><span className="text-table-number">{enPH(item.mooe)}</span></td>
                    <td className="px-3 py-2.5 text-right"><span className="text-table-number">{enPH(item.co)}</span></td>
                    <td className="px-3 py-2.5 text-right"><span className="text-table-total">{enPH(item.total)}</span></td>
                  </tr>
                ))}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                  <td colSpan={6} className="px-3 py-2.5 text-right">
                    <span className="text-table-total">Total {group.name}</span>
                  </td>
                  <td className="px-3 py-2.5 text-right"><span className="text-table-total">{enPH(group.subtotal_mooe)}</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-table-total">{enPH(group.subtotal_co)}</span></td>
                  <td className="px-3 py-2.5 text-right"><span className="text-table-grand-total">{enPH(group.subtotal_total)}</span></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      ))}

      {/* ── Categories WITHOUT items — compact add-row cards ── */}
      {categoriesWithItems.length > 0 && categoriesWithoutItems.length > 0 && (
        <div className="space-y-2">
          <p className="text-subtitle font-semibold uppercase tracking-widest px-1 text-gray-400">Other Categories</p>
          {categoriesWithoutItems.map(group => (
            <div
              key={group.ldrrmfip_category_id}
              className="flex items-center justify-between px-4 py-3 rounded-xl border border-dashed border-gray-200 bg-gray-50/60 hover:border-gray-300 transition-colors"
            >
              <span className="text-eyebrow">{group.name}</span>
              <div className="flex items-center gap-2">
                <span className="text-meta italic">No items</span>
                {!isViewer && (
                  <Button
                    size="sm" variant="outline"
                    className="gap-1 text-xs h-7 border-gray-200 text-gray-500 hover:text-gray-800"
                    onClick={() => { setActiveSource(source); openAdd(group.ldrrmfip_category_id); }}
                  >
                    <PlusIcon className="w-3 h-3" />
                    Add First Item
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Summary footer ── */}
      {summary && categoriesWithItems.length > 0 && (() => {
        // const calamityFund  = summary.calamity_fund;
        // const qrf30         = calamityFund * 0.30;
        // const predis70limit = calamityFund * 0.70;
        // const allocated     = summary.total_70pct;

        // return (
        //   <>
        //     {allocated > predis70limit && (
        //       <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
        //         <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
        //         <p className="text-table-secondary font-semibold text-red-700">
        //           Over budget by ₱ {(allocated - predis70limit).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — allocated items exceed the 70% Pre-Disaster ceiling.
        //         </p>
        //       </div>
        //     )}

        const calamityFund  = summary.calamity_fund;
        const qrf30         = calamityFund * 0.30;
        const predis70limit = calamityFund * 0.70;
        const allocated     = summary.total_70pct;
        const overBudgetAmt = allocated - predis70limit;
        const isOverBudget  = overBudgetAmt > 0.01; // tolerance for floating-point rounding

        return (
          <>
            {isOverBudget && (
              <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-red-500 flex-shrink-0" />
                <p className="text-table-secondary font-semibold text-red-700">
                  Over budget by ₱ {overBudgetAmt.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} — allocated items exceed the 70% Pre-Disaster ceiling.
                </p>
              </div>
            )}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-[12.5px] border-collapse">
                <tbody>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3">
                      <span className="text-table-primary"><span className="text-table-grand-total">A.</span>{" "}
                      Total (70% of the 5% CF, Preparedness Fund for CY{year})</span>
                    </td>
                    <td className="px-5 py-3 text-right w-52">
                      <span className={cn("text-table-grand-total", isOverBudget ? "text-red-600" : "")}>
                        ₱ {allocated.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                      <span className="text-meta block">
                        limit: ₱ {predis70limit.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                  <tr className="border-b border-gray-100">
                    <td className="px-5 py-3">
                      <span className="text-table-primary"><span className="text-table-grand-total">B.</span>{" "}
                      Total Reserved for Actual Calamity (30%) for Calendar Year {year}</span>
                      <span className="text-meta ml-1.5">(30% of C)</span>
                    </td>
                    <td className="px-5 py-3 text-right w-52">
                      <span className="text-table-grand-total">
                        ₱ {qrf30.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                  <tr className="bg-blue-50/40 border-t border-blue-100">
                    <td className="px-5 py-3">
                      <span className="text-table-primary"><span className="text-table-grand-total">C.</span>{" "}
                      Total 5% Calamity Fund Reserved for CY{year}</span>{" "}
                      <span className="inline-flex items-center gap-1 ml-1.5 text-badge bg-blue-100 text-blue-600 border border-blue-200 rounded px-1.5 py-0.5 align-middle normal-case tracking-normal">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block flex-none" />
                        derived · 5% of {srcObj.type === "general" ? "General Fund" : srcObj.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right w-52">
                      <span className="text-table-grand-total text-blue-600">
                        ₱ {calamityFund.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </>
        );
      })()}
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
    <div className="flex items-center gap-2 mb-1">
      <span className="text-eyebrow">LDRRMF Investment Plan</span>
      <span className="text-gray-200">·</span>
      <span className="inline-flex items-center gap-1 text-eyebrow text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5 normal-case tracking-normal">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
        Budget Year {year}
      </span>
    </div>
    <h1 className="text-page-title">
      Local Disaster Risk Reduction &amp; Management Fund Investment Plan
    </h1>
    <p className="text-subtitle mt-0.5">LDRRMFIP · Municipality of Opol, Misamis Oriental</p>
  </div>
  {/* {activePlanId && !isViewer && (
  <LdrrmfipUpload
    activePlanId={activePlanId}
    activeSource={activeSource}
    sources={sources}
    categories={categories}
    onSuccess={() => fetchSource(activeSource)}
  />
)} */}
</div>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      {sources.length > 0 ? (
        <Tabs value={activeSource} onValueChange={setActiveSource} className="w-full">
          <TabsList className="h-9 bg-white border border-gray-200 rounded-lg p-1">
            {sources.map(src => (
              <TabsTrigger
                key={src.id}
                value={src.id}
                className="text-xs px-4 rounded-md data-[state=active]:bg-zinc-900 data-[state=active]:text-white data-[state=active]:font-medium data-[state=active]:shadow-sm text-gray-500"
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
          {/* <DialogHeader>
            <DialogTitle className="text-section-title">
              {editItem ? "Edit Item" : "Add New Item"}
              <span className="ml-2 text-subtitle font-normal">
                — {sourceFundLabel(activeSourceObj)}
              </span>
            </DialogTitle>
          </DialogHeader> */}
          <DialogHeader>
            <DialogTitle className="text-section-title">
              {editItem ? "Edit Item" : "Add New Item"}
              <span className="ml-2 text-subtitle font-normal">
                — {sourceFundLabel(activeSourceObj)}
              </span>
            </DialogTitle>
            <DialogDescription className="sr-only">
              {editItem ? "Edit an existing LDRRMFIP item." : "Add a new LDRRMFIP item to this category."}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="col-span-2 space-y-1">
              <Label className="text-field-label">Thematic Area *</Label>
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
              <span className="text-field-label">Total (MOOE + CO)</span>
              <span className="text-table-grand-total">
                ₱ {((parseFloat(form.mooe as string) || 0) + (parseFloat(form.co as string) || 0)).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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


                  {ctxMenu && (
        <div
          ref={ctxRef}
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[175px] overflow-hidden"
        >
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[155px]">
              {ctxMenu.item.description.slice(0, 26)}
            </p>
          </div>
          <button
            onClick={() => { setActiveSource(ctxMenu.item.source); openEdit(ctxMenu.item); setCtxMenu(null); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Item
          </button>
          <button
            onClick={() => { handleDelete(ctxMenu.item); setCtxMenu(null); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            Delete Item
          </button>
        </div>
      )}

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
