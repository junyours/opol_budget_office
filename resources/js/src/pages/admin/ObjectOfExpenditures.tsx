import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useDepartmentData } from '../../hooks/useDepartmentData';
import { useExpenseData } from '../../hooks/useExpenseData';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { useAipProgramData } from '../../hooks/useAipProgramData';
import type { AipProgramEntry } from '../../hooks/useAipProgramData';
import { useDebounce } from '../../hooks/useDebounce';
import { Search } from 'lucide-react';
import API from '../../services/api';
import { ExpenseClassification, ExpenseItem, Department, DepartmentCategory } from '../../types/api';
import {
  Table, TableBody, TableCell,
  TableFooter, TableHead, TableHeader, TableRow,
} from "@/src/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/src/components/ui/tabs";
import { Progress }  from "@/src/components/ui/progress";
import { Skeleton }  from "@/src/components/ui/skeleton";
import { Badge }     from "@/src/components/ui/badge";
import { Input }     from "@/src/components/ui/input";
import { cn }        from "@/src/lib/utils";

// ─── Non-office data types ────────────────────────────────────────────────────

interface MdfItem {
  item_id: number;
  name: string;
  account_code: string | null;
  obligation_id: number | null;
  debt_type: 'principal' | 'interest' | null;
  proposed: number;
}

interface LdrrmfSummary {
  total_70pct: number;   // 70% Preparedness items total
  reserved_30: number;   // 30% QRF
  calamity_fund: number; // total 5% CF
}

interface NonOfficeData {
  mdf20: number;         // 20% MDF total (proposed)
  mdfItems: MdfItem[];   // individual MDF debt + project rows
  ldrrmf: LdrrmfSummary | null;
}

/* ─── Extended types ─────────────────────────────────────── */
interface DepartmentWithMeta extends Department {
  hasPlan: boolean;
  colorClass: string;
}
interface ClassificationWithItems extends ExpenseClassification {
  items: ExpenseItem[];
  filteredItems?: ExpenseItem[];
}

/* ─── Section descriptor ─────────────────────────────────── */
type SectionKind = 'classification' | 'special_programs' | 'non_office';

interface ClassificationSection {
  kind: 'classification';
  cls: ClassificationWithItems;
}
interface SpecialProgramsSection {
  kind: 'special_programs';
}
interface NonOfficeSection {
  kind: 'non_office';
}
type Section = ClassificationSection | SpecialProgramsSection | NonOfficeSection;

/* ─── Table props ────────────────────────────────────────── */
interface ExpenditureTableProps {
  filteredDepartments: DepartmentWithMeta[];
  sections: Section[];
  debouncedSearchTerm: string;
  getAmount: (deptId: number, itemId: number) => number | undefined;
  formatAmount: (amount: number) => string;
  filteredGrandTotals: number[];
  displayedCategories: DepartmentCategory[];
  animate: boolean;
  programsByDept: Map<number, AipProgramEntry[]>;
  nonOfficeData: NonOfficeData | null;
  fmtPlain: (n: number) => string;
}

/* ─── Column widths ──────────────────────────────────────── */
const COL = { FIRST: 128, SECOND: 256, DEPT: 160, MDF: 148, LDRRMF: 148, GRAND: 172 } as const;

/* ══════════════════════════════════════════════════════════
   SKELETON TABLE
══════════════════════════════════════════════════════════ */
const SkeletonExpenditureTable = () => {
  const cats = [1, 2, 3];
  const depts = [1, 2];
  const dynCols = cats.length * (depts.length + 1);
  const minW = COL.FIRST + COL.SECOND + dynCols * COL.DEPT;

  return (
    <Table className="table-fixed" style={{ minWidth: minW }}>
      <TableHeader className="sticky top-0 z-20 bg-white">
        <TableRow className="border-b border-gray-100">
          <TableHead rowSpan={2} style={{ width: COL.FIRST }} className="sticky left-0 z-30 bg-white text-gray-500 text-[11px] font-semibold uppercase tracking-wide">
            Account Code
          </TableHead>
          <TableHead rowSpan={2} style={{ width: COL.SECOND, left: COL.FIRST }} className="sticky left-[128px] z-30 bg-white text-gray-500 text-[11px] font-semibold uppercase tracking-wide">
            Object of Expenditures
          </TableHead>
          {cats.map(c => (
            <TableHead key={c} colSpan={depts.length + 1} style={{ minWidth: (depts.length + 1) * COL.DEPT }} className="text-center bg-gray-50">
              <Skeleton className="h-4 w-24 mx-auto rounded" />
            </TableHead>
          ))}
        </TableRow>
        <TableRow className="border-b border-gray-100">
          {cats.map(c => (
            <React.Fragment key={c}>
              {depts.map(d => (
                <TableHead key={d} style={{ width: COL.DEPT }} className="text-center bg-gray-50">
                  <Skeleton className="h-3.5 w-12 mx-auto rounded" />
                </TableHead>
              ))}
              <TableHead style={{ width: COL.DEPT }} className="text-center bg-gray-50">
                <Skeleton className="h-3.5 w-10 mx-auto rounded" />
              </TableHead>
            </React.Fragment>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {[1, 2, 3].map(cls => (
          <React.Fragment key={cls}>
            {Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={i} className="border-b border-gray-50">
                <TableCell style={{ width: COL.FIRST }} className="sticky left-0 bg-white">
                  <Skeleton className="h-3.5 w-16 rounded" />
                </TableCell>
                <TableCell style={{ width: COL.SECOND }} className="sticky left-[128px] bg-white">
                  <Skeleton className="h-3.5 w-40 rounded" />
                </TableCell>
                {cats.map(c => (
                  <React.Fragment key={c}>
                    {depts.map(d => (
                      <TableCell key={d} style={{ width: COL.DEPT }} className="text-right">
                        <Skeleton className="h-3.5 w-16 ml-auto rounded" />
                      </TableCell>
                    ))}
                    <TableCell style={{ width: COL.DEPT }} className="text-right">
                      <Skeleton className="h-3.5 w-16 ml-auto rounded" />
                    </TableCell>
                  </React.Fragment>
                ))}
              </TableRow>
            ))}
            <TableRow className="bg-gray-50 border-b border-gray-100">
              <TableCell colSpan={2} className="sticky left-0 bg-gray-50">
                <Skeleton className="h-4 w-28 rounded" />
              </TableCell>
              {cats.map(c => (
                <React.Fragment key={c}>
                  {depts.map(d => <TableCell key={d} style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableCell>)}
                  <TableCell style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-4 w-16 ml-auto rounded" /></TableCell>
                </React.Fragment>
              ))}
            </TableRow>
          </React.Fragment>
        ))}
      </TableBody>
      <TableFooter className="sticky bottom-0 z-20 bg-white">
        <TableRow>
          <TableCell colSpan={2} className="sticky left-0 bg-white">
            <Skeleton className="h-5 w-28 rounded" />
          </TableCell>
          {cats.map(c => (
            <React.Fragment key={c}>
              {depts.map(d => <TableCell key={d} style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-5 w-16 ml-auto rounded" /></TableCell>)}
              <TableCell style={{ width: COL.DEPT }} className="text-right"><Skeleton className="h-5 w-16 ml-auto rounded" /></TableCell>
            </React.Fragment>
          ))}
        </TableRow>
      </TableFooter>
    </Table>
  );
};

/* ══════════════════════════════════════════════════════════
   SPECIAL PROGRAMS SECTION
══════════════════════════════════════════════════════════ */
interface SpecialProgramsSectionProps {
  catsWithDepts: Array<DepartmentCategory & { departments: DepartmentWithMeta[] }>;
  filteredDepartments: DepartmentWithMeta[];
  programsByDept: Map<number, AipProgramEntry[]>;
  formatAmount: (n: number) => string;
  fmtPlain: (n: number) => string;
  animate: boolean;
  rowIdxRef: { current: number };
}

const SpecialProgramsRows: React.FC<SpecialProgramsSectionProps> = ({
  catsWithDepts, filteredDepartments, programsByDept, formatAmount, fmtPlain, animate, rowIdxRef,
}) => {
  const programRows = useMemo(() => {
    const rows: Array<{ dept: DepartmentWithMeta; program: AipProgramEntry }> = [];
    filteredDepartments.forEach(dept => {
      (programsByDept.get(dept.dept_id) ?? []).forEach(prog => rows.push({ dept, program: prog }));
    });
    return rows;
  }, [filteredDepartments, programsByDept]);

  const deptSubtotals = useMemo(() => {
    const m = new Map<number, number>();
    filteredDepartments.forEach(dept => {
      m.set(dept.dept_id, (programsByDept.get(dept.dept_id) ?? []).reduce((s, p) => s + p.total_amount, 0));
    });
    return m;
  }, [filteredDepartments, programsByDept]);

  const catSubtotals = useMemo(() => {
    const m = new Map<number, number>();
    catsWithDepts.forEach(cat => {
      m.set(cat.dept_category_id, cat.departments.reduce((s, d) => s + (deptSubtotals.get(d.dept_id) ?? 0), 0));
    });
    return m;
  }, [catsWithDepts, deptSubtotals]);

  if (programRows.length === 0) return null;

  const totalCols = catsWithDepts.reduce((s, c) => s + c.departments.length + 1, 0);

  return (
    <React.Fragment>
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
          2.0 Special Programs
        </TableCell>
        {catsWithDepts.map(cat => (
          <React.Fragment key={cat.dept_category_id}>
            {cat.departments.map(dept => <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="bg-gray-50" />)}
            <TableCell style={{ width: COL.DEPT }} className="bg-gray-50" />
          </React.Fragment>
        ))}
        <TableCell style={{ width: COL.MDF }}   className="bg-blue-50/40 border-l border-blue-100" />
        <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/40 border-l border-blue-100" />
        <TableCell style={{ width: COL.MDF }}   className="bg-blue-50/40 border-l border-blue-100" />
        <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/40 border-l border-blue-100" />
        <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-gray-50 border-l border-gray-200" />
      </TableRow>

      {programRows.map(({ dept, program }, progIdx) => {
        rowIdxRef.current++;
        const idx = rowIdxRef.current;
        const isFirstProg = progIdx === 0;
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
            {catsWithDepts.map((cat, catIdx) => (
              <React.Fragment key={cat.dept_category_id}>
                {cat.departments.map((colDept, deptIdx) => {
                  const showPeso = isFirstProg && catIdx === 0 && deptIdx === 0;
                  return (
                    <TableCell key={colDept.dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums text-blue-500 font-mono text-[12px]">
                      {colDept.dept_id === dept.dept_id
                        ? (showPeso ? formatAmount(program.total_amount) : fmtPlain(program.total_amount))
                        : <span className="text-gray-200">—</span>}
                    </TableCell>
                  );
                })}
                <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums text-gray-400 font-mono text-[12px]">
                  <span className="text-gray-200">—</span>
                </TableCell>
              </React.Fragment>
            ))}
            {/* Row grand total — peso on first row only */}
            <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-white border-l border-gray-200 text-right tabular-nums font-bold text-gray-900 font-mono text-[12px] px-4">
              {program.total_amount > 0
                ? (isFirstProg ? formatAmount(program.total_amount) : fmtPlain(program.total_amount))
                : <span className="text-gray-200">—</span>}
            </TableCell>
          </TableRow>
        );
      })}

      {/* Subtotal */}
      {(() => {
        rowIdxRef.current++;
        const grandSubtotal = Array.from(deptSubtotals.values()).reduce((a, b) => a + b, 0);
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
            {catsWithDepts.map((cat, catIdx) => (
              <React.Fragment key={cat.dept_category_id}>
                {cat.departments.map((dept, deptIdx) => {
                  const showPeso = catIdx === 0 && deptIdx === 0;
                  return (
                    <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 bg-gray-100 font-mono text-[12px]">
                      {showPeso ? formatAmount(deptSubtotals.get(dept.dept_id) ?? 0) : fmtPlain(deptSubtotals.get(dept.dept_id) ?? 0)}
                    </TableCell>
                  );
                })}
                <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 bg-gray-100 font-mono text-[12px]">
                  {catIdx === 0 ? formatAmount(catSubtotals.get(cat.dept_category_id) ?? 0) : fmtPlain(catSubtotals.get(cat.dept_category_id) ?? 0)}
                </TableCell>
              </React.Fragment>
            ))}
            <TableCell style={{ width: COL.MDF    }} className="bg-blue-50/40 border-l border-blue-100 text-right text-blue-200 font-mono text-[12px] px-3">–</TableCell>
            <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/40 border-l border-blue-100 text-right text-blue-200 font-mono text-[12px] px-3">–</TableCell>
            <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-gray-100 border-l border-gray-200 text-right tabular-nums font-bold text-gray-900 font-mono text-[12px] px-4">
              {formatAmount(grandSubtotal)}
            </TableCell>
          </TableRow>
        );
      })()}
    </React.Fragment>
  );
};

/* ══════════════════════════════════════════════════════════
   NON-OFFICE EXPNDTRS SECTION (4.0)
   — all dept columns blank
   — MDF items go in the orange 20% MDF column
   — LDRRMF items go in the red 5% LDRRMF column
   — Grand Total col = sum of both
══════════════════════════════════════════════════════════ */
interface NonOfficeSectionProps {
  catsWithDepts: Array<DepartmentCategory & { departments: DepartmentWithMeta[] }>;
  nonOfficeData: NonOfficeData;
  formatAmount: (n: number) => string;
  animate: boolean;
  rowIdxRef: { current: number };
}

const NonOfficeRows: React.FC<NonOfficeSectionProps> = ({
  catsWithDepts, nonOfficeData, formatAmount, animate, rowIdxRef,
}) => {
  /**
   * NonRow — a single row in the 4.0 section.
   *
   * dept+category cols are always blank (–).
   * mdfValue  → appears in the orange 20% MDF column.
   * ldrrmfValue → appears in the red 5% LDRRMF column.
   * Grand Total = mdfValue + ldrrmfValue (only shown when at least one is set).
   */
  const NonRow = ({
    label, accCode = '', indent = 0,
    bold = false, italic = false, dimLabel = false,
    mdfValue, ldrrmfValue,
  }: {
    label: string; accCode?: string; indent?: number;
    bold?: boolean; italic?: boolean; dimLabel?: boolean;
    mdfValue?: number; ldrrmfValue?: number;
  }) => {
    rowIdxRef.current++;
    const idx = rowIdxRef.current;
    const rowGrand = (mdfValue ?? 0) + (ldrrmfValue ?? 0);
    const hasMdf    = mdfValue !== undefined && mdfValue > 0;
    const hasLdrrmf = ldrrmfValue !== undefined && ldrrmfValue > 0;

    return (
      <TableRow
        className={cn("border-b border-gray-50 bg-white hover:bg-gray-50/40 transition-colors", animate && "trow-anim")}
        style={animate ? { animationDelay: `${(idx % 30) * 22}ms` } : undefined}
      >
        {/* Account code */}
        <TableCell style={{ width: COL.FIRST }} className="sticky left-0 bg-white font-mono text-[11px] text-gray-400 border-r border-gray-100">
          {accCode}
        </TableCell>
        {/* Label */}
        <TableCell style={{ width: COL.SECOND }} className={cn(
          "sticky left-[128px] bg-white border-r border-gray-100 text-[12px]",
          bold ? "font-semibold text-gray-800" : dimLabel ? "text-gray-400" : "text-gray-700",
          italic && "italic"
        )}>
          <span style={{ paddingLeft: indent * 14 }}>{label}</span>
        </TableCell>
        {/* Dept cells — all blank */}
        {catsWithDepts.flatMap(cat =>
          cat.departments.map(dept => (
            <TableCell key={`${cat.dept_category_id}-${dept.dept_id}`} style={{ width: COL.DEPT }} className="text-right text-gray-200 font-mono text-[12px]">–</TableCell>
          ))
        )}
        {/* Category total cells — all blank */}
        {catsWithDepts.map(cat => (
          <TableCell key={cat.dept_category_id} style={{ width: COL.DEPT }} className="text-right text-gray-200 font-mono text-[12px]">–</TableCell>
        ))}
        {/* 20% MDF column — blue: derived amount */}
        <TableCell style={{ width: COL.MDF }} className="bg-blue-50/40 border-l border-blue-100 text-right font-mono tabular-nums text-[12px] px-3">
          {hasMdf
            ? <span className={cn(bold ? "font-bold text-blue-800" : "font-medium text-blue-600")}>{formatAmount(mdfValue!)}</span>
            : <span className="text-blue-200">–</span>}
        </TableCell>
        {/* 5% LDRRMF column — blue: derived amount */}
        <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/40 border-l border-blue-100 text-right font-mono tabular-nums text-[12px] px-3">
          {hasLdrrmf
            ? <span className={cn(bold ? "font-bold text-blue-800" : "font-medium text-blue-600")}>{formatAmount(ldrrmfValue!)}</span>
            : <span className="text-blue-200">–</span>}
        </TableCell>
        {/* Grand Total column */}
        <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-white border-l border-gray-200 text-right font-mono tabular-nums text-[12px] px-4">
          {rowGrand > 0
            ? <span className={cn(bold ? "font-bold text-gray-900" : "font-medium text-gray-700")}>{formatAmount(rowGrand)}</span>
            : <span className="text-gray-200">–</span>}
        </TableCell>
      </TableRow>
    );
  };

  const { mdf20, mdfItems, ldrrmf } = nonOfficeData;
  const debtItems    = mdfItems.filter(i => i.obligation_id !== null);
  const regularItems = mdfItems.filter(i => i.obligation_id === null);
  const ldrrmfTotal  = ldrrmf ? (ldrrmf.reserved_30 + ldrrmf.total_70pct) : 0;
  const subtotal     = mdf20 + ldrrmfTotal;

  return (
    <React.Fragment>
      {/* ── 4.0 section header ── */}
      {(() => { rowIdxRef.current++; return null; })()}
      <TableRow
        className={cn("border-b border-gray-100", animate && "trow-anim")}
        style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
      >
        <TableCell colSpan={2} className="sticky left-0 bg-gray-50 font-semibold text-gray-800 py-2.5 border-r border-gray-200 text-[12px]">
          4.0 NON-OFFICE EXPNDTRS
        </TableCell>
        {catsWithDepts.flatMap(cat => cat.departments.map(d => (
          <TableCell key={d.dept_id} style={{ width: COL.DEPT }} className="bg-gray-50" />
        )))}
        {catsWithDepts.map(cat => (
          <TableCell key={cat.dept_category_id} style={{ width: COL.DEPT }} className="bg-gray-50" />
        ))}
        <TableCell style={{ width: COL.MDF   }} className="bg-blue-50/40 border-l border-blue-100" />
        <TableCell style={{ width: COL.LDRRMF}} className="bg-blue-50/40 border-l border-blue-100" />
        <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-gray-50 border-l border-gray-200" />
      </TableRow>

      {/* ── 4.1 Budgetary/Statutory Requirements ── */}
      <NonRow label="4.1  Budgetary/Statutory Requirements:" bold />

      {/* ── 20% MDF block — values go in MDF column ── */}
      <NonRow label="Local Development Fund, 20% of IRA :" indent={1} />
      {mdf20 > 0 && (
        <NonRow label="20% Development Fund Projects:" indent={2} mdfValue={mdf20} />
      )}
      {debtItems.map(item => (
        <NonRow
          key={item.item_id}
          label={item.name}
          indent={item.debt_type === 'interest' ? 4 : 3}
          italic={item.debt_type === 'interest'}
          mdfValue={item.proposed > 0 ? item.proposed : undefined}
        />
      ))}
      {regularItems.map(item => (
        <NonRow
          key={item.item_id}
          label={item.name}
          accCode={item.account_code ?? ''}
          indent={2}
          mdfValue={item.proposed > 0 ? item.proposed : undefined}
        />
      ))}

      {/* ── 5% LDRRMF block — values go in LDRRMF column ── */}
      {ldrrmf && (
        <>
          <NonRow
            label="5% LDRRMF : (30% QRF + CY QRF Bal.)"
            indent={1}
            ldrrmfValue={ldrrmf.reserved_30 > 0 ? ldrrmf.reserved_30 : undefined}
          />
          <NonRow
            label="70% Pre-Disaster Preparedness Fund"
            indent={1}
            ldrrmfValue={ldrrmf.total_70pct > 0 ? ldrrmf.total_70pct : undefined}
          />
        </>
      )}

      {/* ── 4.0 subtotal row ── */}
      {(() => {
        rowIdxRef.current++;
        const idx = rowIdxRef.current;
        return (
          <TableRow
            className={cn("border-b border-gray-200 bg-gray-100/60", animate && "trow-anim")}
            style={animate ? { animationDelay: `${(idx % 30) * 22}ms` } : undefined}
          >
            <TableCell colSpan={2} className="sticky left-0 z-10 bg-gray-100 text-right text-[12px] font-semibold text-gray-700 py-2.5 border-r border-gray-200">
              Subtotal — Non-Office Expenditures
            </TableCell>
            {catsWithDepts.flatMap(cat => cat.departments.map(d => (
              <TableCell key={d.dept_id} style={{ width: COL.DEPT }} className="bg-gray-100 text-right text-gray-300 font-mono text-[12px]">–</TableCell>
            )))}
            {catsWithDepts.map(cat => (
              <TableCell key={cat.dept_category_id} style={{ width: COL.DEPT }} className="bg-gray-100 text-right text-gray-300 font-mono text-[12px]">–</TableCell>
            ))}
            {/* MDF subtotal */}
            <TableCell style={{ width: COL.MDF }} className="bg-blue-50 border-l border-blue-200 text-right font-mono tabular-nums font-semibold text-blue-700 text-[12px] px-3">
              {mdf20 > 0 ? formatAmount(mdf20) : <span className="text-blue-200">–</span>}
            </TableCell>
            {/* LDRRMF subtotal */}
            <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50 border-l border-blue-200 text-right font-mono tabular-nums font-semibold text-blue-700 text-[12px] px-3">
              {ldrrmfTotal > 0 ? formatAmount(ldrrmfTotal) : <span className="text-blue-200">–</span>}
            </TableCell>
            {/* Grand total */}
            <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-gray-100 border-l border-gray-200 text-right font-mono tabular-nums font-bold text-gray-900 text-[12px] px-4">
              {formatAmount(subtotal)}
            </TableCell>
          </TableRow>
        );
      })()}
    </React.Fragment>
  );
};

/* ══════════════════════════════════════════════════════════
   EXPENDITURE TABLE
══════════════════════════════════════════════════════════ */
const ExpenditureTable = React.memo(({
  filteredDepartments, sections, debouncedSearchTerm, getAmount, formatAmount,
  filteredGrandTotals, displayedCategories, animate, programsByDept, nonOfficeData, fmtPlain,
}: ExpenditureTableProps) => {
  // Compute non-office subtotal locally
  const nonOfficeSubtotal = nonOfficeData
  ? (nonOfficeData.mdf20 + (nonOfficeData.ldrrmf
      ? (nonOfficeData.ldrrmf.reserved_30 + nonOfficeData.ldrrmf.total_70pct)
      : 0))
  : 0;

  const catsWithDepts = useMemo(() =>
    displayedCategories.map(cat => ({
      ...cat,
      departments: filteredDepartments.filter(d => d.dept_category_id === cat.dept_category_id),
    })),
    [displayedCategories, filteredDepartments]
  );

  const dynCols = useMemo(() => catsWithDepts.reduce((s, c) => s + c.departments.length + 1, 0), [catsWithDepts]);
  const minW    = COL.FIRST + COL.SECOND + dynCols * COL.DEPT + COL.MDF + COL.LDRRMF + COL.GRAND;
  const rowIdxRef = { current: 0 };

  const CATEGORY_COLORS: Record<number, { header: string; subHeader: string; total: string }> = {
    1: { header: "bg-blue-500 text-white border-blue-400",       subHeader: "bg-blue-50",    total: "bg-blue-100 text-blue-900"    },
    2: { header: "bg-amber-500 text-white border-amber-400",     subHeader: "bg-amber-50",   total: "bg-amber-100 text-amber-900"  },
    3: { header: "bg-emerald-500 text-white border-emerald-400", subHeader: "bg-emerald-50", total: "bg-emerald-100 text-emerald-900" },
    4: { header: "bg-purple-500 text-white border-purple-400",   subHeader: "bg-purple-50",  total: "bg-purple-100 text-purple-900" },
  };
  const catColor = (id: number) => CATEGORY_COLORS[id] ?? { header: "bg-gray-50 text-gray-400 border-gray-200", subHeader: "bg-gray-50", total: "bg-gray-100 text-gray-700" };

  return (
    <>
      <style>{`
        @keyframes rowIn {
          from { opacity:0; transform:translateY(8px); }
          to   { opacity:1; transform:translateY(0);   }
        }
        .trow-anim {
          opacity: 0;
          animation: rowIn .28s cubic-bezier(.25,.8,.25,1) forwards;
        }
      `}</style>

      <Table className="table-fixed text-[12px]" style={{ minWidth: minW }}>

        {/* ── Sticky header ── */}
        <TableHeader className="sticky top-0 z-20">
          <TableRow className="border-b border-gray-200 bg-white">
            <TableHead rowSpan={2} style={{ width: COL.FIRST }} className="sticky left-0 z-30 bg-white border-r border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-600 align-bottom pb-3">
              Account Code
            </TableHead>
            <TableHead rowSpan={2} style={{ width: COL.SECOND, left: COL.FIRST }} className="sticky left-[128px] z-30 bg-white border-r border-gray-200 text-[11px] font-semibold uppercase tracking-wide text-gray-600 align-bottom pb-3">
              Object of Expenditures
            </TableHead>
            {catsWithDepts.map((cat) => (
              <TableHead
                key={cat.dept_category_id}
                colSpan={cat.departments.length + 1}
                style={{ minWidth: (cat.departments.length + 1) * COL.DEPT }}
                className={cn("text-center border-b border-r text-[11px] font-bold uppercase tracking-widest pb-2", catColor(cat.dept_category_id).header)}
              >
                {cat.dept_category_name}
              </TableHead>
            ))}
            {/* 20% MDF column */}
            <TableHead
              rowSpan={2}
              style={{ width: COL.MDF }}
              className="border-b border-r border-l border-gray-200 bg-blue-50 text-blue-700 text-right text-[10px] font-bold uppercase tracking-widest align-bottom pb-3 px-3"
            >
              20% MDF<br />Projects
            </TableHead>
            {/* 5% LDRRMF column */}
            <TableHead
              rowSpan={2}
              style={{ width: COL.LDRRMF }}
              className="border-b border-r border-gray-200 bg-blue-50 text-blue-700 text-right text-[10px] font-bold uppercase tracking-widest align-bottom pb-3 px-3"
            >
              5% LDRRMF<br />(30% QRF + 70%)
            </TableHead>
            {/* Grand Total sticky right column */}
            <TableHead
              rowSpan={2}
              style={{ width: COL.GRAND }}
              className="sticky right-0 z-30 bg-white border-l border-gray-300 text-gray-900 text-right text-[11px] font-bold uppercase tracking-widest align-bottom pb-3 px-4"
            >
              Grand Total
            </TableHead>
          </TableRow>
          <TableRow className="border-b-2 border-gray-200 bg-white">
            {catsWithDepts.map((cat) => (
              <React.Fragment key={cat.dept_category_id}>
                {cat.departments.map(dept => (
                  <TableHead
                    key={dept.dept_id}
                    style={{ width: COL.DEPT }}
                    className={cn(
                      "text-center text-[11px] font-semibold pb-3",
                      dept.hasPlan ? catColor(cat.dept_category_id).subHeader + " text-gray-700" : "text-red-500 bg-red-50"
                    )}
                  >
                    {dept.dept_abbreviation}
                    {!dept.hasPlan && <span className="block text-[9px] font-normal text-red-400 mt-0.5">No data</span>}
                  </TableHead>
                ))}
                <TableHead style={{ width: COL.DEPT }} className={cn("text-center text-[11px] font-semibold pb-3", catColor(cat.dept_category_id).total)}>
                  Total
                </TableHead>
              </React.Fragment>
            ))}
          </TableRow>
        </TableHeader>

        {/* ── Body ── */}
        <TableBody>
          {sections.map((section) => {
            // ── Non-office section ──
            if (section.kind === 'non_office') {
              if (!nonOfficeData) return null;
              return (
                <NonOfficeRows
                  key="non-office"
                  catsWithDepts={catsWithDepts}
                  nonOfficeData={nonOfficeData}
                  formatAmount={formatAmount}
                  animate={animate}
                  rowIdxRef={rowIdxRef}
                />
              );
            }

            // ── Special Programs ──
            if (section.kind === 'special_programs') {
              return (
                <SpecialProgramsRows
                  key="special-programs"
                  catsWithDepts={catsWithDepts}
                  filteredDepartments={filteredDepartments}
                  programsByDept={programsByDept}
                  formatAmount={formatAmount}
                  fmtPlain={fmtPlain}
                  animate={animate}
                  rowIdxRef={rowIdxRef}
                />
              );
            }

            // ── Classification rows ──
            const cls = section.cls;
            const toRender = debouncedSearchTerm ? cls.filteredItems! : cls.items;

            return (
              <React.Fragment key={cls.expense_class_id}>
                {(() => { rowIdxRef.current++; return null; })()}
                <TableRow
                  className={cn("border-b border-gray-100", animate && "trow-anim")}
                  style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
                >
                  <TableCell colSpan={2} className="sticky left-0 bg-gray-50 font-semibold text-gray-800 py-2.5 border-r border-gray-200 text-[12px]">
                    {classLabel(cls.expense_class_name)}
                  </TableCell>
                  {catsWithDepts.map(cat => (
                    <React.Fragment key={cat.dept_category_id}>
                      {cat.departments.map(dept => <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="bg-gray-50" />)}
                      <TableCell style={{ width: COL.DEPT }} className="bg-gray-50" />
                    </React.Fragment>
                  ))}
                  <TableCell style={{ width: COL.MDF }}   className="bg-blue-50/40 border-l border-blue-100" />
                  <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/40 border-l border-blue-100" />
                  <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-gray-50 border-l border-gray-200" />
                </TableRow>

                {toRender.map((item: ExpenseItem, itemIdx: number) => {
                  rowIdxRef.current++;
                  const idx = rowIdxRef.current;
                  const isFirst = itemIdx === 0; // first row of this classification → show ₱
                  const catTotals: Record<number, number> = {};
                  catsWithDepts.forEach(cat => {
                    catTotals[cat.dept_category_id] = cat.departments.reduce((s, d) => s + (getAmount(d.dept_id, item.expense_class_item_id) ?? 0), 0);
                  });
                  const rowGrand = Object.values(catTotals).reduce((a, b) => a + b, 0);
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
                      {catsWithDepts.map((cat, catIdx) => (
                        <React.Fragment key={cat.dept_category_id}>
                          {cat.departments.map((dept, deptIdx) => {
                            const amt = getAmount(dept.dept_id, item.expense_class_item_id);
                            const showPeso = isFirst && catIdx === 0 && deptIdx === 0;
                            return (
                              <TableCell key={dept.dept_id} style={{ width: COL.DEPT }}
                                className={cn("text-right tabular-nums text-blue-500 font-mono", !dept.hasPlan && "bg-red-50/40 text-red-400")}>
                                {amt !== undefined && amt > 0
                                  ? (showPeso ? formatAmount(amt) : fmtPlain(amt))
                                  : <span className="text-gray-200">—</span>}
                              </TableCell>
                            );
                          })}
                          {/* Category total col — peso on first row only */}
                          <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 font-mono">
                            {catTotals[cat.dept_category_id] > 0
                              ? (isFirst && catIdx === 0 ? formatAmount(catTotals[cat.dept_category_id]) : fmtPlain(catTotals[cat.dept_category_id]))
                              : <span className="text-gray-200">—</span>}
                          </TableCell>
                        </React.Fragment>
                      ))}
                      {/* MDF col — blank */}
                      <TableCell style={{ width: COL.MDF }} className="bg-blue-50/30 border-l border-blue-100 text-right text-blue-200 font-mono text-[12px] px-3">–</TableCell>
                      {/* LDRRMF col — blank */}
                      <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/30 border-l border-blue-100 text-right text-blue-200 font-mono text-[12px] px-3">–</TableCell>
                      {/* Row grand total — peso on first row only */}
                      <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-white border-l border-gray-200 text-right tabular-nums font-bold text-gray-900 font-mono text-[12px] px-4">
                        {rowGrand > 0
                          ? (isFirst ? formatAmount(rowGrand) : fmtPlain(rowGrand))
                          : <span className="text-gray-200">—</span>}
                      </TableCell>
                    </TableRow>
                  );
                })}

                {/* Subtotal */}
                {(() => {
                  rowIdxRef.current++;
                  const deptSubs = filteredDepartments.map(dept =>
                    toRender.reduce((s, item) => s + (getAmount(dept.dept_id, item.expense_class_item_id) ?? 0), 0)
                  );
                  const catSubs: Record<number, number> = {};
                  catsWithDepts.forEach(cat => {
                    catSubs[cat.dept_category_id] = cat.departments.reduce((s, dept) => {
                      const i = filteredDepartments.findIndex(d => d.dept_id === dept.dept_id);
                      return s + (i !== -1 ? deptSubs[i] : 0);
                    }, 0);
                  });
                  return (
                    <TableRow
                      className={cn("border-b border-gray-200 bg-gray-100/60", animate && "trow-anim")}
                      style={animate ? { animationDelay: `${(rowIdxRef.current % 30) * 22}ms` } : undefined}
                    >
                      <TableCell colSpan={2} className="sticky left-0 z-10 bg-gray-100 text-right text-[12px] font-semibold text-gray-700 py-2.5 border-r border-gray-200">
                        Subtotal — {classLabel(cls.expense_class_name)}
                      </TableCell>
                      {catsWithDepts.map((cat, catIdx) => (
                        <React.Fragment key={cat.dept_category_id}>
                          {cat.departments.map((dept, deptIdx) => {
                            const i = filteredDepartments.findIndex(d => d.dept_id === dept.dept_id);
                            const showPeso = catIdx === 0 && deptIdx === 0;
                            return (
                              <TableCell key={dept.dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 bg-gray-100 font-mono">
                                {showPeso ? formatAmount(deptSubs[i]) : fmtPlain(deptSubs[i])}
                              </TableCell>
                            );
                          })}
                          <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-semibold text-gray-700 bg-gray-100 font-mono">
                            {catIdx === 0 ? formatAmount(catSubs[cat.dept_category_id]) : fmtPlain(catSubs[cat.dept_category_id])}
                          </TableCell>
                        </React.Fragment>
                      ))}
                      {/* MDF col blank for subtotal */}
                      <TableCell style={{ width: COL.MDF }} className="bg-blue-50/40 border-l border-blue-100 text-right text-blue-200 font-mono text-[12px] px-3">–</TableCell>
                      {/* LDRRMF col blank for subtotal */}
                      <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-50/40 border-l border-blue-100 text-right text-blue-200 font-mono text-[12px] px-3">–</TableCell>
                      {/* Subtotal grand total — always ₱ */}
                      <TableCell style={{ width: COL.GRAND }} className="sticky right-0 bg-gray-100 border-l border-gray-200 text-right tabular-nums font-bold text-gray-900 font-mono text-[12px] px-4">
                        {formatAmount(Object.values(catSubs).reduce((a, b) => a + b, 0))}
                      </TableCell>
                    </TableRow>
                  );
                })()}
              </React.Fragment>
            );
          })}
        </TableBody>

        {/* ── Grand Total ── */}
        <TableFooter className="sticky bottom-0 z-20">
          <TableRow className="bg-gray-900">
            <TableCell colSpan={2} className="sticky left-0 z-30 bg-gray-900 text-right text-[11px] font-bold text-white uppercase tracking-widest py-3.5 border-r border-gray-700">
              Grand Total
            </TableCell>
            {(() => {
              let overallGrand = 0;
              const cells = catsWithDepts.map((cat, catIdx) => {
                const vals = cat.departments.map(dept => {
                  const i = filteredDepartments.findIndex(d => d.dept_id === dept.dept_id);
                  return filteredGrandTotals[i] ?? 0;
                });
                const catTotal = vals.reduce((a, b) => a + b, 0);
                overallGrand += catTotal;
                return (
                  <React.Fragment key={cat.dept_category_id}>
                    {vals.map((v, i) => {
                      const isFirstCell = catIdx === 0 && i === 0;
                      return (
                        <TableCell key={cat.departments[i].dept_id} style={{ width: COL.DEPT }} className="text-right tabular-nums font-bold text-white bg-gray-900 font-mono">
                          {isFirstCell ? formatAmount(v) : fmtPlain(v)}
                        </TableCell>
                      );
                    })}
                    <TableCell style={{ width: COL.DEPT }} className="text-right tabular-nums font-bold text-white bg-gray-800 font-mono">
                      {catIdx === 0 ? formatAmount(catTotal) : fmtPlain(catTotal)}
                    </TableCell>
                  </React.Fragment>
                );
              });
              return (
                <>
                  {cells}
                  {/* 20% MDF column — show total in footer */}
                  <TableCell style={{ width: COL.MDF }} className="bg-blue-950/20 border-l border-blue-900/40 text-right font-mono tabular-nums font-bold text-blue-300 text-[12px] px-3">
                    {nonOfficeData?.mdf20 ? formatAmount(nonOfficeData.mdf20) : <span className="text-blue-900">–</span>}
                  </TableCell>
                  {/* 5% LDRRMF column — show total in footer */}
                  <TableCell style={{ width: COL.LDRRMF }} className="bg-blue-950/20 border-l border-blue-900/40 text-right font-mono tabular-nums font-bold text-blue-300 text-[12px] px-3">
                    {nonOfficeData?.ldrrmf
                      ? formatAmount((nonOfficeData.ldrrmf.reserved_30 + nonOfficeData.ldrrmf.total_70pct))
                      : <span className="text-blue-900">–</span>}
                  </TableCell>
                  {/* Overall grand total — sticky right */}
                  <TableCell
                    style={{ width: COL.GRAND }}
                    className="sticky right-0 z-30 bg-gray-900 border-l-2 border-white/10 text-right tabular-nums font-bold text-white font-mono text-[13px] px-4"
                  >
                    {formatAmount(overallGrand + nonOfficeSubtotal)}
                  </TableCell>
                </>
              );
            })()}
          </TableRow>
        </TableFooter>
      </Table>
    </>
  );
});
ExpenditureTable.displayName = 'ExpenditureTable';

/* ══════════════════════════════════════════════════════════
   SECTION ORDERING
══════════════════════════════════════════════════════════ */
const EXCLUDED_CLASSIFICATIONS = new Set(['financial expenses']);

const CLASS_PREFIX: Record<string, string> = {
  'personal services':                        '1.1',
  'maintenance and other operating expenses': '1.2',
  'capital outlay':                           '3.0',
};

// 4.0 Non-Office comes after Capital Outlay
const SECTION_ORDER_NAMES = [
  'personal services',
  'maintenance and other operating expenses',
  '__SPECIAL_PROGRAMS__',
  'capital outlay',
  '__NON_OFFICE__',
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
    } else if (slot === '__NON_OFFICE__') {
      if (!q) sections.push({ kind: 'non_office' });
    } else {
      const cls = clsByName.get(slot);
      if (cls) { sections.push({ kind: 'classification', cls }); placed.add(slot); }
    }
  }
  filteredCls.forEach(cls => {
    const normalized = normalizeName(cls.expense_class_name);
    if (!placed.has(normalized) && !(SECTION_ORDER_NAMES as readonly string[]).includes(normalized)) {
      sections.push({ kind: 'classification', cls });
    }
  });
  return sections;
}

/* ══════════════════════════════════════════════════════════
   PAGE
══════════════════════════════════════════════════════════ */
const ObjectOfExpenditures: React.FC = () => {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const activePlanId = activePlan?.budget_plan_id;

  const [searchTerm,       setSearchTerm]       = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showLoader,       setShowLoader]        = useState(true);
  const [progress,         setProgress]          = useState(0);
  const [tableAnimate,     setTableAnimate]      = useState(false);

  // Non-office data (MDF + LDRRMF)
  const [nonOfficeData,    setNonOfficeData]     = useState<NonOfficeData | null>(null);
  const [nonOfficeLoading, setNonOfficeLoading]  = useState(false);

  const debouncedSearchTerm = useDebounce(searchTerm, 300);

  const { allDepartments, categories, loading: deptLoading } = useDepartmentData(activePlanId);
  const { classifications, items, amountMap, loading: expLoading } = useExpenseData(activePlanId);

  const deptsWithData = useMemo(() => {
    const s = new Set<number>();
    amountMap.forEach((_, key) => s.add(parseInt(key.split('-')[0], 10)));
    return s;
  }, [amountMap]);

  const filteredDepartments: DepartmentWithMeta[] = useMemo(() => {
    const base = allDepartments.filter(d => d.dept_category_id !== 4);
    const filtered = selectedCategory === 'all' ? base : base.filter(d => d.dept_category_id === Number(selectedCategory));
    return filtered.map(dept => ({
      ...dept,
      hasPlan: deptsWithData.has(dept.dept_id),
      colorClass: deptsWithData.has(dept.dept_id) ? '' : 'bg-red-50',
    }));
  }, [allDepartments, selectedCategory, deptsWithData]);

  const { programsByDept, loading: aipLoading } = useAipProgramData(activePlanId);

  // ── Fetch non-office data (MDF + LDRRMF) ──────────────────────────────────
  useEffect(() => {
    if (!activePlanId) return;
    let cancelled = false;
    setNonOfficeLoading(true);

    // const fetchNonOffice = async () => {
    //   try {
    //     const [mdfRes, ldrrmfRes] = await Promise.allSettled([
    //       API.get(`/mdf-funds?budget_plan_id=${activePlanId}`),
    //       API.get(`/ldrrmfip/summary?budget_plan_id=${activePlanId}&source=general-fund`),
    //     ]);

    //     if (cancelled) return;

    //     // ── MDF ──
    //     let mdf20 = 0;
    //     let mdfItems: MdfItem[] = [];
    //     if (mdfRes.status === 'fulfilled') {
    //       const mdfData = mdfRes.value.data;
    //       // grand total proposed = 20% MDF total
    //       mdf20 = mdfData?.grand_totals?.proposed ?? 0;
    //       // Flatten all items across categories
    //       const allCats: any[] = mdfData?.categories ?? [];
    //       mdfItems = allCats.flatMap((cat: any) =>
    //         (cat.items ?? []).map((item: any) => ({
    //           item_id:       item.item_id,
    //           name:          item.name,
    //           account_code:  item.account_code ?? null,
    //           obligation_id: item.obligation_id ?? null,
    //           debt_type:     item.debt_type ?? null,
    //           proposed:      item.proposed ?? 0,
    //         }))
    //       );
    //     }

    //     // ── LDRRMF ──
    //     let ldrrmf: LdrrmfSummary | null = null;
    //     if (ldrrmfRes.status === 'fulfilled') {
    //       const d = ldrrmfRes.value.data?.data ?? ldrrmfRes.value.data;
    //       if (d) {
    //         ldrrmf = {
    //           total_70pct:   d.total_70pct   ?? 0,
    //           reserved_30:   d.reserved_30   ?? 0,
    //           calamity_fund: d.calamity_fund ?? 0,
    //         };
    //       }
    //     }

    //     if (!cancelled) setNonOfficeData({ mdf20, mdfItems, ldrrmf });
    //   } catch (err) {
    //     console.error('Failed to load non-office data', err);
    //   } finally {
    //     if (!cancelled) setNonOfficeLoading(false);
    //   }
    // };
    const fetchNonOffice = async () => {
  try {
    const [mdfRes, ldrrmfRes, gfRes] = await Promise.allSettled([
      API.get(`/mdf-funds?budget_plan_id=${activePlanId}`),
      API.get(`/ldrrmfip/summary?budget_plan_id=${activePlanId}&source=general-fund`),
      API.get('/income-fund', { params: { source: 'general-fund' } }), // ← added
    ]);

    if (cancelled) return;

    // ── MDF (unchanged) ──
    let mdf20 = 0;
    let mdfItems: MdfItem[] = [];
    if (mdfRes.status === 'fulfilled') {
      const mdfData = mdfRes.value.data;
      mdf20 = mdfData?.grand_totals?.proposed ?? 0;
      const allCats: any[] = mdfData?.categories ?? [];
      mdfItems = allCats.flatMap((cat: any) =>
        (cat.items ?? []).map((item: any) => ({
          item_id:       item.item_id,
          name:          item.name,
          account_code:  item.account_code ?? null,
          obligation_id: item.obligation_id ?? null,
          debt_type:     item.debt_type ?? null,
          proposed:      item.proposed ?? 0,
        }))
      );
    }

    // ── GF total → compute 5% × 30% ──
    let gfTotal = 0;
    if (gfRes.status === 'fulfilled') {
      const rows: any[] = gfRes.value.data?.data ?? [];
      const parentIds   = new Set(rows.filter((r: any) => r.parent_id !== null).map((r: any) => r.parent_id));
      const leafRows    = rows.filter((r: any) => !parentIds.has(r.id));
      gfTotal           = leafRows.reduce((s: number, r: any) => s + (parseFloat(r.proposed) || 0), 0);
    }

    // ── LDRRMF ──
    let ldrrmf: LdrrmfSummary | null = null;
    if (ldrrmfRes.status === 'fulfilled') {
      const d = ldrrmfRes.value.data?.data ?? ldrrmfRes.value.data;
      if (d) {
        ldrrmf = {
          total_70pct:   d.total_70pct   ?? 0,
          reserved_30:   gfTotal * 0.05 * 0.30, // ← 30% of the 5% allocation
          calamity_fund: d.calamity_fund ?? 0,
        };
      }
    }

    if (!cancelled) setNonOfficeData({ mdf20, mdfItems, ldrrmf });
  } catch (err) {
    console.error('Failed to load non-office data', err);
  } finally {
    if (!cancelled) setNonOfficeLoading(false);
  }
};

    fetchNonOffice();
    return () => { cancelled = true; };
  }, [activePlanId]);

  const loading = deptLoading || expLoading || planLoading || aipLoading;

  /* ── Progress ── */
  const loadStages = useMemo(() => [
    { done: !planLoading,      weight: 10, label: 'Active plan'   },
    { done: !deptLoading,      weight: 20, label: 'Departments'   },
    { done: !expLoading,       weight: 50, label: 'Expense items' },
    { done: !aipLoading,       weight: 20, label: 'AIP programs'  },
  ], [planLoading, deptLoading, expLoading, aipLoading]);

  const bankedProgress = useMemo(
    () => loadStages.filter(s => s.done).reduce((sum, s) => sum + s.weight, 0),
    [loadStages]
  );
  const currentStageLabel = useMemo(
    () => loadStages.find(s => !s.done)?.label ?? 'Finalising…',
    [loadStages]
  );
  const nextBank = useMemo(() => {
    const first = loadStages.find(s => !s.done);
    return first ? bankedProgress + first.weight : 100;
  }, [loadStages, bankedProgress]);

  useEffect(() => { setProgress(bankedProgress); }, [bankedProgress]);
  useEffect(() => {
    const ceiling = nextBank - 2;
    if (bankedProgress >= 100) { setProgress(100); return; }
    const id = setInterval(() => {
      setProgress(p => { if (p >= ceiling) { clearInterval(id); return p; } return Math.min(p + Math.max(0.3, (ceiling - p) * 0.04), ceiling); });
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
  }, [selectedCategory, debouncedSearchTerm]);

  const displayedCategories: DepartmentCategory[] = useMemo(() =>
    categories.filter(c => c.dept_category_id !== 4 && filteredDepartments.some(d => d.dept_category_id === c.dept_category_id)),
    [categories, filteredDepartments]
  );

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
  const fmtPlain     = useCallback((n: number) => Math.round(n).toLocaleString('en-US'), []);
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

  // nonOffice uses reserved_30 + total_70pct (same formula as footer)
  const nonOfficeSubtotalForHeader = nonOfficeData
  ? (nonOfficeData.mdf20 + (nonOfficeData.ldrrmf
      ? (nonOfficeData.ldrrmf.reserved_30 + nonOfficeData.ldrrmf.total_70pct)
      : 0))
  : 0;
  const totalBudget = grandTotals.reduce((a, b) => a + b, 0) + nonOfficeSubtotalForHeader;
  const deptCount   = filteredDepartments.length;
  const missingData = filteredDepartments.filter(d => !d.hasPlan).length;

  /* ── Loading screen ── */
  if (showLoader) {
    return (
      <div className="flex flex-col h-full gap-5 p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-4">
          <div className="space-y-2">
            <Skeleton className="h-7 w-52 rounded-lg" />
            <Skeleton className="h-4 w-72 rounded" />
          </div>
          <Skeleton className="h-10 w-72 rounded-lg" />
        </div>
        <div className="flex gap-2 flex-wrap">
          {[80, 96, 112, 80].map((w, i) => <Skeleton key={i} className="h-9 rounded-lg" style={{ width: w }} />)}
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
          <SkeletonExpenditureTable />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full gap-4 p-6">

      {/* ── Page header ── */}
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
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">General Funds</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            <span className="font-mono text-gray-600">{deptCount} departments</span>
            <span className="mx-2 text-gray-300">·</span>
            <span className="font-mono text-gray-600">{formatAmount(totalBudget)}</span>
          </p>
        </div>
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

      {/* ── Category tabs ── */}
      <div className="flex-shrink-0">
        <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
          <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 gap-0.5">
            <TabsTrigger value="all" className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">
              All Categories
            </TabsTrigger>
            {categories.filter(c => c.dept_category_id !== 4).map(cat => (
              <TabsTrigger key={cat.dept_category_id} value={String(cat.dept_category_id)}
                className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500">
                {cat.dept_category_name}
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </div>

      {/* ── Table ── */}
      <div className="flex-1 overflow-hidden rounded-xl border border-gray-200 shadow-sm bg-white">
        <div className="overflow-auto h-full" style={{ maxHeight: 'calc(100vh - 260px)', minHeight: 400 }}>
          <ExpenditureTable
            filteredDepartments={filteredDepartments}
            sections={sections}
            debouncedSearchTerm={debouncedSearchTerm}
            getAmount={getAmount}
            formatAmount={formatAmount}
            filteredGrandTotals={grandTotals}
            displayedCategories={displayedCategories}
            animate={tableAnimate}
            programsByDept={programsByDept}
            nonOfficeData={nonOfficeData}
            fmtPlain={fmtPlain}
          />
        </div>
      </div>

      {/* ── Legend ── */}
      <div className="flex-shrink-0 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-50 border border-gray-200 inline-block" />
          1.1 Personal Services · 1.2 MOOE · 2.0 Special Programs · 3.0 Capital Outlay · 4.0 Non-Office Expenditures
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-red-50 border border-red-200 inline-block" />
          Departments with no submitted data
        </span>
      </div>
    </div>
  );
};

export { ExpenditureTable };
export type { DepartmentWithMeta, ClassificationWithItems };
export default ObjectOfExpenditures;