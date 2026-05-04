// import React, { useEffect, useState, useRef, useMemo } from "react";
// import { toast } from "sonner";
// import API from "../../services/api";
// import { Department, DepartmentCategory } from "../../types/api";
// import { useDebounce } from "../../hooks/useDebounce";
// import { LoadingState } from "../common/LoadingState";
// import { Button } from "../../components/ui/button";
// import { Input } from "../../components/ui/input";
// import { Label } from "../../components/ui/label";
// import { Textarea } from "../../components/ui/textarea";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "../../components/ui/select";
// import {
//   Dialog,
//   DialogContent,
//   DialogHeader,
//   DialogTitle,
//   DialogFooter,
//   DialogDescription,
// } from "../../components/ui/dialog";
// import {
//   AlertDialog,
//   AlertDialogAction,
//   AlertDialogCancel,
//   AlertDialogContent,
//   AlertDialogDescription,
//   AlertDialogFooter,
//   AlertDialogHeader,
//   AlertDialogTitle,
// } from "../../components/ui/alert-dialog";
// import {
//   DropdownMenu,
//   DropdownMenuContent,
//   DropdownMenuItem,
//   DropdownMenuSeparator,
//   DropdownMenuTrigger,
// } from "../../components/ui/dropdown-menu";
// import {
//   Pagination,
//   PaginationContent,
//   PaginationEllipsis,
//   PaginationItem,
//   PaginationLink,
//   PaginationNext,
//   PaginationPrevious,
// } from "../../components/ui/pagination";
// import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
// import { MoreHorizontalIcon } from "lucide-react";
// import { PlusIcon, FunnelIcon, XMarkIcon, MagnifyingGlassIcon } from "@heroicons/react/24/outline";
// import { cn } from "@/src/lib/utils";

// // ─── Constants ────────────────────────────────────────────────────────────────

// const PER_PAGE = 10;
// const ALL_CATEGORIES = "__all__";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const getInitials = (dept: Department): string => {
//   if (dept.dept_abbreviation) return dept.dept_abbreviation.slice(0, 3).toUpperCase();
//   return dept.dept_name.slice(0, 2).toUpperCase();
// };

// // ─── Component ────────────────────────────────────────────────────────────────

// const DepartmentsPage: React.FC = () => {
//   const [departments, setDepartments] = useState<Department[]>([]);
//   const [categories, setCategories]   = useState<DepartmentCategory[]>([]);
//   const [loading, setLoading]         = useState(true);

//   // ── Search ────────────────────────────────────────────────────────────────
//   const [searchRaw, setSearchRaw]       = useState("");
//   const debouncedSearch                 = useDebounce(searchRaw, 250);

//   // ── Filter ────────────────────────────────────────────────────────────────
//   const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES);

//   // ── Pagination ────────────────────────────────────────────────────────────
//   const [page, setPage] = useState(1);

//   // ── Create / Edit dialog ──────────────────────────────────────────────────
//   const [modalOpen, setModalOpen]     = useState(false);
//   const [editingDept, setEditingDept] = useState<Department | null>(null);
//   const [form, setForm] = useState({
//     dept_name: "", dept_abbreviation: "", dept_category_id: "",
//     mandate: "", special_provisions: "",
//   });
//   const [logoPreview, setLogoPreview] = useState<string | null>(null);
//   const logoFileRef                   = useRef<File | null>(null);
//   const [submitting, setSubmitting]   = useState(false);

//   // ── Delete confirm ────────────────────────────────────────────────────────
//   const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

//   // ── Fetch ─────────────────────────────────────────────────────────────────

//   useEffect(() => {
//     fetchCategories();
//     fetchDepartments();
//   }, []);

//   const fetchCategories = async () => {
//     try {
//       const res = await API.get("/department-categories");
//       setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
//     } catch {
//       toast.error("Failed to load categories");
//     }
//   };

//   const fetchDepartments = async () => {
//     setLoading(true);
//     try {
//       const res = await API.get("/departments");
//       setDepartments(Array.isArray(res.data?.data) ? res.data.data : []);
//       setPage(1);
//     } catch {
//       toast.error("Failed to load departments");
//     } finally {
//       setLoading(false);
//     }
//   };

//   // ── Filtered + searched list ──────────────────────────────────────────────

//   const filtered = useMemo(() => {
//     let list = departments;

//     if (filterCategory !== ALL_CATEGORIES) {
//       list = list.filter(
//         (d) => d.dept_category_id?.toString() === filterCategory
//       );
//     }

//     const q = debouncedSearch.trim().toLowerCase();
//     if (q) {
//       list = list.filter(
//         (d) =>
//           d.dept_name.toLowerCase().includes(q) ||
//           (d.dept_abbreviation ?? "").toLowerCase().includes(q)
//       );
//     }

//     return list;
//   }, [departments, filterCategory, debouncedSearch]);

//   const handleFilterChange = (val: string) => { setFilterCategory(val); setPage(1); };
//   const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchRaw(e.target.value); setPage(1); };
//   const clearSearch = () => { setSearchRaw(""); setPage(1); };
//   const clearFilter = () => { setFilterCategory(ALL_CATEGORIES); setPage(1); };

//   const isFiltered  = filterCategory !== ALL_CATEGORIES;
//   const isSearching = debouncedSearch.trim().length > 0;
//   const activeCategory = categories.find(
//     (c) => c.dept_category_id.toString() === filterCategory
//   );

//   // ── Pagination ────────────────────────────────────────────────────────────

//   const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
//   const paginated  = filtered.slice((page - 1) * PER_PAGE, page * PER_PAGE);

//   const getPageNumbers = (): (number | "ellipsis")[] => {
//     if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
//     const pages: (number | "ellipsis")[] = [1];
//     if (page > 3) pages.push("ellipsis");
//     for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) pages.push(p);
//     if (page < totalPages - 2) pages.push("ellipsis");
//     pages.push(totalPages);
//     return pages;
//   };

//   // ── Open modals ───────────────────────────────────────────────────────────

//   const openCreate = () => {
//     setEditingDept(null);
//     setForm({ dept_name: "", dept_abbreviation: "", dept_category_id: "", mandate: "", special_provisions: "" });
//     logoFileRef.current = null;
//     setLogoPreview(null);
//     setModalOpen(true);
//   };

//   const openEdit = (dept: Department) => {
//     setEditingDept(dept);
//     setForm({
//       dept_name:          dept.dept_name,
//       dept_abbreviation:  dept.dept_abbreviation ?? "",
//       dept_category_id:   dept.dept_category_id?.toString() ?? "",
//       mandate:            dept.mandate ?? "",
//       special_provisions: dept.special_provisions ?? "",
//     });
//     logoFileRef.current = null;
//     setLogoPreview(dept.logo ? `/storage/${dept.logo}` : null);
//     setModalOpen(true);
//   };

//   // ── Form handlers ─────────────────────────────────────────────────────────

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0] ?? null;
//     logoFileRef.current = file;
//     if (file) {
//       const reader = new FileReader();
//       reader.onloadend = () => setLogoPreview(reader.result as string);
//       reader.readAsDataURL(file);
//     } else {
//       setLogoPreview(null);
//     }
//   };

//   const handleSubmit = async () => {
//     if (!form.dept_name.trim() || !form.dept_category_id) {
//       toast.error("Department name and category are required.");
//       return;
//     }
//     setSubmitting(true);
//     try {
//       const fd = new FormData();
//       fd.append("dept_name",          form.dept_name);
//       fd.append("dept_category_id",   form.dept_category_id);
//       if (form.dept_abbreviation)  fd.append("dept_abbreviation",  form.dept_abbreviation);
//       if (form.mandate)            fd.append("mandate",            form.mandate);
//       if (form.special_provisions) fd.append("special_provisions", form.special_provisions);
//       if (logoFileRef.current)     fd.append("logo",               logoFileRef.current);

//       const token = localStorage.getItem("token");
//       const url   = editingDept ? `/api/departments/${editingDept.dept_id}` : "/api/departments";
//       if (editingDept) fd.append("_method", "PUT");

//       const res = await fetch(url, {
//         method:  "POST",
//         headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
//         body:    fd,
//       });

//       if (!res.ok) {
//         const err = await res.json();
//         throw new Error(err.message ?? "Request failed");
//       }

//       toast.success(editingDept ? "Department updated." : "Department created.");
//       setModalOpen(false);
//       fetchDepartments();
//     } catch (err: any) {
//       toast.error(err.message ?? "Operation failed.");
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   const handleDelete = async () => {
//     if (!deleteTarget) return;
//     try {
//       await API.delete(`/departments/${deleteTarget.dept_id}`);
//       toast.success(`${deleteTarget.dept_name} deleted.`);
//       setDeleteTarget(null);
//       fetchDepartments();
//     } catch {
//       toast.error("Failed to delete department.");
//     }
//   };

//   // ── Render ────────────────────────────────────────────────────────────────

//   if (loading && departments.length === 0) return <LoadingState />;

//   return (
//     <div className="p-6">

//       {/* ── Page Header ── */}
//       <div className="flex items-center justify-between mb-6">
//         <div>
//           <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
//             Administration
//           </span>
//           <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
//             Departments
//           </h1>
//         </div>
//         <Button
//           size="sm"
//           onClick={openCreate}
//           className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
//         >
//           <PlusIcon className="w-3.5 h-3.5" />
//           Add Department
//         </Button>
//       </div>

//       {/* ── Filter + Search bar ── */}
//       <div className="flex items-center gap-3 mb-4 flex-wrap">
//         <div className="relative flex-1 min-w-[180px] max-w-xs">
//           <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
//           <Input
//             value={searchRaw}
//             onChange={handleSearchChange}
//             placeholder="Search departments…"
//             className="pl-8 h-8 text-xs border-gray-200 bg-white"
//           />
//           {isSearching && (
//             <button onClick={clearSearch} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
//               <XMarkIcon className="w-3 h-3" />
//             </button>
//           )}
//         </div>
//         <div className="flex items-center gap-2">
//           <FunnelIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
//           <Select value={filterCategory} onValueChange={handleFilterChange}>
//             <SelectTrigger className={cn("h-8 text-xs w-44 border-gray-200", isFiltered && "border-gray-400 bg-gray-50")}>
//               <SelectValue placeholder="All categories" />
//             </SelectTrigger>
//             <SelectContent>
//               <SelectItem value={ALL_CATEGORIES} className="text-xs">All categories</SelectItem>
//               {categories.map((cat) => (
//                 <SelectItem key={cat.dept_category_id} value={cat.dept_category_id.toString()} className="text-xs">
//                   {cat.dept_category_name}
//                 </SelectItem>
//               ))}
//             </SelectContent>
//           </Select>
//         </div>
//         {isFiltered && (
//           <div className="flex items-center gap-1.5 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
//             <span>{activeCategory?.dept_category_name}</span>
//             <button onClick={clearFilter} className="text-gray-400 hover:text-gray-700 transition-colors ml-0.5" title="Clear filter">
//               <XMarkIcon className="w-3 h-3" />
//             </button>
//           </div>
//         )}
//         <span className="text-[11px] text-gray-400 ml-auto">
//           {isFiltered || isSearching ? (
//             <><span className="font-medium text-gray-600">{filtered.length}</span> of <span className="font-medium text-gray-600">{departments.length}</span> departments</>
//           ) : (
//             <><span className="font-medium text-gray-600">{departments.length}</span> department{departments.length !== 1 ? "s" : ""}</>
//           )}
//         </span>
//       </div>

//       {/* ── Table ── */}
//       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//         {filtered.length === 0 ? (
//           <div className="text-center py-14 text-gray-400 text-sm">
//             {isSearching ? (
//               <>No departments match <span className="font-medium text-gray-600">"{debouncedSearch}"</span>.{" "}
//                 <button onClick={clearSearch} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Clear search</button>
//               </>
//             ) : isFiltered ? (
//               <>No departments in <span className="font-medium text-gray-600">{activeCategory?.dept_category_name}</span>.{" "}
//                 <button onClick={clearFilter} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Clear filter</button>
//               </>
//             ) : (
//               <>No departments yet.{" "}
//                 <button onClick={openCreate} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Add the first one</button>
//               </>
//             )}
//           </div>
//         ) : (
//           <>
//             <table className="w-full text-[12px] border-collapse">
//               <thead>
//                 <tr>
//                   <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-14">Logo</th>
//                   <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Department Name</th>
//                   <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-28">Abbreviation</th>
//                   <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-48">Category</th>
//                   <th className="border-b border-gray-200 bg-white px-2 py-2.5 text-center align-bottom w-12" />
//                 </tr>
//               </thead>
//               <tbody className="divide-y divide-gray-100">
//                 {paginated.map((dept) => (
//                   <tr key={dept.dept_id} className="hover:bg-gray-50/60 transition-colors">
//                     <td className="px-4 py-3">
//                       <Avatar className="h-8 w-8 rounded-lg border border-gray-100">
//                         <AvatarImage src={dept.logo ? `/storage/${dept.logo}` : undefined} alt={dept.dept_name} />
//                         <AvatarFallback className="rounded-lg bg-gray-100 text-gray-600 text-[10px] font-semibold">
//                           {getInitials(dept)}
//                         </AvatarFallback>
//                       </Avatar>
//                     </td>
//                     <td className="px-4 py-3 font-medium text-gray-900">
//                       {isSearching ? highlightMatch(dept.dept_name, debouncedSearch) : dept.dept_name}
//                     </td>
//                     <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
//                       {dept.dept_abbreviation
//                         ? isSearching ? highlightMatch(dept.dept_abbreviation, debouncedSearch) : dept.dept_abbreviation
//                         : "–"}
//                     </td>
//                     <td className="px-4 py-3 text-gray-500">
//                       {dept.category?.dept_category_name ?? "–"}
//                     </td>
//                     <td className="px-2 py-2.5 text-right">
//                       <DropdownMenu>
//                         <DropdownMenuTrigger asChild>
//                           <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
//                             <MoreHorizontalIcon className="w-4 h-4" />
//                             <span className="sr-only">Open menu</span>
//                           </Button>
//                         </DropdownMenuTrigger>
//                         <DropdownMenuContent align="end" className="w-36">
//                           <DropdownMenuItem onClick={() => openEdit(dept)}>Edit</DropdownMenuItem>
//                           <DropdownMenuSeparator />
//                           <DropdownMenuItem
//                             className="text-red-600 focus:text-red-600 focus:bg-red-50"
//                             onClick={() => setDeleteTarget(dept)}
//                           >
//                             Delete
//                           </DropdownMenuItem>
//                         </DropdownMenuContent>
//                       </DropdownMenu>
//                     </td>
//                   </tr>
//                 ))}
//               </tbody>
//             </table>

//             {/* ── Pagination ── */}
//             {totalPages > 1 && (
//               <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
//                 <p className="text-[11px] text-gray-400">
//                   Showing <span className="font-medium text-gray-600">{(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}</span> of <span className="font-medium text-gray-600">{filtered.length}</span>
//                 </p>
//                 <Pagination className="w-auto mx-0">
//                   <PaginationContent className="gap-0.5">
//                     <PaginationItem>
//                       <PaginationPrevious onClick={() => setPage((p) => Math.max(1, p - 1))} className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === 1 && "pointer-events-none opacity-40")} />
//                     </PaginationItem>
//                     {getPageNumbers().map((p, i) =>
//                       p === "ellipsis" ? (
//                         <PaginationItem key={`ellipsis-${i}`}><PaginationEllipsis className="h-7 w-7 text-[11px]" /></PaginationItem>
//                       ) : (
//                         <PaginationItem key={p}>
//                           <PaginationLink onClick={() => setPage(p)} isActive={page === p} className={cn("h-7 w-7 text-[11px] rounded-md cursor-pointer", page === p ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : "text-gray-600 hover:bg-gray-50")}>
//                             {p}
//                           </PaginationLink>
//                         </PaginationItem>
//                       )
//                     )}
//                     <PaginationItem>
//                       <PaginationNext onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === totalPages && "pointer-events-none opacity-40")} />
//                     </PaginationItem>
//                   </PaginationContent>
//                 </Pagination>
//               </div>
//             )}
//           </>
//         )}
//       </div>

//       {/* ════════ Create / Edit Dialog ════════ */}
//       <Dialog open={modalOpen} onOpenChange={setModalOpen}>
//         <DialogContent className="max-w-3xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
//           <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
//             <DialogTitle className="text-[15px] font-semibold text-gray-900">
//               {editingDept ? "Edit Department" : "Add Department"}
//             </DialogTitle>
//             <DialogDescription className="text-xs text-gray-400 mt-0.5">
//               {editingDept ? "Update department details." : "Fill in the details for the new department."}
//             </DialogDescription>
//           </DialogHeader>

//           <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
//             {/* Left column */}
//             <div className="space-y-4">
//               <div className="space-y-1.5">
//                 <Label className="text-xs font-semibold text-gray-600">
//                   Department Name <span className="text-red-400">*</span>
//                 </Label>
//                 <Input
//                   value={form.dept_name}
//                   onChange={(e) => setForm((p) => ({ ...p, dept_name: e.target.value }))}
//                   placeholder="e.g. Office of the Municipal Mayor"
//                   className="h-9 text-sm"
//                 />
//               </div>
//               <div className="space-y-1.5">
//                 <Label className="text-xs font-semibold text-gray-600">Abbreviation</Label>
//                 <Input
//                   value={form.dept_abbreviation}
//                   onChange={(e) => setForm((p) => ({ ...p, dept_abbreviation: e.target.value }))}
//                   placeholder="e.g. OMM"
//                   className="h-9 text-sm font-mono"
//                 />
//               </div>
//               <div className="space-y-1.5">
//                 <Label className="text-xs font-semibold text-gray-600">
//                   Category <span className="text-red-400">*</span>
//                 </Label>
//                 <Select
//                   value={form.dept_category_id}
//                   onValueChange={(v) => setForm((p) => ({ ...p, dept_category_id: v }))}
//                 >
//                   <SelectTrigger className="h-9 text-sm">
//                     <SelectValue placeholder="Select category" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     {categories.map((cat) => (
//                       <SelectItem key={cat.dept_category_id} value={cat.dept_category_id.toString()}>
//                         {cat.dept_category_name}
//                       </SelectItem>
//                     ))}
//                   </SelectContent>
//                 </Select>
//               </div>
//               <div className="space-y-1.5">
//                 <Label className="text-xs font-semibold text-gray-600">Logo</Label>
//                 <Input
//                   type="file"
//                   accept="image/*"
//                   onChange={handleFileChange}
//                   className="h-9 text-sm file:text-xs file:font-medium file:text-gray-600"
//                 />
//                 {logoPreview && (
//                   <div className="flex items-center gap-3 mt-2">
//                     <Avatar className="h-12 w-12 rounded-lg border border-gray-200">
//                       <AvatarImage src={logoPreview} alt="Preview" />
//                       <AvatarFallback className="rounded-lg bg-gray-100 text-[10px]">Logo</AvatarFallback>
//                     </Avatar>
//                     <p className="text-[11px] text-gray-400">Logo preview</p>
//                   </div>
//                 )}
//               </div>
//             </div>

//             {/* Right column */}
//             <div className="space-y-4">
//               <div className="space-y-1.5">
//                 <Label className="text-xs font-semibold text-gray-600">Mandate</Label>
//                 <Textarea
//                   value={form.mandate}
//                   onChange={(e) => setForm((p) => ({ ...p, mandate: e.target.value }))}
//                   placeholder="Brief description of the department's mandate…"
//                   rows={4}
//                   className="text-sm resize-none"
//                 />
//               </div>
//               <div className="space-y-1.5">
//                 <Label className="text-xs font-semibold text-gray-600">Special Provisions</Label>
//                 <Textarea
//                   value={form.special_provisions}
//                   onChange={(e) => setForm((p) => ({ ...p, special_provisions: e.target.value }))}
//                   placeholder="Enter any special provisions for this department…"
//                   rows={4}
//                   className="text-sm resize-none"
//                 />
//               </div>
//             </div>
//           </div>

//           <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
//             <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
//               onClick={() => setModalOpen(false)} disabled={submitting}>
//               Cancel
//             </Button>
//             <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800"
//               onClick={handleSubmit} disabled={submitting}>
//               {submitting
//                 ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
//                 : editingDept ? "Update" : "Create"}
//             </Button>
//           </DialogFooter>
//         </DialogContent>
//       </Dialog>

//       {/* ════════ Delete Confirm ════════ */}
//       <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
//         <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
//           <AlertDialogHeader>
//             <AlertDialogTitle className="text-[15px] font-semibold">Delete department?</AlertDialogTitle>
//             <AlertDialogDescription className="text-sm text-gray-500">
//               <span className="font-medium text-gray-700">{deleteTarget?.dept_name}</span> and all associated data will be permanently removed.
//             </AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel asChild>
//               <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
//             </AlertDialogCancel>
//             <AlertDialogAction asChild>
//               <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</Button>
//             </AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </div>
//   );
// };

// // ─── Highlight helper ─────────────────────────────────────────────────────────

// function highlightMatch(text: string, query: string): React.ReactNode {
//   if (!query.trim()) return text;
//   const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
//   if (idx === -1) return text;
//   return (
//     <>
//       {text.slice(0, idx)}
//       <mark className="bg-yellow-100 text-yellow-900 rounded-[2px] px-0.5">
//         {text.slice(idx, idx + query.trim().length)}
//       </mark>
//       {text.slice(idx + query.trim().length)}
//     </>
//   );
// }

// export default DepartmentsPage;

import React, { useEffect, useState, useRef, useMemo } from "react";
import { toast } from "sonner";
import API from "../../services/api";
import { Department, DepartmentCategory } from "../../types/api";
import { useDebounce } from "../../hooks/useDebounce";
import { LoadingState } from "../common/LoadingState";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Label } from "../../components/ui/label";
import { Textarea } from "../../components/ui/textarea";
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
import { Avatar, AvatarFallback, AvatarImage } from "../../components/ui/avatar";
import {
  PlusIcon,
  FunnelIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { cn } from "@/src/lib/utils";

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;
const ALL_CATEGORIES = "__all__";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ContextMenuState {
  x: number;
  y: number;
  dept: Department;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const getInitials = (dept: Department): string => {
  if (dept.dept_abbreviation) return dept.dept_abbreviation.slice(0, 3).toUpperCase();
  return dept.dept_name.slice(0, 2).toUpperCase();
};

// ─── Component ────────────────────────────────────────────────────────────────

const DepartmentsPage: React.FC = () => {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [categories, setCategories]   = useState<DepartmentCategory[]>([]);
  const [loading, setLoading]         = useState(true);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchRaw, setSearchRaw]   = useState("");
  const debouncedSearch             = useDebounce(searchRaw, 250);

  // ── Filter ────────────────────────────────────────────────────────────────
  const [filterCategory, setFilterCategory] = useState<string>(ALL_CATEGORIES);

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Context menu ──────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef                = useRef<HTMLDivElement>(null);

  // ── Create / Edit dialog ──────────────────────────────────────────────────
  const [modalOpen, setModalOpen]     = useState(false);
  const [editingDept, setEditingDept] = useState<Department | null>(null);
  const [form, setForm] = useState({
    dept_name: "", dept_abbreviation: "", dept_category_id: "",
    mandate: "", special_provisions: "",
  });
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoFileRef                   = useRef<File | null>(null);
  const [submitting, setSubmitting]   = useState(false);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<Department | null>(null);

  // ── Close ctx menu on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [ctxMenu]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchCategories();
    fetchDepartments();
  }, []);

  const fetchCategories = async () => {
    try {
      const res = await API.get("/department-categories");
      setCategories(Array.isArray(res.data?.data) ? res.data.data : []);
    } catch {
      toast.error("Failed to load categories.");
    }
  };

  const fetchDepartments = async () => {
    setLoading(true);
    try {
      const res = await API.get("/departments");
      setDepartments(Array.isArray(res.data?.data) ? res.data.data : []);
      setPage(1);
    } catch {
      toast.error("Failed to load departments.");
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = departments;
    if (filterCategory !== ALL_CATEGORIES) {
      list = list.filter((d) => d.dept_category_id?.toString() === filterCategory);
    }
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (d) =>
          d.dept_name.toLowerCase().includes(q) ||
          (d.dept_abbreviation ?? "").toLowerCase().includes(q)
      );
    }
    return list;
  }, [departments, filterCategory, debouncedSearch]);

  const handleFilterChange  = (val: string) => { setFilterCategory(val); setPage(1); };
  const handleSearchChange  = (e: React.ChangeEvent<HTMLInputElement>) => { setSearchRaw(e.target.value); setPage(1); };
  const clearSearch         = () => { setSearchRaw(""); setPage(1); };
  const clearFilter         = () => { setFilterCategory(ALL_CATEGORIES); setPage(1); };

  const isFiltered  = filterCategory !== ALL_CATEGORIES;
  const isSearching = debouncedSearch.trim().length > 0;
  const activeCategory = categories.find((c) => c.dept_category_id.toString() === filterCategory);

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

  // ── Row click → context menu ──────────────────────────────────────────────

  const handleRowClick = (e: React.MouseEvent, dept: Department) => {
    e.preventDefault();
    const MENU_W = 175, MENU_H = 115;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, dept });
  };

  // ── Open modals ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingDept(null);
    setForm({ dept_name: "", dept_abbreviation: "", dept_category_id: "", mandate: "", special_provisions: "" });
    logoFileRef.current = null;
    setLogoPreview(null);
    setModalOpen(true);
  };

  const openEdit = (dept: Department) => {
    setCtxMenu(null);
    setEditingDept(dept);
    setForm({
      dept_name:          dept.dept_name,
      dept_abbreviation:  dept.dept_abbreviation ?? "",
      dept_category_id:   dept.dept_category_id?.toString() ?? "",
      mandate:            dept.mandate ?? "",
      special_provisions: dept.special_provisions ?? "",
    });
    logoFileRef.current = null;
    setLogoPreview(dept.logo ? `/storage/${dept.logo}` : null);
    setModalOpen(true);
  };

  const openDelete = (dept: Department) => {
    setCtxMenu(null);
    setDeleteTarget(dept);
  };

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] ?? null;
    logoFileRef.current = file;
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  };

  const handleSubmit = async () => {
    if (!form.dept_name.trim() || !form.dept_category_id) {
      toast.error("Department name and category are required.");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("dept_name",        form.dept_name);
      fd.append("dept_category_id", form.dept_category_id);
      if (form.dept_abbreviation)  fd.append("dept_abbreviation",  form.dept_abbreviation);
      if (form.mandate)            fd.append("mandate",            form.mandate);
      if (form.special_provisions) fd.append("special_provisions", form.special_provisions);
      if (logoFileRef.current)     fd.append("logo",               logoFileRef.current);

    //   const token = localStorage.getItem("token");
    //   const url   = editingDept ? `/api/departments/${editingDept.dept_id}` : "/api/departments";
    //   if (editingDept) fd.append("_method", "PUT");

    //   const res = await fetch(url, {
    //     method:  "POST",
    //     headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    //     body:    fd,
    //   });

    //   if (!res.ok) {
    //     const err = await res.json();
    //     throw new Error(err.message ?? "Request failed");
    //   }

    if (editingDept) {
        await API.put(`/departments/${editingDept.dept_id}`, fd);
      } else {
        await API.post(`/departments`, fd);
      }

      toast.success(editingDept ? "Department updated." : "Department created.");
      setModalOpen(false);
      fetchDepartments();
    } catch (err: any) {
      toast.error(err.message ?? "Operation failed.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/departments/${deleteTarget.dept_id}`);
      toast.success(`"${deleteTarget.dept_name}" deleted.`);
      setDeleteTarget(null);
      fetchDepartments();
    } catch {
      toast.error("Failed to delete department.");
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && departments.length === 0) return <LoadingState />;

  return (
    <div className="p-6 relative">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Administration
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            Departments
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage department records and organizational structure.
          </p>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add Department
        </Button>
      </div>

      {/* ── Filter + Search bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchRaw}
            onChange={handleSearchChange}
            placeholder="Search departments…"
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

        <Select value={filterCategory} onValueChange={handleFilterChange}>
          <SelectTrigger className={cn("h-8 text-xs w-44 border-gray-200", isFiltered && "border-gray-400 bg-gray-50")}>
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_CATEGORIES} className="text-xs">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.dept_category_id} value={cat.dept_category_id.toString()} className="text-xs">
                {cat.dept_category_name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {isFiltered && (
          <span className="flex items-center gap-1 text-[11px] text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
            {activeCategory?.dept_category_name}
            <button
              onClick={clearFilter}
              className="text-gray-400 hover:text-gray-700 transition-colors ml-0.5"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          </span>
        )}

        <span className="text-[11px] text-gray-400 ml-auto">
          {isFiltered || isSearching ? (
            <>
              <span className="font-medium text-gray-600">{filtered.length}</span> of{" "}
              <span className="font-medium text-gray-600">{departments.length}</span> departments
            </>
          ) : (
            <>
              <span className="font-medium text-gray-600">{departments.length}</span>{" "}
              department{departments.length !== 1 ? "s" : ""}
            </>
          )}
        </span>
      </div>

      {/* ── Hint ── */}
      <div className="mb-4">
        <span className="text-[10px] text-gray-400 italic hidden sm:block">
          Click a row to edit or delete
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {filtered.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching ? (
              <>
                No departments match{" "}
                <span className="font-medium text-gray-600">"{debouncedSearch}"</span>.{" "}
                <button onClick={clearSearch} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Clear search
                </button>
              </>
            ) : isFiltered ? (
              <>
                No departments in{" "}
                <span className="font-medium text-gray-600">{activeCategory?.dept_category_name}</span>.{" "}
                <button onClick={clearFilter} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Clear filter
                </button>
              </>
            ) : (
              <>
                No departments yet.{" "}
                <button onClick={openCreate} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
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
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-14">
                    Logo
                  </th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                    Department Name
                  </th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-28">
                    Abbreviation
                  </th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-48">
                    Category
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map((dept) => (
                  <tr
                    key={dept.dept_id}
                    onClick={(e) => handleRowClick(e, dept)}
                    onContextMenu={(e) => { e.preventDefault(); handleRowClick(e, dept); }}
                    className="hover:bg-gray-50/80 transition-colors cursor-pointer select-none"
                  >
                    <td className="px-4 py-3">
                      <Avatar className="h-8 w-8 rounded-lg border border-gray-100">
                        <AvatarImage src={dept.logo ? `/storage/${dept.logo}` : undefined} alt={dept.dept_name} />
                        <AvatarFallback className="rounded-lg bg-gray-100 text-gray-600 text-[10px] font-semibold">
                          {getInitials(dept)}
                        </AvatarFallback>
                      </Avatar>
                    </td>
                    <td className="px-4 py-3 font-medium text-gray-900">
                      {isSearching ? highlightMatch(dept.dept_name, debouncedSearch) : dept.dept_name}
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                      {dept.dept_abbreviation
                        ? isSearching ? highlightMatch(dept.dept_abbreviation, debouncedSearch) : dept.dept_abbreviation
                        : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[11px]">
                      {dept.category?.dept_category_name ?? <span className="text-gray-300">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing{" "}
                  <span className="font-medium text-gray-600">
                    {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filtered.length)}
                  </span>{" "}
                  of <span className="font-medium text-gray-600">{filtered.length}</span>
                </p>
                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === 1 && "pointer-events-none opacity-40")}
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
                              page === p ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : "text-gray-600 hover:bg-gray-50"
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
                        className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", page === totalPages && "pointer-events-none opacity-40")}
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
              {ctxMenu.dept.dept_abbreviation
                ? ctxMenu.dept.dept_abbreviation
                : ctxMenu.dept.dept_name.slice(0, 22)}
            </p>
          </div>
          <button
            onClick={() => openEdit(ctxMenu.dept)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Department
          </button>
          <button
            onClick={() => openDelete(ctxMenu.dept)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            Delete
          </button>
        </div>
      )}

      {/* ════════ Create / Edit Dialog ════════ */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-3xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">
              {editingDept ? "Edit Department" : "Add Department"}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              {editingDept ? "Update department details." : "Fill in the details for the new department."}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Left column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Department Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  value={form.dept_name}
                  onChange={(e) => setForm((p) => ({ ...p, dept_name: e.target.value }))}
                  placeholder="e.g. Office of the Municipal Mayor"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Abbreviation</Label>
                <Input
                  value={form.dept_abbreviation}
                  onChange={(e) => setForm((p) => ({ ...p, dept_abbreviation: e.target.value }))}
                  placeholder="e.g. OMM"
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  Category <span className="text-red-400">*</span>
                </Label>
                <Select
                  value={form.dept_category_id}
                  onValueChange={(v) => setForm((p) => ({ ...p, dept_category_id: v }))}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.dept_category_id} value={cat.dept_category_id.toString()}>
                        {cat.dept_category_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Logo</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="h-9 text-sm file:text-xs file:font-medium file:text-gray-600"
                />
                {logoPreview && (
                  <div className="flex items-center gap-3 mt-2">
                    <Avatar className="h-12 w-12 rounded-lg border border-gray-200">
                      <AvatarImage src={logoPreview} alt="Preview" />
                      <AvatarFallback className="rounded-lg bg-gray-100 text-[10px]">Logo</AvatarFallback>
                    </Avatar>
                    <p className="text-[11px] text-gray-400">Logo preview</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right column */}
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Mandate</Label>
                <Textarea
                  value={form.mandate}
                  onChange={(e) => setForm((p) => ({ ...p, mandate: e.target.value }))}
                  placeholder="Brief description of the department's mandate…"
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Special Provisions</Label>
                <Textarea
                  value={form.special_provisions}
                  onChange={(e) => setForm((p) => ({ ...p, special_provisions: e.target.value }))}
                  placeholder="Enter any special provisions for this department…"
                  rows={4}
                  className="text-sm resize-none"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button
              variant="outline" size="sm"
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
                <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />Saving…</>
              ) : editingDept ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ Delete Confirm ════════ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Delete department?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700 block mb-1">{deleteTarget?.dept_name}</span>
              This department and all associated data will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DepartmentsPage;
