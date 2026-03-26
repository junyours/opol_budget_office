import { useEffect, useState, useCallback, useRef } from "react";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { LoadingState } from "@/src/pages/common/LoadingState";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
import { Skeleton } from "@/src/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/src/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/src/components/ui/command";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/src/components/ui/popover";
import { Badge } from "@/src/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { MoreHorizontalIcon } from "lucide-react";
import {
  PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon, ChevronUpDownIcon,
  CheckIcon as HeroCheckIcon, UserGroupIcon, BuildingOffice2Icon,
  ExclamationTriangleIcon, TrashIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

// ─── Template fingerprint detection ──────────────────────────────────────────
// The GAD Excel template has sheet name "gad". Anything else is the wrong form.

const GAD_FINGERPRINT = "gad";

function detectIsGadTemplate(wb: XLSX.WorkBook): boolean {
  const sheet = (wb.SheetNames[0] ?? "").trim().toLowerCase();
  // Exact → prefix → contains (same 3-step logic as UnifiedPlanPage)
  if (sheet === GAD_FINGERPRINT) return true;
  if (sheet.startsWith(GAD_FINGERPRINT)) return true;
  if (sheet.includes(GAD_FINGERPRINT)) return true;
  return false;
}

/** Best-effort guess at which plan this file belongs to, for the error message */
function guessWrongTemplateName(wb: XLSX.WorkBook): string | null {
  const sheet = (wb.SheetNames[0] ?? "").trim().toLowerCase();
  const MAP: [string, string][] = [
    ["sc_ppa",   "List of PPAs for Senior Citizens"],
    ["sc_fund",  "SC Budget Plan"],
    ["sc",       "SC Budget Plan"],
    ["lcpc",     "LCPC Budget Plan"],
    ["lydp",     "LYDP Budget Plan"],
    ["mpoc",     "Municipal Peace and Order & Public Safety Plan"],
    ["drugs",    "List of PPAs to Combat Illegal Drugs"],
    ["arts",     "Local Annual Cultural & Arts Development Plan"],
    ["aids",     "List of PPAs to Combat AIDS"],
    ["nutrition","Nutrition Action Plan"],
  ];
  for (const [fp, label] of MAP) {
    if (sheet === fp || sheet.startsWith(fp) || sheet.includes(fp)) return label;
  }
  return null;
}

// ─── Wrong-template dialog ────────────────────────────────────────────────────

function WrongTemplateDialog({
  open, onClose, detectedName,
}: {
  open: boolean; onClose: () => void; detectedName: string | null;
}) {
  return (
    <AlertDialog open={open} onOpenChange={o => !o && onClose()}>
      <AlertDialogContent className="rounded-2xl max-w-md border-gray-200">
        <AlertDialogHeader>
          <div className="flex items-center gap-2 mb-1">
            <XCircleIcon className="w-5 h-5 text-red-500 flex-shrink-0" />
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">Wrong Template</AlertDialogTitle>
          </div>
          <AlertDialogDescription asChild>
            <div className="space-y-3 text-sm text-gray-500">
              <p>
                You uploaded a file that doesn't match the{" "}
                <span className="font-semibold text-gray-700">GAD Budget Plan</span> template.
              </p>
              {detectedName ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs">
                  <p className="font-semibold text-amber-700 mb-0.5">Detected template:</p>
                  <p className="text-amber-800">{detectedName}</p>
                  <p className="text-amber-600 mt-1">Please navigate to the correct page to import this file.</p>
                </div>
              ) : (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-xs text-gray-500">
                  Unknown template format. Please download the correct GAD template using the{" "}
                  <strong>Download Template</strong> button.
                </div>
              )}
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogAction asChild>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={onClose}>OK</Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type FocusType = "client" | "organization";

interface Department {
  dept_id: number;
  dept_name: string;
  dept_abbreviation: string | null;
}

interface GadEntry {
  gad_entry_id: number;
  budget_plan_id: number;
  focus_type: FocusType;
  gender_issue: string | null;
  gad_objective: string | null;
  relevant_program: string | null;
  gad_activity: string | null;
  performance_indicator: string | null;
  mooe: number;
  department_id: number | null;
  lead_office_text: string | null;
  lead_office_display: string | null;
  group_key: string | null;
  sort_order: number;
  department: Department | null;
}

interface GadResponse {
  data: GadEntry[];
  subtotal_a: number;
  subtotal_b: number;
  grand_total: number;
}

interface EntryForm {
  focus_type: FocusType;
  gender_issue: string;
  gad_objective: string;
  relevant_program: string;
  gad_activity: string;
  performance_indicator: string;
  mooe: string;
  department_id: number | null;
  lead_office_text: string;
}

interface ParsedRow {
  _id: string;
  focus_type: FocusType;
  gender_issue?: string;
  gad_objective?: string;
  relevant_program?: string;
  gad_activity?: string;
  performance_indicator?: string;
  mooe: number;
  department_id: number | null;
  lead_office_text: string | null;
  lead_office_display: string;
  isDuplicate: boolean;
  excluded: boolean;
}

const EMPTY_FORM: EntryForm = {
  focus_type: "client",
  gender_issue: "", gad_objective: "", relevant_program: "",
  gad_activity: "", performance_indicator: "",
  mooe: "", department_id: null, lead_office_text: "",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v: number) =>
  new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));

const parseAmt = (s: string) => {
  const n = parseFloat(String(s).replace(/[^\d.]/g, "").trim());
  return isNaN(n) ? 0 : n;
};

const formatWhileTyping = (raw: string): string => {
  let c = raw.replace(/[^\d.]/g, "");
  const di = c.indexOf(".");
  if (di !== -1) c = c.slice(0, di + 1) + c.slice(di + 1).replace(/\./g, "");
  if (!c || c === ".") return c;
  const [ip, dp] = c.split(".");
  const fi = ip ? parseInt(ip, 10).toLocaleString("en-PH") : "0";
  return dp !== undefined ? `${fi}.${dp}` : fi;
};

const dupKey = (r: { focus_type: string; gad_activity?: string | null }) =>
  `${r.focus_type}||${(r.gad_activity ?? "").trim().toLowerCase()}`;

// ─── Excel parser — now returns workbook for fingerprint check ────────────────

function parseExcel(
  file: File,
  departments: Department[],
  existingEntries: GadEntry[],
): Promise<{ rows: ParsedRow[]; wb: XLSX.WorkBook }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb = XLSX.read(e.target?.result, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const allRows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
        if (allRows.length < 2) { resolve({ rows: [], wb }); return; }

        const existingKeys = new Set(existingEntries.map(dupKey));
        const parsed: ParsedRow[] = [];

        for (let i = 1; i < allRows.length; i++) {
          const row = allRows[i];
          if (!row.some((c: any) => String(c ?? "").trim() !== "")) continue;

          const focusRaw  = String(row[0] ?? "").trim().toUpperCase();
          const focusType: FocusType = focusRaw.includes("ORGANIZATION") ? "organization" : "client";
          const officeRaw = String(row[7] ?? "").trim();

          const dept = departments.find(d =>
            d.dept_abbreviation?.toLowerCase() === officeRaw.toLowerCase() ||
            d.dept_name?.toLowerCase() === officeRaw.toLowerCase() ||
            String(d.dept_id) === officeRaw,
          );

          const gadActivity = String(row[4] ?? "").trim() || undefined;

          const newRow: ParsedRow = {
            _id:                   `row-${i}-${Date.now()}`,
            focus_type:            focusType,
            gender_issue:          String(row[1] ?? "").trim() || undefined,
            gad_objective:         String(row[2] ?? "").trim() || undefined,
            relevant_program:      String(row[3] ?? "").trim() || undefined,
            gad_activity:          gadActivity,
            performance_indicator: String(row[5] ?? "").trim() || undefined,
            mooe:                  parseAmt(String(row[6] ?? "")),
            department_id:         dept?.dept_id ?? null,
            lead_office_text:      dept ? null : (officeRaw || null),
            lead_office_display:   dept ? (dept.dept_abbreviation ?? dept.dept_name) : (officeRaw || "—"),
            isDuplicate:           existingKeys.has(dupKey({ focus_type: focusType, gad_activity: gadActivity })),
            excluded:              false,
          };

          if (!newRow.isDuplicate) {
            if (new Set(parsed.map(dupKey)).has(dupKey(newRow))) newRow.isDuplicate = true;
          }

          parsed.push(newRow);
        }

        resolve({ rows: parsed.map(r => ({ ...r, excluded: r.isDuplicate })), wb });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, color, icon: Icon }: {
  label: string; value: number; color: string; icon: React.ElementType;
}) {
  return (
    <div className={cn("rounded-xl border px-5 py-4 flex items-center gap-4", color)}>
      <div className="flex-shrink-0 w-9 h-9 rounded-lg flex items-center justify-center bg-white/60">
        <Icon className="w-4.5 h-4.5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-widest opacity-70 mb-0.5">{label}</p>
        <p className="text-xl font-bold font-mono tabular-nums leading-tight">₱ {fmt(value)}</p>
      </div>
    </div>
  );
}

// ─── DeptSelect ───────────────────────────────────────────────────────────────

function DeptSelect({ departments, value, onChange }: {
  departments: Department[]; value: number | null; onChange: (id: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = departments.find(d => d.dept_id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox"
          className={cn("w-full justify-between h-9 text-sm font-normal border-gray-200", !selected && "text-gray-400")}>
          <span className="truncate">{selected ? `${selected.dept_abbreviation ?? ""} — ${selected.dept_name}` : "Search department…"}</span>
          <ChevronUpDownIcon className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search by name, abbreviation, or ID…" className="h-9 text-sm" />
          <CommandList>
            <CommandEmpty className="py-6 text-center text-xs text-gray-400">No department found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onChange(null); setOpen(false); }} className="text-xs text-gray-400 italic">None / free-text</CommandItem>
              {departments.map(d => (
                <CommandItem key={d.dept_id} value={`${d.dept_id} ${d.dept_name} ${d.dept_abbreviation ?? ""}`}
                  onSelect={() => { onChange(d.dept_id); setOpen(false); }} className="text-sm">
                  <HeroCheckIcon className={cn("mr-2 h-3.5 w-3.5 text-gray-500 flex-shrink-0", value === d.dept_id ? "opacity-100" : "opacity-0")} />
                  <span className="font-medium text-gray-800 mr-1.5">{d.dept_abbreviation}</span>
                  <span className="text-gray-500 truncate">{d.dept_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

// ─── EditableCell ─────────────────────────────────────────────────────────────

function EditableCell({ value, onSave, multiline = false }: {
  value: string; onSave: (v: string) => void; multiline?: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value);
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  if (editing) {
    const shared = {
      value: draft,
      onChange: (e: React.ChangeEvent<any>) => setDraft(e.target.value),
      onBlur: commit,
      onKeyDown: (e: React.KeyboardEvent) => {
        if (e.key === "Escape") { setEditing(false); setDraft(value); }
        if (!multiline && e.key === "Enter") commit();
      },
      className: "w-full text-[12px] border rounded-md px-2 py-1.5 bg-white border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200",
      ref,
    };
    return multiline
      ? <textarea rows={3} {...shared as any} style={{ resize: "vertical", minHeight: 60 }} />
      : <input type="text" {...shared as any} />;
  }
  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      className="min-h-[28px] rounded px-1.5 py-0.5 cursor-text hover:bg-blue-50/60 transition-colors text-[12px] leading-snug break-words">
      {value || <span className="text-gray-300">—</span>}
    </div>
  );
}

// ─── MooeCell ─────────────────────────────────────────────────────────────────

function MooeCell({ value, onSave }: { value: number; onSave: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft]     = useState(value === 0 ? "" : fmt(value));
  useEffect(() => { if (!editing) setDraft(value === 0 ? "" : fmt(value)); }, [value, editing]);
  return editing ? (
    <input type="text" inputMode="decimal" autoFocus value={draft}
      onChange={e => setDraft(formatWhileTyping(e.target.value))}
      onBlur={() => { setEditing(false); onSave(parseAmt(draft)); }}
      onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onSave(parseAmt(draft)); } }}
      className="w-full text-right text-[12px] font-mono h-8 px-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
  ) : (
    <div onClick={() => setEditing(true)} title="Click to edit"
      className={cn("text-right text-[12px] font-mono tabular-nums px-1.5 py-0.5 rounded cursor-text hover:bg-blue-50/60 transition-colors min-h-[28px] flex items-center justify-end",
        value === 0 ? "text-gray-300" : "text-gray-800")}>
      {value === 0 ? "—" : fmt(value)}
    </div>
  );
}

// ─── LeadOfficeCell ───────────────────────────────────────────────────────────

function LeadOfficeCell({ entry, departments, onUpdate }: {
  entry: GadEntry; departments: Department[];
  onUpdate: (id: number, field: keyof GadEntry, value: any) => void;
}) {
  const [open, setOpen]         = useState(false);
  const [freeText, setFreeText] = useState(entry.lead_office_text ?? "");
  const selected = departments.find(d => d.dept_id === entry.department_id);
  const display  = selected ? (selected.dept_abbreviation ?? selected.dept_name) : (entry.lead_office_text || null);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <div title="Click to set responsible office"
          className={cn("min-h-[28px] px-1.5 py-0.5 rounded cursor-pointer hover:bg-blue-50/60 transition-colors text-[12px] leading-snug", !display && "text-gray-300 italic")}>
          {display
            ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">{display}</span>
            : <span className="text-gray-300">— set office —</span>}
        </div>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-3" align="start">
        <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Lead / Responsible Office</p>
        <Command>
          <CommandInput placeholder="Search department…" className="h-8 text-sm" />
          <CommandList className="max-h-48">
            <CommandEmpty className="py-4 text-center text-xs text-gray-400">No department found.</CommandEmpty>
            <CommandGroup>
              <CommandItem value="none" onSelect={() => { onUpdate(entry.gad_entry_id, "department_id", null); setOpen(false); }} className="text-xs text-gray-400 italic">None (use free-text below)</CommandItem>
              {departments.map(d => (
                <CommandItem key={d.dept_id} value={`${d.dept_id} ${d.dept_name} ${d.dept_abbreviation ?? ""}`}
                  onSelect={() => { onUpdate(entry.gad_entry_id, "department_id", d.dept_id); setOpen(false); }} className="text-sm">
                  <HeroCheckIcon className={cn("mr-2 h-3.5 w-3.5 flex-shrink-0", entry.department_id === d.dept_id ? "opacity-100 text-blue-500" : "opacity-0")} />
                  <span className="font-medium text-gray-800 mr-1.5 text-[11px]">{d.dept_abbreviation}</span>
                  <span className="text-gray-500 truncate text-[11px]">{d.dept_name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="mt-2 border-t border-gray-100 pt-2">
          <p className="text-[10px] text-gray-400 mb-1">Or type free-text:</p>
          <div className="flex gap-1.5">
            <Input value={freeText} onChange={e => setFreeText(e.target.value)} placeholder="e.g. MCR" className="h-8 text-xs flex-1" />
            <Button size="sm" className="h-8 text-xs px-3 bg-gray-900 hover:bg-gray-800"
              onClick={() => { onUpdate(entry.gad_entry_id, "lead_office_text", freeText); onUpdate(entry.gad_entry_id, "department_id", null); setOpen(false); }}>
              Set
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  // Mirrors FocusSection's column widths: #, gender_issue, objective, program, activity, indicator, mooe, office
  const cols = [
    { w: "w-8",  lines: 1 },
    { w: "w-48", lines: 2 },
    { w: "w-40", lines: 1 },
    { w: "w-44", lines: 1 },
    { w: "w-48", lines: 2 },
    { w: "w-48", lines: 1 },
    { w: "w-32", lines: 1, right: true },
    { w: "w-32", lines: 1, badge: true },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-8">
      {/* Header row */}
      <div className="border-b border-gray-200 bg-gray-50/60 flex">
        {cols.map((col, i) => (
          <div key={i} className={cn("px-3 py-3 flex-shrink-0 flex", col.w, col.right && "justify-end")}>
            <Skeleton className="h-3 rounded" style={{ width: i === 0 ? 14 : col.right ? "60%" : "75%" }} />
          </div>
        ))}
        <div className="w-10 px-3 py-3" />
      </div>
      {/* 5 data rows */}
      {Array.from({ length: 5 }).map((_, ri) => (
        <div key={ri}
          className={cn("flex items-start border-b border-gray-100", ri % 2 === 1 && "bg-gray-50/30")}
          style={{ animationDelay: `${ri * 60}ms` }}>
          {cols.map((col, ci) => (
            <div key={ci} className={cn("px-3 py-3 flex-shrink-0 space-y-1.5", col.w, col.right && "flex justify-end items-start")}>
              {col.badge ? (
                <Skeleton className="h-5 w-14 rounded-full" />
              ) : col.right ? (
                <Skeleton className={cn("h-3 rounded", ri % 2 === 0 ? "w-16" : "w-20")} />
              ) : (
                <>
                  <Skeleton className={cn("h-3 rounded", ci === 0 ? "w-4 mx-auto" : ri % 3 === 0 ? "w-4/5" : ri % 3 === 1 ? "w-full" : "w-3/4")} />
                  {col.lines > 1 && ri % 2 === 0 && <Skeleton className="h-3 w-3/5 rounded" />}
                </>
              )}
            </div>
          ))}
          <div className="w-10 px-3 py-3 flex-shrink-0" />
        </div>
      ))}
      {/* Footer */}
      <div className="flex items-center border-t-2 border-gray-200 bg-gray-900/5">
        <div className="flex-1 px-3 py-2.5 flex justify-end">
          <Skeleton className="h-3 w-16 rounded bg-gray-200" />
        </div>
        <div className="w-32 px-3 py-2.5 flex justify-end">
          <Skeleton className="h-3 w-20 rounded bg-gray-200" />
        </div>
        <div className="w-32 px-3 py-2.5" />
        <div className="w-10 px-3 py-2.5" />
      </div>
    </div>
  );
}

// ─── FocusSection ─────────────────────────────────────────────────────────────

function FocusSection({ focusType, entries, departments, subtotal, onUpdate, onDelete, onAdd }: {
  focusType: FocusType; entries: GadEntry[]; departments: Department[]; subtotal: number;
  onUpdate: (id: number, field: keyof GadEntry, value: any) => void;
  onDelete: (entry: GadEntry) => void;
  onAdd: (ft: FocusType) => void;
}) {
  const meta = focusType === "client"
    ? { label: "CLIENT-FOCUSED",       subLabel: "Subtotal A", badge: "bg-violet-100 text-violet-700 border border-violet-200" }
    : { label: "ORGANIZATION-FOCUSED", subLabel: "Subtotal B", badge: "bg-teal-100 text-teal-700 border border-teal-200" };

  const th = "border-b border-r border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wide align-bottom";

  return (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <span className={cn("text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full", meta.badge)}>{meta.label}</span>
          <span className="text-[11px] text-gray-400">Gender Issue</span>
        </div>
        <Button size="sm" variant="outline" onClick={() => onAdd(focusType)} className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
          <PlusIcon className="w-3.5 h-3.5" />Add Row
        </Button>
      </div>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse" style={{ minWidth: 1100 }}>
            <thead>
              <tr>
                <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-center w-8 align-middle text-[11px] font-medium text-gray-400">#</th>
                <th className={cn(th, "w-48")}>Title / Description of Gender Issue or GAD Mandate</th>
                <th className={cn(th, "w-40")}>GAD Objective</th>
                <th className={cn(th, "w-44")}>Relevant LGU Program or Project</th>
                <th className={cn(th, "w-48")}>GAD Activity</th>
                <th className={cn(th, "w-48")}>Performance Indicator and Target</th>
                <th className={cn(th, "w-32 text-right")}>MOOE</th>
                <th className={cn(th, "w-32")}>Lead / Responsible Office</th>
                <th className="border-b border-gray-200 bg-white w-10" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.length === 0 ? (
                <tr><td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                  No entries yet.{" "}
                  <button onClick={() => onAdd(focusType)} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Add the first entry</button>
                </td></tr>
              ) : entries.map((entry, idx) => (
                <tr key={entry.gad_entry_id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="border-r border-gray-100 px-3 py-2 text-gray-400 text-center align-top text-[11px]">{idx + 1}</td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={entry.gender_issue ?? ""} onSave={v => onUpdate(entry.gad_entry_id, "gender_issue", v)} multiline /></td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={entry.gad_objective ?? ""} onSave={v => onUpdate(entry.gad_entry_id, "gad_objective", v)} multiline /></td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={entry.relevant_program ?? ""} onSave={v => onUpdate(entry.gad_entry_id, "relevant_program", v)} multiline /></td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={entry.gad_activity ?? ""} onSave={v => onUpdate(entry.gad_entry_id, "gad_activity", v)} multiline /></td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={entry.performance_indicator ?? ""} onSave={v => onUpdate(entry.gad_entry_id, "performance_indicator", v)} multiline /></td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><MooeCell value={entry.mooe} onSave={v => onUpdate(entry.gad_entry_id, "mooe", v)} /></td>
                  <td className="border-r border-gray-100 px-2 py-1.5 align-top"><LeadOfficeCell entry={entry} departments={departments} onUpdate={onUpdate} /></td>
                  <td className="px-1.5 py-1.5 align-top">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreHorizontalIcon className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 text-xs" onClick={() => onDelete(entry)}>Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
            {entries.length > 0 && (
              <tfoot>
                <tr className="bg-gray-900 text-white">
                  <td colSpan={5} className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500">{meta.subLabel}</td>
                  <td className="px-3 py-2.5" />
                  <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{fmt(subtotal)}</td>
                  <td colSpan={2} className="border-l border-gray-700" />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

// ─── Import Preview Dialog ────────────────────────────────────────────────────

function ImportPreviewDialog({ open, onOpenChange, rows, onRowsChange, onConfirm, importing }: {
  open: boolean; onOpenChange: (v: boolean) => void;
  rows: ParsedRow[]; onRowsChange: (rows: ParsedRow[]) => void;
  onConfirm: () => void; importing: boolean;
}) {
  const dupCount   = rows.filter(r => r.isDuplicate).length;
  const willImport = rows.filter(r => !r.excluded).length;
  const removeRow  = (id: string) => onRowsChange(rows.filter(r => r._id !== id));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            Import Preview
            <Badge variant="outline" className="text-[10px] font-semibold ml-1">{rows.length} row{rows.length !== 1 ? "s" : ""} found</Badge>
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">Duplicates are highlighted red and will not be imported.</p>
        </DialogHeader>
        {dupCount > 0 && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-red-50 border-b border-red-100 flex-shrink-0">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">
              <span className="font-semibold">{dupCount} duplicate{dupCount !== 1 ? "s" : ""} detected</span>{" "}— will be skipped.
            </p>
          </div>
        )}
        <div className="overflow-auto flex-1">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                {["#","Focus","Gender Issue / GAD Mandate","GAD Activity","MOOE","Lead Office","Status","Remove"].map((h, i) => (
                  <th key={i} className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={row._id} className={cn("transition-colors", row.isDuplicate ? "bg-red-50 opacity-60" : "hover:bg-gray-50/60")}>
                  <td className="border-r border-gray-100 px-3 py-2.5 text-gray-400 text-center align-top w-8">{idx + 1}</td>
                  <td className="border-r border-gray-100 px-3 py-2.5 align-top w-24">
                    <span className={cn("inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase",
                      row.focus_type === "client" ? "bg-violet-100 text-violet-700" : "bg-teal-100 text-teal-700")}>
                      {row.focus_type === "client" ? "Client" : "Org"}
                    </span>
                  </td>
                  <td className={cn("border-r border-gray-100 px-3 py-2.5 align-top leading-snug max-w-[200px]", row.isDuplicate && "text-red-800")}>
                    {row.gender_issue || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className={cn("border-r border-gray-100 px-3 py-2.5 align-top leading-snug max-w-[240px]", row.isDuplicate && "text-red-800 font-medium")}>
                    {row.gad_activity || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums align-top w-28", row.isDuplicate ? "text-red-700" : "text-gray-700")}>
                    {row.mooe === 0 ? <span className="text-gray-300">—</span> : fmt(row.mooe)}
                  </td>
                  <td className="border-r border-gray-100 px-3 py-2.5 align-top w-28">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] border border-slate-200">{row.lead_office_display}</span>
                  </td>
                  <td className="border-r border-gray-100 px-3 py-2.5 text-center align-middle w-28">
                    {row.isDuplicate
                      ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-100 border border-red-200 px-2 py-1 rounded-full"><ExclamationTriangleIcon className="w-3 h-3" /> Duplicate</span>
                      : <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">New</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center align-middle w-14">
                    <button onClick={() => removeRow(row._id)} title="Remove"
                      className="w-6 h-6 rounded flex items-center justify-center mx-auto text-gray-300 hover:text-red-500 hover:bg-red-50 transition-colors">
                      <TrashIcon className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-gray-100 flex-shrink-0 bg-white">
          <div className="flex items-center gap-4 flex-1 text-[11px] text-gray-500">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-green-50 border border-green-200 inline-block" />{willImport} will be imported</span>
            {dupCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200 inline-block" />{dupCount} skipped</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => onOpenChange(false)} disabled={importing}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800" onClick={onConfirm} disabled={importing || willImport === 0}>
              {importing
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Importing…</>
                : <><ArrowUpTrayIcon className="w-3.5 h-3.5" /> Import {willImport} row{willImport !== 1 ? "s" : ""}</>}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Entry Dialog ─────────────────────────────────────────────────────────────

function EntryDialog({ open, onOpenChange, initialForm, departments, onSubmit, submitting }: {
  open: boolean; onOpenChange: (v: boolean) => void; initialForm: EntryForm;
  departments: Department[]; onSubmit: (form: EntryForm) => void; submitting: boolean;
}) {
  const [form, setForm] = useState<EntryForm>(initialForm);
  useEffect(() => { setForm(initialForm); }, [initialForm, open]);
  const set = (field: keyof EntryForm, value: any) => setForm(p => ({ ...p, [field]: value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">Add GAD Entry</DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">Gender and Development Budget Plan</p>
        </DialogHeader>
        <div className="px-6 py-5 space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">Focus Type <span className="text-red-400">*</span></Label>
            <div className="flex gap-2">
              {(["client", "organization"] as FocusType[]).map(ft => (
                <button key={ft} type="button" onClick={() => set("focus_type", ft)}
                  className={cn("flex-1 py-2 px-3 rounded-lg border text-xs font-semibold transition-all",
                    form.focus_type === ft
                      ? ft === "client" ? "bg-violet-600 text-white border-violet-600" : "bg-teal-600 text-white border-teal-600"
                      : "border-gray-200 text-gray-500 hover:border-gray-300")}>
                  {ft === "client" ? "CLIENT-FOCUSED" : "ORGANIZATION-FOCUSED"}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Title / Description of Gender Issue or GAD Mandate</Label>
              <Textarea value={form.gender_issue} onChange={e => set("gender_issue", e.target.value)} rows={3} className="text-sm resize-none" placeholder="Describe the gender issue…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">GAD Objective</Label>
              <Textarea value={form.gad_objective} onChange={e => set("gad_objective", e.target.value)} rows={3} className="text-sm resize-none" placeholder="Objective…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Relevant LGU Program or Project</Label>
              <Input value={form.relevant_program} onChange={e => set("relevant_program", e.target.value)} className="h-9 text-sm" placeholder="Program / project name…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">GAD Activity</Label>
              <Textarea value={form.gad_activity} onChange={e => set("gad_activity", e.target.value)} rows={2} className="text-sm resize-none" placeholder="Activity description…" />
            </div>
            <div className="space-y-1.5 col-span-2">
              <Label className="text-xs font-semibold text-gray-600">Performance Indicator and Target</Label>
              <Textarea value={form.performance_indicator} onChange={e => set("performance_indicator", e.target.value)} rows={2} className="text-sm resize-none" placeholder="Indicator and target…" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">MOOE (₱)</Label>
              <Input value={form.mooe} onChange={e => set("mooe", formatWhileTyping(e.target.value))} className="h-9 text-sm text-right font-mono" placeholder="0" inputMode="decimal" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Lead / Responsible Office</Label>
              <DeptSelect departments={departments} value={form.department_id} onChange={id => set("department_id", id)} />
              {form.department_id === null && (
                <Input value={form.lead_office_text} onChange={e => set("lead_office_text", e.target.value)} className="h-8 text-xs mt-1" placeholder="Or type office name (e.g. MCR)" />
              )}
            </div>
          </div>
        </div>
        <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2 sticky bottom-0 bg-white">
          <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800" onClick={() => onSubmit(form)} disabled={submitting}>
            {submitting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : "Add Entry"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function GadPage() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

  const [entries,     setEntries]     = useState<GadEntry[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [subtotalA,   setSubtotalA]   = useState(0);
  const [subtotalB,   setSubtotalB]   = useState(0);
  const [grandTotal,  setGrandTotal]  = useState(0);

  const [dialogOpen,    setDialogOpen]    = useState(false);
  const [dialogForm,    setDialogForm]    = useState<EntryForm>(EMPTY_FORM);
  const [submitting,    setSubmitting]    = useState(false);
  const [deleteTarget,  setDeleteTarget]  = useState<GadEntry | null>(null);
  const [previewOpen,   setPreviewOpen]   = useState(false);
  const [previewRows,   setPreviewRows]   = useState<ParsedRow[]>([]);
  const [importing,     setImporting]     = useState(false);
  const [wrongTemplate, setWrongTemplate] = useState<{ detectedName: string | null } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!activePlan) return;
    API.get("/departments").then(r => setDepartments(r.data.data ?? r.data)).catch(console.error);
  }, [activePlan?.budget_plan_id]);

  const fetchData = useCallback(async (planId: number) => {
    setLoading(true);
    try {
      const r: { data: GadResponse } = await API.get(`/gad-entries?budget_plan_id=${planId}`);
      setEntries(r.data.data);
      setSubtotalA(r.data.subtotal_a);
      setSubtotalB(r.data.subtotal_b);
      setGrandTotal(r.data.grand_total);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (activePlan?.budget_plan_id) fetchData(activePlan.budget_plan_id);
  }, [activePlan, fetchData]);

  const handleUpdate = useCallback(async (id: number, field: keyof GadEntry, value: any) => {
    setEntries(prev => {
      const updated = prev.map(e => e.gad_entry_id === id ? { ...e, [field]: value } : e);
      const a = updated.filter(e => e.focus_type === "client").reduce((s, e) => s + e.mooe, 0);
      const b = updated.filter(e => e.focus_type === "organization").reduce((s, e) => s + e.mooe, 0);
      setSubtotalA(a); setSubtotalB(b); setGrandTotal(a + b);
      return updated;
    });
    try {
      await API.put(`/gad-entries/${id}`, { [field]: value });
    } catch (err: any) {
      toast.error(`Save failed: ${err?.response?.data?.message ?? err?.message ?? "Unknown error"}`);
      if (activePlan?.budget_plan_id) fetchData(activePlan.budget_plan_id);
    }
  }, [activePlan, fetchData]);

  const openAdd = (focusType: FocusType) => {
    setDialogForm({ ...EMPTY_FORM, focus_type: focusType });
    setDialogOpen(true);
  };

  const handleAddSubmit = async (form: EntryForm) => {
    if (!activePlan?.budget_plan_id) return;
    setSubmitting(true);
    try {
      await API.post("/gad-entries", {
        budget_plan_id:        activePlan.budget_plan_id,
        focus_type:            form.focus_type,
        gender_issue:          form.gender_issue || null,
        gad_objective:         form.gad_objective || null,
        relevant_program:      form.relevant_program || null,
        gad_activity:          form.gad_activity || null,
        performance_indicator: form.performance_indicator || null,
        mooe:                  parseAmt(form.mooe),
        department_id:         form.department_id,
        lead_office_text:      form.department_id ? null : (form.lead_office_text || null),
      });
      toast.success("Entry added");
      setDialogOpen(false);
      await fetchData(activePlan.budget_plan_id);
    } catch (err: any) {
      toast.error(`Failed: ${err?.response?.data?.message ?? err?.message}`);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/gad-entries/${deleteTarget.gad_entry_id}`);
      toast.success("Entry deleted");
      setDeleteTarget(null);
      if (activePlan?.budget_plan_id) await fetchData(activePlan.budget_plan_id);
    } catch (e) { console.error(e); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePlan?.budget_plan_id) return;
    e.target.value = "";
    try {
      const { rows, wb } = await parseExcel(file, departments, entries);

      // ── Fingerprint check — block non-GAD templates ───────────────────────
      if (!detectIsGadTemplate(wb)) {
        setWrongTemplate({ detectedName: guessWrongTemplateName(wb) });
        return;
      }

      if (rows.length === 0) { toast.warning("No valid rows found in the Excel file."); return; }
      setPreviewRows(rows);
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(`Could not read file: ${err?.message ?? "Unknown error"}`);
    }
  };

  const handleConfirmImport = async () => {
    if (!activePlan?.budget_plan_id) return;
    const toImport = previewRows.filter(r => !r.excluded);
    if (toImport.length === 0) { toast.warning("No rows selected for import."); return; }
    setImporting(true);
    try {
      await API.post("/gad-entries/bulk", {
        budget_plan_id: activePlan.budget_plan_id,
        entries: toImport.map(({ _id, isDuplicate, excluded, lead_office_display, ...rest }) => rest),
      });
      toast.success(`Imported ${toImport.length} entr${toImport.length !== 1 ? "ies" : "y"} successfully`);
      setPreviewOpen(false);
      setPreviewRows([]);
      await fetchData(activePlan.budget_plan_id);
    } catch (err: any) {
      toast.error(`Import failed: ${err?.response?.data?.message ?? err?.message ?? "Unknown error"}`);
    } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href = "/GAD_Budget_Plan_Template.xlsx";
    link.download = "GAD_Budget_Plan_Template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (planLoading) return <LoadingState />;
  if (!activePlan) return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center space-y-2">
        <p className="text-gray-500 text-sm">No active budget plan found.</p>
        <p className="text-gray-400 text-xs">Activate a budget plan to manage GAD entries.</p>
      </div>
    </div>
  );

  const budgetYear    = activePlan.year ?? new Date().getFullYear();
  const clientEntries = entries.filter(e => e.focus_type === "client");
  const orgEntries    = entries.filter(e => e.focus_type === "organization");

  return (
    <div className="p-6">

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Gender and Development</span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] font-medium text-gray-400">Budget Year: {budgetYear}</span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] font-medium text-gray-400">Local Government Unit of Opol</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">GAD Budget Plan</h1>
        </div>
        <div className="flex items-center gap-2.5">
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileChange} />
          <Button size="sm" variant="outline" onClick={downloadTemplate}
            className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
            <ArrowDownTrayIcon className="w-3.5 h-3.5" /> Download Template
          </Button>
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()}
            className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
            <ArrowUpTrayIcon className="w-3.5 h-3.5" /> Import Excel
          </Button>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-3 mb-7">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white px-5 py-4 flex items-center gap-4">
              <Skeleton className="w-9 h-9 rounded-lg flex-shrink-0" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-2.5 w-28 rounded" />
                <Skeleton className="h-5 w-32 rounded" />
              </div>
            </div>
          ))
        ) : (
          <>
            <StatCard label="Subtotal A — Client-Focused"       value={subtotalA}  icon={UserGroupIcon}       color="border-violet-200 bg-violet-50 text-violet-900" />
            <StatCard label="Subtotal B — Organization-Focused" value={subtotalB}  icon={BuildingOffice2Icon} color="border-teal-200 bg-teal-50 text-teal-900" />
            <StatCard label="Grand Total (A + B)"               value={grandTotal} icon={BuildingOffice2Icon} color="border-gray-200 bg-gray-900 text-white" />
          </>
        )}
      </div>

      {/* Tables */}
      {loading ? (
        <>
          {/* CLIENT-FOCUSED skeleton */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-32 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <TableSkeleton />

          {/* ORGANIZATION-FOCUSED skeleton */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="h-6 w-44 rounded-full" />
              <Skeleton className="h-4 w-24 rounded" />
            </div>
            <Skeleton className="h-8 w-24 rounded-lg" />
          </div>
          <TableSkeleton />
        </>
      ) : (
        <>
          <FocusSection focusType="client"       entries={clientEntries} departments={departments} subtotal={subtotalA} onUpdate={handleUpdate} onDelete={setDeleteTarget} onAdd={openAdd} />
          <FocusSection focusType="organization" entries={orgEntries}    departments={departments} subtotal={subtotalB} onUpdate={handleUpdate} onDelete={setDeleteTarget} onAdd={openAdd} />
        </>
      )}

      {/* Legend */}
      <div className="mt-2 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-violet-100 border border-violet-200 inline-block" /><span className="text-violet-600 font-semibold">Violet</span> = Client-Focused</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-teal-100 border border-teal-200 inline-block" /><span className="text-teal-600 font-semibold">Teal</span> = Organization-Focused</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200 inline-block" /><span className="text-red-600 font-semibold">Red</span> = Duplicate (import preview)</span>
        <span className="ml-auto">Click any cell to edit · Changes auto-save</span>
      </div>

      {/* Dialogs */}
      <WrongTemplateDialog
        open={!!wrongTemplate}
        onClose={() => setWrongTemplate(null)}
        detectedName={wrongTemplate?.detectedName ?? null}
      />
      <ImportPreviewDialog
        open={previewOpen} onOpenChange={setPreviewOpen}
        rows={previewRows} onRowsChange={setPreviewRows}
        onConfirm={handleConfirmImport} importing={importing}
      />
      <EntryDialog
        open={dialogOpen} onOpenChange={setDialogOpen} initialForm={dialogForm}
        departments={departments} onSubmit={handleAddSubmit} submitting={submitting}
      />
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Delete entry?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">This GAD entry will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>Delete</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}