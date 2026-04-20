import React, { useState, useMemo, useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { useDebounce } from "@/src/hooks/useDebounce";
import API from "@/src/services/api";

import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Badge } from "@/src/components/ui/badge";
import { Checkbox } from "@/src/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/src/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/src/components/ui/pagination";
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  XMarkIcon,
  PlusIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface IncomeItem {
  id: number;
  source: string;
  parent_id: number | null;
  code: string | null;
  name: string;
  level: number;
  sort_order: number;
  is_active: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: IncomeItem;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 20;
const ALL = "__all__";

const SOURCE_LABELS: Record<string, string> = {
  "general-fund": "General Fund",
  sh: "Slaughterhouse",
  occ: "OCC",
  pm: "Public Market",
};

const sourceLabel = (s: string) => SOURCE_LABELS[s] ?? s;

// ─── Sort ─────────────────────────────────────────────────────────────────────

type SortField = "code" | "name" | "source" | "level" | "sort_order";

const SortIcon = ({
  field,
  active,
  dir,
}: {
  field: SortField;
  active: SortField;
  dir: "asc" | "desc";
}) => (
  <span
    className={cn(
      "ml-1 text-[10px] leading-none",
      field === active ? "text-gray-700" : "text-gray-300"
    )}
  >
    {field === active ? (dir === "asc" ? "↑" : "↓") : "↕"}
  </span>
);

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useIncomeItems() {
  return useQuery<IncomeItem[]>({
    queryKey: ["income-fund-objects"],
    queryFn: () =>
      API.get("/income-fund-objects").then((r) => r.data?.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

function useSources() {
  return useQuery<string[]>({
    queryKey: ["income-fund-object-sources"],
    queryFn: () =>
      API.get("/income-fund-objects/sources").then((r) => r.data?.data ?? []),
    staleTime: 10 * 60 * 1000,
  });
}

// ─── Form Modal (Add / Edit) ──────────────────────────────────────────────────

interface FormModalProps {
  item: IncomeItem | null; // null = add mode
  allItems: IncomeItem[];
  sources: string[];
  onClose: () => void;
  onSaved: () => void;
}

const EMPTY_FORM = {
  source: "general-fund",
  parent_id: "",
  code: "",
  name: "",
  level: "1",
  sort_order: "",
};

const FormModal: React.FC<FormModalProps> = ({
  item,
  allItems,
  sources,
  onClose,
  onSaved,
}) => {
  const isEdit = !!item;
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (item) {
      setForm({
        source: item.source,
        parent_id: item.parent_id?.toString() ?? "",
        code: item.code ?? "",
        name: item.name,
        level: item.level.toString(),
        sort_order: item.sort_order.toString(),
      });
    } else {
      setForm({ ...EMPTY_FORM });
    }
  }, [item]);

  const set = (key: keyof typeof EMPTY_FORM, val: string) =>
    setForm((f) => ({ ...f, [key]: val }));

  const parentOptions = allItems.filter(
    (o) =>
      o.source === form.source &&
      o.id !== item?.id &&
      o.is_active
  );

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error("Name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        source: form.source,
        parent_id: form.parent_id ? Number(form.parent_id) : null,
        code: form.code.trim() || null,
        name: form.name.trim(),
        level: Number(form.level),
        sort_order: form.sort_order ? Number(form.sort_order) : undefined,
      };

      if (isEdit && item) {
        await API.put(`/income-fund-objects/${item.id}`, payload);
        toast.success("Item updated.");
      } else {
        await API.post("/income-fund-objects", payload);
        toast.success("Item created.");
      }
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Save failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">
            {isEdit ? "Edit Income Item" : "Add Income Item"}
          </DialogTitle>
          <DialogDescription className="text-xs text-gray-400 mt-0.5">
            {isEdit ? "Update the item details." : "Create a new income fund object."}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* Source */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">
              Source <span className="text-red-400">*</span>
            </label>
            <Select value={form.source} onValueChange={(v) => { set("source", v); set("parent_id", ""); }}>
              <SelectTrigger className="h-9 text-sm border-gray-200">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {sources.map((s) => (
                  <SelectItem key={s} value={s} className="text-sm">
                    {sourceLabel(s)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Parent */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Parent Item</label>
            <Select
              value={form.parent_id || ALL}
              onValueChange={(v) => set("parent_id", v === ALL ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm border-gray-200">
                <SelectValue placeholder="None (top-level)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL} className="text-sm">None (top-level)</SelectItem>
                {parentOptions.map((o) => (
                  <SelectItem key={o.id} value={o.id.toString()} className="text-sm">
                    {o.code ? `[${o.code}] ` : ""}{o.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Code + Level row */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Account Code</label>
              <Input
                value={form.code}
                onChange={(e) => set("code", e.target.value)}
                placeholder="e.g. 4-01-01-010"
                className="h-9 text-sm font-mono"
                maxLength={80}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-600">Level</label>
              <Input
                type="number"
                min={0}
                max={10}
                value={form.level}
                onChange={(e) => set("level", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">
              Name <span className="text-red-400">*</span>
            </label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Real Property Tax"
              className="h-9 text-sm"
              maxLength={255}
              autoFocus={!isEdit}
            />
          </div>

          {/* Sort order */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Sort Order</label>
            <Input
              type="number"
              min={0}
              value={form.sort_order}
              onChange={(e) => set("sort_order", e.target.value)}
              placeholder="Auto"
              className="h-9 text-sm"
            />
            <p className="text-[11px] text-gray-400">Leave blank to append at the end.</p>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs border-gray-200"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
            onClick={handleSave}
            disabled={saving || !form.name.trim()}
          >
            {saving ? (
              <>
                <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Saving…
              </>
            ) : isEdit ? (
              "Save Changes"
            ) : (
              "Create Item"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const IncomeItemsTab: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useIncomeItems();
  const { data: sources = [] } = useSources();

  // ── Filters ───────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw]           = useState("");
  const debouncedSearch                     = useDebounce(searchRaw, 250);
  const [filterSource, setFilterSource]     = useState(ALL);
  const [filterStatus, setFilterStatus]     = useState("active");

  // ── Sort ──────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("sort_order");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc");

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);
  const resetPage = () => setPage(1);

  // ── Modals ────────────────────────────────────────────────────────────────
  const [addOpen, setAddOpen]           = useState(false);
  const [editItem, setEditItem]         = useState<IncomeItem | null>(null);
  const [toggleTarget, setToggleTarget] = useState<IncomeItem | null>(null);
  const [toggling, setToggling]         = useState(false);

  // ── Context menu ──────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef                = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node))
        setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = items;

    if (filterSource !== ALL)          list = list.filter((i) => i.source === filterSource);
    if (filterStatus === "active")     list = list.filter((i) => i.is_active);
    if (filterStatus === "inactive")   list = list.filter((i) => !i.is_active);

    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.name.toLowerCase().includes(q) ||
          (i.code ?? "").toLowerCase().includes(q) ||
          i.source.toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let av: string | number = "";
      let bv: string | number = "";
      if (sortField === "code")       { av = a.code ?? ""; bv = b.code ?? ""; }
      if (sortField === "name")       { av = a.name;       bv = b.name; }
      if (sortField === "source")     { av = a.source;     bv = b.source; }
      if (sortField === "level")      { av = a.level;      bv = b.level; }
      if (sortField === "sort_order") { av = a.sort_order; bv = b.sort_order; }

      if (typeof av === "number" && typeof bv === "number") {
        return sortDir === "asc" ? av - bv : bv - av;
      }
      const c = String(av).localeCompare(String(bv));
      return sortDir === "asc" ? c : -c;
    });

    return list;
  }, [items, filterSource, filterStatus, debouncedSearch, sortField, sortDir]);

  // ── Pagination ────────────────────────────────────────────────────────────
  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    resetPage();
  };

  // ── Context menu ──────────────────────────────────────────────────────────
  const handleRowClick = (e: React.MouseEvent, item: IncomeItem) => {
    if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
    e.preventDefault();
    const MENU_W = 180, MENU_H = 110;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, item });
  };

  // ── Toggle ────────────────────────────────────────────────────────────────
  const handleToggleIntent = (item: IncomeItem) => {
    setCtxMenu(null);
    setToggleTarget(item);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await API.put(`/income-fund-objects/${toggleTarget.id}`, {
        is_active: !toggleTarget.is_active,
      });
      toast.success(toggleTarget.is_active ? "Item deactivated." : "Item activated.");
      queryClient.invalidateQueries({ queryKey: ["income-fund-objects"] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update.");
    } finally {
      setToggling(false);
      setToggleTarget(null);
    }
  };

  const onSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["income-fund-objects"] });
    queryClient.invalidateQueries({ queryKey: ["income-fund-object-sources"] });
  };

  const isFiltered  = filterSource !== ALL || filterStatus !== "active";
  const isSearching = debouncedSearch.trim().length > 0;

  // ── Source badge colors ───────────────────────────────────────────────────
  const sourceBadgeClass = (source: string) => {
    switch (source) {
      case "general-fund": return "text-blue-700 bg-blue-50 border-blue-200";
      case "sh":           return "text-orange-700 bg-orange-50 border-orange-200";
      case "occ":          return "text-indigo-700 bg-indigo-50 border-indigo-200";
      case "pm":           return "text-emerald-700 bg-emerald-50 border-emerald-200";
      default:             return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  return (
    <div className="p-6 relative">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Expenditure
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            Income Items
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Master list of income fund objects grouped by source.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
          onClick={() => setAddOpen(true)}
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchRaw}
            onChange={(e) => { setSearchRaw(e.target.value); resetPage(); }}
            placeholder="Search name, code, source…"
            className="pl-8 h-8 text-xs border-gray-200 bg-white"
          />
          {isSearching && (
            <button
              onClick={() => { setSearchRaw(""); resetPage(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <FunnelIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />

        {/* Source filter */}
        <Select value={filterSource} onValueChange={(v) => { setFilterSource(v); resetPage(); }}>
          <SelectTrigger className={cn("h-8 text-xs w-44 border-gray-200", filterSource !== ALL && "border-gray-400 bg-gray-50")}>
            <SelectValue placeholder="All sources" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="text-xs">All sources</SelectItem>
            {sources.map((s) => (
              <SelectItem key={s} value={s} className="text-xs">
                {sourceLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status filter */}
        <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); resetPage(); }}>
          <SelectTrigger className={cn("h-8 text-xs w-32 border-gray-200", filterStatus !== "active" && "border-gray-400 bg-gray-50")}>
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="text-xs">All statuses</SelectItem>
            <SelectItem value="active" className="text-xs">Active</SelectItem>
            <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
          </SelectContent>
        </Select>

        {/* Count */}
        <span className="text-[11px] text-gray-400 ml-auto shrink-0">
          {isFiltered || isSearching ? (
            <>
              <span className="font-medium text-gray-600">{filtered.length}</span> of{" "}
              <span className="font-medium text-gray-600">{items.length}</span>
            </>
          ) : (
            <span className="font-medium text-gray-600">{items.length}</span>
          )}{" "}
          item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Active filter pills */}
      {isFiltered && (
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {filterSource !== ALL && (
            <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
              {sourceLabel(filterSource)}
              <button onClick={() => { setFilterSource(ALL); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5">
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          )}
          {filterStatus !== "active" && filterStatus !== ALL && (
            <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
              {filterStatus}
              <button onClick={() => { setFilterStatus("active"); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5">
                <XMarkIcon className="w-3 h-3" />
              </button>
            </span>
          )}
          <button
            onClick={() => { setFilterSource(ALL); setFilterStatus("active"); resetPage(); }}
            className="text-[11px] text-gray-400 hover:text-gray-700 underline underline-offset-2"
          >
            Clear all
          </button>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400 gap-2">
            <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching ? (
              <>
                No items match{" "}
                <span className="font-medium text-gray-600">"{debouncedSearch}"</span>.{" "}
                <button
                  onClick={() => { setSearchRaw(""); resetPage(); }}
                  className="underline underline-offset-2 text-gray-600 font-medium"
                >
                  Clear
                </button>
              </>
            ) : isFiltered ? (
              <>
                No items match the selected filters.{" "}
                <button
                  onClick={() => { setFilterSource(ALL); setFilterStatus("active"); resetPage(); }}
                  className="underline underline-offset-2 text-gray-600 font-medium"
                >
                  Clear filters
                </button>
              </>
            ) : (
              "No income items found."
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr>
                    {/* Code */}
                    <th
                      className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-36"
                      onClick={() => toggleSort("code")}
                    >
                      Code <SortIcon field="code" active={sortField} dir={sortDir} />
                    </th>
                    {/* Name */}
                    <th
                      className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleSort("name")}
                    >
                      Name <SortIcon field="name" active={sortField} dir={sortDir} />
                    </th>
                    {/* Source */}
                    <th
                      className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-40"
                      onClick={() => toggleSort("source")}
                    >
                      Source <SortIcon field="source" active={sortField} dir={sortDir} />
                    </th>
                    {/* Level */}
                    <th
                      className="border-b border-gray-200 bg-white px-3 py-2.5 text-center font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-20"
                      onClick={() => toggleSort("level")}
                    >
                      Lvl <SortIcon field="level" active={sortField} dir={sortDir} />
                    </th>
                    {/* Sort order */}
                    <th
                      className="border-b border-gray-200 bg-white px-3 py-2.5 text-center font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-20"
                      onClick={() => toggleSort("sort_order")}
                    >
                      Order <SortIcon field="sort_order" active={sortField} dir={sortDir} />
                    </th>
                    {/* Status */}
                    <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-24">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((item) => (
                    <tr
                      key={item.id}
                      onClick={(e) => handleRowClick(e, item)}
                      onContextMenu={(e) => { e.preventDefault(); handleRowClick(e, item); }}
                      className={cn(
                        "hover:bg-gray-50/80 transition-colors cursor-pointer select-none",
                        !item.is_active && "opacity-50"
                      )}
                    >
                      <td className="px-3 py-3 font-mono text-gray-500 text-[11px]">
                        {item.code ?? <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-3 py-3 font-medium text-gray-900">
                        {item.level > 0 && (
                          <span
                            className="inline-block mr-1 text-gray-300"
                            style={{ width: `${item.level * 12}px` }}
                          />
                        )}
                        {item.name}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            sourceBadgeClass(item.source)
                          )}
                        >
                          {sourceLabel(item.source)}
                        </Badge>
                      </td>
                      <td className="px-3 py-3 text-center text-gray-500 font-mono text-[11px]">
                        {item.level}
                      </td>
                      <td className="px-3 py-3 text-center text-gray-400 font-mono text-[11px]">
                        {item.sort_order}
                      </td>
                      <td className="px-3 py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            item.is_active
                              ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                              : "text-gray-500 bg-gray-50 border-gray-200"
                          )}
                        >
                          {item.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-600">
                    {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-600">{filtered.length}</span>
                </p>
                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={cn(
                          "h-7 px-2 text-[11px] rounded-md cursor-pointer",
                          page === 1 && "pointer-events-none opacity-40"
                        )}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((p, i) =>
                      p === "ellipsis" ? (
                        <PaginationItem key={`e-${i}`}>
                          <PaginationEllipsis className="h-7 w-7 text-[11px]" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={page === p}
                            className={cn(
                              "h-7 w-7 text-[11px] rounded-md cursor-pointer",
                              page === p
                                ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900"
                                : "text-gray-600 hover:bg-gray-50"
                            )}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={cn(
                          "h-7 px-2 text-[11px] rounded-md cursor-pointer",
                          page === totalPages && "pointer-events-none opacity-40"
                        )}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[175px] overflow-hidden"
        >
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[155px]">
              {ctxMenu.item.code ? ctxMenu.item.code : ctxMenu.item.name.slice(0, 26)}
            </p>
          </div>
          <button
            onClick={() => { setCtxMenu(null); setEditItem(ctxMenu.item); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Item
          </button>
          <button
            onClick={() => handleToggleIntent(ctxMenu.item)}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors",
              ctxMenu.item.is_active
                ? "text-amber-700 hover:bg-amber-50"
                : "text-emerald-700 hover:bg-emerald-50"
            )}
          >
            {ctxMenu.item.is_active ? (
              <><NoSymbolIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Deactivate</>
            ) : (
              <><CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Activate</>
            )}
          </button>
        </div>
      )}

      {/* ── Add / Edit modal ── */}
      {(addOpen || editItem) && (
        <FormModal
          item={editItem}
          allItems={items}
          sources={sources.length ? sources : ["general-fund", "sh", "occ", "pm"]}
          onClose={() => { setAddOpen(false); setEditItem(null); }}
          onSaved={onSaved}
        />
      )}

      {/* ── Toggle confirm ── */}
      <AlertDialog
        open={!!toggleTarget}
        onOpenChange={(o) => { if (!o) setToggleTarget(null); }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">
              {toggleTarget?.is_active ? "Deactivate item?" : "Activate item?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700 block mb-1">
                {toggleTarget?.name}
              </span>
              {toggleTarget?.is_active
                ? "This item will be hidden from income fund entry forms."
                : "This item will be available again in income fund entry forms."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  toggleTarget?.is_active
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
                onClick={confirmToggle}
                disabled={toggling}
              >
                {toggling ? (
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : toggleTarget?.is_active ? (
                  "Deactivate"
                ) : (
                  "Activate"
                )}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default IncomeItemsTab;
