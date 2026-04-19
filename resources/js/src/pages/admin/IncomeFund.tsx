// // import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// // import API from "@/src/services/api";
// // import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
// // import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/src/components/ui/tooltip";
// // import { Skeleton } from "@/src/components/ui/skeleton";
// // import { IncomeFundResponse, IncomeFundRow } from "../../types/api";
// // import { toast } from "sonner";
// // import { useAuth } from "@/src/hooks/useAuth";
// // import { cn } from "@/src/lib/utils";

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface DisplayRow extends IncomeFundRow {
// //   isSubtotal?: boolean;
// //   isGrandTotal?: boolean;
// // }

// // interface SourceConfig {
// //   id: string;
// //   name: string;
// //   path: string;
// // }

// // // ─── Subtotal configs ─────────────────────────────────────────────────────────

// // const subtotalConfigs: Record<
// //   string,
// //   Array<{
// //     afterId?: number;
// //     afterName?: string;
// //     name: string;
// //     level: number;
// //     parentId?: number;
// //     parentName?: string;
// //   }>
// // > = {
// //   "general-fund": [
// //     { afterId: 13,  name: "Total Tax Revenue",        level: 3, parentId: 4  },
// //     { afterId: 32,  name: "Total Non-Tax Revenue",    level: 3, parentId: 14 },
// //     { afterId: 44,  name: "Total External Source",    level: 2, parentId: 33 },
// //     { afterId: 49,  name: "Total Non-Income Receipts",level: 2, parentId: 45 },
// //   ],
// //   occ: [
// //     { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
// //     { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
// //     { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
// //     { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
// //   ],
// //   pm: [
// //     { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
// //     { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
// //     { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
// //     { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
// //   ],
// //   sh: [
// //     { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
// //     { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
// //     { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
// //     { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
// //   ],
// // };

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const fmtNum = (val: number | null | undefined): string => {
// //   if (val === null || val === undefined) return "–";
// //   return "₱" + Math.round(val).toLocaleString("en-PH");
// // };

// // const fmtPct = (val: number | null | undefined): string => {
// //   if (val === null || val === undefined) return "–";
// //   return val.toFixed(1) + "%";
// // };

// // const fmtInput = (val: number | null | undefined): string => {
// //   if (val === null || val === undefined) return "";
// //   return Math.round(val).toLocaleString("en-PH");
// // };

// // // ─── Column color tokens ──────────────────────────────────────────────────────
// // const COL_PAST    = "bg-green-50/50  border-green-100";
// // const COL_CURR    = "bg-blue-50/40   border-blue-100";
// // const COL_BUDGET  = "bg-orange-50/40 border-orange-100";

// // const COL_PAST_SUB   = "bg-green-50   border-green-200";
// // const COL_CURR_SUB   = "bg-blue-50    border-blue-200";
// // const COL_BUDGET_SUB = "bg-orange-50  border-orange-200";

// // const COL_PAST_GRAND   = "text-green-300  border-green-900/40  bg-green-950/20";
// // const COL_CURR_GRAND   = "text-blue-300   border-blue-900/40   bg-blue-950/20";
// // const COL_BUDGET_GRAND = "text-orange-300 border-orange-900/40 bg-orange-950/20";

// // // ─── Table Skeleton ───────────────────────────────────────────────────────────
// // // Mirrors the 3-row header (group | sub-headers | col-numbers) + data rows + grand total

// // function TableSkeleton() {
// //   return (
// //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
// //       <div className="overflow-x-auto">
// //         <table className="w-full min-w-[1200px] text-[12px] border-collapse">
// //           <thead>
// //             {/* Row 1 — group headers */}
// //             <tr>
// //               <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-white px-4 py-2.5 min-w-[260px]">
// //                 <Skeleton className="h-3 w-32 rounded" />
// //               </th>
// //               {/* Past — green */}
// //               <th className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 w-32">
// //                 <Skeleton className="h-3 w-10 mx-auto rounded bg-green-200" />
// //               </th>
// //               {/* Current — blue, spans 3 */}
// //               <th colSpan={3} className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-2 text-center">
// //                 <Skeleton className="h-3 w-36 mx-auto rounded bg-blue-200" />
// //               </th>
// //               {/* Budget — orange */}
// //               <th className="border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 w-52">
// //                 <Skeleton className="h-3 w-24 mx-auto rounded bg-orange-200" />
// //               </th>
// //               {/* Neutral */}
// //               <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 w-28">
// //                 <Skeleton className="h-3 w-16 ml-auto rounded" />
// //               </th>
// //               <th className="border-b border-gray-200 bg-white px-3 py-2.5 w-24">
// //                 <Skeleton className="h-3 w-12 ml-auto rounded" />
// //               </th>
// //             </tr>
// //             {/* Row 2 — current year sub-headers */}
// //             <tr>
// //               <th className="border-b border-r border-gray-200 bg-white" />
// //               <th className="border-b border-r border-green-200 bg-green-50" />
// //               <th className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
// //                 <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-200" />
// //               </th>
// //               <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
// //                 <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-200" />
// //               </th>
// //               <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
// //                 <Skeleton className="h-2.5 w-12 ml-auto rounded bg-blue-200" />
// //               </th>
// //               <th className="border-b border-r border-orange-200 bg-orange-50" />
// //               <th className="border-b border-r border-gray-200 bg-white" />
// //               <th className="border-b border-gray-200 bg-white" />
// //             </tr>
// //             {/* Row 3 — column numbers */}
// //             <tr className="border-b-2 border-gray-200">
// //               <td className="border-r border-gray-200 bg-white sticky left-0" />
// //               <td className="border-r border-l border-green-200 bg-green-50 px-3 py-1 text-center text-[10px] text-green-300">(1)</td>
// //               <td className="border-r border-l border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(2)</td>
// //               <td className="border-r         border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(3)</td>
// //               <td className="border-r         border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(4)</td>
// //               <td className="border-r border-l border-orange-200 bg-orange-50 px-3 py-1 text-center text-[10px] text-orange-300">(5)</td>
// //               <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-200">(6)</td>
// //               <td className="border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-200">(7)</td>
// //             </tr>
// //           </thead>
// //           <tbody className="divide-y divide-gray-100">
// //             {/* Simulate realistic mix: normal rows + 1 subtotal + normal rows */}
// //             {Array.from({ length: 18 }).map((_, ri) => {
// //               const isSubtotal = ri === 5 || ri === 11;
// //               const bg = isSubtotal ? "bg-gray-50" : "";
// //               const widths = ["w-4/5","w-full","w-3/4","w-5/6","w-2/3","w-full","w-4/5","w-3/5"];
// //               const nameW  = widths[ri % widths.length];
// //               return (
// //                 <tr key={ri} className={bg} style={{ animationDelay: `${ri * 40}ms` }}>
// //                   {/* Name — sticky */}
// //                   <td className={cn("sticky left-0 z-10 border-r border-gray-100 px-4 py-2.5", bg || "bg-white")}>
// //                     <Skeleton className={cn("h-3 rounded", nameW, isSubtotal && "bg-gray-200")} style={{ marginLeft: `${(ri % 4) * 12}px` }} />
// //                   </td>
// //                   {/* Past — green */}
// //                   <td className={cn("border-r border-l px-3 py-2.5", COL_PAST)}>
// //                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 0 ? "w-16" : "w-20", "bg-green-100")} />
// //                   </td>
// //                   {/* Sem1 — blue, editable-height */}
// //                   <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
// //                     {isSubtotal
// //                       ? <Skeleton className="h-3 w-20 ml-auto rounded bg-blue-100" />
// //                       : <Skeleton className="h-7 w-full rounded-md bg-blue-100" />
// //                     }
// //                   </td>
// //                   {/* Sem2 — blue, derived */}
// //                   <td className={cn("border-r px-3 py-2.5", COL_CURR)}>
// //                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-20", "bg-blue-100")} />
// //                   </td>
// //                   {/* Curr total — blue */}
// //                   <td className={cn("border-r px-3 py-2.5", COL_CURR)}>
// //                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 1 ? "w-20" : "w-16", "bg-blue-100")} />
// //                   </td>
// //                   {/* Budget — orange, input-shaped */}
// //                   <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
// //                     {isSubtotal
// //                       ? <Skeleton className="h-3 w-20 ml-auto rounded bg-orange-100" />
// //                       : <Skeleton className="h-7 w-full rounded-md bg-orange-100" />
// //                     }
// //                   </td>
// //                   {/* Increase */}
// //                   <td className="border-r border-gray-100 px-3 py-2.5">
// //                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-12")} />
// //                   </td>
// //                   {/* % change */}
// //                   <td className="px-3 py-2.5">
// //                     <Skeleton className="h-3 w-10 ml-auto rounded" />
// //                   </td>
// //                 </tr>
// //               );
// //             })}
// //           </tbody>
// //           {/* Grand total row */}
// //           <tfoot>
// //             <tr className="bg-gray-900">
// //               <td className="sticky left-0 z-10 bg-gray-900 px-4 py-3">
// //                 <Skeleton className="h-3 w-48 rounded bg-gray-700" />
// //               </td>
// //               <td className={cn("px-3 py-3 border-l", COL_PAST_GRAND)}>
// //                 <Skeleton className="h-3 w-20 ml-auto rounded bg-green-900/40" />
// //               </td>
// //               {[0,1,2].map(i => (
// //                 <td key={i} className={cn("px-3 py-3 border-l", COL_CURR_GRAND)}>
// //                   <Skeleton className="h-3 w-16 ml-auto rounded bg-blue-900/40" />
// //                 </td>
// //               ))}
// //               <td className={cn("px-3 py-3 border-l", COL_BUDGET_GRAND)}>
// //                 <Skeleton className="h-3 w-20 ml-auto rounded bg-orange-900/40" />
// //               </td>
// //               <td className="px-3 py-3 border-l border-gray-700">
// //                 <Skeleton className="h-3 w-16 ml-auto rounded bg-gray-700" />
// //               </td>
// //               <td className="px-3 py-3 border-l border-gray-700">
// //                 <Skeleton className="h-3 w-10 ml-auto rounded bg-gray-700" />
// //               </td>
// //             </tr>
// //           </tfoot>
// //         </table>
// //       </div>
// //     </div>
// //   );
// // }

// // // ─── Component ────────────────────────────────────────────────────────────────

// // export default function IncomeFundPage() {
// //   const { user } = useAuth();
// //   const [rows, setRows]             = useState<IncomeFundRow[]>([]);
// //   const [meta, setMeta]             = useState<Omit<IncomeFundResponse, "data"> | null>(null);
// //   const [loading, setLoading]       = useState(true);
// //   const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
// //   const [currentSource, setCurrentSource] = useState<string>("general-fund");

// //   const [amountMode, setAmountMode] = useState<Record<number, boolean>>({});
// //   const [pctInput, setPctInput]     = useState<Record<number, string>>({});

// //   const savedValues = useRef<
// //     Map<number, { sem1: number | null; sem2: number | null; proposed: number | null }>
// //   >(new Map());
// //   const initialSaveDone = useRef(false);

// //   const availableSources = useMemo<SourceConfig[]>(() => {
// //     const src: SourceConfig[] = [];
// //     if (user?.role === "admin" || user?.role === "super-admin") {
// //       src.push(
// //         { id: "general-fund", name: "General Fund",           path: "income-general-fund" },
// //         { id: "sh",           name: "Slaughterhouse",         path: "sh-fund"             },
// //         { id: "occ",          name: "Opol Community College", path: "occ-fund"            },
// //         { id: "pm",           name: "Public Market",          path: "pm-fund"             }
// //       );
// //     } else if (user?.role === "department-head") {
// //       const path = window.location.pathname;
// //       if (path.includes("sh-fund"))  src.push({ id: "sh",  name: "Slaughterhouse",         path: "sh-fund"  });
// //       if (path.includes("occ-fund")) src.push({ id: "occ", name: "Opol Community College", path: "occ-fund" });
// //       if (path.includes("pm-fund"))  src.push({ id: "pm",  name: "Public Market",          path: "pm-fund"  });
// //     }
// //     return src;
// //   }, [user]);

// //   useEffect(() => {
// //     const path = window.location.pathname;
// //     if      (path.includes("sh-fund"))  setCurrentSource("sh");
// //     else if (path.includes("occ-fund")) setCurrentSource("occ");
// //     else if (path.includes("pm-fund"))  setCurrentSource("pm");
// //     else                                setCurrentSource("general-fund");
// //   }, []);

// //   const sourceName = (id: string) =>
// //     ({ "general-fund": "General Fund", sh: "Slaughterhouse", occ: "Opol Community College", pm: "Public Market" }[id] ?? id);

// //   useEffect(() => {
// //     if (currentSource) load(currentSource);
// //   }, [currentSource]);

// //   const load = async (source: string) => {
// //     setLoading(true);
// //     setAmountMode({});
// //     setPctInput({});
// //     try {
// //       const res = await API.get<IncomeFundResponse>(`/income-fund?source=${source}`);
// //       const data = res.data.data.map((row) => ({
// //         ...row,
// //         past:          row.past          !== null ? Number(row.past)          : null,
// //         current_total: row.current_total !== null ? Number(row.current_total) : null,
// //         sem1:          row.sem1          !== null ? Number(row.sem1)          : null,
// //         sem2:          row.sem2          !== null ? Number(row.sem2)          : null,
// //         proposed:      row.proposed      !== null ? Number(row.proposed)      : null,
// //       }));
// //       setRows(data);
// //       setMeta({
// //         year: res.data.year, past_year: res.data.past_year,
// //         current_year: res.data.current_year, source: res.data.source,
// //         records_exist: res.data.records_exist,
// //       });
// //       data.forEach((r) =>
// //         savedValues.current.set(r.id, { sem1: r.sem1, sem2: r.sem2, proposed: r.proposed })
// //       );
// //       if (!res.data.records_exist && !initialSaveDone.current) {
// //         initialSaveDone.current = true;
// //         try {
// //           await API.post("/income-fund/save", { rows: data, source });
// //           data.forEach((r) =>
// //             savedValues.current.set(r.id, { sem1: r.sem1, sem2: r.sem2, proposed: r.proposed })
// //           );
// //           toast.success(`Initial data saved for ${sourceName(source)}`);
// //         } catch {
// //           toast.error(`Failed to save initial data for ${sourceName(source)}`);
// //         }
// //       }
// //     } catch {
// //       toast.error("Failed to load data");
// //     } finally {
// //       setLoading(false);
// //     }
// //   };

// //   const handleSourceChange = (id: string) => {
// //     setCurrentSource(id);
// //     initialSaveDone.current = false;
// //     savedValues.current.clear();
// //   };

// //   const update = (rowId: number, field: "sem1" | "proposed", value: number | null) => {
// //     setRows((prev) => {
// //       const copy = [...prev];
// //       const i = copy.findIndex((r) => r.id === rowId);
// //       if (i === -1) return prev;
// //       const row = { ...copy[i], [field]: value };
// //       if (field === "sem1") row.sem2 = value !== null ? (row.current_total ?? 0) - value : null;
// //       copy[i] = row;
// //       return copy;
// //     });
// //   };

// //   const saveRow = useCallback(
// //     async (rowId: number) => {
// //       if (savingRows.has(rowId)) return;
// //       const row = rows.find((r) => r.id === rowId);
// //       if (!row) return;
// //       const last = savedValues.current.get(rowId);
// //       if (last && last.sem1 === row.sem1 && last.sem2 === row.sem2 && last.proposed === row.proposed) return;
// //       setSavingRows((prev) => new Set(prev).add(rowId));
// //       const promise = API.post("/income-fund/save", { rows, source: currentSource }).then(() =>
// //         savedValues.current.set(rowId, { sem1: row.sem1, sem2: row.sem2, proposed: row.proposed })
// //       );
// //       toast.promise(promise, {
// //         loading: "Saving…",
// //         success: "Saved successfully",
// //         error: (err: any) => `Save failed: ${err?.response?.data?.message ?? err?.message}`,
// //       });
// //       try { await promise; } finally {
// //         setSavingRows((prev) => { const n = new Set(prev); n.delete(rowId); return n; });
// //       }
// //     },
// //     [rows, savingRows, currentSource]
// //   );

// //   const handleSem1Change = (rowId: number, raw: string) => {
// //     const n = raw.replace(/,/g, "");
// //     update(rowId, "sem1", n === "" ? null : Number(n));
// //   };

// //   const isInPctMode = (rowId: number, hasCurrent: boolean) =>
// //     hasCurrent && !amountMode[rowId];

// //   const toggleMode = (rowId: number, hasCurrent: boolean, currentTotal: number, proposed: number | null) => {
// //     if (!hasCurrent) return;
// //     const goingToAmount = isInPctMode(rowId, hasCurrent);
// //     if (goingToAmount) {
// //       setAmountMode((prev) => ({ ...prev, [rowId]: true }));
// //     } else {
// //       setAmountMode((prev) => ({ ...prev, [rowId]: false }));
// //       if (proposed !== null && currentTotal) {
// //         const implied = ((proposed - currentTotal) / currentTotal) * 100;
// //         setPctInput((prev) => ({ ...prev, [rowId]: implied.toFixed(1) }));
// //       } else {
// //         setPctInput((prev) => ({ ...prev, [rowId]: "" }));
// //       }
// //     }
// //   };

// //   const handlePctChange = (rowId: number, raw: string, currentTotal: number) => {
// //     setPctInput((prev) => ({ ...prev, [rowId]: raw }));
// //     const pct = parseFloat(raw);
// //     if (!isNaN(pct)) {
// //       update(rowId, "proposed", Math.round(currentTotal * (1 + pct / 100)));
// //     }
// //   };

// //   const handlePctBlur = (rowId: number, currentTotal: number) => {
// //     const raw = pctInput[rowId] ?? "";
// //     const pct = parseFloat(raw);
// //     if (!isNaN(pct)) {
// //       update(rowId, "proposed", Math.round(currentTotal * (1 + pct / 100)));
// //     }
// //     saveRow(rowId);
// //   };

// //   const handleAmountChange = (rowId: number, raw: string) => {
// //     const n = raw.replace(/,/g, "");
// //     update(rowId, "proposed", n === "" ? null : Number(n));
// //   };

// //   const displayRows = useMemo(() => {
// //     if (!rows.length) return [];
// //     const childrenMap = new Map<number, IncomeFundRow[]>();
// //     rows.forEach((r) => {
// //       if (r.parent_id !== null) {
// //         if (!childrenMap.has(r.parent_id)) childrenMap.set(r.parent_id, []);
// //         childrenMap.get(r.parent_id)!.push(r);
// //       }
// //     });
// //     const nameToId = new Map(rows.map((r) => [r.name, r.id]));
// //     const sumDesc = (
// //       pid: number,
// //       field: keyof Pick<IncomeFundRow, "past" | "current_total" | "sem1" | "sem2" | "proposed">
// //     ) => {
// //       let total = 0;
// //       const stack = [pid];
// //       while (stack.length) {
// //         const p = stack.pop()!;
// //         (childrenMap.get(p) ?? []).forEach((c) => { total += c[field] ?? 0; stack.push(c.id); });
// //       }
// //       return total;
// //     };
// //     const result: DisplayRow[] = [];
// //     const subtotals: DisplayRow[] = [];
// //     const configs = subtotalConfigs[currentSource] ?? subtotalConfigs["general-fund"];
// //     for (const row of rows) {
// //       result.push({ ...row, isSubtotal: false, isGrandTotal: false });
// //       const cfg = configs.find((c) =>
// //         (c.afterId && c.afterId === row.id) || (c.afterName && row.name === c.afterName)
// //       );
// //       if (cfg) {
// //         const pid = cfg.parentId ?? (cfg.parentName ? nameToId.get(cfg.parentName) : undefined);
// //         if (pid) {
// //           const sub: DisplayRow = {
// //             id: -Date.now() - Math.random(), parent_id: null, code: "",
// //             name: cfg.name, level: cfg.level,
// //             past: sumDesc(pid, "past"), current_total: sumDesc(pid, "current_total"),
// //             sem1: sumDesc(pid, "sem1"), sem2: sumDesc(pid, "sem2"),
// //             proposed: sumDesc(pid, "proposed"),
// //             isSubtotal: true, isGrandTotal: false,
// //           };
// //           subtotals.push(sub);
// //           result.push(sub);
// //         }
// //       }
// //     }
// //     const beginningCash = rows.find((r) => r.name === "Beginning Cash Balance");
// //     const filteredSubs  = subtotals.filter((r) => r.name !== "Total Non-Income Receipts");
// //     const grand = (f: keyof Pick<IncomeFundRow, "past" | "current_total" | "sem1" | "sem2" | "proposed">) =>
// //       (beginningCash?.[f] ?? 0) + filteredSubs.reduce((a, r) => a + (r[f] ?? 0), 0);
// //     result.push({
// //       id: -999, parent_id: null, code: "",
// //       name: "Total Available Resources for Appropriations", level: 0,
// //       past: grand("past"), current_total: grand("current_total"),
// //       sem1: grand("sem1"), sem2: grand("sem2"), proposed: grand("proposed"),
// //       isSubtotal: false, isGrandTotal: true,
// //     });
// //     return result;
// //   }, [rows, currentSource]);

// //   const isEditable = (row: DisplayRow) =>
// //     !row.isSubtotal && !row.isGrandTotal && row.name !== "Beginning Cash Balance";

// //   // ── Table renderer ─────────────────────────────────────────────────────────

// //   const renderTable = () => (
// //     <TooltipProvider delayDuration={300}>
// //       <div className="overflow-x-auto">
// //         <table className="w-full min-w-[1200px] text-[12px] border-collapse">
// //           <thead>
// //             <tr>
// //               <th rowSpan={3} className="sticky left-0 z-30 border-b border-r border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide min-w-[260px]">
// //                 Object of Expenditure
// //               </th>
// //               <th rowSpan={2} className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 text-center align-bottom font-semibold text-green-700 text-[11px] uppercase tracking-wide w-32">
// //                 {meta?.past_year}<br />
// //                 <span className="text-[9.5px] font-normal normal-case text-green-500">Receipts</span>
// //               </th>
// //               <th colSpan={3} className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-blue-700">
// //                 Current Year {meta?.current_year} (Estimate)
// //               </th>
// //               <th rowSpan={2} className="border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 text-center align-bottom font-semibold text-orange-700 text-[11px] uppercase tracking-wide w-52">
// //                 {meta?.year} Budget Year<br />
// //                 <span className="text-[9px] font-normal text-orange-400 normal-case tracking-normal">
// //                   Default: % of current year · click % to switch
// //                 </span>
// //               </th>
// //               <th rowSpan={2} className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-wide w-28 text-gray-600">
// //                 Increase /<br />Decrease
// //               </th>
// //               <th rowSpan={2} className="border-b border-gray-200 bg-white px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-wide w-24 text-gray-600">
// //                 % Change
// //               </th>
// //             </tr>
// //             <tr>
// //               <th className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
// //                 1st Semester<br />(Actual)
// //               </th>
// //               <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
// //                 2nd Semester<br />(Estimate)
// //               </th>
// //               <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
// //                 Total
// //               </th>
// //             </tr>
// //             <tr className="border-b-2 border-gray-200">
// //               <td className="border-r border-l border-green-200  bg-green-50  px-3 py-1 text-center text-[10px] text-green-400">(1)</td>
// //               <td className="border-r border-l border-blue-200   bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(2)</td>
// //               <td className="border-r         border-blue-200    bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(3)</td>
// //               <td className="border-r         border-blue-200    bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(4)</td>
// //               <td className="border-r border-l border-orange-200 bg-orange-50 px-3 py-1 text-center text-[10px] text-orange-400">(5)</td>
// //               <td className="border-r         border-gray-200    bg-white     px-3 py-1 text-center text-[10px] text-gray-300">(6)</td>
// //               <td className="border-r         border-gray-200    bg-white     px-3 py-1 text-center text-[10px] text-gray-300">(7)</td>
// //             </tr>
// //           </thead>

// //           <tbody className="divide-y divide-gray-100">
// //             {displayRows.map((row) => {
// //               const total    = row.current_total ?? 0;
// //               const proposed = row.proposed ?? 0;
// //               const increase = proposed - total;
// //               const percent  = total === 0
// //                 ? (proposed === 0 ? null : 100)
// //                 : (increase / total) * 100;

// //               const editable   = isEditable(row);
// //               const isSaving   = savingRows.has(row.id);
// //               const indent     = row.level * 16;
// //               const hasCurrent = (row.current_total ?? 0) > 0;
// //               const isPct      = isInPctMode(row.id, hasCurrent);

// //               const incColor = increase > 0 ? "text-green-600" : increase < 0 ? "text-red-500" : "text-gray-500";
// //               const pctColor = percent !== null
// //                 ? percent > 0 ? "text-green-600" : percent < 0 ? "text-red-500" : "text-gray-500"
// //                 : "";

// //               if (row.isGrandTotal) {
// //                 return (
// //                   <tr key={row.id} className="bg-gray-900 text-white">
// //                     <td className="sticky left-0 z-10 bg-gray-900 px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-gray-300">
// //                       {row.name}
// //                     </td>
// //                     <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_PAST_GRAND)}>{fmtNum(row.past)}</td>
// //                     <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.sem1)}</td>
// //                     <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.sem2)}</td>
// //                     <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.current_total)}</td>
// //                     <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_BUDGET_GRAND)}>{fmtNum(row.proposed)}</td>
// //                     <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", incColor)}>{fmtNum(increase)}</td>
// //                     <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", pctColor)}>{fmtPct(percent)}</td>
// //                   </tr>
// //                 );
// //               }

// //               if (row.isSubtotal) {
// //                 return (
// //                   <tr key={row.id} className="bg-gray-50">
// //                     <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-200" style={{ paddingLeft: indent + 16 }}>
// //                       {row.name}
// //                     </td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_PAST_SUB)}>{fmtNum(row.past)}</td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.sem1)}</td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.sem2)}</td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.current_total)}</td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_BUDGET_SUB)}>{fmtNum(row.proposed)}</td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-200", incColor)}>{fmtNum(increase)}</td>
// //                     <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-200", pctColor)}>{fmtPct(percent)}</td>
// //                   </tr>
// //                 );
// //               }

// //               return (
// //                 <tr key={row.id} className="bg-white hover:bg-gray-50/60 transition-colors">
// //                   <td className="sticky left-0 z-10 bg-white border-r border-gray-100 px-4 py-2.5 text-gray-800 max-w-[260px]" style={{ paddingLeft: indent + 16 }}>
// //                     <span className="line-clamp-2">{row.name}</span>
// //                   </td>
// //                   <td className={cn("border-r border-l px-3 py-2.5 text-right font-mono text-gray-700 tabular-nums", COL_PAST)}>{fmtNum(row.past)}</td>
// //                   <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
// //                     {editable ? (
// //                       <input type="text" inputMode="decimal"
// //                         className={cn("w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white",
// //                           "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300",
// //                           "placeholder:text-gray-300 tabular-nums", isSaving && "opacity-50 pointer-events-none")}
// //                         value={fmtInput(row.sem1)}
// //                         onChange={(e) => handleSem1Change(row.id, e.target.value)}
// //                         onBlur={() => saveRow(row.id)}
// //                         disabled={isSaving}
// //                         placeholder="0"
// //                       />
// //                     ) : (
// //                       <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.sem1)}</div>
// //                     )}
// //                   </td>
// //                   <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-500 tabular-nums", COL_CURR)}>{fmtNum(row.sem2)}</td>
// //                   <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-600 tabular-nums", COL_CURR)}>{fmtNum(row.current_total)}</td>
// //                   <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
// //                     {editable ? (
// //                       <div className="flex items-center gap-1">
// //                         <Tooltip>
// //                           <TooltipTrigger asChild>
// //                             <button
// //                               onClick={() => toggleMode(row.id, hasCurrent, row.current_total ?? 0, row.proposed)}
// //                               className={cn(
// //                                 "shrink-0 h-7 w-8 rounded text-[10px] font-bold border transition-colors select-none",
// //                                 isPct
// //                                   ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
// //                                   : "bg-white text-gray-400 border-gray-200 hover:border-gray-400 hover:text-gray-600",
// //                                 !hasCurrent && "opacity-25 cursor-not-allowed"
// //                               )}
// //                               disabled={!hasCurrent || isSaving}
// //                             >%</button>
// //                           </TooltipTrigger>
// //                           <TooltipContent side="top" className="text-xs">
// //                             {!hasCurrent
// //                               ? "No current year data — percentage unavailable"
// //                               : isPct
// //                                 ? "Currently % mode — click to switch to amount input"
// //                                 : "Currently amount mode — click to switch to % input"}
// //                           </TooltipContent>
// //                         </Tooltip>
// //                         {isPct ? (
// //                           <div className="flex items-center flex-1 gap-0">
// //                             <input type="text" inputMode="decimal"
// //                               className={cn("flex-1 min-w-0 text-right text-[12px] font-mono h-7 px-2 rounded-l border bg-white",
// //                                 "border-orange-300 focus:outline-none focus:ring-2 focus:ring-orange-300",
// //                                 "tabular-nums placeholder:text-gray-300", isSaving && "opacity-50 pointer-events-none")}
// //                               value={pctInput[row.id] ?? ""}
// //                               onChange={(e) => handlePctChange(row.id, e.target.value, row.current_total ?? 0)}
// //                               onBlur={() => handlePctBlur(row.id, row.current_total ?? 0)}
// //                               disabled={isSaving}
// //                               placeholder="0.0"
// //                               autoComplete="off"
// //                             />
// //                             <span className="h-7 px-1.5 flex items-center rounded-r border border-l-0 border-orange-300 bg-orange-100 text-orange-600 font-bold text-[11px] shrink-0">%</span>
// //                           </div>
// //                         ) : (
// //                           <input type="text" inputMode="decimal"
// //                             className={cn("flex-1 min-w-0 text-right text-[12px] font-mono h-7 px-2 rounded border bg-white",
// //                               "border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300",
// //                               "tabular-nums placeholder:text-gray-300", isSaving && "opacity-50 pointer-events-none")}
// //                             value={fmtInput(row.proposed)}
// //                             onChange={(e) => handleAmountChange(row.id, e.target.value)}
// //                             onBlur={() => saveRow(row.id)}
// //                             disabled={isSaving}
// //                             placeholder="0"
// //                             autoComplete="off"
// //                           />
// //                         )}
// //                         {isPct && row.proposed !== null && (
// //                           <span className="shrink-0 text-[10px] text-orange-500 font-mono tabular-nums whitespace-nowrap ml-0.5">
// //                             = {fmtNum(row.proposed)}
// //                           </span>
// //                         )}
// //                       </div>
// //                     ) : (
// //                       <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.proposed)}</div>
// //                     )}
// //                   </td>
// //                   <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums", incColor)}>{fmtNum(increase)}</td>
// //                   <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", pctColor)}>{fmtPct(percent)}</td>
// //                 </tr>
// //               );
// //             })}
// //           </tbody>
// //         </table>
// //       </div>
// //     </TooltipProvider>
// //   );

// //   const renderLegend = () => (
// //     <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
// //       <span className="flex items-center gap-1.5">
// //         <span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />
// //         <span className="text-green-600 font-semibold">Green</span> = Past year (actual)
// //       </span>
// //       <span className="flex items-center gap-1.5">
// //         <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
// //         <span className="text-blue-600 font-semibold">Blue</span> = Current year · 2nd sem derived automatically
// //       </span>
// //       <span className="flex items-center gap-1.5">
// //         <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
// //         <span className="text-orange-600 font-semibold">Orange</span> = Budget year · default % input, click <strong className="mx-0.5">%</strong> to switch
// //       </span>
// //       <span className="flex items-center gap-1.5">
// //         <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
// //         Subtotals and grand total are computed automatically
// //       </span>
// //     </div>
// //   );

// //   // ── Render ─────────────────────────────────────────────────────────────────

// //   const renderContent = () => (
// //     <>
// //       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
// //         {loading ? <TableSkeleton /> : renderTable()}
// //       </div>
// //       {!loading && renderLegend()}
// //     </>
// //   );

// //   if (availableSources.length > 1) {
// //     return (
// //       <div className="p-6">
// //         <div className="mb-6">
// //           <div className="flex items-center gap-2 mb-1">
// //             <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form 1 · Receipts Program</span>
// //             {/* <span className="text-gray-300 text-[10px]"></span> */}
// //             {/* <span className="text-[10px] font-medium text-gray-400">FY {meta?.past_year} – {meta?.year}</span>
// //              */}

// //           </div>
// //           <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Income Fund</h1>
// //         </div>
// //         <Tabs value={currentSource} onValueChange={handleSourceChange} className="w-full">
// //           <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5">
// //             {availableSources.map((s) => (
// //               <TabsTrigger key={s.id} value={s.id}
// //                 // className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">
// //                 className="text-xs px-4 rounded-md data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-white text-gray-500 hover:text-gray-700">
// //                 {s.name}
// //               </TabsTrigger>
// //             ))}
// //           </TabsList>
// //           {availableSources.map((s) => (
// //             <TabsContent key={s.id} value={s.id} className="mt-0">
// //               {renderContent()}
// //             </TabsContent>
// //           ))}
// //         </Tabs>
// //       </div>
// //     );
// //   }

// //   return (
// //     <div className="p-6">
// //       <div className="mb-6">
// //         <div className="flex items-center gap-2 mb-1">
// //           <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Receipts Program</span>
// //           <span className="text-gray-300 text-[10px]">·</span>
// //           <span className="text-[10px] font-medium text-gray-400">FY {meta?.past_year} – {meta?.year}</span>
// //           <span className="text-gray-300 text-[10px]">·</span>
// //           <span className="text-[10px] font-medium text-gray-400">{meta?.source ? sourceName(meta.source) : sourceName(currentSource)}</span>
// //         </div>
// //         <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Income Fund</h1>
// //       </div>
// //       {renderContent()}
// //     </div>
// //   );
// // }

// import { useEffect, useState, useMemo, useCallback, useRef } from "react";
// import API from "@/src/services/api";
// import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
// import { Skeleton } from "@/src/components/ui/skeleton";
// import { IncomeFundResponse, IncomeFundRow } from "../../types/api";
// import { toast } from "sonner";
// import { useAuth } from "@/src/hooks/useAuth";
// import { cn } from "@/src/lib/utils";

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface DisplayRow extends IncomeFundRow {
//   isSubtotal?: boolean;
//   isGrandTotal?: boolean;
// }

// interface SourceConfig {
//   id: string;
//   name: string;
//   path: string;
// }

// // ─── Subtotal configs ─────────────────────────────────────────────────────────

// const subtotalConfigs: Record<
//   string,
//   Array<{
//     afterId?: number;
//     afterName?: string;
//     name: string;
//     level: number;
//     parentId?: number;
//     parentName?: string;
//   }>
// > = {
//   "general-fund": [
//     { afterId: 13,  name: "Total Tax Revenue",        level: 3, parentId: 4  },
//     { afterId: 32,  name: "Total Non-Tax Revenue",    level: 3, parentId: 14 },
//     { afterId: 44,  name: "Total External Source",    level: 2, parentId: 33 },
//     { afterId: 49,  name: "Total Non-Income Receipts",level: 2, parentId: 45 },
//   ],
//   occ: [
//     { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
//     { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
//     { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
//     { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
//   ],
//   pm: [
//     { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
//     { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
//     { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
//     { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
//   ],
//   sh: [
//     { afterName: "iii. Other Taxes",        name: "Total Tax Revenue",        level: 3, parentName: "1. Tax Revenue"         },
//     { afterName: "c. Other Service Income", name: "Total Non-Tax Revenue",    level: 3, parentName: "2. Non-Tax Revenue"     },
//     { afterName: "d. Subsidy from OCC",     name: "Total External Source",    level: 2, parentName: "B. External Source"     },
//     { afterName: "a. Acquisition of Loans", name: "Total Non-Income Receipts",level: 2, parentName: "C. Non-Income Receipts" },
//   ],
// };

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmtNum = (val: number | null | undefined): string => {
//   if (val === null || val === undefined) return "–";
//   return "₱" + Math.round(val).toLocaleString("en-PH");
// };

// const fmtPct = (val: number | null | undefined): string => {
//   if (val === null || val === undefined) return "–";
//   return val.toFixed(1) + "%";
// };

// const fmtInput = (val: number | null | undefined): string => {
//   if (val === null || val === undefined) return "";
//   return Math.round(val).toLocaleString("en-PH");
// };

// // ─── Column color tokens ──────────────────────────────────────────────────────
// const COL_PAST    = "bg-green-50/50  border-green-100";
// const COL_CURR    = "bg-blue-50/40   border-blue-100";
// const COL_BUDGET  = "bg-orange-50/40 border-orange-100";

// const COL_PAST_SUB   = "bg-green-50   border-green-200";
// const COL_CURR_SUB   = "bg-blue-50    border-blue-200";
// const COL_BUDGET_SUB = "bg-orange-50  border-orange-200";

// const COL_PAST_GRAND   = "text-green-300  border-green-900/40  bg-green-950/20";
// const COL_CURR_GRAND   = "text-blue-300   border-blue-900/40   bg-blue-950/20";
// const COL_BUDGET_GRAND = "text-orange-300 border-orange-900/40 bg-orange-950/20";

// // ─── Table Skeleton ───────────────────────────────────────────────────────────

// function TableSkeleton() {
//   return (
//     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//       <div className="overflow-x-auto">
//         <table className="w-full min-w-[1200px] text-[12px] border-collapse">
//           <thead>
//             {/* Row 1 — group headers */}
//             <tr>
//               <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-white px-4 py-2.5 min-w-[260px]">
//                 <Skeleton className="h-3 w-32 rounded" />
//               </th>
//               {/* Past — green */}
//               <th className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 w-32">
//                 <Skeleton className="h-3 w-10 mx-auto rounded bg-green-200" />
//               </th>
//               {/* Current — blue, spans 3 */}
//               <th colSpan={3} className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-2 text-center">
//                 <Skeleton className="h-3 w-36 mx-auto rounded bg-blue-200" />
//               </th>
//               {/* Budget — orange */}
//               <th className="border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 w-52">
//                 <Skeleton className="h-3 w-24 mx-auto rounded bg-orange-200" />
//               </th>
//               {/* Neutral */}
//               <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 w-28">
//                 <Skeleton className="h-3 w-16 ml-auto rounded" />
//               </th>
//               <th className="border-b border-gray-200 bg-white px-3 py-2.5 w-24">
//                 <Skeleton className="h-3 w-12 ml-auto rounded" />
//               </th>
//             </tr>
//             {/* Row 2 — current year sub-headers */}
//             <tr>
//               <th className="border-b border-r border-gray-200 bg-white" />
//               <th className="border-b border-r border-green-200 bg-green-50" />
//               <th className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
//                 <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-200" />
//               </th>
//               <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
//                 <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-200" />
//               </th>
//               <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
//                 <Skeleton className="h-2.5 w-12 ml-auto rounded bg-blue-200" />
//               </th>
//               <th className="border-b border-r border-orange-200 bg-orange-50" />
//               <th className="border-b border-r border-gray-200 bg-white" />
//               <th className="border-b border-gray-200 bg-white" />
//             </tr>
//             {/* Row 3 — column numbers */}
//             <tr className="border-b-2 border-gray-200">
//               <td className="border-r border-gray-200 bg-white sticky left-0" />
//               <td className="border-r border-l border-green-200 bg-green-50 px-3 py-1 text-center text-[10px] text-green-300">(1)</td>
//               <td className="border-r border-l border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(2)</td>
//               <td className="border-r         border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(3)</td>
//               <td className="border-r         border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(4)</td>
//               <td className="border-r border-l border-orange-200 bg-orange-50 px-3 py-1 text-center text-[10px] text-orange-300">(5)</td>
//               <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-200">(6)</td>
//               <td className="border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-200">(7)</td>
//             </tr>
//           </thead>
//           <tbody className="divide-y divide-gray-100">
//             {Array.from({ length: 18 }).map((_, ri) => {
//               const isSubtotal = ri === 5 || ri === 11;
//               const bg = isSubtotal ? "bg-gray-50" : "";
//               const widths = ["w-4/5","w-full","w-3/4","w-5/6","w-2/3","w-full","w-4/5","w-3/5"];
//               const nameW  = widths[ri % widths.length];
//               return (
//                 <tr key={ri} className={bg} style={{ animationDelay: `${ri * 40}ms` }}>
//                   <td className={cn("sticky left-0 z-10 border-r border-gray-100 px-4 py-2.5", bg || "bg-white")}>
//                     <Skeleton className={cn("h-3 rounded", nameW, isSubtotal && "bg-gray-200")} style={{ marginLeft: `${(ri % 4) * 12}px` }} />
//                   </td>
//                   <td className={cn("border-r border-l px-3 py-2.5", COL_PAST)}>
//                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 0 ? "w-16" : "w-20", "bg-green-100")} />
//                   </td>
//                   <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
//                     {isSubtotal
//                       ? <Skeleton className="h-3 w-20 ml-auto rounded bg-blue-100" />
//                       : <Skeleton className="h-7 w-full rounded-md bg-blue-100" />
//                     }
//                   </td>
//                   <td className={cn("border-r px-3 py-2.5", COL_CURR)}>
//                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-20", "bg-blue-100")} />
//                   </td>
//                   <td className={cn("border-r px-3 py-2.5", COL_CURR)}>
//                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 3 === 1 ? "w-20" : "w-16", "bg-blue-100")} />
//                   </td>
//                   <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
//                     {isSubtotal
//                       ? <Skeleton className="h-3 w-20 ml-auto rounded bg-orange-100" />
//                       : <Skeleton className="h-7 w-full rounded-md bg-orange-100" />
//                     }
//                   </td>
//                   <td className="border-r border-gray-100 px-3 py-2.5">
//                     <Skeleton className={cn("h-3 rounded ml-auto", ri % 2 === 0 ? "w-16" : "w-12")} />
//                   </td>
//                   <td className="px-3 py-2.5">
//                     <Skeleton className="h-3 w-10 ml-auto rounded" />
//                   </td>
//                 </tr>
//               );
//             })}
//           </tbody>
//           <tfoot>
//             <tr className="bg-gray-900">
//               <td className="sticky left-0 z-10 bg-gray-900 px-4 py-3">
//                 <Skeleton className="h-3 w-48 rounded bg-gray-700" />
//               </td>
//               <td className={cn("px-3 py-3 border-l", COL_PAST_GRAND)}>
//                 <Skeleton className="h-3 w-20 ml-auto rounded bg-green-900/40" />
//               </td>
//               {[0,1,2].map(i => (
//                 <td key={i} className={cn("px-3 py-3 border-l", COL_CURR_GRAND)}>
//                   <Skeleton className="h-3 w-16 ml-auto rounded bg-blue-900/40" />
//                 </td>
//               ))}
//               <td className={cn("px-3 py-3 border-l", COL_BUDGET_GRAND)}>
//                 <Skeleton className="h-3 w-20 ml-auto rounded bg-orange-900/40" />
//               </td>
//               <td className="px-3 py-3 border-l border-gray-700">
//                 <Skeleton className="h-3 w-16 ml-auto rounded bg-gray-700" />
//               </td>
//               <td className="px-3 py-3 border-l border-gray-700">
//                 <Skeleton className="h-3 w-10 ml-auto rounded bg-gray-700" />
//               </td>
//             </tr>
//           </tfoot>
//         </table>
//       </div>
//     </div>
//   );
// }

// // ─── Component ────────────────────────────────────────────────────────────────

// export default function IncomeFundPage() {
//   const { user } = useAuth();
//   const [rows, setRows]             = useState<IncomeFundRow[]>([]);
//   const [meta, setMeta]             = useState<Omit<IncomeFundResponse, "data"> | null>(null);
//   const [loading, setLoading]       = useState(true);
//   const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
//   const [currentSource, setCurrentSource] = useState<string>("general-fund");

//   const savedValues = useRef<
//     Map<number, { sem1: number | null; sem2: number | null; proposed: number | null }>
//   >(new Map());
//   const initialSaveDone = useRef(false);

//   const availableSources = useMemo<SourceConfig[]>(() => {
//     const src: SourceConfig[] = [];
//     if (user?.role === "admin" || user?.role === "super-admin") {
//       src.push(
//         { id: "general-fund", name: "General Fund",           path: "income-general-fund" },
//         { id: "sh",           name: "Slaughterhouse",         path: "sh-fund"             },
//         { id: "occ",          name: "Opol Community College", path: "occ-fund"            },
//         { id: "pm",           name: "Public Market",          path: "pm-fund"             }
//       );
//     } else if (user?.role === "department-head") {
//       const path = window.location.pathname;
//       if (path.includes("sh-fund"))  src.push({ id: "sh",  name: "Slaughterhouse",         path: "sh-fund"  });
//       if (path.includes("occ-fund")) src.push({ id: "occ", name: "Opol Community College", path: "occ-fund" });
//       if (path.includes("pm-fund"))  src.push({ id: "pm",  name: "Public Market",          path: "pm-fund"  });
//     }
//     return src;
//   }, [user]);

//   useEffect(() => {
//     const path = window.location.pathname;
//     if      (path.includes("sh-fund"))  setCurrentSource("sh");
//     else if (path.includes("occ-fund")) setCurrentSource("occ");
//     else if (path.includes("pm-fund"))  setCurrentSource("pm");
//     else                                setCurrentSource("general-fund");
//   }, []);

//   const sourceName = (id: string) =>
//     ({ "general-fund": "General Fund", sh: "Slaughterhouse", occ: "Opol Community College", pm: "Public Market" }[id] ?? id);

//   useEffect(() => {
//     if (currentSource) load(currentSource);
//   }, [currentSource]);

//   const load = async (source: string) => {
//     setLoading(true);
//     try {
//       const res = await API.get<IncomeFundResponse>(`/income-fund?source=${source}`);
//     //   const data = res.data.data.map((row) => ({
//     //     ...row,
//     //     past:          row.past          !== null ? Number(row.past)          : null,
//     //     current_total: row.current_total !== null ? Number(row.current_total) : null,
//     //     sem1:          row.sem1          !== null ? Number(row.sem1)          : null,
//     //     sem2:          row.sem2          !== null ? Number(row.sem2)          : null,
//     //     proposed:      row.proposed      !== null ? Number(row.proposed)      : null,
//     //   }));

//         const data = res.data.data.map((row) => ({
//         ...row,
//         past:            row.past             !== null ? Number(row.past)             : null,
//         past_obligation: row.past_obligation  !== null ? Number(row.past_obligation)  : null,
//         current_sem1:    row.current_sem1     !== null ? Number(row.current_sem1)     : null,
//         current_sem2:    row.current_sem2     !== null ? Number(row.current_sem2)     : null,
//         current_total:   row.current_total    !== null ? Number(row.current_total)    : null,
//         sem1:            row.sem1             !== null ? Number(row.sem1)             : null,
//         sem2:            row.sem2             !== null ? Number(row.sem2)             : null,
//         proposed:        row.proposed         !== null ? Number(row.proposed)         : null,
//         }));
//       setRows(data);
//       setMeta({
//         year: res.data.year, past_year: res.data.past_year,
//         current_year: res.data.current_year, source: res.data.source,
//         records_exist: res.data.records_exist,
//       });
//       data.forEach((r) =>
//         savedValues.current.set(r.id, { sem1: r.sem1, sem2: r.sem2, proposed: r.proposed })
//       );
//       if (!res.data.records_exist && !initialSaveDone.current) {
//         initialSaveDone.current = true;
//         try {
//           await API.post("/income-fund/save", { rows: data, source });
//           data.forEach((r) =>
//             savedValues.current.set(r.id, { sem1: r.sem1, sem2: r.sem2, proposed: r.proposed })
//           );
//           toast.success(`Initial data saved for ${sourceName(source)}`);
//         } catch {
//           toast.error(`Failed to save initial data for ${sourceName(source)}`);
//         }
//       }
//     } catch {
//       toast.error("Failed to load data");
//     } finally {
//       setLoading(false);
//     }
//   };

//   const handleSourceChange = (id: string) => {
//     setCurrentSource(id);
//     initialSaveDone.current = false;
//     savedValues.current.clear();
//   };

//   const update = (rowId: number, field: "sem1" | "proposed", value: number | null) => {
//     setRows((prev) => {
//       const copy = [...prev];
//       const i = copy.findIndex((r) => r.id === rowId);
//       if (i === -1) return prev;
//       const row = { ...copy[i], [field]: value };
//       if (field === "sem1") row.sem2 = value !== null ? (row.current_total ?? 0) - value : null;
//       copy[i] = row;
//       return copy;
//     });
//   };

//   const saveRow = useCallback(
//     async (rowId: number) => {
//       if (savingRows.has(rowId)) return;
//       const row = rows.find((r) => r.id === rowId);
//       if (!row) return;
//       const last = savedValues.current.get(rowId);
//       if (last && last.sem1 === row.sem1 && last.sem2 === row.sem2 && last.proposed === row.proposed) return;
//       setSavingRows((prev) => new Set(prev).add(rowId));
//       const promise = API.post("/income-fund/save", { rows, source: currentSource }).then(() =>
//         savedValues.current.set(rowId, { sem1: row.sem1, sem2: row.sem2, proposed: row.proposed })
//       );
//       toast.promise(promise, {
//         loading: "Saving…",
//         success: "Saved successfully",
//         error: (err: any) => `Save failed: ${err?.response?.data?.message ?? err?.message}`,
//       });
//       try { await promise; } finally {
//         setSavingRows((prev) => { const n = new Set(prev); n.delete(rowId); return n; });
//       }
//     },
//     [rows, savingRows, currentSource]
//   );

//   const handleSem1Change = (rowId: number, raw: string) => {
//     const n = raw.replace(/,/g, "");
//     update(rowId, "sem1", n === "" ? null : Number(n));
//   };

//   const handleAmountChange = (rowId: number, raw: string) => {
//     const n = raw.replace(/,/g, "");
//     update(rowId, "proposed", n === "" ? null : Number(n));
//   };

//   const handlePastObligationChange = (rowId: number, raw: string) => {
//   const n = raw.replace(/,/g, "");
//   setRows((prev) => {
//     const copy = [...prev];
//     const i = copy.findIndex((r) => r.id === rowId);
//     if (i === -1) return prev;
//     copy[i] = { ...copy[i], past_obligation: n === "" ? null : Number(n) };
//     return copy;
//   });
// };

// //   const displayRows = useMemo(() => {
// //     if (!rows.length) return [];
// //     const childrenMap = new Map<number, IncomeFundRow[]>();
// //     rows.forEach((r) => {
// //       if (r.parent_id !== null) {
// //         if (!childrenMap.has(r.parent_id)) childrenMap.set(r.parent_id, []);
// //         childrenMap.get(r.parent_id)!.push(r);
// //       }
// //     });
// //     const nameToId = new Map(rows.map((r) => [r.name, r.id]));
// //     const sumDesc = (
// //       pid: number,
// //       field: keyof Pick<IncomeFundRow, "past" | "current_total" | "sem1" | "sem2" | "proposed">
// //     ) => {
// //       let total = 0;
// //       const stack = [pid];
// //       while (stack.length) {
// //         const p = stack.pop()!;
// //         (childrenMap.get(p) ?? []).forEach((c) => { total += c[field] ?? 0; stack.push(c.id); });
// //       }
// //       return total;
// //     };
// //     const result: DisplayRow[] = [];
// //     const subtotals: DisplayRow[] = [];
// //     const configs = subtotalConfigs[currentSource] ?? subtotalConfigs["general-fund"];
// //     for (const row of rows) {
// //       result.push({ ...row, isSubtotal: false, isGrandTotal: false });
// //       const cfg = configs.find((c) =>
// //         (c.afterId && c.afterId === row.id) || (c.afterName && row.name === c.afterName)
// //       );
// //       if (cfg) {
// //         const pid = cfg.parentId ?? (cfg.parentName ? nameToId.get(cfg.parentName) : undefined);
// //         if (pid) {
// //           const sub: DisplayRow = {
// //             id: -Date.now() - Math.random(), parent_id: null, code: "",
// //             name: cfg.name, level: cfg.level,
// //             past: sumDesc(pid, "past"),
// //             past_obligation: sumDesc(pid, "past_obligation"),
// //             current_total: sumDesc(pid, "current_total"),
// //             current_sem1: sumDesc(pid, "current_sem1"),  // Added missing property
// //             current_sem2: sumDesc(pid, "current_sem2"),
// //             sem1: sumDesc(pid, "sem1"), sem2: sumDesc(pid, "sem2"),
// //             proposed: sumDesc(pid, "proposed"),
// //             isSubtotal: true, isGrandTotal: false,
// //           };
// //           subtotals.push(sub);
// //           result.push(sub);
// //         }
// //       }
// //     }
// //     const beginningCash = rows.find((r) => r.name === "Beginning Cash Balance");
// //     const filteredSubs  = subtotals.filter((r) => r.name !== "Total Non-Income Receipts");
// //     // const grand = (f: keyof Pick<IncomeFundRow, "past" | "current_total" | "sem1" | "sem2" | "proposed">) =>
// //     const grand = (f: keyof Pick<IncomeFundRow, "past" | "past_obligation" | "current_total" | "sem1" | "sem2" | "proposed">) =>
// //       (beginningCash?.[f] ?? 0) + filteredSubs.reduce((a, r) => a + (r[f] ?? 0), 0);
// //     result.push({
// //       id: -999, parent_id: null, code: "",
// //       name: "Total Available Resources for Appropriations", level: 0,
// //        past: grand("past"), past_obligation: grand("past_obligation"),current_total: grand("current_total"),
// //       sem1: grand("sem1"), sem2: grand("sem2"), proposed: grand("proposed"),
// //       isSubtotal: false, isGrandTotal: true,
// //     });
// //     return result;
// //   }, [rows, currentSource]);

// //   const isEditable = (row: DisplayRow) =>
// //     !row.isSubtotal && !row.isGrandTotal && row.name !== "Beginning Cash Balance";

// const displayRows = useMemo(() => {
//   if (!rows.length) return [];
//   const childrenMap = new Map<number, IncomeFundRow[]>();
//   rows.forEach((r) => {
//     if (r.parent_id !== null) {
//       if (!childrenMap.has(r.parent_id)) childrenMap.set(r.parent_id, []);
//       childrenMap.get(r.parent_id)!.push(r);
//     }
//   });
//   const nameToId = new Map(rows.map((r) => [r.name, r.id]));
//   const sumDesc = (
//     pid: number,
//     field: keyof Pick<IncomeFundRow, "past" | "current_total" | "sem1" | "sem2" | "proposed" | "past_obligation" | "current_sem1" | "current_sem2">
//   ) => {
//     let total = 0;
//     const stack = [pid];
//     while (stack.length) {
//       const p = stack.pop()!;
//       (childrenMap.get(p) ?? []).forEach((c) => { total += c[field] ?? 0; stack.push(c.id); });
//     }
//     return total;
//   };
//   const result: DisplayRow[] = [];
//   const subtotals: DisplayRow[] = [];
//   const configs = subtotalConfigs[currentSource] ?? subtotalConfigs["general-fund"];
//   for (const row of rows) {
//     result.push({ ...row, isSubtotal: false, isGrandTotal: false });
//     const cfg = configs.find((c) =>
//       (c.afterId && c.afterId === row.id) || (c.afterName && row.name === c.afterName)
//     );
//     if (cfg) {
//       const pid = cfg.parentId ?? (cfg.parentName ? nameToId.get(cfg.parentName) : undefined);
//       if (pid) {
//         const sub: DisplayRow = {
//           id: -Date.now() - Math.random(),
//           parent_id: null,
//           code: "",
//           name: cfg.name,
//           level: cfg.level,
//           past: sumDesc(pid, "past"),
//           past_obligation: sumDesc(pid, "past_obligation"),
//           current_total: sumDesc(pid, "current_total"),
//           current_sem1: sumDesc(pid, "current_sem1"),  // Added missing property
//           current_sem2: sumDesc(pid, "current_sem2"),  // Added missing property
//           sem1: sumDesc(pid, "sem1"),
//           sem2: sumDesc(pid, "sem2"),
//           proposed: sumDesc(pid, "proposed"),
//           isSubtotal: true,
//           isGrandTotal: false,
//         };
//         subtotals.push(sub);
//         result.push(sub);
//       }
//     }
//   }
//   const beginningCash = rows.find((r) => r.name === "Beginning Cash Balance");
//   const filteredSubs  = subtotals.filter((r) => r.name !== "Total Non-Income Receipts");
//   const grand = (f: keyof Pick<IncomeFundRow, "past" | "past_obligation" | "current_total" | "sem1" | "sem2" | "proposed" | "current_sem1" | "current_sem2">) =>
//     (beginningCash?.[f] ?? 0) + filteredSubs.reduce((a, r) => a + (r[f] ?? 0), 0);

//   result.push({
//     id: -999,
//     parent_id: null,
//     code: "",
//     name: "Total Available Resources for Appropriations",
//     level: 0,
//     past: grand("past"),
//     past_obligation: grand("past_obligation"),
//     current_total: grand("current_total"),
//     current_sem1: grand("current_sem1"),  // Added missing property
//     current_sem2: grand("current_sem2"),  // Added missing property
//     sem1: grand("sem1"),
//     sem2: grand("sem2"),
//     proposed: grand("proposed"),
//     isSubtotal: false,
//     isGrandTotal: true,
//   });
//   return result;
// }, [rows, currentSource]);
// const isEditable = (row: DisplayRow) =>
//   !row.isSubtotal && !row.isGrandTotal && row.name !== "Beginning Cash Balance";

// const isPastEditable = (row: DisplayRow) =>
//   !row.isSubtotal && !row.isGrandTotal;

//   // ── Table renderer ─────────────────────────────────────────────────────────

//   const renderTable = () => (
//     <div className="overflow-x-auto">
//       <table className="w-full min-w-[1200px] text-[12px] border-collapse">
//         <thead>
//           <tr>
//             <th rowSpan={3} className="sticky left-0 z-30 border-b border-r border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide min-w-[260px]">
//               Object of Expenditure
//             </th>
//             {/* <th rowSpan={2} className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 text-center align-bottom font-semibold text-green-700 text-[11px] uppercase tracking-wide w-32">
//               {meta?.past_year}<br />
//               <span className="text-[9.5px] font-normal normal-case text-green-500">Receipts</span>
//             </th> */}
//             <th rowSpan={2} className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 text-center align-bottom font-semibold text-green-700 text-[11px] uppercase tracking-wide w-32">
//             {meta?.past_year}<br />
//             <span className="text-[9.5px] font-normal normal-case text-green-500">Proposed</span>
//             </th>
//             <th rowSpan={2} className="border-b border-r border-green-200 bg-green-100 px-3 py-2.5 text-center align-bottom font-semibold text-green-800 text-[11px] uppercase tracking-wide w-32">
//             {meta?.past_year}<br />
//             <span className="text-[9.5px] font-normal normal-case text-green-600">Actual / Obligation</span>
//             </th>
//             <th colSpan={3} className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-blue-700">
//               Current Year {meta?.current_year} (Estimate)
//             </th>
//             <th rowSpan={2} className="border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 text-center align-bottom font-semibold text-orange-700 text-[11px] uppercase tracking-wide w-52">
//               {meta?.year} Budget Year
//             </th>
//             <th rowSpan={2} className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-wide w-28 text-gray-600">
//               Increase /<br />Decrease
//             </th>
//             <th rowSpan={2} className="border-b border-gray-200 bg-white px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-wide w-24 text-gray-600">
//               % Change
//             </th>
//           </tr>
//           <tr>
//             <th className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
//               1st Semester<br />(Actual)
//             </th>
//             <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
//               2nd Semester<br />(Estimate)
//             </th>
//             <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
//               Total
//             </th>
//           </tr>
//           <tr className="border-b-2 border-gray-200">
//             <td className="border-r border-l border-green-200 bg-green-50  px-3 py-1 text-center text-[10px] text-green-400">(1)</td>
//             <td className="border-r         border-green-200 bg-green-100 px-3 py-1 text-center text-[10px] text-green-600">(2)</td>
//             <td className="border-r border-l border-blue-200  bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(3)</td>
//             <td className="border-r         border-blue-200    bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(4)</td>
//             <td className="border-r border-l border-orange-200 bg-orange-50 px-3 py-1 text-center text-[10px] text-orange-400">(5)</td>
//             <td className="border-r         border-gray-200    bg-white     px-3 py-1 text-center text-[10px] text-gray-300">(6)</td>
//             <td className="border-r         border-gray-200    bg-white     px-3 py-1 text-center text-[10px] text-gray-300">(7)</td>
//           </tr>
//         </thead>

//         <tbody className="divide-y divide-gray-100">
//           {displayRows.map((row) => {
//             const total    = row.current_total ?? 0;
//             const proposed = row.proposed ?? 0;
//             const increase = proposed - total;
//             const percent  = total === 0
//               ? (proposed === 0 ? null : 100)
//               : (increase / total) * 100;

//             const editable = isEditable(row);
//             const isSaving = savingRows.has(row.id);
//             const indent   = row.level * 16;

//             const incColor = increase > 0 ? "text-green-600" : increase < 0 ? "text-red-500" : "text-gray-500";
//             const pctColor = percent !== null
//               ? percent > 0 ? "text-green-600" : percent < 0 ? "text-red-500" : "text-gray-500"
//               : "";

//             if (row.isGrandTotal) {
//               return (
//                 <tr key={row.id} className="bg-gray-900 text-white">
//                   <td className="sticky left-0 z-10 bg-gray-900 px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-gray-300">
//                     {row.name}
//                   </td>
//                   <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_PAST_GRAND)}>{fmtNum(row.past)}</td>
//                   <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.sem1)}</td>
//                   <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.sem2)}</td>
//                   <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.current_total)}</td>
//                   <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_BUDGET_GRAND)}>{fmtNum(row.proposed)}</td>
//                   <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", incColor)}>{fmtNum(increase)}</td>
//                   <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", pctColor)}>{fmtPct(percent)}</td>
//                 </tr>
//               );
//             }

//             if (row.isSubtotal) {
//               return (
//                 <tr key={row.id} className="bg-gray-50">
//                   <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-200" style={{ paddingLeft: indent + 16 }}>
//                     {row.name}
//                   </td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_PAST_SUB)}>{fmtNum(row.past)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", "bg-green-50 border-green-200")}>{fmtNum(row.past_obligation)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.sem1)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.sem2)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.current_total)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_BUDGET_SUB)}>{fmtNum(row.proposed)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-200", incColor)}>{fmtNum(increase)}</td>
//                   <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-200", pctColor)}>{fmtPct(percent)}</td>
//                 </tr>
//               );
//             }

//             return (
//               <tr key={row.id} className="bg-white hover:bg-gray-50/60 transition-colors">
//                 <td className="sticky left-0 z-10 bg-white border-r border-gray-100 px-4 py-2.5 text-gray-800 max-w-[260px]" style={{ paddingLeft: indent + 16 }}>
//                   <span className="line-clamp-2">{row.name}</span>
//                 </td>
//                <td className={cn("border-r border-l px-3 py-2.5 text-right font-mono text-gray-700 tabular-nums", COL_PAST)}>{fmtNum(row.past)}</td>
//                <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_PAST_GRAND)}>{fmtNum(row.past_obligation)}</td>
//                 <td className={cn("border-r px-2 py-2", "bg-green-100/60 border-green-200")}>
//                 {isPastEditable(row) ? (
//                     <input
//                     type="text"
//                     inputMode="decimal"
//                     className="w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white border-green-300 focus:outline-none focus:ring-2 focus:ring-green-300 tabular-nums placeholder:text-gray-300"
//                     value={fmtInput(row.past_obligation)}
//                     onChange={(e) => handlePastObligationChange(row.id, e.target.value)}
//                     onBlur={() => saveRow(row.id)}
//                     placeholder="0"
//                     />
//                 ) : (
//                     <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.past_obligation)}</div>
//                 )}
//                 </td>
//                 <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
//                   {editable ? (
//                     <input type="text" inputMode="decimal"
//                       className={cn("w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white",
//                         "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300",
//                         "placeholder:text-gray-300 tabular-nums", isSaving && "opacity-50 pointer-events-none")}
//                       value={fmtInput(row.sem1)}
//                       onChange={(e) => handleSem1Change(row.id, e.target.value)}
//                       onBlur={() => saveRow(row.id)}
//                       disabled={isSaving}
//                       placeholder="0"
//                     />
//                   ) : (
//                     <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.sem1)}</div>
//                   )}
//                 </td>
//                 <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-500 tabular-nums", COL_CURR)}>{fmtNum(row.sem2)}</td>
//                 <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-600 tabular-nums", COL_CURR)}>{fmtNum(row.current_total)}</td>
//                 <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
//                   {editable ? (
//                     <input type="text" inputMode="decimal"
//                       className={cn("w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white",
//                         "border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300",
//                         "tabular-nums placeholder:text-gray-300", isSaving && "opacity-50 pointer-events-none")}
//                       value={fmtInput(row.proposed)}
//                       onChange={(e) => handleAmountChange(row.id, e.target.value)}
//                       onBlur={() => saveRow(row.id)}
//                       disabled={isSaving}
//                       placeholder="0"
//                       autoComplete="off"
//                     />
//                   ) : (
//                     <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.proposed)}</div>
//                   )}
//                 </td>
//                 <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums", incColor)}>{fmtNum(increase)}</td>
//                 <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", pctColor)}>{fmtPct(percent)}</td>
//               </tr>
//             );
//           })}
//         </tbody>
//       </table>
//     </div>
//   );

//   const renderLegend = () => (
//     <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
//       <span className="flex items-center gap-1.5">
//         <span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />
//         <span className="text-green-600 font-semibold">Green</span> = Past year (actual)
//       </span>
//       <span className="flex items-center gap-1.5">
//         <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
//         <span className="text-blue-600 font-semibold">Blue</span> = Current year · 2nd sem derived automatically
//       </span>
//       <span className="flex items-center gap-1.5">
//         <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
//         <span className="text-orange-600 font-semibold">Orange</span> = Budget year · enter amount directly
//       </span>
//       <span className="flex items-center gap-1.5">
//         <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
//         Subtotals and grand total are computed automatically
//       </span>
//     </div>
//   );

//   // ── Render ─────────────────────────────────────────────────────────────────

//   const renderContent = () => (
//     <>
//       <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
//         {loading ? <TableSkeleton /> : renderTable()}
//       </div>
//       {!loading && renderLegend()}
//     </>
//   );

//   if (availableSources.length > 1) {
//     return (
//       <div className="p-6">
//         <div className="mb-6">
//           <div className="flex items-center gap-2 mb-1">
//             <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form 1 · Receipts Program</span>
//           </div>
//           <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Income Fund</h1>
//         </div>
//         <Tabs value={currentSource} onValueChange={handleSourceChange} className="w-full">
//           <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5">
//             {availableSources.map((s) => (
//               <TabsTrigger key={s.id} value={s.id}
//                 className="text-xs px-4 rounded-md data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-white text-gray-500 hover:text-gray-700">
//                 {s.name}
//               </TabsTrigger>
//             ))}
//           </TabsList>
//           {availableSources.map((s) => (
//             <TabsContent key={s.id} value={s.id} className="mt-0">
//               {renderContent()}
//             </TabsContent>
//           ))}
//         </Tabs>
//       </div>
//     );
//   }

//   return (
//     <div className="p-6">
//       <div className="mb-6">
//         <div className="flex items-center gap-2 mb-1">
//           <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Receipts Program</span>
//           <span className="text-gray-300 text-[10px]">·</span>
//           <span className="text-[10px] font-medium text-gray-400">FY {meta?.past_year} – {meta?.year}</span>
//           <span className="text-gray-300 text-[10px]">·</span>
//           <span className="text-[10px] font-medium text-gray-400">{meta?.source ? sourceName(meta.source) : sourceName(currentSource)}</span>
//         </div>
//         <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Income Fund</h1>
//       </div>
//       {renderContent()}
//     </div>
//   );
// }


import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import API from "@/src/services/api";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { Skeleton } from "@/src/components/ui/skeleton";
import { IncomeFundResponse, IncomeFundRow } from "../../types/api";
import { toast } from "sonner";
import { useAuth } from "@/src/hooks/useAuth";
import { cn } from "@/src/lib/utils";

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
  return val.toFixed(1) + "%";
};

const fmtInput = (val: number | null | undefined): string => {
  if (val === null || val === undefined) return "";
  return Math.round(val).toLocaleString("en-PH");
};

// ─── Column color tokens ──────────────────────────────────────────────────────
const COL_PAST    = "bg-green-50/50  border-green-100";
const COL_CURR    = "bg-blue-50/40   border-blue-100";
const COL_BUDGET  = "bg-orange-50/40 border-orange-100";

const COL_PAST_SUB   = "bg-green-50   border-green-200";
const COL_CURR_SUB   = "bg-blue-50    border-blue-200";
const COL_BUDGET_SUB = "bg-orange-50  border-orange-200";

const COL_PAST_GRAND   = "text-green-300  border-green-900/40  bg-green-950/20";
const COL_CURR_GRAND   = "text-blue-300   border-blue-900/40   bg-blue-950/20";
const COL_BUDGET_GRAND = "text-orange-300 border-orange-900/40 bg-orange-950/20";

// ─── Table Skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1200px] text-[12px] border-collapse">
          <thead>
            {/* Row 1 — group headers */}
            <tr>
              <th className="sticky left-0 z-30 border-b border-r border-gray-200 bg-white px-4 py-2.5 min-w-[260px]">
                <Skeleton className="h-3 w-32 rounded" />
              </th>
              {/* Past Year (Actual) — green */}
              <th className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 w-32">
                <Skeleton className="h-3 w-10 mx-auto rounded bg-green-200" />
              </th>
              {/* Current — blue, spans 3 */}
              <th colSpan={3} className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-2 text-center">
                <Skeleton className="h-3 w-36 mx-auto rounded bg-blue-200" />
              </th>
              {/* Budget — orange */}
              <th className="border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 w-52">
                <Skeleton className="h-3 w-24 mx-auto rounded bg-orange-200" />
              </th>
              {/* Neutral */}
              <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 w-28">
                <Skeleton className="h-3 w-16 ml-auto rounded" />
              </th>
              <th className="border-b border-gray-200 bg-white px-3 py-2.5 w-24">
                <Skeleton className="h-3 w-12 ml-auto rounded" />
              </th>
            </tr>
            {/* Row 2 — current year sub-headers */}
            <tr>
              <th className="border-b border-r border-gray-200 bg-white" />
              <th className="border-b border-r border-green-200 bg-green-50" />
              <th className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
                <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-200" />
              </th>
              <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
                <Skeleton className="h-2.5 w-20 ml-auto rounded bg-blue-200" />
              </th>
              <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 w-32">
                <Skeleton className="h-2.5 w-12 ml-auto rounded bg-blue-200" />
              </th>
              <th className="border-b border-r border-orange-200 bg-orange-50" />
              <th className="border-b border-r border-gray-200 bg-white" />
              <th className="border-b border-gray-200 bg-white" />
            </tr>
            {/* Row 3 — column numbers */}
            <tr className="border-b-2 border-gray-200">
              <td className="border-r border-gray-200 bg-white sticky left-0" />
              <td className="border-r border-l border-green-200 bg-green-50 px-3 py-1 text-center text-[10px] text-green-300">(1)</td>
              <td className="border-r border-l border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(2)</td>
              <td className="border-r         border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(3)</td>
              <td className="border-r         border-blue-200  bg-blue-50  px-3 py-1 text-center text-[10px] text-blue-300">(4)</td>
              <td className="border-r border-l border-orange-200 bg-orange-50 px-3 py-1 text-center text-[10px] text-orange-300">(5)</td>
              <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-200">(6)</td>
              <td className="border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-200">(7)</td>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {Array.from({ length: 18 }).map((_, ri) => {
              const isSubtotal = ri === 5 || ri === 11;
              const bg = isSubtotal ? "bg-gray-50" : "";
              const widths = ["w-4/5","w-full","w-3/4","w-5/6","w-2/3","w-full","w-4/5","w-3/5"];
              const nameW  = widths[ri % widths.length];
              return (
                <tr key={ri} className={bg} style={{ animationDelay: `${ri * 40}ms` }}>
                  <td className={cn("sticky left-0 z-10 border-r border-gray-100 px-4 py-2.5", bg || "bg-white")}>
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
            <tr className="bg-gray-900">
              <td className="sticky left-0 z-10 bg-gray-900 px-4 py-3">
                <Skeleton className="h-3 w-48 rounded bg-gray-700" />
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
              <td className="px-3 py-3 border-l border-gray-700">
                <Skeleton className="h-3 w-16 ml-auto rounded bg-gray-700" />
              </td>
              <td className="px-3 py-3 border-l border-gray-700">
                <Skeleton className="h-3 w-10 ml-auto rounded bg-gray-700" />
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function IncomeFundPage() {
  const { user } = useAuth();
  const [rows, setRows]             = useState<IncomeFundRow[]>([]);
  const [meta, setMeta]             = useState<Omit<IncomeFundResponse, "data"> | null>(null);
  const [loading, setLoading]       = useState(true);
  const [savingRows, setSavingRows] = useState<Set<number>>(new Set());
  const [currentSource, setCurrentSource] = useState<string>("general-fund");

  const savedValues = useRef<
    Map<number, { sem1: number | null; sem2: number | null; proposed: number | null; past_obligation: number | null }>
  >(new Map());
  const initialSaveDone = useRef(false);

  const availableSources = useMemo<SourceConfig[]>(() => {
    const src: SourceConfig[] = [];
    if (user?.role === "admin" || user?.role === "super-admin") {
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

  useEffect(() => {
    if (currentSource) load(currentSource);
  }, [currentSource]);

  const load = async (source: string) => {
    setLoading(true);
    try {
      const res = await API.get<IncomeFundResponse>(`/income-fund?source=${source}`);
      const data = res.data.data.map((row) => ({
        ...row,
        past:            row.past             !== null ? Number(row.past)             : null,
        past_obligation: row.past_obligation  !== null ? Number(row.past_obligation)  : null,
        current_sem1:    row.current_sem1     !== null ? Number(row.current_sem1)     : null,
        current_sem2:    row.current_sem2     !== null ? Number(row.current_sem2)     : null,
        current_total:   row.current_total    !== null ? Number(row.current_total)    : null,
        sem1:            row.sem1             !== null ? Number(row.sem1)             : null,
        sem2:            row.sem2             !== null ? Number(row.sem2)             : null,
        proposed:        row.proposed         !== null ? Number(row.proposed)         : null,
      }));
      setRows(data);
      setMeta({
  year: res.data.year, past_year: res.data.past_year,
  current_year: res.data.current_year, source: res.data.source,
  records_exist: res.data.records_exist,
});

if (res.data.past_plan_missing) {
  toast.warning(
    `Budget plan for ${res.data.past_year} does not exist. Create it first to enable past year obligation amount entries.`,
    { duration: 8000 }
  );
}
      data.forEach((r) =>
        savedValues.current.set(r.id, { sem1: r.sem1, sem2: r.sem2, proposed: r.proposed, past_obligation: r.past_obligation })
        );
      if (!res.data.records_exist && !initialSaveDone.current) {
        initialSaveDone.current = true;
        try {
          await API.post("/income-fund/save", { rows: data, source });
          data.forEach((r) =>
            savedValues.current.set(r.id, { sem1: r.sem1, sem2: r.sem2, proposed: r.proposed, past_obligation: r.past_obligation })
            );
          toast.success(`Initial data saved for ${sourceName(source)}`);
        } catch {
          toast.error(`Failed to save initial data for ${sourceName(source)}`);
        }
      }
    } catch {
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (id: string) => {
    setCurrentSource(id);
    initialSaveDone.current = false;
    savedValues.current.clear();
  };

  const update = (rowId: number, field: "sem1" | "proposed", value: number | null) => {
    setRows((prev) => {
      const copy = [...prev];
      const i = copy.findIndex((r) => r.id === rowId);
      if (i === -1) return prev;
      const row = { ...copy[i], [field]: value };
      if (field === "sem1") row.sem2 = value !== null ? (row.current_total ?? 0) - value : null;
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
        last.sem1 === row.sem1 &&
        last.sem2 === row.sem2 &&
        last.proposed === row.proposed &&
        last.past_obligation === row.past_obligation   // ← add this
        ) return;
      setSavingRows((prev) => new Set(prev).add(rowId));
      const promise = API.post("/income-fund/save", { rows, source: currentSource }).then(() =>
        savedValues.current.set(rowId, { sem1: row.sem1, sem2: row.sem2, proposed: row.proposed, past_obligation: row.past_obligation })
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

  const handleSem1Change = (rowId: number, raw: string) => {
    const n = raw.replace(/,/g, "");
    update(rowId, "sem1", n === "" ? null : Number(n));
  };

  const handleAmountChange = (rowId: number, raw: string) => {
    const n = raw.replace(/,/g, "");
    update(rowId, "proposed", n === "" ? null : Number(n));
  };

  // WITH THIS:
const handlePastObligationChange = (rowId: number, raw: string) => {
  const n = raw.replace(/,/g, "");
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

    const promise = API.post("/income-fund/save", {
      rows: updatedRows,
      source: currentSource,
    }).then(() => {
      savedValues.current.set(rowId, {
        ...(savedValues.current.get(rowId) ?? { sem1: null, sem2: null, proposed: null, past_obligation: null }),
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
      field: keyof Pick<IncomeFundRow, "past" | "current_total" | "sem1" | "sem2" | "proposed" | "past_obligation" | "current_sem1" | "current_sem2">
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
            sem1: sumDesc(pid, "sem1"),
            sem2: sumDesc(pid, "sem2"),
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
    const grand = (f: keyof Pick<IncomeFundRow, "past" | "past_obligation" | "current_total" | "sem1" | "sem2" | "proposed" | "current_sem1" | "current_sem2">) =>
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
      sem1: grand("sem1"),
      sem2: grand("sem2"),
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

  // ── Table renderer ─────────────────────────────────────────────────────────

  const renderTable = () => (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[1200px] text-[12px] border-collapse">
        <thead>
          <tr>
            <th rowSpan={3} className="sticky left-0 z-30 border-b border-r border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide min-w-[260px]">
              Object of Expenditure
            </th>
            <th rowSpan={2} className="border-b border-r border-green-200 bg-green-50 px-3 py-2.5 text-center align-bottom font-semibold text-green-700 text-[11px] uppercase tracking-wide w-40">
              Past Year (Actual)<br />
              <span className="text-[9.5px] font-normal normal-case text-green-500">{meta?.past_year}</span>
            </th>
            <th colSpan={3} className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-2 text-center text-[10px] font-semibold uppercase tracking-widest text-blue-700">
              Current Year {meta?.current_year} (Estimate)
            </th>
            <th rowSpan={2} className="border-b border-r border-orange-200 bg-orange-50 px-3 py-2.5 text-center align-bottom font-semibold text-orange-700 text-[11px] uppercase tracking-wide w-52">
              {meta?.year} Budget Year
            </th>
            <th rowSpan={2} className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-wide w-28 text-gray-600">
              Increase /<br />Decrease
            </th>
            <th rowSpan={2} className="border-b border-gray-200 bg-white px-3 py-2.5 text-right align-bottom text-[11px] font-semibold uppercase tracking-wide w-24 text-gray-600">
              % Change
            </th>
          </tr>
          <tr>
            <th className="border-b border-r border-l border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
              1st Semester<br />(Actual)
            </th>
            <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
              2nd Semester<br />(Estimate)
            </th>
            <th className="border-b border-r border-blue-200 bg-blue-50 px-3 py-1.5 text-right text-[10px] font-medium text-blue-600 uppercase tracking-wide w-32">
              Total
            </th>
          </tr>
          <tr className="border-b-2 border-gray-200">
            <td className="border-r border-l border-green-200 bg-green-50 px-3 py-1 text-center text-[10px] text-green-400">(1)</td>
            <td className="border-r border-l border-blue-200  bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(2)</td>
            <td className="border-r         border-blue-200    bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(3)</td>
            <td className="border-r         border-blue-200    bg-blue-50   px-3 py-1 text-center text-[10px] text-blue-400">(4)</td>
            <td className="border-r border-l border-orange-200 bg-orange-50 px-3 py-1 text-center text-[10px] text-orange-400">(5)</td>
            <td className="border-r         border-gray-200    bg-white     px-3 py-1 text-center text-[10px] text-gray-300">(6)</td>
            <td className="border-r         border-gray-200    bg-white     px-3 py-1 text-center text-[10px] text-gray-300">(7)</td>
          </tr>
        </thead>

        <tbody className="divide-y divide-gray-100">
          {displayRows.map((row) => {
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
                <tr key={row.id} className="bg-gray-900 text-white">
                  <td className="sticky left-0 z-10 bg-gray-900 px-4 py-3 font-semibold text-[11px] uppercase tracking-wide text-gray-300">
                    {row.name}
                  </td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_PAST_GRAND)}>{fmtNum(row.past_obligation)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.sem1)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.sem2)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l", COL_CURR_GRAND)}>{fmtNum(row.current_total)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono font-semibold tabular-nums border-l", COL_BUDGET_GRAND)}>{fmtNum(row.proposed)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", incColor)}>{fmtNum(increase)}</td>
                  <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", pctColor)}>{fmtPct(percent)}</td>
                </tr>
              );
            }

            if (row.isSubtotal) {
              return (
                <tr key={row.id} className="bg-gray-50">
                  <td className="sticky left-0 z-10 bg-gray-50 px-4 py-2.5 font-semibold text-gray-700 text-[11px] border-r border-gray-200" style={{ paddingLeft: indent + 16 }}>
                    {row.name}
                   </td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", "bg-green-50 border-green-200")}>{fmtNum(row.past_obligation)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.sem1)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.sem2)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_CURR_SUB)}>{fmtNum(row.current_total)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold text-gray-700 tabular-nums border-l", COL_BUDGET_SUB)}>{fmtNum(row.proposed)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-200", incColor)}>{fmtNum(increase)}</td>
                  <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-200", pctColor)}>{fmtPct(percent)}</td>
                </tr>
              );
            }

            return (
              <tr key={row.id} className="bg-white hover:bg-gray-50/60 transition-colors">
                <td className="sticky left-0 z-10 bg-white border-r border-gray-100 px-4 py-2.5 text-gray-800 max-w-[260px]" style={{ paddingLeft: indent + 16 }}>
                  <span className="line-clamp-2">{row.name}</span>
                </td>
                <td className={cn("px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-r border-green-200", "bg-green-50")}>
                  {isPastEditable(row) ? (
                    <input
                      type="text"
                      inputMode="decimal"
                      className="w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white border-green-300 focus:outline-none focus:ring-2 focus:ring-green-300 tabular-nums placeholder:text-gray-300"
                      value={fmtInput(row.past_obligation)}
                      onChange={(e) => handlePastObligationChange(row.id, e.target.value)}
                        onBlur={(e) => {
                        const n = e.target.value.replace(/,/g, "");
                        savePastObligation(row.id, n === "" ? null : Number(n));
                        }}
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-right font-mono text-gray-700 tabular-nums px-2">{fmtNum(row.past_obligation)}</div>
                  )}
                </td>
                <td className={cn("border-r border-l px-2 py-2", COL_CURR)}>
                  {editable ? (
                    <input type="text" inputMode="decimal"
                      className={cn("w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white",
                        "border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300",
                        "placeholder:text-gray-300 tabular-nums", isSaving && "opacity-50 pointer-events-none")}
                      value={fmtInput(row.sem1)}
                      onChange={(e) => handleSem1Change(row.id, e.target.value)}
                      onBlur={() => saveRow(row.id)}
                      disabled={isSaving}
                      placeholder="0"
                    />
                  ) : (
                    <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.sem1)}</div>
                  )}
                </td>
                <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-500 tabular-nums", COL_CURR)}>{fmtNum(row.sem2)}</td>
                <td className={cn("border-r px-3 py-2.5 text-right font-mono text-gray-600 tabular-nums", COL_CURR)}>{fmtNum(row.current_total)}</td>
                <td className={cn("border-r border-l px-2 py-1.5", COL_BUDGET)}>
                  {editable ? (
                    <input type="text" inputMode="decimal"
                      className={cn("w-full text-right text-[12px] font-mono h-7 px-2 rounded border bg-white",
                        "border-gray-200 focus:outline-none focus:ring-2 focus:ring-orange-300",
                        "tabular-nums placeholder:text-gray-300", isSaving && "opacity-50 pointer-events-none")}
                      value={fmtInput(row.proposed)}
                      onChange={(e) => handleAmountChange(row.id, e.target.value)}
                      onBlur={() => saveRow(row.id)}
                      disabled={isSaving}
                      placeholder="0"
                      autoComplete="off"
                    />
                  ) : (
                    <div className="text-right font-mono text-gray-500 tabular-nums px-2">{fmtNum(row.proposed)}</div>
                  )}
                </td>
                <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums", incColor)}>{fmtNum(increase)}</td>
                <td className={cn("px-3 py-2.5 text-right font-mono tabular-nums", pctColor)}>{fmtPct(percent)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );

  const renderLegend = () => (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
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
        <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
        Subtotals and grand total are computed automatically
      </span>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  const renderContent = () => (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? <TableSkeleton /> : renderTable()}
      </div>
      {!loading && renderLegend()}
    </>
  );

  if (availableSources.length > 1) {
    return (
      <div className="p-6">
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form 1 · Receipts Program</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Income Fund</h1>
        </div>
        <Tabs value={currentSource} onValueChange={handleSourceChange} className="w-full">
          <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5">
            {availableSources.map((s) => (
              <TabsTrigger key={s.id} value={s.id}
                className="text-xs px-4 rounded-md data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-white text-gray-500 hover:text-gray-700">
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
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Receipts Program</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-gray-400">FY {meta?.past_year} – {meta?.year}</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-gray-400">{meta?.source ? sourceName(meta.source) : sourceName(currentSource)}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Income Fund</h1>
      </div>
      {renderContent()}
    </div>
  );
}
