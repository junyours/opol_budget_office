// import React, { useState, useMemo, useEffect } from "react";
// import { useQuery } from "@tanstack/react-query";
// import { toast } from "sonner";
// import { cn } from "@/src/lib/utils";
// import { useDebounce } from "@/src/hooks/useDebounce";
// import API from "@/src/services/api";

// import { Button } from "@/src/components/ui/button";
// import { Input } from "@/src/components/ui/input";
// import { Badge } from "@/src/components/ui/badge";
// import { Checkbox } from "@/src/components/ui/checkbox";
// import {
//   Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
// } from "@/src/components/ui/select";
// import {
//   Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
// } from "@/src/components/ui/dialog";
// import {
//   DropdownMenu, DropdownMenuContent, DropdownMenuItem,
//   DropdownMenuSeparator, DropdownMenuTrigger,
// } from "@/src/components/ui/dropdown-menu";
// import {
//   Pagination, PaginationContent, PaginationEllipsis,
//   PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
// } from "@/src/components/ui/pagination";
// import {
//   MagnifyingGlassIcon, FunnelIcon, XMarkIcon, ArrowDownTrayIcon,
//   ChevronUpDownIcon, CheckIcon,
// } from "@heroicons/react/24/outline";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Department {
//   dept_id: number;
//   dept_name: string;
//   dept_abbreviation?: string;
// }

// interface BudgetPlan {
//   budget_plan_id: number;
//   year: number;
//   label?: string;
// }

// interface AipProgram {
//   aip_program_id: number;
//   aip_reference_code: string | null;
//   program_description: string;
//   dept_id: number;
//   is_active: boolean;
//   total_ps: number;
//   total_mooe: number;
//   total_co: number;
//   total_amount: number;
// }

// interface AipProgramRaw {
//   aip_program_id: number;
//   aip_reference_code: string | null;
//   program_description: string;
//   dept_id: number;
//   is_active: boolean;
// }

// // ─── Constants ─────────────────────────────────────────────────────────────────
// const PER_PAGE = 15;
// const ALL = "__all__";

// const fmt = (n: number) =>
//   n === 0 ? "—" : new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2 }).format(n);

// // ─── Hooks ────────────────────────────────────────────────────────────────────

// function useBudgetPlans() {
//   return useQuery<BudgetPlan[]>({
//     queryKey: ["budget-plans"],
//     queryFn: () => API.get("/budget-plans").then((r) => r.data?.data ?? []),
//     staleTime: 10 * 60 * 1000,
//   });
// }

// function useDepartments() {
//   return useQuery<Department[]>({
//     queryKey: ["departments"],
//     queryFn: () => API.get("/departments").then((r) => r.data?.data ?? []),
//     staleTime: 10 * 60 * 1000,
//   });
// }

// // Master list (all depts)
// function useAipMasterList() {
//   return useQuery<AipProgramRaw[]>({
//     queryKey: ["aip-programs-master"],
//     queryFn: async () => {
//       const res = await API.get("/aip-programs");
//       return res.data?.data ?? [];
//     },
//     staleTime: 5 * 60 * 1000,
//   });
// }

// // Amounts for a specific budget plan
// function useAipAmounts(planId: number | null) {
//   return useQuery<AipProgram[]>({
//     queryKey: ["aip-programs-amounts", planId],
//     queryFn: () =>
//       API.get("/aip-programs", { params: { budget_plan_id: planId } }).then(
//         (r) => r.data?.data ?? []
//       ),
//     enabled: !!planId,
//     staleTime: 5 * 60 * 1000,
//   });
// }

// // ─── Export Modal ─────────────────────────────────────────────────────────────

// interface ExportModalProps {
//   open: boolean;
//   onClose: () => void;
//   selected: AipProgram[];
//   departments: Department[];
//   budgetYear: number | null;
// }

// const ExportModal: React.FC<ExportModalProps> = ({
//   open, onClose, selected, departments, budgetYear,
// }) => {
//   const [purpose, setPurpose] = useState("");
//   const [exporting, setExporting] = useState(false);

//   const deptMap = new Map(departments.map((d) => [d.dept_id, d]));

//   const handleExport = async () => {
//     if (!purpose.trim()) {
//       toast.error("Please enter the purpose/program name.");
//       return;
//     }
//     setExporting(true);
//     try {
//       // Dynamic import of xlsx (SheetJS) — bundled via npm
//       const XLSX = await import("xlsx");

//       const wb = XLSX.utils.book_new();

//       // ── Cover sheet ────────────────────────────────────────────────────────
//       const coverData = [
//         ["MUNICIPALITY OF OPOL"],
//         ["Annual Investment Program (AIP) — Program Export"],
//         [`Budget Year: ${budgetYear ?? "N/A"}`],
//         [`Purpose / Program: ${purpose.trim()}`],
//         [`Generated: ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}`],
//         [],
//         [`Total Programs Selected: ${selected.length}`],
//         [
//           `Grand Total Amount: ₱${fmt(selected.reduce((s, p) => s + p.total_amount, 0))}`,
//         ],
//       ];
//       const coverWs = XLSX.utils.aoa_to_sheet(coverData);
//       coverWs["!cols"] = [{ wch: 60 }];
//       XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

//       // ── Programs sheet ─────────────────────────────────────────────────────
//       const headers = [
//         "Ref. Code",
//         "Program / Project Description",
//         "Department / Office",
//         "PS Amount",
//         "MOOE Amount",
//         "CO Amount",
//         "Total Amount",
//       ];

//       const rows = selected.map((p) => {
//         const dept = deptMap.get(p.dept_id);
//         return [
//           p.aip_reference_code ?? "",
//           p.program_description,
//           dept
//             ? `${dept.dept_abbreviation ? dept.dept_abbreviation + " — " : ""}${dept.dept_name}`
//             : `Dept #${p.dept_id}`,
//           p.total_ps,
//           p.total_mooe,
//           p.total_co,
//           p.total_amount,
//         ];
//       });

//       // Totals row
//       rows.push([
//         "",
//         "TOTAL",
//         "",
//         selected.reduce((s, p) => s + p.total_ps, 0),
//         selected.reduce((s, p) => s + p.total_mooe, 0),
//         selected.reduce((s, p) => s + p.total_co, 0),
//         selected.reduce((s, p) => s + p.total_amount, 0),
//       ]);

//       const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);

//       // Column widths
//       ws["!cols"] = [
//         { wch: 14 }, { wch: 52 }, { wch: 30 },
//         { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
//       ];

//       XLSX.utils.book_append_sheet(wb, ws, "AIP Programs");

//       const filename = `AIP_Programs_${budgetYear ?? "export"}_${purpose.trim().replace(/\s+/g, "_").slice(0, 30)}.xlsx`;
//       XLSX.writeFile(wb, filename);
//       toast.success(`Exported ${selected.length} programs to ${filename}`);
//       onClose();
//       setPurpose("");
//     } catch (err) {
//       console.error(err);
//       toast.error("Export failed. Make sure xlsx is installed.");
//     } finally {
//       setExporting(false);
//     }
//   };

//   const deptMap2 = new Map(departments.map((d) => [d.dept_id, d]));

//   return (
//     <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPurpose(""); } }}>
//       <DialogContent className="max-w-2xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
//         <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
//           <DialogTitle className="text-[15px] font-semibold text-gray-900">
//             Export AIP Programs
//           </DialogTitle>
//           <DialogDescription className="text-xs text-gray-400 mt-0.5">
//             {selected.length} program{selected.length !== 1 ? "s" : ""} selected · Budget Year {budgetYear ?? "N/A"}
//           </DialogDescription>
//         </DialogHeader>

//         <div className="px-6 py-5 space-y-4">
//           {/* Purpose input */}
//           <div className="space-y-1.5">
//             <label className="text-xs font-semibold text-gray-600">
//               Purpose / Program Name <span className="text-red-400">*</span>
//             </label>
//             <Input
//               value={purpose}
//               onChange={(e) => setPurpose(e.target.value)}
//               placeholder="e.g. GAD (Gender and Development)"
//               className="h-9 text-sm"
//               autoFocus
//             />
//             <p className="text-[11px] text-gray-400">
//               This will appear in the exported Excel file header.
//             </p>
//           </div>

//           {/* Preview table */}
//           <div>
//             <p className="text-xs font-semibold text-gray-600 mb-2">Selected Programs Preview</p>
//             <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
//               <table className="w-full text-[11px]">
//                 <thead className="sticky top-0 bg-gray-50">
//                   <tr>
//                     <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] border-b border-gray-200">Ref.</th>
//                     <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] border-b border-gray-200">Description</th>
//                     <th className="px-3 py-2 text-left text-gray-500 font-semibold uppercase tracking-wide text-[10px] border-b border-gray-200">Office</th>
//                     <th className="px-3 py-2 text-right text-gray-500 font-semibold uppercase tracking-wide text-[10px] border-b border-gray-200">Total</th>
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-100">
//                   {selected.map((p) => {
//                     const dept = deptMap2.get(p.dept_id);
//                     return (
//                       <tr key={p.aip_program_id} className="hover:bg-gray-50/60">
//                         <td className="px-3 py-2 font-mono text-gray-500">{p.aip_reference_code ?? "—"}</td>
//                         <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate">{p.program_description}</td>
//                         <td className="px-3 py-2 text-gray-500">{dept?.dept_abbreviation ?? dept?.dept_name ?? `#${p.dept_id}`}</td>
//                         <td className="px-3 py-2 text-right text-gray-800 font-mono">
//                           {p.total_amount === 0 ? <span className="text-gray-300">—</span> : fmt(p.total_amount)}
//                         </td>
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//                 <tfoot className="sticky bottom-0 bg-gray-50 border-t border-gray-200">
//                   <tr>
//                     <td colSpan={3} className="px-3 py-2 text-right text-[11px] font-semibold text-gray-700">Grand Total</td>
//                     <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
//                       {fmt(selected.reduce((s, p) => s + p.total_amount, 0))}
//                     </td>
//                   </tr>
//                 </tfoot>
//               </table>
//             </div>
//           </div>
//         </div>

//         <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
//           <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => { onClose(); setPurpose(""); }} disabled={exporting}>
//             Cancel
//           </Button>
//           <Button
//             size="sm"
//             className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
//             onClick={handleExport}
//             disabled={exporting || !purpose.trim()}
//           >
//             {exporting ? (
//               <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting…</>
//             ) : (
//               <><ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export Excel</>
//             )}
//           </Button>
//         </DialogFooter>
//       </DialogContent>
//     </Dialog>
//   );
// };

// // ─── Sort Icon ─────────────────────────────────────────────────────────────────
// type SortField = "ref" | "desc" | "dept" | "ps" | "mooe" | "co" | "total";

// const SortIcon = ({ field, active, dir }: { field: SortField; active: SortField; dir: "asc" | "desc" }) => (
//   <span className={cn("ml-1 text-[10px] leading-none", field === active ? "text-gray-700" : "text-gray-300")}>
//     {field === active ? (dir === "asc" ? "↑" : "↓") : "↕"}
//   </span>
// );

// // ─── Main Component ───────────────────────────────────────────────────────────

// const AipProgramsTab: React.FC = () => {
//   // ── Data ───────────────────────────────────────────────────────────────────
//   const { data: budgetPlans = [], isLoading: plansLoading } = useBudgetPlans();
//   const { data: departments = [], isLoading: deptsLoading } = useDepartments();
//   const { data: masterList = [], isLoading: masterLoading } = useAipMasterList();

//   // ── State ──────────────────────────────────────────────────────────────────
//   const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
//   const [showAmounts, setShowAmounts] = useState(true);

//   const [searchRaw, setSearchRaw] = useState("");
//   const debouncedSearch = useDebounce(searchRaw, 250);

//   const [filterDept, setFilterDept] = useState(ALL);
//   const [filterStatus, setFilterStatus] = useState("active");
//   const [filterAmountRange, setFilterAmountRange] = useState(ALL); // "all" | "with_amount" | "no_amount"

//   const [sortField, setSortField] = useState<SortField>("ref");
//   const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

//   const [page, setPage] = useState(1);
//   const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
//   const [exportOpen, setExportOpen] = useState(false);

//   // ── Amounts for selected plan ──────────────────────────────────────────────
//   const { data: amountData = [], isLoading: amountsLoading } = useAipAmounts(selectedPlanId);
//   const amountMap = useMemo(() => {
//     const m = new Map<number, AipProgram>();
//     amountData.forEach((p) => m.set(p.aip_program_id, p));
//     return m;
//   }, [amountData]);

//   // Auto-select most recent plan
//   useEffect(() => {
//     if (budgetPlans.length && !selectedPlanId) {
//       const sorted = [...budgetPlans].sort((a, b) => b.year - a.year);
//       setSelectedPlanId(sorted[0].budget_plan_id);
//     }
//   }, [budgetPlans, selectedPlanId]);

//   // ── Enrich master list with amounts ───────────────────────────────────────
//   const enriched: AipProgram[] = useMemo(() => {
//     return masterList.map((p) => {
//       const amt = amountMap.get(p.aip_program_id);
//       return {
//         ...p,
//         total_ps: amt?.total_ps ?? 0,
//         total_mooe: amt?.total_mooe ?? 0,
//         total_co: amt?.total_co ?? 0,
//         total_amount: amt?.total_amount ?? 0,
//       };
//     });
//   }, [masterList, amountMap]);

//   // ── Dept map ──────────────────────────────────────────────────────────────
//   const deptMap = useMemo(() => new Map(departments.map((d) => [d.dept_id, d])), [departments]);

//   // ── Filter + sort ─────────────────────────────────────────────────────────
//   const filtered = useMemo(() => {
//     let list = enriched;

//     if (filterDept !== ALL) list = list.filter((p) => p.dept_id.toString() === filterDept);

//     if (filterStatus === "active") list = list.filter((p) => p.is_active);
//     else if (filterStatus === "inactive") list = list.filter((p) => !p.is_active);

//     if (filterAmountRange === "with_amount") list = list.filter((p) => p.total_amount > 0);
//     else if (filterAmountRange === "no_amount") list = list.filter((p) => p.total_amount === 0);

//     const q = debouncedSearch.trim().toLowerCase();
//     if (q) {
//       list = list.filter((p) =>
//         p.program_description.toLowerCase().includes(q) ||
//         (p.aip_reference_code ?? "").toLowerCase().includes(q) ||
//         (deptMap.get(p.dept_id)?.dept_name ?? "").toLowerCase().includes(q) ||
//         (deptMap.get(p.dept_id)?.dept_abbreviation ?? "").toLowerCase().includes(q)
//       );
//     }

//     list = [...list].sort((a, b) => {
//       let av = "", bv = "";
//       if (sortField === "ref")   { av = a.aip_reference_code ?? ""; bv = b.aip_reference_code ?? ""; }
//       if (sortField === "desc")  { av = a.program_description; bv = b.program_description; }
//       if (sortField === "dept")  { av = deptMap.get(a.dept_id)?.dept_name ?? ""; bv = deptMap.get(b.dept_id)?.dept_name ?? ""; }
//       if (sortField === "ps")    return sortDir === "asc" ? a.total_ps - b.total_ps : b.total_ps - a.total_ps;
//       if (sortField === "mooe")  return sortDir === "asc" ? a.total_mooe - b.total_mooe : b.total_mooe - a.total_mooe;
//       if (sortField === "co")    return sortDir === "asc" ? a.total_co - b.total_co : b.total_co - a.total_co;
//       if (sortField === "total") return sortDir === "asc" ? a.total_amount - b.total_amount : b.total_amount - a.total_amount;
//       const c = av.localeCompare(bv);
//       return sortDir === "asc" ? c : -c;
//     });

//     return list;
//   }, [enriched, filterDept, filterStatus, filterAmountRange, debouncedSearch, sortField, sortDir, deptMap]);

//   // ── Pagination ─────────────────────────────────────────────────────────────
//   const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
//   const paginated = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

//   const getPageNumbers = (): (number | "ellipsis")[] => {
//     if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
//     const pages: (number | "ellipsis")[] = [1];
//     if (page > 3) pages.push("ellipsis");
//     for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
//     if (page < totalPages - 2) pages.push("ellipsis");
//     pages.push(totalPages);
//     return pages;
//   };

//   const resetPage = () => setPage(1);

//   // ── Selection ──────────────────────────────────────────────────────────────
//   const allPageIds = paginated.map((p) => p.aip_program_id);
//   const allPageSelected = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
//   const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

//   const toggleAll = () => {
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (allPageSelected) allPageIds.forEach((id) => next.delete(id));
//       else allPageIds.forEach((id) => next.add(id));
//       return next;
//     });
//   };

//   const toggleOne = (id: number) => {
//     setSelectedIds((prev) => {
//       const next = new Set(prev);
//       if (next.has(id)) next.delete(id);
//       else next.add(id);
//       return next;
//     });
//   };

//   const clearSelection = () => setSelectedIds(new Set());

//   // For export: get full AipProgram for selected ids from enriched list
//   const selectedPrograms: AipProgram[] = useMemo(
//     () => enriched.filter((p) => selectedIds.has(p.aip_program_id)),
//     [enriched, selectedIds]
//   );

//   const toggleSort = (field: SortField) => {
//     if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
//     else { setSortField(field); setSortDir("asc"); }
//     resetPage();
//   };

//   const isFiltered = filterDept !== ALL || filterStatus !== "active" || filterAmountRange !== ALL;
//   const isSearching = debouncedSearch.trim().length > 0;

//   const selectedPlan = budgetPlans.find((p) => p.budget_plan_id === selectedPlanId);
//   const loading = plansLoading || deptsLoading || masterLoading;

//   // ── Render ─────────────────────────────────────────────────────────────────
//   return (
//     <div className="p-6">

//       {/* ── Header ── */}
//       <div className="flex items-start justify-between mb-6">
//         <div>
//           <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Expenditure</span>
//           <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">AIP Programs</h1>
//           <p className="text-xs text-gray-400 mt-1">
//             Master list of Annual Investment Program entries with budget allocations.
//           </p>
//         </div>

//         <div className="flex items-center gap-2">
//           {selectedIds.size > 0 && (
//             <>
//               <span className="text-xs text-gray-500">
//                 <span className="font-semibold text-gray-800">{selectedIds.size}</span> selected
//               </span>
//               <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200 text-gray-500" onClick={clearSelection}>
//                 Clear
//               </Button>
//               <Button
//                 size="sm"
//                 className="h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
//                 onClick={() => setExportOpen(true)}
//               >
//                 <ArrowDownTrayIcon className="w-3.5 h-3.5" />
//                 Export ({selectedIds.size})
//               </Button>
//             </>
//           )}
//         </div>
//       </div>

//       {/* ── Controls row ── */}
//       <div className="flex items-center gap-3 mb-4 flex-wrap">

//         {/* Search */}
//         <div className="relative flex-1 min-w-[180px] max-w-xs">
//           <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
//           <Input
//             value={searchRaw}
//             onChange={(e) => { setSearchRaw(e.target.value); resetPage(); }}
//             placeholder="Search programs, ref code, dept…"
//             className="pl-8 h-8 text-xs border-gray-200 bg-white"
//           />
//           {isSearching && (
//             <button onClick={() => { setSearchRaw(""); resetPage(); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
//               <XMarkIcon className="w-3 h-3" />
//             </button>
//           )}
//         </div>

//         <FunnelIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />

//         {/* Department filter */}
//         <Select value={filterDept} onValueChange={(v) => { setFilterDept(v); resetPage(); }}>
//           <SelectTrigger className={cn("h-8 text-xs w-52 border-gray-200", filterDept !== ALL && "border-gray-400 bg-gray-50")}>
//             <SelectValue placeholder="All departments" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value={ALL} className="text-xs">All departments</SelectItem>
//             {departments.map((d) => (
//               <SelectItem key={d.dept_id} value={d.dept_id.toString()} className="text-xs">
//                 {d.dept_abbreviation ? `${d.dept_abbreviation} — ` : ""}{d.dept_name}
//               </SelectItem>
//             ))}
//           </SelectContent>
//         </Select>

//         {/* Status filter */}
//         <Select value={filterStatus} onValueChange={(v) => { setFilterStatus(v); resetPage(); }}>
//           <SelectTrigger className={cn("h-8 text-xs w-32 border-gray-200", filterStatus !== ALL && "border-gray-400 bg-gray-50")}>
//             <SelectValue placeholder="Status" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value={ALL} className="text-xs">All statuses</SelectItem>
//             <SelectItem value="active" className="text-xs">Active</SelectItem>
//             <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
//           </SelectContent>
//         </Select>

//         {/* Amount range filter */}
//         <Select value={filterAmountRange} onValueChange={(v) => { setFilterAmountRange(v); resetPage(); }}>
//           <SelectTrigger className={cn("h-8 text-xs w-40 border-gray-200", filterAmountRange !== ALL && "border-gray-400 bg-gray-50")}>
//             <SelectValue placeholder="Allocation" />
//           </SelectTrigger>
//           <SelectContent>
//             <SelectItem value={ALL} className="text-xs">Any allocation</SelectItem>
//             <SelectItem value="with_amount" className="text-xs">With allocation</SelectItem>
//             <SelectItem value="no_amount" className="text-xs">No allocation</SelectItem>
//           </SelectContent>
//         </Select>

//         {/* Count */}
//         <span className="text-[11px] text-gray-400 ml-auto shrink-0">
//           {isFiltered || isSearching ? (
//             <><span className="font-medium text-gray-600">{filtered.length}</span> of <span className="font-medium text-gray-600">{enriched.length}</span></>
//           ) : (
//             <span className="font-medium text-gray-600">{enriched.length}</span>
//           )}{" "}program{enriched.length !== 1 ? "s" : ""}
//         </span>
//       </div>

//       {/* ── Budget Year + Amount Toggle row ── */}
//       <div className="flex items-center gap-3 mb-4">
//         {/* Budget year selector */}
//         <div className="flex items-center gap-2">
//           <span className="text-xs text-gray-500 shrink-0">Budget Year:</span>
//           <Select
//             value={selectedPlanId?.toString() ?? ""}
//             onValueChange={(v) => setSelectedPlanId(Number(v))}
//           >
//             <SelectTrigger className="h-8 text-xs w-32 border-gray-200 bg-white">
//               <SelectValue placeholder="Select year" />
//             </SelectTrigger>
//             <SelectContent>
//               {[...budgetPlans].sort((a, b) => b.year - a.year).map((p) => (
//                 <SelectItem key={p.budget_plan_id} value={p.budget_plan_id.toString()} className="text-xs">
//                   {p.year}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//           {amountsLoading && (
//             <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
//           )}
//         </div>

//         {/* Show amounts toggle */}
//         <div className="flex items-center gap-2 ml-2">
//           <button
//             onClick={() => setShowAmounts((v) => !v)}
//             className={cn(
//               "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
//               showAmounts ? "bg-gray-900" : "bg-gray-200"
//             )}
//           >
//             <span className={cn(
//               "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
//               showAmounts ? "translate-x-4" : "translate-x-0"
//             )} />
//           </button>
//           <span className="text-xs text-gray-500">Show PS / MOOE / CO / Total</span>
//         </div>

//         {/* Active filters pills */}
//         {isFiltered && (
//           <div className="flex items-center gap-1.5 ml-2">
//             {filterDept !== ALL && (
//               <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
//                 {deptMap.get(Number(filterDept))?.dept_abbreviation ?? "Dept"}
//                 <button onClick={() => { setFilterDept(ALL); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
//               </span>
//             )}
//             {filterStatus !== ALL && (
//               <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
//                 {filterStatus}
//                 <button onClick={() => { setFilterStatus(ALL); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
//               </span>
//             )}
//             {filterAmountRange !== ALL && (
//               <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
//                 {filterAmountRange === "with_amount" ? "Has allocation" : "No allocation"}
//                 <button onClick={() => { setFilterAmountRange(ALL); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
//               </span>
//             )}
//             <button onClick={() => { setFilterDept(ALL); setFilterStatus("active"); setFilterAmountRange(ALL); resetPage(); }} className="text-[11px] text-gray-400 hover:text-gray-700 underline underline-offset-2">
//               Clear all
//             </button>
//           </div>
//         )}
//       </div>

//       {/* ── Table ── */}
//       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//         {loading ? (
//           <div className="flex items-center justify-center h-40 text-sm text-gray-400 gap-2">
//             <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
//             Loading…
//           </div>
//         ) : filtered.length === 0 ? (
//           <div className="text-center py-14 text-gray-400 text-sm">
//             {isSearching ? (
//               <>No programs match <span className="font-medium text-gray-600">"{debouncedSearch}"</span>.{" "}
//                 <button onClick={() => { setSearchRaw(""); resetPage(); }} className="underline underline-offset-2 text-gray-600 font-medium">Clear</button></>
//             ) : isFiltered ? (
//               <>No programs match the selected filters.{" "}
//                 <button onClick={() => { setFilterDept(ALL); setFilterStatus("active"); setFilterAmountRange(ALL); resetPage(); }} className="underline underline-offset-2 text-gray-600 font-medium">Clear filters</button></>
//             ) : (
//               <>No AIP programs found.</>
//             )}
//           </div>
//         ) : (
//           <>
//             <div className="overflow-x-auto">
//               <table className="w-full text-[12px] border-collapse">
//                 <thead>
//                   <tr>
//                     {/* Checkbox col */}
//                     <th className="border-b border-gray-200 bg-white px-3 py-2.5 w-10">
//                       <Checkbox
//                         checked={allPageSelected}
//                         onCheckedChange={toggleAll}
//                         ref={(el) => { if (el) (el as any).indeterminate = somePageSelected && !allPageSelected; }}
//                         className="w-3.5 h-3.5"
//                       />
//                     </th>
//                     <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-28"
//                       onClick={() => toggleSort("ref")}>
//                       Ref. Code <SortIcon field="ref" active={sortField} dir={sortDir} />
//                     </th>
//                     <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50"
//                       onClick={() => toggleSort("desc")}>
//                       Program / Project Description <SortIcon field="desc" active={sortField} dir={sortDir} />
//                     </th>
//                     <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-40"
//                       onClick={() => toggleSort("dept")}>
//                       Department <SortIcon field="dept" active={sortField} dir={sortDir} />
//                     </th>
//                     <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-24">
//                       Status
//                     </th>
//                     {showAmounts && (
//                       <>
//                         <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-right font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-28"
//                           onClick={() => toggleSort("ps")}>
//                           PS <SortIcon field="ps" active={sortField} dir={sortDir} />
//                         </th>
//                         <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-right font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-28"
//                           onClick={() => toggleSort("mooe")}>
//                           MOOE <SortIcon field="mooe" active={sortField} dir={sortDir} />
//                         </th>
//                         <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-right font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-28"
//                           onClick={() => toggleSort("co")}>
//                           CO <SortIcon field="co" active={sortField} dir={sortDir} />
//                         </th>
//                         <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-right font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50 w-32"
//                           onClick={() => toggleSort("total")}>
//                           Total <SortIcon field="total" active={sortField} dir={sortDir} />
//                         </th>
//                       </>
//                     )}
//                   </tr>
//                 </thead>
//                 <tbody className="divide-y divide-gray-100">
//                   {paginated.map((p) => {
//                     const dept = deptMap.get(p.dept_id);
//                     const isSelected = selectedIds.has(p.aip_program_id);
//                     return (
//                       <tr
//                         key={p.aip_program_id}
//                         className={cn(
//                           "hover:bg-gray-50/60 transition-colors",
//                           !p.is_active && "opacity-50",
//                           isSelected && "bg-blue-50/40"
//                         )}
//                       >
//                         <td className="px-3 py-3">
//                           <Checkbox
//                             checked={isSelected}
//                             onCheckedChange={() => toggleOne(p.aip_program_id)}
//                             className="w-3.5 h-3.5"
//                           />
//                         </td>
//                         <td className="px-3 py-3 font-mono text-gray-500 text-[11px]">
//                           {p.aip_reference_code ?? <span className="text-gray-300">—</span>}
//                         </td>
//                         <td className="px-3 py-3 font-medium text-gray-900 max-w-xs">
//                           {p.program_description}
//                         </td>
//                         <td className="px-3 py-3">
//                           {dept ? (
//                             <span className="text-gray-700">
//                               {dept.dept_abbreviation && (
//                                 <span className="font-mono text-[10px] text-gray-400 mr-1">{dept.dept_abbreviation}</span>
//                               )}
//                               <span className="text-gray-600 text-[11px]">{dept.dept_name}</span>
//                             </span>
//                           ) : (
//                             <span className="text-gray-300">—</span>
//                           )}
//                         </td>
//                         <td className="px-3 py-3">
//                           <Badge variant="outline" className={cn(
//                             "text-[10px] font-semibold px-2 py-0.5 rounded-full",
//                             p.is_active
//                               ? "text-emerald-700 bg-emerald-50 border-emerald-200"
//                               : "text-gray-500 bg-gray-50 border-gray-200"
//                           )}>
//                             {p.is_active ? "Active" : "Inactive"}
//                           </Badge>
//                         </td>
//                         {showAmounts && (
//                           <>
//                             <td className="px-3 py-3 text-right font-mono text-gray-600 text-[11px]">
//                               {p.total_ps === 0 ? <span className="text-gray-300">—</span> : fmt(p.total_ps)}
//                             </td>
//                             <td className="px-3 py-3 text-right font-mono text-gray-600 text-[11px]">
//                               {p.total_mooe === 0 ? <span className="text-gray-300">—</span> : fmt(p.total_mooe)}
//                             </td>
//                             <td className="px-3 py-3 text-right font-mono text-gray-600 text-[11px]">
//                               {p.total_co === 0 ? <span className="text-gray-300">—</span> : fmt(p.total_co)}
//                             </td>
//                             <td className="px-3 py-3 text-right">
//                               {p.total_amount === 0
//                                 ? <span className="text-gray-300 font-mono text-[11px]">—</span>
//                                 : <span className="font-mono font-semibold text-gray-900 text-[11px]">{fmt(p.total_amount)}</span>
//                               }
//                             </td>
//                           </>
//                         )}
//                       </tr>
//                     );
//                   })}
//                 </tbody>
//                 {/* Totals footer */}
//                 {showAmounts && filtered.length > 0 && (
//                   <tfoot>
//                     <tr className="border-t-2 border-gray-200 bg-gray-50/80">
//                       <td colSpan={5} className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
//                         {isFiltered || isSearching ? `Filtered total (${filtered.length})` : `Total (${filtered.length})`}
//                       </td>
//                       <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800 text-[11px]">
//                         {fmt(filtered.reduce((s, p) => s + p.total_ps, 0))}
//                       </td>
//                       <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800 text-[11px]">
//                         {fmt(filtered.reduce((s, p) => s + p.total_mooe, 0))}
//                       </td>
//                       <td className="px-3 py-2.5 text-right font-mono font-semibold text-gray-800 text-[11px]">
//                         {fmt(filtered.reduce((s, p) => s + p.total_co, 0))}
//                       </td>
//                       <td className="px-3 py-2.5 text-right font-mono font-bold text-gray-900 text-[12px]">
//                         {fmt(filtered.reduce((s, p) => s + p.total_amount, 0))}
//                       </td>
//                     </tr>
//                   </tfoot>
//                 )}
//               </table>
//             </div>

//             {/* Pagination */}
//             {totalPages > 1 && (
//               <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
//                 <p className="text-[11px] text-gray-400">
//                   Showing <span className="font-medium text-gray-600">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}</span>{" "}
//                   of <span className="font-medium text-gray-600">{filtered.length}</span>
//                 </p>
//                 <Pagination className="w-auto mx-0">
//                   <PaginationContent className="gap-0.5">
//                     <PaginationItem>
//                       <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))}
//                         className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === 1 && "pointer-events-none opacity-40")} />
//                     </PaginationItem>
//                     {getPageNumbers().map((p, i) =>
//                       p === "ellipsis" ? (
//                         <PaginationItem key={`e-${i}`}><PaginationEllipsis className="h-7 w-7 text-[11px]" /></PaginationItem>
//                       ) : (
//                         <PaginationItem key={p}>
//                           <PaginationLink onClick={() => setPage(p)} isActive={page === p}
//                             className={cn("h-7 w-7 text-[11px] rounded-md cursor-pointer", page === p ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : "text-gray-600 hover:bg-gray-50")}>
//                             {p}
//                           </PaginationLink>
//                         </PaginationItem>
//                       )
//                     )}
//                     <PaginationItem>
//                       <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
//                         className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === totalPages && "pointer-events-none opacity-40")} />
//                     </PaginationItem>
//                   </PaginationContent>
//                 </Pagination>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* Export modal */}
//       <ExportModal
//         open={exportOpen}
//         onClose={() => setExportOpen(false)}
//         selected={selectedPrograms}
//         departments={departments}
//         budgetYear={selectedPlan?.year ?? null}
//       />
//     </div>
//   );
// };

// export default AipProgramsTab;

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
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/src/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from "@/src/components/ui/pagination";
import {
  MagnifyingGlassIcon, FunnelIcon, XMarkIcon, ArrowDownTrayIcon,
  PencilSquareIcon, NoSymbolIcon, CheckCircleIcon,
} from "@heroicons/react/24/outline";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department {
  dept_id: number;
  dept_name: string;
  dept_abbreviation?: string;
}

interface BudgetPlan {
  budget_plan_id: number;
  year: number;
  status?: string;
  label?: string;
}

interface AipProgram {
  aip_program_id: number;
  aip_reference_code: string | null;
  program_description: string;
  dept_id: number;
  is_active: boolean;
  total_ps: number;
  total_mooe: number;
  total_co: number;
  total_amount: number;
}

interface AipProgramRaw {
  aip_program_id: number;
  aip_reference_code: string | null;
  program_description: string;
  dept_id: number;
  is_active: boolean;
}

interface ContextMenuState {
  x: number;
  y: number;
  program: AipProgram;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const PER_PAGE = 15;
const ALL = "__all__";

/** Display: locale comma + 2 decimal places */
const fmt = (n: number) =>
  n === 0
    ? "—"
    : new Intl.NumberFormat("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

// ─── Hooks ────────────────────────────────────────────────────────────────────

function useBudgetPlans() {
  return useQuery<BudgetPlan[]>({
    queryKey: ["budget-plans"],
    queryFn: () => API.get("/budget-plans").then((r) => r.data?.data ?? []),
    staleTime: 10 * 60 * 1000,
  });
}

function useActiveBudgetPlan() {
  return useQuery<BudgetPlan | null>({
    queryKey: ["budget-plan-active"],
    queryFn: () =>
      API.get("/budget-plans/active")
        .then((r) => r.data?.data ?? null)
        .catch(() => null),
    staleTime: 10 * 60 * 1000,
  });
}

function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["departments"],
    queryFn: () => API.get("/departments").then((r) => r.data?.data ?? []),
    staleTime: 10 * 60 * 1000,
  });
}

function useAipMasterList() {
  return useQuery<AipProgramRaw[]>({
    queryKey: ["aip-programs-master"],
    queryFn: async () => {
      const res = await API.get("/aip-programs");
      return res.data?.data ?? [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

function useAipAmounts(planId: number | null) {
  return useQuery<AipProgram[]>({
    queryKey: ["aip-programs-amounts", planId],
    queryFn: () =>
      API.get("/aip-programs", { params: { budget_plan_id: planId } }).then(
        (r) => r.data?.data ?? []
      ),
    enabled: !!planId,
    staleTime: 5 * 60 * 1000,
  });
}

// ─── Sort Icon ────────────────────────────────────────────────────────────────
type SortField = "ref" | "desc" | "dept" | "ps" | "mooe" | "co" | "total";

const SortIcon = ({ field, active, dir }: { field: SortField; active: SortField; dir: "asc" | "desc" }) => (
  <span className={cn("ml-1 text-[10px] leading-none", field === active ? "text-gray-700" : "text-gray-300")}>
    {field === active ? (dir === "asc" ? "↑" : "↓") : "↕"}
  </span>
);

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  program: AipProgram | null;
  onClose: () => void;
  onSaved: () => void;
}

const EditModal: React.FC<EditModalProps> = ({ program, onClose, onSaved }) => {
  const [desc, setDesc]       = useState("");
  const [refCode, setRefCode] = useState("");
  const [saving, setSaving]   = useState(false);

  useEffect(() => {
    if (program) {
      setDesc(program.program_description);
      setRefCode(program.aip_reference_code ?? "");
    }
  }, [program]);

  const handleSave = async () => {
    if (!desc.trim()) { toast.error("Description is required."); return; }
    if (!program) return;
    setSaving(true);
    try {
      await API.put(`/aip-programs/${program.aip_program_id}`, {
        program_description: desc.trim(),
        aip_reference_code:  refCode.trim() || null,
      });
      toast.success("Program updated.");
      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={!!program} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">Edit AIP Program</DialogTitle>
          <DialogDescription className="text-xs text-gray-400 mt-0.5">
            Update the program description and reference code.
          </DialogDescription>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">Reference Code</label>
            <Input value={refCode} onChange={(e) => setRefCode(e.target.value)}
              placeholder="e.g. AIP-2025-001" className="h-9 text-sm font-mono" maxLength={80} />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">
              Program / Project Description <span className="text-red-400">*</span>
            </label>
            <textarea
              value={desc}
              onChange={(e) => setDesc(e.target.value)}
              rows={4}
              placeholder="Enter program description…"
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-900/20 resize-none"
            />
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
            onClick={onClose} disabled={saving}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
            onClick={handleSave} disabled={saving || !desc.trim()}>
            {saving
              ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
              : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Export Modal ─────────────────────────────────────────────────────────────

interface ExportModalProps {
  open: boolean;
  onClose: () => void;
  selected: AipProgram[];
  departments: Department[];
  budgetYear: number | null;
}

const ExportModal: React.FC<ExportModalProps> = ({ open, onClose, selected, departments, budgetYear }) => {
  const [purpose, setPurpose]   = useState("");
  const [exporting, setExporting] = useState(false);

  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.dept_id, d])),
    [departments]
  );

  const handleExport = async () => {
    if (!purpose.trim()) { toast.error("Please enter the purpose/program name."); return; }
    setExporting(true);
    try {
      const XLSX = await import("xlsx");
      const wb   = XLSX.utils.book_new();

      // ── Cover sheet ───────────────────────────────────────────────────────
      const grandTotal = selected.reduce((s, p) => s + p.total_amount, 0);
      const coverData  = [
        ["MUNICIPALITY OF OPOL"],
        ["Annual Investment Program (AIP) — Program Export"],
        [`Budget Year: ${budgetYear ?? "N/A"}`],
        [`Purpose / Program: ${purpose.trim()}`],
        [`Generated: ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })}`],
        [],
        [`Total Programs Selected: ${selected.length}`],
        [`Grand Total Amount: ${Math.round(grandTotal).toLocaleString("en-US")}`],
      ];
      const coverWs = XLSX.utils.aoa_to_sheet(coverData);
      coverWs["!cols"] = [{ wch: 60 }];
      XLSX.utils.book_append_sheet(wb, coverWs, "Cover");

      // ── Programs sheet ────────────────────────────────────────────────────
      const headers = [
        "Ref. Code",
        "Program / Project Description",
        "Department / Office",
        "PS Amount",
        "MOOE Amount",
        "CO Amount",
        "Total Amount",
      ];

      const dataRows = selected.map((p) => {
        const dept = deptMap.get(p.dept_id);
        return [
          p.aip_reference_code ?? "",
          p.program_description,
          dept
            ? `${dept.dept_abbreviation ? dept.dept_abbreviation + " — " : ""}${dept.dept_name}`
            : `Dept #${p.dept_id}`,
          // Numbers — Excel will format with #,##0
          Math.round(p.total_ps),
          Math.round(p.total_mooe),
          Math.round(p.total_co),
          Math.round(p.total_amount),
        ];
      });

      // Totals row
      dataRows.push([
        "",
        "TOTAL",
        "",
        Math.round(selected.reduce((s, p) => s + p.total_ps, 0)),
        Math.round(selected.reduce((s, p) => s + p.total_mooe, 0)),
        Math.round(selected.reduce((s, p) => s + p.total_co, 0)),
        Math.round(selected.reduce((s, p) => s + p.total_amount, 0)),
      ]);

      const ws = XLSX.utils.aoa_to_sheet([headers, ...dataRows]);

      // Apply #,##0 (comma, no decimal) to amount columns D-G (col index 3-6)
      const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
      for (let R = 1; R <= range.e.r; R++) {
        for (let C = 3; C <= 6; C++) {
          const addr = XLSX.utils.encode_cell({ r: R, c: C });
          if (ws[addr] && ws[addr].t === "n") {
            ws[addr].z = "#,##0";
          }
        }
      }

      ws["!cols"] = [
        { wch: 14 }, { wch: 52 }, { wch: 30 },
        { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 18 },
      ];

      XLSX.utils.book_append_sheet(wb, ws, "AIP Programs");

      const filename = `AIP_Programs_${budgetYear ?? "export"}_${purpose.trim().replace(/\s+/g, "_").slice(0, 30)}.xlsx`;
      XLSX.writeFile(wb, filename);
      toast.success(`Exported ${selected.length} programs to ${filename}`);
      onClose();
      setPurpose("");
    } catch (err) {
      console.error(err);
      toast.error("Export failed. Make sure xlsx is installed: npm install xlsx");
    } finally {
      setExporting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { onClose(); setPurpose(""); } }}>
      <DialogContent className="max-w-2xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">Export AIP Programs</DialogTitle>
          <DialogDescription className="text-xs text-gray-400 mt-0.5">
            {selected.length} program{selected.length !== 1 ? "s" : ""} selected · Budget Year {budgetYear ?? "N/A"}
          </DialogDescription>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-600">
              Purpose / Program Name <span className="text-red-400">*</span>
            </label>
            <Input value={purpose} onChange={(e) => setPurpose(e.target.value)}
              placeholder="e.g. GAD (Gender and Development)"
              className="h-9 text-sm" autoFocus />
            <p className="text-[11px] text-gray-400">This will appear in the exported Excel file header.</p>
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">Selected Programs Preview</p>
            <div className="border border-gray-200 rounded-xl overflow-hidden max-h-64 overflow-y-auto">
              <table className="w-full text-[11px]">
                <thead className="sticky top-0 bg-gray-50">
                  <tr>
                    {["Ref.", "Description", "Office", "Total"].map((h, i) => (
                      <th key={h} className={cn(
                        "px-3 py-2 font-semibold uppercase tracking-wide text-[10px] text-gray-500 border-b border-gray-200",
                        i === 3 ? "text-right" : "text-left"
                      )}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {selected.map((p) => {
                    const dept = deptMap.get(p.dept_id);
                    return (
                      <tr key={p.aip_program_id} className="hover:bg-gray-50/60">
                        <td className="px-3 py-2 font-mono text-gray-500">{p.aip_reference_code ?? "—"}</td>
                        <td className="px-3 py-2 text-gray-800 font-medium max-w-[200px] truncate">{p.program_description}</td>
                        <td className="px-3 py-2 text-gray-500">{dept?.dept_abbreviation ?? dept?.dept_name ?? `#${p.dept_id}`}</td>
                        <td className="px-3 py-2 text-right font-mono">
                          {p.total_amount === 0 ? <span className="text-gray-300">—</span> : fmt(p.total_amount)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="sticky bottom-0 bg-gray-50 border-t border-gray-200">
                  <tr>
                    <td colSpan={3} className="px-3 py-2 text-right text-[11px] font-semibold text-gray-700">Grand Total</td>
                    <td className="px-3 py-2 text-right font-mono font-semibold text-gray-900">
                      {fmt(selected.reduce((s, p) => s + p.total_amount, 0))}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
            onClick={() => { onClose(); setPurpose(""); }} disabled={exporting}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
            onClick={handleExport} disabled={exporting || !purpose.trim()}>
            {exporting
              ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Exporting…</>
              : <><ArrowDownTrayIcon className="w-3.5 h-3.5" /> Export Excel</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const AipProgramsTab: React.FC = () => {
  const queryClient = useQueryClient();

  // ── Data ──────────────────────────────────────────────────────────────────
  const { data: budgetPlans = [],  isLoading: plansLoading }      = useBudgetPlans();
  const { data: activePlan,        isLoading: activePlanLoading }  = useActiveBudgetPlan();
  const { data: departments = [],  isLoading: deptsLoading }       = useDepartments();
  const { data: masterList = [],   isLoading: masterLoading }      = useAipMasterList();

  // ── UI state ──────────────────────────────────────────────────────────────
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const [showAmounts, setShowAmounts]       = useState(true);

  const [searchRaw, setSearchRaw]           = useState("");
  const debouncedSearch                     = useDebounce(searchRaw, 250);

  const [filterDept, setFilterDept]         = useState(ALL);
  const [filterStatus, setFilterStatus]     = useState("active");
  const [filterAmountRange, setFilterAmountRange] = useState(ALL);

  const [sortField, setSortField] = useState<SortField>("ref");
  const [sortDir, setSortDir]     = useState<"asc" | "desc">("asc");

  const [page, setPage]           = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [exportOpen, setExportOpen]   = useState(false);

  // ── Context menu ──────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu]     = useState<ContextMenuState | null>(null);
  const ctxRef                    = useRef<HTMLDivElement>(null);

  // ── Edit / toggle modals ──────────────────────────────────────────────────
  const [editProgram, setEditProgram]   = useState<AipProgram | null>(null);
  const [toggleTarget, setToggleTarget] = useState<AipProgram | null>(null);
  const [toggling, setToggling]         = useState(false);

  // ── Default to active budget plan ─────────────────────────────────────────
  useEffect(() => {
    if (!selectedPlanId) {
      if (activePlan) {
        setSelectedPlanId(activePlan.budget_plan_id);
      } else if (!activePlanLoading && budgetPlans.length) {
        const sorted = [...budgetPlans].sort((a, b) => b.year - a.year);
        setSelectedPlanId(sorted[0].budget_plan_id);
      }
    }
  }, [activePlan, activePlanLoading, budgetPlans, selectedPlanId]);

  // ── Close ctx menu on outside click ──────────────────────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  // ── Amounts ───────────────────────────────────────────────────────────────
  const { data: amountData = [], isLoading: amountsLoading } = useAipAmounts(selectedPlanId);
  const amountMap = useMemo(() => {
    const m = new Map<number, AipProgram>();
    amountData.forEach((p) => m.set(p.aip_program_id, p));
    return m;
  }, [amountData]);

  // ── Enrich master list ────────────────────────────────────────────────────
  const enriched: AipProgram[] = useMemo(() =>
    masterList.map((p) => {
      const amt = amountMap.get(p.aip_program_id);
      return {
        ...p,
        total_ps:     amt?.total_ps     ?? 0,
        total_mooe:   amt?.total_mooe   ?? 0,
        total_co:     amt?.total_co     ?? 0,
        total_amount: amt?.total_amount ?? 0,
      };
    }),
  [masterList, amountMap]);

  const deptMap = useMemo(
    () => new Map(departments.map((d) => [d.dept_id, d])),
    [departments]
  );

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = enriched;
    if (filterDept !== ALL)            list = list.filter((p) => p.dept_id.toString() === filterDept);
    if (filterStatus === "active")     list = list.filter((p) => p.is_active);
    if (filterStatus === "inactive")   list = list.filter((p) => !p.is_active);
    if (filterAmountRange === "with_amount") list = list.filter((p) => p.total_amount > 0);
    if (filterAmountRange === "no_amount")   list = list.filter((p) => p.total_amount === 0);
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter((p) =>
        p.program_description.toLowerCase().includes(q) ||
        (p.aip_reference_code ?? "").toLowerCase().includes(q) ||
        (deptMap.get(p.dept_id)?.dept_name ?? "").toLowerCase().includes(q) ||
        (deptMap.get(p.dept_id)?.dept_abbreviation ?? "").toLowerCase().includes(q)
      );
    }
    list = [...list].sort((a, b) => {
      if (sortField === "ps")    return sortDir === "asc" ? a.total_ps - b.total_ps : b.total_ps - a.total_ps;
      if (sortField === "mooe")  return sortDir === "asc" ? a.total_mooe - b.total_mooe : b.total_mooe - a.total_mooe;
      if (sortField === "co")    return sortDir === "asc" ? a.total_co - b.total_co : b.total_co - a.total_co;
      if (sortField === "total") return sortDir === "asc" ? a.total_amount - b.total_amount : b.total_amount - a.total_amount;
      let av = "", bv = "";
      if (sortField === "ref")  { av = a.aip_reference_code ?? ""; bv = b.aip_reference_code ?? ""; }
      if (sortField === "desc") { av = a.program_description;       bv = b.program_description; }
      if (sortField === "dept") { av = deptMap.get(a.dept_id)?.dept_name ?? ""; bv = deptMap.get(b.dept_id)?.dept_name ?? ""; }
      const c = av.localeCompare(bv);
      return sortDir === "asc" ? c : -c;
    });
    return list;
  }, [enriched, filterDept, filterStatus, filterAmountRange, debouncedSearch, sortField, sortDir, deptMap]);

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

  const resetPage = () => setPage(1);

  // ── Selection ─────────────────────────────────────────────────────────────
  const allPageIds       = paginated.map((p) => p.aip_program_id);
  const allPageSelected  = allPageIds.length > 0 && allPageIds.every((id) => selectedIds.has(id));
  const somePageSelected = allPageIds.some((id) => selectedIds.has(id));

  const toggleAll = () =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      allPageSelected ? allPageIds.forEach((id) => next.delete(id)) : allPageIds.forEach((id) => next.add(id));
      return next;
    });

  const toggleOne = (id: number) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });

  const selectedPrograms: AipProgram[] = useMemo(
    () => enriched.filter((p) => selectedIds.has(p.aip_program_id)),
    [enriched, selectedIds]
  );

  const toggleSort = (field: SortField) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("asc"); }
    resetPage();
  };

  // ── Row click → context menu ──────────────────────────────────────────────
  const handleRowClick = (e: React.MouseEvent, program: AipProgram) => {
    if ((e.target as HTMLElement).closest("[data-checkbox]")) return;
    e.preventDefault();
    const MENU_W = 180, MENU_H = 110;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, program });
  };

  // ── Edit ──────────────────────────────────────────────────────────────────
  const handleEdit = (program: AipProgram) => {
    setCtxMenu(null);
    setEditProgram(program);
  };

  const onEditSaved = () => {
    queryClient.invalidateQueries({ queryKey: ["aip-programs-master"] });
    queryClient.invalidateQueries({ queryKey: ["aip-programs-amounts", selectedPlanId] });
  };

  // ── Toggle active / deactivate ────────────────────────────────────────────
  const handleToggleIntent = (program: AipProgram) => {
    setCtxMenu(null);
    if (program.is_active && (program.total_ps > 0 || program.total_mooe > 0 || program.total_co > 0)) {
      const planYear = budgetPlans.find((p) => p.budget_plan_id === selectedPlanId)?.year;
      toast.error(
        `Cannot deactivate — "${program.program_description}" has allocations in Budget Year ${planYear ?? "the selected plan"}. ` +
        `Please remove all PS, MOOE, and CO amounts first before deactivating.`,
        { duration: 7000 }
      );
      return;
    }
    setToggleTarget(program);
  };

  const confirmToggle = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await API.put(`/aip-programs/${toggleTarget.aip_program_id}`, {
        is_active: !toggleTarget.is_active,
      });
      toast.success(toggleTarget.is_active ? "Program deactivated." : "Program activated.");
      queryClient.invalidateQueries({ queryKey: ["aip-programs-master"] });
      queryClient.invalidateQueries({ queryKey: ["aip-programs-amounts", selectedPlanId] });
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? "Failed to update.");
    } finally {
      setToggling(false);
      setToggleTarget(null);
    }
  };

  const isFiltered   = filterDept !== ALL || filterStatus !== "active" || filterAmountRange !== ALL;
  const isSearching  = debouncedSearch.trim().length > 0;
  const selectedPlan = budgetPlans.find((p) => p.budget_plan_id === selectedPlanId);
  const loading      = plansLoading || activePlanLoading || deptsLoading || masterLoading;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 relative">

      {/* ── Header ── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Expenditure</span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">AIP Programs</h1>
          <p className="text-xs text-gray-400 mt-1">
            Master list of Annual Investment Program entries with budget allocations.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              <span className="text-xs text-gray-500">
                <span className="font-semibold text-gray-800">{selectedIds.size}</span> selected
              </span>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200 text-gray-500"
                onClick={() => setSelectedIds(new Set())}>Clear</Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-emerald-700 hover:bg-emerald-800 text-white"
                onClick={() => setExportOpen(true)}>
                <ArrowDownTrayIcon className="w-3.5 h-3.5" />
                Export ({selectedIds.size})
              </Button>
            </>
          )}
        </div>
      </div>

      {/* ── Filter bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input value={searchRaw} onChange={(e) => { setSearchRaw(e.target.value); resetPage(); }}
            placeholder="Search programs, ref code, dept…"
            className="pl-8 h-8 text-xs border-gray-200 bg-white" />
          {isSearching && (
            <button onClick={() => { setSearchRaw(""); resetPage(); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600">
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        <FunnelIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />

        <Select value={filterDept} onValueChange={(v) => { setFilterDept(v); resetPage(); }}>
          <SelectTrigger className={cn("h-8 text-xs w-52 border-gray-200", filterDept !== ALL && "border-gray-400 bg-gray-50")}>
            <SelectValue placeholder="All departments" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="text-xs">All departments</SelectItem>
            {departments.map((d) => (
              <SelectItem key={d.dept_id} value={d.dept_id.toString()} className="text-xs">
                {d.dept_abbreviation ? `${d.dept_abbreviation} — ` : ""}{d.dept_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

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

        <Select value={filterAmountRange} onValueChange={(v) => { setFilterAmountRange(v); resetPage(); }}>
          <SelectTrigger className={cn("h-8 text-xs w-40 border-gray-200", filterAmountRange !== ALL && "border-gray-400 bg-gray-50")}>
            <SelectValue placeholder="Allocation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL} className="text-xs">Any allocation</SelectItem>
            <SelectItem value="with_amount" className="text-xs">With allocation</SelectItem>
            <SelectItem value="no_amount" className="text-xs">No allocation</SelectItem>
          </SelectContent>
        </Select>

        <span className="text-[11px] text-gray-400 ml-auto shrink-0">
          {isFiltered || isSearching
            ? <><span className="font-medium text-gray-600">{filtered.length}</span> of <span className="font-medium text-gray-600">{enriched.length}</span></>
            : <span className="font-medium text-gray-600">{enriched.length}</span>
          }{" "}program{enriched.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* ── Budget Year + Toggle ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-500 shrink-0">Budget Year:</span>
          <Select value={selectedPlanId?.toString() ?? ""} onValueChange={(v) => setSelectedPlanId(Number(v))}>
            <SelectTrigger className="h-8 text-xs w-36 border-gray-200 bg-white">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {[...budgetPlans].sort((a, b) => b.year - a.year).map((p) => (
                <SelectItem key={p.budget_plan_id} value={p.budget_plan_id.toString()} className="text-xs">
                  <span className="flex items-center gap-1.5">
                    {p.year}
                    {p.budget_plan_id === activePlan?.budget_plan_id && (
                      <span className="text-[10px] text-emerald-600 font-semibold">(Active)</span>
                    )}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {amountsLoading && (
            <span className="w-3.5 h-3.5 border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
          )}
          {selectedPlan && activePlan?.budget_plan_id === selectedPlanId && (
            <Badge variant="outline" className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border-emerald-200 px-2 py-0.5 rounded-full">
              Active Plan
            </Badge>
          )}
        </div>

        <div className="flex items-center gap-2 ml-2">
          <button onClick={() => setShowAmounts((v) => !v)}
            className={cn(
              "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
              showAmounts ? "bg-gray-900" : "bg-gray-200"
            )}>
            <span className={cn(
              "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform",
              showAmounts ? "translate-x-4" : "translate-x-0"
            )} />
          </button>
          <span className="text-xs text-gray-500">Show PS / MOOE / CO / Total</span>
        </div>

        {isFiltered && (
          <div className="flex items-center gap-1.5 ml-2 flex-wrap">
            {filterDept !== ALL && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                {deptMap.get(Number(filterDept))?.dept_abbreviation ?? "Dept"}
                <button onClick={() => { setFilterDept(ALL); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
              </span>
            )}
            {filterStatus !== "active" && filterStatus !== ALL && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                {filterStatus}
                <button onClick={() => { setFilterStatus("active"); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
              </span>
            )}
            {filterAmountRange !== ALL && (
              <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
                {filterAmountRange === "with_amount" ? "Has allocation" : "No allocation"}
                <button onClick={() => { setFilterAmountRange(ALL); resetPage(); }} className="text-gray-400 hover:text-gray-700 ml-0.5"><XMarkIcon className="w-3 h-3" /></button>
              </span>
            )}
            <button onClick={() => { setFilterDept(ALL); setFilterStatus("active"); setFilterAmountRange(ALL); resetPage(); }}
              className="text-[11px] text-gray-400 hover:text-gray-700 underline underline-offset-2">
              Clear all
            </button>
          </div>
        )}

        <span className="text-[10px] text-gray-400 ml-auto italic hidden sm:block">
          Click a row to edit or toggle status
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="flex items-center justify-center h-40 text-sm text-gray-400 gap-2">
            <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
            Loading…
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching
              ? <><span>No programs match </span><span className="font-medium text-gray-600">"{debouncedSearch}"</span>.{" "}
                  <button onClick={() => { setSearchRaw(""); resetPage(); }} className="underline underline-offset-2 text-gray-600 font-medium">Clear</button></>
              : isFiltered
                ? <><span>No programs match the selected filters. </span>
                    <button onClick={() => { setFilterDept(ALL); setFilterStatus("active"); setFilterAmountRange(ALL); resetPage(); }}
                      className="underline underline-offset-2 text-gray-600 font-medium">Clear filters</button></>
                : <span>No AIP programs found.</span>
            }
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 bg-white px-3 py-2.5 w-10">
                      <div data-checkbox>
                        <Checkbox checked={allPageSelected} onCheckedChange={toggleAll} className="w-3.5 h-3.5" />
                      </div>
                    </th>
                    {[
                      { label: "Ref. Code",                     field: "ref"   as SortField, cls: "w-28 text-left" },
                      { label: "Program / Project Description",  field: "desc"  as SortField, cls: "text-left" },
                      { label: "Department",                     field: "dept"  as SortField, cls: "w-44 text-left" },
                    ].map(({ label, field, cls }) => (
                      <th key={field}
                        className={cn("border-b border-gray-200 bg-white px-3 py-2.5 font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50", cls)}
                        onClick={() => toggleSort(field)}>
                        {label} <SortIcon field={field} active={sortField} dir={sortDir} />
                      </th>
                    ))}
                    <th className="border-b border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-24">
                      Status
                    </th>
                    {showAmounts && (
                      <>
                        {(["ps", "mooe", "co", "total"] as SortField[]).map((field) => (
                          <th key={field}
                            className={cn("border-b border-gray-200 bg-white px-3 py-2.5 text-right font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:bg-gray-50",
                              field === "total" ? "w-32" : "w-28")}
                            onClick={() => toggleSort(field)}>
                            {field.toUpperCase()} <SortIcon field={field} active={sortField} dir={sortDir} />
                          </th>
                        ))}
                      </>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map((p) => {
                    const dept       = deptMap.get(p.dept_id);
                    const isSelected = selectedIds.has(p.aip_program_id);
                    return (
                      <tr
                        key={p.aip_program_id}
                        onClick={(e) => handleRowClick(e, p)}
                        onContextMenu={(e) => { e.preventDefault(); handleRowClick(e, p); }}
                        className={cn(
                          "hover:bg-gray-50/80 transition-colors cursor-pointer select-none",
                          !p.is_active && "opacity-50",
                          isSelected && "bg-blue-50/40"
                        )}
                      >
                        <td className="px-3 py-3" data-checkbox onClick={(e) => e.stopPropagation()}>
                          <Checkbox checked={isSelected} onCheckedChange={() => toggleOne(p.aip_program_id)} className="w-3.5 h-3.5" />
                        </td>
                        <td className="px-3 py-3 font-mono text-gray-500 text-[11px]">
                          {p.aip_reference_code ?? <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-3 py-3 font-medium text-gray-900">{p.program_description}</td>
                        <td className="px-3 py-3">
                          {dept
                            ? <span>
                                {dept.dept_abbreviation && <span className="font-mono text-[10px] text-gray-400 mr-1">{dept.dept_abbreviation}</span>}
                                <span className="text-gray-600 text-[11px]">{dept.dept_name}</span>
                              </span>
                            : <span className="text-gray-300">—</span>
                          }
                        </td>
                        <td className="px-3 py-3">
                          <Badge variant="outline" className={cn(
                            "text-[10px] font-semibold px-2 py-0.5 rounded-full",
                            p.is_active ? "text-emerald-700 bg-emerald-50 border-emerald-200" : "text-gray-500 bg-gray-50 border-gray-200"
                          )}>
                            {p.is_active ? "Active" : "Inactive"}
                          </Badge>
                        </td>
                        {showAmounts && (
                          <>
                            {(["total_ps", "total_mooe", "total_co"] as const).map((key) => (
                              <td key={key} className="px-3 py-3 text-right font-mono text-gray-600 text-[11px]">
                                {p[key] === 0 ? <span className="text-gray-300">—</span> : fmt(p[key])}
                              </td>
                            ))}
                            <td className="px-3 py-3 text-right">
                              {p.total_amount === 0
                                ? <span className="text-gray-300 font-mono text-[11px]">—</span>
                                : <span className="font-mono font-semibold text-gray-900 text-[11px]">{fmt(p.total_amount)}</span>
                              }
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
                {showAmounts && filtered.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-gray-200 bg-gray-50/80">
                      <td colSpan={5} className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">
                        {isFiltered || isSearching ? `Filtered total (${filtered.length})` : `Total (${filtered.length})`}
                      </td>
                      {(["total_ps", "total_mooe", "total_co", "total_amount"] as const).map((key, i) => (
                        <td key={key} className={cn("px-3 py-2.5 text-right font-mono text-[11px]",
                          i === 3 ? "font-bold text-gray-900 text-[12px]" : "font-semibold text-gray-800")}>
                          {fmt(filtered.reduce((s, p) => s + p[key], 0))}
                        </td>
                      ))}
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing <span className="font-medium text-gray-600">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}</span>{" "}
                  of <span className="font-medium text-gray-600">{filtered.length}</span>
                </p>
                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === 1 && "pointer-events-none opacity-40")} />
                    </PaginationItem>
                    {getPageNumbers().map((p, i) =>
                      p === "ellipsis"
                        ? <PaginationItem key={`e-${i}`}><PaginationEllipsis className="h-7 w-7 text-[11px]" /></PaginationItem>
                        : <PaginationItem key={p}>
                            <PaginationLink onClick={() => setPage(p)} isActive={page === p}
                              className={cn("h-7 w-7 text-[11px] rounded-md cursor-pointer",
                                page === p ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : "text-gray-600 hover:bg-gray-50")}>
                              {p}
                            </PaginationLink>
                          </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === totalPages && "pointer-events-none opacity-40")} />
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
          style={{ position: "fixed", top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[175px] overflow-hidden"
        >
          {/* Triangle pointer at top-left */}
          <div
            className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45"
          />
          {/* Program label */}
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[155px]">
              {ctxMenu.program.aip_reference_code
                ? ctxMenu.program.aip_reference_code
                : ctxMenu.program.program_description.slice(0, 26)}
            </p>
          </div>
          <button
            onClick={() => handleEdit(ctxMenu.program)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Program
          </button>
          <button
            onClick={() => handleToggleIntent(ctxMenu.program)}
            className={cn(
              "flex items-center gap-2.5 w-full px-3 py-2 text-[12px] transition-colors",
              ctxMenu.program.is_active
                ? "text-amber-700 hover:bg-amber-50"
                : "text-emerald-700 hover:bg-emerald-50"
            )}
          >
            {ctxMenu.program.is_active
              ? <><NoSymbolIcon className="w-3.5 h-3.5 text-amber-400 shrink-0" /> Deactivate</>
              : <><CheckCircleIcon className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> Activate</>
            }
          </button>
        </div>
      )}

      {/* ── Edit modal ── */}
      <EditModal program={editProgram} onClose={() => setEditProgram(null)} onSaved={onEditSaved} />

      {/* ── Activate / Deactivate confirm ── */}
      <AlertDialog open={!!toggleTarget} onOpenChange={(o) => { if (!o) setToggleTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">
              {toggleTarget?.is_active ? "Deactivate program?" : "Activate program?"}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700 block mb-1">{toggleTarget?.program_description}</span>
              {toggleTarget?.is_active
                ? "This program will be marked inactive and hidden from budget plan forms."
                : "This program will be reactivated and available for use in budget plans."
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm"
                className={cn("h-8 text-xs", toggleTarget?.is_active ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700")}
                onClick={confirmToggle} disabled={toggling}>
                {toggling
                  ? <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  : toggleTarget?.is_active ? "Deactivate" : "Activate"
                }
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Export modal ── */}
      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        selected={selectedPrograms}
        departments={departments}
        budgetYear={selectedPlan?.year ?? null}
      />
    </div>
  );
};

export default AipProgramsTab;
