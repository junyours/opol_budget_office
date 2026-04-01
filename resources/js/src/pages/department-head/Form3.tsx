import React, { useEffect, useState } from 'react';
import API from '../../services/api';
import { LoadingState } from '../common/LoadingState';
import { DepartmentBudgetPlan } from '../../types/api';
import { cn } from '@/src/lib/utils';
import { TrashIcon } from '@heroicons/react/24/outline';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import { Button } from '@/src/components/ui/button';

// ─── Column color tokens ──────────────────────────────────────────────────────

const C_PREV_TH = 'bg-blue-50   border-blue-200   text-blue-700';
const C_PREV_TD = 'bg-blue-50/30  border-blue-100';
const C_PREV_GT = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

const C_CURR_TH = 'bg-orange-50  border-orange-200  text-orange-700';
const C_CURR_TD = 'bg-orange-50/30 border-orange-100';
const C_CURR_GT = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SnapshotRow {
  plantilla_position_id: number;
  dept_bp_from3_assignment_id?: number;
  salary_grade: number;
  step: number;
  monthly_rate: number;
  annual_rate: number;
  annual_increment: number | null;
  step_effective_date: string | null;
  plantilla_position?: {
    old_item_number: string | null;
    new_item_number: string | null;
    position_title: string;
  };
  personnel?: {
    first_name: string;
    middle_name: string | null;
    last_name: string;
  } | null;
}

interface Form3Props {
  plan: DepartmentBudgetPlan;
  pastYearPlan: DepartmentBudgetPlan | null;
  departmentId: number;
  isEditable: boolean;
  isAdmin?: boolean;  // ← NEW
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) =>
  `₱${Math.round(v).toLocaleString()}`;

const fmtDate = (iso: string | null | undefined): string => {
  if (!iso) return '';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const parseRow = (item: any): SnapshotRow => ({
  dept_bp_from3_assignment_id: item.dept_bp_from3_assignment_id,
  plantilla_position_id: item.plantilla_position_id,
  salary_grade:          parseInt(item.salary_grade, 10) || 0,
  step:                  parseInt(item.step, 10) || 1,
  monthly_rate:          parseFloat(item.monthly_rate) || 0,
  annual_rate:           parseFloat(item.annual_rate)  || 0,
  annual_increment:      item.annual_increment != null ? parseFloat(item.annual_increment) : null,
  step_effective_date:   item.step_effective_date || null,
  plantilla_position:    item.plantilla_position,
  personnel:             item.personnel,
});

// ─── Shared cell classes ──────────────────────────────────────────────────────

const TH_BASE = 'px-3 py-2 text-[10px] font-semibold uppercase tracking-wide border-b border-gray-200';
const TH_GRAY = cn(TH_BASE, 'bg-white text-gray-500 text-center');
const TH_PREV = cn(TH_BASE, 'text-center border-b', C_PREV_TH);
const TH_CURR = cn(TH_BASE, 'text-center border-b', C_CURR_TH);

const TD_BASE = 'px-3 py-2.5 text-[12px]';
const TD_FT   = 'px-3 py-2.5 text-[12px] font-semibold font-mono tabular-nums text-right';

const TD_PREV_CTR = cn(TD_BASE, 'text-center text-gray-600', C_PREV_TD);
const TD_PREV_NUM = cn(TD_BASE, 'font-mono tabular-nums text-right text-gray-600', C_PREV_TD);
const TD_CURR_CTR = cn(TD_BASE, 'text-center text-gray-600', C_CURR_TD);
const TD_CURR_NUM = cn(TD_BASE, 'font-mono tabular-nums text-right text-gray-700 font-medium', C_CURR_TD);

// ─── Row type ─────────────────────────────────────────────────────────────────

type MergedRow = {
  pid: number;
  snapshotId: number | null;
  oldItem: string;
  newItem: string;
  positionTitle: string;
  incumbentName: string;
  pastGrade: number | null;
  pastStep: number | null;
  pastMonthly: number;
  pastAnnual: number;
  currGrade: number | null;
  currStep: number | null;
  currMonthly: number;
  currAnnual: number;
  currStepUpDate: string | null;
  annualIncrement: number | null;
  diff: number;
};

// ─── Component ────────────────────────────────────────────────────────────────

const Form3: React.FC<Form3Props> = ({ plan, pastYearPlan, isEditable, isAdmin = false }) => {
  const [currentRows, setCurrentRows] = useState<SnapshotRow[]>([]);
  const [pastRows,    setPastRows]    = useState<SnapshotRow[]>([]);
  const [loading,     setLoading]     = useState(true);
  const [deletingIds, setDeletingIds] = useState<Set<number>>(new Set());
  // ── Confirm dialog state ──
  const [confirmRow,  setConfirmRow]  = useState<MergedRow | null>(null);

  const currentYear  = plan.budget_plan?.year          ?? plan.budget_plan_id;
  const previousYear = pastYearPlan?.budget_plan?.year ?? pastYearPlan?.budget_plan_id ?? 'Previous';

  // Only admins can see/use the trash column
  const canDelete = isEditable && isAdmin;

  const fetchData = async () => {
    setLoading(true);
    try {
      const [currRes, pastRes] = await Promise.all([
        API.get(`/department-budget-plans/${plan.dept_budget_plan_id}/plantilla-assignments`),
        pastYearPlan
          ? API.get(`/department-budget-plans/${pastYearPlan.dept_budget_plan_id}/plantilla-assignments`)
          : Promise.resolve({ data: { data: [] } }),
      ]);
      setCurrentRows((currRes.data.data || []).map(parseRow));
      setPastRows((pastRes.data.data   || []).map(parseRow));
    } catch (err) {
      console.error('Failed to fetch Form 3 assignments', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, [plan, pastYearPlan]);

  const handleDeleteConfirmed = async () => {
    const row = confirmRow;
    if (!row?.snapshotId) return;
    setConfirmRow(null);

    setDeletingIds(prev => new Set(prev).add(row.snapshotId!));
    try {
      await API.delete(
        `/department-budget-plans/${plan.dept_budget_plan_id}/plantilla-assignments/${row.snapshotId}`
      );
      toast.success(`${row.positionTitle} removed from snapshot.`);
      setCurrentRows(prev =>
        prev.filter(r => r.dept_bp_from3_assignment_id !== row.snapshotId)
      );
    } catch (err: any) {
      toast.error(`Failed to remove: ${err?.response?.data?.message ?? err.message}`);
    } finally {
      setDeletingIds(prev => { const n = new Set(prev); n.delete(row.snapshotId!); return n; });
    }
  };

  if (loading) return <LoadingState />;

  // ── Merge by plantilla_position_id ────────────────────────────────────────

  // const pastMap    = new Map(pastRows.map(r    => [r.plantilla_position_id, r]));
  // const currentMap = new Map(currentRows.map(r => [r.plantilla_position_id, r]));
  // const allIds     = new Set([...pastMap.keys(), ...currentMap.keys()]);

  // const rows: MergedRow[] = Array.from(allIds).map(pid => {
  //   const past    = pastMap.get(pid);
  //   const current = currentMap.get(pid);
  //   const pos     = current?.plantilla_position ?? past?.plantilla_position;

  //   const incumbentName =
  //     current?.personnel
  //       ? `${current.personnel.last_name}, ${current.personnel.first_name} ${current.personnel.middle_name ?? ''}`.trim()
  //       : past?.personnel
  //       ? `${past.personnel.last_name}, ${past.personnel.first_name} ${past.personnel.middle_name ?? ''}`.trim()
  //       : 'Vacant';

  //   return {
  //     pid,
  //     snapshotId:      current?.dept_bp_from3_assignment_id ?? null,
  //     oldItem:         pos?.old_item_number ?? '–',
  //     newItem:         pos?.new_item_number ?? '–',
  //     positionTitle:   pos?.position_title  ?? '–',
  //     incumbentName,
  //     pastGrade:       past ? past.salary_grade : null,
  //     pastStep:        past ? past.step : null,
  //     pastMonthly:     past?.monthly_rate ?? 0,
  //     pastAnnual:      past?.annual_rate  ?? 0,
  //     currGrade:       current ? current.salary_grade : null,
  //     currStep:        current ? current.step : null,
  //     currMonthly:     current?.monthly_rate ?? 0,
  //     currAnnual:      current?.annual_rate  ?? 0,
  //     currStepUpDate:  current?.step_effective_date ?? null,
  //     annualIncrement: current?.annual_increment ?? null,
  //     diff:            (current?.annual_rate ?? 0) - (past?.annual_rate ?? 0),
  //   };
  // });
  // ── NEW LOGIC ──────────────────────────────────────────────────────────
  // "proposed" = currentRows (the plan year, e.g. 2026)
  // "current"  = pastRows   (prior year, e.g. 2025)
  // Rule: positions/incumbents are driven by the PROPOSED year when it exists.
  // If no proposed data at all, fall back to prior year positions.

  const proposedMap = new Map(currentRows.map(r => [r.plantilla_position_id, r]));
  const priorMap    = new Map(pastRows.map(r    => [r.plantilla_position_id, r]));

  // Determine the master list of position IDs to display
  const masterIds: Set<number> = proposedMap.size > 0
    ? new Set(proposedMap.keys())          // proposed year drives the rows
    : new Set(priorMap.keys());            // fallback: only prior year exists

  const rows: MergedRow[] = Array.from(masterIds).map(pid => {
    const proposed = proposedMap.get(pid);   // 2026 data (orange column)
    const prior    = priorMap.get(pid);      // 2025 data (blue column)

    // Position title & item numbers: always from proposed if it exists
    const pos = proposed?.plantilla_position ?? prior?.plantilla_position;

    // Incumbent: proposed year wins; if proposed is vacant (no personnel), show Vacant
    // even if prior year had someone (position became vacant in proposed year)
    const incumbentName = proposed
      ? (proposed.personnel
          ? `${proposed.personnel.last_name}, ${proposed.personnel.first_name} ${proposed.personnel.middle_name ?? ''}`.trim()
          : 'Vacant')
      : (prior?.personnel
          ? `${prior.personnel.last_name}, ${prior.personnel.first_name} ${prior.personnel.middle_name ?? ''}`.trim()
          : 'Vacant');

    return {
      pid,
      snapshotId:      proposed?.dept_bp_from3_assignment_id ?? null,
      oldItem:         pos?.old_item_number ?? '–',
      newItem:         pos?.new_item_number ?? '–',
      positionTitle:   pos?.position_title  ?? '–',
      incumbentName,
      // Blue column = prior year (2025)
      pastGrade:       prior ? prior.salary_grade : null,
      pastStep:        prior ? prior.step         : null,
      pastMonthly:     prior?.monthly_rate ?? 0,
      pastAnnual:      prior?.annual_rate  ?? 0,
      // Orange column = proposed year (2026)
      currGrade:       proposed ? proposed.salary_grade : null,
      currStep:        proposed ? proposed.step         : null,
      currMonthly:     proposed?.monthly_rate ?? 0,
      currAnnual:      proposed?.annual_rate  ?? 0,
      currStepUpDate:  proposed?.step_effective_date ?? null,
      annualIncrement: proposed?.annual_increment ?? null,
      diff:            (proposed?.annual_rate ?? 0) - (prior?.annual_rate ?? 0),
    };
  });

  rows.sort((a, b) => {
    const aNum = a.newItem === '–' ? Infinity : parseInt(a.newItem, 10);
    const bNum = b.newItem === '–' ? Infinity : parseInt(b.newItem, 10);
    if (!isNaN(aNum) && !isNaN(bNum)) return aNum - bNum;
    if (a.newItem === '–') return 1;
    if (b.newItem === '–') return -1;
    return a.newItem.localeCompare(b.newItem, undefined, { numeric: true });
  });

  // ── Totals ────────────────────────────────────────────────────────────────

  const totalPastMonthly = rows.reduce((s, r) => s + r.pastMonthly, 0);
  const totalPastAnnual  = rows.reduce((s, r) => s + r.pastAnnual,  0);
  const totalCurrMonthly = rows.reduce((s, r) => s + r.currMonthly, 0);
  const totalCurrAnnual  = rows.reduce((s, r) => s + r.currAnnual,  0);
  const totalDiff        = totalCurrAnnual - totalPastAnnual;

  const colSpanEmpty = canDelete ? 12 : 11;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

        {/* Header */}
        <div className="px-5 py-4 border-b border-gray-200">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 3</p>
          <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
            Plantilla &amp; Personnel Services
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th colSpan={2} className={cn(TH_GRAY, 'border-r border-gray-200')}>Item Number</th>
                <th rowSpan={2} className={cn(TH_GRAY, 'border-r border-gray-200 align-bottom')}>Position Title</th>
                <th rowSpan={2} className={cn(TH_GRAY, 'border-r border-gray-200 align-bottom')}>Name of Incumbent</th>
                <th colSpan={3} className={cn(TH_PREV, 'border-r border-l border-blue-200')}>
                  {previousYear} Budget
                </th>
                <th colSpan={3} className={cn(TH_CURR, 'border-r border-l border-orange-200')}>
                  {currentYear} Budget
                </th>
                <th rowSpan={2} className={cn(TH_GRAY, 'align-bottom')}>Increase / Decrease</th>
                {canDelete && <th rowSpan={2} className={cn(TH_GRAY, 'align-bottom w-8')} />}
              </tr>
              <tr>
                <th className={cn(TH_GRAY, 'border-r border-gray-200')}>Old</th>
                <th className={cn(TH_GRAY, 'border-r border-gray-200')}>New</th>
                <th className={cn(TH_PREV, 'border-l border-blue-200')}>Grade / Step</th>
                <th className={TH_PREV}>Rate / Month</th>
                <th className={cn(TH_PREV, 'border-r border-blue-200')}>Rate / Annum</th>
                <th className={cn(TH_CURR, 'border-l border-orange-200')}>Grade / Step</th>
                <th className={TH_CURR}>Rate / Month</th>
                <th className={cn(TH_CURR, 'border-r border-orange-200')}>Rate / Annum</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={colSpanEmpty} className="py-12 text-center text-gray-400 text-sm">
                    No plantilla assignments for this department.
                  </td>
                </tr>
              ) : rows.map((row, idx) => {
                const isDeleting = row.snapshotId ? deletingIds.has(row.snapshotId) : false;
                return (
                  <tr
                    key={idx}
                    className={cn(
                      'hover:bg-gray-50/60 transition-colors',
                      isDeleting && 'opacity-40 pointer-events-none',
                    )}
                  >
                    <td className={cn(TD_BASE, 'text-gray-500 text-center')}>{row.oldItem}</td>
                    <td className={cn(TD_BASE, 'text-gray-500 text-center')}>{row.newItem}</td>
                    <td className={cn(TD_BASE, 'text-gray-800 font-medium')}>{row.positionTitle}</td>

                    <td className={cn(TD_BASE, 'text-gray-600')}>
                      <div className="flex flex-col gap-0.5">
                        <span className={row.incumbentName === 'Vacant' ? 'text-gray-400 italic' : ''}>
                          {row.incumbentName}
                        </span>
                        {row.currStepUpDate && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 w-fit mt-0.5">
                            <svg className="w-2.5 h-2.5 shrink-0" fill="none" viewBox="0 0 10 10">
                              <path d="M5 1.5v7M2 4l3-2.5L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            Effective {fmtDate(row.currStepUpDate)}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Previous — blue */}
                    <td className={cn(TD_PREV_CTR, 'border-l')}>
                      {row.pastGrade !== null ? (
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold">{row.pastGrade}</span>
                          <span className="text-[10px] text-gray-400">{row.pastStep}</span>
                        </div>
                      ) : '–'}
                    </td>
                    <td className={TD_PREV_NUM}>{row.pastMonthly === 0 ? '–' : fmtCurrency(row.pastMonthly)}</td>
                    <td className={cn(TD_PREV_NUM, 'border-r border-blue-100')}>{row.pastAnnual === 0 ? '–' : fmtCurrency(row.pastAnnual)}</td>

                    {/* Current — orange */}
                    <td className={cn(TD_CURR_CTR, 'border-l')}>
                      {row.currGrade !== null ? (
                        <div className="flex flex-col leading-tight">
                          <span className="font-semibold">{row.currGrade}</span>
                          <span className="text-[10px] text-gray-400">{row.currStep}</span>
                        </div>
                      ) : '–'}
                    </td>
                    <td className={TD_CURR_NUM}>{row.currMonthly === 0 ? '–' : fmtCurrency(row.currMonthly)}</td>

                    <td className={cn(TD_CURR_NUM, 'border-r border-orange-100')}>
                      <div className="flex flex-col gap-0.5 items-end">
                        <span>{fmtCurrency(row.currAnnual)}</span>
                        {row.annualIncrement !== null && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-emerald-700 font-semibold leading-none">
                            <svg className="w-2 h-2 shrink-0" fill="none" viewBox="0 0 10 10">
                              <path d="M5 1.5v7M2 4l3-2.5L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                            {fmtCurrency(row.annualIncrement)}
                          </span>
                        )}
                      </div>
                    </td>

                    <td className={cn(TD_BASE, 'font-mono tabular-nums text-right font-semibold', row.diff >= 0 ? 'text-emerald-600' : 'text-red-500')}>
                      {fmtCurrency(row.diff)}
                    </td>

                    {/* Trash — admin only */}
                    {canDelete && (
                      <td className={cn(TD_BASE, 'text-center w-8')}>
                        <button
                          onClick={() => row.snapshotId ? setConfirmRow(row) : toast.warning('Save snapshot first.')}
                          disabled={isDeleting}
                          className={cn(
                            'transition-colors disabled:opacity-30',
                            row.snapshotId
                              ? 'text-gray-300 hover:text-red-500'
                              : 'text-gray-200 cursor-not-allowed',
                          )}
                          title={row.snapshotId ? 'Remove from snapshot' : 'Save snapshot first'}
                        >
                          <TrashIcon className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>

            {/* Grand Total */}
            <tfoot>
              <tr className="bg-gray-900 text-white">
                <td colSpan={4} className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                  Total
                </td>
                <td className={cn('border-l', C_PREV_GT)} />
                <td className={cn(TD_FT, 'border-l', C_PREV_GT)}>{fmtCurrency(totalPastMonthly)}</td>
                <td className={cn(TD_FT, 'border-l', C_PREV_GT)}>{fmtCurrency(totalPastAnnual)}</td>
                <td className={cn('border-l', C_CURR_GT)} />
                <td className={cn(TD_FT, 'border-l', C_CURR_GT)}>{fmtCurrency(totalCurrMonthly)}</td>
                <td className={cn(TD_FT, 'border-l', C_CURR_GT)}>{fmtCurrency(totalCurrAnnual)}</td>
                <td className={cn(TD_FT, 'border-l border-gray-700', totalDiff >= 0 ? 'text-emerald-400' : 'text-red-400')}>
                  {fmtCurrency(totalDiff)}
                </td>
                {canDelete && <td className="border-l border-gray-700" />}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Legend */}
        <div className="px-5 py-3 border-t border-gray-100 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-blue-50 border border-blue-200 inline-block" />
            <span className="text-blue-600 font-semibold">Blue</span>
            {' '}= {previousYear} Budget
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm bg-orange-50 border border-orange-200 inline-block" />
            <span className="text-orange-600 font-semibold">Orange</span>
            {' '}= {currentYear} Budget
          </span>
          <span className="flex items-center gap-1.5">
            <svg className="w-2.5 h-2.5 text-emerald-600 shrink-0" fill="none" viewBox="0 0 10 10">
              <path d="M5 1.5v7M2 4l3-2.5L8 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-emerald-600 font-semibold">Green sub-line</span>
            {' '}= step increment annual amount (salary at new step × increment months)
          </span>
        </div>
      </div>

      {/* ── Delete confirm dialog ─────────────────────────────────────────── */}
      <AlertDialog open={!!confirmRow} onOpenChange={o => { if (!o) setConfirmRow(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Remove this position?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{confirmRow?.positionTitle}</span>
              {confirmRow?.incumbentName !== 'Vacant' && (
                <> — <span className="font-medium text-gray-700">{confirmRow?.incumbentName}</span></>
              )}{' '}
              will be removed from this plan's snapshot. This cannot be undone without re-saving
              from Personnel Services.
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
                className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirmed}
              >
                Remove
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default Form3;