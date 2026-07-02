// import React, { useEffect, useState, useMemo, useCallback } from 'react';
import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react';
import { useQuery, useQueries, useQueryClient } from '@tanstack/react-query';
import API from '../../services/api';
import { useActiveBudgetPlan } from '../../hooks/useActiveBudgetPlan';
import { DepartmentBudgetPlan, ExpenseClassification, ExpenseItem } from '../../types/api';
import Form2 from '@/src/pages/department-head/Form2';
import Form3 from '@/src/pages/department-head/Form3';
import Form4 from '@/src/pages/department-head/Form4';
import { LoadingState } from '../../components/states/LoadingState';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/src/components/ui/tabs';
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
import { Input } from '@/src/components/ui/input';
import { Skeleton } from '@/src/components/ui/skeleton';
import { toast } from 'sonner';
import { cn } from '@/src/lib/utils';
// import {
//   MagnifyingGlassIcon,
//   CheckCircleIcon,
//   ArrowUturnLeftIcon,
// } from '@heroicons/react/24/outline';
import {
  MagnifyingGlassIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ExclamationTriangleIcon,
  MinusIcon,
  EyeIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../../hooks/useAuth';
import { useLocation } from 'react-router-dom';

// import { useNotifications } from '@/src/hooks/useNotifications';
import { useNotificationStore } from '@/src/store/useNotificationStore';

import { refreshSubmittedCount } from "@/src/hooks/useSubmittedPlanCount";

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/src/components/ui/select';
import { BudgetComparisonBanner } from '@/src/components/budget/BudgetComparisonBanner';
import { BudgetPlanStepper } from '@/src/components/budget/BudgetPlanStepper';


// ─── Panel entrance animation ─────────────────────────────────────────────────
const PANEL_CSS = `
@keyframes _panelIn {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  ._panelIn { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;
let _panelAnimInjected = false;
function ensurePanelAnim() {
  if (_panelAnimInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = PANEL_CSS;
  document.head.appendChild(el);
  _panelAnimInjected = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt   = (n: number) => Math.round(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
const fmtP  = (n: number) => `₱${fmt(n)}`;
const pctOf = (base: number, diff: number) =>
  base === 0 ? (diff === 0 ? 0 : 100) : (diff / base) * 100;

// ─── Budget Comparison Banner ─────────────────────────────────────────────────

// ─── Budget Comparison Banner ─────────────────────────────────────────────────

// interface BudgetComparisonBannerProps {
//   plan:         DepartmentBudgetPlan;
//   pastYearPlan: DepartmentBudgetPlan | null;
// }

// const BudgetComparisonBanner: React.FC<BudgetComparisonBannerProps> = ({ plan, pastYearPlan }) => {
//   const [pastAipTotal,    setPastAipTotal]    = useState(0);
//   const [currentAipTotal, setCurrentAipTotal] = useState(0);
//   const [aipLoading,      setAipLoading]      = useState(true);

//   useEffect(() => {
//     setAipLoading(true);
//     const currentReq = API.get('/form4-items', {
//       params: { budget_plan_id: plan.dept_budget_plan_id },
//     });
//     const pastReq = pastYearPlan
//       ? API.get('/form4-items', { params: { budget_plan_id: pastYearPlan.dept_budget_plan_id } })
//       : Promise.resolve({ data: { data: [] as any[] } });

//     Promise.all([currentReq, pastReq])
//       .then(([curRes, pastRes]) => {
//         const curItems:  any[] = curRes.data.data  ?? [];
//         const pastItems: any[] = pastRes.data.data ?? [];
//         setCurrentAipTotal(curItems.reduce((s, i)  => s + (parseFloat(i.total_amount) || 0), 0));
//         setPastAipTotal   (pastItems.reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0));
//       })
//       .catch(console.error)
//       .finally(() => setAipLoading(false));
//   }, [plan.dept_budget_plan_id, pastYearPlan?.dept_budget_plan_id]);

//   const pastForm2Total = useMemo(
//     () => (pastYearPlan?.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
//     [pastYearPlan],
//   );
//   const currentForm2Total = useMemo(
//     () => (plan.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
//     [plan.items],
//   );

// //   const pastTotal    = pastForm2Total    + pastAipTotal;
// //   const currentTotal = currentForm2Total + currentAipTotal;

// const incomeSource = (() => {
//     const abbr = plan.department?.dept_abbreviation?.toLowerCase() ?? '';
//     const name = plan.department?.dept_name?.toLowerCase() ?? '';
//     if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//     if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//     if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//     return undefined;
//   })();
//   const isSpecialAccount = !!incomeSource;

//   const [calamityTotal, setCalamityTotal] = useState(0);
//   useEffect(() => {
//     if (!isSpecialAccount || !plan.budget_plan?.budget_plan_id) return;
//     API.get('/calamity-fund', {
//       params: { budget_plan_id: plan.budget_plan.budget_plan_id, source: incomeSource },
//     })
//       .then(r => setCalamityTotal(parseFloat(r.data?.data?.calamity_fund) || 0))
//       .catch(() => setCalamityTotal(0));
//   }, [plan.budget_plan?.budget_plan_id, incomeSource]);

//   const pastTotal    = pastForm2Total    + pastAipTotal;
//   const currentTotal = currentForm2Total + currentAipTotal + (isSpecialAccount ? calamityTotal : 0);


//   const diff         = currentTotal - pastTotal;
//   const diffPct      = pctOf(pastTotal, diff);
//   const threshold    = pastTotal * 1.1;
//   const isOver       = pastTotal > 0 && currentTotal > threshold;
//   const excess       = isOver ? currentTotal - threshold : 0;
//   const prevYear     = Number(plan.budget_plan?.year) - 1;
//   const currYear     = plan.budget_plan?.year;

//   return (
//     <div className={cn(
//       'rounded-xl border px-4 py-3 mb-4 flex flex-wrap items-center gap-3',
//       isOver
//         ? 'bg-red-50 border-red-300'
//         : 'bg-white border-gray-200',
//     )}>

//       {/* ── Appropriation card (blue) ── */}
//       <div className="flex flex-col gap-0.5 rounded-lg px-3.5 py-2.5 min-w-[140px] bg-blue-50 border border-blue-200">
//         <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">
//           Appropriation {prevYear}
//         </span>
//         {aipLoading ? (
//           <span className="h-5 w-28 rounded bg-blue-100 animate-pulse" />
//         ) : pastTotal === 0 ? (
//           <span className="text-[14px] font-semibold text-blue-400">No data</span>
//         ) : (
//           <span className="text-[18px] font-bold font-mono tabular-nums leading-tight text-blue-700">
//             {fmtP(pastTotal)}
//           </span>
//         )}
//         <span className="text-[11px] text-blue-300">Prior year</span>
//       </div>

//       {/* Arrow */}
//       <ArrowTrendingUpIcon className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />

//      {/* ── Proposed card (always orange) ── */}
//       <div className="flex flex-col gap-0.5 rounded-lg px-3.5 py-2.5 min-w-[140px] border bg-orange-50 border-orange-200">
//         <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">
//           Proposed {currYear}
//         </span>
//         {aipLoading ? (
//           <span className="h-5 w-28 rounded bg-orange-100 animate-pulse" />
//         ) : (
//           <span className="text-[18px] font-bold font-mono tabular-nums leading-tight text-orange-700">
//             {fmtP(currentTotal)}
//           </span>
//         )}
//         <span className="text-[11px] text-orange-300">Current proposal</span>
//       </div>

//       {/* ── Inc / Dec chip ── */}
//       {!aipLoading && pastTotal > 0 && (
//         <div className={cn(
//           'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium flex-shrink-0 border',
//           isOver        ? 'bg-red-50 border-red-200 text-red-600'
//           : diff > 0    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
//           : diff < 0    ? 'bg-sky-50 border-sky-200 text-sky-600'
//           :               'bg-gray-100 border-gray-200 text-gray-500',
//         )}>
//           {isOver
//             ? <ExclamationTriangleIcon className="w-3.5 h-3.5" />
//             : diff > 0
//             ? <ArrowTrendingUpIcon     className="w-3.5 h-3.5" />
//             : diff < 0
//             ? <ArrowTrendingDownIcon   className="w-3.5 h-3.5" />
//             : <MinusIcon               className="w-3.5 h-3.5" />
//           }
//           {isOver ? (
//             <>
//               <span>+{fmtP(excess)} over ceiling</span>
//               <span className="opacity-60">({((excess / threshold) * 100).toFixed(2)}% excess)</span>
//             </>
//           ) : (
//             <>
//               <span>{diff === 0 ? '±0' : (diff > 0 ? '+' : '')}{fmtP(diff)}</span>
//               <span className="opacity-60">
//                 ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
//               </span>
//             </>
//           )}
//         </div>
//       )}

//       <div className="flex-1" />

//       {/* ── Status message ── */}
//       {!aipLoading && (
//         <div className="flex items-start gap-2 flex-shrink-0">
//           {isOver ? (
//             <div className="flex items-start gap-2">
//               <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
//               <div className="flex flex-col gap-0.5">
//                 <span className="text-[12px] font-semibold text-red-700">
//                   Above 10% Appropriation Ceiling
//                 </span>
//                 <span className="text-[11px] text-red-500">
//                   Ceiling:{' '}
//                   <span className="font-mono font-medium">{fmtP(threshold)}</span>
//                 </span>
//                 <span className="text-[10px] text-red-400 italic">
//                   Proposed amount exceeds the 10% growth ceiling.
//                 </span>
//               </div>
//             </div>
//           ) : pastTotal === 0 ? (
//             <span className="text-[11px] text-gray-400 italic">No prior-year data for comparison.</span>
//           ) : (
//             <>
//               <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
//               <div className="flex flex-col gap-0.5">
//                 <span className="text-[12px] font-medium text-emerald-600">
//                   Within 10% Appropriation Ceiling
//                 </span>
//                 <span className="text-[11px] text-gray-400">
//                   Suggested limit:{' '}
//                   <span className="font-mono font-medium text-gray-500">{fmtP(threshold)}</span>
//                 </span>
//                 <span className="text-[10px] text-gray-400 italic">
//                   For reference only — final budget is at the department head's discretion.
//                 </span>
//               </div>
//             </>
//           )}
//         </div>
//       )}
//     </div>
//   );
// };


// ─── Status config ────────────────────────────────────────────────────────────

// const BudgetComparisonBanner: React.FC<BudgetComparisonBannerProps> = ({ plan, pastYearPlan }) => {
//   const [pastAipTotal,    setPastAipTotal]    = useState(0);
//   const [currentAipTotal, setCurrentAipTotal] = useState(0);
//   const [aipLoading,      setAipLoading]      = useState(true);

//   useEffect(() => {
//     setAipLoading(true);
//     const currentReq = API.get('/form4-items', {
//       params: { budget_plan_id: plan.dept_budget_plan_id },
//     });
//     const pastReq = pastYearPlan
//       ? API.get('/form4-items', { params: { budget_plan_id: pastYearPlan.dept_budget_plan_id } })
//       : Promise.resolve({ data: { data: [] as any[] } });

//     Promise.all([currentReq, pastReq])
//       .then(([curRes, pastRes]) => {
//         const curItems:  any[] = curRes.data.data  ?? [];
//         const pastItems: any[] = pastRes.data.data ?? [];
//         setCurrentAipTotal(curItems.reduce((s, i)  => s + (parseFloat(i.total_amount) || 0), 0));
//         setPastAipTotal   (pastItems.reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0));
//       })
//       .catch(console.error)
//       .finally(() => setAipLoading(false));
//   }, [plan.dept_budget_plan_id, pastYearPlan?.dept_budget_plan_id]);

//   const pastForm2Total = useMemo(
//     () => (pastYearPlan?.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
//     [pastYearPlan],
//   );
//   const currentForm2Total = useMemo(
//     () => (plan.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
//     [plan.items],
//   );

//   const incomeSource = (() => {
//     const abbr = plan.department?.dept_abbreviation?.toLowerCase() ?? '';
//     const name = plan.department?.dept_name?.toLowerCase() ?? '';
//     if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//     if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//     if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//     return undefined;
//   })();
//   const isSpecialAccount = !!incomeSource;

//   const [calamityTotal, setCalamityTotal] = useState(0);
//   useEffect(() => {
//     if (!isSpecialAccount || !plan.budget_plan?.budget_plan_id) return;
//     API.get('/calamity-fund', {
//       params: { budget_plan_id: plan.budget_plan.budget_plan_id, source: incomeSource },
//     })
//       .then(r => setCalamityTotal(parseFloat(r.data?.data?.calamity_fund) || 0))
//       .catch(() => setCalamityTotal(0));
//   }, [plan.budget_plan?.budget_plan_id, incomeSource]);

//   // Ceiling comparison excludes calamity fund
//   const pastTotal        = pastForm2Total + pastAipTotal;
//   const currentExclCal   = currentForm2Total + currentAipTotal;   // used for ceiling check
//   const currentInclCal   = currentExclCal + (isSpecialAccount ? calamityTotal : 0); // grand total

//   const diff      = currentExclCal - pastTotal;
//   const diffPct   = pctOf(pastTotal, diff);
//   const threshold = pastTotal * 1.1;
//   const isOver    = pastTotal > 0 && currentExclCal > threshold;
//   const excess    = isOver ? currentExclCal - threshold : 0;
//   const prevYear  = Number(plan.budget_plan?.year) - 1;
//   const currYear  = plan.budget_plan?.year;

//   return (
//     <div className={cn(
//       'rounded-xl border px-4 py-3 mb-4',
//       isOver ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200',
//     )}>

//       {/* ── Row 1: cards + chip + status ── */}
//       <div className="flex flex-wrap items-center gap-3">

//         {/* Appropriation card */}
//         <div className="flex flex-col gap-0.5 rounded-lg px-3.5 py-2.5 min-w-[140px] bg-blue-50 border border-blue-200">
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-blue-400">
//             Appropriation {prevYear}
//           </span>
//           {aipLoading ? (
//             <span className="h-5 w-28 rounded bg-blue-100 animate-pulse" />
//           ) : pastTotal === 0 ? (
//             <span className="text-[14px] font-semibold text-blue-400">No data</span>
//           ) : (
//             <span className="text-[18px] font-bold font-mono tabular-nums leading-tight text-blue-700">
//               {fmtP(pastTotal)}
//             </span>
//           )}
//           <span className="text-[11px] text-blue-300">Prior year</span>
//         </div>

//         {/* Arrow */}
//         <ArrowTrendingUpIcon className="w-4 h-4 text-gray-300 flex-shrink-0 hidden sm:block" />

//         {/* Proposed card — shows excl. calamity for ceiling context */}
//         <div className="flex flex-col gap-0.5 rounded-lg px-3.5 py-2.5 min-w-[140px] border bg-orange-50 border-orange-200">
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-orange-400">
//             Proposed {currYear}
//           </span>
//           {aipLoading ? (
//             <span className="h-5 w-28 rounded bg-orange-100 animate-pulse" />
//           ) : (
//             <span className="text-[18px] font-bold font-mono tabular-nums leading-tight text-orange-700">
//               {fmtP(currentExclCal)}
//             </span>
//           )}
//           <span className="text-[11px] text-orange-300">Excl. calamity fund</span>
//         </div>

//         {/* Inc / Dec chip — based on ceiling comparison (excl. calamity) */}
//         {!aipLoading && pastTotal > 0 && (
//           <div className={cn(
//             'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium flex-shrink-0 border',
//             isOver        ? 'bg-red-50 border-red-200 text-red-600'
//             : diff > 0    ? 'bg-emerald-50 border-emerald-200 text-emerald-600'
//             : diff < 0    ? 'bg-sky-50 border-sky-200 text-sky-600'
//             :               'bg-gray-100 border-gray-200 text-gray-500',
//           )}>
//             {isOver
//               ? <ExclamationTriangleIcon className="w-3.5 h-3.5" />
//               : diff > 0
//               ? <ArrowTrendingUpIcon     className="w-3.5 h-3.5" />
//               : diff < 0
//               ? <ArrowTrendingDownIcon   className="w-3.5 h-3.5" />
//               : <MinusIcon               className="w-3.5 h-3.5" />
//             }
//             {isOver ? (
//               <>
//                 <span>+{fmtP(excess)} over ceiling</span>
//                 <span className="opacity-60">({((excess / threshold) * 100).toFixed(2)}% excess)</span>
//               </>
//             ) : (
//               <>
//                 <span>{diff === 0 ? '±0' : (diff > 0 ? '+' : '')}{fmtP(diff)}</span>
//                 <span className="opacity-60">
//                   ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
//                 </span>
//               </>
//             )}
//           </div>
//         )}

//         <div className="flex-1" />

//         {/* Status message */}
//         {!aipLoading && (
//           <div className="flex items-start gap-2 flex-shrink-0">
//             {isOver ? (
//               <div className="flex items-start gap-2">
//                 <ExclamationTriangleIcon className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
//                 <div className="flex flex-col gap-0.5">
//                   <span className="text-[12px] font-semibold text-red-700">
//                     Above 10% Appropriation Ceiling
//                   </span>
//                   <span className="text-[11px] text-red-500">
//                     Ceiling:{' '}
//                     <span className="font-mono font-medium">{fmtP(threshold)}</span>
//                   </span>
//                   <span className="text-[10px] text-red-400 italic">
//                     Calamity fund not included in ceiling comparison.
//                   </span>
//                 </div>
//               </div>
//             ) : pastTotal === 0 ? (
//               <span className="text-[11px] text-gray-400 italic">No prior-year data for comparison.</span>
//             ) : (
//               <>
//                 <CheckCircleIcon className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
//                 <div className="flex flex-col gap-0.5">
//                   <span className="text-[12px] font-medium text-emerald-600">
//                     Within 10% Appropriation Ceiling
//                   </span>
//                   <span className="text-[11px] text-gray-400">
//                     Suggested limit:{' '}
//                     <span className="font-mono font-medium text-gray-500">{fmtP(threshold)}</span>
//                   </span>
//                   <span className="text-[10px] text-gray-400 italic">
//                     Calamity fund not included in ceiling comparison.
//                   </span>
//                 </div>
//               </>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Row 2: Calamity fund + Grand total (special accounts only) ── */}
//       {isSpecialAccount && !aipLoading && (
//         <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-3">

//           {/* Calamity fund chip */}
//           <div className="flex items-center gap-2 rounded-lg px-3 py-2 bg-rose-50 border border-rose-200">
//             <div className="flex flex-col gap-0">
//               <span className="text-[10px] font-semibold uppercase tracking-widest text-rose-400">
//                 5% Calamity Fund
//               </span>
//               <span className="text-[15px] font-bold font-mono tabular-nums text-rose-700">
//                 {calamityTotal > 0 ? fmtP(calamityTotal) : '—'}
//               </span>
//               <span className="text-[10px] text-rose-300">Not counted in ceiling</span>
//             </div>
//           </div>

//           <span className="text-gray-300 text-[14px] font-mono hidden sm:block">=</span>

//           {/* Grand total incl. calamity */}
//           <div className="flex flex-col gap-0 rounded-lg px-3.5 py-2.5 bg-gray-900 border border-gray-800 min-w-[160px]">
//             <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
//               Total Proposed {currYear}
//             </span>
//             <span className="text-[18px] font-bold font-mono tabular-nums leading-tight text-white">
//               {fmtP(currentInclCal)}
//             </span>
//             <span className="text-[10px] text-gray-500">Incl. calamity fund</span>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

// const BudgetComparisonBanner: React.FC<BudgetComparisonBannerProps> = ({ plan, pastYearPlan }) => {
//     const [pastAipTotal,    setPastAipTotal]    = useState(0);
//   const [currentAipTotal, setCurrentAipTotal] = useState(0);
//   const [aipLoading,      setAipLoading]      = useState(true);

//   useEffect(() => {
//     setAipLoading(true);
//     const currentReq = API.get('/form4-items', {
//       params: { budget_plan_id: plan.dept_budget_plan_id },
//     });
//     const pastReq = pastYearPlan
//       ? API.get('/form4-items', { params: { budget_plan_id: pastYearPlan.dept_budget_plan_id } })
//       : Promise.resolve({ data: { data: [] as any[] } });

//     Promise.all([currentReq, pastReq])
//       .then(([curRes, pastRes]) => {
//         const curItems:  any[] = curRes.data.data  ?? [];
//         const pastItems: any[] = pastRes.data.data ?? [];
//         setCurrentAipTotal(curItems.reduce((s, i)  => s + (parseFloat(i.total_amount) || 0), 0));
//         setPastAipTotal   (pastItems.reduce((s, i) => s + (parseFloat(i.total_amount) || 0), 0));
//       })
//       .catch(console.error)
//       .finally(() => setAipLoading(false));
//   }, [plan.dept_budget_plan_id, pastYearPlan?.dept_budget_plan_id]);

//   const pastForm2Total = useMemo(
//     () => (pastYearPlan?.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
//     [pastYearPlan],
//   );
//   const currentForm2Total = useMemo(
//     () => (plan.items ?? []).reduce((s, i) => s + (Number(i.total_amount) || 0), 0),
//     [plan.items],
//   );

//   const incomeSource = (() => {
//     const abbr = plan.department?.dept_abbreviation?.toLowerCase() ?? '';
//     const name = plan.department?.dept_name?.toLowerCase() ?? '';
//     if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//     if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//     if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//     return undefined;
//   })();
//   const isSpecialAccount = !!incomeSource;

//   const [calamityTotal, setCalamityTotal] = useState(0);
//   useEffect(() => {
//     if (!isSpecialAccount || !plan.budget_plan?.budget_plan_id) return;
//     API.get('/calamity-fund', {
//       params: { budget_plan_id: plan.budget_plan.budget_plan_id, source: incomeSource },
//     })
//       .then(r => setCalamityTotal(parseFloat(r.data?.data?.calamity_fund) || 0))
//       .catch(() => setCalamityTotal(0));
//   }, [plan.budget_plan?.budget_plan_id, incomeSource]);



//   // Special accounts (SH / OCC / PM) are self-funded: their ceiling is their own
//   // Income Fund grand total, not the 10% prior-year growth rule.
//   const { grandTotal: incomeGrandTotal, loading: incomeGrandLoading } =
//     useIncomeFundGrandTotal(incomeSource ?? 'general-fund');

//   const pastTotal      = pastForm2Total + pastAipTotal;
//   const currentExclCal = currentForm2Total + currentAipTotal;
//   const currentInclCal = currentExclCal + (isSpecialAccount ? calamityTotal : 0);

//   const diff      = currentExclCal - pastTotal;
//   const diffPct   = pctOf(pastTotal, diff);

//   const ceilingLoading = isSpecialAccount ? incomeGrandLoading : false;
//   const threshold       = isSpecialAccount ? (incomeGrandTotal ?? 0) : pastTotal * 1.1;
//   const ceilingBasis     = isSpecialAccount ? currentInclCal : currentExclCal;   // special accts compare incl. calamity
//   const isOver = isSpecialAccount
//     ? (!ceilingLoading && threshold > 0 && ceilingBasis > threshold)
//     : (pastTotal > 0 && ceilingBasis > threshold);
//   const excess    = isOver ? ceilingBasis - threshold : 0;
//   const prevYear  = Number(plan.budget_plan?.year) - 1;
//   const currYear  = plan.budget_plan?.year;

//   return (
//     <div className={cn(
//       'rounded-xl border mb-4 px-5 py-4',
//       isOver ? 'bg-red-50/60 border-red-200' : 'bg-white border-gray-200',
//     )}>

//       {/* ── Top row ── */}
//       <div className="flex items-center gap-0 flex-wrap">

//         {/* Appropriation */}
//         <div className="flex flex-col gap-0.5 pr-5">
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
//             Appropriation {prevYear}
//           </span>
//           {aipLoading
//             ? <span className="h-7 w-32 rounded bg-gray-100 animate-pulse mt-0.5" />
//             : pastTotal === 0
//             ? <span className="text-[20px] font-bold text-gray-300 tracking-tight font-mono">No data</span>
//             : <span className="text-[22px] font-bold text-blue-700 tracking-tight font-mono tabular-nums leading-tight">
//                 {fmtP(pastTotal)}
//               </span>
//           }
//           <span className="text-[11px] text-gray-300">Prior year</span>
//         </div>

//         {/* Divider */}
//         <div className="w-px h-10 bg-gray-200 flex-shrink-0" />

//         {/* Proposed */}
//         <div className="flex flex-col gap-0.5 px-5">
//           <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
//             Proposed {currYear}
//           </span>
//           {aipLoading
//             ? <span className="h-7 w-32 rounded bg-gray-100 animate-pulse mt-0.5" />
//             : <span className="text-[22px] font-bold text-gray-800 tracking-tight font-mono tabular-nums leading-tight">
//                 {fmtP(currentExclCal)}
//               </span>
//           }
//           <span className="text-[11px] text-gray-300">
//             {isSpecialAccount ? 'Excl. calamity fund' : 'Current proposal'}
//           </span>
//         </div>

//         {/* Inc/Dec badge */}
//         {!aipLoading && (pastTotal > 0 || isOver) && (
//           <div className={cn(
//             'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium border flex-shrink-0 mx-3',
//             isOver     ? 'bg-red-50 border-red-200 text-red-700'
//             : diff > 0 ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
//             : diff < 0 ? 'bg-sky-50 border-sky-200 text-sky-700'
//             :            'bg-gray-50 border-gray-200 text-gray-500',
//           )}>
//             {isOver
//               ? <ExclamationTriangleIcon className="w-3.5 h-3.5" />
//               : diff > 0
//               ? <ArrowTrendingUpIcon className="w-3.5 h-3.5" />
//               : diff < 0
//               ? <ArrowTrendingDownIcon className="w-3.5 h-3.5" />
//               : <MinusIcon className="w-3.5 h-3.5" />
//             }
//             {isOver
//               ? <span>+{fmtP(excess)} over ceiling</span>
//               : <span>
//                   {diff === 0 ? '±0' : (diff > 0 ? '+' : '')}{fmtP(diff)}
//                   <span className="opacity-60 ml-1">
//                     ({diffPct >= 0 ? '+' : ''}{diffPct.toFixed(1)}%)
//                   </span>
//                 </span>
//             }
//           </div>
//         )}

//         <div className="flex-1" />

//         {/* Status — right side, separated by a vertical rule */}
//         {!aipLoading && (
//           <div className={cn(
//             'flex items-start gap-2.5 pl-5 flex-shrink-0',
//             (pastTotal > 0 || (isSpecialAccount && threshold > 0)) && 'border-l border-gray-200',
//           )}>
//             {ceilingLoading ? (
//               <span className="text-[12px] text-gray-400 italic">Loading Income Fund ceiling…</span>
//             ) : isOver ? (
//               <>
//                 <div className="w-5 h-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
//                   <ExclamationTriangleIcon className="w-3 h-3 text-red-600" />
//                 </div>
//                 <div className="flex flex-col gap-0.5">
//                   <span className="text-[13px] font-semibold text-red-700">
//                     {isSpecialAccount ? 'Above Income Fund ceiling' : 'Above 10% appropriation ceiling'}
//                   </span>
//                   <span className="text-[11px] text-gray-500">
//                     {isSpecialAccount ? 'Income Fund total' : 'Ceiling'}:{' '}
//                     <span className="font-mono font-medium text-gray-700">{fmtP(threshold)}</span>
//                     {' '}·{' '}
//                     Excess:{' '}
//                     <span className="font-mono font-medium text-red-600">{fmtP(excess)}</span>
//                   </span>
//                   {isSpecialAccount && (
//                     <span className="text-[10px] text-gray-400 italic">
//                       Total proposed expenditure (incl. calamity fund) exceeds this department's Income Fund grand total.
//                     </span>
//                   )}
//                 </div>
//               </>
//             ) : isSpecialAccount ? (
//               threshold === 0 ? (
//                 <span className="text-[12px] text-gray-400 italic">No Income Fund data available for comparison.</span>
//               ) : (
//                 <>
//                   <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
//                     <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
//                   </div>
//                   <div className="flex flex-col gap-0.5">
//                     <span className="text-[13px] font-semibold text-emerald-700">
//                       Within Income Fund ceiling
//                     </span>
//                     <span className="text-[11px] text-gray-500">
//                       Income Fund total:{' '}
//                       <span className="font-mono font-medium text-gray-700">{fmtP(threshold)}</span>
//                     </span>
//                     <span className="text-[10px] text-gray-400 italic">
//                       Total proposed expenditure (incl. calamity fund) is matched against this department's Income Fund grand total.
//                     </span>
//                   </div>
//                 </>
//               )
//             ) : pastTotal === 0 ? (
//               <span className="text-[12px] text-gray-400 italic">No prior-year data for comparison.</span>
//             ) : (
//               <>
//                 <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
//                   <CheckCircleIcon className="w-3 h-3 text-emerald-600" />
//                 </div>
//                 <div className="flex flex-col gap-0.5">
//                   <span className="text-[13px] font-semibold text-emerald-700">
//                     Within 10% appropriation ceiling
//                   </span>
//                   <span className="text-[11px] text-gray-500">
//                     Ceiling:{' '}
//                     <span className="font-mono font-medium text-gray-700">{fmtP(threshold)}</span>
//                   </span>
//                 </div>
//               </>
//             )}
//           </div>
//         )}
//       </div>

//       {/* ── Calamity row (special accounts only) ── */}
//       {isSpecialAccount && !aipLoading && (
//         <div className="flex items-center gap-3 mt-4 pt-4 border-t border-gray-100 flex-wrap">
//           <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
//             5% Calamity Fund
//           </span>
//           <span className="text-[14px] font-bold font-mono tabular-nums text-gray-700">
//             {calamityTotal > 0 ? fmtP(calamityTotal) : '—'}
//           </span>
//           <span className="text-[11px] text-gray-400">not counted in ceiling</span>

//           <span className="text-gray-300 text-[13px] font-mono mx-1">+</span>

//           <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">
//             Dept. Expenditure
//           </span>
//           <span className="text-[14px] font-bold font-mono tabular-nums text-gray-700">
//             {fmtP(currentExclCal)}
//           </span>

//           <span className="text-gray-300 text-[13px] font-mono mx-1">=</span>

//           {/* Grand total chip */}
//           <div className="flex items-center gap-3 bg-gray-900 rounded-lg px-4 py-2">
//             <div className="flex flex-col gap-0">
//               <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
//                 Total proposed {currYear}
//               </span>
//               <span className="text-[16px] font-bold font-mono tabular-nums text-white leading-tight">
//                 {fmtP(currentInclCal)}
//               </span>
//               <span className="text-[10px] text-gray-600">Incl. calamity fund</span>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// };

const STATUS_CFG: Record<string, { label: string; badge: string; dot: string; activeBadge: string }> = {
  draft: {
    label:       'Draft',
    badge:       'text-amber-700 bg-amber-50 border-amber-200',
    activeBadge: 'text-amber-300 bg-white/10 border-white/20',
    dot:         'bg-amber-400',
  },
  submitted: {
    label:       'Submitted',
    badge:       'text-blue-700 bg-blue-50 border-blue-200',
    activeBadge: 'text-blue-200 bg-white/10 border-white/20',
    dot:         'bg-blue-400',
  },
  under_review: {
    label:       'Under Review',
    badge:       'text-indigo-700 bg-indigo-50 border-indigo-200',
    activeBadge: 'text-indigo-200 bg-white/10 border-white/20',
    dot:         'bg-indigo-400',
  },
  approved: {
    label:       'Approved',
    badge:       'text-emerald-700 bg-emerald-50 border-emerald-200',
    activeBadge: 'text-emerald-200 bg-white/10 border-white/20',
    dot:         'bg-emerald-500',
  },
};
const getStatusCfg = (s: string) => STATUS_CFG[s] ?? STATUS_CFG.draft;

// ─── Types ────────────────────────────────────────────────────────────────────
interface DeptPlanWithName extends DepartmentBudgetPlan {
  dept_name:         string;
  dept_abbreviation: string;
  dept_logo:         string | null;
}

// const CATEGORY_COLORS: Record<number, { card: string; activeBorder: string; dot: string }> = {
//   1: { card: 'bg-white border-blue-400',   activeBorder: 'border-blue-400',   dot: 'bg-blue-400'  },
//   2: { card: 'bg-white border-pink-400',   activeBorder: 'border-pink-400',   dot: 'bg-pink-400'  },
//   3: { card: 'bg-white border-green-400',  activeBorder: 'border-green-400',  dot: 'bg-green-400' },
//   4: { card: 'bg-white border-amber-400',  activeBorder: 'border-amber-400',  dot: 'bg-amber-400' },
// };

// const getCatColors = (id: number | undefined) =>
//   CATEGORY_COLORS[id ?? 0] ?? { card: 'bg-white border-gray-300', activeBorder: 'border-gray-500', dot: 'bg-gray-400' };
const CATEGORY_COLORS: Record<number, { card: string; activeBorder: string; dot: string }> = {
  1: { card: 'bg-white border-cat-1', activeBorder: 'border-cat-1', dot: 'bg-cat-1' },
  2: { card: 'bg-white border-cat-2', activeBorder: 'border-cat-2', dot: 'bg-cat-2' },
  3: { card: 'bg-white border-cat-3', activeBorder: 'border-cat-3', dot: 'bg-cat-3' },
  4: { card: 'bg-white border-cat-4', activeBorder: 'border-cat-4', dot: 'bg-cat-4' },
};

const getCatColors = (id: number | undefined) =>
  CATEGORY_COLORS[id ?? 0] ?? { card: 'bg-white border-cat-none', activeBorder: 'border-cat-none', dot: 'bg-cat-none' };

// ─── Dept Avatar ──────────────────────────────────────────────────────────────
const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-violet-100 text-violet-700',
  'bg-teal-100 text-teal-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-orange-100 text-orange-700',
  'bg-pink-100 text-pink-700',
  'bg-emerald-100 text-emerald-700',
  'bg-indigo-100 text-indigo-700',
];

function deptColorClass(deptId: number, active: boolean) {
  if (active) return 'bg-white/15 text-white';
  return AVATAR_COLORS[deptId % AVATAR_COLORS.length];
}

const STORAGE_URL = import.meta.env.VITE_STORAGE_URL ?? '/storage';

function DeptAvatar({
  logo,
  abbreviation,
  name,
  deptId,
  active,
  size = 'md',
}: {
  logo: string | null;
  abbreviation: string;
  name: string;
  deptId: number;
  active: boolean;
  size?: 'sm' | 'md';
}) {
  const dim   = size === 'sm' ? 'w-7 h-7' : 'w-8 h-8';
  const text  = size === 'sm' ? 'text-[10px]' : 'text-[11px]';
  const label = abbreviation
    ? abbreviation.replace(/[()]/g, '').trim().slice(0, 4)
    : name.slice(0, 2).toUpperCase();

  if (logo) {
    return (
      <div className={cn(dim, 'rounded-lg overflow-hidden flex-shrink-0 border border-gray-200/60')}>
        <img
          src={`${STORAGE_URL}/${logo}`}
          alt={abbreviation || name}
          className="w-full h-full object-cover"
          onError={e => {
            (e.currentTarget.parentElement as HTMLElement).innerHTML =
              `<span class="${cn(dim, 'rounded-lg flex items-center justify-center font-bold', text, deptColorClass(deptId, active))}">${label}</span>`;
          }}
        />
      </div>
    );
  }

  return (
    <div className={cn(
      dim, 'rounded-lg flex items-center justify-center flex-shrink-0 font-bold transition-colors',
      text,
      deptColorClass(deptId, active),
    )}>
      {label}
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const LBPForms: React.FC = () => {
  useEffect(() => { ensurePanelAnim(); }, []);
  const { user } = useAuth();
  const location = useLocation();
  const notifications = useNotificationStore(s => s.notifications);
  const markRead      = useNotificationStore(s => s.markRead);
  const isAdmin = user?.role === 'admin';
  const isViewer = user?.role === 'viewer';

  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const activePlanId = activePlan?.budget_plan_id;

  const queryClient = useQueryClient();

  // ── Static reference data — cached once, shared across every click ────────
  const { data: classifications = [] } = useQuery<ExpenseClassification[]>({
    queryKey: ['expense-classifications'],
    queryFn: () => API.get('/expense-classifications').then(r => r.data.data ?? []),
  });

  const { data: expenseItems = [] } = useQuery<ExpenseItem[]>({
    queryKey: ['expense-class-items'],
    queryFn: () => API.get('/expense-class-items').then(r => r.data.data ?? []),
  });

  const { data: categoryList = [] } = useQuery<{ dept_category_id: number; dept_category_name: string }[]>({
    queryKey: ['department-categories'],
    queryFn: () => API.get('/department-categories').then(r => r.data.data ?? []),
  });

  const categoryMap = useMemo(() => {
    const map: Record<number, string> = {};
    categoryList.forEach(c => { map[c.dept_category_id] = c.dept_category_name; });
    return map;
  }, [categoryList]);

  // ── Department budget plans — keyed on the active budget year only ────────
  // Clicking a department does NOT change activePlanId, so this stays cached.
  const {
    data: rawDeptPlans = [],
    isLoading: deptPlansLoading,
  } = useQuery<DepartmentBudgetPlan[]>({
    queryKey: ['department-budget-plans', activePlanId],
    queryFn: () =>
      API.get('/department-budget-plans', { params: { budget_plan_id: activePlanId, include: 'category' } })
        .then(r => r.data.data ?? []),
    enabled: !!activePlanId,
  });

  const deptPlans: DeptPlanWithName[] = useMemo(() => {
    return rawDeptPlans
      .map(p => ({
        ...p,
        dept_name:         p.department?.dept_name         ?? 'Unknown',
        dept_abbreviation: p.department?.dept_abbreviation ?? '',
        dept_logo:         p.department?.logo              ?? null,
        department: p.department
          ? { ...p.department, category: p.department.category ?? null }
          : undefined,
      }))
      .sort((a, b) => {
        const catA = a.department?.dept_category_id ?? 999;
        const catB = b.department?.dept_category_id ?? 999;
        if (catA !== catB) return catA - catB;
        return (a.department?.sort_order ?? 0) - (b.department?.sort_order ?? 0);
      });
  }, [rawDeptPlans]);

  const loading = deptPlansLoading;

  const [selectedPlanId,  setSelectedPlanId]  = useState<number | null>(null);
  const [activeFormTab,   setActiveFormTab]   = useState('2');
  const [search,          setSearch]         = useState('');
  const [panelKey,        setPanelKey]       = useState(0);
//   const [approveTarget,   setApproveTarget]  = useState<DeptPlanWithName | null>(null);
//   const [rejectTarget,    setRejectTarget]   = useState<DeptPlanWithName | null>(null);
    const [approveTarget,    setApproveTarget]    = useState<DeptPlanWithName | null>(null);
  const [rejectTarget,     setRejectTarget]     = useState<DeptPlanWithName | null>(null);
  const [acknowledgeTarget, setAcknowledgeTarget] = useState<DeptPlanWithName | null>(null);
  const [acting,          setActing]         = useState(false);
  const [acknowledging,   setAcknowledging]  = useState(false);
  const [statusFilter,   setStatusFilter]   = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [cardView,       setCardView]       = useState<boolean>(false);

  // ── Default selection once plans are loaded ────────────────────────────────
  useEffect(() => {
    if (!selectedPlanId && deptPlans.length > 0) {
      const firstSubmitted = deptPlans.find(p => p.status === 'submitted');
      setSelectedPlanId((firstSubmitted ?? deptPlans[0]).dept_budget_plan_id);
    }
  }, [deptPlans, selectedPlanId]);

  // ── Refresh the dept plans list (status badges, totals) after an action ───
  const refreshDeptPlans = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['department-budget-plans', activePlanId] });
  }, [queryClient, activePlanId]);

  const locationState = location.state as { deptId?: number } | null;

  useEffect(() => {
    const incoming = locationState?.deptId;
    if (!incoming || !deptPlans.length) return;
    const match = deptPlans.find(p => p.dept_id === incoming);
    if (match) {
        setSelectedPlanId(match.dept_budget_plan_id);
        setPanelKey(k => k + 1);
        markDeptNotificationsRead(incoming);
        window.history.replaceState({}, '');
    }
  }, [deptPlans, locationState?.deptId]);

  const selectedPlan = useMemo(
    () => deptPlans.find(p => p.dept_budget_plan_id === selectedPlanId) ?? null,
    [deptPlans, selectedPlanId]
  );

  // ── Past-year / obligation-year plans for the selected department ─────────
  // Cached per [deptId, year] — switching back and forth between departments
  // (or remounting Form2) reuses the cache instead of refetching.
  const deptId = selectedPlan?.dept_id;
  const pastYear = activePlan ? activePlan.year - 1 : undefined;
  const oblYear  = activePlan ? activePlan.year - 2 : undefined;

 const [pastYearQ, oblYearQ] = useQueries({
    queries: [
      {
        queryKey: ['dept-budget-plan-by-year', deptId ?? 'none', pastYear ?? 'none', 'past'],
        queryFn: () =>
          API.get(`/department-budget-plans/by-dept-year/${deptId}/${pastYear}`)
            .then(r => r.data.data)
            .catch(() => null),
        enabled: !!deptId && !!pastYear,
      },
      {
        queryKey: ['dept-budget-plan-by-year', deptId ?? 'none', oblYear ?? 'none', 'obl'],
        queryFn: () =>
          API.get(`/department-budget-plans/by-dept-year/${deptId}/${oblYear}`)
            .then(r => r.data.data)
            .catch(() => null),
        enabled: !!deptId && !!oblYear,
      },
    ],
  });

  const pastYearPlan: DepartmentBudgetPlan | null = pastYearQ.data ?? null;
  const obligationYearPlan: DepartmentBudgetPlan | null = oblYearQ.data ?? null;
  const loadingPast = (pastYearQ.isLoading && !!deptId) || (oblYearQ.isLoading && !!deptId);

  const markDeptNotificationsRead = useCallback((deptId: number) => {
    notifications
        .filter(n => n.dept_id === deptId && !n.read_at)
        .forEach(n => markRead(n.id));
}, [notifications, markRead]);

  const handleSelectPlan = (id: number) => {
      if (id === selectedPlanId) return;
      setSelectedPlanId(id);
      setPanelKey(k => k + 1);
      const plan = deptPlans.find(p => p.dept_budget_plan_id === id);
      if (plan) markDeptNotificationsRead(plan.dept_id);
  };

//   // ── Called by Form2 when an item is saved ─────────────────────────────────
//   const handleItemUpdate = useCallback(() => {
//     if (!selectedPlan || !activePlan) return;
//     queryClient.invalidateQueries({
//       queryKey: ['dept-budget-plan-by-year', selectedPlan.dept_id],
//     });
//     refreshDeptPlans();
//   }, [selectedPlan, activePlan, refreshDeptPlans, queryClient]);

// ── Called by Form2 when an item is saved ─────────────────────────────────
  // Refetches the department list so BudgetComparisonBanner reflects the
  // new totals. Runs once per save (saves only fire on blur, not per keystroke).
  const handleItemUpdate = useCallback(() => {
    refreshDeptPlans();
  }, [refreshDeptPlans]);

  // ── Actions ────────────────────────────────────────────────────────────────
//   const handleAcknowledge = async (plan: DeptPlanWithName) => {
//     setAcknowledging(true);
//     try {
//       await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/acknowledge`);
//       toast.success(`${plan.dept_abbreviation} proposal moved to review.`);
//       refreshDeptPlans();
//     } catch (err: any) {
//       toast.error(err?.response?.data?.message ?? 'Failed to acknowledge.');
//     } finally {
//       setAcknowledging(false);
//     }
//   };
const handleAcknowledge = async () => {
    if (!acknowledgeTarget) return;
    setAcknowledging(true);
    try {
      await API.post(`/department-budget-plans/${acknowledgeTarget.dept_budget_plan_id}/acknowledge`);
      toast.success(`${acknowledgeTarget.dept_abbreviation} proposal moved to review.`);
      setAcknowledgeTarget(null);
      refreshDeptPlans();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to acknowledge.');
    } finally {
      setAcknowledging(false);
    }
  };

  const handleApprove = async () => {
    if (!approveTarget) return;
    setActing(true);
    try {
      await API.post(`/department-budget-plans/${approveTarget.dept_budget_plan_id}/approve`);
      toast.success(`${approveTarget.dept_abbreviation} plan approved.`);
      setApproveTarget(null);
      refreshDeptPlans();
      refreshSubmittedCount();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to approve.');
    } finally { setActing(false); }
  };

  const handleReject = async () => {
    if (!rejectTarget) return;
    setActing(true);
    try {
      await API.post(`/department-budget-plans/${rejectTarget.dept_budget_plan_id}/reject`);
      toast.success(`${rejectTarget.dept_abbreviation} plan returned to draft.`);
      setRejectTarget(null);
      refreshDeptPlans();
      refreshSubmittedCount();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to return to draft.');
    } finally { setActing(false); }
  };

  // ── Filtered list ──────────────────────────────────────────────────────────
  const getCategoryName = useCallback(
    (p: DeptPlanWithName) =>
      p.department?.category?.dept_category_name
      ?? categoryMap[p.department?.dept_category_id ?? -1]
      ?? null,
    [categoryMap]
  );

  const deptCategories = useMemo(() => {
    const cats = deptPlans
      .map(p => getCategoryName(p))
      .filter((c): c is string => !!c);
    return Array.from(new Set(cats)).sort();
  }, [deptPlans, getCategoryName]);

  const filteredPlans = useMemo(() => {
    const q = search.toLowerCase();
    return deptPlans.filter(p => {
      const matchSearch =
        !q ||
        p.dept_name.toLowerCase().includes(q) ||
        p.dept_abbreviation.toLowerCase().includes(q);

      const matchStatus =
        statusFilter === 'all' || p.status === statusFilter;

      const matchCategory =
        categoryFilter === 'all' ||
        (getCategoryName(p) ?? '') === categoryFilter;

      return matchSearch && matchStatus && matchCategory;
    });
  }, [deptPlans, search, statusFilter, categoryFilter, getCategoryName]);

  const groupedPlans = useMemo(() => {
    const map = new Map<string, { categoryName: string; categoryId: number; plans: DeptPlanWithName[] }>();
    filteredPlans.forEach(plan => {
      const categoryName = getCategoryName(plan) ?? 'Uncategorized';
      const categoryId    = plan.department?.dept_category_id ?? 9999;
      if (!map.has(categoryName)) {
        map.set(categoryName, { categoryName, categoryId, plans: [] });
      }
      map.get(categoryName)!.plans.push(plan);
    });
    return Array.from(map.values()).sort((a, b) => a.categoryId - b.categoryId);
  }, [filteredPlans, getCategoryName]);

  const counts = useMemo(() => ({
    submitted: deptPlans.filter(p => p.status === 'submitted').length,
    approved:  deptPlans.filter(p => p.status === 'approved').length,
    draft:     deptPlans.filter(p => p.status === 'draft').length,
  }), [deptPlans]);

  // ── Guards ─────────────────────────────────────────────────────────────────
  if (planLoading || loading) return <LoadingState />;
  if (!activePlan) return (
    <div className="p-6 flex items-center justify-center h-full">
      <p className="text-center text-gray-400 text-sm">
        No active budget plan found. Please activate one in Budget Plans.
      </p>
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-full min-h-0 overflow-hidden w-full">

      {/* ══ LEFT RAIL ══ */}
      <aside className="w-56 shrink-0 border-r border-gray-100 bg-gray-50/40 flex flex-col py-4 px-2 gap-0.5 overflow-y-auto">

        <div className="px-2.5 mb-3">
          <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400 mb-0.5">
            Budget Proposals Review
          </p>
          <p className="text-[13px] font-semibold text-gray-800">Budget Year {activePlan.year}</p>
        </div>

        {/* Search */}
 <div className="px-1 mb-2">
  <div className="relative">
    <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
    <Input
      placeholder="Search…"
      value={search}
      onChange={e => setSearch(e.target.value)}
      className="pl-8 h-8 text-xs border-gray-200 bg-white"
    />
  </div>
</div>

{/* Status filter */}
<div className="px-1 mb-1">
  <p className="px-1.5 mb-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
    Status
  </p>
  <div className="flex flex-col gap-0.5">
    {(['all', 'draft', 'submitted', 'under_review', 'approved'] as const).map(s => {
      const labels: Record<string, string> = {
        all: 'All', draft: 'Draft', submitted: 'Submitted', under_review: 'Under Review', approved: 'Approved',
      };
      const dots: Record<string, string> = {
        all: 'bg-gray-400', draft: 'bg-amber-400',
        submitted: 'bg-blue-400', under_review: 'bg-indigo-400', approved: 'bg-emerald-500',
      };
      const active = statusFilter === s;
      return (
        <button
          key={s}
          onClick={() => setStatusFilter(s)}
          className={cn(
            'flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-left text-xs transition-all',
            active
              ? 'bg-gray-900 text-white font-medium'
              : 'text-gray-600 hover:bg-white/70 hover:text-gray-800',
          )}
        >
          <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', dots[s])} />
          {labels[s]}
          {s !== 'all' && (
            <span className={cn(
              'ml-auto text-[9px] font-semibold px-1.5 py-0.5 rounded-full border',
              active
                ? 'text-gray-300 bg-white/10 border-white/20'
                : STATUS_CFG[s]?.badge ?? '',
            )}>
              {deptPlans.filter(p => p.status === s).length}
            </span>
          )}
        </button>
      );
    })}
  </div>
</div>

{/* Category filter — only shown if there are categories */}
{deptCategories.length > 0 && (
  <div className="px-1 mb-2">
    <p className="px-1.5 mb-1 mt-2 text-[9px] font-semibold uppercase tracking-widest text-gray-400">
      Category
    </p>
    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
      <SelectTrigger className="h-8 text-xs border-gray-200 bg-white">
        <SelectValue placeholder="All Categories" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="all" className="text-xs">
          All Categories
        </SelectItem>
        {deptCategories.map(cat => (
          <SelectItem key={cat} value={cat} className="text-xs">
            {cat}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </div>
)}

{/* Divider before list */}
<div className="border-t border-gray-100 mx-2 mb-2" />

        {/* Department list — grouped by category */}
        {filteredPlans.length === 0 ? (
          <p className="px-2.5 py-6 text-xs text-gray-400 text-center">No departments found.</p>
        ) : (
          groupedPlans.map(group => (
            <div key={group.categoryName} className="mb-3 last:mb-0">
              <p className="px-2.5 mb-1 mt-1 text-[9px] font-semibold uppercase tracking-widest text-gray-400/70 truncate">
                {group.categoryName}
              </p>
              <div className="flex flex-col gap-0.5">
                {group.plans.map(plan => {
                  const cfg    = getStatusCfg(plan.status);
                  const active = plan.dept_budget_plan_id === selectedPlanId;

                  return (
                    <button
                      key={plan.dept_budget_plan_id}
                      onClick={() => handleSelectPlan(plan.dept_budget_plan_id)}
                      className={cn(
                        'group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-left transition-all border',
                        active
                          ? cn('bg-gray-900 text-white shadow-md', getCatColors(plan.department?.dept_category_id).activeBorder)
                          : cn(getCatColors(plan.department?.dept_category_id).card, 'text-gray-700'),
                      )}
                    >
                      <DeptAvatar
                        logo={plan.dept_logo}
                        abbreviation={plan.dept_abbreviation}
                        name={plan.dept_name}
                        deptId={plan.dept_id}
                        active={active}
                        size="sm"
                      />

                      <div className="flex-1 min-w-0">
                        <span className={cn(
                          'text-[12px] font-medium leading-tight block truncate',
                          active ? 'text-white' : 'text-gray-800',
                        )}>
                          {plan.dept_abbreviation
                            ? plan.dept_abbreviation.replace(/[()]/g, '').trim()
                            : plan.dept_name}
                        </span>
                        {active && (
                          <span className={cn(
                            'text-[10px] leading-tight block truncate mt-0.5',
                            active ? 'text-gray-300' : 'text-gray-400',
                          )}>
                            {plan.dept_name}
                          </span>
                        )}
                      </div>

                      <span className={cn(
                        'text-[9px] font-semibold px-1.5 py-0.5 rounded-full border flex-shrink-0',
                        active ? 'bg-white/20 text-white border-white/30' : cfg.badge,
                      )}>
                        {cfg.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </aside>

      {/* ══ MAIN CONTENT ══ */}
      <div className="flex-1 min-w-0 w-0 flex flex-col overflow-hidden bg-gray-50/20">
        {!selectedPlan ? (
          <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
            Select a department to review their forms.
          </div>
        ) : (
          <div
            key={panelKey}
            className="flex-1 flex flex-col overflow-hidden"
            style={{ animation: '_panelIn 280ms cubic-bezier(0.22, 1, 0.36, 1) both' }}
          >
            {/* Plan header */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <DeptAvatar
                  logo={selectedPlan.dept_logo}
                  abbreviation={selectedPlan.dept_abbreviation}
                  name={selectedPlan.dept_name}
                  deptId={selectedPlan.dept_id}
                  active={false}
                  size="md"
                />
                <div className="min-w-0">
                  <h3 className="text-[15px] font-semibold text-gray-900 leading-tight truncate">
                    {selectedPlan.dept_name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    {(() => {
                      const cfg = getStatusCfg(selectedPlan.status);
                      return (
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          cfg.badge,
                        )}>
                          <span className={cn('w-1 h-1 rounded-full', cfg.dot)} />
                          {cfg.label}
                        </span>
                      );
                    })()}
                    {/* <span className="text-[11px] text-gray-400">Budget Year {activePlan.year}</span> */}
                  </div>
                </div>
              </div>

              {/* Action buttons */}
<div className="flex items-center gap-2 flex-shrink-0">
  <div className="flex items-center gap-1.5 mr-1">
    <span className="text-[10px] text-gray-400 font-medium">Review Mode</span>
    <button
      onClick={() => setCardView(v => !v)}
      className={cn(
        'relative inline-flex h-5 w-9 items-center rounded-full border transition-colors focus:outline-none',
        cardView ? 'bg-gray-900 border-gray-900' : 'bg-gray-200 border-gray-300',
      )}
      role="switch"
      aria-checked={cardView}
    >
      <span className={cn(
        'inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform',
        cardView ? 'translate-x-[18px]' : 'translate-x-[2px]',
      )} />
    </button>
  </div>
 {!isViewer && selectedPlan.status === 'submitted' && (
    <>
      <Button size="sm" variant="outline"
        onClick={() => setRejectTarget(selectedPlan)}
        className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
        Return to Draft
      </Button>
      <Button size="sm"
        onClick={() => setAcknowledgeTarget(selectedPlan)}
        disabled={acknowledging}
        className="gap-1.5 text-xs h-8 bg-blue-600 hover:bg-blue-700 text-white">
        <EyeIcon className="w-3.5 h-3.5" />
        Acknowledge
      </Button>
    </>
  )}
  {!isViewer && selectedPlan.status === 'under_review' && (
    <>
      <Button size="sm" variant="outline"
        onClick={() => setRejectTarget(selectedPlan)}
        className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600 hover:text-gray-900">
        <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
        Return to Draft
      </Button>
      <Button size="sm"
        onClick={() => setApproveTarget(selectedPlan)}
        className="gap-1.5 text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white">
        <CheckCircleIcon className="w-3.5 h-3.5" />
        Approve
      </Button>
    </>
  )}
  {!isViewer && selectedPlan.status === 'approved' && (
    <Button size="sm" variant="outline"
      onClick={() => setRejectTarget(selectedPlan)}
      className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600">
      <ArrowUturnLeftIcon className="w-3.5 h-3.5" />
      Return to Draft
    </Button>
  )}
</div>
            </div>

            {/* Progress stepper */}
            <div className="shrink-0 bg-white border-b border-gray-100 px-6 py-4">
              <BudgetPlanStepper
                status={selectedPlan.status}
                submittedAt={selectedPlan.submitted_at}
                acknowledgedAt={selectedPlan.acknowledged_at}
                approvedAt={selectedPlan.approved_at}
                createdAt={selectedPlan.created_at}
                isAdmin={isAdmin}
              />
            </div>

            {/* Forms area */}
            <div className="flex-1 overflow-y-auto px-6 py-5" style={{ isolation: 'auto' }}>
              {loadingPast ? (
                <div className="space-y-3">
                  <Skeleton className="h-10 w-72 rounded-lg" />
                  <Skeleton className="h-64 w-full rounded-xl" />
                </div>
            //   ) : (
            //     <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
            ) : (
                <>
                  {/* <BudgetComparisonBanner
                    plan={selectedPlan}
                    pastYearPlan={pastYearPlan}
                  /> */}
                  {!loadingPast && (
                    <BudgetComparisonBanner
                      plan={selectedPlan}
                      pastYearPlan={pastYearPlan}
                    />
                  )}

                  <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
                  <TabsList className="h-9 bg-white border border-gray-200 rounded-lg p-1 inline-flex gap-0.5 mb-4">
                    <TabsTrigger value="2" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-gray-900 data-[state=active]:text-white text-gray-500">
                      Form 2 — Expenditures
                    </TabsTrigger>
                    <TabsTrigger value="3" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-gray-900 data-[state=active]:text-white text-gray-500">
                      Form 3 — Personnel
                    </TabsTrigger>
                    <TabsTrigger value="4" className="rounded-md text-xs font-medium px-3 h-7 data-[state=active]:bg-gray-900 data-[state=active]:text-white text-gray-500">
                      Form 4 — AIP Programs
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="2">
                    <Form2
                      plan={selectedPlan}
                      pastYearPlan={pastYearPlan}
                      obligationYearPlan={obligationYearPlan}
                      classifications={classifications}
                      expenseItems={expenseItems}
                      isEditable={isAdmin}
                      isAdmin={isAdmin}
                      onItemUpdate={handleItemUpdate}
                      cardView={cardView}
                    />
                  </TabsContent>
                  <TabsContent value="3">
                    <Form3
                      plan={selectedPlan}
                      pastYearPlan={pastYearPlan}
                      departmentId={selectedPlan.dept_id}
                      isEditable={isAdmin}
                      isAdmin={isAdmin}
                    />
                  </TabsContent>
                  <TabsContent value="4">
                    <Form4 plan={selectedPlan} isEditable={isAdmin} />
                  </TabsContent>
                {/* </Tabs>
              )} */}
              </Tabs>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ════ APPROVE CONFIRM ════ */}
      <AlertDialog open={!!approveTarget} onOpenChange={o => { if (!o) setApproveTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Approve {approveTarget?.dept_abbreviation}?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              This will mark the budget plan for{' '}
              <span className="font-medium text-gray-700">{approveTarget?.dept_name}</span> as
              approved. The department head will not be able to edit it further.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700" onClick={handleApprove} disabled={acting}>
                {acting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Approving…</> : 'Approve'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════ ACKNOWLEDGE CONFIRM ════ */}
      <AlertDialog open={!!acknowledgeTarget} onOpenChange={o => { if (!o) setAcknowledgeTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Acknowledge {acknowledgeTarget?.dept_abbreviation}'s proposal?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              Acknowledging confirms that the budget officer has received{' '}
              <span className="font-medium text-gray-700">{acknowledgeTarget?.dept_name}</span>'s
              budget proposal. It will move to <span className="font-medium text-gray-700">Under Review</span> while
              the budget office evaluates it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white" onClick={handleAcknowledge} disabled={acknowledging}>
                {acknowledging ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Acknowledging…</> : 'Acknowledge'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════ RETURN TO DRAFT CONFIRM ════ */}
      <AlertDialog open={!!rejectTarget} onOpenChange={o => { if (!o) setRejectTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-gray-900">
              Return to draft?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              The budget plan for{' '}
              <span className="font-medium text-gray-700">{rejectTarget?.dept_name}</span> will be
              returned to draft so the department head can revise and resubmit.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white" onClick={handleReject} disabled={acting}>
                {acting ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Returning…</> : 'Return to Draft'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LBPForms;
