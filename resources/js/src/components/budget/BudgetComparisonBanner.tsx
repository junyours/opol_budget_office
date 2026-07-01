import React, { useMemo } from 'react';
import { DepartmentBudgetPlan } from '@/src/types/api';
import { cn } from '@/src/lib/utils';
import {
  CheckCircleIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  MinusIcon,
} from '@heroicons/react/24/outline';
import { useIncomeFundGrandTotal } from '@/src/hooks/useIncomeFundGrandTotal';
import { useForm4Items } from '@/src/hooks/useForm4Items';
import { useCalamityFund } from '@/src/hooks/useCalamityFund';
import { useQuery } from '@tanstack/react-query';
import API from '@/src/services/api';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtP  = (n: number) => `₱${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctOf = (base: number, diff: number) =>
  base === 0 ? (diff === 0 ? 0 : 100) : (diff / base) * 100;

const GENERAL_FUND_CEILING_PCT = 0.1; // ← change this to e.g. 0.15 for 15%

// ─── Types ────────────────────────────────────────────────────────────────────

interface BudgetComparisonBannerProps {
  plan:         DepartmentBudgetPlan;
  pastYearPlan: DepartmentBudgetPlan | null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const BudgetComparisonBanner: React.FC<BudgetComparisonBannerProps> = ({ plan, pastYearPlan }) => {
  const { data: currentAipItems = [], isLoading: currentAipLoading } =
    useForm4Items(plan.dept_budget_plan_id);
  const { data: pastAipItems = [], isLoading: pastAipLoadingRaw } =
    useForm4Items(pastYearPlan?.dept_budget_plan_id);

  const currentAipTotal = useMemo(
    () => currentAipItems.reduce((s, i: any) => s + (parseFloat(i.total_amount) || 0), 0),
    [currentAipItems],
  );
  const pastAipTotal = useMemo(
    () => pastAipItems.reduce((s, i: any) => s + (parseFloat(i.total_amount) || 0), 0),
    [pastAipItems],
  );
  const pastAipLoading = !!pastYearPlan && pastAipLoadingRaw;
  const aipLoading = currentAipLoading || pastAipLoading;

  const pastForm2Total = useMemo(
    () => (pastYearPlan?.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
    [pastYearPlan],
  );
  const currentForm2Total = useMemo(
    () => (plan.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
    [plan.items],
  );

  const incomeSource = (() => {
    const abbr = plan.department?.dept_abbreviation?.toLowerCase() ?? '';
    const name = plan.department?.dept_name?.toLowerCase() ?? '';
    if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
    if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
    if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
    return undefined;
  })();
  const isSpecialAccount = !!incomeSource;

  const { data: calamityFundData } = useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

  // Actual allocated calamity amounts from LDRRMFIP items (not the theoretical 5% split)
  // mirrors the dashboard's useLdrrmfSummarySource so this banner reflects real entered data.
  const { data: ldrrmfActual } = useQuery<{ reserved30: number; total70: number }>({
    queryKey: ['ldrrmf-summary', plan.budget_plan?.budget_plan_id, incomeSource],
    queryFn: () =>
      API.get('/ldrrmfip/summary', {
        params: { budget_plan_id: plan.budget_plan?.budget_plan_id, source: incomeSource },
      })
        .then(r => {
          const d = r.data?.data ?? r.data;
          return {
            reserved30: Number(d?.reserved_30 ?? 0),
            total70:    Number(d?.total_70pct  ?? 0),
          };
        })
        .catch(() => ({ reserved30: 0, total70: 0 })),
    enabled: !!plan.budget_plan?.budget_plan_id && isSpecialAccount,
  });
  // QRF (30%) is always fixed/reserved regardless of allocation — use the theoretical split.
  // Only Pre-Disaster (70%) reflects what's actually been allocated to LDRRMFIP items.
  const calamityTotal = (calamityFundData?.quick_response ?? 0) + (ldrrmfActual?.total70 ?? 0);

  // Special accounts (SH / OCC / PM) are self-funded: their ceiling is their own
  // Income Fund grand total, not the 10% prior-year growth rule.
  const { grandTotal: incomeGrandTotal, loading: incomeGrandLoading } =
    useIncomeFundGrandTotal(incomeSource ?? 'general-fund');

  const pastTotal      = pastForm2Total + pastAipTotal;
  const currentExclCal = currentForm2Total + currentAipTotal;
  const currentInclCal = currentExclCal + (isSpecialAccount ? calamityTotal : 0);

  const diff      = currentExclCal - pastTotal;
  const diffPct   = pctOf(pastTotal, diff);

  const ceilingLoading = isSpecialAccount ? incomeGrandLoading : false;
//   const threshold       = isSpecialAccount ? (incomeGrandTotal ?? 0) : pastTotal * 1.1;
const threshold = isSpecialAccount ? (incomeGrandTotal ?? 0) : pastTotal * (1 + GENERAL_FUND_CEILING_PCT);
  const ceilingBasis     = isSpecialAccount ? currentInclCal : currentExclCal;
  const isOver = isSpecialAccount
    ? (!ceilingLoading && threshold > 0 && ceilingBasis > threshold)
    : (pastTotal > 0 && ceilingBasis > threshold);
  const excess    = isOver ? ceilingBasis - threshold : 0;
  const prevYear  = Number(plan.budget_plan?.year) - 1;
  const currYear  = plan.budget_plan?.year;

  return (
    <div className={cn(
      'rounded-xl border mb-4 px-5 py-4',
      isOver ? 'bg-red-50/60 border-red-200' : 'bg-white border-gray-200',
    )}>

      {/* ── Top row ── */}
      <div className="flex items-center gap-0 flex-wrap">

        {/* Appropriation */}
        <div className="flex flex-col gap-0.5 pr-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            Appropriation {prevYear}
          </span>
          {aipLoading
            ? <span className="h-7 w-32 rounded bg-gray-100 animate-pulse mt-0.5" />
            : pastTotal === 0
            ? <span className="text-[20px] font-bold text-gray-300 tracking-tight font-mono">No data</span>
            : <span className="text-[22px] font-bold text-blue-700 tracking-tight font-mono tabular-nums leading-tight">
                {fmtP(pastTotal)}
              </span>
          }
          <span className="text-[11px] text-gray-300">Prior year</span>
        </div>

        {/* Divider */}
        <div className="w-px h-10 bg-gray-200 flex-shrink-0" />

        {/* Proposed (+ calamity fund inline, special accounts only) */}
        <div className="flex flex-col gap-0.5 px-5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
            {isSpecialAccount ? `Total Proposed ${currYear}` : `Proposed ${currYear}`}
          </span>
          {aipLoading ? (
            <span className="h-7 w-40 rounded bg-gray-100 animate-pulse mt-0.5" />
          ) : isSpecialAccount ? (
            <span className="flex items-baseline gap-1.5 flex-wrap">
              <span className="text-[22px] font-bold text-orange-600 tracking-tight font-mono tabular-nums leading-tight">
                {fmtP(currentInclCal)}
              </span>
              <span className="text-[11px] text-gray-400 font-mono">
                ({fmtP(currentExclCal)} + {fmtP(calamityTotal)} calamity)
              </span>
            </span>
          ) : (
            <span className="text-[22px] font-bold text-orange-600 tracking-tight font-mono tabular-nums leading-tight">
              {fmtP(currentExclCal)}
            </span>
          )}
          <span className="text-[11px] text-gray-300">
            {isSpecialAccount ? 'Incl. 5% calamity fund' : 'Current proposal'}
          </span>
        </div>

        {/* Inc/Dec badge */}
        {!aipLoading && (pastTotal > 0 || isOver) && (
          <div className={cn(
            'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium border flex-shrink-0 mx-3',
            isOver     ? 'bg-red-50 border-red-200 text-red-700'
            : diff > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : diff < 0 ? 'bg-sky-50 border-sky-200 text-sky-700'
            :            'bg-gray-50 border-gray-200 text-gray-500',
          )}>
            {isOver
              ? <ExclamationTriangleIcon className="w-3.5 h-3.5" />
              : diff > 0
              ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
              : diff < 0
              ? <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
              : <MinusIcon className="w-3.5 h-3.5" />
            }
            {isOver
              ? <span>
                  +{fmtP(excess)} over ceiling
                  {!isSpecialAccount && pastTotal > 0 && (
                    <span className="opacity-70 ml-1">
                     ({((ceilingBasis / pastTotal - 1) * 100).toFixed(2)}% over prior year)
                    </span>
                  )}
                </span>
              : <span>
                  {diff === 0 ? '±0' : (diff > 0 ? '+' : '')}{fmtP(diff)}
                  <span className="opacity-60 ml-1">
                    ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(2)}%)
                  </span>
                </span>
            }
          </div>
        )}

        <div className="flex-1" />

        {/* Status — right side, separated by a vertical rule */}
        {!aipLoading && (
          <div className={cn(
            'flex items-start gap-2.5 pl-5 flex-shrink-0',
            (pastTotal > 0 || (isSpecialAccount && threshold > 0)) && 'border-l border-gray-200',
          )}>
            {ceilingLoading ? (
              <span className="text-[12px] text-gray-400 italic">Loading Income Fund ceiling…</span>
            ) : isOver ? (
              <>
                <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-red-700">
                    {/* {isSpecialAccount ? 'Above Income Fund ceiling' : 'Above 10% appropriation ceiling'} */}
                    {isSpecialAccount ? 'Above Income Fund ceiling' : `Above ${+(GENERAL_FUND_CEILING_PCT * 100).toFixed(2).replace(/\.?0+$/, '')}% appropriation ceiling`}
                  </span>
                  <span className="text-[11px] text-gray-500">
                    {isSpecialAccount ? 'Income Fund total' : 'Ceiling'}:{' '}
                    <span className="font-mono font-medium text-gray-700">{fmtP(threshold)}</span>
                    {/* {' '}·{' '} */}
                    {/* Excess:{' '}
                    <span className="font-mono font-medium text-red-600">{fmtP(excess)}</span> */}
                  </span>
                  {isSpecialAccount && (
                    <span className="text-[10px] text-gray-400 italic">
                      Total proposed expenditure (incl. calamity fund) exceeds this department's Income Fund grand total.
                    </span>
                  )}
                </div>
              </>
            ) : isSpecialAccount ? (
              threshold === 0 ? (
                <span className="text-[12px] text-gray-400 italic">No Income Fund data available for comparison.</span>
              ) : (
                <>
                  <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-[13px] font-semibold text-emerald-700">
                      Within Income Fund ceiling
                    </span>
                    <span className="text-[11px] text-gray-500">
                      Income Fund total:{' '}
                      <span className="font-mono font-medium text-gray-700">{fmtP(threshold)}</span>
                    </span>
                    <span className="text-[10px] text-gray-400 italic">
                      Incl. calamity fund · matched against<br />
                      department's Income Fund total.
                    </span>
                  </div>
                </>
              )
            ) : pastTotal === 0 ? (
              <span className="text-[12px] text-gray-400 italic">No prior-year data for comparison.</span>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[13px] font-semibold text-emerald-700">
                    {/* Within 10% appropriation ceiling */}
                    {/* {`Within ${GENERAL_FUND_CEILING_PCT * 100}% appropriation ceiling`} */}
                    `Within ${+(GENERAL_FUND_CEILING_PCT * 100).toFixed(2).replace(/\.?0+$/, '')}% appropriation ceiling`
                  </span>
                  <span className="text-[11px] text-gray-500">
                    Ceiling:{' '}
                    <span className="font-mono font-medium text-gray-700">{fmtP(threshold)}</span>
                  </span>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      </div>
  );
};
