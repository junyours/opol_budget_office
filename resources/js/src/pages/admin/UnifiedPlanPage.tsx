import { useEffect, useState, useCallback, useRef } from "react";
import { LoadingState } from "@/src/pages/common/LoadingState";
import API from "@/src/services/api";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { Button } from "@/src/components/ui/button";
import { Input } from "@/src/components/ui/input";
import { Label } from "@/src/components/ui/label";
import { Textarea } from "@/src/components/ui/textarea";
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/src/components/ui/select";
import { Badge } from "@/src/components/ui/badge";
import { Skeleton } from "@/src/components/ui/skeleton";
import { toast } from "sonner";
import { cn } from "@/src/lib/utils";
import { MoreHorizontalIcon } from "lucide-react";
import {
  PlusIcon, ArrowUpTrayIcon, ArrowDownTrayIcon,
  ChevronUpDownIcon, CheckIcon as HeroCheckIcon,
  ExclamationTriangleIcon, TrashIcon, XCircleIcon,
} from "@heroicons/react/24/outline";
import * as XLSX from "xlsx";

// ─── Plan type & meta registry ────────────────────────────────────────────────

export type PlanType =
  | "lcpc" | "lydp" | "sc"
  | "mpoc" | "drugs" | "arts" | "aids" | "sc_ppa"
  | "nutrition";

/** Which structural variant each plan type uses */
export type PlanVariant = "fund" | "sector" | "nutrition";

export interface PlanMeta {
  planType:     PlanType;
  variant:      PlanVariant;
  apiSlug:      string;          // e.g. "lcpc-plan"
  title:        string;
  subtitle:     string;
  accentColor:  string;
  templateFile: string;
  templateName: string;
  /**
   * Fingerprint: a unique string present in the first header row of this
   * plan's Excel template that identifies it. Used to reject wrong-template
   * uploads. Keep it short and distinctive.
   */
  templateFingerprint: string;
}

export const PLAN_META: Record<PlanType, PlanMeta> = {
  // ── Fund plans ─────────────────────────────────────────────────────────────
  lcpc: {
    planType:"lcpc", variant:"fund", apiSlug:"lcpc-plan",
    title:"LOCAL COUNCIL FOR THE PROTECTION OF CHILDREN", subtitle:"LCPC",
    accentColor:"bg-sky-100 text-sky-700 border border-sky-200",
    templateFile:"/LCPC_Template.xlsx", templateName:"LCPC_Template.xlsx",
    templateFingerprint:"lcpc",
  },
  lydp: {
    planType:"lydp", variant:"fund", apiSlug:"lydp-plan",
    title:"LOCAL YOUTH DEVELOPMENT PROGRAM", subtitle:"LYDP",
    accentColor:"bg-violet-100 text-violet-700 border border-violet-200",
    templateFile:"/LYDP_Template.xlsx", templateName:"LYDP_Template.xlsx",
    templateFingerprint:"lydp",
  },
  sc: {
    planType:"sc", variant:"fund", apiSlug:"sc-plan",
    title:"SOCIAL WELFARE PROGRAM FOR SENIOR CITIZEN", subtitle:"S.C.",
    accentColor:"bg-amber-100 text-amber-700 border border-amber-200",
    templateFile:"/SC_Template.xlsx", templateName:"SC_Template.xlsx",
    templateFingerprint:"sc_fund",
  },
  // ── Sector plans ───────────────────────────────────────────────────────────
  mpoc: {
    planType:"mpoc", variant:"sector", apiSlug:"mpoc-plan",
    title:"MUNICIPAL PEACE AND ORDER & PUBLIC SAFETY PLAN", subtitle:"MPOPS",
    accentColor:"bg-red-100 text-red-700 border border-red-200",
    templateFile:"/MPOC_Template.xlsx", templateName:"MPOC_Template.xlsx",
    templateFingerprint:"mpoc",
  },
  drugs: {
    planType:"drugs", variant:"sector", apiSlug:"drugs-plan",
    title:"LIST OF PPA's TO COMBAT ILLEGAL DRUGS", subtitle:"PPA's on Illegal Drugs",
    accentColor:"bg-orange-100 text-orange-700 border border-orange-200",
    templateFile:"/Drugs_Template.xlsx", templateName:"Drugs_Template.xlsx",
    templateFingerprint:"drugs",
  },
  arts: {
    planType:"arts", variant:"sector", apiSlug:"arts-plan",
    title:"LOCAL ANNUAL CULTURAL & ARTS DEVELOPEMTN PLAN", subtitle:"Culture & Arts",
    accentColor:"bg-pink-100 text-pink-700 border border-pink-200",
    templateFile:"/Arts_Template.xlsx", templateName:"Arts_Template.xlsx",
    templateFingerprint:"arts",
  },
  aids: {
    planType:"aids", variant:"sector", apiSlug:"aids-plan",
    title:"LIST OF PPA'S TO COMBAT ACQUIRED IMMUNE DIFICIENCY SYNDROME, (AIDS)", subtitle:"PPA's on to Combat AIDS",
    accentColor:"bg-rose-100 text-rose-700 border border-rose-200",
    templateFile:"/AIDS_Template.xlsx", templateName:"AIDS_Template.xlsx",
    templateFingerprint:"aids",
  },
  sc_ppa: {
    planType:"sc_ppa", variant:"sector", apiSlug:"sc-ppa-plan",
    title:"LIST OF PPA's FOR SENIOR CITIZENS", subtitle:"PPA's for Senior Citizens and PWDs",
    accentColor:"bg-yellow-100 text-yellow-700 border border-yellow-200",
    templateFile:"/SC_PPA_Template.xlsx", templateName:"SC_PPA_Template.xlsx",
    templateFingerprint:"sc_ppa",
  },
  // ── Nutrition ──────────────────────────────────────────────────────────────
  nutrition: {
    planType:"nutrition", variant:"nutrition", apiSlug:"nutrition-plan",
    title:"NUTRITION ACTION PLAN", subtitle:"Nutrition",
    accentColor:"bg-green-100 text-green-700 border border-green-200",
    templateFile:"/Nutrition_Template.xlsx", templateName:"Nutrition_Template.xlsx",
    templateFingerprint:"nutrition",
  },
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Department { dept_id:number; dept_name:string; dept_abbreviation:string|null; }
interface AipProgram { aip_program_id:number; aip_reference_code:string|null; program_description:string; }
type FundSource = "general_fund" | "special_account";

interface UpItem {
  up_item_id:number; plan_type:PlanType; budget_plan_id:number;
  aip_program_id:number|null; aip_reference_code:string|null;
  program_description:string|null; dept_id:number|null;
  implementing_office:string|null; sector:string|null; sub_sector:string|null;
  target_output_aip:string|null; target_output_ab:string|null;
  aip_amount:number; ab_amount:number;
  fund_source:FundSource; fund_source_label:string;
  ps_amount:number; mooe_amount:number; co_amount:number; total_amount:number;
  start_date:string|null; completion_date:string|null;
  cc_adaptation:number; cc_mitigation:number; cc_typology_code:string|null;
  nutrition_issue:string|null; nutrition_objective:string|null;
  nutrition_activity:string|null; nutrition_target:string|null;
  lead_office_text:string|null;
  sort_order:number; is_subtotal_row:boolean; row_label:string|null;
  department:Department|null;
}

interface UpResponse {
  data:UpItem[]; plan_type:PlanType;
  total_aip:number; total_ab:number; total_ps:number;
  total_mooe:number; total_co:number; grand_total:number;
  total_cc_adapt:number; total_cc_mitig:number;
}

interface ItemForm {
  aip_reference_code:string; program_description:string;
  dept_id:number|null; implementing_office:string;
  sector:string; sub_sector:string;
  target_output_aip:string; target_output_ab:string;
  fund_source:FundSource;
  start_date:string; completion_date:string;
  aip_amount:string; ab_amount:string;
  ps_amount:string; mooe_amount:string; co_amount:string;
  cc_adaptation:string; cc_mitigation:string; cc_typology_code:string;
  nutrition_issue:string; nutrition_objective:string;
  nutrition_activity:string; nutrition_target:string; lead_office_text:string;
}

interface ParsedRow {
  _id:string;
  aip_reference_code:string|null; program_description:string;
  dept_id:number|null; implementing_office:string|null;
  sector:string|null; target_output_aip:string|null; target_output_ab:string|null;
  fund_source:FundSource;
  start_date:string|null; completion_date:string|null;
  aip_amount:number; ab_amount:number;
  ps_amount:number; mooe_amount:number; co_amount:number;
  cc_adaptation:number; cc_mitigation:number; cc_typology_code:string|null;
  nutrition_issue:string|null; nutrition_objective:string|null;
  nutrition_activity:string|null; nutrition_target:string|null;
  lead_office_text:string|null;
  // UI only
  office_display:string;
  isDuplicate:boolean;
  existingProgramId:number|null;
}

const EMPTY_FORM: ItemForm = {
  aip_reference_code:"", program_description:"", dept_id:null,
  implementing_office:"", sector:"", sub_sector:"",
  target_output_aip:"", target_output_ab:"",
  fund_source:"general_fund",
  start_date:"", completion_date:"",
  aip_amount:"", ab_amount:"",
  ps_amount:"", mooe_amount:"", co_amount:"",
  cc_adaptation:"", cc_mitigation:"", cc_typology_code:"",
  nutrition_issue:"", nutrition_objective:"",
  nutrition_activity:"", nutrition_target:"", lead_office_text:"",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v:number) =>
  new Intl.NumberFormat("en-PH",{minimumFractionDigits:0,maximumFractionDigits:0}).format(Math.round(v));

const parseAmt = (s:string|number|null|undefined):number => {
  const n = parseFloat(String(s??"").replace(/[^\d.]/g,"").trim());
  return isNaN(n) ? 0 : n;
};

const fmtW = (raw:string):string => {
  let c=raw.replace(/[^\d.]/g,"");
  const di=c.indexOf(".");
  if(di!==-1) c=c.slice(0,di+1)+c.slice(di+1).replace(/\./g,"");
  if(!c||c===".") return c;
  const [ip,dp]=c.split(".");
  const fi=ip?parseInt(ip,10).toLocaleString("en-PH"):"0";
  return dp!==undefined?`${fi}.${dp}`:fi;
};

const parseFundSource = (raw:string):FundSource =>
  raw.toLowerCase().replace(/[.\s]/g,"").includes("special") ? "special_account" : "general_fund";

const dupKey = (r:{aip_reference_code?:string|null; program_description?:string|null}):string => {
  const c=(r.aip_reference_code??"").trim().toLowerCase();
  return c||(r.program_description??"").trim().toLowerCase();
};

// ─── Template fingerprint detection ──────────────────────────────────────────
/**
 * Each Excel template has a hidden "fingerprint" cell in row 1, column A
 * (or anywhere in row 1) that identifies which plan type it belongs to.
 *
 * We embed the fingerprint as the sheet name OR in a dedicated first column.
 * Simpler approach: the sheet name IS the fingerprint.
 *
 * For maximum compatibility we check:
 *   1. Sheet name contains the fingerprint
 *   2. Any cell in the first 3 rows contains the fingerprint (case-insensitive)
 */
function detectTemplateType(wb: XLSX.WorkBook): PlanType | null {
  const sheetName = (wb.SheetNames[0] ?? "").trim().toLowerCase();

  // Build fingerprint → planType map
  const fpMap = new Map<string, PlanType>(
    (Object.entries(PLAN_META) as [PlanType, PlanMeta][]).map(
      ([pt, m]) => [m.templateFingerprint.toLowerCase(), pt]
    )
  );

  // 1. Exact sheet name match (most reliable — each template sheet name IS its fingerprint)
  if (fpMap.has(sheetName)) return fpMap.get(sheetName)!;

  // 2. Sheet name starts with a fingerprint (user added suffix like "drugs - 2026")
  //    Sort longest first so "sc_ppa" matches before "sc"
  const sorted = [...fpMap.entries()].sort((a, b) => b[0].length - a[0].length);
  for (const [fp, pt] of sorted) {
    if (sheetName.startsWith(fp)) return pt;
  }

  // 3. Sheet name contains fingerprint (longest match first to avoid "sc" matching "sc_ppa")
  for (const [fp, pt] of sorted) {
    if (sheetName.includes(fp)) return pt;
  }

  return null;
}

// ─── Excel parsers ────────────────────────────────────────────────────────────

function parseSectorRows(
  rows: any[][], departments: Department[],
  aipPrograms: AipProgram[], existingItems: UpItem[],
): ParsedRow[] {
  const existingKeys = new Set(existingItems.map(dupKey));
  const parsed: ParsedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c: any) => String(c ?? "").trim())) continue;

    const refCode   = String(row[0] ?? "").trim() || null;
    const sector    = String(row[1] ?? "").trim() || null;
    const prog      = String(row[2] ?? "").trim();
    if (!refCode && !prog) continue;

    const officeRaw = String(row[3] ?? "").trim();
    const dept = departments.find(d =>
      d.dept_abbreviation?.toLowerCase() === officeRaw.toLowerCase() ||
      d.dept_name?.toLowerCase() === officeRaw.toLowerCase() ||
      String(d.dept_id) === officeRaw
    );
    const existProg = refCode
      ? aipPrograms.find(p => p.aip_reference_code?.trim().toLowerCase() === refCode.toLowerCase())
      : null;

    parsed.push({
      _id: `row-${i}-${Date.now()}`,
      aip_reference_code: refCode,
      program_description: prog || existProg?.program_description || "Unnamed",
      dept_id: dept?.dept_id ?? null,
      implementing_office: dept ? null : (officeRaw || null),
      sector,
      target_output_aip: String(row[4] ?? "").trim() || null,
      target_output_ab:  String(row[5] ?? "").trim() || null,
      aip_amount: parseAmt(row[6]),
      ab_amount:  parseAmt(row[7]),
      fund_source: "general_fund",
      ps_amount: 0, mooe_amount: 0, co_amount: 0,
      start_date:      String(row[8]  ?? "").trim() || null,
      completion_date: String(row[9]  ?? "").trim() || null,
      cc_adaptation:   parseAmt(row[10]),
      cc_mitigation:   parseAmt(row[11]),
      cc_typology_code: String(row[12] ?? "").trim() || null,
      nutrition_issue: null, nutrition_objective: null,
      nutrition_activity: null, nutrition_target: null, lead_office_text: null,
      office_display: dept ? (dept.dept_abbreviation ?? dept.dept_name) : (officeRaw || "—"),
      isDuplicate: existingKeys.has(dupKey({ aip_reference_code: refCode, program_description: prog })),
      existingProgramId: existProg?.aip_program_id ?? null,
    });
  }
  return parsed;
}

function parseFundRows(
  rows: any[][], departments: Department[],
  aipPrograms: AipProgram[], existingItems: UpItem[],
): ParsedRow[] {
  // Template columns:
  // 0=aip_code, 1=program, 2=office, 3=start, 4=end, 5=expected_outputs(ignored),
  // 6=fund_source, 7=PS, 8=MOOE, 9=CO, 10=cc_adapt, 11=cc_mitig, 12=cc_typology
  const existingKeys = new Set(existingItems.map(dupKey));
  const parsed: ParsedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c: any) => String(c ?? "").trim())) continue;

    const refCode   = String(row[0] ?? "").trim() || null;
    const prog      = String(row[1] ?? "").trim();
    if (!refCode && !prog) continue;

    const officeRaw = String(row[2] ?? "").trim();
    const dept = departments.find(d =>
      d.dept_abbreviation?.toLowerCase() === officeRaw.toLowerCase() ||
      d.dept_name?.toLowerCase() === officeRaw.toLowerCase() ||
      String(d.dept_id) === officeRaw
    );
    const existProg = refCode
      ? aipPrograms.find(p => p.aip_reference_code?.trim().toLowerCase() === refCode.toLowerCase())
      : null;

    parsed.push({
      _id: `row-${i}-${Date.now()}`,
      aip_reference_code: refCode,
      program_description: prog || existProg?.program_description || "Unnamed",
      dept_id: dept?.dept_id ?? null,
      implementing_office: dept ? null : (officeRaw || null),
      sector: null,
      target_output_aip: null, target_output_ab: null,
      aip_amount: 0, ab_amount: 0,
      fund_source: parseFundSource(String(row[6] ?? "")),
      ps_amount:   parseAmt(row[7]),
      mooe_amount: parseAmt(row[8]),
      co_amount:   parseAmt(row[9]),
      start_date:      String(row[3] ?? "").trim() || null,
      completion_date: String(row[4] ?? "").trim() || null,
      cc_adaptation:   parseAmt(row[10]),
      cc_mitigation:   parseAmt(row[11]),
      cc_typology_code: String(row[12] ?? "").trim() || null,
      nutrition_issue: null, nutrition_objective: null,
      nutrition_activity: null, nutrition_target: null, lead_office_text: null,
      office_display: dept ? (dept.dept_abbreviation ?? dept.dept_name) : (officeRaw || "—"),
      isDuplicate: existingKeys.has(dupKey({ aip_reference_code: refCode, program_description: prog })),
      existingProgramId: existProg?.aip_program_id ?? null,
    });
  }
  return parsed;
}

function parseNutritionRows(
  rows: any[][], departments: Department[], existingItems: UpItem[],
): ParsedRow[] {
  // Template columns:
  // 0=program, 1=nutrition_issue, 2=objective, 3=activity, 4=target,
  // 5=PS, 6=MOOE, 7=CO, 8=lead_office
  const existingKeys = new Set(existingItems.map(dupKey));
  const parsed: ParsedRow[] = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row.some((c: any) => String(c ?? "").trim())) continue;

    const prog     = String(row[0] ?? "").trim();
    const activity = String(row[3] ?? "").trim();
    if (!prog && !activity) continue;

    const officeRaw = String(row[8] ?? "").trim();
    const dept = departments.find(d =>
      d.dept_abbreviation?.toLowerCase() === officeRaw.toLowerCase() ||
      d.dept_name?.toLowerCase() === officeRaw.toLowerCase()
    );

    parsed.push({
      _id: `row-${i}-${Date.now()}`,
      aip_reference_code: null,
      program_description: prog || activity || "Unnamed",
      dept_id: dept?.dept_id ?? null,
      implementing_office: dept ? null : (officeRaw || null),
      sector: null,
      target_output_aip: null, target_output_ab: null,
      aip_amount: 0, ab_amount: 0,
      fund_source: "general_fund",
      ps_amount:   parseAmt(row[5]),
      mooe_amount: parseAmt(row[6]),
      co_amount:   parseAmt(row[7]),
      start_date: null, completion_date: null,
      cc_adaptation: 0, cc_mitigation: 0, cc_typology_code: null,
      nutrition_issue:     String(row[1] ?? "").trim() || null,
      nutrition_objective: String(row[2] ?? "").trim() || null,
      nutrition_activity:  activity || null,
      nutrition_target:    String(row[4] ?? "").trim() || null,
      lead_office_text:    dept ? null : (officeRaw || null),
      office_display: dept ? (dept.dept_abbreviation ?? dept.dept_name) : (officeRaw || "—"),
      isDuplicate: existingKeys.has(dupKey({ aip_reference_code: null, program_description: prog || activity })),
      existingProgramId: null,
    });
  }
  return parsed;
}

function parseExcel(
  file: File,
  meta: PlanMeta,
  departments: Department[],
  aipPrograms: AipProgram[],
  existingItems: UpItem[],
): Promise<{ rows: ParsedRow[]; detectedType: PlanType | null }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const wb   = XLSX.read(e.target?.result, { type: "array" });
        const ws   = wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

        const detectedType = detectTemplateType(wb);

        if (rows.length < 2) { resolve({ rows: [], detectedType }); return; }

        let parsed: ParsedRow[];
        if (meta.variant === "nutrition") {
          parsed = parseNutritionRows(rows, departments, existingItems);
        } else if (meta.variant === "fund") {
          parsed = parseFundRows(rows, departments, aipPrograms, existingItems);
        } else {
          parsed = parseSectorRows(rows, departments, aipPrograms, existingItems);
        }

        resolve({ rows: parsed, detectedType });
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

// ─── Micro components ─────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label:string; value:number; color:string }) {
  return (
    <div className={cn("rounded-xl border px-4 py-3.5 flex flex-col gap-0.5", color)}>
      <p className="text-[10px] font-semibold uppercase tracking-widest opacity-60">{label}</p>
      <p className="text-lg font-bold font-mono tabular-nums leading-tight">₱ {fmt(value)}</p>
    </div>
  );
}

function DeptSelect({ departments, value, onChange }: {
  departments:Department[]; value:number|null; onChange:(id:number|null)=>void;
}) {
  const [open, setOpen] = useState(false);
  const sel = departments.find(d => d.dept_id === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox"
          className={cn("w-full justify-between h-9 text-sm font-normal border-gray-200", !sel && "text-gray-400")}>
          <span className="truncate">{sel ? `${sel.dept_abbreviation ?? ""} — ${sel.dept_name}` : "Search department…"}</span>
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

function EditableCell({ value, onSave, multiline = false }: {
  value:string; onSave:(v:string)=>void; multiline?:boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<any>(null);
  useEffect(() => { setDraft(value); }, [value]);
  useEffect(() => { if (editing) ref.current?.focus(); }, [editing]);
  const commit = () => { setEditing(false); if (draft !== value) onSave(draft); };
  const cls = "w-full text-[12px] border rounded-md px-2 py-1.5 bg-white border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200";
  if (editing) {
    return multiline
      ? <textarea ref={ref} value={draft} rows={2} style={{ resize: "vertical", minHeight: 48 }}
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => e.key === "Escape" && (setEditing(false), setDraft(value))}
          className={cls} />
      : <input ref={ref} type="text" value={draft} className={cls}
          onChange={e => setDraft(e.target.value)} onBlur={commit}
          onKeyDown={e => { if (e.key === "Escape") { setEditing(false); setDraft(value); } if (e.key === "Enter") commit(); }} />;
  }
  return (
    <div onClick={() => setEditing(true)} title="Click to edit"
      className="min-h-[28px] rounded px-1.5 py-0.5 cursor-text hover:bg-blue-50/60 transition-colors text-[12px] leading-snug break-words">
      {value || <span className="text-gray-300">—</span>}
    </div>
  );
}

function AmountCell({ value, onSave }: { value:number; onSave:(v:number)=>void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value === 0 ? "" : fmt(value));
  useEffect(() => { if (!editing) setDraft(value === 0 ? "" : fmt(value)); }, [value, editing]);
  return editing
    ? <input type="text" inputMode="decimal" autoFocus value={draft}
        onChange={e => setDraft(fmtW(e.target.value))}
        onBlur={() => { setEditing(false); onSave(parseAmt(draft)); }}
        onKeyDown={e => { if (e.key === "Enter") { setEditing(false); onSave(parseAmt(draft)); } }}
        className="w-full text-right text-[12px] font-mono h-8 px-2 rounded-md border border-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white" />
    : <div onClick={() => setEditing(true)} title="Click to edit"
        className={cn("text-right text-[12px] font-mono tabular-nums px-1.5 py-0.5 rounded cursor-text hover:bg-blue-50/60 transition-colors min-h-[28px] flex items-center justify-end", value === 0 ? "text-gray-300" : "text-gray-800")}>
        {value === 0 ? "—" : fmt(value)}
      </div>;
}

// ─── Wrong-template error dialog ──────────────────────────────────────────────

function WrongTemplateDialog({
  open, onClose, detectedType, expectedMeta,
}: {
  open: boolean; onClose: () => void;
  detectedType: PlanType | null; expectedMeta: PlanMeta;
}) {
  const detectedMeta = detectedType ? PLAN_META[detectedType] : null;
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
                You uploaded a file that doesn't match the <span className="font-semibold text-gray-700">{expectedMeta.title}</span> template.
              </p>
              {detectedMeta && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 px-3 py-2.5 text-xs">
                  <p className="font-semibold text-amber-700 mb-0.5">Detected template:</p>
                  <p className="text-amber-800">{detectedMeta.title}</p>
                  <p className="text-amber-600 mt-1">Please navigate to the <strong>{detectedMeta.title.split(" ").slice(0, 3).join(" ")}…</strong> page to import this file.</p>
                </div>
              )}
              {!detectedMeta && (
                <div className="rounded-lg bg-gray-50 border border-gray-200 px-3 py-2.5 text-xs text-gray-500">
                  Unknown template format. Please download the correct template using the <strong>Download Template</strong> button.
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

// ─── Import Preview Dialog ────────────────────────────────────────────────────

function ImportPreview({ open, onOpenChange, rows, onRowsChange, onConfirm, importing, variant }: {
  open:boolean; onOpenChange:(v:boolean)=>void;
  rows:ParsedRow[]; onRowsChange:(r:ParsedRow[])=>void;
  onConfirm:()=>void; importing:boolean;
  variant: PlanVariant;
}) {
  const dupCount   = rows.filter(r => r.isDuplicate).length;
  const willImport = rows.filter(r => !r.isDuplicate).length;
  const removeRow  = (id: string) => onRowsChange(rows.filter(r => r._id !== id));

  const isFund = variant === "fund";
  const isNutr = variant === "nutrition";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 flex-shrink-0">
          <DialogTitle className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
            Import Preview
            <Badge variant="outline" className="text-[10px] font-semibold ml-1">{rows.length} rows found</Badge>
          </DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">
            Duplicate entries (same AIP code or program already in this budget plan) are highlighted red and will not be imported.
          </p>
        </DialogHeader>

        {dupCount > 0 && (
          <div className="flex items-center gap-3 px-6 py-2.5 bg-red-50 border-b border-red-100 flex-shrink-0">
            <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0" />
            <p className="text-xs text-red-700">
              <span className="font-semibold">{dupCount} duplicate{dupCount !== 1 ? "s" : ""} detected</span>
              {" "}— these entries already exist and will be skipped.
            </p>
          </div>
        )}

        <div className="overflow-auto flex-1">
          <table className="w-full text-[12px] border-collapse">
            <thead className="sticky top-0 z-10">
              <tr>
                <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center w-8">#</th>
                {!isNutr && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left whitespace-nowrap">AIP Code</th>}
                <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left">Program / Activity</th>
                {!isNutr && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left">Sector</th>}
                {isNutr && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left">Activity</th>}
                <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left w-24">Office</th>
                {isFund && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-left w-20">Fund</th>}
                {isFund  && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-right w-24">PS</th>}
                {(isFund||isNutr) && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-right w-24">MOOE</th>}
                {(isFund||isNutr) && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-right w-24">CO</th>}
                {!isFund && !isNutr && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-right w-28">AIP Amt</th>}
                {!isFund && !isNutr && <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-right w-28">AB Amt</th>}
                <th className="border-b border-r border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center w-28">Status</th>
                <th className="border-b border-gray-200 bg-gray-50 px-3 py-2.5 text-[10px] font-semibold text-gray-500 uppercase tracking-wide text-center w-14"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.map((row, idx) => (
                <tr key={row._id} className={cn("transition-colors", row.isDuplicate ? "bg-red-50 opacity-60" : "hover:bg-gray-50/60")}>
                  <td className="border-r border-gray-100 px-3 py-2.5 text-gray-400 text-center align-top">{idx + 1}</td>
                  {!isNutr && (
                    <td className="border-r border-gray-100 px-3 py-2.5 align-top font-mono text-[11px] text-gray-600 whitespace-nowrap">
                      {row.aip_reference_code || <span className="text-gray-300">—</span>}
                      {row.existingProgramId && !row.isDuplicate && (
                        <span className="ml-1 text-[10px] text-blue-500 bg-blue-50 border border-blue-200 px-1 py-0.5 rounded">existing</span>
                      )}
                    </td>
                  )}
                  <td className={cn("border-r border-gray-100 px-3 py-2.5 align-top leading-snug max-w-[200px]", row.isDuplicate && "text-red-800 font-medium")}>
                    {row.program_description}
                    {row.isDuplicate && (
                      <div className="mt-1">
                        <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-100 px-1.5 py-0.5 rounded-full">
                          <ExclamationTriangleIcon className="w-3 h-3" /> DUPLICATE
                        </span>
                      </div>
                    )}
                  </td>
                  {!isNutr && <td className="border-r border-gray-100 px-3 py-2.5 align-top text-gray-500 text-[11px]">{row.sector || <span className="text-gray-300">—</span>}</td>}
                  {isNutr && <td className="border-r border-gray-100 px-3 py-2.5 align-top text-gray-500 text-[11px] max-w-[160px] leading-snug">{row.nutrition_activity || <span className="text-gray-300">—</span>}</td>}
                  <td className="border-r border-gray-100 px-3 py-2.5 align-top">
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] border border-slate-200">{row.office_display}</span>
                  </td>
                  {isFund && (
                    <td className="border-r border-gray-100 px-3 py-2.5 align-top">
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                        row.fund_source === "special_account" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                        {row.fund_source === "special_account" ? "Special" : "General"}
                      </span>
                    </td>
                  )}
                  {isFund && (
                    <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums align-top", row.isDuplicate ? "text-red-700" : "text-gray-700")}>
                      {row.ps_amount > 0 ? fmt(row.ps_amount) : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  {(isFund || isNutr) && (
                    <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums align-top", row.isDuplicate ? "text-red-700" : "text-gray-700")}>
                      {row.mooe_amount > 0 ? fmt(row.mooe_amount) : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  {(isFund || isNutr) && (
                    <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums align-top", row.isDuplicate ? "text-red-700" : "text-gray-700")}>
                      {row.co_amount > 0 ? fmt(row.co_amount) : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  {!isFund && !isNutr && (
                    <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums align-top", row.isDuplicate ? "text-red-700" : "text-gray-700")}>
                      {row.aip_amount > 0 ? fmt(row.aip_amount) : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  {!isFund && !isNutr && (
                    <td className={cn("border-r border-gray-100 px-3 py-2.5 text-right font-mono tabular-nums align-top", row.isDuplicate ? "text-red-700" : "text-gray-700")}>
                      {row.ab_amount > 0 ? fmt(row.ab_amount) : <span className="text-gray-300">—</span>}
                    </td>
                  )}
                  <td className="border-r border-gray-100 px-3 py-2.5 text-center align-middle">
                    {row.isDuplicate
                      ? <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-red-500 bg-red-100 border border-red-200 px-2 py-1 rounded-full"><ExclamationTriangleIcon className="w-3 h-3" /> Duplicate</span>
                      : <span className="text-[10px] font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-1 rounded-full">New</span>}
                  </td>
                  <td className="px-3 py-2.5 text-center align-middle">
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
            {dupCount > 0 && <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200 inline-block" />{dupCount} duplicate{dupCount !== 1 ? "s" : ""} skipped</span>}
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

// ─── Item Dialog ──────────────────────────────────────────────────────────────

function ItemDialog({ open, onOpenChange, initialForm, departments, aipPrograms, onSubmit, submitting, editMode, meta }: {
  open:boolean; onOpenChange:(v:boolean)=>void; initialForm:ItemForm;
  departments:Department[]; aipPrograms:AipProgram[];
  onSubmit:(form:ItemForm)=>void; submitting:boolean; editMode:boolean; meta:PlanMeta;
}) {
  const [form, setForm] = useState<ItemForm>(initialForm);
  useEffect(() => { setForm(initialForm); }, [initialForm, open]);
  const set = (f: keyof ItemForm, v: any) => setForm(p => ({ ...p, [f]: v }));

  const handleRefCode = (code: string) => {
    set("aip_reference_code", code);
    const match = aipPrograms.find(p => p.aip_reference_code?.trim().toLowerCase() === code.trim().toLowerCase());
    if (match && !form.program_description) set("program_description", match.program_description);
  };

  const amtF = (field: keyof ItemForm, label: string) => (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold text-gray-600">{label} (₱)</Label>
      <Input value={form[field] as string} onChange={e => set(field, fmtW(e.target.value))}
        className="h-9 text-sm text-right font-mono" placeholder="0" inputMode="decimal" />
    </div>
  );

  const isFund = meta.variant === "fund";
  const isNutr = meta.variant === "nutrition";
  const isSect = meta.variant === "sector";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden max-h-[90vh] overflow-y-auto">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100 sticky top-0 bg-white z-10">
          <DialogTitle className="text-[15px] font-semibold text-gray-900">{editMode ? "Edit Item" : "Add Item"}</DialogTitle>
          <p className="text-xs text-gray-400 mt-0.5">{meta.subtitle}</p>
        </DialogHeader>

        <div className="px-6 py-5 space-y-4">
          {/* AIP code + sector (not nutrition) */}
          {!isNutr && (
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">AIP Reference Code</Label>
                <Input value={form.aip_reference_code} onChange={e => handleRefCode(e.target.value)}
                  className="h-9 text-sm font-mono" placeholder="e.g. 9000-3-03-001" />
              </div>
              {isSect && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold text-gray-600">Sector</Label>
                  <Input value={form.sector} onChange={e => set("sector", e.target.value)}
                    className="h-9 text-sm" placeholder="e.g. GENERAL PUBLIC SERVICE" />
                </div>
              )}
              {isFund && (
                <div className="space-y-1.5 col-span-2">
                  <Label className="text-xs font-semibold text-gray-600">Fund Source</Label>
                  <Select value={form.fund_source} onValueChange={v => set("fund_source", v as FundSource)}>
                    <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general_fund">General Fund</SelectItem>
                      <SelectItem value="special_account">Special Account</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          )}

          {/* Program description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-gray-600">
              Program / Project / Activity <span className="text-red-400">*</span>
            </Label>
            <Textarea value={form.program_description} onChange={e => set("program_description", e.target.value)}
              rows={2} className="text-sm resize-none" placeholder="Description…" />
          </div>

          {/* Office + schedule */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Implementing Office / Department</Label>
              <DeptSelect departments={departments} value={form.dept_id} onChange={id => set("dept_id", id)} />
              {form.dept_id === null && (
                <Input value={form.implementing_office} onChange={e => set("implementing_office", e.target.value)}
                  className="h-8 text-xs mt-1" placeholder="Or type office name" />
              )}
            </div>
            {!isNutr && (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Start Date</Label>
                  <Input value={form.start_date} onChange={e => set("start_date", e.target.value)} className="h-9 text-sm" placeholder="e.g. Jan." />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Completion Date</Label>
                  <Input value={form.completion_date} onChange={e => set("completion_date", e.target.value)} className="h-9 text-sm" placeholder="e.g. Dec." />
                </div>
              </div>
            )}
          </div>

          {/* Sector-plan: target outputs + AIP/AB amounts */}
          {isSect && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Target Output (AIP)</Label>
                  <Input value={form.target_output_aip} onChange={e => set("target_output_aip", e.target.value)} className="h-9 text-sm" placeholder="e.g. Services Provided" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Target Output (AB)</Label>
                  <Input value={form.target_output_ab} onChange={e => set("target_output_ab", e.target.value)} className="h-9 text-sm" placeholder="e.g. Services Provided" />
                </div>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Estimated Cost</p>
                <div className="grid grid-cols-2 gap-3">
                  {amtF("aip_amount", "AIP Amount")}
                  {amtF("ab_amount",  "AB Amount (Approved Budget)")}
                </div>
              </div>
            </>
          )}

          {/* Fund-plan: PS/MOOE/CO */}
          {isFund && (
            <div className="border-t border-gray-100 pt-4">
              <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Budget Amounts</p>
              <div className="grid grid-cols-3 gap-3">
                {amtF("ps_amount",   "Personal Services (PS)")}
                {amtF("mooe_amount", "MOOE")}
                {amtF("co_amount",   "Capital Outlay (CO)")}
              </div>
            </div>
          )}

          {/* Nutrition-specific fields */}
          {isNutr && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Nutrition Issue / Concern</Label>
                <Textarea value={form.nutrition_issue} onChange={e => set("nutrition_issue", e.target.value)} rows={2} className="text-sm resize-none" placeholder="e.g. Prevalent cases of undernourished children" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Nutrition Objective</Label>
                <Textarea value={form.nutrition_objective} onChange={e => set("nutrition_objective", e.target.value)} rows={2} className="text-sm resize-none" placeholder="Objective…" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Identified Nutrition Activity</Label>
                  <Textarea value={form.nutrition_activity} onChange={e => set("nutrition_activity", e.target.value)} rows={2} className="text-sm resize-none" placeholder="Activity…" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Target</Label>
                  <Input value={form.nutrition_target} onChange={e => set("nutrition_target", e.target.value)} className="h-9 text-sm" placeholder="e.g. 14 Brgys." />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Lead Office (free-text)</Label>
                <Input value={form.lead_office_text} onChange={e => set("lead_office_text", e.target.value)} className="h-9 text-sm" placeholder="e.g. MHO" />
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Budget</p>
                <div className="grid grid-cols-3 gap-3">
                  {amtF("ps_amount",   "Personal Services (PS)")}
                  {amtF("mooe_amount", "MOOE")}
                  {amtF("co_amount",   "Capital Outlay (CO)")}
                </div>
              </div>
            </>
          )}

          {/* CC — all plan types */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-3">Climate Change Expenditure</p>
            <div className="grid grid-cols-3 gap-3">
              {amtF("cc_adaptation", "CC Adaptation")}
              {amtF("cc_mitigation", "CC Mitigation")}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">CC Typology Code</Label>
                <Input value={form.cc_typology_code} onChange={e => set("cc_typology_code", e.target.value)} className="h-9 text-sm" placeholder="e.g. CCA-001" />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2 sticky bottom-0 bg-white">
          <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => onOpenChange(false)} disabled={submitting}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800" onClick={() => onSubmit(form)} disabled={submitting}>
            {submitting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</> : editMode ? "Update" : "Add Item"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function UnifiedPlanPage({ meta }: { meta: PlanMeta }) {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const { variant } = meta;
  const isFund = variant === "fund";
  const isNutr = variant === "nutrition";
  const isSect = variant === "sector";

  const [items, setItems]             = useState<UpItem[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [aipPrograms, setAipPrograms] = useState<AipProgram[]>([]);
  const [loading, setLoading]         = useState(false);
  const [totals, setTotals] = useState({ aip:0, ab:0, ps:0, mooe:0, co:0, total:0, ccAdapt:0, ccMitig:0 });

  const [dialogOpen, setDialogOpen]     = useState(false);
  const [dialogForm, setDialogForm]     = useState<ItemForm>(EMPTY_FORM);
  const [editTarget, setEditTarget]     = useState<UpItem | null>(null);
  const [submitting, setSubmitting]     = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<UpItem | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewRows, setPreviewRows] = useState<ParsedRow[]>([]);
  const [importing, setImporting]     = useState(false);
  const [wrongTemplate, setWrongTemplate] = useState<{ detectedType: PlanType | null } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const apiBase = `/${meta.apiSlug}`;

  useEffect(() => {
    if (!activePlan) return;
    Promise.all([API.get("/departments"), API.get("/aip-programs")])
      .then(([dR, aR]) => {
        setDepartments(dR.data.data ?? dR.data);
        setAipPrograms(aR.data.data ?? aR.data);
      }).catch(console.error);
  }, [activePlan?.budget_plan_id]);

  const fetchData = useCallback(async (planId: number) => {
    setLoading(true);
    try {
      const r: { data: UpResponse } = await API.get(`${apiBase}?budget_plan_id=${planId}`);
      setItems(r.data.data);
      setTotals({
        aip: r.data.total_aip, ab: r.data.total_ab,
        ps: r.data.total_ps, mooe: r.data.total_mooe, co: r.data.total_co,
        total: r.data.grand_total,
        ccAdapt: r.data.total_cc_adapt, ccMitig: r.data.total_cc_mitig,
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiBase]);

  useEffect(() => {
    if (activePlan?.budget_plan_id) fetchData(activePlan.budget_plan_id);
  }, [activePlan, fetchData]);

  const handleUpdate = useCallback(async (id: number, field: string, value: any) => {
    setItems(prev => prev.map(i => i.up_item_id === id ? { ...i, [field]: value } : i));
    try {
      await API.put(`${apiBase}/${id}`, { [field]: value });
      if (activePlan?.budget_plan_id) fetchData(activePlan.budget_plan_id);
    } catch (err: any) {
      toast.error(`Save failed: ${err?.response?.data?.message ?? err?.message}`);
      if (activePlan?.budget_plan_id) fetchData(activePlan.budget_plan_id);
    }
  }, [apiBase, activePlan, fetchData]);

  const openAdd = () => { setEditTarget(null); setDialogForm(EMPTY_FORM); setDialogOpen(true); };

  const openEdit = (item: UpItem) => {
    setEditTarget(item);
    setDialogForm({
      aip_reference_code:  item.aip_reference_code ?? "",
      program_description: item.program_description ?? "",
      dept_id:             item.dept_id,
      implementing_office: item.department ? "" : (item.implementing_office ?? ""),
      sector:              item.sector ?? "",
      sub_sector:          "",
      target_output_aip:   item.target_output_aip ?? "",
      target_output_ab:    item.target_output_ab ?? "",
      fund_source:         item.fund_source,
      start_date:          item.start_date ?? "",
      completion_date:     item.completion_date ?? "",
      aip_amount:          item.aip_amount > 0 ? fmt(item.aip_amount) : "",
      ab_amount:           item.ab_amount > 0  ? fmt(item.ab_amount)  : "",
      ps_amount:           item.ps_amount > 0  ? fmt(item.ps_amount)  : "",
      mooe_amount:         item.mooe_amount > 0 ? fmt(item.mooe_amount): "",
      co_amount:           item.co_amount > 0  ? fmt(item.co_amount)  : "",
      cc_adaptation:       item.cc_adaptation > 0 ? fmt(item.cc_adaptation) : "",
      cc_mitigation:       item.cc_mitigation > 0  ? fmt(item.cc_mitigation)  : "",
      cc_typology_code:    item.cc_typology_code ?? "",
      nutrition_issue:     item.nutrition_issue ?? "",
      nutrition_objective: item.nutrition_objective ?? "",
      nutrition_activity:  item.nutrition_activity ?? "",
      nutrition_target:    item.nutrition_target ?? "",
      lead_office_text:    item.lead_office_text ?? "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (form: ItemForm) => {
    if (!activePlan?.budget_plan_id) return;
    if (!form.program_description.trim()) { toast.error("Program description is required"); return; }
    setSubmitting(true);
    try {
      const payload = {
        budget_plan_id:      activePlan.budget_plan_id,
        aip_reference_code:  form.aip_reference_code || null,
        program_description: form.program_description,
        dept_id:             form.dept_id,
        implementing_office: form.dept_id ? null : (form.implementing_office || null),
        sector:              form.sector || null,
        target_output_aip:   form.target_output_aip || null,
        target_output_ab:    form.target_output_ab || null,
        fund_source:         form.fund_source,
        start_date:          form.start_date || null,
        completion_date:     form.completion_date || null,
        aip_amount:          parseAmt(form.aip_amount),
        ab_amount:           parseAmt(form.ab_amount),
        ps_amount:           parseAmt(form.ps_amount),
        mooe_amount:         parseAmt(form.mooe_amount),
        co_amount:           parseAmt(form.co_amount),
        cc_adaptation:       parseAmt(form.cc_adaptation),
        cc_mitigation:       parseAmt(form.cc_mitigation),
        cc_typology_code:    form.cc_typology_code || null,
        nutrition_issue:     form.nutrition_issue || null,
        nutrition_objective: form.nutrition_objective || null,
        nutrition_activity:  form.nutrition_activity || null,
        nutrition_target:    form.nutrition_target || null,
        lead_office_text:    form.lead_office_text || null,
      };
      if (editTarget) {
        await API.put(`${apiBase}/${editTarget.up_item_id}`, payload);
        toast.success("Item updated");
      } else {
        await API.post(apiBase, payload);
        toast.success("Item added");
      }
      setDialogOpen(false);
      await fetchData(activePlan.budget_plan_id);
    } catch (err: any) {
      toast.error(`Failed: ${err?.response?.data?.message ?? err?.message}`);
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`${apiBase}/${deleteTarget.up_item_id}`);
      toast.success("Item deleted");
      setDeleteTarget(null);
      if (activePlan?.budget_plan_id) await fetchData(activePlan.budget_plan_id);
    } catch (e) { console.error(e); }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activePlan?.budget_plan_id) return;
    e.target.value = "";

    try {
      const { rows, detectedType } = await parseExcel(file, meta, departments, aipPrograms, items);

      // ── Template mismatch check ───────────────────────────────────────────
      // If a type was detected AND it doesn't match current page → block
      if (detectedType !== null && detectedType !== meta.planType) {
        setWrongTemplate({ detectedType });
        return;
      }

      if (rows.length === 0) { toast.warning("No valid rows found."); return; }
      setPreviewRows(rows);
      setPreviewOpen(true);
    } catch (err: any) {
      toast.error(`Could not read file: ${err?.message ?? "Unknown error"}`);
    }
  };

  const handleConfirmImport = async () => {
    if (!activePlan?.budget_plan_id) return;
    const toImport = previewRows.filter(r => !r.isDuplicate);
    if (toImport.length === 0) { toast.warning("No rows to import."); return; }
    setImporting(true);
    try {
      await API.post(`${apiBase}/bulk`, {
        budget_plan_id: activePlan.budget_plan_id,
        items: toImport.map(({ _id, isDuplicate, existingProgramId, office_display, ...rest }) => rest),
      });
      toast.success(`Imported ${toImport.length} item${toImport.length !== 1 ? "s" : ""}`);
      setPreviewOpen(false);
      setPreviewRows([]);
      await fetchData(activePlan.budget_plan_id);
    } catch (err: any) {
      toast.error(`Import failed: ${err?.response?.data?.message ?? err?.message ?? "Unknown error"}`);
    } finally { setImporting(false); }
  };

  const downloadTemplate = () => {
    const link = document.createElement("a");
    link.href     = meta.templateFile;
    link.download = meta.templateName;
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
        <p className="text-gray-400 text-xs">Activate a budget plan to manage {meta.planType.toUpperCase()} items.</p>
      </div>
    </div>
  );

  const budgetYear = activePlan.year ?? new Date().getFullYear();
  const dataItems  = items.filter(i => !i.is_subtotal_row);
  const th  = "border-b border-r border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wide align-bottom whitespace-nowrap";
  const thR = cn(th, "text-right");

  return (
    <div className="p-6">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className={cn("text-[10px] font-bold uppercase tracking-[0.12em] px-2.5 py-1 rounded-full", meta.accentColor)}>
              {meta.planType.replace("_", " ").toUpperCase()}
            </span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] font-medium text-gray-400">Budget Year: {budgetYear}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">{meta.title}</h1>
          <p className="text-sm text-gray-400 mt-0.5">{meta.subtitle}</p>
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
          <Button size="sm" onClick={openAdd}
            className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white">
            <PlusIcon className="w-3.5 h-3.5" /> Add Item
          </Button>
        </div>
      </div>

      {/* ── Stat cards ─────────────────────────────────────────────────────── */}
      <div className={cn("grid gap-3 mb-7", isSect ? "grid-cols-4" : "grid-cols-5")}>
        {loading ? (
          Array.from({ length: isSect ? 4 : 5 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-gray-100 bg-white px-4 py-3.5 flex flex-col gap-2.5">
              <Skeleton className="h-2.5 w-20 rounded" />
              <Skeleton className="h-5 w-28 rounded" />
            </div>
          ))
        ) : (
          <>
            {isSect && <>
              <StatCard label="Total AIP Amount" value={totals.aip}      color="border-blue-200 bg-blue-50 text-blue-900" />
              <StatCard label="Total AB Amount"  value={totals.ab}       color="border-violet-200 bg-violet-50 text-violet-900" />
            </>}
            {(isFund || isNutr) && <>
              <StatCard label="Personal Services" value={totals.ps}   color="border-blue-200 bg-blue-50 text-blue-900" />
              <StatCard label="MOOE"              value={totals.mooe} color="border-violet-200 bg-violet-50 text-violet-900" />
              <StatCard label="Capital Outlay"    value={totals.co}   color="border-teal-200 bg-teal-50 text-teal-900" />
            </>}
            {(isFund || isNutr) && (
              <StatCard label="Grand Total" value={totals.total} color="border-gray-200 bg-gray-900 text-white" />
            )}
            <StatCard label="CC Adaptation" value={totals.ccAdapt} color="border-green-200 bg-green-50 text-green-900" />
            <StatCard label="CC Mitigation" value={totals.ccMitig} color="border-emerald-200 bg-emerald-50 text-emerald-900" />
          </>
        )}
      </div>

      {/* ── Main table ─────────────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse" style={{ minWidth: 1300 }}>
              {/* ── Header ── */}
              <thead>
                <tr className="border-b border-gray-200 bg-gray-50/60">
                  {/* # */}
                  <th className="px-3 py-3 w-8"><Skeleton className="h-3 w-4 mx-auto rounded" /></th>
                  {/* AIP Code */}
                  {!isNutr && <th className="px-3 py-3 w-36"><Skeleton className="h-3 w-20 rounded" /></th>}
                  {/* Sector (sector only) */}
                  {isSect && <th className="px-3 py-3 w-32"><Skeleton className="h-3 w-16 rounded" /></th>}
                  {/* Program */}
                  <th className="px-3 py-3 w-52"><Skeleton className="h-3 w-36 rounded" /></th>
                  {/* Nutrition cols */}
                  {isNutr && <th className="px-3 py-3 w-36"><Skeleton className="h-3 w-24 rounded" /></th>}
                  {isNutr && <th className="px-3 py-3 w-36"><Skeleton className="h-3 w-20 rounded" /></th>}
                  {isNutr && <th className="px-3 py-3 w-24"><Skeleton className="h-3 w-12 rounded" /></th>}
                  {/* Office */}
                  <th className="px-3 py-3 w-24"><Skeleton className="h-3 w-14 rounded" /></th>
                  {/* Fund (fund only) */}
                  {isFund && <th className="px-3 py-3 w-20"><Skeleton className="h-3 w-10 rounded" /></th>}
                  {/* Start / End */}
                  {!isNutr && <th className="px-3 py-3 w-16"><Skeleton className="h-3 w-10 rounded" /></th>}
                  {!isNutr && <th className="px-3 py-3 w-16"><Skeleton className="h-3 w-10 rounded" /></th>}
                  {/* Amount cols */}
                  {isSect && <><th className="px-3 py-3 w-32"><Skeleton className="h-3 w-20 rounded" /></th><th className="px-3 py-3 w-32"><Skeleton className="h-3 w-20 rounded" /></th></>}
                  {isSect && <><th className="px-3 py-3 w-28"><Skeleton className="h-3 w-16 ml-auto rounded" /></th><th className="px-3 py-3 w-28"><Skeleton className="h-3 w-16 ml-auto rounded" /></th></>}
                  {(isFund || isNutr) && <>
                    <th className="px-3 py-3 w-28"><Skeleton className="h-3 w-8 ml-auto rounded" /></th>
                    <th className="px-3 py-3 w-28"><Skeleton className="h-3 w-12 ml-auto rounded" /></th>
                    <th className="px-3 py-3 w-28"><Skeleton className="h-3 w-8 ml-auto rounded" /></th>
                    <th className="px-3 py-3 w-28"><Skeleton className="h-3 w-12 ml-auto rounded" /></th>
                  </>}
                  <th className="px-3 py-3 w-28"><Skeleton className="h-3 w-16 ml-auto rounded" /></th>
                  <th className="px-3 py-3 w-28"><Skeleton className="h-3 w-16 ml-auto rounded" /></th>
                  <th className="px-3 py-3 w-24"><Skeleton className="h-3 w-16 rounded" /></th>
                  <th className="px-3 py-3 w-10" />
                </tr>
              </thead>
              {/* ── Rows ── */}
              <tbody>
                {Array.from({ length: 8 }).map((_, ri) => {
                  // Each row gets slightly varied widths so it reads as real content
                  const narrow  = ri % 3 === 0 ? "w-20" : ri % 3 === 1 ? "w-28" : "w-24";
                  const wide    = ri % 3 === 0 ? "w-48" : ri % 3 === 1 ? "w-40" : "w-52";
                  const amt     = ri % 2 === 0 ? "w-16" : "w-20";
                  return (
                    <tr
                      key={ri}
                      className={cn("border-b border-gray-100", ri % 2 === 1 && "bg-gray-50/30")}
                      style={{ animationDelay: `${ri * 60}ms` }}
                    >
                      {/* # */}
                      <td className="px-3 py-3"><Skeleton className="h-3 w-4 mx-auto rounded" /></td>
                      {/* AIP Code */}
                      {!isNutr && <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded font-mono", narrow)} /></td>}
                      {/* Sector */}
                      {isSect && <td className="px-3 py-3"><Skeleton className="h-3 w-20 rounded" /></td>}
                      {/* Program — taller to suggest multiline */}
                      <td className="px-3 py-3 space-y-1.5">
                        <Skeleton className={cn("h-3 rounded", wide)} />
                        {ri % 2 === 0 && <Skeleton className="h-3 w-24 rounded" />}
                      </td>
                      {/* Nutrition cols */}
                      {isNutr && <td className="px-3 py-3"><Skeleton className="h-3 w-28 rounded" /></td>}
                      {isNutr && <td className="px-3 py-3"><Skeleton className="h-3 w-24 rounded" /></td>}
                      {isNutr && <td className="px-3 py-3"><Skeleton className="h-3 w-12 rounded" /></td>}
                      {/* Office badge */}
                      <td className="px-3 py-3">
                        <Skeleton className="h-5 w-14 rounded-full" />
                      </td>
                      {/* Fund badge */}
                      {isFund && <td className="px-3 py-3"><Skeleton className="h-5 w-14 rounded-full" /></td>}
                      {/* Start / End */}
                      {!isNutr && <td className="px-3 py-3"><Skeleton className="h-3 w-8 rounded" /></td>}
                      {!isNutr && <td className="px-3 py-3"><Skeleton className="h-3 w-8 rounded" /></td>}
                      {/* Sector amounts */}
                      {isSect && <>
                        <td className="px-3 py-3"><Skeleton className="h-3 w-20 rounded" /></td>
                        <td className="px-3 py-3"><Skeleton className="h-3 w-20 rounded" /></td>
                        <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded ml-auto", amt)} /></td>
                        <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded ml-auto", amt)} /></td>
                      </>}
                      {/* Fund/Nutr amounts */}
                      {(isFund || isNutr) && <>
                        <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded ml-auto", amt)} /></td>
                        <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded ml-auto", amt)} /></td>
                        <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded ml-auto", amt)} /></td>
                        <td className="px-3 py-3"><Skeleton className={cn("h-3 rounded ml-auto font-semibold", amt)} /></td>
                      </>}
                      {/* CC cols */}
                      <td className="px-3 py-3"><Skeleton className="h-3 w-6 ml-auto rounded" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-6 ml-auto rounded" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-10 rounded" /></td>
                      {/* Actions */}
                      <td className="px-3 py-3"><Skeleton className="h-6 w-6 mx-auto rounded" /></td>
                    </tr>
                  );
                })}
              </tbody>
              {/* ── Footer ── */}
              <tfoot>
                <tr className="bg-gray-900/5 border-t-2 border-gray-200">
                  <td colSpan={3} className="px-3 py-3">
                    <Skeleton className="h-3 w-10 ml-auto rounded bg-gray-200" />
                  </td>
                  {isSect && <>
                    <td className="px-3 py-3" /><td className="px-3 py-3" />
                    <td className="px-3 py-3" /><td className="px-3 py-3" />
                    <td className="px-3 py-3"><Skeleton className="h-3 w-20 ml-auto rounded bg-gray-200" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-3 w-20 ml-auto rounded bg-gray-200" /></td>
                  </>}
                  {(isFund || isNutr) && <>
                    <td className="px-3 py-3" /><td className="px-3 py-3" /><td className="px-3 py-3" />
                    <td className="px-3 py-3"><Skeleton className="h-3 w-20 ml-auto rounded bg-gray-200" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-3 w-20 ml-auto rounded bg-gray-200" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-3 w-20 ml-auto rounded bg-gray-200" /></td>
                    <td className="px-3 py-3"><Skeleton className="h-3 w-24 ml-auto rounded bg-gray-200" /></td>
                  </>}
                  <td className="px-3 py-3"><Skeleton className="h-3 w-6 ml-auto rounded bg-gray-200" /></td>
                  <td className="px-3 py-3"><Skeleton className="h-3 w-6 ml-auto rounded bg-gray-200" /></td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px] border-collapse" style={{ minWidth: 1300 }}>
              <thead>
                <tr>
                  <th className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-center w-8 align-middle text-[11px] font-medium text-gray-400">#</th>
                  {!isNutr && <th className={cn(th, "w-36")}>AIP Code</th>}
                  {isSect   && <th className={cn(th, "w-32")}>Sector</th>}
                  <th className={cn(th, "w-52")}>Program / Project / Activity</th>
                  {isNutr && <th className={cn(th, "w-36")}>Nutrition Issue</th>}
                  {isNutr && <th className={cn(th, "w-36")}>Activity</th>}
                  {isNutr && <th className={cn(th, "w-24")}>Target</th>}
                  <th className={cn(th, "w-24")}>Office</th>
                  {isFund && <th className={cn(th, "w-20")}>Fund</th>}
                  {!isNutr && <th className={cn(th, "w-16")}>Start</th>}
                  {!isNutr && <th className={cn(th, "w-16")}>End</th>}
                  {isSect && <>
                    <th className={cn(th, "w-32")}>Target (AIP)</th>
                    <th className={cn(th, "w-32")}>Target (AB)</th>
                    <th className={cn(thR, "w-28")}>AIP Amt</th>
                    <th className={cn(thR, "w-28")}>AB Amt</th>
                  </>}
                  {(isFund || isNutr) && <>
                    <th className={cn(thR, "w-28")}>PS</th>
                    <th className={cn(thR, "w-28")}>MOOE</th>
                    <th className={cn(thR, "w-28")}>CO</th>
                    <th className={cn(thR, "w-28")}>Total</th>
                  </>}
                  <th className={cn(thR, "w-28")}>CC Adapt.</th>
                  <th className={cn(thR, "w-28")}>CC Mitig.</th>
                  <th className={cn(th,  "w-24")}>CC Typology</th>
                  <th className="border-b border-gray-200 bg-white w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {items.length === 0 ? (
                  <tr><td colSpan={20} className="py-14 text-center text-gray-400 text-sm">
                    No items yet.{" "}
                    <button onClick={openAdd} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Add the first item</button>
                  </td></tr>
                ) : items.map((item, idx) => {
                  // Subtotal row
                  if (item.is_subtotal_row) return (
                    <tr key={item.up_item_id} className="bg-gray-50 border-t-2 border-gray-200">
                      <td colSpan={isSect ? 9 : isNutr ? 6 : 7}
                        className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                        {item.row_label || "Subtotal"}
                      </td>
                      {isSect && <>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-800 border-l border-gray-200">{item.aip_amount > 0 ? fmt(item.aip_amount) : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-800 border-l border-gray-200">{item.ab_amount > 0  ? fmt(item.ab_amount)  : "—"}</td>
                      </>}
                      {(isFund || isNutr) && <>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-800 border-l border-gray-200">{item.ps_amount > 0   ? fmt(item.ps_amount)   : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-800 border-l border-gray-200">{item.mooe_amount > 0 ? fmt(item.mooe_amount) : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-800 border-l border-gray-200">{item.co_amount > 0   ? fmt(item.co_amount)   : "—"}</td>
                        <td className="px-3 py-2 text-right font-mono font-semibold text-[12px] text-gray-800 border-l border-gray-200">{fmt(item.total_amount)}</td>
                      </>}
                      <td colSpan={4} className="border-l border-gray-200" />
                    </tr>
                  );

                  return (
                    <tr key={item.up_item_id} className="hover:bg-gray-50/50 transition-colors group">
                      <td className="border-r border-gray-100 px-3 py-2 text-gray-400 text-center align-top text-[11px]">{idx + 1}</td>
                      {!isNutr && (
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top">
                          <span className="font-mono text-[11px] text-gray-600">{item.aip_reference_code || <span className="text-gray-300">—</span>}</span>
                        </td>
                      )}
                      {isSect && <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={item.sector ?? ""} onSave={v => handleUpdate(item.up_item_id, "sector", v)} /></td>}
                      <td className="border-r border-gray-100 px-2 py-1.5 align-top font-medium text-gray-900">
                        <EditableCell value={item.program_description ?? ""} onSave={v => handleUpdate(item.up_item_id, "program_description", v)} multiline />
                      </td>
                      {isNutr && <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={item.nutrition_issue ?? ""} onSave={v => handleUpdate(item.up_item_id, "nutrition_issue", v)} multiline /></td>}
                      {isNutr && <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={item.nutrition_activity ?? ""} onSave={v => handleUpdate(item.up_item_id, "nutrition_activity", v)} multiline /></td>}
                      {isNutr && <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={item.nutrition_target ?? ""} onSave={v => handleUpdate(item.up_item_id, "nutrition_target", v)} /></td>}
                      <td className="border-r border-gray-100 px-2 py-1.5 align-top">
                        {item.implementing_office
                          ? <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[11px] font-medium border border-slate-200">{item.implementing_office}</span>
                          : <span className="text-gray-300 text-[11px]">—</span>}
                      </td>
                      {isFund && (
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top">
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border",
                            item.fund_source === "special_account" ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-blue-50 text-blue-700 border-blue-200")}>
                            {item.fund_source === "special_account" ? "Special" : "General"}
                          </span>
                        </td>
                      )}
                      {!isNutr && <>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top text-gray-500"><EditableCell value={item.start_date ?? ""} onSave={v => handleUpdate(item.up_item_id, "start_date", v)} /></td>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top text-gray-500"><EditableCell value={item.completion_date ?? ""} onSave={v => handleUpdate(item.up_item_id, "completion_date", v)} /></td>
                      </>}
                      {isSect && <>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top text-gray-500"><EditableCell value={item.target_output_aip ?? ""} onSave={v => handleUpdate(item.up_item_id, "target_output_aip", v)} /></td>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top text-gray-500"><EditableCell value={item.target_output_ab ?? ""} onSave={v => handleUpdate(item.up_item_id, "target_output_ab", v)} /></td>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.aip_amount} onSave={v => handleUpdate(item.up_item_id, "aip_amount", v)} /></td>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.ab_amount}  onSave={v => handleUpdate(item.up_item_id, "ab_amount",  v)} /></td>
                      </>}
                      {(isFund || isNutr) && <>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.ps_amount}   onSave={v => handleUpdate(item.up_item_id, "ps_amount",   v)} /></td>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.mooe_amount} onSave={v => handleUpdate(item.up_item_id, "mooe_amount", v)} /></td>
                        <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.co_amount}   onSave={v => handleUpdate(item.up_item_id, "co_amount",   v)} /></td>
                        <td className="border-r border-gray-100 px-3 py-2 align-top text-right font-mono tabular-nums text-gray-700 font-semibold">
                          {item.total_amount > 0 ? fmt(item.total_amount) : <span className="text-gray-300">—</span>}
                        </td>
                      </>}
                      <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.cc_adaptation} onSave={v => handleUpdate(item.up_item_id, "cc_adaptation", v)} /></td>
                      <td className="border-r border-gray-100 px-2 py-1.5 align-top"><AmountCell value={item.cc_mitigation}  onSave={v => handleUpdate(item.up_item_id, "cc_mitigation",  v)} /></td>
                      <td className="border-r border-gray-100 px-2 py-1.5 align-top"><EditableCell value={item.cc_typology_code ?? ""} onSave={v => handleUpdate(item.up_item_id, "cc_typology_code", v)} /></td>
                      <td className="px-1.5 py-1.5 align-top">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                              <MoreHorizontalIcon className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem className="text-xs" onClick={() => openEdit(item)}>Edit</DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50 text-xs" onClick={() => setDeleteTarget(item)}>Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {dataItems.length > 0 && (
                <tfoot>
                  <tr className="bg-gray-900 text-white">
                    <td colSpan={isSect ? 4 : isNutr ? 4 : 5} className="px-3 py-2.5 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500">Total</td>
                    {isSect && <>
                      {/* 5 blanks: Office, Start, End, Target(AIP), Target(AB) */}
                      <td className="px-3 py-2.5" /><td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5" /><td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{fmt(totals.aip)}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{fmt(totals.ab)}</td>
                    </>}
                    {(isFund || isNutr) && <>
                      {/* fund: 2 blanks (Start, End) | nutr: 2 blanks (Target, Office) */}
                      <td className="px-3 py-2.5" /><td className="px-3 py-2.5" />
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{totals.ps > 0 ? fmt(totals.ps) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{totals.mooe > 0 ? fmt(totals.mooe) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{totals.co > 0 ? fmt(totals.co) : <span className="text-gray-600">—</span>}</td>
                      <td className="px-3 py-2.5 text-right font-mono font-semibold tabular-nums border-l border-gray-700">{fmt(totals.total)}</td>
                    </>}
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums border-l border-gray-700 text-gray-400">{totals.ccAdapt > 0 ? fmt(totals.ccAdapt) : <span className="text-gray-600">—</span>}</td>
                    <td className="px-3 py-2.5 text-right font-mono tabular-nums border-l border-gray-700 text-gray-400">{totals.ccMitig > 0 ? fmt(totals.ccMitig) : <span className="text-gray-600">—</span>}</td>
                    <td colSpan={2} className="border-l border-gray-700" />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        )}
      </div>

      {/* ── Legend ─────────────────────────────────────────────────────────── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        {isFund && <>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-50 border border-blue-200 inline-block" /><span className="text-blue-600 font-semibold">Blue</span> = General Fund</span>
          <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-50 border border-amber-200 inline-block" /><span className="text-amber-600 font-semibold">Amber</span> = Special Account</span>
        </>}
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-100 border border-red-200 inline-block" /><span className="text-red-600 font-semibold">Red</span> = Duplicate (import preview)</span>
        <span className="ml-auto">Click any cell to edit · Changes auto-save</span>
      </div>

      {/* ── Dialogs ─────────────────────────────────────────────────────────── */}
      <WrongTemplateDialog
        open={!!wrongTemplate}
        onClose={() => setWrongTemplate(null)}
        detectedType={wrongTemplate?.detectedType ?? null}
        expectedMeta={meta}
      />

      <ImportPreview
        open={previewOpen} onOpenChange={setPreviewOpen}
        rows={previewRows} onRowsChange={setPreviewRows}
        onConfirm={handleConfirmImport} importing={importing}
        variant={meta.variant}
      />

      <ItemDialog
        open={dialogOpen} onOpenChange={setDialogOpen}
        initialForm={dialogForm} departments={departments} aipPrograms={aipPrograms}
        onSubmit={handleSubmit} submitting={submitting}
        editMode={!!editTarget} meta={meta}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Delete item?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{deleteTarget?.program_description}</span> will be permanently removed.
            </AlertDialogDescription>
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