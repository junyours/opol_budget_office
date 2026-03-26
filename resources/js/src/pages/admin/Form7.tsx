import React from 'react';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { LoadingState } from '../common/LoadingState';
import { cn } from '@/src/lib/utils';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
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
  n === 0 ? '—' : Math.round(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });

const fmtPeso = (n: number): string =>
  '₱\u00A0' + Math.round(n).toLocaleString('en-PH', { maximumFractionDigits: 0 });

// ─── Column definitions ───────────────────────────────────────────────────────

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
    thBg: 'bg-green-50',    thBorder: 'border-green-200',   thText: 'text-green-700',
    tdBg: 'bg-green-50/30', tdBorder: 'border-green-100',
    subBg: 'bg-green-50',   subBorder: 'border-green-200',
    gtBg: 'bg-green-950/20', gtBorder: 'border-green-900/40', gtText: 'text-green-300',
    numText: 'text-green-400',
  },
  {
    key: 'economic_services', label: 'Economic Services', col: '(5)',
    thBg: 'bg-amber-50',    thBorder: 'border-amber-200',   thText: 'text-amber-700',
    tdBg: 'bg-amber-50/30', tdBorder: 'border-amber-100',
    subBg: 'bg-amber-50',   subBorder: 'border-amber-200',
    gtBg: 'bg-amber-950/20', gtBorder: 'border-amber-900/40', gtText: 'text-amber-300',
    numText: 'text-amber-400',
  },
  {
    key: 'other_services', label: 'Other Services', col: '(6)',
    thBg: 'bg-rose-50',    thBorder: 'border-rose-200',   thText: 'text-rose-700',
    tdBg: 'bg-rose-50/30', tdBorder: 'border-rose-100',
    subBg: 'bg-rose-50',   subBorder: 'border-rose-200',
    gtBg: 'bg-rose-950/20', gtBorder: 'border-rose-900/40', gtText: 'text-rose-300',
    numText: 'text-rose-400',
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
type ColDef = typeof COLUMNS[number];

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
    <td className={cn(
      'px-3 py-2 text-right font-mono tabular-nums text-[11px] border-r border-l',
      bg, border, isBold && 'font-bold', text,
    )}>
      {display}
    </td>
  );
};

// ─── Subtotal row ─────────────────────────────────────────────────────────────

const SubtotalRow: React.FC<{
  label:            string;
  subtotal:         SectionSubtotal;
  isSpecialAccount?: boolean;
}> = ({ label, subtotal, isSpecialAccount }) => (
  <tr className="border-t-2 border-b border-gray-300">
    <td className="px-3 py-2.5 text-[10px] text-gray-400 border-r border-gray-200 text-center bg-gray-100" />
    <td className="px-3 py-2.5 font-bold text-[11px] text-gray-800 border-r border-gray-200 pl-4 bg-gray-100">{label}</td>
    <td className="px-3 py-2.5 border-r border-gray-200 bg-gray-100" />
    {COLUMNS.map(c => {
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
  </tr>
);

// ─── FE rows (General Fund only) ──────────────────────────────────────────────

const FeRows: React.FC<{
  obligations:    Form7FeObligation[];
  isFirstSection: boolean;
}> = ({ obligations, isFirstSection }) => {
  if (!obligations?.length) return (
    <tr>
      <td className="border-r border-gray-100 px-3 py-2 text-center text-[10px] text-gray-300" />
      <td colSpan={2 + COLUMNS.length} className="px-3 py-2 text-[11px] text-gray-300 italic pl-8">No data</td>
    </tr>
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
            <tr className="border-b border-gray-50">
              <td className="border-r border-gray-100 px-3 py-1.5 text-center text-[10px] text-gray-300 font-mono">{oIdx + 1}</td>
              <td colSpan={2 + COLUMNS.length} className="border-r border-gray-100 px-3 py-1.5 text-gray-800 font-medium text-[11px] pl-8">{label}</td>
            </tr>
            <tr className="border-b border-gray-50">
              <td className="border-r border-gray-100 px-3 py-1.5" />
              <td className="border-r border-gray-100 px-3 py-1.5 text-gray-500 text-[11px] pl-16 italic">Principal</td>
              <td className="border-r border-gray-100 px-3 py-1.5" />
              {COLUMNS.map(c => {
                const val = c.key === 'general_public_services' ? ob.principal
                          : c.key === 'total'                   ? ob.principal
                          : 0;
                return <AmountCell key={c.key} value={val} col={c} showPeso={isPrincipalFirst && isFirstSection} variant="data" />;
              })}
            </tr>
            <tr className="border-b border-gray-50">
              <td className="border-r border-gray-100 px-3 py-1.5" />
              <td className="border-r border-gray-100 px-3 py-1.5 text-gray-500 text-[11px] pl-16 italic">Interest</td>
              <td className="border-r border-gray-100 px-3 py-1.5" />
              {COLUMNS.map(c => {
                const val = c.key === 'general_public_services' ? ob.interest
                          : c.key === 'total'                   ? ob.interest
                          : 0;
                return <AmountCell key={c.key} value={val} col={c} showPeso={false} variant="data" />;
              })}
            </tr>
          </React.Fragment>
        );
      })}
    </>
  );
};

// ─── Standard rows ────────────────────────────────────────────────────────────

const StandardRows: React.FC<{
  rows:              Form7Row[];
  isSpecialAccount?: boolean;
}> = ({ rows, isSpecialAccount }) => {
  if (!rows.length) return (
    <tr>
      <td className="border-r border-gray-100 px-3 py-2 text-center text-[10px] text-gray-300" />
      <td colSpan={2 + COLUMNS.length} className="px-3 py-2 text-[11px] text-gray-300 italic pl-8">No data</td>
    </tr>
  );
  return (
    <>
      {rows.map((row, rIdx) => (
        <tr key={rIdx} className="hover:bg-gray-50/40 border-b border-gray-50">
          <td className="border-r border-gray-100 px-3 py-2 text-center text-[10px] text-gray-300 font-mono">{rIdx + 1}</td>
          <td className="border-r border-gray-100 px-3 py-2 text-gray-800 pl-8 text-[11px]">{row.item_name}</td>
          <td className="border-r border-gray-100 px-3 py-2 text-center font-mono text-gray-400 text-[10px]">{row.account_code || '—'}</td>
          {COLUMNS.map(c => {
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
        </tr>
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
  const sections   = data.sections.sections    ?? [];
  const grandTotal = data.sections.grand_total ?? null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="border-r border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wide w-8">#</th>
              <th className="border-r border-gray-200 bg-white px-3 py-2.5 text-left font-semibold text-gray-600 text-[10px] uppercase tracking-wide min-w-[280px]">Particulars</th>
              <th className="border-r border-gray-200 bg-white px-3 py-2.5 text-center font-semibold text-gray-600 text-[10px] uppercase tracking-wide w-28">Account Code</th>
              {COLUMNS.map(c => (
                <th
                  key={c.key}
                  className={cn(
                    'border-r border-l px-3 py-2.5 text-center font-semibold text-[10px] uppercase tracking-wide w-36',
                    c.thBg, c.thBorder, c.thText,
                  )}
                >
                  {isSpecialAccount && c.key === 'total'
                    ? `${saLabel} Total`
                    : c.label}
                </th>
              ))}
            </tr>
            <tr className="border-b-2 border-gray-200">
              <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300" />
              <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(1)</td>
              <td className="border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300">(2)</td>
              {COLUMNS.map(c => (
                <td key={c.key} className={cn('border-r border-l px-3 py-1 text-center text-[10px]', c.thBg, c.thBorder, c.numText)}>
                  {c.col}
                </td>
              ))}
            </tr>
          </thead>

          <tbody>
            {sections.map((section, sIdx) => {
              const isFe = section.section_code === 'FE';
              return (
                <React.Fragment key={section.section_code}>
                  <tr className="bg-gray-50/80 border-t border-b border-gray-200">
                    <td className="border-r border-gray-200 px-3 py-2.5 text-center text-[10px] text-gray-400" />
                    <td colSpan={2 + COLUMNS.length} className="px-3 py-2.5 font-semibold text-gray-900 text-[11px] uppercase tracking-wide">
                      {section.section_label}
                    </td>
                  </tr>

                  {isFe && !isSpecialAccount ? (
                    <FeRows obligations={section.obligations ?? []} isFirstSection={sIdx === 0} />
                  ) : (
                    <StandardRows rows={section.rows} isSpecialAccount={isSpecialAccount} />
                  )}

                  <SubtotalRow
                    label={`Total ${section.section_code}`}
                    subtotal={section.subtotal}
                    isSpecialAccount={isSpecialAccount}
                  />

                  {sIdx < sections.length - 1 && (
                    <tr className="h-2 bg-white"><td colSpan={3 + COLUMNS.length} /></tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>

          {grandTotal && (
            <tfoot>
              <tr className="bg-gray-900 text-white">
                <td className="px-3 py-3 border-r border-gray-700" />
                <td colSpan={2} className="px-3 py-3 font-bold text-[11px] uppercase tracking-widest text-gray-300 border-r border-gray-700">
                  Grand Total
                </td>
                {COLUMNS.map(c => {
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
              </tr>
            </tfoot>
          )}
        </table>
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
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">LBP Form No. 7</span>
          <span className="text-gray-300 text-[10px]">·</span>
          <span className="text-[10px] font-medium text-gray-400">FY {budgetYear}</span>
        </div>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">
          Statement of Fund Allocation by Sector CY {budgetYear}
        </h1>
        <p className="text-[12px] text-gray-500 mt-0.5">LGU : OPOL, MISAMIS ORIENTAL</p>
      </div>

      <Tabs defaultValue="general-fund" className="w-full">
        <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5">
          <TabsTrigger
            value="general-fund"
            className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500"
          >
            General Fund
          </TabsTrigger>
          {SPECIAL_ACCOUNT_SOURCES.map(sa => (
            <TabsTrigger
              key={sa.id}
              value={sa.id}
              className="text-xs px-4 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-gray-900 text-gray-500"
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