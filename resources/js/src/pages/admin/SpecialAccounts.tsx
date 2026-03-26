import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDepartmentData } from '../../hooks/useDepartmentData';
import { useExpenseData } from '../../hooks/useExpenseData';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { useAipProgramData } from '../../hooks/useAipProgramData';
import type { AipProgramEntry } from '../../hooks/useAipProgramData';
import { useDebounce } from '../../hooks/useDebounce';
import { Search } from 'lucide-react';
import { ExpenseClassification, ExpenseItem, Department, DepartmentCategory } from '../../types/api';
import {
  Table, TableBody, TableCell,
  TableFooter, TableHead, TableHeader, TableRow,
} from "@/src/components/ui/table";
import { Progress } from "@/src/components/ui/progress";
import { Skeleton } from "@/src/components/ui/skeleton";
import { Input }    from "@/src/components/ui/input";
import { cn }       from "@/src/lib/utils";

/* ─── Special Accounts category ID ──────────────────────── */
const SPECIAL_ACCOUNTS_CATEGORY_ID = 4;

/* ─── Extended types ─────────────────────────────────────── */
interface DepartmentWithMeta extends Department {
  hasPlan: boolean;
  colorClass: string;
}
interface ClassificationWithItems extends ExpenseClassification {
  items: ExpenseItem[];
  filteredItems?: ExpenseItem[];
}

interface ClassificationSection { kind: 'classification'; cls: ClassificationWithItems; }
interface SpecialProgramsSection { kind: 'special_programs'; }
type Section = ClassificationSection | SpecialProgramsSection;

interface SpecialAccountsTableProps {
  filteredDepartments: DepartmentWithMeta[];
  sections: Section[];
  debouncedSearchTerm: string;
  getAmount: (deptId: number, itemId: number) => number | undefined;
  formatAmount: (amount: number) => string;
  filteredGrandTotals: number[];
  animate: boolean;
  programsByDept: Map<number, AipProgramEntry[]>;
}

const COL = { FIRST: 128, SECOND: 256, DEPT: 160 } as const;

/* ══════════════════════════════════════════════════════════
   SKELETON TABLE
══════════════════════════════════════════════════════════ */
const SkeletonTable = () => {
  const depts = [1, 2, 3];
  const dynCols = depts.length + 1;
  const minW = COL.FIRST + COL.SECOND + dynCols * COL.DEPT;

  return (
    <Table className="table-fixed" style={{ minWidth: minW }}>
      <TableHeader className="sticky top-0 z-20 bg-white">
        <TableRow className="border-b border-gray-100">
          <TableHead rowSpan={2} style={{ width: COL.FIRST }} className="sticky left-0 z-30 bg-white text-gray-500 text-[11px] font-semibold uppercase tracking-wide">Account Code</TableHead>
          <TableHead rowSpan={2} style={{ width: COL.SECOND, left: COL.FIRST }} className="sticky left-[128px] z-30 bg-white text-gray-500 text-[11px] font-semibold uppercase tracking-wide">Object of Expenditures</TableHead>
          <TableHead colSpan={dynCols} style={{ minWidth: dynCols * COL.DEPT }} className="text-center bg-purple-500">
            <Skeleton className="h-4 w-32 mx-auto rounded bg-purple-300" />
          </TableHead>
        </TableRow>
        <TableRow className="border-b border-gray-100">
          {depts.map(d => (
            <TableHead key={d} style={{ width: COL.DEPT }} className="text-center bg-purple-50">
              <Skeleton className="h-3.5 w-12 mx-auto rounded" />
            </TableHead>
          ))}
          <TableHead style={{ width: COL.DEPT }} className="text-center bg-purple-100">
            <Skeleton className="h-3.5 w-10 mx-auto rounded" />
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map(cls => (
          <React.Fragment key={cls}>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i} className="border-b border-gray-50">
                <TableCell style={{ width: COL.FIRST }} className="sticky left-0 bg-white"><Skeleton className="h-3.5 w-16 rounded" /></TableCell>
                <TableCell style={{ width: COL.SECOND }} className="sticky left-[128px] bg-white"><Skeleton className="h-3.5 w-40 rounded" /></TableCell>
                {depts.map(d => <TableCell key={d} style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-3.5 w-16 ml-auto rounded" /></TableCell>)}
                <TableCell style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-3.5 w-16 ml-auto rounded" /></TableCell>
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 border-b border-gray-100">
              <TableCell colSpan={2} className="sticky left-0 bg-gray-50"><Skeleton className="h-4 w-28 rounded" /></TableCell>
              {depts.map(d => <TableCell key={d} style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableCell>)}
              <TableCell style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableCell>
            </TableRow>
          </React.Fragment>
        ))}
      </TableBody>
      <TableFooter className="sticky bottom-0 z-20 bg-white">
        <TableRow>
          <TableCell colSpan={2} className="sticky left-0 bg-white"><Skeleton className="h-5 w-28 rounded" /></TableCell>
          {depts.map(d => <TableCell key={d} style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-5 w-16 ml-auto rounded" /></TableCell>)}
          <TableCell style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-5 w-16 ml-auto rounded" /></TableCell>
        </TableRow>
      </TableFooter>
    </Table>
  );
};

/* ══════════════════════════════════════════════════════════
   SPECIAL PROGRAMS ROWS
══════════════════════════════════════════════════════════ */
interface SpecialProgramsRowsProps {
  filteredDepartments: DepartmentWithMeta[];
  programsByDept: Map<number, AipProgramEntry[]>;
  formatAmount: (n: number) => string;
  animate: boolean;
  rowIdxRef: { current: number };
}

const SpecialProgramsRows: React.FC<SpecialProgramsRowsProps> = ({
  filteredDepartments, programsByDept, formatAmount, animate, rowIdxRef,
}) => {
  const programRows = useMemo(() => {
    const rows: Array<{ dept: DepartmentWithMeta; program: AipProgramEntry }> = [];
    filteredDepartments.forEach(dept =>
      (programsByDept.get(dept.dept_id) ?? []).forEach(prog => rows.push({ dept, program: prog }))
    );
    return rows;
  }, [filteredDepartments, programsByDept]);

  const deptSubtotals = useMemo(() => {
    const m = new Map<number, number>();
    filteredDepartments.forEach(dept =>
      m.set(dept.dept_id, (programsByDept.get(dept.dept_id) ?? []).reduce((s, p) => s + p.total_amount, 0))
    );
    return m;
  }, [filteredDepartments, programsByDept]);

  const sectionTotal = useMemo(
    () => filteredDepartments.reduce((s, d) => s + (deptSubtotals.get(d.dept_id) ?? 0), 0),
    [filteredDepartments, deptSubtotals]
  );

  if (programRows.length === 0) return null;

  return (
    <React.Fragment>
      {(() => { rowIdxRef.current++; return null; })()}
      {/* Section header */}
      <TableRow
        className={cn("border-b border-gray-100", animate && "trow-anim")}
        style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
      >
        <TableCell
          colSpan={2}
          className="sticky left-0 bg-gray-50 font-semibold text-gray-800 py-2.5 border-r border-gray-200 text-[12px]"
          style={{ width: COL.FIRST + COL.SECOND }}
        >
          2.0 Special Programs
        </TableCell>
        {filteredDepartments.map(dept => <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="bg-gray-50" />)}
        <TableCell style={{ width: COL.DEPT }} className="bg-gray-50" />
      </TableRow>

      {/* Program rows */}
      {programRows.map(({ dept, program }) => {
        rowIdxRef.current++;
        const idx = rowIdxRef.current;
        return (
          <TableRow
            key={`prog-${dept.dept_id}-${program.aip_program_id}`}
            className={cn("border-b border-gray-50 bg-white hover:bg-gray-50/60 transition-colors", animate && "trow-anim")}
            style={animate ? { animationDelay: `${(idx % 30) * 22}ms` } : undefined}
          >
            <TableCell style={{ width: COL.FIRST }} className="sticky left-0 bg-white font-mono text-[11px] text-gray-400 border-r border-gray-100">
              {program.aip_reference_code ?? <span className="text-gray-300">—</span>}
            </TableCell>
            <TableCell style={{ width: COL.SECOND, left: COL.FIRST }} className="sticky left-[128px] bg-white text-gray-700 border-r border-gray-100">
              <span className="text-[11px] text-gray-400 font-medium mr-1.5">{dept.dept_abbreviation}</span>
              {program.program_description}
            </TableCell>
            {filteredDepartments.map(colDept => (
              <TableCell key={colDept.dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums text-blue-500 font-mono text-[12px]">
                {colDept.dept_id === dept.dept_id
                  ? formatAmount(program.total_amount)
                  : <span className="text-gray-200">—</span>}
              </TableCell>
            ))}
            <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums text-gray-400 font-mono text-[12px]">
              <span className="text-gray-200">—</span>
            </TableCell>
          </TableRow>
        );
      })}

      {/* Subtotal row */}
      {(() => {
        rowIdxRef.current++;
        return (
          <TableRow
            className={cn("border-b border-gray-200 bg-gray-100/60", animate && "trow-anim")}
            style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
          >
            <TableCell
              colSpan={2}
              className="sticky left-0 z-10 bg-gray-100 text-right text-[12px] font-semibold text-gray-700 py-2.5 border-r border-gray-200"
              style={{ width: COL.FIRST + COL.SECOND }}
            >
              Subtotal — Special Programs
            </TableCell>
            {filteredDepartments.map(dept => (
              <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-blue-500 bg-gray-100 font-mono text-[12px]">
                {formatAmount(deptSubtotals.get(dept.dept_id) ?? 0)}
              </TableCell>
            ))}
            <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 bg-gray-100 font-mono text-[12px]">
              {formatAmount(sectionTotal)}
            </TableCell>
          </TableRow>
        );
      })()}
    </React.Fragment>
  );
};

/* ══════════════════════════════════════════════════════════
   SECTION ORDERING (unchanged logic)
══════════════════════════════════════════════════════════ */
const EXCLUDED_CLASSIFICATIONS = new Set(['financial expenses']);

const CLASS_PREFIX: Record<string, string> = {
  'personal services':                        '1.1',
  'maintenance and other operating expenses': '1.2',
  'capital outlay':                           '3.0',
};

const SECTION_ORDER_NAMES = [
  'personal services',
  'maintenance and other operating expenses',
  '__SPECIAL_PROGRAMS__',
  'capital outlay',
] as const;

function normalizeName(name: string): string { return name.trim().toLowerCase(); }
function classLabel(name: string): string {
  const prefix = CLASS_PREFIX[normalizeName(name)];
  return prefix ? `${prefix} ${name}` : name;
}

function buildSections(orderedCls: ClassificationWithItems[], debouncedSearchTerm: string): Section[] {
  const q = debouncedSearchTerm.trim().toLowerCase();
  const filteredCls: ClassificationWithItems[] = orderedCls
    .filter(c => !EXCLUDED_CLASSIFICATIONS.has(normalizeName(c.expense_class_name)))
    .flatMap(c => {
      if (!q) return c.items.length > 0 ? [c] : [];
      const filteredItems = c.items.filter(i => i.expense_class_item_name.toLowerCase().includes(q));
      return filteredItems.length > 0 ? [{ ...c, filteredItems }] : [];
    });
  const clsByName = new Map(filteredCls.map(c => [normalizeName(c.expense_class_name), c]));
  const placed    = new Set<string>();
  const sections: Section[] = [];
  for (const slot of SECTION_ORDER_NAMES) {
    if (slot === '__SPECIAL_PROGRAMS__') {
      if (!q) sections.push({ kind: 'special_programs' });
    } else {
      const cls = clsByName.get(slot);
      if (cls) { sections.push({ kind: 'classification', cls }); placed.add(slot); }
    }
  }
  filteredCls.forEach(cls => {
    const normalized = normalizeName(cls.expense_class_name);
    if (!placed.has(normalized) && !(SECTION_ORDER_NAMES as readonly string[]).includes(normalized))
      sections.push({ kind: 'classification', cls });
  });
  return sections;
}

/* ══════════════════════════════════════════════════════════
   SPECIAL ACCOUNTS TABLE
══════════════════════════════════════════════════════════ */
const SpecialAccountsTable = React.memo(({
  filteredDepartments, sections, debouncedSearchTerm, getAmount,
  formatAmount, filteredGrandTotals, animate, programsByDept,
}: SpecialAccountsTableProps) => {
  const totalCols = filteredDepartments.length + 1;
  const minW = COL.FIRST + COL.SECOND + totalCols * COL.DEPT;
  const rowIdxRef = { current: 0 };

  return (
    <>
      <style>{`
        @keyframes rowIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        .trow-anim { opacity:0; animation: rowIn .28s cubic-bezier(.25,.8,.25,1) forwards; }
      `}</style>

      <Table className="table-fixed text-[12px]" style={{ minWidth: minW }}>

        {/* ── Header — purple category band matching ObjectOfExpenditures style ── */}
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="border-b border-gray-200 bg-white">
            <TableHead
              rowSpan={2}
              style={{ width: COL.FIRST }}
              className="sticky left-0 z-30 bg-white border-r border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-600 align-bottom pb-3"
            >
              Account Code
            </TableHead>
            <TableHead
              rowSpan={2}
              style={{ width: COL.SECOND, left: COL.FIRST }}
              className="sticky left-[128px] z-30 bg-white border-r border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-600 align-bottom pb-3"
            >
              Object of Expenditures
            </TableHead>
            {/* Single purple category header — matches category-4 color */}
            <TableHead
              colSpan={totalCols}
              style={{ minWidth: totalCols * COL.DEPT }}
              className="text-center border-b border-r border-purple-400 text-[11px] font-bold uppercase tracking-widest pb-2 bg-purple-500 text-white"
            >
              Special Accounts
            </TableHead>
          </TableRow>
          <TableRow className="border-b-2 border-gray-200">
            {filteredDepartments.map(dept => (
              <TableHead
                key={dept.dept_id}
                style={{ width: COL.DEPT }}
                className={cn(
                  "text-center text-[11px] font-semibold pb-3 bg-purple-50",
                  dept.hasPlan ? "text-gray-700" : "text-red-500 bg-red-50"
                )}
              >
                {dept.dept_abbreviation}
                {!dept.hasPlan && <span className="block text-[9px] font-normal text-red-400 mt-0.5">No data</span>}
              </TableHead>
            ))}
            <TableHead style={{ width: COL.DEPT }} className="text-center text-[11px] font-semibold pb-3 bg-purple-100 text-purple-900">
              Total
            </TableHead>
          </TableRow>
        </TableHeader>

        {/* ── Body ── */}
        <TableBody>
          {sections.map((section) => {
            if (section.kind === 'special_programs') {
              return (
                <SpecialProgramsRows
                  key="special-programs"
                  filteredDepartments={filteredDepartments}
                  programsByDept={programsByDept}
                  formatAmount={formatAmount}
                  animate={animate}
                  rowIdxRef={rowIdxRef}
                />
              );
            }

            const cls = section.cls;
            const toRender = debouncedSearchTerm ? cls.filteredItems! : cls.items;

            return (
              <React.Fragment key={cls.expense_class_id}>

                {/* Classification header */}
                {(() => { rowIdxRef.current++; return null; })()}
                <TableRow
                  className={cn("border-b border-gray-100", animate && "trow-anim")}
                  style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
                >
                  <TableCell
                    colSpan={2}
                    className="sticky left-0 bg-gray-50 font-semibold text-gray-800 py-2.5 border-r border-gray-200 text-[12px]"
                    style={{ width: COL.FIRST + COL.SECOND }}
                  >
                    {classLabel(cls.expense_class_name)}
                  </TableCell>
                  {filteredDepartments.map(dept => <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="bg-gray-50" />)}
                  <TableCell style={{ width: COL.DEPT }} className="bg-gray-50" />
                </TableRow>

                {/* Item rows */}
                {toRender.map((item: ExpenseItem) => {
                  rowIdxRef.current++;
                  const idx = rowIdxRef.current;
                  const rowTotal = filteredDepartments.reduce(
                    (s, dept) => s + (getAmount(dept.dept_id, item.expense_class_item_id) ?? 0), 0
                  );
                  return (
                    <TableRow
                      key={item.expense_class_item_id}
                      className={cn("border-b border-gray-50 bg-white hover:bg-gray-50/60 transition-colors", animate && "trow-anim")}
                      style={animate ? { animationDelay: `${(idx % 30) * 22}ms` } : undefined}
                    >
                      <TableCell style={{ width: COL.FIRST }} className="sticky left-0 bg-white font-mono text-[11px] text-gray-400 border-r border-gray-100">
                        {item.expense_class_item_acc_code}
                      </TableCell>
                      <TableCell style={{ width: COL.SECOND, left: COL.FIRST }} className="sticky left-[128px] bg-white text-gray-700 border-r border-gray-100">
                        {item.expense_class_item_name}
                      </TableCell>
                      {filteredDepartments.map(dept => {
                        const amt = getAmount(dept.dept_id, item.expense_class_item_id);
                        return (
                          <TableCell
                            key={dept.dept_id}
                            style={{ width: COL.DEPT }}
                            className={cn(
                              "text-right tabular-nums text-blue-500 font-mono",
                              !dept.hasPlan && "bg-red-50/40 text-red-400"
                            )}
                          >
                            {amt !== undefined && amt > 0
                              ? formatAmount(amt)
                              : <span className="text-gray-200">—</span>}
                          </TableCell>
                        );
                      })}
                      {/* Row total */}
                      <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 font-mono">
                        {rowTotal > 0 ? formatAmount(rowTotal) : <span className="text-gray-200">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Subtotal row */}
                {(() => {
                  rowIdxRef.current++;
                  const deptSubs = filteredDepartments.map(dept =>
                    toRender.reduce((s, item) => s + (getAmount(dept.dept_id, item.expense_class_item_id) ?? 0), 0)
                  );
                  const clsTotal = deptSubs.reduce((a, b) => a + b, 0);
                  return (
                    <TableRow
                      className={cn("border-b border-gray-200 bg-gray-100/60", animate && "trow-anim")}
                      style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
                    >
                      <TableCell
                        colSpan={2}
                        className="sticky left-0 z-10 bg-gray-100 text-right text-[12px] font-semibold text-gray-700 py-2.5 border-r border-gray-200"
                        style={{ width: COL.FIRST + COL.SECOND }}
                      >
                        Subtotal — {classLabel(cls.expense_class_name)}
                      </TableCell>
                      {deptSubs.map((sub, i) => (
                        <TableCell
                          key={filteredDepartments[i].dept_id}
                          style={{ width: COL.DEPT }}
                          className="text-right tabular-nums font-semibold text-blue-500 bg-gray-100 font-mono"
                        >
                          {formatAmount(sub)}
                        </TableCell>
                      ))}
                      <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 bg-gray-100 font-mono">
                        {formatAmount(clsTotal)}
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </React.Fragment>
            );
          })}
        </TableBody>

        {/* ── Grand Total footer — identical to ObjectOfExpenditures ── */}
        <TableFooter className="sticky bottom-0 z-20">
          <TableRow className="bg-gray-900">
            <TableCell
              colSpan={2}
              className="sticky left-0 z-30 bg-gray-900 text-right text-[11px] font-bold text-white uppercase tracking-widest py-3.5 border-r border-gray-700"
              style={{ width: COL.FIRST + COL.SECOND }}
            >
              Grand Total
            </TableCell>
            {filteredDepartments.map((dept, i) => (
              <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums font-bold text-white bg-gray-900 font-mono">
                {formatAmount(filteredGrandTotals[i] ?? 0)}
              </TableCell>
            ))}
            <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-bold text-white bg-gray-800 font-mono">
              {formatAmount(filteredGrandTotals.reduce((a, b) => a + b, 0))}
            </TableCell>
          </TableRow>
        </TableFooter>
      </Table>
    </>
  );
});
SpecialAccountsTable.displayName = 'SpecialAccountsTable';

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
const SpecialAccounts: React.FC = () => {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const activePlanId = activePlan?.budget_plan_id;

  const [searchTerm,   setSearchTerm]   = useState('');
  const [showLoader,   setShowLoader]   = useState(true);
  const [progress,     setProgress]     = useState(0);
  const [tableAnimate, setTableAnimate] = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { allDepartments, loading: deptLoading }                   = useDepartmentData(activePlanId);
  const { classifications, items, amountMap, loading: expLoading } = useExpenseData(activePlanId);
  const { programsByDept, loading: aipLoading }                    = useAipProgramData(activePlanId);

  const loading = deptLoading || expLoading || planLoading || aipLoading;

  const deptsWithData = useMemo(() => {
    const s = new Set<number>();
    amountMap.forEach((_, key) => s.add(parseInt(key.split('-')[0], 10)));
    return s;
  }, [amountMap]);

  const filteredDepartments: DepartmentWithMeta[] = useMemo(() =>
    allDepartments
      .filter(d => d.dept_category_id === SPECIAL_ACCOUNTS_CATEGORY_ID)
      .map(dept => ({
        ...dept,
        hasPlan:    deptsWithData.has(dept.dept_id),
        colorClass: deptsWithData.has(dept.dept_id) ? '' : 'bg-red-50',
      })),
    [allDepartments, deptsWithData]
  );

  /* ── Weighted progress — same pattern as ObjectOfExpenditures ── */
  const loadStages = useMemo(() => [
    { done: !planLoading, weight: 10, label: 'Active plan'    },
    { done: !deptLoading, weight: 20, label: 'Departments'    },
    { done: !expLoading,  weight: 50, label: 'Expense items'  },
    { done: !aipLoading,  weight: 20, label: 'AIP programs'   },
  ], [planLoading, deptLoading, expLoading, aipLoading]);

  const bankedProgress    = useMemo(() => loadStages.filter(s => s.done).reduce((sum, s) => sum + s.weight, 0), [loadStages]);
  const currentStageLabel = useMemo(() => loadStages.find(s => !s.done)?.label ?? 'Finalising…', [loadStages]);
  const nextBank          = useMemo(() => {
    const first = loadStages.find(s => !s.done);
    return first ? bankedProgress + first.weight : 100;
  }, [loadStages, bankedProgress]);

  useEffect(() => { setProgress(bankedProgress); }, [bankedProgress]);
  useEffect(() => {
    const ceiling = nextBank - 2;
    if (bankedProgress >= 100) { setProgress(100); return; }
    const id = setInterval(() => {
      setProgress(p => {
        if (p >= ceiling) { clearInterval(id); return p; }
        return Math.min(p + Math.max(0.3, (ceiling - p) * 0.04), ceiling);
      });
    }, 40);
    return () => clearInterval(id);
  }, [bankedProgress, nextBank]);

  useEffect(() => {
    if (!loading) {
      const t = setTimeout(() => { setShowLoader(false); setTimeout(() => setTableAnimate(true), 60); }, 300);
      return () => clearTimeout(t);
    } else { setShowLoader(true); setTableAnimate(false); }
  }, [loading]);

  useEffect(() => {
    setTableAnimate(false);
    const t = setTimeout(() => setTableAnimate(true), 60);
    return () => clearTimeout(t);
  }, [debouncedSearchTerm]);

  const itemsByClass = useMemo(() => {
    const m = new Map<number, ExpenseItem[]>();
    classifications.forEach((c: ExpenseClassification) => m.set(c.expense_class_id, []));
    items.forEach((item: ExpenseItem) => {
      const list = m.get(item.expense_class_id);
      if (list) list.push(item); else m.set(item.expense_class_id, [item]);
    });
    return m;
  }, [classifications, items]);

  const orderedCls: ClassificationWithItems[] = useMemo(() =>
    classifications.map((c: ExpenseClassification) => ({ ...c, items: itemsByClass.get(c.expense_class_id) || [] })),
    [classifications, itemsByClass]
  );

  const sections: Section[] = useMemo(
    () => buildSections(orderedCls, debouncedSearchTerm),
    [orderedCls, debouncedSearchTerm]
  );

  const formatAmount = useCallback((n: number) => `₱${Math.round(n).toLocaleString('en-US')}`, []);
  const getAmount    = useCallback((deptId: number, itemId: number) => amountMap.get(`${deptId}-${itemId}`), [amountMap]);

  const grandTotals = useMemo(() => {
    const clsSections = sections.filter((s): s is ClassificationSection => s.kind === 'classification');
    return filteredDepartments.map(dept => {
      const expenseTotal = clsSections.reduce((s, { cls }) => {
        const its = debouncedSearchTerm ? (cls.filteredItems ?? []) : cls.items;
        return s + its.reduce((ss, item) => ss + (getAmount(dept.dept_id, item.expense_class_item_id) ?? 0), 0);
      }, 0);
      const aipTotal = (programsByDept.get(dept.dept_id) ?? []).reduce((s, p) => s + p.total_amount, 0);
      return expenseTotal + (debouncedSearchTerm ? 0 : aipTotal);
    });
  }, [filteredDepartments, sections, debouncedSearchTerm, getAmount, programsByDept]);

  const totalBudget = grandTotals.reduce((a, b) => a + b, 0);
  const deptCount   = filteredDepartments.length;
  const missingData = filteredDepartments.filter(d => !d.hasPlan).length;

  /* ── Loading screen — matches ObjectOfExpenditures exactly ── */
  if (showLoader) {
    return (
      <div className="flex flex-col h-full gap-5 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>
          <Skeleton className="h-9 w-72 rounded-lg" />
        </div>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] text-gray-500 flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
              Loading {currentStageLabel.toLowerCase()}…
            </span>
            <span className="text-[11px] text-gray-400 tabular-nums font-mono">{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="h-1.5 rounded-full" />
          <div className="flex gap-4 mt-0.5">
            {loadStages.map((stage, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span className={cn("inline-block w-1.5 h-1.5 rounded-full transition-colors duration-300", stage.done ? "bg-green-400" : "bg-gray-200")} />
                <span className={cn("text-[10px] transition-colors duration-300", stage.done ? "text-green-600" : "text-gray-400")}>{stage.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-auto rounded-xl border border-gray-100" style={{ minHeight: 400 }}>
          <SkeletonTable />
        </div>
      </div>
    );
  }

  /* ── Empty state ── */
  if (!loading && filteredDepartments.length === 0) {
    return (
      <div className="flex flex-col h-full gap-4 p-6">
        <div className="mb-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">Appropriations by Object of Expenditures</span>
            {activePlan?.year && <><span className="text-gray-300 text-[10px]">·</span><span className="text-[10px] font-medium text-gray-400">FY {activePlan.year}</span></>}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Special Accounts</h1>
        </div>
        <div className="flex-1 flex items-center justify-center rounded-xl border border-gray-200 bg-gray-50">
          <p className="text-sm text-gray-400">No Special Accounts departments found for this budget plan.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-6">

      {/* ── Page header — matches ObjectOfExpenditures eyebrow + title ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4 flex-shrink-0">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
              Appropriations by Object of Expenditures
            </span>
            {activePlan?.year && (
              <>
                <span className="text-gray-300 text-[10px]">·</span>
                <span className="text-[10px] font-medium text-gray-400">FY {activePlan.year}</span>
              </>
            )}
            {missingData > 0 && (
              <>
                <span className="text-gray-300 text-[10px]">·</span>
                <span className="text-[10px] font-medium text-red-500">{missingData} dept{missingData > 1 ? 's' : ''} missing data</span>
              </>
            )}
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Special Accounts</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono text-gray-600">{deptCount} departments</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="font-mono text-gray-600">{formatAmount(totalBudget)}</span>
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full lg:w-72 flex-shrink-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <Input
            type="text"
            placeholder="Search expense items…"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm border-gray-200 bg-white placeholder:text-gray-400"
          />
        </div>
      </div>

      {/* ── Table — matches ObjectOfExpenditures wrapper ── */}
      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <div className="overflow-auto h-full" style={{ maxHeight: 'calc(100vh - 220px)', minHeight: 400 }}>
          <SpecialAccountsTable
            filteredDepartments={filteredDepartments}
            sections={sections}
            debouncedSearchTerm={debouncedSearchTerm}
            getAmount={getAmount}
            formatAmount={formatAmount}
            filteredGrandTotals={grandTotals}
            animate={tableAnimate}
            programsByDept={programsByDept}
          />
        </div>
      </div>

      {/* ── Legend — matches ObjectOfExpenditures legend ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-purple-500 border border-purple-400 inline-block" />
          Special Accounts departments
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200 inline-block" />
          Departments with no submitted data
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-300 inline-block" />
          Subtotals and grand total computed automatically
        </span>
      </div>
    </div>
  );
};

export default SpecialAccounts;