import React, { useEffect, useState, useMemo, useRef } from 'react'
import { useActiveBudgetPlan } from '@/src/hooks/useActiveBudgetPlan';
import { useSalaryMatrix } from '@/src/hooks/useSalaryMatrix';
import API from '@/src/services/api';
import { Department, SalaryGradeStep } from '@/src/types/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
import {
  Table, TableBody, TableCell, TableFooter,
  TableHead, TableHeader, TableRow,
} from '@/src/components/ui/table';
import { Input } from '@/src/components/ui/input';
import { LoadingState } from '@/src/pages/common/LoadingState';
import { Button } from '@/src/components/ui/button';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';
import {
  Pagination, PaginationContent, PaginationEllipsis,
  PaginationItem, PaginationLink, PaginationNext, PaginationPrevious,
} from '@/src/components/ui/pagination';
import { MagnifyingGlassIcon, XMarkIcon, EyeIcon } from '@heroicons/react/24/outline';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle,
} from '@/src/components/ui/sheet';
import {
  PersonnelServicesSettings,
  DEFAULT_SETTINGS,
  computeRa,
  isDeptEligible,
  type PsSettings,
} from './PersonnelServicesSettings';
import { TabScrollIndicator } from '@/src/components/ui/TabScrollIndicator';

// ── Animation styles injected once ───────────────────────────────────────────

const ANIMATION_STYLES = `
@keyframes ps-fade-up {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}
@keyframes ps-fade-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes ps-slide-right {
  from { opacity: 0; transform: translateX(-8px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ps-scale-in {
  from { opacity: 0; transform: scale(0.97); }
  to   { opacity: 1; transform: scale(1); }
}
@keyframes ps-row-in {
  from { opacity: 0; transform: translateX(-4px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ps-step-row-in {
  from { opacity: 0; transform: translateX(6px); }
  to   { opacity: 1; transform: translateX(0); }
}
@keyframes ps-sheet-item {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}

.ps-animate-fade-up   { animation: ps-fade-up   0.28s cubic-bezier(0.22,1,0.36,1) both; }
.ps-animate-fade-in   { animation: ps-fade-in   0.22s ease both; }
.ps-animate-slide-right { animation: ps-slide-right 0.24s cubic-bezier(0.22,1,0.36,1) both; }
.ps-animate-scale-in  { animation: ps-scale-in  0.26s cubic-bezier(0.22,1,0.36,1) both; }
.ps-animate-row-in    { animation: ps-row-in    0.22s cubic-bezier(0.22,1,0.36,1) both; }
.ps-animate-step-row  { animation: ps-step-row-in 0.20s cubic-bezier(0.22,1,0.36,1) both; }
.ps-animate-sheet-item{ animation: ps-sheet-item 0.24s cubic-bezier(0.22,1,0.36,1) both; }

@media (prefers-reduced-motion: reduce) {
  .ps-animate-fade-up,
  .ps-animate-fade-in,
  .ps-animate-slide-right,
  .ps-animate-scale-in,
  .ps-animate-row-in,
  .ps-animate-step-row,
  .ps-animate-sheet-item {
    animation: none !important;
  }
}
`;

// ── Inject styles once ────────────────────────────────────────────────────────
let stylesInjected = false;
function useAnimationStyles() {
  useEffect(() => {
    if (stylesInjected) return;
    const el = document.createElement('style');
    el.textContent = ANIMATION_STYLES;
    document.head.appendChild(el);
    stylesInjected = true;
  }, []);
}

const PER_PAGE = 10;

// ── Types ─────────────────────────────────────────────────────────────────────

interface ApiAssignment {
  assignment_id: number;
  plantilla_position_id: number;
  personnel_id: number | null;
  assignment_date: string | null;
  effective_date: string | null;
  created_at: string;
  updated_at: string;
  plantilla_position: {
    plantilla_position_id: number;
    old_item_number: string | null;
    new_item_number: string;
    position_title: string;
    salary_grade: number;
    dept_id: number;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  };
  personnel: {
    personnel_id: number;
    first_name: string;
    middle_name: string | null;
    last_name: string;
    is_active: boolean;
    created_at: string;
    updated_at: string;
  } | null;
}

interface ExpenseClassItem {
  expense_class_item_id: number;
  expense_class_item_name: string;
  expense_class_item_acc_code: string | null;
  expense_class_id: number;
  is_active: boolean;
}

interface DeptBudgetPlan {
  dept_budget_plan_id: number;
  dept_id: number;
  budget_plan_id: number;
  status: string;
}

interface RowEdit {
  honoraria: number;
  overtime: number;
  terminalLeave: number;
}

interface AllowanceResult {
  pera: number; ra: number; ta: number; clothing: number;
  subsistence: number; laundry: number; productivity: number;
  cashGift: number; midYearBonus: number; yearEndBonus: number;
  magnaCarta1: number; magnaCarta2: number;
  retirementInsurance: number; pagIbig: number; philHealth: number;
  ecip: number; otherBenefits: number;
}

interface StepIncrementRow {
  step: number;
  monthlyRate: number;
  effectiveDate: Date;
  incrementMonths: number;
  incrAnnual: number;
  pera: number; ra: number; ta: number;
  clothing: number; subsistence: number; laundry: number; productivity: number;
  cashGift: number; midYearBonus: number; yearEndBonus: number;
  magnaCarta1: number; magnaCarta2: number;
  retirementInsurance: number; pagIbig: number; philHealth: number;
  ecip: number; otherBenefits: number;
  incrSubTotal: number;
  annualDiff: number;
  peraDiff: number; raDiff: number; taDiff: number;
  clothingDiff: number; subsistenceDiff: number; laundryDiff: number; productivityDiff: number;
  cashGiftDiff: number; midYearBonusDiff: number; yearEndBonusDiff: number;
  magnaCarta1Diff: number; magnaCarta2Diff: number;
  retirementInsuranceDiff: number; pagIbigDiff: number; philHealthDiff: number;
  ecipDiff: number; otherBenefitsDiff: number;
  annualRateDiff: number;
  diffSubTotal: number;
}

interface PersonnelServiceRow {
  positionId: number;
  plantillaPositionId: number;
  personnelId: number | null;
  oldItemNumber: string;
  newItemNumber: string;
  positionTitle: string;
  incumbentName: string;
  salaryGrade: number;
  baseStep: number;
  monthlyRate: number;
  annualRate: number;
  pera: number; ra: number; ta: number;
  clothing: number; subsistence: number; laundry: number; productivity: number;
  honoraria: number; overtime: number;
  cashGift: number; midYearBonus: number; yearEndBonus: number;
  magnaCarta1: number; magnaCarta2: number;
  retirementInsurance: number; pagIbig: number; philHealth: number;
  ecip: number; otherBenefits: number; terminalLeave: number;
  rowSubTotal: number;
  incrementRow: StepIncrementRow | null;
  rowTotal: number;
  stepUpDate: Date | null;
  baseMonths: number;
  incrementMonths: number;
  savedMonthly: number;
  savedAnnual: number;
}

const ALLOWANCE_TO_EXPENSE_ITEM: Record<string, string[]> = {
  wagesRegular:        ['Salaries and Wages - Regular'],
  pera:                ['Personal Economic Relief Allowance (PERA)'],
  ra:                  ['Representation Allowance (RA)'],
  ta:                  ['Transportation Allowance (TA)'],
  clothing:            ['Clothing/Uniform Allowance'],
  subsistence:         ['Subsistence Allowance'],
  laundry:             ['Laundry Allowance'],
  productivity:        ['Productivity Incentive Allowance'],
  hazardPay:           ['Hazard Pay'],
  honoraria:           ['Honoraria'],
  overtime:            ['Overtime and Night Pay'],
  cashGift:            ['Cash Gift'],
  midYearBonus:        ['Mid-Year Bonus'],
  yearEndBonus:        ['Year End Bonus'],
  retirementInsurance: ['Retirement and Life Insurance Premiums'],
  pagIbig:             ['Pag-IBIG Contributions'],
  philHealth:          ['PhilHealth Contributions'],
  ecip:                ['Employees Compensation Insurance Premiums'],
  otherBenefits:       ['Other Personnel Benefits'],
  terminalLeave:       ['Terminal Leave Benefits'],
};

const LS_SETTINGS_KEY = 'ps_settings_v3';
const LS_EDITS_KEY    = 'ps_edits';

function lsGet<T>(key: string, fallback: T): T {
  try { const raw = localStorage.getItem(key); if (raw) return JSON.parse(raw) as T; } catch {}
  return fallback;
}
function lsSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

const toNumber = (v: unknown): number => {
  if (typeof v === 'number' && !isNaN(v)) return v;
  if (typeof v === 'string') { const p = parseFloat(v); return isNaN(p) ? 0 : p; }
  return 0;
};
const fmt  = (v: unknown) => `₱${Math.round(toNumber(v)).toLocaleString()}`;
const fmtD = (v: number) => {
  if (Math.round(v) === 0) return <span className="text-gray-300">—</span>;
  const positive = v > 0;
  return (
    <span className={positive ? 'text-blue-700' : 'text-red-600'}>
      {positive ? '+' : ''}{fmt(v)}
    </span>
  );
};

function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function highlightMatch(text: string, q: string): React.ReactNode {
  if (!q.trim()) return text;
  const idx = text.toLowerCase().indexOf(q.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-[2px] px-0.5">
        {text.slice(idx, idx + q.trim().length)}
      </mark>
      {text.slice(idx + q.trim().length)}
    </>
  );
}

function filterRows(rows: PersonnelServiceRow[], q: string): PersonnelServiceRow[] {
  const lq = q.trim().toLowerCase();
  if (!lq) return rows;
  return rows.filter(r =>
    r.positionTitle.toLowerCase().includes(lq) ||
    r.incumbentName.toLowerCase().includes(lq) ||
    r.newItemNumber.toLowerCase().includes(lq) ||
    r.oldItemNumber.toLowerCase().includes(lq),
  );
}

function getPageNumbers(page: number, total: number): (number | 'ellipsis')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | 'ellipsis')[] = [1];
  if (page > 3) pages.push('ellipsis');
  for (let p = Math.max(2, page - 1); p <= Math.min(total - 1, page + 1); p++) pages.push(p);
  if (page < total - 2) pages.push('ellipsis');
  pages.push(total);
  return pages;
}

function useDebounce<T>(value: T, delay: number): T {
  const [d, setD] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setD(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return d;
}

function mergeWithDefaults(saved: Partial<PsSettings>): PsSettings {
  return {
    ...DEFAULT_SETTINGS, ...saved,
    ra:                 (saved.ra                 ?? DEFAULT_SETTINGS.ra).map(r => ({ ...r })),
    subsistence_depts:  (saved.subsistence_depts  ?? DEFAULT_SETTINGS.subsistence_depts).map(d => ({ ...d })),
    laundry_depts:      (saved.laundry_depts       ?? DEFAULT_SETTINGS.laundry_depts).map(d => ({ ...d })),
    magna_carta1_depts: (saved.magna_carta1_depts  ?? DEFAULT_SETTINGS.magna_carta1_depts).map(d => ({ ...d })),
    magna_carta2_depts: (saved.magna_carta2_depts  ?? DEFAULT_SETTINGS.magna_carta2_depts).map(d => ({ ...d })),
    magna_carta_rate:   saved.magna_carta_rate     ?? DEFAULT_SETTINGS.magna_carta_rate,
  };
}

function getAssignmentDate(assign: ApiAssignment): Date | null {
  const raw = assign.assignment_date ?? assign.effective_date;
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

function computeStepInfo(assignDate: Date | null, budgetYear: number): {
  baseStep: number; nextStep: number;
  stepUpDate: Date | null; baseMonths: number; incrementMonths: number;
} {
  const none = (s: number) => ({ baseStep: s, nextStep: s, stepUpDate: null, baseMonths: 12, incrementMonths: 0 });
  if (!assignDate) return none(1);
  const aYear = assignDate.getFullYear();
  const aMonth = assignDate.getMonth();
  const aDay   = assignDate.getDate();
  const gap = budgetYear - aYear;
  if (gap <= 0) return none(1);
  const blocksComplete = Math.floor((gap - 1) / 3);
  const baseStep       = Math.min(8, 1 + blocksComplete);
  if (baseStep >= 8) return none(8);
  const nextAnnivYear = aYear + (blocksComplete + 1) * 3;
  if (nextAnnivYear !== budgetYear) return none(baseStep);
  const stepUpDate      = new Date(nextAnnivYear, aMonth, aDay);
  const nextStep        = Math.min(8, baseStep + 1);
  const incrStartMonth0 = aDay <= 15 ? aMonth : aMonth + 1;
  const incrementMonths = Math.max(0, 12 - incrStartMonth0);
  const baseMonths      = 12 - incrementMonths;
  return { baseStep, nextStep, stepUpDate, baseMonths, incrementMonths };
}

function calcAllowances(
  monthly: number, months: number,
  deptId: number, salaryGrade: number,
  s: PsSettings, mcRate: number,
): AllowanceResult {
  const annual     = monthly * months;
  const annualFull = monthly * 12;
  const pera        = monthly > 0 ? s.pera_monthly * months : 0;
  const ra          = computeRa(salaryGrade, s.ra) * (months / 12);
  const ta          = ra;
  const clothing    = annualFull >= s.annual_threshold ? s.clothing_annual * (months / 12) : 0;
  const subEl       = isDeptEligible(deptId, s.subsistence_depts);
  const subsistence = subEl && annualFull >= s.subsistence_threshold ? s.subsistence_monthly * months : 0;
  const laundryEl   = isDeptEligible(deptId, s.laundry_depts);
  const laundry     = laundryEl && annualFull >= s.laundry_threshold ? s.laundry_monthly * months : 0;
  const productivity = annualFull >= s.annual_threshold ? s.productivity_annual * (months / 12) : 0;
  const cashGift     = annualFull >= s.annual_threshold ? s.cash_gift_annual * (months / 12) : 0;
  const midYearBonus = monthly * (months / 12);
  const yearEndBonus = monthly * (months / 12);
  const mc1El       = isDeptEligible(deptId, s.magna_carta1_depts ?? DEFAULT_SETTINGS.magna_carta1_depts);
  const magnaCarta1 = mc1El && annual > 0 ? annual * mcRate : 0;
  const mc2El       = isDeptEligible(deptId, s.magna_carta2_depts ?? DEFAULT_SETTINGS.magna_carta2_depts);
  const magnaCarta2 = mc2El && annual > 0 ? annual * mcRate : 0;
  const retirementInsurance = annual > 1 ? annual * (s.retirement_rate / 100) : 0;
  const pagIbig             = monthly > 0 ? monthly * (s.pagibig_rate / 100) * months : 0;
  const phM                 = monthly * (s.philhealth_rate / 100);
  const philHealth          = phM >= s.philhealth_cap ? s.philhealth_cap * months : phM * months;
  const ecipRaw             = annual * (s.ecip_rate / 100);
  const ecip                = ecipRaw >= s.ecip_cap ? s.ecip_cap * (months / 12) : ecipRaw;
  const otherBenefits       = monthly >= 1 ? (monthly / 22) * s.other_benefits_days * (months / 12) : 0;
  return { pera, ra, ta, clothing, subsistence, laundry, productivity, cashGift, midYearBonus, yearEndBonus, magnaCarta1, magnaCarta2, retirementInsurance, pagIbig, philHealth, ecip, otherBenefits };
}

function sumAllowances(a: AllowanceResult): number {
  return a.pera + a.ra + a.ta + a.clothing + a.subsistence + a.laundry +
    a.productivity + a.cashGift + a.midYearBonus + a.yearEndBonus +
    a.magnaCarta1 + a.magnaCarta2 + a.retirementInsurance + a.pagIbig +
    a.philHealth + a.ecip + a.otherBenefits;
}

// ── Component ─────────────────────────────────────────────────────────────────

const PersonnelServices: React.FC = () => {
  useAnimationStyles();

  const { activePlan, loading: planLoading }              = useActiveBudgetPlan();
  const { activeVersion, matrix, loading: matrixLoading, refresh } = useSalaryMatrix();

  const [departments,       setDepartments]       = useState<Department[]>([]);
  const [assignments,       setAssignments]       = useState<ApiAssignment[]>([]);
  const [expenseClassItems, setExpenseClassItems] = useState<ExpenseClassItem[]>([]);
  const [deptBudgetPlans,   setDeptBudgetPlans]   = useState<DeptBudgetPlan[]>([]);
  const [loading,           setLoading]           = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [activeTab,         setActiveTab]         = useState<string>('');

  // Track tab changes for re-triggering row animations
  const [tabAnimKey, setTabAnimKey] = useState(0);

  const [settings, setSettings] = useState<PsSettings>(() => mergeWithDefaults(lsGet<Partial<PsSettings>>(LS_SETTINGS_KEY, {})));
  const [edits,    setEdits]    = useState<Record<number, RowEdit>>(() => lsGet(LS_EDITS_KEY, {} as Record<number, RowEdit>));

  const [searchRaw,    setSearchRaw] = useState<Record<string, string>>({});
  const debouncedSearchMap           = useDebounce(searchRaw, 250);
  const [pageMap, setPageMap]        = useState<Record<string, number>>({});

  const prevVersionId = useRef<number | null>(null);
  const [detailRow, setDetailRow] = useState<PersonnelServiceRow | null>(null);
  const [deptDetailDept, setDeptDetailDept] = useState<number | null>(null);

  const setTabPage   = (tab: string, p: number) => setPageMap(prev => ({ ...prev, [tab]: p }));
  const setTabSearch = (tab: string, val: string) => { setSearchRaw(prev => ({ ...prev, [tab]: val })); setTabPage(tab, 1); };
  const handleSettingsChange = (s: PsSettings) => { setSettings(s); lsSet(LS_SETTINGS_KEY, s); };
  const handleEditChange = (posId: number, field: keyof RowEdit, value: number) => {
    setEdits(prev => {
      const next = { ...prev, [posId]: { ...(prev[posId] ?? { honoraria: 0, overtime: 0, terminalLeave: 0 }), [field]: value } };
      lsSet(LS_EDITS_KEY, next);
      return next;
    });
  };

  // Re-trigger row animations on tab change
  const handleTabChange = (val: string) => {
    setActiveTab(val);
    setTabAnimKey(k => k + 1);
  };

  useEffect(() => {
    refresh();
    (async () => {
      setLoading(true);
      try {
        const [dR, aR, eR] = await Promise.all([
          API.get('/departments'),
          API.get('/plantilla-assignments'),
          API.get('/expense-class-items'),
        ]);
        const depts: Department[] = dR.data.data || [];
        setDepartments(depts);
        setAssignments(aR.data.data || []);
        setExpenseClassItems(eR.data.data || []);
        if (depts.length > 0) setActiveTab(depts[0].dept_id.toString());
      } catch { toast.error('Failed to load personnel data'); }
      finally { setLoading(false); }
    })();
  }, []);

  useEffect(() => {
    if (!activeVersion) return;
    const newId = activeVersion.salary_standard_version_id;
    if (prevVersionId.current !== null && prevVersionId.current !== newId) {
      toast.info(`Salary recalculated using ${activeVersion.lbc_reference} (${activeVersion.tranche})`);
    }
    prevVersionId.current = newId;
  }, [activeVersion]);

  useEffect(() => {
    if (!activePlan) return;
    API.get('/department-budget-plans', { params: { 'filter[budget_plan_id]': activePlan.budget_plan_id } })
      .then(r => setDeptBudgetPlans(r.data?.data || []))
      .catch(console.error);
  }, [activePlan]);

  const salaryLookup = useMemo(() => {
    const map = new Map<string, number>();
    matrix.forEach((m: SalaryGradeStep) => map.set(`${m.salary_grade}-${m.step}`, toNumber(m.salary)));
    return map;
  }, [matrix]);

  const getSalary = (grade: number, step: number) => salaryLookup.get(`${grade}-${step}`) ?? 0;

  const findExpenseItemId = (key: string): number | null => {
    const patterns = ALLOWANCE_TO_EXPENSE_ITEM[key];
    if (!patterns) return null;
    return expenseClassItems.find(i => patterns.some(p => i.expense_class_item_name.toLowerCase().includes(p.toLowerCase())))?.expense_class_item_id ?? null;
  };

  const departmentRows = useMemo(() => {
    if (!activePlan || matrix.length === 0) return {} as Record<number, PersonnelServiceRow[]>;
    const s      = settings;
    const mcRate = (s.magna_carta_rate ?? DEFAULT_SETTINGS.magna_carta_rate) / 100;
    const bYear  = activePlan.year;
    const rowsByDept: Record<number, PersonnelServiceRow[]> = {};

    assignments.forEach(assign => {
      const pos = assign.plantilla_position;
      if (!pos?.is_active) return;
      const deptId = pos.dept_id;
      if (!rowsByDept[deptId]) rowsByDept[deptId] = [];

      const { baseStep, nextStep, stepUpDate, baseMonths, incrementMonths } = computeStepInfo(getAssignmentDate(assign), bYear);
      const sg      = pos.salary_grade;
      const baseMon = getSalary(sg, baseStep);
      const baseAnn = baseMon * baseMonths;
      const baseAllow = calcAllowances(baseMon, baseMonths, deptId, sg, s, mcRate);

      const edit      = edits[pos.plantilla_position_id] ?? { honoraria: 0, overtime: 0, terminalLeave: 0 };
      const honoraria = toNumber(edit.honoraria);
      const overtime  = toNumber(edit.overtime);
      const termLeave = toNumber(edit.terminalLeave);

      const rowSubTotal = baseAnn + sumAllowances(baseAllow) + honoraria + overtime + termLeave;

      let incrementRow: StepIncrementRow | null = null;

      if (stepUpDate !== null && incrementMonths > 0 && nextStep > baseStep) {
        const newMon     = getSalary(sg, nextStep);
        const incrAnn    = newMon * incrementMonths;
        const incrAllow  = calcAllowances(newMon,  incrementMonths, deptId, sg, s, mcRate);
        const baseAllow2 = calcAllowances(baseMon, incrementMonths, deptId, sg, s, mcRate);
        const incrSubTotal = incrAnn + sumAllowances(incrAllow);

        const annualRateDiff = (newMon - baseMon) * incrementMonths;
        const peraDiff               = incrAllow.pera   - baseAllow2.pera;
        const raDiff                 = incrAllow.ra     - baseAllow2.ra;
        const taDiff                 = incrAllow.ta     - baseAllow2.ta;
        const clothingDiff           = incrAllow.clothing    - baseAllow2.clothing;
        const subsistenceDiff        = incrAllow.subsistence - baseAllow2.subsistence;
        const laundryDiff            = incrAllow.laundry     - baseAllow2.laundry;
        const productivityDiff       = incrAllow.productivity - baseAllow2.productivity;
        const cashGiftDiff           = incrAllow.cashGift    - baseAllow2.cashGift;
        const midYearBonusDiff       = incrAllow.midYearBonus - baseAllow2.midYearBonus;
        const yearEndBonusDiff       = incrAllow.yearEndBonus - baseAllow2.yearEndBonus;
        const magnaCarta1Diff        = incrAllow.magnaCarta1 - baseAllow2.magnaCarta1;
        const magnaCarta2Diff        = incrAllow.magnaCarta2 - baseAllow2.magnaCarta2;
        const retirementInsuranceDiff = incrAllow.retirementInsurance - baseAllow2.retirementInsurance;
        const pagIbigDiff            = incrAllow.pagIbig   - baseAllow2.pagIbig;
        const philHealthDiff         = incrAllow.philHealth - baseAllow2.philHealth;
        const ecipDiff               = incrAllow.ecip       - baseAllow2.ecip;
        const otherBenefitsDiff      = incrAllow.otherBenefits - baseAllow2.otherBenefits;

        const diffSubTotal =
          annualRateDiff + peraDiff + raDiff + taDiff + clothingDiff + subsistenceDiff +
          laundryDiff + productivityDiff + cashGiftDiff + midYearBonusDiff + yearEndBonusDiff +
          magnaCarta1Diff + magnaCarta2Diff + retirementInsuranceDiff + pagIbigDiff +
          philHealthDiff + ecipDiff + otherBenefitsDiff;

        incrementRow = {
          step: nextStep, monthlyRate: newMon, effectiveDate: stepUpDate, incrementMonths,
          incrAnnual: incrAnn,
          pera: incrAllow.pera, ra: incrAllow.ra, ta: incrAllow.ta,
          clothing: incrAllow.clothing, subsistence: incrAllow.subsistence, laundry: incrAllow.laundry,
          productivity: incrAllow.productivity, cashGift: incrAllow.cashGift,
          midYearBonus: incrAllow.midYearBonus, yearEndBonus: incrAllow.yearEndBonus,
          magnaCarta1: incrAllow.magnaCarta1, magnaCarta2: incrAllow.magnaCarta2,
          retirementInsurance: incrAllow.retirementInsurance, pagIbig: incrAllow.pagIbig,
          philHealth: incrAllow.philHealth, ecip: incrAllow.ecip, otherBenefits: incrAllow.otherBenefits,
          incrSubTotal,
          annualDiff: newMon - baseMon,
          annualRateDiff,
          peraDiff, raDiff, taDiff, clothingDiff, subsistenceDiff, laundryDiff, productivityDiff,
          cashGiftDiff, midYearBonusDiff, yearEndBonusDiff, magnaCarta1Diff, magnaCarta2Diff,
          retirementInsuranceDiff, pagIbigDiff, philHealthDiff, ecipDiff, otherBenefitsDiff,
          diffSubTotal,
        };
      }

      const rowTotal     = rowSubTotal + (incrementRow?.incrSubTotal ?? 0);
      const savedMonthly = incrementRow ? incrementRow.monthlyRate : baseMon;
      const savedAnnual  = baseAnn + (incrementRow?.incrAnnual ?? 0);

      rowsByDept[deptId].push({
        positionId: pos.plantilla_position_id, plantillaPositionId: pos.plantilla_position_id,
        personnelId: assign.personnel_id,
        oldItemNumber: pos.old_item_number || '', newItemNumber: pos.new_item_number || '',
        positionTitle: pos.position_title,
        incumbentName: assign.personnel
          ? `${assign.personnel.last_name}, ${assign.personnel.first_name} ${assign.personnel.middle_name || ''}`.trim()
          : 'Vacant',
        salaryGrade: sg, baseStep,
        monthlyRate: baseMon, annualRate: baseAnn,
        ...baseAllow,
        honoraria, overtime, terminalLeave: termLeave,
        rowSubTotal, incrementRow, rowTotal,
        stepUpDate, baseMonths, incrementMonths,
        savedMonthly, savedAnnual,
      });
    });

    return rowsByDept;
  }, [activePlan, matrix, assignments, edits, settings, salaryLookup]);

  const departmentTotals = useMemo(() => {
    const totals: Record<number, Record<string, number>> = {};
    Object.entries(departmentRows).forEach(([id, rows]) => {
      const acc: Record<string, number> = {};
      rows.forEach(row => {
        const baseKeys: (keyof PersonnelServiceRow)[] = [
          'annualRate', 'pera', 'ra', 'ta', 'clothing', 'subsistence', 'laundry',
          'productivity', 'honoraria', 'overtime', 'cashGift', 'midYearBonus',
          'yearEndBonus', 'magnaCarta1', 'magnaCarta2', 'retirementInsurance',
          'pagIbig', 'philHealth', 'ecip', 'otherBenefits', 'terminalLeave',
          'rowSubTotal', 'rowTotal', 'monthlyRate', 'savedMonthly', 'savedAnnual',
        ];
        baseKeys.forEach(k => { acc[k] = (acc[k] || 0) + (row[k] as number); });
        if (row.incrementRow) {
          const ir = row.incrementRow;
          const pairs: [string, number][] = [
            ['incr_annual', ir.incrAnnual], ['incr_pera', ir.pera], ['incr_ra', ir.ra],
            ['incr_ta', ir.ta], ['incr_clothing', ir.clothing], ['incr_subsistence', ir.subsistence],
            ['incr_laundry', ir.laundry], ['incr_productivity', ir.productivity],
            ['incr_cashGift', ir.cashGift], ['incr_midYearBonus', ir.midYearBonus],
            ['incr_yearEndBonus', ir.yearEndBonus], ['incr_magnaCarta1', ir.magnaCarta1],
            ['incr_magnaCarta2', ir.magnaCarta2], ['incr_retirementInsurance', ir.retirementInsurance],
            ['incr_pagIbig', ir.pagIbig], ['incr_philHealth', ir.philHealth],
            ['incr_ecip', ir.ecip], ['incr_otherBenefits', ir.otherBenefits],
            ['incr_subTotal', ir.incrSubTotal],
          ];
          pairs.forEach(([k, v]) => { acc[k] = (acc[k] || 0) + v; });
        }
      });
      totals[parseInt(id)] = acc;
    });
    return totals;
  }, [departmentRows]);

  const filteredByTab = useMemo(() => {
    const out: Record<string, PersonnelServiceRow[]> = {};
    Object.entries(departmentRows).forEach(([id, rows]) => { out[id] = filterRows(rows, debouncedSearchMap[id] ?? ''); });
    return out;
  }, [departmentRows, debouncedSearchMap]);

  const handleSave = async () => {
    if (!activePlan) { toast.error('No active budget plan found.'); return; }
    const cDeptId = parseInt(activeTab);
    if (!cDeptId) { toast.error('No department selected.'); return; }
    const dbp = deptBudgetPlans.find(p => p.dept_id === cDeptId && p.budget_plan_id === activePlan.budget_plan_id);
    if (!dbp) { toast.error('No department budget plan found.'); return; }
    const rows = departmentRows[cDeptId] || [];
    // const rows = departmentRows[cDeptId] || [];
    //if (rows.length === 0) { toast.warning('No personnel data to save.'); return; }
    
    setSaving(true);
    const savePromise = (async () => {
      // await API.post(`/department-budget-plans/${dbp.dept_budget_plan_id}/plantilla-assignments/bulk`, {
      //   assignments: rows.map(row => ({
      //     plantilla_position_id:      row.plantillaPositionId,
      //     personnel_id:               row.personnelId,
      //     salary_grade:               row.salaryGrade,
      //     step:                       row.incrementRow ? row.incrementRow.step : row.baseStep,
      //     monthly_rate:               row.savedMonthly,
      //     annual_rate:                row.savedAnnual,
      //     annual_increment:           row.incrementRow ? row.incrementRow.annualRateDiff : null,
      //     step_effective_date:        row.incrementRow ? toLocalDateString(row.incrementRow.effectiveDate) : null,
      //     salary_standard_version_id: activeVersion?.salary_standard_version_id ?? null,
      //   })),
      // });
      if (rows.length > 0) {
      await API.post(`/department-budget-plans/${dbp.dept_budget_plan_id}/plantilla-assignments/bulk`, {
        assignments: rows.map(row => ({
          plantilla_position_id:      row.plantillaPositionId,
          personnel_id:               row.personnelId,
          salary_grade:               row.salaryGrade,
          step:                       row.incrementRow ? row.incrementRow.step : row.baseStep,
          monthly_rate:               row.savedMonthly,
          annual_rate:                row.savedAnnual,
          annual_increment:           row.incrementRow ? row.incrementRow.annualRateDiff : null,
          step_effective_date:        row.incrementRow ? toLocalDateString(row.incrementRow.effectiveDate) : null,
          salary_standard_version_id: activeVersion?.salary_standard_version_id ?? null,
        })),
      });
    }

      const totals = departmentTotals[cDeptId] || {};
      const cb = (bk: string, ik: string) => toNumber(totals[bk]) + toNumber(totals[ik] ?? 0);
      const combinedMC = cb('magnaCarta1', 'incr_magnaCarta1') + cb('magnaCarta2', 'incr_magnaCarta2');

      const sums: Record<string, number> = {
        wagesRegular:        cb('annualRate',          'incr_annual'),
        pera:                cb('pera',                'incr_pera'),
        ra:                  cb('ra',                  'incr_ra'),
        ta:                  cb('ta',                  'incr_ta'),
        clothing:            cb('clothing',            'incr_clothing'),
        subsistence:         cb('subsistence',         'incr_subsistence'),
        laundry:             cb('laundry',             'incr_laundry'),
        productivity:        cb('productivity',        'incr_productivity'),
        hazardPay:           combinedMC,
        honoraria:           toNumber(totals.honoraria),
        overtime:            toNumber(totals.overtime),
        cashGift:            cb('cashGift',            'incr_cashGift'),
        midYearBonus:        cb('midYearBonus',        'incr_midYearBonus'),
        yearEndBonus:        cb('yearEndBonus',        'incr_yearEndBonus'),
        retirementInsurance: cb('retirementInsurance', 'incr_retirementInsurance'),
        pagIbig:             cb('pagIbig',             'incr_pagIbig'),
        philHealth:          cb('philHealth',          'incr_philHealth'),
        ecip:                cb('ecip',                'incr_ecip'),
        otherBenefits:       cb('otherBenefits',       'incr_otherBenefits'),
        terminalLeave:       toNumber(totals.terminalLeave),
      };

      const ALWAYS_SNAPSHOT_KEYS = new Set([
        'wagesRegular',
        'pera', 'ra', 'ta', 'clothing', 'productivity',
        'midYearBonus', 'yearEndBonus', 'cashGift',
        'retirementInsurance', 'pagIbig', 'philHealth',
        'ecip', 'otherBenefits', 'terminalLeave',
      ]);

      const exRes = await API.get(`/department-budget-plans/${dbp.dept_budget_plan_id}/items`);
      const exMap = new Map((exRes.data?.data || []).map((i: any) => [i.expense_item_id, i]));

      await Promise.all(Object.entries(sums).map(async ([key, amount]) => {
        const id = findExpenseItemId(key);
        if (!id) return;
        const ex = exMap.get(id) as any;
        if (ex) {
          await API.put(`/department-budget-plans/${dbp.dept_budget_plan_id}/items/${ex.dept_bp_form2_item_id}`, { total_amount: amount });
        } else if (amount > 0 || ALWAYS_SNAPSHOT_KEYS.has(key)) {
          await API.post(`/department-budget-plans/${dbp.dept_budget_plan_id}/items`, { expense_item_id: id, total_amount: amount });
        }
      }));
    })();

    const deptName = departments.find(d => d.dept_id === cDeptId)?.dept_abbreviation
      || departments.find(d => d.dept_id === cDeptId)?.dept_name || 'Department';
    toast.promise(savePromise, {
      loading: `Saving ${deptName}...`,
      success: `${deptName} saved.`,
      error: err => `Save failed: ${err?.response?.data?.message || err?.message || 'Unknown error'}`,
    });
    try { await savePromise; } catch (e) { console.error(e); } finally { setSaving(false); }
  };

  if (planLoading || matrixLoading || loading) return <LoadingState />;
  if (!activePlan)    return <div className="p-8 text-center text-red-600">No active budget plan found.</div>;
  if (!activeVersion) return <div className="p-8 text-center text-yellow-600">No active salary version found.</div>;

  const cDeptId   = parseInt(activeTab);
  const cDeptPlan = deptBudgetPlans.find(p => p.dept_id === cDeptId && p.budget_plan_id === activePlan.budget_plan_id);
  const isSubmitted = cDeptPlan?.status === 'submitted';
  const COL_TOTAL   = 10;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-full">

      {/* ── Page header — fade up on mount ── */}
      <div
        className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 ps-animate-fade-up"
        style={{ animationDelay: '0ms' }}
      >
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Personnel Services</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Budget Year: <span className="font-medium">{activePlan.year}</span>
            {activeTab && (() => {
              const d = departments.find(d => d.dept_id === parseInt(activeTab));
              return d ? <span className="ml-2">— <span className="font-medium">{d.dept_name || d.dept_abbreviation}</span></span> : null;
            })()}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PersonnelServicesSettings settings={settings} onChange={handleSettingsChange} />
          <Button
            onClick={handleSave}
            size="lg"
            className="shadow-sm transition-all duration-200 active:scale-95"
            disabled={saving || isSubmitted}
            title={isSubmitted ? 'Submitted — read only.' : undefined}
          >
            {saving
              ? <span className="flex items-center gap-2"><svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>Saving…</span>
              : 'Save Edits'
            }
          </Button>
        </div>
      </div>

      {/* ── Alert banner — fade up with delay ── */}
      <div
        className="ps-animate-fade-up"
        style={{ animationDelay: '60ms' }}
      >
        {isSubmitted
          ? <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800"><strong>Read-only.</strong> This department's plan has been <span className="font-medium">submitted</span>.</div>
          : <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800"><strong>Save</strong> commits to <span className="font-medium">Form 3</span> and <span className="font-medium">Form 2</span>. When a step increase occurs, a <span className="text-green-700 font-medium">green</span> row shows new-step figures, a <span className="text-blue-700 font-medium">blue</span> row shows the increase, then an <span className="text-orange-600 font-medium">orange</span> row shows the combined total.</div>
        }
      </div>

      {/* ── Tabs ── */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">

        {/* Tab strip — slide in with delay */}
        <div
          className="relative flex items-center gap-1 mb-1 ps-animate-fade-up"
          style={{ animationDelay: '100ms' }}
        >
          <button
            onClick={() => {
              const el = document.getElementById('dept-tabs-scroll');
              if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
            }}
            className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div
            id="dept-tabs-scroll"
            className="flex-1 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            <TabsList className="flex w-max gap-1 bg-transparent p-0 h-auto">
              {departments.map((d, idx) => (
                <TabsTrigger
                  key={d.dept_id}
                  value={d.dept_id.toString()}
                  style={{ animationDelay: `${idx * 30}ms` }}
                  className={cn(
                    'flex-shrink-0 h-8 px-3.5 text-xs font-medium rounded-lg border transition-all duration-200',
                    'text-gray-500 border-transparent bg-gray-100 hover:bg-gray-200 hover:text-gray-800 hover:scale-[1.02]',
                    'data-[state=active]:bg-gray-900 data-[state=active]:text-white data-[state=active]:border-gray-900 data-[state=active]:shadow-md',
                    'data-[state=active]:scale-[1.03]',
                    'ps-animate-scale-in',
                  )}
                  onClick={() => {
                    setTimeout(() => {
                      const strip = document.getElementById('dept-tabs-scroll');
                      const btn   = strip?.querySelectorAll('[role=tab]')[idx] as HTMLElement | undefined;
                      if (strip && btn) {
                        const btnLeft = btn.offsetLeft;
                        const btnWidth = btn.offsetWidth;
                        const stripW = strip.offsetWidth;
                        const scrollL = strip.scrollLeft;
                        if (btnLeft < scrollL + 40) {
                          strip.scrollBy({ left: btnLeft - scrollL - 40, behavior: 'smooth' });
                        } else if (btnLeft + btnWidth > scrollL + stripW - 40) {
                          strip.scrollBy({ left: btnLeft + btnWidth - scrollL - stripW + 40, behavior: 'smooth' });
                        }
                      }
                    }, 0);
                  }}
                >
                  {d.dept_abbreviation || d.dept_name}
                </TabsTrigger>
              ))}
            </TabsList>
          </div>

          {/* <button
            onClick={() => {
              const el = document.getElementById('dept-tabs-scroll');
              if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
            }}
            className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div> */}
        <button
            onClick={() => {
              const el = document.getElementById('dept-tabs-scroll');
              if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
            }}
            className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
        <TabScrollIndicator scrollId="dept-tabs-scroll" />

        {departments.map(dept => {
          const tabKey    = dept.dept_id.toString();
          const allRows   = departmentRows[dept.dept_id] || [];
          const totals    = departmentTotals[dept.dept_id] || {};
          const deptPlan  = deptBudgetPlans.find(p => p.dept_id === dept.dept_id && p.budget_plan_id === activePlan.budget_plan_id);
          const raw       = searchRaw[tabKey] ?? '';
          const deb       = debouncedSearchMap[tabKey] ?? '';
          const searching = deb.trim().length > 0;
          const filtered  = filteredByTab[tabKey] ?? allRows;
          const tabPage   = pageMap[tabKey] ?? 1;
          const totalPgs  = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
          const paginated = filtered.slice((tabPage - 1) * PER_PAGE, tabPage * PER_PAGE);
          const cb        = (bk: string, ik: string) => toNumber(totals[bk]) + toNumber(totals[ik] ?? 0);

          return (
            <TabsContent key={dept.dept_id} value={tabKey} className="mt-4">

              {/* Toolbar — animates in when tab becomes active */}
              <div
                className="flex items-center gap-3 mb-3 flex-wrap ps-animate-fade-up"
                style={{ animationDelay: '40ms' }}
                key={`toolbar-${tabAnimKey}-${tabKey}`}
              >
                {deptPlan && (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="font-medium">Plan ID:</span>
                    <code className="bg-muted px-1.5 py-0.5 rounded">{deptPlan.dept_budget_plan_id}</code>
                    <span className="font-medium ml-2">Status:</span>
                    <span className={cn('px-2 py-0.5 rounded-full font-medium capitalize',
                      deptPlan.status === 'draft'     && 'bg-orange-100 text-orange-700',
                      deptPlan.status === 'submitted' && 'bg-blue-100 text-blue-700',
                      deptPlan.status === 'approved'  && 'bg-green-100 text-green-700',
                    )}>{deptPlan.status}</span>
                    {activeVersion && (
                      <span className="ml-2 inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-2 py-0.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                        {activeVersion.lbc_reference} · {activeVersion.tranche}
                      </span>
                    )}
                  </div>
                )}
                <div className="relative flex-1 min-w-[180px] max-w-xs ml-auto">
                  <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
                  <input
                    value={raw}
                    onChange={e => setTabSearch(tabKey, e.target.value)}
                    placeholder="Search position or incumbent…"
                    className="pl-8 pr-8 h-8 text-xs border border-gray-200 bg-white rounded-md w-full focus:outline-none focus:ring-1 focus:ring-gray-300 transition-shadow"
                  />
                  {raw && (
                    <button onClick={() => setTabSearch(tabKey, '')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
                      <XMarkIcon className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-gray-400">
                  {searching
                    ? <><span className="font-medium text-gray-600">{filtered.length}</span> of <span className="font-medium text-gray-600">{allRows.length}</span> positions</>
                    : <><span className="font-medium text-gray-600">{allRows.length}</span> position{allRows.length !== 1 ? 's' : ''}</>
                  }
                </span>
              </div>

              {/* Legend */}
              <div
                className="flex items-center gap-3 mb-2 text-[11px] text-muted-foreground flex-wrap ps-animate-fade-in"
                style={{ animationDelay: '80ms' }}
                key={`legend-${tabAnimKey}-${tabKey}`}
              >
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-white border border-gray-200 inline-block" />Base step</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-green-50 border border-green-200 inline-block" />New step (green)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-blue-50 border border-blue-200 inline-block" />Increase (blue)</span>
                <span className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-orange-50 border border-orange-200 inline-block" />Combined total (orange)</span>
              </div>

              {/* Table — scale in as a whole */}
              <div
                className="relative border rounded-xl overflow-auto shadow-md bg-card ps-animate-scale-in"
                style={{ animationDelay: '100ms' }}
                key={`table-${tabAnimKey}-${tabKey}`}
              >
                <Table className="min-w-max lg:min-w-full table-auto">
                  <TableHeader className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                    <TableRow className="border-b-2 border-muted">
                      <TableHead colSpan={2} className="text-center bg-muted/50 font-semibold">Item No.</TableHead>
                      <TableHead className="text-center bg-muted/50 font-semibold">Position Title</TableHead>
                      <TableHead className="text-center bg-muted/50 font-semibold">Incumbent</TableHead>
                      <TableHead colSpan={4} className="text-center bg-blue-50 font-semibold text-blue-900">Salary Info</TableHead>
                      <TableHead className="text-center bg-purple-50 font-semibold text-purple-900">Total</TableHead>
                      <TableHead className="text-center bg-muted/30 font-semibold text-muted-foreground">Details</TableHead>
                    </TableRow>
                    <TableRow className="border-b">
                      <TableHead className="text-center text-muted-foreground text-xs">Old</TableHead>
                      <TableHead className="text-center text-muted-foreground text-xs">New</TableHead>
                      <TableHead />
                      <TableHead />
                      <TableHead className="text-center bg-blue-50/50 text-xs">Grade</TableHead>
                      <TableHead className="text-center bg-blue-50/50 text-xs">Step</TableHead>
                      <TableHead className="text-right bg-blue-50/50 whitespace-nowrap text-xs">Monthly</TableHead>
                      <TableHead className="text-right bg-blue-50/50 whitespace-nowrap text-xs">Annual</TableHead>
                      <TableHead />
                      <TableHead />
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {paginated.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={COL_TOTAL} className="py-12 text-center text-muted-foreground ps-animate-fade-in">
                          {searching
                            ? <>No positions match <span className="font-medium text-gray-700">"{deb}"</span>. <button onClick={() => setTabSearch(tabKey, '')} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">Clear search</button></>
                            : 'No personnel assigned in this department.'
                          }
                        </TableCell>
                      </TableRow>
                    ) : paginated.map((row, idx) => {
                      const ir = row.incrementRow;
                      // Stagger delay: max 8 rows × 30ms = 240ms cap, feels snappy
                      const rowDelay = `${Math.min(idx, 8) * 30}ms`;

                      return (
                        <React.Fragment key={row.positionId}>

                          {/* ── Row 1: Base ── */}
                          <TableRow
                            className={cn(
                              'transition-colors ps-animate-row-in',
                              idx % 2 === 0 ? 'bg-background hover:bg-muted/30' : 'bg-muted/5 hover:bg-muted/30',
                            )}
                            style={{ animationDelay: rowDelay }}
                            key={`base-${tabAnimKey}-${row.positionId}`}
                          >
                            <TableCell className="font-mono text-xs">{row.oldItemNumber}</TableCell>
                            <TableCell className="font-mono text-xs">{row.newItemNumber}</TableCell>
                            <TableCell className="font-medium max-w-[200px]">
                              {searching ? highlightMatch(row.positionTitle, deb) : row.positionTitle}
                            </TableCell>
                            <TableCell className="text-sm min-w-[160px]">
                              <div className="flex flex-col gap-0.5">
                                <span>{searching ? highlightMatch(row.incumbentName, deb) : row.incumbentName}</span>
                                {row.stepUpDate && ir && (
                                  <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 w-fit">
                                    <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 10 10"><path d="M5 1.5v7M2 4l3-2.5L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                    Step {row.baseStep}→{ir.step} eff. {row.stepUpDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-center">{row.salaryGrade}</TableCell>
                            <TableCell className="text-center">
                              {ir ? <span className="text-xs">{row.baseStep}<span className="text-muted-foreground"> ({row.baseMonths}mo)</span></span> : row.baseStep}
                            </TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(row.monthlyRate)}</TableCell>
                            <TableCell className="text-right font-mono text-sm">{fmt(row.annualRate)}</TableCell>
                            <TableCell className="text-right font-bold font-mono bg-purple-50/50">{fmt(row.rowSubTotal)}</TableCell>
                            <TableCell className="text-center">
                              <button
                                onClick={() => setDetailRow(row)}
                                className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150 hover:scale-110 active:scale-95"
                                title="View all allowances"
                              >
                                <EyeIcon className="w-3.5 h-3.5" />
                              </button>
                            </TableCell>
                          </TableRow>

                          {/* ── Row 2: New-step (green) ── */}
                          {ir && (
                            <TableRow
                              className="bg-green-50 hover:bg-green-100/60 border-l-4 border-l-green-500 ps-animate-step-row"
                              style={{ animationDelay: `${Math.min(idx, 8) * 30 + 40}ms` }}
                              key={`green-${tabAnimKey}-${row.positionId}`}
                            >
                              <TableCell className="py-1.5" /><TableCell className="py-1.5" /><TableCell className="py-1.5" />
                              <TableCell className="py-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-800">
                                  <svg className="w-3 h-3 text-green-500 shrink-0" fill="none" viewBox="0 0 12 12"><path d="M6 2v8M3 5l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                                  Step {ir.step} · {ir.incrementMonths}mo from {ir.effectiveDate.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' })}
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-[11px] text-green-700 py-1.5">{row.salaryGrade}</TableCell>
                              <TableCell className="text-center text-[11px] text-green-700 font-semibold py-1.5">{ir.step}<span className="text-muted-foreground font-normal text-[10px]"> ({ir.incrementMonths}mo)</span></TableCell>
                              <TableCell className="text-right font-mono text-[11px] text-green-700 py-1.5">{fmt(ir.monthlyRate)}</TableCell>
                              <TableCell className="text-right font-mono text-[11px] text-green-700 py-1.5">{fmt(ir.incrAnnual)}</TableCell>
                              <TableCell className="text-right font-semibold font-mono text-[11px] bg-green-100 py-1.5 text-green-800">{fmt(ir.incrSubTotal)}</TableCell>
                              <TableCell className="py-1.5" />
                            </TableRow>
                          )}

                          {/* ── Row 3: Increment difference (blue) ── */}
                          {ir && (
                            <TableRow
                              className="bg-blue-50 hover:bg-blue-100/60 border-l-4 border-l-blue-500 ps-animate-step-row"
                              style={{ animationDelay: `${Math.min(idx, 8) * 30 + 70}ms` }}
                              key={`blue-${tabAnimKey}-${row.positionId}`}
                            >
                              <TableCell className="py-1.5" /><TableCell className="py-1.5" /><TableCell className="py-1.5" />
                              <TableCell className="py-1.5">
                                <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-800">
                                  <svg className="w-3 h-3 text-blue-500 shrink-0" fill="none" viewBox="0 0 12 12">
                                    <path d="M6 2l4 8H2l4-8z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round"/>
                                  </svg>
                                  Increase from step-up ({ir.incrementMonths}mo)
                                </span>
                              </TableCell>
                              <TableCell className="text-center text-[11px] text-blue-600 py-1.5">{row.salaryGrade}</TableCell>
                              <TableCell className="text-center text-[11px] text-blue-600 py-1.5">
                                <span className="font-semibold">+1</span>
                                <span className="text-muted-foreground font-normal text-[10px]"> step</span>
                              </TableCell>
                              <TableCell className="text-right font-mono text-[11px] py-1.5 text-blue-600">{fmtD(ir.annualDiff)}</TableCell>
                              <TableCell className="text-right font-mono text-[11px] py-1.5 text-blue-600">{fmtD(ir.annualRateDiff)}</TableCell>
                              <TableCell className="text-right font-bold font-mono text-[11px] bg-blue-100 py-1.5">
                                <span className="text-blue-800">+{fmt(ir.diffSubTotal)}</span>
                              </TableCell>
                              <TableCell className="py-1.5" />
                            </TableRow>
                          )}

                          {/* ── Row 4: Combined total (orange) ── */}
                          {ir && (
                            <TableRow
                              className="bg-orange-50 ps-animate-step-row [&>td]:border-t-2 [&>td]:border-b-2 [&>td]:border-orange-300"
                              style={{ animationDelay: `${Math.min(idx, 8) * 30 + 100}ms` }}
                              key={`orange-${tabAnimKey}-${row.positionId}`}
                            >
                              <TableCell colSpan={4} className="py-2 pl-4 text-sm text-orange-800 font-extrabold tracking-wide">
                                ∑ Combined ({row.baseMonths}mo Step {row.baseStep} + {ir.incrementMonths}mo Step {ir.step})
                              </TableCell>
                              <TableCell className="text-right font-mono text-sm font-extrabold text-orange-800 py-2">{row.salaryGrade}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-extrabold text-orange-800 py-2">{fmt(row.savedMonthly)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-extrabold text-orange-800 py-2">{fmt(row.savedMonthly)}</TableCell>
                              <TableCell className="text-right font-mono text-sm font-extrabold text-orange-800 py-2">{fmt(row.savedAnnual)}</TableCell>
                              <TableCell className="text-right font-extrabold font-mono text-sm bg-orange-200 text-orange-900 py-2">{fmt(row.rowTotal)}</TableCell>
                              <TableCell className="py-2" />
                            </TableRow>
                          )}

                        </React.Fragment>
                      );
                    })}
                  </TableBody>

                  {/* {allRows.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30 font-semibold border-t-2 border-muted">
                        <TableCell colSpan={4} className="text-right text-xs uppercase tracking-wide pr-4">Department Total</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right font-mono">{fmt(toNumber(totals.savedMonthly))}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(cb('annualRate', 'incr_annual'))}</TableCell>
                        <TableCell className="text-right font-bold bg-purple-100 font-mono">{fmt(toNumber(totals.rowTotal))}</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableFooter>
                  )} */}
                  {allRows.length > 0 && (
                    <TableFooter>
                      <TableRow className="bg-muted/30 font-semibold border-t-2 border-muted">
                        <TableCell colSpan={4} className="text-right text-xs uppercase tracking-wide pr-4">Department Total</TableCell>
                        <TableCell />
                        <TableCell />
                        <TableCell className="text-right font-mono">{fmt(toNumber(totals.savedMonthly))}</TableCell>
                        <TableCell className="text-right font-mono">{fmt(cb('annualRate', 'incr_annual'))}</TableCell>
                        <TableCell className="text-right font-bold bg-purple-100 font-mono">{fmt(toNumber(totals.rowTotal))}</TableCell>
                        <TableCell className="text-center">
                          <button
                            onClick={() => setDeptDetailDept(dept.dept_id)}
                            className="h-7 w-7 inline-flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all duration-150 hover:scale-110 active:scale-95"
                            title="View department totals breakdown"
                          >
                            <EyeIcon className="w-3.5 h-3.5" />
                          </button>
                        </TableCell>
                      </TableRow>
                    </TableFooter>
                  )}
                </Table>
              </div>

              {totalPgs > 1 && (
                <div
                  className="px-4 py-3 border border-t-0 border-gray-100 rounded-b-xl bg-white flex items-center justify-between ps-animate-fade-in"
                  style={{ animationDelay: '150ms' }}
                  key={`pagination-${tabAnimKey}-${tabKey}`}
                >
                  <p className="text-[11px] text-gray-400">
                    Showing <span className="font-medium text-gray-600">{(tabPage - 1) * PER_PAGE + 1}–{Math.min(tabPage * PER_PAGE, filtered.length)}</span> of <span className="font-medium text-gray-600">{filtered.length}</span>
                  </p>
                  <Pagination className="w-auto mx-0">
                    <PaginationContent className="gap-0.5">
                      <PaginationItem>
                        <PaginationPrevious
                          onClick={() => setTabPage(tabKey, Math.max(1, tabPage - 1))}
                          className={cn('h-7 px-2 text-[11px] rounded-md cursor-pointer transition-all', tabPage === 1 && 'pointer-events-none opacity-40')}
                        />
                      </PaginationItem>
                      {getPageNumbers(tabPage, totalPgs).map((p, i) =>
                        p === 'ellipsis'
                          ? <PaginationItem key={`e-${i}`}><PaginationEllipsis className="h-7 w-7 text-[11px]" /></PaginationItem>
                          : <PaginationItem key={p}>
                              <PaginationLink
                                onClick={() => setTabPage(tabKey, p)}
                                isActive={tabPage === p}
                                className={cn('h-7 w-7 text-[11px] rounded-md cursor-pointer transition-all',
                                  tabPage === p ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900' : 'text-gray-600 hover:bg-gray-50'
                                )}
                              >{p}</PaginationLink>
                            </PaginationItem>
                      )}
                      <PaginationItem>
                        <PaginationNext
                          onClick={() => setTabPage(tabKey, Math.min(totalPgs, tabPage + 1))}
                          className={cn('h-7 px-2 text-[11px] rounded-md cursor-pointer transition-all', tabPage === totalPgs && 'pointer-events-none opacity-40')}
                        />
                      </PaginationItem>
                    </PaginationContent>
                  </Pagination>
                </div>
              )}

            </TabsContent>
          );
        })}
      </Tabs>

      {/* ── Detail Sheet ── */}
      <Sheet open={!!detailRow} onOpenChange={(open) => { if (!open) setDetailRow(null); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          {detailRow && (() => {
            const row = detailRow;
            const ir  = row.incrementRow;
            return (
              <>
                {/* Header — staggered fade up */}
                <SheetHeader
                  className="mb-4 ps-animate-fade-up"
                  style={{ animationDelay: '60ms' }}
                >
                  <SheetTitle className="text-base leading-snug">{row.positionTitle}</SheetTitle>
                  <p className="text-sm text-muted-foreground">{row.incumbentName}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 ps-animate-scale-in" style={{ animationDelay: '80ms' }}>
                      SG {row.salaryGrade} · Step {row.baseStep}
                    </span>
                    <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-0.5 font-mono font-semibold ps-animate-scale-in" style={{ animationDelay: '100ms' }}>
                      {fmt(row.rowTotal)} total
                    </span>
                    {ir && (
                      <span className="text-[11px] bg-green-50 text-green-700 border border-green-200 rounded px-2 py-0.5 ps-animate-scale-in" style={{ animationDelay: '120ms' }}>
                        Step ↑ {row.baseStep}→{ir.step} eff. {row.stepUpDate?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </span>
                    )}
                  </div>
                </SheetHeader>

                {/* Editable fields */}
                <div
                  className="rounded-lg border border-gray-200 bg-gray-50 p-3 mb-4 space-y-2 ps-animate-fade-up"
                  style={{ animationDelay: '120ms' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">Editable Fields</p>
                  {[
                    { label: 'Honoraria',     field: 'honoraria'     as keyof RowEdit },
                    { label: 'Overtime Pay',  field: 'overtime'      as keyof RowEdit },
                    { label: 'Terminal Leave',field: 'terminalLeave' as keyof RowEdit },
                  ].map(({ label, field }, fi) => (
                    <div
                      key={field}
                      className="flex items-center justify-between gap-3 ps-animate-sheet-item"
                      style={{ animationDelay: `${140 + fi * 30}ms` }}
                    >
                      <label className="text-xs text-gray-600 font-medium w-32 shrink-0">{label}</label>
                      <Input
                        type="number"
                        value={(edits[row.positionId] ?? { honoraria: 0, overtime: 0, terminalLeave: 0 })[field]}
                        onChange={e => {
                          handleEditChange(row.positionId, field, parseFloat(e.target.value) || 0);
                          setDetailRow(prev => prev ? { ...prev, [field]: parseFloat(e.target.value) || 0 } : prev);
                        }}
                        disabled={isSubmitted}
                        className="h-8 text-right text-sm font-mono flex-1 transition-shadow focus:shadow-md"
                      />
                    </div>
                  ))}
                </div>

                {/* Allowance sections — staggered */}
                {[
                  { section: 'Allowances', rows: [
                    { label: 'PERA',           base: row.pera,                incr: ir?.pera                ?? null },
                    { label: 'RA',             base: row.ra,                  incr: ir?.ra                  ?? null },
                    { label: 'TA',             base: row.ta,                  incr: ir?.ta                  ?? null },
                    { label: 'Clothing',       base: row.clothing,            incr: ir?.clothing            ?? null },
                    { label: 'Subsistence',    base: row.subsistence,         incr: ir?.subsistence         ?? null },
                    { label: 'Laundry',        base: row.laundry,             incr: ir?.laundry             ?? null },
                    { label: 'Productivity',   base: row.productivity,        incr: ir?.productivity        ?? null },
                    { label: 'Cash Gift',      base: row.cashGift,            incr: ir?.cashGift            ?? null },
                    { label: 'Mid-Year Bonus', base: row.midYearBonus,        incr: ir?.midYearBonus        ?? null },
                    { label: 'Year-End Bonus', base: row.yearEndBonus,        incr: ir?.yearEndBonus        ?? null },
                  ]},
                  { section: 'Magna Carta', rows: [
                    { label: 'Health', base: row.magnaCarta1, incr: ir?.magnaCarta1 ?? null },
                    { label: 'PSW',    base: row.magnaCarta2, incr: ir?.magnaCarta2 ?? null },
                  ]},
                  { section: 'Contributions', rows: [
                    { label: 'Ret. Insurance', base: row.retirementInsurance, incr: ir?.retirementInsurance ?? null },
                    { label: 'Pag-IBIG',       base: row.pagIbig,             incr: ir?.pagIbig             ?? null },
                    { label: 'PhilHealth',     base: row.philHealth,          incr: ir?.philHealth          ?? null },
                    { label: 'ECIP',           base: row.ecip,                incr: ir?.ecip                ?? null },
                    { label: 'Other Benefits', base: row.otherBenefits,       incr: ir?.otherBenefits       ?? null },
                  ]},
                ].map(({ section, rows: sRows }, si) => (
                  <div
                    key={section}
                    className="mb-4 ps-animate-fade-up"
                    style={{ animationDelay: `${240 + si * 60}ms` }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{section}</p>
                    <div className="rounded-lg border border-gray-100 overflow-hidden">

                      {/* Column headers */}
                      <div
                        className="grid px-3 py-1.5 bg-gray-100 border-b border-gray-200"
                        style={{ gridTemplateColumns: ir ? '1fr 88px 88px 88px' : '1fr 88px 88px' }}
                      >
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">Item</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-green-600 text-right">Base</span>
                        {ir && <span className="text-[10px] font-semibold uppercase tracking-wide text-blue-500 text-right">+Step</span>}
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-orange-500 text-right">Total</span>
                      </div>

                      {/* Data rows — each row staggered */}
                      {sRows.map(({ label, base, incr }, i) => {
                        const combined = base + (ir && incr !== null ? incr : 0);
                        const incrVal  = ir && incr !== null ? incr : 0;
                        return (
                          <div
                            key={label}
                            className={cn(
                              'grid px-3 py-2 items-center ps-animate-sheet-item',
                              i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60',
                            )}
                            style={{
                              gridTemplateColumns: ir ? '1fr 88px 88px 88px' : '1fr 88px 88px',
                              animationDelay: `${260 + si * 60 + i * 18}ms`,
                            }}
                          >
                            <span className="text-xs text-gray-600 truncate pr-2">{label}</span>
                            <span className="text-xs font-mono text-green-700 tabular-nums text-right">{fmt(base)}</span>
                            {ir && (
                              <span className="text-xs font-mono tabular-nums text-right text-blue-600">
                                {incrVal > 0 ? `+${fmt(incrVal)}` : <span className="text-gray-300">—</span>}
                              </span>
                            )}
                            <span className="text-xs font-mono font-semibold text-orange-600 tabular-nums text-right">{fmt(combined)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}

                {/* Totals summary */}
                <div
                  className="rounded-lg border border-orange-200 bg-orange-50/40 p-3 space-y-1.5 ps-animate-fade-up"
                  style={{ animationDelay: '440ms' }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-orange-400 mb-2">Totals</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-green-700 font-medium">Base sub-total</span>
                    <span className="font-mono font-semibold text-green-700">{fmt(row.rowSubTotal)}</span>
                  </div>
                  {ir && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600 font-medium">Step-up addition</span>
                      <span className="font-mono font-semibold text-blue-700">+{fmt(ir.incrSubTotal)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-orange-200 pt-1.5 mt-1">
                    <span className="font-semibold text-orange-800">Grand Total</span>
                    <span className="font-mono font-bold text-orange-700">{fmt(row.rowTotal)}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

      {/* ── Department Totals Detail Sheet ── */}
      <Sheet open={deptDetailDept !== null} onOpenChange={(open) => { if (!open) setDeptDetailDept(null); }}>
        <SheetContent side="right" className="w-[420px] sm:w-[480px] overflow-y-auto">
          {deptDetailDept !== null && (() => {
            const totals = departmentTotals[deptDetailDept] || {};
            const dept   = departments.find(d => d.dept_id === deptDetailDept);
            const cb     = (bk: string, ik: string) => toNumber(totals[bk]) + toNumber(totals[ik] ?? 0);

            const sections = [
              {
                section: 'Salary',
                rows: [
                  { label: 'Annual Rate (Base)',       value: cb('annualRate', 'incr_annual') },
                ],
              },
              {
                section: 'Allowances',
                rows: [
                  { label: 'PERA',             value: cb('pera',         'incr_pera') },
                  { label: 'RA',               value: cb('ra',           'incr_ra') },
                  { label: 'TA',               value: cb('ta',           'incr_ta') },
                  { label: 'Clothing',         value: cb('clothing',     'incr_clothing') },
                  { label: 'Subsistence',      value: cb('subsistence',  'incr_subsistence') },
                  { label: 'Laundry',          value: cb('laundry',      'incr_laundry') },
                  { label: 'Productivity',     value: cb('productivity', 'incr_productivity') },
                  { label: 'Cash Gift',        value: cb('cashGift',     'incr_cashGift') },
                  { label: 'Mid-Year Bonus',   value: cb('midYearBonus', 'incr_midYearBonus') },
                  { label: 'Year-End Bonus',   value: cb('yearEndBonus', 'incr_yearEndBonus') },
                ],
              },
              {
                section: 'Magna Carta',
                rows: [
                  { label: 'Health (MC1)',     value: cb('magnaCarta1',  'incr_magnaCarta1') },
                  { label: 'PSW (MC2)',        value: cb('magnaCarta2',  'incr_magnaCarta2') },
                ],
              },
              {
                section: 'Other Pay Items',
                rows: [
                  { label: 'Honoraria',        value: toNumber(totals.honoraria) },
                  { label: 'Overtime Pay',     value: toNumber(totals.overtime) },
                  { label: 'Terminal Leave',   value: toNumber(totals.terminalLeave) },
                ],
              },
              {
                section: 'Contributions',
                rows: [
                  { label: 'Ret. Insurance',   value: cb('retirementInsurance', 'incr_retirementInsurance') },
                  { label: 'Pag-IBIG',         value: cb('pagIbig',    'incr_pagIbig') },
                  { label: 'PhilHealth',       value: cb('philHealth', 'incr_philHealth') },
                  { label: 'ECIP',             value: cb('ecip',       'incr_ecip') },
                  { label: 'Other Benefits',   value: cb('otherBenefits', 'incr_otherBenefits') },
                ],
              },
            ];

            const grandTotal = toNumber(totals.rowTotal);

            return (
              <>
                <SheetHeader className="mb-4 ps-animate-fade-up" style={{ animationDelay: '60ms' }}>
                  <SheetTitle className="text-base leading-snug">Department Totals</SheetTitle>
                  <p className="text-sm text-muted-foreground">{dept?.dept_name || dept?.dept_abbreviation}</p>
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    <span className="text-[11px] bg-purple-50 text-purple-700 border border-purple-200 rounded px-2 py-0.5 font-mono font-semibold ps-animate-scale-in" style={{ animationDelay: '80ms' }}>
                      {fmt(grandTotal)} grand total
                    </span>
                    <span className="text-[11px] bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5 ps-animate-scale-in" style={{ animationDelay: '100ms' }}>
                      {(departmentRows[deptDetailDept] || []).length} positions
                    </span>
                  </div>
                </SheetHeader>

                {sections.map(({ section, rows: sRows }, si) => (
                  <div
                    key={section}
                    className="mb-4 ps-animate-fade-up"
                    style={{ animationDelay: `${120 + si * 50}ms` }}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1.5">{section}</p>
                    <div className="rounded-lg border border-gray-100 overflow-hidden">
                      {sRows.map(({ label, value }, i) => (
                        <div
                          key={label}
                          className={cn(
                            'flex items-center justify-between px-3 py-2 ps-animate-sheet-item',
                            i % 2 === 0 ? 'bg-white' : 'bg-gray-50/60',
                          )}
                          style={{ animationDelay: `${140 + si * 50 + i * 16}ms` }}
                        >
                          <span className="text-xs text-gray-600">{label}</span>
                          <span className={cn(
                            'text-xs font-mono font-semibold tabular-nums',
                            value === 0 ? 'text-gray-300' : 'text-gray-800',
                          )}>
                            {value === 0 ? '—' : fmt(value)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {/* Grand total summary */}
                <div
                  className="rounded-lg border border-purple-200 bg-purple-50/40 p-3 space-y-1.5 ps-animate-fade-up"
                  style={{ animationDelay: `${120 + sections.length * 50 + 40}ms` }}
                >
                  <p className="text-[10px] font-semibold uppercase tracking-widest text-purple-400 mb-2">Summary</p>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 font-medium">Sub-total (base)</span>
                    <span className="font-mono font-semibold text-gray-700">{fmt(toNumber(totals.rowSubTotal))}</span>
                  </div>
                  {toNumber(totals.incr_subTotal) > 0 && (
                    <div className="flex justify-between text-xs">
                      <span className="text-blue-600 font-medium">Step-up additions</span>
                      <span className="font-mono font-semibold text-blue-700">+{fmt(toNumber(totals.incr_subTotal))}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm border-t border-purple-200 pt-1.5 mt-1">
                    <span className="font-semibold text-purple-800">Grand Total</span>
                    <span className="font-mono font-bold text-purple-700">{fmt(grandTotal)}</span>
                  </div>
                </div>
              </>
            );
          })()}
        </SheetContent>
      </Sheet>

    </div>
  );
};

export default PersonnelServices;