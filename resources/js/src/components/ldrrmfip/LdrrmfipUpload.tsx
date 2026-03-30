import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/src/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/src/components/ui/dialog";
import {
  Alert, AlertDescription, AlertTitle,
} from "@/src/components/ui/alert";
import { Badge } from "@/src/components/ui/badge";
import {
  ArrowUpTrayIcon, ArrowDownTrayIcon,
  ExclamationTriangleIcon, TrashIcon,
} from "@heroicons/react/24/outline";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/src/lib/utils";
import { toast } from "sonner";
import API from "@/src/services/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FundSource {
  id: string;
  label: string;
  type: "general" | "special";
}

interface Category {
  ldrrmfip_category_id: number;
  name: string;
}

interface ExistingItem {
  description: string;
  source: string;
  ldrrmfip_category_id: number;
}

interface ParsedRow {
  _id: number; // local key for removal
  category: string;
  categoryId: number | null; // resolved on parse
  description: string;
  implementing_office: string;
  starting_date: string;
  completion_date: string;
  expected_output: string;
  funding_source: string;
  mooe: number;
  co: number;
}

type Step = "idle" | "checking" | "preview" | "saving";

interface Props {
  activePlanId: number;
  activeSource: string;
  sources: FundSource[];
  categories: Category[];
  onSuccess: () => void;
}

// ── Source labels ─────────────────────────────────────────────────────────────

const SOURCE_LABELS: Record<string, string[]> = {
  "general-fund": ["general fund", "general"],
  occ: ["opol community college", "occ"],
  sh:  ["slaughterhouse", "sh"],
  pm:  ["public market", "pm"],
};

function detectSourceFromWorkbook(wb: XLSX.WorkBook): string | null {
  const ws = wb.Sheets[wb.SheetNames[0]];
  const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
  for (let r = range.s.r; r <= Math.min(range.s.r + 4, range.e.r); r++) {
    for (let c = range.s.c; c <= range.e.c; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r, c })];
      if (!cell) continue;
      const val = String(cell.v ?? "").toLowerCase().trim();
      if (val.startsWith("source:")) {
        const hint = val.replace("source:", "").trim();
        for (const [key, aliases] of Object.entries(SOURCE_LABELS)) {
          if (aliases.some(a => hint.includes(a))) return key;
        }
      }
    }
  }
  const sheetName = wb.SheetNames[0].toLowerCase();
  for (const [key, aliases] of Object.entries(SOURCE_LABELS)) {
    if (aliases.some(a => sheetName.includes(a))) return key;
  }
  return null;
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parseAmount(val: unknown): number {
  if (val === null || val === undefined || val === "") return 0;
  const n = typeof val === "number"
    ? val
    : parseFloat(String(val).replace(/[₱,\s]/g, ""));
  return isNaN(n) ? 0 : Math.round(n);
}

function normalizeQuarter(val: string): string {
  const s = (val ?? "").trim().toLowerCase();
  if (s.includes("1st") || s === "q1") return "1st Qrtr";
  if (s.includes("2nd") || s === "q2") return "2nd Qrtr";
  if (s.includes("3rd") || s === "q3") return "3rd Qrtr";
  if (s.includes("4th") || s === "q4") return "4th Qrtr";
  return (val ?? "").trim();
}

function resolveCategory(name: string, categories: Category[]): number | null {
  const lower = name.toLowerCase().trim();
  const match = categories.find(c => {
    const cn = c.name.toLowerCase().trim();
    return cn === lower || lower.includes(cn) || cn.includes(lower);
  });
  return match?.ldrrmfip_category_id ?? null;
}

let _rowId = 0;
function parseSheet(ws: XLSX.WorkSheet, categories: Category[]): ParsedRow[] {
  const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: "" });
  const result: ParsedRow[] = [];
  let currentCategory = "";

  // Skip row 0 (source label) + row 1 (header1) + row 2 (header2)
  for (let i = 3; i < rows.length; i++) {
    const row = rows[i] as string[];
    if (!row || row.every(c => String(c ?? "").trim() === "")) continue;

    const col0 = String(row[0] ?? "").trim();
    const col1 = String(row[1] ?? "").trim();
    const col2 = String(row[2] ?? "").trim();

    // Category-only row
    if (col0 && !col1) { currentCategory = col0; continue; }
    // Category + first item on same row
    if (col0 && col1)  { currentCategory = col0; }

    if (!col1 || !currentCategory) continue;

    // Attempt to merge multi-line expected output
    let expectedOutput = String(row[5] ?? "").trim();
    if (!expectedOutput && i + 1 < rows.length) {
      const next = rows[i + 1] as string[];
      if (next && !String(next[1] ?? "").trim() && String(next[4] ?? "").trim()) {
        expectedOutput = String(next[4] ?? "").trim();
      }
    }

    result.push({
      _id:                 ++_rowId,
      category:            currentCategory,
      categoryId:          resolveCategory(currentCategory, categories),
      description:         col1,
      implementing_office: col2 || "LDRRMO",
      starting_date:       normalizeQuarter(String(row[3] ?? "")),
      completion_date:     normalizeQuarter(String(row[4] ?? "")),
      expected_output:     expectedOutput || "",
      funding_source:      String(row[6] ?? "").trim() || "LDRRMF",
      mooe:                parseAmount(row[7]),
      co:                  parseAmount(row[8]),
    });
  }
  return result;
}

// ── Template download ─────────────────────────────────────────────────────────

function downloadTemplate(sourceId: string, sourceLabel: string) {
  const wb = XLSX.utils.book_new();
  const data = [
    [`Source: ${sourceLabel}`, "", "", "", "", "", "", "", "", ""],
    [
      "Functional Classification",
      "Program/Project/Activity Code and Description",
      "Implementing Office",
      "Schedule of Implementation", "",
      "Expected Output", "Funding Source",
      "Amount of Appropriation", "", "",
    ],
    ["", "", "", "Starting Date", "Completion Date", "", "", "MOOE", "CO", "TOTAL"],
    [
      "DISASTER RESPONSE & RESCUE EQUIPMENT",
      "Procurement of Road Safety Equipments/Materials",
      "LDRRMO", "1st Qrtr", "2nd Qrtr",
      "Increase Level of Response", "LDRRMF", "", "4000000", "4000000",
    ],
    [
      "",
      "Procurement of SRR Equipments/Materials",
      "LDRRMO", "1st Qrtr", "4th Qrtr",
      "Increase Level of Response", "LDRRMF", "", "300000", "300000",
    ],
    [
      "SUPPLIES OR INVENTORY",
      "Procurement of Food & Non-food items",
      "LDRRMO", "1st Qrtr", "4th Qrtr",
      "Increase Level of Readiness", "LDRRMF", "453961", "", "453961",
    ],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws["!cols"] = [
    { wch: 38 }, { wch: 45 }, { wch: 16 },
    { wch: 12 }, { wch: 14 }, { wch: 28 },
    { wch: 12 }, { wch: 16 }, { wch: 16 }, { wch: 16 },
  ];
  XLSX.utils.book_append_sheet(wb, ws, sourceLabel.substring(0, 31));
  XLSX.writeFile(wb, `LDRRMFIP_Template_${sourceId}.xlsx`);
}

// ── Component ─────────────────────────────────────────────────────────────────

export function LdrrmfipUpload({
  activePlanId, activeSource, sources, categories, onSuccess,
}: Props) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [open,            setOpen]            = useState(false);
  const [dragging,        setDragging]        = useState(false);
  const [step,            setStep]            = useState<Step>("idle");
  const [fileName,        setFileName]        = useState("");
  const [detectedSource,  setDetectedSource]  = useState<string | null>(null);
  const [sourceMismatch,  setSourceMismatch]  = useState(false);

  // rows after removing duplicates & user-removed rows
  const [previewRows,     setPreviewRows]     = useState<ParsedRow[]>([]);
  // duplicate count (detected against server)
  const [dupCount,        setDupCount]        = useState(0);
  // unknown category count
  const [unknownCatCount, setUnknownCatCount] = useState(0);

  const activeSourceObj = sources.find(s => s.id === activeSource);
  const enPH = (v: number) => v === 0 ? "–" : Math.round(v).toLocaleString("en-PH");

  // ── Reset ──────────────────────────────────────────────────────────────────
  const reset = () => {
    setStep("idle");
    setFileName("");
    setDetectedSource(null);
    setSourceMismatch(false);
    setPreviewRows([]);
    setDupCount(0);
    setUnknownCatCount(0);
    if (fileRef.current) fileRef.current.value = "";
  };

  // ── Process file ───────────────────────────────────────────────────────────
  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setStep("checking");

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(new Uint8Array(buffer), { type: "array" });
    const ws = wb.Sheets[wb.SheetNames[0]];

    // Detect source
    const detected = detectSourceFromWorkbook(wb);
    setDetectedSource(detected);
    const mismatch = detected !== null && detected !== activeSource;
    setSourceMismatch(mismatch);

    if (mismatch) {
      setStep("preview");
      setPreviewRows([]);
      return;
    }

    // Parse rows
    const parsed = parseSheet(ws, categories);

    // Fetch existing items from server to detect duplicates
    let existingItems: ExistingItem[] = [];
    try {
      const res = await API.get("/ldrrmfip", {
        params: { budget_plan_id: activePlanId, source: activeSource },
      });
      // Flatten all items from category groups
      const groups: { items: ExistingItem[] }[] = res.data.data ?? [];
      existingItems = groups.flatMap(g => g.items ?? []);
    } catch {
      // non-fatal: proceed without server duplicate check
    }

    const existingDescriptions = new Set(
      existingItems.map(i => i.description.toLowerCase().trim())
    );

    // Partition: duplicates vs new
    let dups = 0;
    let unknownCat = 0;
    const newRows: ParsedRow[] = [];

    for (const row of parsed) {
      const isDup = existingDescriptions.has(row.description.toLowerCase().trim());
      if (isDup) { dups++; continue; }
      if (!row.categoryId) unknownCat++;
      newRows.push(row);
    }

    setDupCount(dups);
    setUnknownCatCount(unknownCat);
    setPreviewRows(newRows);
    setStep("preview");
  }, [activePlanId, activeSource, categories]);

  const handleFile = (file: File) => {
    if (!file.name.match(/\.(xlsx|xls)$/i)) {
      toast.error("Please upload an .xlsx or .xls file.");
      return;
    }
    processFile(file);
  };

  // ── Remove row from preview ────────────────────────────────────────────────
  const removeRow = (id: number) =>
    setPreviewRows(prev => prev.filter(r => r._id !== id));

  // ── Save ───────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    const toSave = previewRows.filter(r => r.categoryId !== null);
    if (toSave.length === 0) {
      toast.error("No valid rows to save.");
      return;
    }
    setStep("saving");

    let saved = 0;
    let failed = 0;

    for (const row of toSave) {
      try {
        await API.post("/ldrrmfip", {
          budget_plan_id:       activePlanId,
          source:               activeSource,
          ldrrmfip_category_id: row.categoryId,
          description:          row.description,
          implementing_office:  row.implementing_office,
          starting_date:        row.starting_date  || null,
          completion_date:      row.completion_date || null,
          expected_output:      row.expected_output || null,
          funding_source:       row.funding_source,
          mooe:                 row.mooe,
          co:                   row.co,
        });
        saved++;
      } catch {
        failed++;
      }
    }

    setStep("preview");

    if (saved > 0) {
      toast.success(
        `${saved} item${saved > 1 ? "s" : ""} saved successfully.` +
        (failed > 0 ? ` ${failed} failed.` : "")
      );
      onSuccess();
      setOpen(false);
      reset();
    } else {
      toast.error("All items failed to save. Check console for details.");
    }
  };

  // ── Counts for footer ──────────────────────────────────────────────────────
  const validRows   = previewRows.filter(r => r.categoryId !== null);
  const invalidRows = previewRows.filter(r => r.categoryId === null);
  const isSaving    = step === "saving";

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Trigger buttons */}
      <div className="flex items-center gap-2">
        <Button
          size="sm" variant="outline"
          className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
          onClick={() =>
            downloadTemplate(activeSource, activeSourceObj?.label ?? activeSource)
          }
        >
          <ArrowDownTrayIcon className="w-3.5 h-3.5" />
          Template
        </Button>
        <Button
          size="sm" variant="outline"
          className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
          onClick={() => { reset(); setOpen(true); }}
        >
          <ArrowUpTrayIcon className="w-3.5 h-3.5" />
          Upload Excel
        </Button>
      </div>

      <Dialog open={open} onOpenChange={v => { if (!v) reset(); setOpen(v); }}>
        <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col overflow-hidden p-0 gap-0">

          {/* ── Header ── */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
            <DialogTitle className="text-[15px] flex items-center gap-2">
              Import from Excel
              {activeSourceObj && (
                <Badge variant="outline" className="text-[10px] font-semibold">
                  {activeSourceObj.type === "general"
                    ? "General Fund"
                    : activeSourceObj.label}
                </Badge>
              )}
              {step === "checking" && (
                <span className="text-[11px] text-gray-400 font-normal animate-pulse">
                  Checking for duplicates…
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {/* ── Body ── */}
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4 min-h-0">

            {/* ── Idle: drop zone ── */}
            {step === "idle" && (
              <div
                onDragOver={e => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={e => {
                  e.preventDefault(); setDragging(false);
                  const f = e.dataTransfer.files[0];
                  if (f) handleFile(f);
                }}
                onClick={() => fileRef.current?.click()}
                className={cn(
                  "border-2 border-dashed rounded-xl p-14 text-center cursor-pointer transition-colors",
                  dragging
                    ? "border-blue-400 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:bg-gray-50/60"
                )}
              >
                <ArrowUpTrayIcon className="w-9 h-9 text-gray-300 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-600">
                  Drop your Excel file here
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  or click to browse · .xlsx / .xls
                </p>
                <input
                  ref={fileRef} type="file" accept=".xlsx,.xls"
                  className="hidden"
                  onChange={e => {
                    const f = e.target.files?.[0];
                    if (f) handleFile(f);
                  }}
                />
              </div>
            )}

            {/* ── Checking: skeleton ── */}
            {step === "checking" && (
              <div className="space-y-3 animate-pulse">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-9 bg-gray-100 rounded-lg" />
                ))}
              </div>
            )}

            {/* ── Preview ── */}
            {(step === "preview" || step === "saving") && (
              <div className="space-y-4">

                {/* Source mismatch — hard block */}
                {sourceMismatch && detectedSource && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50">
                    <ExclamationTriangleIcon className="h-4 w-4" />
                    <AlertTitle className="text-[13px] font-semibold">
                      Source Mismatch — Upload Blocked
                    </AlertTitle>
                    <AlertDescription className="text-[12px] mt-1">
                      This file is tagged as{" "}
                      <strong>
                        {SOURCE_LABELS[detectedSource]?.[0] ?? detectedSource}
                      </strong>
                      , but you're on the{" "}
                      <strong>{activeSourceObj?.label ?? activeSource}</strong> tab.
                      Switch to the correct tab or use the matching template.
                    </AlertDescription>
                  </Alert>
                )}

                {/* Source match confirmation */}
                {!sourceMismatch && detectedSource && (
                  <div className="flex items-center gap-2 text-[12px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                    Source detected:{" "}
                    <strong>{SOURCE_LABELS[detectedSource]?.[0] ?? detectedSource}</strong>
                    {" "}— matches current tab.
                  </div>
                )}

                {/* No source tag warning */}
                {!sourceMismatch && !detectedSource && (
                  <div className="flex items-center gap-2 text-[12px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <ExclamationTriangleIcon className="w-4 h-4 flex-shrink-0" />
                    No "Source:" label found — importing into{" "}
                    <strong>{activeSourceObj?.label ?? activeSource}</strong>.
                  </div>
                )}

                {/* Stats bar */}
                {!sourceMismatch && (
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-[11px] text-gray-400 font-mono truncate max-w-xs">
                      {fileName}
                    </span>
                    <div className="flex items-center gap-2 ml-auto flex-wrap justify-end">
                      {dupCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-amber-700 bg-amber-50 border-amber-200"
                        >
                          {dupCount} duplicate{dupCount > 1 ? "s" : ""} skipped
                        </Badge>
                      )}
                      {unknownCatCount > 0 && (
                        <Badge
                          variant="outline"
                          className="text-[10px] text-red-700 bg-red-50 border-red-200"
                        >
                          {unknownCatCount} unknown category
                        </Badge>
                      )}
                      <Badge
                        variant="outline"
                        className="text-[10px] text-blue-700 bg-blue-50 border-blue-200"
                      >
                        {previewRows.length} row{previewRows.length !== 1 ? "s" : ""} in preview
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-[10px] text-emerald-700 bg-emerald-50 border-emerald-200"
                      >
                        {validRows.length} will be saved
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Preview table */}
                {!sourceMismatch && previewRows.length > 0 && (
                  <div className="border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto overflow-y-auto max-h-[44vh]">
                      <table className="w-full text-[11px] border-collapse min-w-[860px]">
                        <thead className="sticky top-0 z-10">
                          <tr className="bg-slate-700 text-slate-300">
                            <th className="px-3 py-2.5 text-left border-r border-slate-600 w-[17%]">
                              Category
                            </th>
                            <th className="px-3 py-2.5 text-left border-r border-slate-600 w-[22%]">
                              Description
                            </th>
                            <th className="px-3 py-2.5 text-center border-r border-slate-600 w-[8%]">
                              Office
                            </th>
                            <th className="px-3 py-2.5 text-center border-r border-slate-600 w-[7%]">
                              Start
                            </th>
                            <th className="px-3 py-2.5 text-center border-r border-slate-600 w-[7%]">
                              End
                            </th>
                            <th className="px-3 py-2.5 text-left border-r border-slate-600 w-[14%]">
                              Expected Output
                            </th>
                            <th className="px-3 py-2.5 text-right border-r border-slate-600 w-[8%]">
                              MOOE
                            </th>
                            <th className="px-3 py-2.5 text-right border-r border-slate-600 w-[8%]">
                              CO
                            </th>
                            <th className="px-3 py-2.5 text-right border-r border-slate-600 w-[8%]">
                              Total
                            </th>
                            <th className="w-9" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {previewRows.map((row, i) => {
                            const isInvalid = row.categoryId === null;
                            return (
                              <tr
                                key={row._id}
                                className={cn(
                                  "group transition-colors",
                                  isInvalid
                                    ? "bg-red-50 hover:bg-red-100/60"
                                    : i % 2 === 1
                                    ? "bg-gray-50/50 hover:bg-gray-100/60"
                                    : "bg-white hover:bg-gray-50/60",
                                  isSaving && "opacity-50 pointer-events-none"
                                )}
                              >
                                {/* Category */}
                                <td className="px-3 py-2.5 border-r border-gray-100">
                                  <span
                                    className={cn(
                                      "block truncate max-w-[140px]",
                                      isInvalid
                                        ? "text-red-600 font-medium"
                                        : "text-gray-600"
                                    )}
                                    title={row.category}
                                  >
                                    {row.category}
                                    {isInvalid && (
                                      <span className="ml-1 text-[9px] font-semibold">
                                        ⚠ unknown
                                      </span>
                                    )}
                                  </span>
                                </td>

                                {/* Description */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-gray-800 leading-snug">
                                  <span
                                    className="block truncate max-w-[180px]"
                                    title={row.description}
                                  >
                                    {row.description}
                                  </span>
                                </td>

                                {/* Office */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-gray-500 text-center">
                                  {row.implementing_office}
                                </td>

                                {/* Start */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-gray-500 text-center whitespace-nowrap">
                                  {row.starting_date || "–"}
                                </td>

                                {/* End */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-gray-500 text-center whitespace-nowrap">
                                  {row.completion_date || "–"}
                                </td>

                                {/* Expected Output */}
                                <td
                                  className="px-3 py-2.5 border-r border-gray-100 text-gray-500"
                                  title={row.expected_output}
                                >
                                  <span className="block truncate max-w-[110px]">
                                    {row.expected_output || "–"}
                                  </span>
                                </td>

                                {/* MOOE */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-right font-mono tabular-nums text-gray-700">
                                  {enPH(row.mooe)}
                                </td>

                                {/* CO */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-right font-mono tabular-nums text-gray-700">
                                  {enPH(row.co)}
                                </td>

                                {/* Total */}
                                <td className="px-3 py-2.5 border-r border-gray-100 text-right font-mono tabular-nums font-semibold text-gray-900">
                                  {enPH(row.mooe + row.co)}
                                </td>

                                {/* Remove */}
                                <td className="px-2 py-2.5 text-center">
                                  <button
                                    onClick={() => removeRow(row._id)}
                                    disabled={isSaving}
                                    className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 transition-all"
                                    title="Remove this row"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>

                        {/* Totals footer */}
                        <tfoot className="sticky bottom-0">
                          <tr className="bg-gray-900 text-white">
                            <td
                              colSpan={6}
                              className="px-4 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400"
                            >
                              Total ({validRows.length} valid item{validRows.length !== 1 ? "s" : ""})
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold border-l border-gray-700">
                              {enPH(validRows.reduce((s, r) => s + r.mooe, 0))}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold border-l border-gray-700">
                              {enPH(validRows.reduce((s, r) => s + r.co, 0))}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold border-l border-gray-700">
                              {enPH(validRows.reduce((s, r) => s + r.mooe + r.co, 0))}
                            </td>
                            <td className="border-l border-gray-700" />
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                {/* Empty state */}
                {!sourceMismatch && previewRows.length === 0 && (
                  <div className="text-center py-10 text-gray-400 text-sm">
                    {dupCount > 0
                      ? `All ${dupCount} row${dupCount > 1 ? "s" : ""} already exist — nothing new to import.`
                      : "No data rows found in this file."}
                  </div>
                )}

                {/* Invalid rows warning */}
                {invalidRows.length > 0 && (
                  <p className="text-[11px] text-red-500">
                    ⚠ {invalidRows.length} row{invalidRows.length > 1 ? "s" : ""} with unknown
                    categories (highlighted in red) will be skipped on save. Remove them or fix
                    the category names in your file.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Footer ── */}
          <DialogFooter className="px-6 py-4 border-t border-gray-100 flex-shrink-0 gap-2">
            <Button
              variant="outline" size="sm"
              onClick={() => { reset(); setOpen(false); }}
              disabled={isSaving}
            >
              Cancel
            </Button>

            {(step === "preview" || step === "saving") && !sourceMismatch && (
              <>
                <Button
                  variant="outline" size="sm"
                  onClick={reset}
                  disabled={isSaving}
                >
                  ← Re-upload
                </Button>
                <Button
                  size="sm"
                  disabled={isSaving || validRows.length === 0}
                  onClick={handleSave}
                  className="bg-gray-900 hover:bg-gray-800 min-w-[120px]"
                >
                  {isSaving
                    ? "Saving…"
                    : `Save ${validRows.length} Item${validRows.length !== 1 ? "s" : ""}`}
                </Button>
              </>
            )}
          </DialogFooter>

        </DialogContent>
      </Dialog>
    </>
  );
}