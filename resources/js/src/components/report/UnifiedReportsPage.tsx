import React, { useState, useEffect, useCallback, useRef } from 'react';
import { toast } from 'sonner';
import { Button }   from '@/src/components/ui/button';
import { Input }    from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Label }    from '@/src/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { Checkbox } from '@/src/components/ui/checkbox';
import { Badge }    from '@/src/components/ui/badge';
import { Separator }from '@/src/components/ui/separator';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import {
  Download, Eye, FileText, Loader2, RefreshCw, Package,
  ChevronDown, ChevronRight, BookOpen, ClipboardList,
  Settings2, Save, RotateCcw, Check,
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import API from '@/src/services/api';
import { useAuth } from '@/src/hooks/useAuth';
import { PdfGenerationLoader } from '@/src/components/report/PdfGenerationLoader';
import { useIsMobile } from '@/src/hooks/use-mobile';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface BudgetPlan  { budget_plan_id: number; year: number; is_active: boolean; }
export interface Department  { dept_id: number; dept_name: string; dept_abbreviation: string; }
export interface FilterOption { value: string; label: string; }

// ─── ABP Form definitions ─────────────────────────────────────────────────────

const FORM_DEFS = [
  { id: 'form1',       label: 'LBP Form No. 1',        desc: 'Budget of Expenditures & Sources of Financing (B.E.S.F.)', orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
  { id: 'summary',     label: 'Summary of Expenditures',desc: 'Summary of Expenditures by Office (General Fund)',         orientation: 'portrait'  as const, needsScope: false, needsDept: false },
  { id: 'form5',       label: 'LBP Form No. 5',        desc: 'Statement of Indebtedness',                                orientation: 'landscape' as const, needsScope: false, needsDept: false },
  { id: 'form6',       label: 'LBP Form No. 6',        desc: 'Statement of Statutory and Contractual Obligations',       orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
  { id: 'form7',       label: 'LBP Form No. 7',        desc: 'Statement of Fund Allocation by Sector',                  orientation: 'portrait'  as const, needsScope: true,  needsDept: false },
  { id: 'pscomputation',label: 'PS Computation',        desc: 'Personnel Services Computation (GF)',                     orientation: 'portrait'  as const, needsScope: false, needsDept: false },
  { id: 'mdf20',       label: '20% MDF Report',         desc: '20% Municipal Development Fund',                          orientation: 'portrait'  as const, needsScope: false, needsDept: false },
  { id: 'calamity5',   label: '5% Calamity Fund',       desc: 'LDRRMF Investment Plan (General Fund & Special Accounts)',orientation: 'landscape' as const, needsScope: true,  needsDept: false },
  { id: 'form2',       label: 'LBP Form No. 2',        desc: 'Programmed Appropriation by Object of Expenditures',      orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
  { id: 'form2a',      label: 'LBP Form No. 2A',       desc: 'Programmed Appropriation — Special Purpose Appropriations (AIP + LDRRMF)', orientation: 'portrait' as const, needsScope: false, needsDept: true  },
  { id: 'form3',       label: 'LBP Form No. 3',        desc: 'Plantilla of Personnel',                                  orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
  { id: 'form4',       label: 'LBP Form No. 4',        desc: 'Annual Investment Program (Special Programs)',             orientation: 'portrait'  as const, needsScope: false, needsDept: true  },
  {
    id:          'consolidated_sa_income',
    label:       'Consolidated SA Income',
    desc:        'Consolidated Estimated Income — Special Accounts (MEEO, SH, OCC)',
    orientation: 'landscape' as const,
    needsScope:  false,
    needsDept:   false,
  },
] as const;

type FormId = typeof FORM_DEFS[number]['id'];

// ─── LEP Form definitions ─────────────────────────────────────────────────────

type LepFormId =
  | 'consolidated_plantilla'
  | 'receipts_program'
  | 'lep_form2'
  | 'lep_pscomputation'
  | 'lep_mdf20'
  | 'lep_form6'
  | 'lep_form7'
  | 'lep_consolidated_calamity5';

const LEP_FORM_DEFS: ReadonlyArray<{
  id:          LepFormId;
  label:       string;
  desc:        string;
  orientation: 'portrait' | 'landscape';
  endpoint:    string;
  needsDept:   boolean;
  needsFilter: boolean;
}> = [
  {
    id:          'consolidated_plantilla',
    label:       'PART I: Consolidated Plantilla of Personnel',
    desc:        'All departments — General Fund + Special Accounts',
    orientation: 'portrait',
    endpoint:    '/reports/lep/consolidated-plantilla',
    needsDept:   false,
    needsFilter: false,
  },
  {
    id:          'receipts_program',
    label:       'Part II: Receipts Program',
    desc:        'General Fund & Special Accounts income',
    orientation: 'portrait',
    endpoint:    '/reports/lep/receipts-program',
    needsDept:   false,
    needsFilter: false,
  },
 {
    id:          'lep_form2',
    label:       'Part III: Appropriations by Office',
    desc:        'Programmed Appropriation & Obligation by Object of Expenditures',
    orientation: 'portrait',
    endpoint:    '/reports/lep/form2',
    needsDept:   true,
    needsFilter: false,
  },
  {
    id:          'lep_pscomputation',
    label:       'PART IV: PS Computation',
    desc:        'Personnel Services Computation (General Fund)',
    orientation: 'portrait',
    endpoint:    '/reports/lep/pscomputation',
    needsDept:   false,
    needsFilter: false,
  },
  {
    id:          'lep_mdf20',
    label:       'PART V: 20% Municipal Development Fund',
    desc:        '20% MDF — obligation programs and debt service',
    orientation: 'portrait',
    endpoint:    '/reports/lep/mdf20',
    needsDept:   false,
    needsFilter: false,
  },
  {
    id:          'lep_form7',
    label:       'PART VI: Summary of Appropriations by Sector',
    desc:        'Part VI — New Appropriations by Object of Expenditures and by Sector',
    orientation: 'portrait',
    endpoint:    '/reports/lep/form7',
    needsDept:   false,
    needsFilter: false,
  },
  {
    id:          'lep_form6',
    label:       'PART VII: Statement of Statutory Obligations',
    desc:        'Statutory & Contractual Obligations and Budgetary Requirements',
    orientation: 'portrait',
    endpoint:    '/reports/lep/form6',
    needsDept:   false,
    needsFilter: true,
  },

  {
    id:          'lep_consolidated_calamity5' as LepFormId,
    label:       'PART VIII: 5% Calamity Fund — SA Consolidated',
    desc:        'All Special Accounts LDRRMF plan, side-by-side',
    orientation: 'landscape' as const,
    endpoint:    '/reports/lep/consolidated-calamity5',
    needsDept:   false,
    needsFilter: false,
  },
];

// ─── LEP Header fields ────────────────────────────────────────────────────────

interface LepHeaderFields {
  province: string; municipality: string; office_name: string; office_subtitle: string;
  ordinance_session: string; session_date_text: string;
  ordinance_number: string; ordinance_title: string; introduced_by: string;
}

// ─── ABP endpoint resolver ────────────────────────────────────────────────────

function endpointFor(forms: FormId[]): string {
  if (forms.includes('form1')         && forms.length === 1) return '/reports/unified/form1';
  if (forms.includes('form5')         && forms.length === 1) return '/reports/unified/form5';
  if (forms.includes('summary')       && forms.length === 1) return '/reports/unified/summary';
  if (forms.includes('form6')         && forms.length === 1) return '/reports/unified/form6pdf';
  if (forms.includes('form7')         && forms.length === 1) return '/reports/unified/form7pdf';
  if (forms.includes('pscomputation') && forms.length === 1) return '/reports/unified/pscomputationpdf';
  if (forms.includes('mdf20')         && forms.length === 1) return '/reports/unified/mdf20pdf';
  if (forms.includes('calamity5')     && forms.length === 1) return '/reports/unified/calamity5pdf';
  if (forms.includes('consolidated_sa_income') && forms.length === 1)
    return '/reports/unified/consolidated-sa-income-pdf';
  const deptForms = forms.filter(f => ['form2','form2a','form3','form4'].includes(f));
  if (deptForms.length === forms.length) return '/reports/unified/dept';
  return '';
}

// ═════════════════════════════════════════════════════════════════════════════
// LEP HEADER EDITOR
// ═════════════════════════════════════════════════════════════════════════════

const LepHeaderEditor: React.FC<{
  budgetPlanId: string;
  onSaved?: () => void;
}> = ({ budgetPlanId, onSaved }) => {

  const EMPTY: LepHeaderFields = {
    province: '', municipality: '', office_name: '', office_subtitle: '',
    ordinance_session: '', session_date_text: '',
    ordinance_number: '', ordinance_title: '', introduced_by: '',
  };

  const [fields,   setFields]   = useState<LepHeaderFields>(EMPTY);
  const [original, setOriginal] = useState<LepHeaderFields>(EMPTY);
  const [loading,  setLoading]  = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [dirty,    setDirty]    = useState(false);

  const load = useCallback(async () => {
    if (!budgetPlanId) return;
    setLoading(true);
    try {
      const res = await API.get(`/reports/lep/header-settings/${budgetPlanId}`);
      const d   = res.data.data ?? {};
      const f: LepHeaderFields = {
        province:          d.province          ?? '',
        municipality:      d.municipality      ?? '',
        office_name:       d.office_name       ?? '',
        office_subtitle:   d.office_subtitle   ?? '',
        ordinance_session: d.ordinance_session ?? '',
        session_date_text: d.session_date_text ?? '',
        ordinance_number:  d.ordinance_number  ?? '',
        ordinance_title:   d.ordinance_title   ?? '',
        introduced_by:     d.introduced_by     ?? '',
      };
      setFields(f);
      setOriginal(f);
      setDirty(false);
    } catch {
      toast.error('Failed to load header settings');
    } finally {
      setLoading(false);
    }
  }, [budgetPlanId]);

  useEffect(() => { load(); }, [load]);

  const set = (key: keyof LepHeaderFields) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setFields(prev => ({ ...prev, [key]: e.target.value }));
      setDirty(true);
    };

  const handleReset = () => { setFields(original); setDirty(false); };

  const handleSave = async () => {
    if (!budgetPlanId || saving) return;
    setSaving(true);
    try {
      await API.put(`/reports/lep/header-settings/${budgetPlanId}`, fields);
      setOriginal(fields);
      setDirty(false);
      toast.success('Header settings saved');
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? err?.response?.data?.error ?? 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-zinc-300" />
      </div>
    );
  }

  type FieldCfg = { key: keyof LepHeaderFields; label: string; hint?: string; multiline?: boolean; rows?: number; };

  const SECTIONS: { title: string; fields: FieldCfg[] }[] = [
    {
      title: 'Letterhead',
      fields: [
        { key: 'province',        label: 'Province' },
        { key: 'municipality',    label: 'Municipality' },
        { key: 'office_name',     label: 'Office Name' },
        { key: 'office_subtitle', label: 'Office Subtitle' },
      ],
    },
    {
      title: 'Ordinance Header',
      fields: [
        { key: 'ordinance_session',  label: 'Session',           hint: 'e.g. 2ND SPECIAL SESSION' },
        { key: 'session_date_text',  label: 'Session Date Text', multiline: true, rows: 3 },
        { key: 'ordinance_number',   label: 'Ordinance Number',  hint: 'e.g. APPROPRIATION ORDINANCE NO. 2025 - ___' },
        { key: 'ordinance_title',    label: 'Ordinance Title',   multiline: true, rows: 3 },
        { key: 'introduced_by',      label: 'Introduced By',     hint: 'Name of SB member(s)' },
      ],
    },
  ];

  return (
    // FIX: overflow-y-auto here so the header editor itself scrolls inside the right panel
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-6">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          LEP Ordinance Header Settings
        </p>
        <div className="flex gap-2">
          {dirty && (
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
              <RotateCcw className="h-3 w-3" />Reset
            </Button>
          )}
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty || saving}>
            {saving
              ? <><Loader2 className="h-3 w-3 animate-spin" />Saving…</>
              : <><Save className="h-3 w-3" />Save Changes</>}
          </Button>
        </div>
      </div>

      {SECTIONS.map(sec => (
        <section key={sec.title}>
          <h3 className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-3">{sec.title}</h3>
          <div className="space-y-3">
            {sec.fields.map(cfg => (
              <div key={cfg.key}>
                <Label htmlFor={`lep-hdr-${cfg.key}`} className="text-xs font-semibold text-zinc-700 mb-1 block">
                  {cfg.label}
                </Label>
                {cfg.hint && <p className="text-[10px] text-zinc-400 mb-1">{cfg.hint}</p>}
                {cfg.multiline
                  ? <Textarea id={`lep-hdr-${cfg.key}`} value={fields[cfg.key]} onChange={set(cfg.key)} rows={cfg.rows ?? 2} className="text-xs resize-y" />
                  : <Input    id={`lep-hdr-${cfg.key}`} value={fields[cfg.key]} onChange={set(cfg.key)} className="h-8 text-xs" />}
              </div>
            ))}
          </div>
        </section>
      ))}
      <div className="h-8" />
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// PERSONNEL AMELIORATION EDITOR
// ═════════════════════════════════════════════════════════════════════════════

const PA_STORAGE_KEY   = 'lep_personnel_amelioration_content';
const AP_STORAGE_KEY   = 'lep_administrative_procedures_content';
const SP20_STORAGE_KEY = 'lep_sp_20mdf_content';
const SP5_STORAGE_KEY  = 'lep_sp_calamity5_content';
const SPA_STORAGE_KEY  = 'lep_sp_appropriation_content';
const GP_STORAGE_KEY   = 'lep_general_provisions_content';

// Same content as the backend blade's default — shown in the editor on
// first load so the user sees (and can edit) real text instead of a blank box.
const PA_DEFAULT_HTML = `
<div style="text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin-bottom:10px;">PERSONNEL AMELIORATION</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>1.</span> <span style="font-weight:bold;text-decoration:underline;">Salary Standardization Law 2024 : 1st Tranche ; and Step Increment.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p><span style="font-weight:bold;text-decoration:underline;">Mun. Department Heads.</span> All positions having the salary grade of 22 to 24 are considered as Department Heads and therefor are entitled to RATA &amp; other authorized benefits.</p>
    <p><span style="font-weight:bold;text-decoration:underline;">Salary Standardization 2024.</span> The salary standardization of Officials and Personnel is adopted pursuant to the Department of Budget and Management Executive Order No. 64 2nd Tranche with re-allocation of position using the 1st Class Category.</p>
    <p><span style="font-weight:bold;text-decoration:underline;">Hazard Pay of Mun. Health Workers and SWM Garbage Collectors.</span> Partially implementing Hazard Pay at 10% of 25% of their basic pay for Health workers and SWM Garbage Colectors effective January 1, 2026.</p>
    <p><span style="font-weight:bold;text-decoration:underline;">Step Increment.</span> The step increment is granted to all permanent employees based on the length of service pursuant to the Joint CSC-DBM Cir. No. 1, S. 1990 and Joint Senate-House Resolution No. 1, S. 1994.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>2.</span> <span style="font-weight:bold;text-decoration:underline;">Funding of Personnel Benefits.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The personnel benefits cost of the Municipal officials and employees shall be charged against the funds from which their compensations are paid. All authorized supplemental or additional compensation, fringe benefits and other personal services cost of officials and employees whose salaries are drawn from Special Accounts or Special Funds, such as salary increases, step increment for length of service, incentive and service fees, commutation of vacation and sick leaves, retirements and life insurance premiums, compensation insurance premiums, health insurance premiums, HDMF contribution, hospitalization and medical benefits, scholarships and education benefits, training and seminar expenses, all kinds of allowances, whether commutable of reimbursable, in cash or in kind, and other personnel benefits and previleges authorized by law, including the payment of retirement gratuities, separation pay and terminal leave benefits, shall similarly be charged against the corresponding fund which their basic salaries are drawn. In no case shall such personnel benefits costs be charged against other fund of the Municipality.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>3.</span> <span style="font-weight:bold;text-decoration:underline;">Authorized Deductions.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Deductions from salaries, emulments or other benefit of, government employees chargeable against the appropriations for personal services may be allowed for the payment of individual employees contributions or obligations due. PROVIDED, That in the event the total authorized deductions the net take home pay is less than Three Thousand Pesos (Php 3,000.00), authorized deductions for GSIS Insurance &amp; Loans shall enjoy first preference, Philhealth shall enjoy second preference, Pag-Ibig Contributions &amp; Loans, third, BIR Witholding Tax, 4th and Private Inst. 5th.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>4.</span> <span style="font-weight:bold;text-decoration:underline;">13th Month and 14th Month Bonus and Cash Gifts.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The appropriations provided for the 13th and 14th month bonus of one (1) month bonus pursuant to E.O. 201 basic salary and additional cash gift of Five Thousand (Php 5,000.00) provided under R.A. No. 6686, as amended by R.A. No. 8441, is granted, except to job-order workers, to all Municipal Officials and employees whether under permanent basis. All other employees under contractual basis and have rendered at least a total of four (4) months of government service including leaves of absence with pay from January 1 to October 31 of each year, and who are still in the service as of October 31 of the same year shall also be entitled for a bonus of not less than five thousand pesos (P5,000.00) PROVIDED, That such fund is available at the end of each budget year and is subject to the implementing rules and regulations of the DBM.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>5.</span> <span style="font-weight:bold;text-decoration:underline;">Travelling Expenses.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Officials and employees of the government may be allowed full payment of claims for reimbursements of travelling and related expenses incurred in the course of travel, certified by the head of agency concerned as absolutely necessary in the performance of an assignment and supported by receipts, chargeable to the allotment for travelling expenses under their respective offices approved budget and shall not exceed on the quarterly release of the PPMP.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>6.</span> <span style="font-weight:bold;text-decoration:underline;">Representation &amp; Transportation Allowances.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The following officials and those of equivalent rank as may be determined by the DBM, while in the actual performance of their respective function, are hereby granted monthly commutable representation and transportation allowances payable from the programmed appropriations provided for their respective offices not exceeding the rates indicated below for 1st Class Municipality, (DBM LBC No. 157 dated May 03, 2024)</p>
    <table style="margin:4px 0 2px 22px;border-collapse:collapse;">
      <tr><td style="width:22px;font-weight:bold;padding:1px 6px 1px 0;">(a).</td><td style="width:70px;font-weight:bold;padding:1px 6px 1px 0;">Php&nbsp;9,000.00</td><td style="width:190px;padding:1px 6px 1px 0;">Municipal Mayor</td><td style="padding:1px 6px 1px 0;">Salary Grade&nbsp;-&nbsp;27</td></tr>
      <tr><td style="font-weight:bold;padding:1px 6px 1px 0;">(b).</td><td style="font-weight:bold;padding:1px 6px 1px 0;">Php&nbsp;8,550.00</td><td style="padding:1px 6px 1px 0;">Vice-Mayor</td><td style="padding:1px 6px 1px 0;">Salary Grade&nbsp;-&nbsp;25</td></tr>
      <tr><td style="font-weight:bold;padding:1px 6px 1px 0;">(c).</td><td style="font-weight:bold;padding:1px 6px 1px 0;">Php&nbsp;7,650.00</td><td style="padding:1px 6px 1px 0;">SB Member/Department Head</td><td style="padding:1px 6px 1px 0;">Salary Grade&nbsp;-&nbsp;24</td></tr>
      <tr><td style="font-weight:bold;padding:1px 6px 1px 0;">(d).</td><td style="font-weight:bold;padding:1px 6px 1px 0;">Php&nbsp;5,400.00</td><td style="padding:1px 6px 1px 0;">Assistant Department Head</td><td style="padding:1px 6px 1px 0;">Salary Grade&nbsp;-&nbsp;22</td></tr>
    </table>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>7.</span> <span style="font-weight:bold;text-decoration:underline;">Employment of Contractual (Job-Order/Emergency) Personnel.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The LGU may hire contractual personnel as part of the organization to perform regular agency functions and specific vital activities or services which cannot be provided by the regular or permanent staff. The contractual (Job-Order/Emergency) personnel employed pursuant to this section shall be considered as an employee of the LGU, limited to the period/year when their services are reasonably required and may be subject to quarterly renewal.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>8.</span> <span style="font-weight:bold;text-decoration:underline;">Uniform and Clothing Allowance.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The appropriations provided for each office may be used for uniform clothing allowance of regular/co-terminus employees only, who have rendered at least six months service, at not more than Seven Thousand Pesos (Php 7,000.00) each annum which may be given in cash or in kind.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>9.</span> <span style="font-weight:bold;text-decoration:underline;">Entitlement to Personnel Economic Relief Allowance, (PERA).</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The Personnel Economic Relief Allowance (PERA) in the amount of Five Hundred Pesos (Php 500.00) per month shall now be Two Thousand Pesos (Php 2,000.00) to all appointed and elective Local Government employees occupying itemized plantilla positions, per Budget Circular No. 2009-3, dated August 18, 2009.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>10.</span> <span style="font-weight:bold;text-decoration:underline;">Additional Compensation Allowance.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>(ACA/ADCOM) Php 1,500.00 per month pursuant to A.O. 144 and Budget Circular No. 2006-2 dated March 2, 2006 shall now be consolidated with the PERA of Five Hundred Pesos (Php 500.00), per Budget Circular No. 2009-3, dated August 18, 2009. It shall be paid on actual service rendered on an 8-hour, 22-working-day-month basis. Suspended employees/officials are not entitled unless exonerated with the charges.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>11.</span> <span style="font-weight:bold;text-decoration:underline;">Appropriation for Retirement Gratuity and Terminal Leave.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Appropriations authorized in this Act to cover retirement gratuity benefit claims shall be released directly to the concerned retiring personnel upon approval by the GSIS of one's application for retirement. In no other case shall payment be made, except on the basis of creditable service as computed by the GSIS in accordance with the provisions of existing retirement Laws.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>12.</span> <span style="font-weight:bold;text-decoration:underline;">Appropriation for Annual Medical Allowance.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The P7,000.00 benefit for LGU introduced under E.O. 64 obtained via DBM Circular No. 2024-6.</p>
  </div>
</div>

<div style="text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin:14px 0 8px 0;page-break-before:always;">RELEASE AND USE OF FUNDS:</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>1.</span> <span style="font-weight:bold;text-decoration:underline;">Use of Savings.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The LGU is hereby authorized to augment any item in these appropriations from savings in other items of the LGU appropriations.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>2.</span> <span style="font-weight:bold;text-decoration:underline;">Meaning of Savings and Augmentation.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Savings refer to portions or balances of any programmed appropriation free from any obligation or encumbrance which are: (i) still available after the completion or final discontinuance or abandonment of the work, activity or purpose for which the appropriation is authorized; (ii) from appropriation balances realized from the implementation of collective negotiation agreements, which resulted in improved system and efficiences and thus enabled an agency to meet and deliver the required or planned targets, programs and services approved in this Act at a lesser cost.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>4.</span> <span style="font-weight:bold;text-decoration:underline;">Augmentation of Personal Services (PS).</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The LGU thru the Municipal Budget Officer, may augment an item of expenditure within Personal Services (PS) as urgent need arises so as not to hamper the operation and function of such office or department without prior approval from the local legislature, except intelligence and confidential fund.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>5.</span> <span style="font-weight:bold;text-decoration:underline;">Augmentation of Maintenance and Other Operating Expenses Item.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The LGU thru the Municipal Budget Officer, may augment an item of expenditure within MOOE from savings in other items of MOOE without prior approval from the local legislature, except intelligence and confedential fund.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>6.</span> <span style="font-weight:bold;text-decoration:underline;">Augmentation of Special Purpose Appropriations.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The LGU thru the Municipal Budget Officer, may augment an item of expenditure from SPA within the same Office and be augmented to existing program of the same Office only without prior approval from local legislature provided that the concerned department shall secure a request for augmentation and duly approved by the LCE.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>7.</span> <span style="font-weight:bold;text-decoration:underline;">Realignment/Relocation of Capital Outlays.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The amount appropriated in this Act for acquisition, construction, replacement, rehabilitation and completion of various capital outlays may be automatically realigned/relocated in cases of imbalance allocation of projects, duplication of projects, overlapping of funding source and similar. PROVIDED, that it shall only be done thru the Municipal Budget Officer to fast track implementation of projects by the Local Chief Executive.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>8.</span> <span style="font-weight:bold;text-decoration:underline;">Availability of Appropriation.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Appropriations for MOOE and Capital Outlays authorized in this provision shall be available for release and obligation for the purpose specified, and under the same special provision applicable thereto, for a period extending to one Fiscal Year after the end of the year in which such items were appropriated. PROVIDED, That a report of these releases and obligations shall be submitted to the Committee on Finance of the Sangguniang Bayan and to the Municipal Finance Committee.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>9.</span> <span style="font-weight:bold;text-decoration:underline;">Disbursements of Funds.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>All appropriated funds shall be disbursed in accordance with Appropriation Ordinance. Checks must be drawn by the Municipal Treasurer countersigned by the Municipal Mayor, or, Municipal Vice-Mayor for expenditures appropriated for the operation of the sangguniang Bayan on duly approved disbursement vouchers.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>10.</span> <span style="font-weight:bold;text-decoration:underline;">Limitations on Cash Advance/Reportorial Requirements.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Notwithstanding any provision of law to the contrary, it is hereby declared not to grant cash advances until such time that the earlier cash advances availed of by the officials or employees concerned shall have been already liquidated pursuant to pertinent accounting and auditing rules and regulations, as certified by the head of agency concerned and the COA Auditor.</p>
  </div>
</div>
`;

const AP_DEFAULT_HTML = `
<div style="text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin-bottom:10px;">ADMINISTRATIVE PROCEDURES</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>1.</span> <span style="font-weight:bold;text-decoration:underline;">Organizational and Staffing Pattern Changes.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Unless otherwise directed by the Local Chief Executive, no organizational changes in key positions in any office shall be authorized in their respective organizational structures and staffing patterns and funded from appropriations provided under this Act.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>2.</span> <span style="font-weight:bold;text-decoration:underline;">Service Contracts.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>LGU is hereby authorized to enter into service contracts, with other government agencies, private firms or individuals and non-government organizations for services related or incidental to their respective functions, whether on part-time or full-time basis.</p>
    <p>Service contracts may be entered into by the agency for professional consultancy services, which may include contracts with individual professional consultants who are experts in a field of special knowledge requiring highly specialized or technical expertise which cannot be provided by the regular staff of the agency. Such hiring creates no employer-employee relationship between the individual professional consultant and the LGU. The DBM, in coordination with other agencies concerned, shall issue the necessary guidelines governing professional consultancy services.</p>
    <p>Service contracts may also be entered into by the LGU for janitorial, security and other related services, whenever practicable and cost-effective for the government.</p>
    <p>Service contracts shall be entered into by the LGU through Public Bidding or other alternative methods of procurement in accordance with R.A. No. 9184 and its Implementing Rules and Regulations, subject to pertinent accounting and auditing rules and regulations.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>3.</span> <span style="font-weight:bold;text-decoration:underline;">Implementation of Infrastructure Project.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>In the hiring of workers needed for the implementation of infrastructure projects, priority shall be given to disadvantaged residents of the LGUs where the project is located.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>4.</span> <span style="font-weight:bold;text-decoration:underline;">Electronic Interconnection.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Through the Internet and E-Commerce Application, the LGU or any of its Offices may use existing appropriations to install an electronic "on-line" network to facilitate the open, speedy and efficient electronic "on-line" transmission, conveyance and use of electronic data messages or electronic documents consistent with R.A. No. 8792, or the E-Commerce Act. The appropriations made possible for the E-Commerce application may be used in the acquisition of computer equipment, preferably on a lease basis, whenever applicable.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>5.</span> <span style="font-weight:bold;text-decoration:underline;">Strict Adherence to Procedures, Laws, Rules and Regulations.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>In the procurement of infrastructure projects, goods and consulting services, strict adherence to the provisions of R.A. No. 9184 and its Implementing Rules and Regulations (IRR) shall be observed: PROVIDED, that the Government Electronic Procurement System (G-EPS) shall be used as the primary source of information, pursuant to R.A. No. 9184 and its IRR.</p>
    <p>Consistent with the policy of transparency and to achieve efficiency in the procurement of common use goods: PROVIDED, FURTHER, That all Invitations to Apply for Eligibility and to Bid, Notice of Award, and all other procurement-related notices shall be posted in the G-EPS Electronic Bulletin Board in accordance with the IRR of R.A. No. 9184, regardless of the method of procurement used.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>6.</span> <span style="font-weight:bold;text-decoration:underline;">Submission of Quarterly Financial and Narrative Accomplishment Reports.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Within thirty (30) days after the end of each quarter, the Municipality shall submit a quarterly financial and narrative accomplishment report to the Sangguniang Bayan, copy furnished the DBM, the COA, and the Finance Committee Chairman of the Sangguniang Bayan. The financial report shall show the cumulative allotments, obligations incurred/liquidated, total disbursements, unliquidated obligations, unobligated and unexpended balances, and the results of expended appropriations.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>7.</span> <span style="font-weight:bold;text-decoration:underline;">Nationally Funded Projects.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Pursuant to Sec. 17 (c) of R.A. 7160, or the Local Government Code of 1991, projects, facilities, programs and services funded by the National Government or Agency shall be under a Memorandum of Agreement entered into between the National Government agency and this Municipality, the beneficiary Local Government, designating the latter to undertake the project or activity.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>8.</span> <span style="font-weight:bold;text-decoration:underline;">Separability Clause.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>If for any reason, any section or provision of this Act is declared unconstitutional or invalid, other sections or provisions hereof which are not affected thereby shall continue to be in full force and effect.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>9.</span> <span style="font-weight:bold;text-decoration:underline;">Mun. Economic Enterprise (MEE) and Mun. Public Utilities.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Pursuant to Section 17 (b) of R.A. 7160, this LGU hereby maintains Economic Enterprises, Opol Community College (OCC), Public Market and Slaughterhouse to generate additional revenue and increase its sources of income.</p>
    <table style="margin:4px auto;border-collapse:collapse;">
      <tr><td style="width:18px;font-weight:bold;padding:1px 6px 1px 0;">I.</td><td style="font-weight:bold;padding:1px 6px 1px 0;">Opol Community College, (OCC)</td></tr>
      <tr><td></td><td style="padding-left:12px;">1. School Tuition Fee</td></tr>
      <tr><td></td><td style="padding-left:12px;">2. Other School Fees</td></tr>
      <tr><td style="font-weight:bold;padding:1px 6px 1px 0;">II.</td><td style="font-weight:bold;padding:1px 6px 1px 0;">Mun. Public Market</td></tr>
      <tr><td></td><td style="padding-left:12px;">1. Receipts from Market</td></tr>
      <tr><td></td><td style="padding-left:12px;">2. Parking Fee</td></tr>
      <tr><td style="font-weight:bold;padding:1px 6px 1px 0;">III.</td><td style="font-weight:bold;padding:1px 6px 1px 0;">Mun. Slaughterhouse</td></tr>
      <tr><td></td><td style="padding-left:12px;">1. Slaughtering Fee</td></tr>
    </table>
  </div>
</div>
`;

const AdministrativeProceduresEditor: React.FC<{
  budgetPlanId: string;
}> = ({ budgetPlanId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(AP_STORAGE_KEY);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved !== null ? saved : AP_DEFAULT_HTML;
    }
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSave = () => {
    if (!editorRef.current) return;
    try {
      localStorage.setItem(AP_STORAGE_KEY, editorRef.current.innerHTML);
      setDirty(false);
      setStatus('Saved to this browser ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Save failed (storage full or blocked)');
    }
  };

  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const marker = document.createElement('div');
    marker.style.pageBreakBefore = 'always';
    marker.style.height = '0';
    marker.setAttribute('data-page-break', 'true');
    marker.innerHTML = '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(marker);
    } else {
      editorRef.current.appendChild(marker);
    }
    setDirty(true);
    toast.success('Page break inserted at cursor');
  };

  const handleReset = () => {
    if (!confirm('Discard local edits and restore the original text?')) return;
    localStorage.removeItem(AP_STORAGE_KEY);
    if (editorRef.current) editorRef.current.innerHTML = AP_DEFAULT_HTML;
    setDirty(false);
    toast.success('Reset — original text will be used on next PDF generation');
  };

  const getContent = (): string | undefined => {
    return editorRef.current?.innerHTML || undefined;
  };

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const response = await API.post('/reports/lep/administrative-procedures', null, {
      params: {
        budget_plan_id: budgetPlanId || undefined,
        content: getContent(),
        download: download ? 1 : undefined,
        _: Date.now(),
      },
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    return response.data as Blob;
  }, [budgetPlanId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'LEP_AdministrativeProcedures.pdf',
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download');
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Administrative Procedures — Editable Text
        </p>
        <div className="flex items-center gap-2">
          {status && <span className="text-[11px] text-zinc-500">{status}</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleInsertPageBreak}>
            Insert Page Break
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />Reset
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty}>
            <Save className="h-3 w-3" />Save Locally
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400">
        Edits are saved only in this browser (not on the server). Click "Save Locally" to keep
        them, or they'll be lost on refresh. Generating a PDF always uses your current saved text.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setDirty(true)}
        className="rounded-lg border border-zinc-300 bg-white p-4 text-xs leading-relaxed
                   min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={loadingDl}>
          {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
        </Button>
      </div>

      {previewUrl && (
        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[600px] border border-zinc-200 rounded-lg mt-2" title="Administrative Procedures Preview" />
      )}

      <div className="h-8" />
    </div>
  );
};

const SP_20MDF_DEFAULT_HTML = `
<div style="text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin-bottom:10px;">SPECIAL PROVISIONS: 20% MUNICIPAL DEVELOPMENT FUND, CY 2027</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span style="font-weight:bold;text-decoration:underline;">Use and Release of Fund.</span>
  <div style="margin-top:2px;">
    <p>The 20% Development Fund shall be strictly utilized in accordance with the general policies prescribed under DBM-Department of Finance-DILG JMC No. 1 dated November 4, 2020, and for the projects included in the approved AIP of the LGU for FY 2026. The development projects identified shall be consistent with the local development plan duly approved by the Local Development Council and local sanggunian. The disbursement of this fund shall be based on the approved Project Procurement Management Plan for FY 2026, and shall be subject to all existing budgeting, accounting, and auditing laws, rules, and regulations.</p>
  </div>
</div>

<div style="font-weight:bold;font-size:7.5pt;text-transform:uppercase;margin:10px 0 6px 0;">GENERAL PROVISION</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>1.</span> In accordance with Section 287 of RA No. 7160, every LGU shall appropriate in its annual budget no less than twenty percent (20%) of its annual IRA for development projects.
</div>
<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>2.</span> The 20% Development Fund shall be utilized to finance the LGU's priority development projects, as embodied in its duly approved local development plans and Annual Investment Program (AIP), which should be directly supportive of the Philippine Development Plan and Public Investment Program.
</div>
<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>3.</span> All development projects to be funded under the 20% Development Fund shall contribute to the attainment of desirable socio-economic development and environmental management outcomes of the LGU, and shall partake the nature of investment or capital expenditures.
</div>

<div style="font-weight:bold;font-size:7.5pt;text-transform:uppercase;margin:10px 0 6px 0;">ALLOWABLE DEVELOPMENT PROJECTS CHARGEABLE AGAINST THE 20% DEVELOPMENT FUND</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>1.</span> <span style="font-weight:bold;text-decoration:underline;">Social Development</span>
  <div style="margin-left:18px;margin-top:2px;">
    <p>1.1 Construction or rehabilitation of health centers, rural health units or hospitals, including purchase of lot for the purpose.</p>
    <p>1.2 Purchase of ambulance and medical equipment.</p>
    <p>1.3 Construction or rehabilitation of local government-owned potable water supply system.</p>
    <p>1.4 Establishment or rehabilitation of Manpower Development Centers.</p>
    <p>1.5 Construction or rehabilitation of evacuation centers, including purchase of lot for the purpose.</p>
    <p>1.6 Construction of Special Drug Education Centers and Drug Treatment/Rehabilitation Centers, including purchase of lot for the purpose.</p>
    <p>1.7 Rehabilitation of historical sites classified as such by the National Historical Commission of the Philippines.</p>
    <p>1.8 Purchase and development of land for the relocation of informal settlers and relocation of victims of calamities.</p>
    <p>1.9 Construction or rehabilitation of multi-purpose halls, including purchase of lot for the purpose.</p>
    <p>1.10 Installation of street lighting system.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>2.</span> <span style="font-weight:bold;text-decoration:underline;">Economic Development</span>
  <div style="margin-left:18px;margin-top:2px;">
    <p>2.1 Construction or rehabilitation of communal irrigation or water impounding system.</p>
    <p>2.2 Purchase or lease of post-harvest facilities, such as farm or hand tractor with trailer, thresher and mechanical driers.</p>
    <p>2.3 Construction or rehabilitation of local roads or bridges, including purchase of appropriate engineering equipment, such as dump trucks, graders and pay loaders.</p>
    <p>2.4 Capital expenditures related to the implementation of livelihood or entrepreneurship/local economic development projects.</p>
    <p>2.5 Development of alternative power or energy sources, such as, but not limited to, renewable energy power plants.</p>
    <p>2.6 Amortization of loans used to finance development projects cited in this provision, subject to the 20% debt service cap prescribed under Section 324 (b) of RA 7160.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>3.</span> <span style="font-weight:bold;text-decoration:underline;">Environmental Management</span>
  <div style="margin-left:18px;margin-top:2px;">
    <p>3.1 Reforestation and urban greening.</p>
    <p>3.2 Construction or rehabilitation of sanitary landfills and materials recovery facility.</p>
    <p>3.3 Purchase of garbage trucks and other equipment for environmental management and protection purposes.</p>
    <p>3.4 Implementation of flood and erosion control projects, such as rehabilitation and construction of drainage systems, de-silting of rivers and de-clogging of canals.</p>
    <p>3.5 Other environmental management projects that promote air and water quality, as well as productivity of the coastal or freshwater habitat, agricultural land and forest land, such as, but not limited to, treatment of wastewater for conservation/re-use purposes, and installation of air pollution control devices.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>4.</span> <span style="font-weight:bold;text-decoration:underline;">Expenditure items not allowed to be charged against the 20% Development Fund</span>
  <div style="margin-left:18px;margin-top:2px;">
    <p>4.1 Personal services expenditures, such as salaries, wages, overtime pay and other personnel benefits.</p>
    <p>4.2 Administrative expenses, such as supplies, meetings, communication, water and electricity, petroleum products, other general services, and the like.</p>
    <p>4.3 Traveling expenses, whether domestic or foreign.</p>
    <p>4.4 Registration or participation fees in training, seminars, conferences or conventions.</p>
    <p>4.5 Purchase of administrative office furniture, fixtures, equipment or appliances.</p>
    <p>4.6 Purchase, maintenance or repair of motor vehicles or motorcycles, other than those specified in item 2.0 hereof.</p>
  </div>
</div>
`;

const SP_CALAMITY5_DEFAULT_HTML = `
<div style="text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;margin-bottom:10px;">SPECIAL PROVISIONS: 5% CALAMITY FUND (GEN. FUND &amp; SPCL. ACCOUNT), CY 2027</div>

<div style="margin-bottom:10px;line-height:1.5;text-align:justify;">
  <span>1.</span> <span style="font-weight:bold;text-decoration:underline;">Use and Release of Fund. Disaster Prevention, Mitigation and Preparedness Projects.</span>
  <div style="margin-top:2px;">
    <p>The 5% Reserve for Calamity are authorized to be used to implement projects designed to mitigate and preparation of any disaster, procurement of necessary needed tools and equipment as prescribed and stipulated in RA-10121 and P.D. No. 1566. Implementation of this section shall be in accordance with the guidelines issued by the National Disaster Coordinating Council in coordination with the DBM, pursuant to Section 324 (d), R.A. 7160, that 5% of the estimated revenue from regular sources for one (1) fiscal year shall be set aside as annual lump sum appropriation comprising 70 percent Pre-disaster preparedness and 30 percent Quick Response Fund.</p>
    <p>The Office of the MDRRMO shall take charge of the crafting of the Municipal Disaster Risk Reduction Management Plan as well as its implementation schedule.</p>
    <p>1. Relief, rehabilitation, reconstruction and other works or services in connection with calamities which may occur during the budget year are all incorporated in the MDRRM Plan. Such relief, rehabilitation, construction and other works or services in connection with man-made disaster, include the following:</p>
    <p>2.) That such fund shall be used only in the municipality, or a portion thereof, or other areas affected by a disaster or a calamity, as determined and declared by the Local Sangguniang Bayan concerned; and</p>
    <p>3.) In case of fire or conflagration, the calamity fund shall be used only for relief operations. Provided further, that the Municipal Disaster Risk Reduction Management Council (MDRRMC), shall monitor the use and disbursements of the Municipal Calamity Fund.</p>
    <p>The 5% Calamity fund can be utilized as a funding source for preparedness activities for relief, rehabilitation, reconstruction and other works or services in connection with man-made disasters resulting from unlawful acts or insurgents, terrorists and other criminal acts, as well as for disaster preparedness and other pre-disaster activities.</p>
    <p>Provided that in extreme cases and under extra-ordinary circumstances, such as acts of terrorism and outbreak of dangerous and highly communicable diseases such as SARS, the Calamity Fund may also be utilized without the need of Sangguniang declaration which needs to be prevented or suppressed.</p>
  </div>
</div>

<div style="margin-bottom:10px;line-height:1.5;text-align:justify;">
  <span>2.</span> <span style="font-weight:bold;text-decoration:underline;">Quick Response Fund.</span>
  <div style="margin-top:2px;">
    <p>Of the amount appropriated for LDRRM Fund, thirty-percent (30%) shall be allocated as Quick Response Fund (QRF) or stand-by fund for relief, recovery programs in order that the situation and living conditions of people in the communities or areas stricken by disaster, calamity and epidemics may be normalized as quickly as possible.</p>
    <p>The release and use of QRF shall be supported by a resolution of the Sanggunian declaring the LGU under state of calamity or a Presidential declaration of state of calamity.</p>
  </div>
</div>

<div style="margin-bottom:10px;line-height:1.5;text-align:justify;">
  <span>3.</span> In no case shall the QRF be used for pre-disaster, nor be re-aligned for any other purpose.
</div>
`;

const SP20MdfEditor: React.FC<{
  budgetPlanId: string;
}> = ({ budgetPlanId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SP20_STORAGE_KEY);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved !== null ? saved : SP_20MDF_DEFAULT_HTML;
    }
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSave = () => {
    if (!editorRef.current) return;
    try {
      localStorage.setItem(SP20_STORAGE_KEY, editorRef.current.innerHTML);
      setDirty(false);
      setStatus('Saved to this browser ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Save failed (storage full or blocked)');
    }
  };

  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const marker = document.createElement('div');
    marker.style.pageBreakBefore = 'always';
    marker.style.height = '0';
    marker.setAttribute('data-page-break', 'true');
    marker.innerHTML = '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(marker);
    } else {
      editorRef.current.appendChild(marker);
    }
    setDirty(true);
    toast.success('Page break inserted at cursor');
  };

  const handleReset = () => {
    if (!confirm('Discard local edits and restore the original text?')) return;
    localStorage.removeItem(SP20_STORAGE_KEY);
    if (editorRef.current) editorRef.current.innerHTML = SP_20MDF_DEFAULT_HTML;
    setDirty(false);
    toast.success('Reset — original text will be used on next PDF generation');
  };

  const getContent = (): string | undefined => {
    return editorRef.current?.innerHTML || undefined;
  };

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const response = await API.post('/reports/lep/sp-20mdf', null, {
      params: {
        budget_plan_id: budgetPlanId || undefined,
        content: getContent(),
        download: download ? 1 : undefined,
        _: Date.now(),
      },
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    return response.data as Blob;
  }, [budgetPlanId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'LEP_SpecialProvisions_20MDF.pdf',
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download');
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Special Provisions: 20% MDF — Editable Text
        </p>
        <div className="flex items-center gap-2">
          {status && <span className="text-[11px] text-zinc-500">{status}</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleInsertPageBreak}>
            Insert Page Break
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />Reset
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty}>
            <Save className="h-3 w-3" />Save Locally
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400">
        Edits are saved only in this browser (not on the server). Click "Save Locally" to keep
        them, or they'll be lost on refresh. Generating a PDF always uses your current saved text.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setDirty(true)}
        className="rounded-lg border border-zinc-300 bg-white p-4 text-xs leading-relaxed
                   min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={loadingDl}>
          {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
        </Button>
      </div>

      {previewUrl && (
        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[600px] border border-zinc-200 rounded-lg mt-2" title="20% MDF Special Provisions Preview" />
      )}

      <div className="h-8" />
    </div>
  );
};

const SPCalamity5Editor: React.FC<{
  budgetPlanId: string;
}> = ({ budgetPlanId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SP5_STORAGE_KEY);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved !== null ? saved : SP_CALAMITY5_DEFAULT_HTML;
    }
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSave = () => {
    if (!editorRef.current) return;
    try {
      localStorage.setItem(SP5_STORAGE_KEY, editorRef.current.innerHTML);
      setDirty(false);
      setStatus('Saved to this browser ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Save failed (storage full or blocked)');
    }
  };

  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const marker = document.createElement('div');
    marker.style.pageBreakBefore = 'always';
    marker.style.height = '0';
    marker.setAttribute('data-page-break', 'true');
    marker.innerHTML = '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(marker);
    } else {
      editorRef.current.appendChild(marker);
    }
    setDirty(true);
    toast.success('Page break inserted at cursor');
  };

  const handleReset = () => {
    if (!confirm('Discard local edits and restore the original text?')) return;
    localStorage.removeItem(SP5_STORAGE_KEY);
    if (editorRef.current) editorRef.current.innerHTML = SP_CALAMITY5_DEFAULT_HTML;
    setDirty(false);
    toast.success('Reset — original text will be used on next PDF generation');
  };

  const getContent = (): string | undefined => {
    return editorRef.current?.innerHTML || undefined;
  };

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const response = await API.post('/reports/lep/sp-calamity5', null, {
      params: {
        budget_plan_id: budgetPlanId || undefined,
        content: getContent(),
        download: download ? 1 : undefined,
        _: Date.now(),
      },
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    return response.data as Blob;
  }, [budgetPlanId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'LEP_SpecialProvisions_Calamity5.pdf',
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download');
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Special Provisions: 5% Calamity Fund — Editable Text
        </p>
        <div className="flex items-center gap-2">
          {status && <span className="text-[11px] text-zinc-500">{status}</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleInsertPageBreak}>
            Insert Page Break
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />Reset
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty}>
            <Save className="h-3 w-3" />Save Locally
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400">
        Edits are saved only in this browser (not on the server). Click "Save Locally" to keep
        them, or they'll be lost on refresh. Generating a PDF always uses your current saved text.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setDirty(true)}
        className="rounded-lg border border-zinc-300 bg-white p-4 text-xs leading-relaxed
                   min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={loadingDl}>
          {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
        </Button>
      </div>

      {previewUrl && (
        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[600px] border border-zinc-200 rounded-lg mt-2" title="5% Calamity Fund Special Provisions Preview" />
      )}

      <div className="h-8" />
    </div>
  );
};

const SP_APPROPRIATION_DEFAULT_HTML = `
<div style="text-align:center;font-weight:bold;font-size:9pt;margin-bottom:2px;">Special Provisions : GENERAL FUND &amp; SPECIAL ACCOUNT (OCC, PUBLIC MARKET &amp; SLAUGHTERHOUSE), CY 2027</div>
<div style="text-align:center;font-weight:bold;text-decoration:underline;text-transform:uppercase;font-size:8.5pt;margin:2px 0 10px 0;">Appropriation for Programs and Specific Activities.</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <p>The amount appropriated herein for subsidies and programs of the LGU shall be used specifically for the identified activities subject to existing budgeting, accounting, and auditing laws, rules and regulations.</p>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>1.</span> <span style="font-weight:bold;text-decoration:underline;">General Rule.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>As a general rule, the income estimates, certified by the Municipal Local Finance Committee, are reasonably probable for collection and the expenditure ceiling in this Fiscal Year 2026. Thus, the Annual Budget has strictly observe the general guidelines set forth by the operating procedures of the COA, Department of Budget and Management, Department of Finance, Department of Interior and Local Government and Civil Service Commission.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>2.</span> <span style="font-weight:bold;text-decoration:underline;">Receipts and Income.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Taxes, Fees, Charges, Assessments &amp; Etc. All Taxes, Fees, Charges, Assessment &amp; other receipts or revenues collected by this LGU in the exercise of its functions, shall be deposited with the Municipal Treasury and shall accrue to the General Fund, except the following:</p>
    <p style="margin-left:14px;">(a) Receipts authorized by law to be recorded as Special Account in the General Fund. Provided, that revenues or income accruing to Special Accounts in the General Fund maybe made available for expenditure, subject to the submission/preparation of Special Account Budget of the concerned Account.</p>
    <p style="margin-left:14px;">(b) Other instances provided in this Municipal Budget.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>3.</span> <span style="font-weight:bold;text-decoration:underline;">Mandatory Expenditures.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Amounts appropriated, particularly for, but not limited to, gasoline, fuel, oil and lubricants, water, illumination and power services, telephone landline and mobile telecom and other communication services, rent, retirement gratuity and terminal leave requirements shall be disbursed solely for such items of expenditures: PROVIDED, That any savings generated from these items may be realigned only in the last quarter of each year.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>4.</span> <span style="font-weight:bold;text-decoration:underline;">Purchase of Supplies, Materials and Equipment Spareparts for Stock.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>Inventory of supplies, materials and equipment spareparts to be procured out of available funds shall at no time exceed the normal 3-month requirement (quarterly), subject to existing rules and regulations.</p>
  </div>
</div>

<div style="margin-bottom:8px;line-height:1.5;text-align:justify;">
  <span>5.</span> <span style="font-weight:bold;text-decoration:underline;">Disaster Prevention, Mitigation and Preparedness Projects.</span>
  <div style="margin-left:22px;margin-top:2px;">
    <p>The 5% Reserve for Calamity are authorized to be used to implement projects designed to mitigate and preparation of any disaster, procurement of necessary needed tools and equipments as prescribed and stipulated in RA-10121 and P.D. No. 1566. Implementation of this section shall be in accordance with the guidelines issued by the National Disaster Coordinating Council in coordination with the DBM, pursuant to Section 324 (d), R.A. 7160, that 5% of the estimated revenue from regular sources for one (1) fiscal year shall be set aside as annual lump sum appropriation comprising 70 percent Pre-disaster preparedness and 30 percent Quick Response Fund.</p>
    <p>The Office of the MDRRMO shall take charge of the crafting of the Municipal Disaster Risk Reduction Management Plan as well as its implementation schedule.</p>
    <p>1. Relief, rehabilitation, reconstruction and other works or services in connection with calamities which may occur during the budget year are all incorporated in the MDRRM Plan. Such relief, rehabilitation, construction and other works or services in connection with man-made disaster, include the following:</p>
    <p style="margin-left:14px;">1.) Medical assistance, death and funeral benefits to the victims, their dependents and immediate families, including victims who are Overseas Filipino Workers, (OFW),</p>
    <p style="margin-left:14px;">2.) Financial assistance, logistical support and other services for medical, rescue and relief workers who have been tasked to attend to the victims;</p>
    <p style="margin-left:14px;">3.) Rehabilitation and reconstruction of infrastructures and disaster preparedness orientation, training and other pre-disaster activities.</p>
    <p>2.) That such fund shall be used only in the municipality, or a portion thereof, or other areas affected by a disaster or a calamity, as determined and declared by the Local Sangguniang Bayan concerned; and</p>
    <p>3.) In case of fire or conflagration, the calamity fund shall be used only for relief operations. Provided further, that the Municipal Disaster Risk Reduction Management Council (MDRRMC), shall monitor the use and disbursements of the Municipal Calamity Fund.</p>
    <p>The 5% Calamity fund can be utilized as a funding source for preparedness activities for relief, rehabilitation, reconstruction and other works or services in connection with man-made disasters resulting from unlawful acts or insurgents, terrorists and other criminal acts, as well as for disaster preparedness and other pre-disaster activities.</p>
    <p>Provided that in extreme cases and under extra-ordinary circumstances, such as acts of terrorism and outbreak of dangerous and highly communicable diseases such as SARS, the Calamity Fund may also be utilized without the need of Sangguniang declaration which needs to be prevented or suppressed.</p>
  </div>
</div>
`;

const SPAppropriationEditor: React.FC<{
  budgetPlanId: string;
}> = ({ budgetPlanId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(SPA_STORAGE_KEY);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved !== null ? saved : SP_APPROPRIATION_DEFAULT_HTML;
    }
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSave = () => {
    if (!editorRef.current) return;
    try {
      localStorage.setItem(SPA_STORAGE_KEY, editorRef.current.innerHTML);
      setDirty(false);
      setStatus('Saved to this browser ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Save failed (storage full or blocked)');
    }
  };

  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const marker = document.createElement('div');
    marker.style.pageBreakBefore = 'always';
    marker.style.height = '0';
    marker.setAttribute('data-page-break', 'true');
    marker.innerHTML = '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(marker);
    } else {
      editorRef.current.appendChild(marker);
    }
    setDirty(true);
    toast.success('Page break inserted at cursor');
  };

  const handleReset = () => {
    if (!confirm('Discard local edits and restore the original text?')) return;
    localStorage.removeItem(SPA_STORAGE_KEY);
    if (editorRef.current) editorRef.current.innerHTML = SP_APPROPRIATION_DEFAULT_HTML;
    setDirty(false);
    toast.success('Reset — original text will be used on next PDF generation');
  };

  const getContent = (): string | undefined => {
    return editorRef.current?.innerHTML || undefined;
  };

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const response = await API.post('/reports/lep/sp-appropriation', null, {
      params: {
        budget_plan_id: budgetPlanId || undefined,
        content: getContent(),
        download: download ? 1 : undefined,
        _: Date.now(),
      },
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    return response.data as Blob;
  }, [budgetPlanId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'LEP_SpecialProvisions_Appropriation.pdf',
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download');
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Special Provisions: Appropriation for Programs — Editable Text
        </p>
        <div className="flex items-center gap-2">
          {status && <span className="text-[11px] text-zinc-500">{status}</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleInsertPageBreak}>
            Insert Page Break
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />Reset
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty}>
            <Save className="h-3 w-3" />Save Locally
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400">
        Edits are saved only in this browser (not on the server). Click "Save Locally" to keep
        them, or they'll be lost on refresh. Generating a PDF always uses your current saved text.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setDirty(true)}
        className="rounded-lg border border-zinc-300 bg-white p-4 text-xs leading-relaxed
                   min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={loadingDl}>
          {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
        </Button>
      </div>

      {previewUrl && (
        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[600px] border border-zinc-200 rounded-lg mt-2" title="Appropriation Special Provisions Preview" />
      )}

      <div className="h-8" />
    </div>
  );
};

const GP_DEFAULT_HTML = `
<div style="font-weight:bold;font-size:9.5pt;margin-bottom:10px;">Section 4. General Provisions</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;">The following policies are hereby adopted for the fiscal year:</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:10px;">
  <span style="font-weight:bold;">1. Availability of Appropriations.</span>
  Unexpended balances of appropriations authorized in the annual appropriation ordinance shall
  revert to the un-appropriated surplus of the general fund at the end of fiscal year and shall
  not be available for the expenditure except by subsequent enactment. However, appropriations
  for capital outlay shall continue and remain valid until fully spent, reverted or the project
  is completed. Reversion of continuing appropriations shall not be allowed unless obligations
  therefor have been fully paid or otherwise settled.
</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:10px;">
  <span style="font-weight:bold;">2. Limitation on Cash Advance.</span>
  Notwithstanding any provision of law to the contrary, cash advances shall not be granted until
  such time that the earlier cash advances availed of by the officials or employees concerned
  shall have been liquidated pursuant to pertinent accounting.
</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:10px;">
  <span style="font-weight:bold;">3. Meaning of Savings.</span>
  Savings refer to portions of balances as of any given point in the fiscal year or any
  programmed or allotted appropriation which remain free of any obligation or encumbrance and
  which are still available after the satisfactory completion of the work, activity or purpose
  for which the appropriation was originally authorized, or which result from unobligated
  compensation and related costs pertaining to vacant positions and leaves of absence without pay.
</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:10px;">
  <span style="font-weight:bold;">4. Use of Savings &amp; Augmentation.</span>
  Funds shall be available exclusively for the specific purpose for which they have been
  appropriated. No ordinance shall be passed authorizing any transfer of appropriations from one
  item to another. However, the local chief executive thru the Municipal Budget Officer may, by
  LCE approved request for augmentation, be authorized to augment any item in the approved annual
  budget for their respective offices from savings in the same expense class of their respective
  appropriations.
</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:10px;">
  <span style="font-weight:bold;">5. Separability Clause.</span>
  If for any reason, any section or provision of this Appropriation Ordinance is disallowed in
  Budget review or declared invalid by proper authorities, other provisions hereof that are not
  affected shall continue to be in full force and effect.
</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:10px;">
  <span style="font-weight:bold;">6. Effectivity.</span>
  The provisions of this Appropriation Ordinance shall take effect on January One, Two Thousand Twenty Six.
</div>

<div style="font-size:8pt;line-height:1.5;text-align:left;margin-top:26px;">
  ENACTED: This <span style="display:inline-block;width:30pt;border-bottom:1px solid #000;">&nbsp;</span> day of
  <span style="display:inline-block;width:100pt;border-bottom:1px solid #000;">&nbsp;</span> at
  <span style="display:inline-block;width:150pt;border-bottom:1px solid #000;">&nbsp;</span>.
</div>

<div style="font-size:8pt;margin-top:26px;text-align:center;line-height:1.8;">
  I HEREBY CERTIFY<br>
  THAT THIS ORDINANCE IS DULY ENACTED<br>
  BY THE SANGGUNIANG ON <span style="display:inline-block;width:120pt;border-bottom:1px solid #000;">&nbsp;</span>.
</div>

<div style="text-align:center;font-size:8pt;margin-top:50px;">
  <span style="font-weight:bold;font-size:6.5pt;display:block;">JOMAR FRANCISCO D. BAGO</span>
  <span style="font-size:6.5pt;display:block;">SECRETARY TO THE SANGGUNIAN</span>
</div>

<div style="text-align:center;font-size:8pt;margin-top:50px;">
  <span style="font-weight:bold;font-size:6.5pt;display:block;">HON. DANILO E. DAROY JR.</span>
  <span style="font-size:6.5pt;display:block;">PRESIDING OFFICER</span>
</div>

<div style="font-weight:bold;font-size:8pt;margin-top:50px;text-align:center;">APPROVED:</div>

<div style="text-align:center;font-size:8pt;margin-top:24px;">
  <span style="font-weight:bold;font-size:6.5pt;display:block;">ATTY. JAYFRANCIS G. BAGO</span>
  <span style="font-size:6.5pt;display:block;">LOCAL CHIEF EXECUTIVE</span>
</div>
`;

const GeneralProvisionsEditor: React.FC<{
  budgetPlanId: string;
}> = ({ budgetPlanId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(GP_STORAGE_KEY);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved !== null ? saved : GP_DEFAULT_HTML;
    }
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSave = () => {
    if (!editorRef.current) return;
    try {
      localStorage.setItem(GP_STORAGE_KEY, editorRef.current.innerHTML);
      setDirty(false);
      setStatus('Saved to this browser ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Save failed (storage full or blocked)');
    }
  };

  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const marker = document.createElement('div');
    marker.style.pageBreakBefore = 'always';
    marker.style.height = '0';
    marker.setAttribute('data-page-break', 'true');
    marker.innerHTML = '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(marker);
    } else {
      editorRef.current.appendChild(marker);
    }
    setDirty(true);
    toast.success('Page break inserted at cursor');
  };

  const handleReset = () => {
    if (!confirm('Discard local edits and restore the original text?')) return;
    localStorage.removeItem(GP_STORAGE_KEY);
    if (editorRef.current) editorRef.current.innerHTML = GP_DEFAULT_HTML;
    setDirty(false);
    toast.success('Reset — original text will be used on next PDF generation');
  };

  const getContent = (): string | undefined => {
    return editorRef.current?.innerHTML || undefined;
  };

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const response = await API.post('/reports/lep/general-provisions', null, {
      params: {
        budget_plan_id: budgetPlanId || undefined,
        content: getContent(),
        download: download ? 1 : undefined,
        _: Date.now(),
      },
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    return response.data as Blob;
  }, [budgetPlanId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'LEP_GeneralProvisions.pdf',
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download');
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          General Provisions — Editable Text
        </p>
        <div className="flex items-center gap-2">
          {status && <span className="text-[11px] text-zinc-500">{status}</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleInsertPageBreak}>
            Insert Page Break
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />Reset
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty}>
            <Save className="h-3 w-3" />Save Locally
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400">
        Edits are saved only in this browser (not on the server). Click "Save Locally" to keep
        them, or they'll be lost on refresh. Generating a PDF always uses your current saved text.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setDirty(true)}
        className="rounded-lg border border-zinc-300 bg-white p-4 text-xs leading-relaxed
                   min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={loadingDl}>
          {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
        </Button>
      </div>

      {previewUrl && (
        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[600px] border border-zinc-200 rounded-lg mt-2" title="General Provisions Preview" />
      )}

      <div className="h-8" />
    </div>
  );
};

const PersonnelAmeliorationEditor: React.FC<{
  budgetPlanId: string;
}> = ({ budgetPlanId }) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState('');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl, setLoadingDl] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem(PA_STORAGE_KEY);
    if (editorRef.current) {
      editorRef.current.innerHTML = saved !== null ? saved : PA_DEFAULT_HTML;
    }
  }, []);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  const handleSave = () => {
    if (!editorRef.current) return;
    try {
      localStorage.setItem(PA_STORAGE_KEY, editorRef.current.innerHTML);
      setDirty(false);
      setStatus('Saved to this browser ✓');
      setTimeout(() => setStatus(''), 2000);
    } catch {
      setStatus('Save failed (storage full or blocked)');
    }
  };

  const handleInsertPageBreak = () => {
    if (!editorRef.current) return;
    editorRef.current.focus();
    const marker = document.createElement('div');
    marker.style.pageBreakBefore = 'always';
    marker.style.height = '0';
    marker.setAttribute('data-page-break', 'true');
    marker.innerHTML = '&nbsp;';

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.collapse(false);
      range.insertNode(marker);
    } else {
      editorRef.current.appendChild(marker);
    }
    setDirty(true);
    toast.success('Page break inserted at cursor');
  };

  const handleReset = () => {
    if (!confirm('Discard local edits and restore the original text?')) return;
    localStorage.removeItem(PA_STORAGE_KEY);
    if (editorRef.current) editorRef.current.innerHTML = PA_DEFAULT_HTML;
    setDirty(false);
    toast.success('Reset — original text will be used on next PDF generation');
  };

  const getContent = (): string | undefined => {
    return editorRef.current?.innerHTML || undefined;
  };

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const response = await API.post('/reports/lep/personnel-amelioration', null, {
      params: {
        budget_plan_id: budgetPlanId || undefined,
        content: getContent(),
        download: download ? 1 : undefined,
        _: Date.now(),
      },
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    return response.data as Blob;
  }, [budgetPlanId]);

  const handlePreview = async () => {
    setLoadingPreview(true);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      const blob = await fetchPdf(false);
      setPreviewUrl(URL.createObjectURL(blob));
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleDownload = async () => {
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), {
        href: url, download: 'LEP_PersonnelAmelioration.pdf',
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to download');
    } finally {
      setLoadingDl(false);
    }
  };

  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-4">
      <div className="sticky top-0 z-10 -mx-5 -mt-5 mb-2 flex items-center justify-between
                      border-b border-zinc-200 bg-white/95 backdrop-blur px-5 py-2.5">
        <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
          Personnel Amelioration — Editable Text
        </p>
        <div className="flex items-center gap-2">
          {status && <span className="text-[11px] text-zinc-500">{status}</span>}
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={handleInsertPageBreak}>
            Insert Page Break
          </Button>
          <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" onClick={handleReset}>
            <RotateCcw className="h-3 w-3" />Reset
          </Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={handleSave} disabled={!dirty}>
            <Save className="h-3 w-3" />Save Locally
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-zinc-400">
        Edits are saved only in this browser (not on the server). Click "Save Locally" to keep
        them, or they'll be lost on refresh. Generating a PDF always uses your current saved text.
      </p>

      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={() => setDirty(true)}
        className="rounded-lg border border-zinc-300 bg-white p-4 text-xs leading-relaxed
                   min-h-[400px] focus:outline-none focus:ring-2 focus:ring-primary/40"
      />

      <div className="flex gap-2 pt-2">
        <Button size="sm" variant="outline" className="h-8 text-xs" onClick={handlePreview} disabled={loadingPreview}>
          {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
        </Button>
        <Button size="sm" className="h-8 text-xs" onClick={handleDownload} disabled={loadingDl}>
          {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
        </Button>
      </div>

      {previewUrl && (
        <iframe src={`${previewUrl}#toolbar=0`} className="w-full h-[600px] border border-zinc-200 rounded-lg mt-2" title="Personnel Amelioration Preview" />
      )}

      <div className="h-8" />
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// ABP PANEL
// ═════════════════════════════════════════════════════════════════════════════

export const AbpPanel: React.FC<{
  budgetPlans: BudgetPlan[];
  departments: Department[];
  filterOptions: FilterOption[];
  loadingInit: boolean;
  restrictToCalamity?: boolean;
  /** Department-head mode: only forms 2/3/4, no ZIP, dept locked to lockedDeptId */
  restrictToDeptForms?: boolean;
  lockedDeptId?: number | null;
}> = ({
  budgetPlans, departments, filterOptions, loadingInit,
  restrictToCalamity = false, restrictToDeptForms = false, lockedDeptId = null,
}) => {

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedDept,   setSelectedDept]   = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
const [selectedForms,  setSelectedForms]  = useState<Set<FormId>>(new Set());
  const isMobile = useIsMobile();
  const [mobileView,     setMobileView]     = useState<'options' | 'preview'>('options');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl,      setLoadingDl]      = useState(false);
  const [loadingAll,     setLoadingAll]     = useState(false);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [showInfo,       setShowInfo]       = useState(false);

  useEffect(() => {
    const active = budgetPlans.find(p => p.is_active);
    if (active) setSelectedPlanId(String(active.budget_plan_id));
  }, [budgetPlans]);

  // Department-head mode: lock the department selection to their own dept
  // so requests and preview/ZIP stages don't fan out to every department.
  useEffect(() => {
    if (restrictToDeptForms && lockedDeptId) {
      setSelectedDept(String(lockedDeptId));
    }
  }, [restrictToDeptForms, lockedDeptId]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (isMobile && previewUrl) setMobileView('preview');
  }, [isMobile, previewUrl]);

  const visibleForms = restrictToDeptForms
    ? FORM_DEFS.filter(f => ['form2', 'form2a', 'form3', 'form4'].includes(f.id))
    : restrictToCalamity
      ? FORM_DEFS.filter(f => ['calamity5', 'consolidated_sa_income'].includes(f.id))
      : FORM_DEFS;
  const allFormIds  = visibleForms.map(f => f.id) as FormId[];
  const allSelected = allFormIds.every(id => selectedForms.has(id));
  const someSelected= allFormIds.some(id  => selectedForms.has(id)) && !allSelected;

  const toggleSelectAll = () => {
    setSelectedForms(allSelected ? new Set([allFormIds[0]]) : new Set(allFormIds));
    setPreviewUrl(null);
  };
  const toggleForm = (id: FormId) => {
    setSelectedForms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setPreviewUrl(null);
  };

  const forms        = Array.from(selectedForms) as FormId[];
  const isReady      = Boolean(selectedPlanId) && forms.length > 0;
  const hasDeptForms = forms.some(f => ['form2','form2a','form3','form4'].includes(f));
  const hasForm1     = forms.includes('form1');
  const hasForm6     = forms.includes('form6');
  const hasForm7     = forms.includes('form7');
  const hasCalamity5 = forms.includes('calamity5');
  const hasScopeForm = hasForm1 || hasForm6 || hasForm7 || hasCalamity5;
  const hasForm5     = forms.includes('form5');

  const scopeLabel = (() => {
    const sf = [hasForm1 && '1', hasForm6 && '6', hasForm7 && '7'].filter(Boolean);
    if (sf.length > 1) return `Form ${sf.join(' & ')} Scope`;
    if (hasForm7) return 'Form 7 Scope';
    if (hasForm6) return 'Form 6 Scope';
    return 'Form 1 Scope';
  })();

  const singleEndpoint = endpointFor(forms);
  const canPreview     = isReady && Boolean(singleEndpoint);

  const buildParams = useCallback((download: boolean): Record<string, unknown> => {
    const p: Record<string, unknown> = { budget_plan_id: selectedPlanId, _: Date.now() };
    if (download) p.download = true;
    if (forms.includes('form1') || forms.includes('form6') || forms.includes('form7')) p.filter = selectedFilter;
    if (forms.some(f => ['form2','form2a','form3','form4'].includes(f))) {
      p.department = selectedDept;
      p['forms[]'] = forms.filter(f => ['form2','form2a','form3','form4'].includes(f));
    }
    return p;
  }, [selectedPlanId, selectedFilter, selectedDept, forms]);

  const fetchPdf = useCallback(async (download: boolean): Promise<Blob> => {
    const endpoint = endpointFor(forms);
    if (!endpoint) throw new Error('Mixed forms — use Generate All to download as ZIP.');
    const response = await API.post(endpoint, null, {
      params: buildParams(download), responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
    return response.data as Blob;
  }, [forms, buildParams]);

 const [previewReady, setPreviewReady] = useState(false);
  const pendingBlobRef = useRef<Blob | null>(null);

  const handlePreview = async () => {
    if (!canPreview || loadingPreview) return;
    setLoadingPreview(true);
    setPreviewReady(false);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      pendingBlobRef.current = await fetchPdf(false);
      setPreviewReady(true); // triggers the loader's finish animation
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
      setLoadingPreview(false);
    }
  };

  const handlePreviewLoaderFinished = () => {
    if (pendingBlobRef.current) setPreviewUrl(URL.createObjectURL(pendingBlobRef.current));
    pendingBlobRef.current = null;
    setLoadingPreview(false);
    setPreviewReady(false);
  };

  const handleDownload = async () => {
    if (!canPreview || loadingDl) return;
    setLoadingDl(true);
    try {
      const blob = await fetchPdf(true);
      const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
      const url   = URL.createObjectURL(blob);
      const a     = Object.assign(document.createElement('a'), { href: url, download: `LBP_${forms.map(f => f.toUpperCase()).join('-')}_FY${plan?.year ?? ''}.pdf` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
    finally { setLoadingDl(false); }
  };

  const [zipReady, setZipReady] = useState(false);
  const pendingZipRef = useRef<{ blob: Blob; plan?: BudgetPlan } | null>(null);

  const handleGenerateAll = async () => {
    if (!isReady || loadingAll) return;
    setLoadingAll(true);
    setZipReady(false);
    try {
      const plan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
      const response = await API.post('/reports/unified/generate-all', null, {
        params: { budget_plan_id: selectedPlanId, 'forms[]': forms, _: Date.now() },
        responseType: 'blob',
        headers: { Accept: 'application/zip', 'X-Requested-With': 'XMLHttpRequest' },
      });
      if ((response.data as Blob).size === 0) throw new Error('Empty ZIP received');
      pendingZipRef.current = { blob: response.data as Blob, plan };
      setZipReady(true); // triggers the loader's finish animation
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate ZIP');
      setLoadingAll(false);
    }
  };

  const handleZipLoaderFinished = () => {
    const pending = pendingZipRef.current;
    if (pending) {
      const url = URL.createObjectURL(pending.blob);
      const a   = Object.assign(document.createElement('a'), { href: url, download: `LBP_AllForms_FY${pending.plan?.year ?? ''}.zip` });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('ZIP downloaded — check your downloads folder');
    }
    pendingZipRef.current = null;
    setLoadingAll(false);
    setZipReady(false);
  };

  const selectedPlan     = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
  const selectedDeptName = selectedDept === 'all'
    ? 'All Departments'
    : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';
  const isBusy = loadingPreview || loadingDl || loadingAll;

  const selectedFormDefs = visibleForms.filter(f => selectedForms.has(f.id));
  // Real extra work when "All Departments" is picked for dept-scoped forms —
  // reflect it as one compiling stage per department instead of pretending
  // it's the same amount of work as a single department.
  const deptStageLabels = hasDeptForms && selectedDept === 'all'
    ? departments.map(d => `Compiling for ${d.dept_abbreviation || d.dept_name}`)
    : [];
  const previewStages = [
    'Sending request',
    ...selectedFormDefs.map(f => `Compiling ${f.label}`),
    ...deptStageLabels,
    'Rendering layout',
    'Loading preview',
  ];
  const zipStages = [
    'Preparing files',
    ...selectedFormDefs.map(f => `Compiling ${f.label}`),
    ...deptStageLabels,
    'Packaging ZIP',
  ];

  const zipContents = () => {
    const lines: string[] = ['📁 01_GeneralFund/'];
    if (hasForm1)                        lines.push('  • Form1_GeneralFund_FY***.pdf');
    if (hasDeptForms)                    lines.push('  • Forms_[2-3-4]_[Dept]_FY***.pdf  (each dept)');
    if (hasForm5)                        lines.push('  • Form5_Indebtedness_FY***.pdf');
    if (hasForm6)                        lines.push('  • Form6_StatutoryObligations_GF_FY***.pdf');
    if (hasForm7)                        lines.push('  • Form7_FundAllocationBySector_GF_FY***.pdf');
    if (forms.includes('summary'))       lines.push('  • SummaryOfExpenditures_FY***.pdf');
    if (forms.includes('pscomputation')) lines.push('  • PS_Computation_FY***.pdf');
    if (forms.includes('mdf20'))         lines.push('  • 20MDF_FY***.pdf');
    if (forms.includes('calamity5'))     lines.push('  • 5pct_CalamityFund_GF_FY***.pdf');
    lines.push('📁 02_SA_[ABBR]/  (per Special Account dept)');
    if (hasForm1)                        lines.push('  • Form1_[ABBR]_FY***.pdf');
    if (hasDeptForms)                    lines.push('  • Forms_[2-3-4]_[ABBR]_FY***.pdf');
    if (hasForm6)                        lines.push('  • Form6_[ABBR]_FY***.pdf');
    if (hasForm7)                        lines.push('  • Form7_FundAllocationBySector_[ABBR]_FY***.pdf');
    if (forms.includes('calamity5'))     lines.push('  • 5pct_CalamityFund_[ABBR]_FY***.pdf');
    if (forms.includes('consolidated_sa_income')) lines.push('  • SA_Consolidated_Income_FY***.pdf');
    return lines.join('\n');
  };

  return (
    // FIX: use absolute inset instead of flex so the panel truly fills its TabsContent slot
    <div className={cn("absolute inset-0 flex overflow-hidden", isMobile && "flex-col")}>

      {/* ── Left sidebar — FIX: full height column, inner content scrolls ── */}
      <div className={cn(
        "flex-shrink-0 flex flex-col min-h-0 h-full border-r border-border bg-muted/30 overflow-hidden",
        isMobile ? cn("w-full border-r-0", mobileView === 'preview' && "hidden") : "w-64"
      )}>
        {/* Scrollable region */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Budget Plan
            </Label>
            <Select value={selectedPlanId} onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }} disabled={loadingInit}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
              </SelectTrigger>
              <SelectContent>
                {budgetPlans.map(p => (
                  <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
                    <span className="flex items-center gap-1.5">
                      FY {p.year}
                      {p.is_active && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Active</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Forms to Include
              </Label>
              <button
                type="button"
                onClick={toggleSelectAll}
                className="text-[11px] font-medium text-primary hover:underline"
              >
                {allSelected ? 'Deselect all' : 'Select all'}
              </button>
            </div>
            <div className="space-y-1.5">
              {visibleForms.map((form, idx) => {
                const checked = selectedForms.has(form.id);
                return (
                  <button
                    key={form.id}
                    type="button"
                    onClick={() => toggleForm(form.id)}
                    style={{ animationDelay: `${idx * 40}ms` }}
                    className={cn(
                      'w-full text-left rounded-lg border p-2.5 transition-colors animate-stagger-in',
                      checked
                        ? 'border-zinc-900 bg-zinc-900 text-white'
                        : 'border-border bg-card hover:bg-accent text-foreground',
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 pr-4">
                        <div className="flex items-center gap-1.5 text-xs font-medium leading-none">
                          {form.label}
                          {form.orientation === 'landscape' && (
                            <Badge
                              variant="outline"
                              className={cn(
                                'h-4 px-1 text-[9px] font-normal',
                                checked
                                  ? 'text-amber-300 border-amber-300/40 bg-transparent'
                                  : 'text-amber-600 border-amber-200 bg-amber-50',
                              )}
                            >
                              landscape
                            </Badge>
                          )}
                        </div>
                        <p className={cn('text-[11px] leading-snug', checked ? 'text-zinc-300' : 'text-muted-foreground')}>
                          {form.desc}
                        </p>
                      </div>
                      <div className={cn(
                        'flex-shrink-0 h-4 w-4 rounded-full border flex items-center justify-center mt-0.5',
                        checked ? 'border-white bg-white' : 'border-zinc-300 bg-transparent',
                      )}>
                        {checked && <Check className="h-3 w-3 text-zinc-900" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {hasScopeForm && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                {scopeLabel}
              </Label>
              <Select value={selectedFilter} onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }} disabled={loadingInit}>
                <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {filterOptions.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {hasDeptForms && restrictToDeptForms && lockedDeptId && (() => {
            const lockedDept = departments.find(d => d.dept_id === lockedDeptId);
            return (
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                  Department
                </Label>
                <div className="rounded-lg border border-border bg-card px-2.5 py-2">
                  <p className="text-xs font-semibold text-foreground leading-snug">
                    {lockedDept?.dept_name ?? 'Your Department'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {lockedDept?.dept_abbreviation ?? ''}
                  </p>
                </div>
                <p className="text-[9px] text-muted-foreground mt-1">
                  Reports are generated for your department only.
                </p>
              </div>
            );
          })()}

          {hasDeptForms && !restrictToDeptForms && (
            <div>
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                Department
              </Label>
              <Select value={selectedDept} onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }} disabled={loadingInit}>
                <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(d => (
                    <SelectItem key={d.dept_id} value={String(d.dept_id)}>
                      {d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {selectedPlan && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1">
              <p className="text-xs font-semibold text-foreground">FY {selectedPlan.year}</p>
              {hasScopeForm && (
                <p>{scopeLabel}: <span className="text-foreground/80">{filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</span></p>
              )}
              {hasDeptForms && <p>Depts: <span className="text-foreground/80">{selectedDeptName}</span></p>}
              <p>Forms: <span className="text-foreground/80">{forms.map(f => f.toUpperCase()).join(', ')}</span></p>
            </div>
          )}

          <Separator />

          <div className="flex flex-col gap-2">
            {canPreview ? (
              <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-8 text-xs">
                {loadingPreview ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</> : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
              </Button>
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground text-center leading-snug">
                Mixed forms — use<br />"Generate All ZIP" below
              </div>
            )}
            {canPreview && (
              <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-8 text-xs">
                {loadingDl ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</> : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
              </Button>
            )}
            {!restrictToDeptForms && (
              <div className="mt-1">
                <div className="flex items-center gap-1 mb-1 cursor-pointer text-[10px] text-zinc-400 hover:text-zinc-600" onClick={() => setShowInfo(v => !v)}>
                  {showInfo ? <ChevronDown className="h-2.5 w-2.5" /> : <ChevronRight className="h-2.5 w-2.5" />}ZIP structure
                </div>
                {showInfo && <pre className="rounded bg-zinc-100 p-1.5 text-[9px] text-zinc-500 whitespace-pre-wrap leading-relaxed mb-1.5">{zipContents()}</pre>}
                <Button onClick={handleGenerateAll} disabled={!isReady || isBusy} size="sm" className="w-full h-8 text-xs bg-zinc-900 hover:bg-zinc-700 text-white">
                  {loadingAll ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Building ZIP…</> : <><Package className="mr-1.5 h-3.5 w-3.5" />Generate All — Download ZIP</>}
                </Button>
                <p className="text-[9px] text-zinc-400 mt-1 text-center leading-tight">General Fund first, then each Special Account dept</p>
              </div>
            )}
          </div>

          {isMobile && (previewUrl || isBusy) && (
            <Button
              size="sm"
              variant="outline"
              className="w-full h-8 text-xs gap-1.5"
              onClick={() => setMobileView('preview')}
            >
              <Eye className="h-3.5 w-3.5" />
              {isBusy ? 'View Progress' : 'View Preview'}
            </Button>
          )}

          {/* Bottom padding so last item isn't clipped */}
          <div className="h-4" />
        </div>
      </div>

      {/* ── Right: iframe preview — FIX: flex-col, iframe gets flex-1 so it fills remaining height ── */}
      <div className={cn(
        "flex-1 min-w-0 flex flex-col bg-zinc-100 overflow-hidden",
        isMobile && mobileView === 'options' && "hidden"
      )}>
        {previewUrl && (
          <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
            {isMobile && (
              <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => setMobileView('options')}>
                <ChevronRight className="h-3 w-3 rotate-180" />Options
              </Button>
            )}
            <span className="text-xs text-zinc-400">{selectedPlan ? `FY ${selectedPlan.year}` : ''}</span>
            <div className="flex-1" />
            <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}><RefreshCw className="h-3 w-3" />Refresh</Button>
            <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy || !canPreview}><Download className="h-3 w-3" />Save PDF</Button>
          </div>
        )}
        {previewUrl ? (
          // FIX: min-h-0 + flex-1 ensures the iframe expands to fill all remaining vertical space
          <iframe
            key={previewUrl}
            src={`${previewUrl}#toolbar=0&navpanes=0`}
            className="flex-1 min-h-0 w-full border-0 block"
            title="PDF Preview"
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
            {loadingPreview ? (
              <PdfGenerationLoader
                active
                ready={previewReady}
                stages={previewStages}
                onFinished={handlePreviewLoaderFinished}
              />
            ) : loadingAll ? (
              <PdfGenerationLoader
                active
                ready={zipReady}
                stages={zipStages}
                title="Building ZIP…"
                onFinished={handleZipLoaderFinished}
              />
            ) : (
              <>
                <FileText className="w-14 h-14 text-zinc-200" />
                <div>
                  <p className="text-sm font-medium text-zinc-400">No preview yet</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{canPreview ? 'Select options and click Preview PDF' : 'Select forms and click Generate All to download ZIP'}</p>
                </div>
                {canPreview && isReady && <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}><Eye className="mr-1.5 h-3 w-3" />Preview PDF</Button>}
                {isReady && !canPreview && !restrictToDeptForms && <Button size="sm" className="mt-1 text-xs h-7 bg-zinc-900 hover:bg-zinc-700 text-white" onClick={handleGenerateAll} disabled={isBusy}><Package className="mr-1.5 h-3 w-3" />Generate All — Download ZIP</Button>}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// LEP PANEL
// ═════════════════════════════════════════════════════════════════════════════

const LepPanel: React.FC<{
  budgetPlans:   BudgetPlan[];
  departments:   Department[];
  filterOptions: FilterOption[];
  loadingInit:   boolean;
}> = ({ budgetPlans, departments, filterOptions, loadingInit }) => {

  const [selectedPlanId, setSelectedPlanId] = useState<string>('');
  const [selectedForms,  setSelectedForms]  = useState<Set<LepFormId>>(new Set());
  const [selectedDept,   setSelectedDept]   = useState<string>('all');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const isMobile = useIsMobile();
  const [mobileView,     setMobileView]     = useState<'options' | 'preview'>('options');
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loadingDl,      setLoadingDl]      = useState(false);
  const [previewUrl,     setPreviewUrl]     = useState<string | null>(null);
  const [innerTab,       setInnerTab]       = useState<'generate' | 'settings' | 'amelioration' | 'administrative' | 'sp20mdf' | 'spcalamity5' | 'spappropriation' | 'generalprovisions'>('generate');

  useEffect(() => {
    const active = budgetPlans.find(p => p.is_active);
    if (active) setSelectedPlanId(String(active.budget_plan_id));
  }, [budgetPlans]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    if (isMobile && previewUrl) setMobileView('preview');
  }, [isMobile, previewUrl]);

  const toggleForm = (id: LepFormId) => {
    setSelectedForms(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
    setPreviewUrl(null);
  };

  const isReady = Boolean(selectedPlanId) && selectedForms.size > 0;
  const isBusy  = loadingPreview || loadingDl;

  const activeDef       = selectedForms.size === 1 ? LEP_FORM_DEFS.find(f => selectedForms.has(f.id)) : undefined;
  const currentEndpoint = activeDef?.endpoint ?? '';
  const canPreview      = isReady && Boolean(currentEndpoint);
  const needsDept       = activeDef?.needsDept   ?? false;
  const needsFilter     = activeDef?.needsFilter  ?? false;

  const fetchLepPdf = useCallback(async (download: boolean): Promise<Blob> => {
    if (!currentEndpoint) throw new Error('Select a single LEP document to preview.');
    const params: Record<string, unknown> = {
      budget_plan_id: selectedPlanId,
      download:       download ? 1 : undefined,
      _:              Date.now(),
    };
    if (needsDept)   params.department = selectedDept;
    if (needsFilter) params.filter     = selectedFilter;

    const response = await API.post(currentEndpoint, null, {
      params,
      responseType: 'blob',
      headers: { Accept: 'application/pdf', 'X-Requested-With': 'XMLHttpRequest' },
    });
    if (!response.headers['content-type']?.includes('application/pdf')) {
      const text = await (response.data as Blob).text();
      let msg = 'Server error';
      try { msg = JSON.parse(text).error || msg; } catch { msg = text || msg; }
      throw new Error(msg);
    }
    if ((response.data as Blob).size === 0) throw new Error('Empty PDF received');
    return response.data as Blob;
  }, [currentEndpoint, selectedPlanId, needsDept, selectedDept, needsFilter, selectedFilter]);

  const [previewReady, setPreviewReady] = useState(false);
  const pendingBlobRef = useRef<Blob | null>(null);

  const handlePreview = async () => {
    if (!canPreview || loadingPreview) return;
    setLoadingPreview(true);
    setPreviewReady(false);
    if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); }
    try {
      pendingBlobRef.current = await fetchLepPdf(false);
      setPreviewReady(true);
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate preview');
      setLoadingPreview(false);
    }
  };

  const handlePreviewLoaderFinished = () => {
    if (pendingBlobRef.current) setPreviewUrl(URL.createObjectURL(pendingBlobRef.current));
    pendingBlobRef.current = null;
    setLoadingPreview(false);
    setPreviewReady(false);
  };

  const handleDownload = async () => {
    if (!canPreview || loadingDl) return;
    setLoadingDl(true);
    try {
      const blob  = await fetchLepPdf(true);
      const plan  = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
      const label = Array.from(selectedForms).map(f => f.toUpperCase()).join('-');
      const url   = URL.createObjectURL(blob);
      const a     = Object.assign(document.createElement('a'), {
        href:     url,
        download: `LEP_${label}_FY${plan?.year ?? ''}.pdf`,
      });
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('PDF downloaded');
    } catch (err: any) { toast.error(err.message ?? 'Failed to download'); }
    finally { setLoadingDl(false); }
  };

  const selectedPlan = budgetPlans.find(p => String(p.budget_plan_id) === selectedPlanId);
  const selectedDeptName = selectedDept === 'all'
    ? 'All Offices'
    : departments.find(d => String(d.dept_id) === selectedDept)?.dept_name ?? '—';

  const selectedLepDefs = LEP_FORM_DEFS.filter(f => selectedForms.has(f.id));
  const deptStageLabels = needsDept && selectedDept === 'all'
    ? departments.map(d => `Compiling for ${d.dept_abbreviation || d.dept_name}`)
    : [];
  const previewStages = [
    'Sending request',
    ...selectedLepDefs.map(f => `Compiling ${f.label}`),
    ...deptStageLabels,
    'Rendering layout',
    'Loading preview',
  ];

  return (
    // FIX: same absolute inset pattern as AbpPanel
    <div className={cn("absolute inset-0 flex overflow-hidden", isMobile && "flex-col")}>

      {/* ── Left sidebar ── */}
      <div className={cn(
        "flex-shrink-0 flex flex-col min-h-0 h-full border-r border-border bg-muted/30 overflow-hidden",
        isMobile ? cn("w-full border-r-0", mobileView === 'preview' && "hidden") : "w-64"
      )}>
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4">

          {/* Budget plan */}
          <div>
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
              Budget Plan
            </Label>
            <Select value={selectedPlanId} onValueChange={v => { setSelectedPlanId(v); setPreviewUrl(null); }} disabled={loadingInit}>
              <SelectTrigger className="w-full h-8 text-xs">
                <SelectValue placeholder={loadingInit ? 'Loading…' : 'Select plan'} />
              </SelectTrigger>
              <SelectContent>
                {budgetPlans.map(p => (
                  <SelectItem key={p.budget_plan_id} value={String(p.budget_plan_id)}>
                    <span className="flex items-center gap-1.5">
                      Budget Year {p.year}
                      {p.is_active && <Badge variant="secondary" className="h-4 px-1.5 text-[9px] bg-green-100 text-green-700 border-green-200 hover:bg-green-100">Active</Badge>}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Generate / Header / Amelioration toggle */}
          <div className="flex flex-wrap rounded-md border border-border overflow-hidden bg-card p-0.5 gap-0.5">
            {(['generate', 'settings', 'amelioration', 'administrative', 'sp20mdf', 'spcalamity5', 'spappropriation', 'generalprovisions'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => { setInnerTab(tab); if (isMobile && tab === 'settings') setMobileView('preview'); }}
                className={cn(
                  'basis-[calc(33.333%-0.167rem)] flex-grow py-1.5 rounded-[5px] text-[9px] font-semibold flex items-center justify-center gap-1 transition-colors whitespace-nowrap',
                  innerTab === tab
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent',
                )}
              >
                {tab === 'generate'
                  ? <><ClipboardList className="h-3 w-3 shrink-0" />Generate</>
                  : tab === 'settings'
                    ? <><Settings2 className="h-3 w-3 shrink-0" />Header</>
                    : tab === 'amelioration'
                      ? <><FileText className="h-3 w-3 shrink-0" />Amelioration</>
                      : tab === 'administrative'
                        ? <><FileText className="h-3 w-3 shrink-0" />Admin. Proc.</>
                        : tab === 'sp20mdf'
                          ? <><FileText className="h-3 w-3 shrink-0" />20% MDF</>
                          : tab === 'spcalamity5'
                            ? <><FileText className="h-3 w-3 shrink-0" />5% Calamity</>
                            : tab === 'spappropriation'
                              ? <><FileText className="h-3 w-3 shrink-0" />Appropriation</>
                              : <><FileText className="h-3 w-3 shrink-0" />Gen. Provisions</>}
              </button>
            ))}
          </div>

          {/* Generate sub-panel */}
          {innerTab === 'generate' && (
            <>
              <div>
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 block">
                  LEP Documents
                </Label>
                <div className="space-y-1.5">
                  {LEP_FORM_DEFS.map((form, idx) => {
                    const checked = selectedForms.has(form.id);
                    return (
                      <button
                        key={form.id}
                        type="button"
                        onClick={() => toggleForm(form.id)}
                        style={{ animationDelay: `${idx * 40}ms` }}
                        className={cn(
                          'w-full text-left rounded-lg border p-2.5 transition-colors animate-stagger-in',
                          checked
                            ? 'border-zinc-900 bg-zinc-900 text-white'
                            : 'border-border bg-card hover:bg-accent text-foreground',
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="space-y-0.5 pr-4">
                            <div className="flex items-center gap-1.5 text-xs font-semibold leading-tight">
                              {form.label}
                              {form.orientation === 'landscape' && (
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    'h-4 px-1 text-[9px] font-normal',
                                    checked
                                      ? 'text-amber-300 border-amber-300/40 bg-transparent'
                                      : 'text-amber-600 border-amber-200 bg-amber-50',
                                  )}
                                >
                                  landscape
                                </Badge>
                              )}
                            </div>
                            <p className={cn('text-[11px] leading-snug', checked ? 'text-zinc-300' : 'text-muted-foreground')}>
                              {form.desc}
                            </p>
                          </div>
                          <div className={cn(
                            'flex-shrink-0 h-4 w-4 rounded-full border flex items-center justify-center mt-0.5',
                            checked ? 'border-white bg-white' : 'border-zinc-300 bg-transparent',
                          )}>
                            {checked && <Check className="h-3 w-3 text-zinc-900" strokeWidth={3} />}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {needsDept && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Office / Department
                  </Label>
                  <Select value={selectedDept} onValueChange={v => { setSelectedDept(v); setPreviewUrl(null); }} disabled={loadingInit}>
                    <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Offices</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.dept_id} value={String(d.dept_id)}>
                          {d.dept_abbreviation ? `${d.dept_abbreviation} — ${d.dept_name}` : d.dept_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {needsFilter && (
                <div>
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5 block">
                    Fund Scope
                  </Label>
                  <Select value={selectedFilter} onValueChange={v => { setSelectedFilter(v); setPreviewUrl(null); }} disabled={loadingInit}>
                    <SelectTrigger className="w-full h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {filterOptions.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {selectedPlan && (
                <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground space-y-1">
                  <p className="text-xs font-semibold text-foreground">Budget Year {selectedPlan.year}</p>
                  {needsDept   && <p>Office: <span className="text-foreground/80">{selectedDeptName}</span></p>}
                  {needsFilter && <p>Scope: <span className="text-foreground/80">{filterOptions.find(f => f.value === selectedFilter)?.label ?? selectedFilter}</span></p>}
                  <p>Docs: <span className="text-foreground/80">{Array.from(selectedForms).join(', ')}</span></p>
                </div>
              )}

              <Separator />

              <div className="flex flex-col gap-2">
                {canPreview ? (
                  <Button onClick={handlePreview} disabled={!isReady || isBusy} variant="outline" size="sm" className="w-full h-8 text-xs">
                    {loadingPreview
                      ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Generating…</>
                      : <><Eye className="mr-1.5 h-3.5 w-3.5" />Preview PDF</>}
                  </Button>
                ) : (
                  <div className="rounded-lg border border-dashed border-border bg-muted/40 px-2.5 py-2 text-[11px] text-muted-foreground text-center leading-snug">
                    Select a single document to preview
                  </div>
                )}
                {canPreview && (
                  <Button onClick={handleDownload} disabled={!isReady || isBusy} size="sm" className="w-full h-8 text-xs">
                    {loadingDl
                      ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Downloading…</>
                      : <><Download className="mr-1.5 h-3.5 w-3.5" />Download PDF</>}
                  </Button>
                )}
                {isMobile && (previewUrl || loadingPreview) && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full h-8 text-xs gap-1.5"
                    onClick={() => setMobileView('preview')}
                  >
                    <Eye className="h-3.5 w-3.5" />
                    {loadingPreview ? 'View Progress' : 'View Preview'}
                  </Button>
                )}
              </div>
            </>
          )}

          {/* Settings sub-panel hint */}
          {innerTab === 'settings' && (
            <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
              Edit the ordinance letterhead, session text, and ordinance number/title that appear on the first page of the LEP report.
              {!selectedPlanId && <p className="mt-1.5 font-semibold text-amber-600">Select a budget plan above first.</p>}
            </div>
          )}

          <div className="h-4" />
        </div>
      </div>

      {/* ── Right content area ── */}
      <div className={cn(
        "flex-1 min-w-0 flex flex-col bg-zinc-100 overflow-hidden",
        isMobile && mobileView === 'options' && "hidden"
      )}>

        {innerTab === 'generate' && (
          <>
            {previewUrl && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                {isMobile && (
                  <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => setMobileView('options')}>
                    <ChevronRight className="h-3 w-3 rotate-180" />Options
                  </Button>
                )}
                <span className="text-xs text-zinc-400">{selectedPlan ? `Budget Year ${selectedPlan.year}` : ''}</span>
                <div className="flex-1" />
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1" onClick={handlePreview} disabled={isBusy}>
                  <RefreshCw className="h-3 w-3" />Refresh
                </Button>
                <Button size="sm" variant="outline" className="h-6 text-xs gap-1" onClick={handleDownload} disabled={isBusy}>
                  <Download className="h-3 w-3" />Save PDF
                </Button>
              </div>
            )}
            {previewUrl ? (
              // FIX: min-h-0 + flex-1 so iframe fills remaining vertical space
              <iframe
                key={previewUrl}
                src={`${previewUrl}#toolbar=0&navpanes=0`}
                className="flex-1 min-h-0 w-full border-0 block"
                title="LEP PDF Preview"
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
                {loadingPreview
                  ? <PdfGenerationLoader
                      active
                      ready={previewReady}
                      stages={previewStages}
                      onFinished={handlePreviewLoaderFinished}
                    />
                  : <>
                      <ClipboardList className="w-14 h-14 text-zinc-200" />
                      <div>
                        <p className="text-sm font-medium text-zinc-400">No preview yet</p>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          {canPreview ? 'Click Preview PDF to generate' : 'Select a single document to preview'}
                        </p>
                      </div>
                      {canPreview && isReady && (
                        <Button size="sm" variant="outline" className="mt-1 text-xs h-7" onClick={handlePreview} disabled={isBusy}>
                          <Eye className="mr-1.5 h-3 w-3" />Preview PDF
                        </Button>
                      )}
                    </>}
              </div>
            )}
          </>
        )}

        {innerTab === 'settings' && (
          // FIX: min-h-0 so the flex child doesn't overflow
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            {selectedPlanId
              ? <LepHeaderEditor
                  budgetPlanId={selectedPlanId}
                  onSaved={() => { if (previewUrl) { URL.revokeObjectURL(previewUrl); setPreviewUrl(null); } }}
                />
              : <div className="flex-1 flex items-center justify-center">
                  <p className="text-sm text-zinc-400">Select a budget plan to edit its header settings.</p>
                </div>
            }
          </div>
        )}

        {innerTab === 'amelioration' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            <PersonnelAmeliorationEditor budgetPlanId={selectedPlanId} />
          </div>
        )}

        {innerTab === 'administrative' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            <AdministrativeProceduresEditor budgetPlanId={selectedPlanId} />
          </div>
        )}

        {innerTab === 'sp20mdf' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            <SP20MdfEditor budgetPlanId={selectedPlanId} />
          </div>
        )}

        {innerTab === 'spcalamity5' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            <SPCalamity5Editor budgetPlanId={selectedPlanId} />
          </div>
        )}

        {innerTab === 'spappropriation' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            <SPAppropriationEditor budgetPlanId={selectedPlanId} />
          </div>
        )}

        {innerTab === 'generalprovisions' && (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col bg-white">
            {isMobile && (
              <div className="flex-shrink-0 flex items-center gap-2 px-3 py-1.5 border-b border-zinc-200 bg-white">
                <Button size="sm" variant="ghost" className="h-6 text-xs gap-1 -ml-1" onClick={() => { setMobileView('options'); setInnerTab('generate'); }}>
                  <ChevronRight className="h-3 w-3 rotate-180" />Options
                </Button>
              </div>
            )}
            <GeneralProvisionsEditor budgetPlanId={selectedPlanId} />
          </div>
        )}

      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═════════════════════════════════════════════════════════════════════════════

const UnifiedReportsPage: React.FC = () => {
  const { user } = useAuth();
  const restrictToCalamity  = user?.role === 'admin-ldrrmo';
  const restrictToDeptForms = user?.role === 'department-head';
  const lockedDeptId        = (user as any)?.dept_id ?? null;
  const canSeeLep = user?.role === 'admin' || user?.role === 'super-admin';
  const isMobile = useIsMobile();

  const [budgetPlans,   setBudgetPlans]   = useState<BudgetPlan[]>([]);
  const [departments,   setDepartments]   = useState<Department[]>([]);
  const [filterOptions, setFilterOptions] = useState<FilterOption[]>([
    { value: 'all',          label: 'All (General Fund + Special Accounts)' },
    { value: 'general-fund', label: 'General Fund only' },
  ]);
  const [loadingInit, setLoadingInit] = useState(true);
  const [activeTab,   setActiveTab]   = useState<'abp' | 'lep'>('abp');

  // Belt-and-suspenders: if role info arrives after mount and this user
  // isn't allowed on LEP, bounce back to ABP rather than leaving them
  // stranded on a tab whose trigger no longer renders.
  useEffect(() => {
    if (!canSeeLep && activeTab === 'lep') setActiveTab('abp');
  }, [canSeeLep, activeTab]);

  useEffect(() => {
    (async () => {
      try {
        const [plansRes, deptsRes, sourcesRes] = await Promise.all([
          API.get('/budget-plans'),
          API.get('/departments'),
          API.get('/reports/unified/sources').catch(() => null),
        ]);
        setBudgetPlans((plansRes.data.data ?? []).sort((a: BudgetPlan, b: BudgetPlan) => b.year - a.year));
        setDepartments(deptsRes.data.data ?? []);
        if (sourcesRes?.data?.data) setFilterOptions(sourcesRes.data.data);
      } catch {
        toast.error('Failed to load data');
      } finally {
        setLoadingInit(false);
      }
    })();
  }, []);

  return (
    <div className="h-dvh flex flex-col overflow-hidden bg-white">

      {/* ── Page header ── */}
      <div className="flex-shrink-0 flex items-center justify-between px-5 py-3 border-b border-zinc-100">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Budget Reports</p>
          <h1 className="text-lg font-bold text-zinc-900 leading-tight">LBP Forms</h1>
          <p className="text-[11px] text-zinc-400">Unified report generator — preview or download as PDF / ZIP</p>
        </div>
      </div>

      {/* ── Tab shell ── */}
      <Tabs
        value={activeTab}
        onValueChange={v => setActiveTab(v as 'abp' | 'lep')}
        // FIX: Tabs itself is a flex column that fills remaining height
        className="flex-1 min-h-0 flex flex-col overflow-hidden"
      >
        {/* Tab strip */}
        <div className="flex-shrink-0 px-5 py-3 bg-white border-b border-zinc-100 overflow-x-auto">
          <TabsList className="h-10 bg-zinc-100 border-0 p-1 gap-1 rounded-lg inline-flex w-max">
            <TabsTrigger
              value="abp"
              className="h-8 px-4 text-xs font-semibold rounded-md border-0 whitespace-nowrap flex-shrink-0
                         data-[state=active]:bg-zinc-900 data-[state=active]:text-white
                         data-[state=active]:shadow-sm
                         text-zinc-500 hover:text-zinc-700 gap-1.5 transition-colors"
            >
              <BookOpen className="h-3.5 w-3.5" />{isMobile ? 'ABP' : 'Annual Budget Proposal'}
            </TabsTrigger>
            {canSeeLep && (
              <TabsTrigger
                value="lep"
                className="h-8 px-4 text-xs font-semibold rounded-md border-0 whitespace-nowrap flex-shrink-0
                           data-[state=active]:bg-zinc-900 data-[state=active]:text-white
                           data-[state=active]:shadow-sm
                           text-zinc-500 hover:text-zinc-700 gap-1.5 transition-colors"
              >
                <ClipboardList className="h-3.5 w-3.5" />{isMobile ? 'LEP' : 'Local Expenditure Program'}
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/*
          FIX: TabsContent must be `relative` so the `absolute inset-0` inside
          AbpPanel / LepPanel anchors correctly and fills the exact panel area.
          `flex-1 min-h-0` lets it consume remaining vertical space.
          `overflow-hidden` prevents any bleed-out.
        */}
        <TabsContent
          value="abp"
          className="relative flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden"
        >
          <AbpPanel
            budgetPlans={budgetPlans}
            departments={departments}
            filterOptions={filterOptions}
            loadingInit={loadingInit}
            restrictToCalamity={restrictToCalamity}
            restrictToDeptForms={restrictToDeptForms}
            lockedDeptId={lockedDeptId}
          />
        </TabsContent>

        {canSeeLep && (
          <TabsContent
            value="lep"
            className="relative flex-1 min-h-0 overflow-hidden mt-0 data-[state=inactive]:hidden"
          >
            <LepPanel
              budgetPlans={budgetPlans}
              departments={departments}
              filterOptions={filterOptions}
              loadingInit={loadingInit}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
};

export default UnifiedReportsPage;
