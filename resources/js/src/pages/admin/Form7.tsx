import React from 'react';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { LoadingState } from '../../components/states/LoadingState';
import { cn } from '@/src/lib/utils';
import { useIsMobile } from '@/src/hooks/use-mobile';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import {
  Table,
  TableHeader,
  TableBody,
  TableFooter,
  TableRow,
  TableHead,
  TableCell,
} from '@/src/components/ui/table';
import {
  useForm7GeneralFund,
  useForm7SpecialAccount,
  SPECIAL_ACCOUNT_SOURCES,
  SpecialAccountId,
  Form7Row,
  Form7FeObligation,
  SectionSubtotal,
  Form7Data,
} from '../../hooks/useForm7Queries';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number): string =>
  n === 0 ? '—' : n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtPeso = (n: number): string =>
  '₱\u00A0' + n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

// ─── Column definitions — sector colors unchanged ─────────────────────────────

const COLUMNS = [
  {
    key: 'general_public_services', label: 'General Public Service', col: '(3)',
    thBg: 'bg-blue-50',    thBorder: 'border-blue-200',   thText: 'text-blue-700',
    tdBg: 'bg-blue-50/30', tdBorder: 'border-blue-100',
    subBg: 'bg-blue-50',   subBorder: 'border-blue-200',
    gtBg: 'bg-blue-950/20', gtBorder: 'border-blue-900/40', gtText: 'text-blue-300',
    numText: 'text-blue-400',
  },
  {
    key: 'social_services', label: 'Social Services', col: '(4)',
    thBg: 'bg-pink-50',    thBorder: 'border-pink-200',   thText: 'text-pink-700',
    tdBg: 'bg-pink-50/30', tdBorder: 'border-pink-100',
    subBg: 'bg-pink-50',   subBorder: 'border-pink-200',
    gtBg: 'bg-pink-950/20', gtBorder: 'border-pink-900/40', gtText: 'text-pink-300',
    numText: 'text-pink-400',
  },
  {
    key: 'economic_services', label: 'Economic Services', col: '(5)',
    thBg: 'bg-green-50',    thBorder: 'border-green-200',   thText: 'text-green-700',
    tdBg: 'bg-green-50/30', tdBorder: 'border-green-100',
    subBg: 'bg-green-50',   subBorder: 'border-green-200',
    gtBg: 'bg-green-950/20', gtBorder: 'border-green-900/40', gtText: 'text-green-300',
    numText: 'text-green-400',
  },
  {
    key: 'other_services', label: 'Other Services', col: '(6)',
    thBg: 'bg-gray-100',    thBorder: 'border-gray-200',   thText: 'text-gray-700',
    tdBg: 'bg-gray-50/50',  tdBorder: 'border-gray-200',
    subBg: 'bg-gray-200',   subBorder: 'border-gray-300',
    gtBg: '',               gtBorder: 'border-gray-700',   gtText: 'text-white',
    numText: 'text-gray-400',
  },
  {
    key: 'total', label: 'Total', col: '(7)',
    thBg: 'bg-gray-100',    thBorder: 'border-gray-200',   thText: 'text-gray-700',
    tdBg: 'bg-gray-50/50',  tdBorder: 'border-gray-200',
    subBg: 'bg-gray-200',   subBorder: 'border-gray-300',
    gtBg: '',               gtBorder: 'border-gray-700',   gtText: 'text-white',
    numText: 'text-gray-400',
  },
] as const;

type ColKey = typeof COLUMNS[number]['key'];

interface ColDef {
  key:      ColKey;
  label:    string;
  col:      string;
  thBg:     string;
  thBorder: string;
  thText:   string;
  tdBg:     string;
  tdBorder: string;
  subBg:    string;
  subBorder: string;
  gtBg:     string;
  gtBorder: string;
  gtText:   string;
  numText:  string;
}

const SECTOR_KEYS: ColKey[] = [
  'general_public_services',
  'social_services',
  'economic_services',
  'other_services',
];

// ─── Amount cell ──────────────────────────────────────────────────────────────

const AmountCell: React.FC<{
  value:     number;
  col:       ColDef;
  showPeso?: boolean;
  isBold?:   boolean;
  variant?:  'data' | 'subtotal' | 'grandtotal';
  dimZero?:  boolean;
  forceBlank?: boolean; // renders — regardless of value (for SA sector cols)
}> = ({ value, col, showPeso, isBold, variant = 'data', dimZero = true, forceBlank = false }) => {
  const bg     = variant === 'subtotal'   ? col.subBg
               : variant === 'grandtotal' ? col.gtBg
               : col.tdBg;
  const border = variant === 'subtotal'   ? col.subBorder
               : variant === 'grandtotal' ? col.gtBorder
               : col.tdBorder;
  const text   = variant === 'grandtotal' ? col.gtText
               : isBold                   ? 'text-gray-900'
               : dimZero && value === 0   ? 'text-gray-300'
               : 'text-gray-700';

  const display = forceBlank
    ? <span className="text-gray-300">—</span>
    : showPeso ? fmtPeso(value) : fmt(value);

  return (
    <TableCell className={cn(
      'px-3 py-2 text-right font-mono tabular-nums text-[11px] border-r border-l',
      bg, border, isBold && 'font-bold', text,
    )}>
      {display}
    </TableCell>
  );
};

// ─── Subtotal row ─────────────────────────────────────────────────────────────

const SubtotalRow: React.FC<{
  label:            string;
  subtotal:         SectionSubtotal;
  isSpecialAccount?: boolean;
  columns:          ColDef[];
}> = ({ label, subtotal, isSpecialAccount, columns }) => (
  <TableRow className="border-t-2 border-b border-gray-300 hover:bg-transparent">
    <TableCell className="px-3 py-2.5 text-[10px] text-gray-400 border-r border-gray-200 text-center bg-gray-100" />
    <TableCell className="px-3 py-2.5 font-bold text-[11px] text-gray-800 border-r border-gray-200 pl-4 bg-gray-100">{label}</TableCell>
    <TableCell className="px-3 py-2.5 border-r border-gray-200 bg-gray-100" />
    {columns.map(c => {
      // For SA: sector cols → blank, total col → subtotal.total (from API)
      const isSectorCol = SECTOR_KEYS.includes(c.key as ColKey);
      if (isSpecialAccount && isSectorCol) {
        return (
          <AmountCell
            key={c.key}
            value={0}
            col={c}
            showPeso={false}
            isBold
            variant="subtotal"
            dimZero={false}
            forceBlank
          />
        );
      }
      return (
        <AmountCell
          key={c.key}
          value={subtotal[c.key as ColKey]}
          col={c}
          showPeso
          isBold
          variant="subtotal"
          dimZero={false}
        />
      );
    })}
  </TableRow>
);

// ─── FE rows (General Fund only) ──────────────────────────────────────────────

const FeRows: React.FC<{
  obligations:    Form7FeObligation[];
  isFirstSection: boolean;
}> = ({ obligations, isFirstSection }) => {
  if (!obligations?.length) return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="border-r border-gray-100 px-3 py-2 text-center text-[10px] text-gray-300" />
      <TableCell colSpan={2 + COLUMNS.length} className="px-3 py-2 text-[11px] text-gray-300 italic pl-8">No data</TableCell>
    </TableRow>
  );
  let firstSeen = false;
  return (
    <>
      {obligations.map((ob, oIdx) => {
        const label          = ob.purpose ? `${ob.creditor} (${ob.purpose})` : ob.creditor;
        const isPrincipalFirst = !firstSeen;
        if (!firstSeen) firstSeen = true;
        return (
          <React.Fragment key={oIdx}>
            <TableRow className="border-b border-gray-50 hover:bg-transparent">
              <TableCell className="border-r border-gray-100 px-3 py-1.5 text-center text-[10px] text-gray-300 font-mono">{oIdx + 1}</TableCell>
              <TableCell colSpan={2 + COLUMNS.length} className="border-r border-gray-100 px-3 py-1.5 text-gray-800 font-medium text-[11px] pl-8">{label}</TableCell>
            </TableRow>
            <TableRow className="border-b border-gray-50 hover:bg-transparent">
              <TableCell className="border-r border-gray-100 px-3 py-1.5" />
              <TableCell className="border-r border-gray-100 px-3 py-1.5 text-gray-500 text-[11px] pl-16 italic">Principal</TableCell>
              <TableCell className="border-r border-gray-100 px-3 py-1.5" />
              {COLUMNS.map(c => {
                const val = c.key === 'general_public_services' ? ob.principal
                          : c.key === 'total'                   ? ob.principal
                          : 0;
                return <AmountCell key={c.key} value={val} col={c} showPeso={isPrincipalFirst && isFirstSection} variant="data" />;
              })}
            </TableRow>
            <TableRow className="border-b border-gray-50 hover:bg-transparent">
              <TableCell className="border-r border-gray-100 px-3 py-1.5" />
              <TableCell className="border-r border-gray-100 px-3 py-1.5 text-gray-500 text-[11px] pl-16 italic">Interest</TableCell>
              <TableCell className="border-r border-gray-100 px-3 py-1.5" />
              {COLUMNS.map(c => {
                const val = c.key === 'general_public_services' ? ob.interest
                          : c.key === 'total'                   ? ob.interest
                          : 0;
                return <AmountCell key={c.key} value={val} col={c} showPeso={false} variant="data" />;
              })}
            </TableRow>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ─── Mobile row card (used instead of the wide table row on small screens) ────

const MobileRowCard: React.FC<{
  label:            string;
  code?:            string | null;
  index:            number;
  isSpecialAccount?: boolean;
  columns:          ColDef[];
  getValue:         (key: ColKey) => number;
  showPeso?:        boolean;
  variant?:         'data' | 'subtotal' | 'grandtotal';
  isItalic?:        boolean;
}> = ({ label, code, index, isSpecialAccount, columns, getValue, showPeso, variant = 'data', isItalic }) => {
  const isSub   = variant === 'subtotal';
  const isGrand = variant === 'grandtotal';

  return (
    <div
      className={cn(
        'rounded-lg border px-3 py-2.5',
        isGrand ? 'bg-gray-900 border-gray-700'
        : isSub ? 'bg-gray-50 border-gray-200'
        : 'bg-white border-gray-100',
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className={cn(
            'text-[11px] leading-snug truncate',
            isGrand ? 'font-bold text-white uppercase tracking-widest text-[10px]'
            : isSub ? 'font-bold text-gray-800'
            : isItalic ? 'text-gray-500 italic'
            : 'text-gray-800 font-medium',
          )}>
            {label}
          </p>
        </div>
        {!isSub && !isGrand && (
          <span className="text-[9px] text-gray-300 font-mono flex-shrink-0">{code || index + 1}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5">
        {columns.map(c => {
          const isSectorCol = SECTOR_KEYS.includes(c.key as ColKey);
          const blank = isSpecialAccount && isSectorCol;
          const val = blank ? 0 : getValue(c.key as ColKey);

          const bg   = isGrand ? c.gtBg   : isSub ? c.subBg   : c.tdBg;
          const bd   = isGrand ? c.gtBorder : isSub ? c.subBorder : c.tdBorder;
          const text = isGrand ? c.gtText : 'text-gray-800';

          return (
            <div key={c.key} className={cn('rounded-md border px-2 py-1.5', bg, bd)}>
              <p className={cn(
                'text-[9px] mb-0.5 truncate',
                isGrand ? 'opacity-70' : c.thText,
              )}>
                {isSpecialAccount && c.key === 'total' ? 'Total' : c.label}
              </p>
              <p className={cn('text-[11px] font-mono tabular-nums text-right', text, (isSub || isGrand) && 'font-bold')}>
                {blank ? <span className="text-gray-300">—</span> : (showPeso ? fmtPeso(val) : fmt(val))}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ─── Standard rows ────────────────────────────────────────────────────────────

const StandardRows: React.FC<{
  rows:              Form7Row[];
  isSpecialAccount?: boolean;
  columns:           ColDef[];
}> = ({ rows, isSpecialAccount, columns }) => {
  if (!rows.length) return (
    <TableRow className="hover:bg-transparent">
      <TableCell className="border-r border-gray-100 px-3 py-2 text-center text-[10px] text-gray-300" />
      <TableCell colSpan={2 + COLUMNS.length} className="px-3 py-2 text-[11px] text-gray-300 italic pl-8">No data</TableCell>
    </TableRow>
  );
  return (
    <>
      {rows.map((row, rIdx) => (
        <TableRow key={rIdx} className="hover:bg-gray-50/40 border-b border-gray-50">
          <TableCell className="border-r border-gray-100 px-3 py-2 text-center text-[10px] text-gray-300 font-mono">{rIdx + 1}</TableCell>
          <TableCell className={cn(
            'border-r border-gray-100 px-3 py-2 text-gray-800 text-[11px]',
            row.item_name === 'Interest' ? 'pl-16 text-gray-500 italic' : 'pl-8',
          )}>{row.item_name}</TableCell>
          <TableCell className="border-r border-gray-100 px-3 py-2 text-center font-mono text-gray-400 text-[10px]">{row.account_code || '—'}</TableCell>
          {columns.map(c => {
            const isSectorCol = SECTOR_KEYS.includes(c.key as ColKey);

            // Special Account tabs:
            //   sector cols  → always blank (—), the API spreads SA amounts
            //                  across sectors which is meaningless here
            //   total col    → row.total = the actual SA item expenditure
            //                  directly from the API (NOT a sum of sectors)
            if (isSpecialAccount && isSectorCol) {
              return (
                <AmountCell
                  key={c.key}
                  value={0}
                  col={c}
                  showPeso={false}
                  variant="data"
                  forceBlank
                />
              );
            }

            return (
              <AmountCell
                key={c.key}
                value={row[c.key as ColKey]}
                col={c}
                showPeso={rIdx === 0 && c.key === 'total' ? true : rIdx === 0 && !isSpecialAccount}
                variant="data"
              />
            );
          })}
        </TableRow>
      ))}
    </>
  );
};

// ─── Shared table ─────────────────────────────────────────────────────────────

function Form7Table({
  data,
  isSpecialAccount = false,
  saLabel,
}: {
  data:              Form7Data;
  isSpecialAccount?: boolean;
  saLabel?:          string;
}) {
  const isMobile   = useIsMobile();
  const sections   = data.sections.sections    ?? [];
  const grandTotal = data.sections.grand_total ?? null;

  // On Special Account tabs, the sector columns are meaningless and the Total
  // column becomes the star of the table — give it the gold accent that
  // Other Services normally carries, so it stands out from the rest.
  const goldAccent: Pick<ColDef, 'thBg' | 'thBorder' | 'thText' | 'tdBg' | 'tdBorder' | 'subBg' | 'subBorder' | 'gtBg' | 'gtBorder' | 'gtText' | 'numText'> = {
    thBg: 'bg-amber-50',    thBorder: 'border-amber-200',   thText: 'text-amber-700',
    tdBg: 'bg-amber-50/30', tdBorder: 'border-amber-100',
    subBg: 'bg-amber-50',   subBorder: 'border-amber-200',
    gtBg: 'bg-amber-950/20', gtBorder: 'border-amber-900/40', gtText: 'text-amber-300',
    numText: 'text-amber-400',
  };
  const columns: ColDef[] = isSpecialAccount
    ? COLUMNS.map((c): ColDef =>
        c.key === 'total' ? { ...c, ...goldAccent } : c
      )
    : [...COLUMNS];

  if (isMobile) {
    return (
      <div className="space-y-4">
        {sections.map(section => (
          <div key={section.section_code}>
            <p className="text-[11px] font-semibold text-gray-900 uppercase tracking-wide mb-2 px-1">
              {section.section_label}
            </p>
            <div className="space-y-2">
              {section.rows.length === 0 ? (
                <p className="text-[11px] text-gray-300 italic px-1">No data</p>
              ) : (
                section.rows.map((row, rIdx) => (
                  <MobileRowCard
                    key={rIdx}
                    label={row.item_name}
                    code={row.account_code}
                    index={rIdx}
                    isSpecialAccount={isSpecialAccount}
                    columns={columns}
                    getValue={(key) => row[key]}
                    showPeso={rIdx === 0}
                    isItalic={row.item_name === 'Interest'}
                  />
                ))
              )}
              <MobileRowCard
                label={`Total ${section.section_code}`}
                index={-1}
                isSpecialAccount={isSpecialAccount}
                columns={columns}
                getValue={(key) => section.subtotal[key]}
                showPeso
                variant="subtotal"
              />
            </div>
          </div>
        ))}

        {grandTotal && (
          <MobileRowCard
            label="Grand Total"
            index={-1}
            isSpecialAccount={isSpecialAccount}
            columns={columns}
            getValue={(key) => grandTotal[key]}
            showPeso
            variant="grandtotal"
          />
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-auto max-h-[72vh]">
        <Table className="w-full text-[11px] border-separate border-spacing-0">
          <TableHeader className="sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.08),0_2px_4px_-2px_rgba(0,0,0,0.08)]">
            <TableRow className="hover:bg-transparent">
              <TableHead className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wide w-8 h-auto">#</TableHead>
              <TableHead className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wide min-w-[280px] h-auto">Particulars</TableHead>
              <TableHead className="border-b border-r border-gray-200 bg-white px-3 py-2.5 text-center font-semibold text-gray-600 text-[10px] uppercase tracking-wide w-28 h-auto">Account Code</TableHead>
              {columns.map(c => (
                <TableHead
                  key={c.key}
                  className={cn(
                    'border-b border-r border-l px-3 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wide w-36 h-auto',
                    c.thBg, c.thBorder, c.thText,
                  )}
                >
                  {isSpecialAccount && c.key === 'total'
                    ? `${saLabel} Total`
                    : c.label}
                </TableHead>
              ))}
            </TableRow>
            <TableRow className="hover:bg-transparent">
              <TableCell className="border-b-2 border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300" />
              <TableCell className="border-b-2 border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(1)</TableCell>
              <TableCell className="border-b-2 border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(2)</TableCell>
              {columns.map(c => (
                <TableCell key={c.key} className={cn('border-b-2 border-r border-l px-3 py-1 text-center text-[10px]', c.thBg, c.thBorder, c.numText)}>
                  {c.col}
                </TableCell>
              ))}
            </TableRow>
          </TableHeader>

          <TableBody>
            {sections.map((section, sIdx) => (
              <React.Fragment key={section.section_code}>
                <TableRow className="bg-gray-50/80 border-t border-b border-gray-200 hover:bg-gray-50/80">
                  <TableCell className="border-r border-gray-200 px-3 py-2.5 text-center text-[10px] text-gray-400" />
                  <TableCell colSpan={2 + COLUMNS.length} className="px-3 py-2.5 font-semibold text-gray-900 text-[11px] uppercase tracking-wide">
                    {section.section_label}
                  </TableCell>
                </TableRow>

                <StandardRows rows={section.rows} isSpecialAccount={isSpecialAccount} columns={columns} />

                <SubtotalRow
                  label={`Total ${section.section_code}`}
                  subtotal={section.subtotal}
                  isSpecialAccount={isSpecialAccount}
                  columns={columns}
                />


              </React.Fragment>
            ))}
          </TableBody>

          {grandTotal && (
            <TableFooter>
              <TableRow className="bg-gray-900 text-white hover:bg-gray-900">
                <TableCell className="px-3 py-3 border-r border-gray-700" />
                <TableCell colSpan={2} className="px-3 py-3 font-bold text-[11px] uppercase tracking-widest text-gray-300 border-r border-gray-700">
                  Grand Total
                </TableCell>
                {columns.map(c => {
                  const isSectorCol = SECTOR_KEYS.includes(c.key as ColKey);
                  // SA grand total: sector cols blank, total col = grandTotal.total
                  if (isSpecialAccount && isSectorCol) {
                    return (
                      <AmountCell
                        key={c.key}
                        value={0}
                        col={c}
                        showPeso={false}
                        isBold
                        variant="grandtotal"
                        dimZero={false}
                        forceBlank
                      />
                    );
                  }
                  return (
                    <AmountCell
                      key={c.key}
                      value={grandTotal[c.key as ColKey]}
                      col={c}
                      showPeso
                      isBold
                      variant="grandtotal"
                      dimZero={false}
                    />
                  );
                })}
              </TableRow>
            </TableFooter>
          )}
        </Table>
      </div>
    </div>
  );
}

// ─── Special Account Tab ──────────────────────────────────────────────────────

function SpecialAccountTab({
  source, label, planId,
}: { source: SpecialAccountId; label: string; planId: number }) {
  const { data, isLoading, isError } = useForm7SpecialAccount(source, planId);

  if (isLoading) return <LoadingState />;
  if (isError || !data) return (
    <div className="flex items-center justify-center h-40">
      <p className="text-red-500 text-sm">Failed to load {label} data.</p>
    </div>
  );

  return (
    <>
      <Form7Table data={data} isSpecialAccount saLabel={label} />
      <div className="mt-3 text-[11px] text-gray-400">
        Sector columns (General Public Service / Social Services / Economic Services / Other Services)
        are not applicable for Special Accounts — expenditures are shown in the <strong>Total</strong> column only.
      </div>
    </>
  );
}

// ─── Legend ───────────────────────────────────────────────────────────────────

function Legend() {
  return (
    <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
      {COLUMNS.filter(c => c.key !== 'total').map(c => (
        <span key={c.key} className="flex items-center gap-1.5">
          <span className={cn('w-2.5 h-2.5 rounded-sm inline-block border', c.thBg, c.thBorder)} />
          <span className={cn('font-semibold', c.thText)}>{c.label}</span>
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="w-2.5 h-2.5 rounded-sm bg-gray-100 border border-gray-200 inline-block" />
        <span className="text-gray-500 font-semibold">Total</span> = sum of all sectors
      </span>
      <span className="flex items-center gap-1.5">
        <span className="font-mono text-gray-300 text-[11px]">—</span>
        Zero / no data
      </span>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const Form7: React.FC = () => {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const planId = activePlan?.budget_plan_id;

  const { data: gfData, isLoading: gfLoading, isError: gfError } = useForm7GeneralFund(planId);

  if (planLoading || gfLoading) return <LoadingState />;

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm">No active budget plan found.</p>
          <p className="text-gray-400 text-xs">Activate a budget plan to view Form 7.</p>
        </div>
      </div>
    );
  }

  if (gfError || !gfData) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-red-500 text-sm">Failed to load Form 7 data.</p>
      </div>
    );
  }

  const budgetYear = activePlan.year ?? new Date().getFullYear();

  return (
    <div className="p-4 sm:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form No. 7</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-gray-400">FY {budgetYear}</span>
        </div>
        <h1 className="text-lg sm:text-2xl font-semibold text-zinc-900 tracking-tight leading-snug">
          Statement of Fund Allocation by Sector CY {budgetYear}
        </h1>
        <p className="text-[12px] text-gray-500 mt-0.5">LGU : OPOL, MISAMIS ORIENTAL</p>
      </div>

      <Tabs defaultValue="general-fund" className="w-full">
        <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5 w-full overflow-x-auto flex-nowrap justify-start">
          <TabsTrigger
            value="general-fund"
            className="text-xs px-4 rounded-md data-[state=active]:!bg-gray-900 data-[state=active]:!text-white data-[state=active]:!shadow-sm text-gray-500"
          >
            General Fund
          </TabsTrigger>
          {SPECIAL_ACCOUNT_SOURCES.map(sa => (
            <TabsTrigger
              key={sa.id}
              value={sa.id}
              className="text-xs px-4 rounded-md data-[state=active]:!bg-gray-900 data-[state=active]:!text-white data-[state=active]:!shadow-sm text-gray-500"
            >
              {sa.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="general-fund" className="mt-0">
          <Form7Table data={gfData} />
          <Legend />
        </TabsContent>

        {SPECIAL_ACCOUNT_SOURCES.map(sa => (
          <TabsContent key={sa.id} value={sa.id} className="mt-0">
            <SpecialAccountTab source={sa.id} label={sa.label} planId={planId!} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default Form7;
