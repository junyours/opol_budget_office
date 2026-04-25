import React, { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import API from "../../services/api";
import { useDebounce } from "../../hooks/useDebounce";
import { LoadingState } from "../common/LoadingState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../../components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "../../components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "../../components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "../../components/ui/pagination";
import { Badge } from "../../components/ui/badge";
import {
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  NoSymbolIcon,
  CheckCircleIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/src/lib/utils";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface ExpenseClassification {
  expense_class_id: number;
  expense_class_name: string;
  abbreviation?: string | null;
}

interface ExpenseClassItem {
  expense_class_item_id: number;
  expense_class_id: number;
  expense_class_item_name: string;
  expense_class_item_acc_code?: string | null;
  is_active: boolean;
  classification?: ExpenseClassification;
}

interface ContextMenuState {
  x: number;
  y: number;
  item: ExpenseClassItem;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const PER_PAGE = 10;
const ALL_CLASSIFICATIONS = "__all__";
const ALL_STATUS = "__all__";

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useClassifications() {
  return useQuery<ExpenseClassification[]>({
    queryKey: ["expense-classifications"],
    queryFn: () =>
      API.get("/expense-classifications").then((r) => r.data?.data ?? []),
    staleTime: 10 * 60 * 1000,
  });
}

function useExpenseClassItems() {
  return useQuery<ExpenseClassItem[]>({
    queryKey: ["expense-class-items"],
    queryFn: () =>
      API.get("/expense-class-items").then((r) => r.data?.data ?? []),
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Highlight helper ──────────────────────────────────────────────────────────

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-[2px] px-0.5">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

// ─── Sort Icon ─────────────────────────────────────────────────────────────────

type SortField = "name" | "acc_code" | "class";

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

// ─── Component ─────────────────────────────────────────────────────────────────

const ExpenseClassItemsPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading: itemsLoading } = useExpenseClassItems();
  const { data: classifications = [], isLoading: classLoading } =
    useClassifications();

  const loading = itemsLoading || classLoading;

  // ── Search ─────────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw] = useState("");
  const debouncedSearch = useDebounce(searchRaw, 250);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [filterClass, setFilterClass] = useState<string>(ALL_CLASSIFICATIONS);
  const [filterStatus, setFilterStatus] = useState<string>(ALL_STATUS);

  // ── Sort ───────────────────────────────────────────────────────────────────
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // ── Pagination ─────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Context menu ───────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  // ── Create / Edit dialog ───────────────────────────────────────────────────
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ExpenseClassItem | null>(null);
  const [form, setForm] = useState({
    expense_class_id: "",
    expense_class_item_name: "",
    expense_class_item_acc_code: "",
    is_active: true,
  });
  const [submitting, setSubmitting] = useState(false);

  // ── Deactivate confirm ─────────────────────────────────────────────────────
  const [deactivateTarget, setDeactivateTarget] =
    useState<ExpenseClassItem | null>(null);

  // ── Close ctx menu on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node))
        setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  // ── Filtered + sorted list ─────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = items;

    if (filterClass !== ALL_CLASSIFICATIONS) {
      list = list.filter(
        (i) => i.expense_class_id?.toString() === filterClass
      );
    }

    if (filterStatus !== ALL_STATUS) {
      const active = filterStatus === "active";
      list = list.filter((i) => i.is_active === active);
    }

    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (i) =>
          i.expense_class_item_name.toLowerCase().includes(q) ||
          (i.expense_class_item_acc_code ?? "").toLowerCase().includes(q) ||
          (i.classification?.expense_class_name ?? "").toLowerCase().includes(q)
      );
    }

    list = [...list].sort((a, b) => {
      let av = "",
        bv = "";
      if (sortField === "name") {
        av = a.expense_class_item_name;
        bv = b.expense_class_item_name;
      } else if (sortField === "acc_code") {
        av = a.expense_class_item_acc_code ?? "";
        bv = b.expense_class_item_acc_code ?? "";
      } else {
        av = a.classification?.expense_class_name ?? "";
        bv = b.classification?.expense_class_name ?? "";
      }
      const cmp = av.localeCompare(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });

    return list;
  }, [items, filterClass, filterStatus, debouncedSearch, sortField, sortDir]);

  const handleFilterClassChange = (val: string) => {
    setFilterClass(val);
    setPage(1);
  };
  const handleFilterStatusChange = (val: string) => {
    setFilterStatus(val);
    setPage(1);
  };
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchRaw(e.target.value);
    setPage(1);
  };
  const clearSearch = () => {
    setSearchRaw("");
    setPage(1);
  };
  const clearFilters = () => {
    setFilterClass(ALL_CLASSIFICATIONS);
    setFilterStatus(ALL_STATUS);
    setPage(1);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
    setPage(1);
  };

  const isFiltered =
    filterClass !== ALL_CLASSIFICATIONS || filterStatus !== ALL_STATUS;
  const isSearching = debouncedSearch.trim().length > 0;
  const activeClass = classifications.find(
    (c) => c.expense_class_id.toString() === filterClass
  );

  // ── Pagination ─────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getPageNumbers = (): (number | "ellipsis")[] => {
    if (totalPages <= 7)
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | "ellipsis")[] = [1];
    if (page > 3) pages.push("ellipsis");
    for (
      let p = Math.max(2, page - 1);
      p <= Math.min(totalPages - 1, page + 1);
      p++
    )
      pages.push(p);
    if (page < totalPages - 2) pages.push("ellipsis");
    pages.push(totalPages);
    return pages;
  };

  // ── Row click → context menu ───────────────────────────────────────────────

  const handleRowClick = (e: React.MouseEvent, item: ExpenseClassItem) => {
    e.preventDefault();
    const MENU_W = 180,
      MENU_H = 110;
    const x =
      e.clientX + MENU_W > window.innerWidth ? e.clientX - MENU_W : e.clientX;
    const y =
      e.clientY + MENU_H > window.innerHeight
        ? e.clientY - MENU_H
        : e.clientY;
    setCtxMenu({ x, y, item });
  };

  // ── Open modals ────────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingItem(null);
    setForm({
      expense_class_id: "",
      expense_class_item_name: "",
      expense_class_item_acc_code: "",
      is_active: true,
    });
    setModalOpen(true);
  };

  const openEdit = (item: ExpenseClassItem) => {
    setCtxMenu(null);
    setEditingItem(item);
    setForm({
      expense_class_id: item.expense_class_id?.toString() ?? "",
      expense_class_item_name: item.expense_class_item_name,
      expense_class_item_acc_code: item.expense_class_item_acc_code ?? "",
      is_active: item.is_active,
    });
    setModalOpen(true);
  };

  // ── Submit ─────────────────────────────────────────────────────────────────

  const handleSubmit = async () => {
    if (!form.expense_class_item_name.trim()) {
      toast.error("Item name is required.");
      return;
    }
    if (!editingItem && !form.expense_class_id) {
      toast.error("Expense classification is required.");
      return;
    }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        expense_class_item_name: form.expense_class_item_name.trim(),
        expense_class_item_acc_code:
          form.expense_class_item_acc_code.trim() || null,
        is_active: form.is_active,
      };
      if (form.expense_class_id)
        payload.expense_class_id = Number(form.expense_class_id);

      if (editingItem) {
        await API.put(
          `/expense-class-items/${editingItem.expense_class_item_id}`,
          payload
        );
        toast.success("Expense item updated.");
      } else {
        await API.post("/expense-class-items", payload);
        toast.success("Expense item created.");
      }

      queryClient.invalidateQueries({ queryKey: ["expense-class-items"] });
      setModalOpen(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ?? err?.message ?? "Operation failed.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  // ── Toggle active ──────────────────────────────────────────────────────────

  const handleToggleActive = async (item: ExpenseClassItem) => {
    try {
      await API.put(`/expense-class-items/${item.expense_class_item_id}`, {
        is_active: !item.is_active,
      });
      toast.success(item.is_active ? "Item deactivated." : "Item activated.");
      setDeactivateTarget(null);
      queryClient.invalidateQueries({ queryKey: ["expense-class-items"] });
    } catch {
      toast.error("Failed to update status.");
    }
  };

  const handleToggleIntent = (item: ExpenseClassItem) => {
    setCtxMenu(null);
    setDeactivateTarget(item);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading && items.length === 0) return <LoadingState />;

  return (
    <div className="p-6 relative">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Administration
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            Expense Items
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage expense classification items and account codes.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Item
        </Button>
      </div>

      {/* ── Filter + Search bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchRaw}
            onChange={handleSearchChange}
            placeholder="Search items…"
            className="pl-8 h-8 text-xs border-gray-200 bg-white"
          />
          {isSearching && (
            <button
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <FunnelIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />

        <Select value={filterClass} onValueChange={handleFilterClassChange}>
          <SelectTrigger
            className={cn(
              "h-8 text-xs w-52 border-gray-200",
              filterClass !== ALL_CLASSIFICATIONS && "border-gray-400 bg-gray-50"
            )}
          >
            <SelectValue placeholder="All classifications" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CLASSIFICATIONS} className="text-xs">
              All classifications
            </SelectItem>
            {classifications.map((c) => (
              <SelectItem
                key={c.expense_class_id}
                value={c.expense_class_id.toString()}
                className="text-xs"
              >
                {c.expense_class_name}
                {c.abbreviation ? ` (${c.abbreviation})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={filterStatus} onValueChange={handleFilterStatusChange}>
          <SelectTrigger
            className={cn(
              "h-8 text-xs w-32 border-gray-200",
              filterStatus !== ALL_STATUS && "border-gray-400 bg-gray-50"
            )}
          >
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_STATUS} className="text-xs">
              All statuses
            </SelectItem>
            <SelectItem value="active" className="text-xs">
              Active
            </SelectItem>
            <SelectItem value="inactive" className="text-xs">
              Inactive
            </SelectItem>
          </SelectContent>
        </Select>

        {isFiltered && (
          <div className="flex items-center gap-1.5">
            {filterClass !== ALL_CLASSIFICATIONS && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                {activeClass?.expense_class_name}
                <button
                  onClick={() => {
                    setFilterClass(ALL_CLASSIFICATIONS);
                    setPage(1);
                  }}
                  className="text-gray-400 hover:text-gray-700 ml-0.5"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            {filterStatus !== ALL_STATUS && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                {filterStatus === "active" ? "Active" : "Inactive"}
                <button
                  onClick={() => {
                    setFilterStatus(ALL_STATUS);
                    setPage(1);
                  }}
                  className="text-gray-400 hover:text-gray-700 ml-0.5"
                >
                  <XMarkIcon className="w-3 h-3" />
                </button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-[11px] text-gray-400 hover:text-gray-700 underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        <span className="text-[11px] text-gray-400 ml-auto">
          {isFiltered || isSearching ? (
            <>
              <span className="font-medium text-gray-600">{filtered.length}</span>{" "}
              of{" "}
              <span className="font-medium text-gray-600">{items.length}</span>{" "}
              items
            </>
          ) : (
            <>
              <span className="font-medium text-gray-600">{items.length}</span>{" "}
              item{items.length !== 1 ? "s" : ""}
            </>
          )}
        </span>
      </div>

      {/* ── Hint ── */}
      <div className="mb-4">
        <span className="text-[10px] text-gray-400 italic hidden sm:block">
          Click a row to edit or toggle status
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching ? (
              <>
                No items match{" "}
                <span className="font-medium text-gray-600">
                  "{debouncedSearch}"
                </span>
                .{" "}
                <button
                  onClick={clearSearch}
                  className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
                >
                  Clear search
                </button>
              </>
            ) : isFiltered ? (
              <>
                No items match the selected filters.{" "}
                <button
                  onClick={clearFilters}
                  className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
                >
                  Clear filters
                </button>
              </>
            ) : (
              <>
                No expense items yet.{" "}
                <button
                  onClick={openCreate}
                  className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
                >
                  Add the first one
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer select-none hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSort("name")}
                  >
                    Item Name{" "}
                    <SortIcon field="name" active={sortField} dir={sortDir} />
                  </th>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-36 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSort("acc_code")}
                  >
                    Acc. Code{" "}
                    <SortIcon
                      field="acc_code"
                      active={sortField}
                      dir={sortDir}
                    />
                  </th>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-52 cursor-pointer select-none hover:bg-gray-50 transition-colors"
                    onClick={() => toggleSort("class")}
                  >
                    Classification{" "}
                    <SortIcon field="class" active={sortField} dir={sortDir} />
                  </th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-24">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((item) => (
                  <tr
                    key={item.expense_class_item_id}
                    onClick={(e) => handleRowClick(e, item)}
                    onContextMenu={(e) => {
                      e.preventDefault();
                      handleRowClick(e, item);
                    }}
                    className={cn(
                      "hover:bg-gray-50/80 transition-colors cursor-pointer select-none",
                      !item.is_active && "opacity-50"
                    )}
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {isSearching
                        ? highlightMatch(
                            item.expense_class_item_name,
                            debouncedSearch
                          )
                        : item.expense_class_item_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                      {item.expense_class_item_acc_code ? (
                        isSearching ? (
                          highlightMatch(
                            item.expense_class_item_acc_code,
                            debouncedSearch
                          )
                        ) : (
                          item.expense_class_item_acc_code
                        )
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.classification ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="text-gray-700 font-medium">
                            {isSearching
                              ? highlightMatch(
                                  item.classification.expense_class_name,
                                  debouncedSearch
                                )
                              : item.classification.expense_class_name}
                          </span>
                          {item.classification.abbreviation && (
                            <span className="text-[10px] text-gray-400 font-mono">
                              ({item.classification.abbreviation})
                            </span>
                          )}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
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

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-600">
                    {(page - 1) * PER_PAGE + 1}–
                    {Math.min(page * PER_PAGE, filtered.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-gray-600">
                    {filtered.length}
                  </span>
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
                        <PaginationItem key={`ellipsis-${i}`}>
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
                        onClick={() =>
                          setPage((p) => Math.min(totalPages, p + 1))
                        }
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

      {/* ── Context Menu (positioned fixed) ── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          style={{
            position: "fixed",
            top: ctxMenu.y,
            left: ctxMenu.x,
            zIndex: 9999,
          }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[175px] overflow-hidden"
        >
          {/* Triangle pointer */}
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          {/* Item label */}
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[155px]">
              {ctxMenu.item.expense_class_item_acc_code
                ? ctxMenu.item.expense_class_item_acc_code
                : ctxMenu.item.expense_class_item_name.slice(0, 26)}
            </p>
          </div>
          <button
            onClick={() => openEdit(ctxMenu.item)}
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
              <>
                <NoSymbolIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                Deactivate
              </>
            ) : (
              <>
                <CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                Activate
              </>
            )}
          </button>
        </div>
      )}

      {/* ════════ Create / Edit Dialog ════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-lg rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">
              {editingItem ? "Edit Expense Item" : "Add Expense Item"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              {editingItem
                ? "Update the expense item details."
                : "Fill in the details for the new expense item."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                Classification{" "}
                {!editingItem && <span className="text-red-400">*</span>}
              </Label>
              <Select
                value={form.expense_class_id}
                onValueChange={(v) =>
                  setForm((p) => ({ ...p, expense_class_id: v }))
                }
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select classification" />
                </SelectTrigger>
                <SelectContent>
                  {classifications.map((c) => (
                    <SelectItem
                      key={c.expense_class_id}
                      value={c.expense_class_id.toString()}
                    >
                      {c.expense_class_name}
                      {c.abbreviation ? ` (${c.abbreviation})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                Item Name <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.expense_class_item_name}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    expense_class_item_name: e.target.value,
                  }))
                }
                placeholder="e.g. Basic Salary"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                Account Code
              </Label>
              <Input
                value={form.expense_class_item_acc_code}
                onChange={(e) =>
                  setForm((p) => ({
                    ...p,
                    expense_class_item_acc_code: e.target.value,
                  }))
                }
                placeholder="e.g. 5-01-01-010"
                className="h-9 text-sm font-mono"
                maxLength={50}
              />
            </div>

            {editingItem && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Status
                </Label>
                <Select
                  value={form.is_active ? "active" : "inactive"}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, is_active: v === "active" }))
                  }
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs border-gray-200"
              onClick={() => setModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
              onClick={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Saving…
                </>
              ) : editingItem ? (
                "Update"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ Deactivate / Activate Confirm ════════ */}
      <AlertDialog
        open={!!deactivateTarget}
        onOpenChange={(o) => {
          if (!o) setDeactivateTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">
              {deactivateTarget?.is_active
                ? "Deactivate item?"
                : "Activate item?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700 block mb-1">
                {deactivateTarget?.expense_class_item_name}
              </span>
              {deactivateTarget?.is_active
                ? "This item will be marked inactive and hidden from budget plan forms."
                : "This item will be reactivated and available for use."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs border-gray-200"
              >
                Cancel
              </Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className={cn(
                  "h-8 text-xs",
                  deactivateTarget?.is_active
                    ? "bg-amber-600 hover:bg-amber-700"
                    : "bg-emerald-600 hover:bg-emerald-700"
                )}
                onClick={() =>
                  deactivateTarget && handleToggleActive(deactivateTarget)
                }
              >
                {deactivateTarget?.is_active ? "Deactivate" : "Activate"}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
};

export default ExpenseClassItemsPage;
