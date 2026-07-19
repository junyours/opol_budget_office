import React, { useState, useEffect, useMemo, useCallback } from 'react';
import API from '../../services/api';
import { useQuery } from '@tanstack/react-query';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { useGetIncomeFundTotals } from '../../hooks/useGetTotalAmount';
import { LoadingState } from '../../components/states/LoadingState';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/src/components/ui/tabs';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TabSource {
  id:    string;
  label: string;
  type:  'general' | 'special';
}

interface Form6Row {
  form6_template_id: number;
  form6_item_id:     number | null;
  budget_plan_id:    number;
  source:            string;
  code:              string;
  label:             string;
  parent_code:       string | null;
  sort_order:        number;
  show_peso_sign:    boolean;
  is_section:        boolean;
  is_computed:       boolean;
  level:             number;
  amount:            number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
  n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const toRows = (raw: unknown): Form6Row[] =>
  Array.isArray(raw) ? (raw as Form6Row[]) : [];

// ─── Derived-from-table codes ─────────────────────────────────────────────────

const PS_DERIVED_CODES = new Set(['1.1', '1.2', '1.3', '1.5', '1.6', '1.7', '1.8']);

// const INCOME_DERIVED_CODES = new Set([
//   '2.1', '2.1.1', '2.1.2',
//   '2.2', '2.2.1', '2.2.2',
//   '2.3',
// ]);

const INCOME_DERIVED_CODES = new Set([
  '2.1.1', '2.1.2',
  '2.2.1', '2.2.2',
  '2.3',
]);

const FORCE_PESO_SIGN = new Set(['2.1', '2.2']);

const isExternallyDerived = (code: string) =>
  PS_DERIVED_CODES.has(code) || INCOME_DERIVED_CODES.has(code);

// ─── Root component ───────────────────────────────────────────────────────────

const Form6: React.FC = () => {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();

  const [activeSource, setActiveSource] = useState<string>('general-fund');

  const { data: tabs = [{ id: 'general-fund', label: 'General Fund', type: 'general' as const }], isLoading: tabsLoading } = useQuery<TabSource[]>({
    queryKey: ['form6-special-sources'],
    queryFn: async () => {
      try {
        const res = await API.get('/form6-special/sources');
        const specials: TabSource[] = (res.data?.data ?? []).map((s: { id: string; label: string }) => ({
          id: s.id, label: s.label, type: 'special' as const,
        }));
        return [{ id: 'general-fund', label: 'General Fund', type: 'general' as const }, ...specials];
      } catch {
        return [{ id: 'general-fund', label: 'General Fund', type: 'general' as const }];
      }
    },
  });

  // Income-fund derived — only used for general-fund
  const {
    data:    derivedData,
    loading: derivedLoading,
    refetch: refetchDerived,
  } = useGetIncomeFundTotals({
    budgetPlanId: activePlan?.budget_plan_id ?? null,
    enabled:      !!activePlan,
  });

// ── Fetch + sync rows for one source ────────────────────────────────────────
  // Sync (from PS / other sources) now lives inside the query itself, so it
  // runs automatically the first time a given source's query actually
  // executes — on initial mount, on switching to a not-yet-cached tab, or
  // after an explicit refetch / page reload. React Query's cache (staleTime +
  // refetchOnMount: false, set globally in App.tsx) is what prevents it from
  // re-running on every subsequent mount/tab-revisit within that window.

  const fetchForm6Rows = useCallback(async (source: string, planId: number): Promise<Form6Row[]> => {
    const endpoint = source === 'general-fund' ? '/form6' : '/form6-special';

    // Ensure template rows exist (one-time init on first-ever access).
    const initial      = await API.get(endpoint, { params: { budget_plan_id: planId, source } });
    const recordsExist = initial.data?.records_exist ?? toRows(initial.data?.data).length > 0;

    if (!recordsExist) {
      await API.post(`${endpoint}/init`, { budget_plan_id: planId, source });
    }

    // Sync from PS / other sources, then read back the final rows.
    await API.post(`${endpoint}/sync-from-ps`, { budget_plan_id: planId, source });
    const otherRes = await API.post(`${endpoint}/sync-from-other`, { budget_plan_id: planId, source });
    (otherRes.data?.warnings ?? []).forEach((w: string) => toast.warning(w));

    const final = await API.get(endpoint, { params: { budget_plan_id: planId, source } });
    return toRows(final.data?.data);
  }, []);

  const {
    data: activeRows = [],
    isLoading: activeRowsLoading,
    dataUpdatedAt: activeRowsUpdatedAt,
  } = useQuery<Form6Row[]>({
    queryKey: ['form6-rows', activeSource, activePlan?.budget_plan_id],
    queryFn:  () => fetchForm6Rows(activeSource, activePlan!.budget_plan_id),
    enabled:  !!activePlan && !!activeSource,
  });

  // Whenever the general-fund rows are (re)synced, refresh the income-fund-derived totals too.
  useEffect(() => {
    if (activeSource === 'general-fund' && activeRowsUpdatedAt) {
      refetchDerived();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeRowsUpdatedAt, activeSource]);

 // ── Guards ─────────────────────────────────────────────────────────────────

  if (planLoading || tabsLoading) return <LoadingState />;

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center space-y-2">
          <p className="text-gray-500 text-sm">No active budget plan found.</p>
          <p className="text-gray-400 text-xs">Activate a budget plan to manage Form 6 data.</p>
        </div>
      </div>
    );
  }

  const budgetYear  = activePlan.year ?? new Date().getFullYear();
  const isMultiTab  = tabs.length > 1;

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 sm:p-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
              LBP Form No. 6
            </span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] font-medium text-gray-400">FY {budgetYear}</span>
          </div>
          <h1 className="text-lg sm:text-2xl font-semibold text-zinc-900 tracking-tight leading-snug">
            Statement of Statutory and Contractual Obligations and Budgetary Requirements
          </h1>
          <p className="text-[12px] text-gray-500 mt-0.5">LGU : OPOL, MISAMIS ORIENTAL</p>
        </div>

        </div>

      {/* ── Single-tab (no special accounts) ── */}
      {!isMultiTab ? (
        <Form6Panel
          source="general-fund"
          rows={activeRows}
          loading={activeRowsLoading}
          budgetYear={budgetYear}
          derivedData={derivedData}
          derivedLoading={derivedLoading}
        />
      ) : (
        /* ── Multi-tab ── */
        <Tabs value={activeSource} onValueChange={setActiveSource}>
          <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5 w-full overflow-x-auto flex-nowrap justify-start">
            {tabs.map(tab => (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className="text-xs px-4 rounded-md data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-white text-gray-500 hover:text-gray-700"
              >
                {tab.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {tabs.map(tab => (
            <TabsContent key={tab.id} value={tab.id}>
              <Form6Panel
                source={tab.id}
                sourceLabel={tab.type === 'special' ? tab.label : undefined}
                rows={tab.id === activeSource ? activeRows : []}
                loading={tab.id === activeSource ? activeRowsLoading : true}
                budgetYear={budgetYear}
                derivedData={tab.id === 'general-fund' ? derivedData : null}
                derivedLoading={tab.id === 'general-fund' ? derivedLoading : false}
                isMultiTab
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

// ─── Form6Panel ───────────────────────────────────────────────────────────────

interface IncomeFundDerivedData {
  ldf20:          { amount: number };
  infraProgram:   { amount: number };
  debtServices:   { amount: number };
  ldrrmf5:        { amount: number };
  qrf30:          { amount: number };
  pda70:          { amount: number };
  aidToBarangays: { amount: number };
}

interface Form6PanelProps {
  source:         string;
  sourceLabel?:   string;
  rows:           Form6Row[];
  loading:        boolean;
  budgetYear:     number;
  derivedData:    IncomeFundDerivedData | null;
  derivedLoading: boolean;
  /** True when rendered inside the multi-tab (special accounts) layout — controls whether the period sub-header shows. */
  isMultiTab?:    boolean;
}

const Form6Panel: React.FC<Form6PanelProps> = ({
  source, sourceLabel, rows, loading,
  budgetYear, derivedData, derivedLoading, isMultiTab = false,
}) => {

//   const getDerivedAmount = useCallback(
//     (code: string, fallback: number): number => {
//       if (!derivedData) return fallback;
//       switch (code) {
//         case '2.1':   return derivedData.ldf20.amount;
//         case '2.1.1': return derivedData.infraProgram.amount;
//         case '2.1.2': return derivedData.debtServices.amount;
//         case '2.2':   return derivedData.ldrrmf5.amount;
const getDerivedAmount = useCallback(
    (code: string, fallback: number): number => {
      switch (code) {
        case '2.1.1': return fallback; // stored in DB after sync
        case '2.1.2': return fallback; // stored in DB after sync
        case '2.2.1': return derivedData?.qrf30.amount        ?? fallback;
        case '2.2.2': return derivedData?.pda70.amount        ?? fallback;
        case '2.3':   return derivedData?.aidToBarangays.amount ?? fallback;
        default:      return fallback;
      }
    },
    [derivedData],
  );

  const computedAmounts = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach(r => {
      if (!r.is_computed) return;
      if (INCOME_DERIVED_CODES.has(r.code)) {
        map.set(r.code, getDerivedAmount(r.code, r.amount));
        return;
      }
      const children = rows.filter(c => c.parent_code === r.code);
      const sum = children.reduce((acc, c) => {
        const childAmt = INCOME_DERIVED_CODES.has(c.code)
          ? getDerivedAmount(c.code, c.amount)
          : c.is_computed
            ? (map.get(c.code) ?? c.amount)
            : c.amount;
        return acc + childAmt;
      }, 0);
      map.set(r.code, sum);
    });
    return map;
  }, [rows, getDerivedAmount]);

  const getAmount = useCallback(
    (r: Form6Row): number => {
      if (INCOME_DERIVED_CODES.has(r.code)) return getDerivedAmount(r.code, r.amount);
      if (r.is_computed) return computedAmounts.get(r.code) ?? r.amount;
      return r.amount;
    },
    [computedAmounts, getDerivedAmount],
  );

//   const grandTotal = useMemo(() => {
//     const childCodes = new Set(rows.map(r => r.parent_code).filter(Boolean));
//     return rows.reduce((sum, r) => {
//       if (r.is_section) return sum;
//       const hasChildren = childCodes.has(r.code);
//       if (INCOME_DERIVED_CODES.has(r.code)) {
//         const parentIsDerived = r.parent_code ? INCOME_DERIVED_CODES.has(r.parent_code) : false;
//         return parentIsDerived ? sum : sum + getAmount(r);
//       }
//       if (!hasChildren) return sum + getAmount(r);
//       return sum;
//     }, 0);
//   }, [rows, getAmount]);

const grandTotal = useMemo(() => {
    const childCodes = new Set(rows.map(r => r.parent_code).filter(Boolean));
    return rows.reduce((sum, r) => {
      if (r.is_section) return sum;
      // Skip parent rows that have children — only sum leaf nodes
      if (childCodes.has(r.code)) return sum;
      return sum + getAmount(r);
    }, 0);
  }, [rows, getAmount]);

  if (loading) return <LoadingState />;

  return (
    <div>
      {/* Sub-header — shown for special accounts, or whenever there's a tab bar */}
      {(sourceLabel || isMultiTab) && (
        <div className="mb-4">
          {sourceLabel && (
            <p className="text-[11px] font-bold uppercase tracking-widest text-red-500">
              Special Account — {sourceLabel.toUpperCase()}
            </p>
          )}
          <p className="text-[11px] text-gray-400">
            January to December {budgetYear} · Municipality of Opol, Misamis Oriental
          </p>
        </div>
      )}

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-[12px] border-collapse">
          <thead>
            <tr>
              <th className="hidden sm:table-cell border-b border-r border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-8">#</th>
              <th className="border-b border-r border-gray-200 bg-white px-3 sm:px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Object of Expenditures</th>
              <th className="border-b border-gray-200 bg-white px-3 sm:px-4 py-2.5 text-right font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-28 sm:w-44">Amount</th>
            </tr>
            <tr className="border-b-2 border-gray-200 hidden sm:table-row">
              <td className="border-r border-gray-200 px-4 py-1 text-center text-[10px] text-gray-300 bg-white" />
              <td className="border-r border-gray-200 px-4 py-1 text-center text-[10px] text-gray-300 bg-white">(1)</td>
              <td className="px-4 py-1 text-center text-[10px] text-gray-300 bg-white">(2)</td>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => {
              const amount      = getAmount(row);
              const isSection   = row.is_section;
              const isComputed  = row.is_computed;
              const isTopParent = row.parent_code === null && !isSection;
              const isDerived   = isExternallyDerived(row.code);
              const showShimmer = INCOME_DERIVED_CODES.has(row.code) && derivedLoading && source === 'general-fund';
              const showPeso    = row.show_peso_sign || FORCE_PESO_SIGN.has(row.code);
              const paddingLeft =
                row.level === 0 ? 'pl-3 sm:pl-4' :
                row.level === 1 ? 'pl-6 sm:pl-8' :
                                  'pl-9 sm:pl-14';

              return (
                <tr
                  key={row.form6_template_id}
                  className={cn(
                    'transition-colors',
                    isSection   ? 'bg-gray-50/80 border-b border-gray-200'
                    : isTopParent ? 'bg-blue-50/30 hover:bg-blue-50/50'
                    : 'hover:bg-gray-50/60',
                  )}
                >
                  <td className="hidden sm:table-cell border-r border-gray-100 px-3 py-3 text-center text-[10px] text-gray-400 font-mono align-middle w-12">
                    {!isSection && row.code}
                  </td>
                  <td className={cn('py-2.5 sm:py-3 pr-2 sm:pr-4 border-r border-gray-100 align-middle', paddingLeft)}>
                    <span className={cn(
                      'leading-snug text-[11px] sm:text-[12px]',
                      isSection   && 'font-semibold text-gray-900 text-[10px] sm:text-[11px] uppercase tracking-wide',
                      isTopParent && 'font-semibold text-gray-900',
                      !isSection && !isTopParent && 'text-gray-800',
                    )}>
                      {isSection ? row.label : <><span className="sm:hidden text-gray-400 font-mono mr-1">{row.code}</span>{row.label}</>}
                    </span>
                  </td>
                  <td className="py-2.5 sm:py-3 px-2 sm:px-4 text-right align-middle">
                    {isSection ? null : showShimmer ? (
                      <span className="inline-block w-24 h-3.5 rounded bg-gray-100 animate-pulse" />
                    ) : (
                      <span className={cn(
                        'font-mono tabular-nums font-semibold',
                        isDerived && 'text-blue-600',
                        !isDerived && isComputed && 'text-gray-700',
                        !isDerived && (isTopParent || showPeso) && 'font-bold text-gray-900 text-[13px]',
                      )}>
                        {showPeso && (
                          <span className={cn('mr-1 text-[11px] font-normal', isDerived ? 'text-blue-400' : 'text-gray-400')}>
                            ₱
                          </span>
                        )}
                        {fmt(amount)}
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>

          <tfoot>
            <tr className="bg-gray-900 text-white">
              <td className="hidden sm:table-cell px-3 py-3 border-r border-gray-700" />
              <td className="px-3 sm:px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-500 border-r border-gray-700">Total</td>
              <td className="px-3 sm:px-4 py-3 text-right font-mono font-bold tabular-nums whitespace-nowrap">₱ {fmt(grandTotal)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Legend ── */}
      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-blue-50/30 border border-blue-200 inline-block" />
          Top-level parent rows
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm bg-gray-50/80 border border-gray-200 inline-block" />
          Section headers
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono font-semibold text-blue-600 text-[11px]">123</span>
          Blue = value derived from another table
        </span>
        <span className="flex items-center gap-1.5">
          <span className="font-mono font-semibold text-gray-700 text-[11px]">123</span>
          Gray = computed total (sum of children)
        </span>
      </div>
    </div>
  );
};

export default Form6;
