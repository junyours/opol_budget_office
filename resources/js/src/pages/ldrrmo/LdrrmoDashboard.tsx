// import React, { useState, useEffect } from "react";
// import { useNavigate } from "react-router-dom";
// import { cn } from "@/src/lib/utils";
// import {
//   ShieldCheckIcon,
//   DocumentTextIcon,
//   ChevronRightIcon,
// } from "@heroicons/react/24/outline";
// import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
// import API from "@/src/services/api";

// // ─── Types ─────────────────────────────────────────────────────────────────────

// interface LdrrmfSummary {
//   budget_plan_id: number;
//   source: string;
//   total_70pct: number;   // actual items allocated so far
//   reserved_30: number;
//   calamity_fund: number; // full 5%
// }

// interface SpecialAccountFund {
//   source: string;
//   dept_name: string;
//   dept_abbreviation: string;
//   logo: string | null;
//   total_5pct: number;      // full 5% calamity fund
//   qrf_30: number;          // 30% of total_5pct  (derived, not from API)
//   preparedness_70: number; // 70% of total_5pct  (derived, not from API)
//   allocated_70: number;    // actual items entered so far (from ldrrmfip/summary)
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const peso = (v: number) =>
//   `₱${Number.isFinite(v) ? v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;

// function Shimmer({ className }: { className?: string }) {
//   return (
//     <div className={cn("relative overflow-hidden rounded-xl bg-zinc-100", className)}>
//       <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
//     </div>
//   );
// }

// // ─── LDRRMF Card ──────────────────────────────────────────────────────────────
// // budgeted        = full 5% calamity fund
// // qrf             = budgeted × 0.30  (reserved, not yet disbursed)
// // predis          = budgeted × 0.70  (ceiling for Pre-Disaster spending)
// // predisAllocated = actual items entered so far

// const LdrrmfCard: React.FC<{
//   label: string;
//   abbr?: string;
//   logoUrl?: string | null;
//   budgeted: number;
//   qrf: number;
//   predis: number;
//   predisAllocated: number;
//   loading: boolean;
//   onClick?: () => void;
// }> = ({ label, abbr, logoUrl, budgeted, qrf, predis, predisAllocated, loading, onClick }) => {
//   const safeAllocated  = Number.isFinite(predisAllocated) ? predisAllocated : 0;
//   const predisRemaining = Math.max(0, predis - safeAllocated);
//   const pct = predis > 0 ? Math.round((safeAllocated / predis) * 100) : 0;

//   const [imgFailed, setImgFailed] = useState(false);
//   const showImg = !!logoUrl && !imgFailed;

//   return (
//     <div
//       onClick={onClick}
//       className={cn(
//         "rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden",
//         onClick && "cursor-pointer hover:border-zinc-200 hover:shadow-md transition-all"
//       )}
//     >
//       {/* Header */}
//       <div className="px-4 pt-4 pb-3 border-b border-zinc-100 flex items-center gap-3">
//         {/* Logo or fallback */}
//         <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
//           {showImg ? (
//             <img
//               src={logoUrl!}
//               alt={label}
//               className="w-full h-full object-contain p-0.5"
//               onError={() => setImgFailed(true)}
//             />
//           ) : abbr ? (
//             <span className="text-[10px] font-bold text-red-600 leading-none">{abbr}</span>
//           ) : (
//             <ShieldCheckIcon className="w-4 h-4 text-red-500" />
//           )}
//         </div>
//         <div className="min-w-0 flex-1">
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">5% LDRRMF</p>
//           <p className="text-xs font-semibold text-zinc-700 leading-tight truncate">{label}</p>
//         </div>
//         {onClick && <ChevronRightIcon className="w-3.5 h-3.5 text-zinc-300 flex-shrink-0" />}
//       </div>

//       <div className="p-4 space-y-3">
//         {/* Budgeted total */}
//         <div className="flex items-baseline justify-between">
//           <span className="text-[10px] font-medium text-zinc-400 uppercase tracking-widest">budgeted</span>
//           {loading
//             ? <Shimmer className="h-5 w-24" />
//             : <span className="text-lg font-bold text-zinc-900 tabular-nums">{peso(budgeted)}</span>
//           }
//         </div>

//         <div className="grid grid-cols-2 gap-2">

//           {/* 30% QRF */}
//           <div className="rounded-xl bg-rose-50 border border-rose-100 p-3 space-y-1.5">
//             <div className="flex items-center justify-between">
//               <p className="text-[10px] font-bold uppercase tracking-widest text-rose-700">30% QRF</p>
//               <span className="text-[9px] font-semibold text-rose-600 bg-rose-100 rounded px-1.5 py-0.5">reserved</span>
//             </div>
//             {loading ? <Shimmer className="h-5 w-full" /> : (
//               <>
//                 <div className="flex items-baseline gap-1">
//                   <p className="text-base font-bold text-rose-800">{peso(qrf)}</p>
//                   <p className="text-[10px] text-rose-400">/ {peso(qrf)}</p>
//                 </div>
//                 <p className="text-[10px] text-rose-500">reserved · not yet disbursed</p>
//                 <div className="h-1 bg-rose-200 rounded-full overflow-hidden">
//                   <div className="h-full w-full bg-rose-400 rounded-full" />
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span className="text-[10px] text-rose-500">Available</span>
//                   <span className="text-[10px] font-bold font-mono text-rose-700">{peso(qrf)}</span>
//                 </div>
//               </>
//             )}
//           </div>

//           {/* 70% Pre-Disaster */}
//           <div className="rounded-xl bg-orange-50 border border-orange-100 p-3 space-y-1.5">
//             <div className="flex items-center justify-between">
//               <p className="text-[10px] font-bold uppercase tracking-widest text-orange-700">70% Pre-Disaster</p>
//               {!loading && (
//                 <span className="text-[9px] font-semibold text-orange-600 bg-orange-100 rounded px-1.5 py-0.5">{pct}%</span>
//               )}
//             </div>
//             {loading ? <Shimmer className="h-5 w-full" /> : (
//               <>
//                 <div className="flex items-baseline gap-1">
//                   <p className="text-base font-bold text-orange-800">{peso(safeAllocated)}</p>
//                   <p className="text-[10px] text-orange-400">/ {peso(predis)}</p>
//                 </div>
//                 <p className="text-[10px] text-orange-500">allocated</p>
//                 <div className="h-1 bg-orange-200 rounded-full overflow-hidden">
//                   <div
//                     className="h-full bg-orange-400 rounded-full transition-all duration-700"
//                     style={{ width: `${Math.min(100, pct)}%` }}
//                   />
//                 </div>
//                 <div className="flex items-center justify-between">
//                   <span className="text-[10px] text-orange-500">Remaining</span>
//                   <span className="text-[10px] font-bold font-mono text-orange-700">{peso(predisRemaining)}</span>
//                 </div>
//               </>
//             )}
//           </div>
//         </div>

//         <p className="text-[9px] text-zinc-300 text-right">JMC 2013-1 · R.A. 10121</p>
//       </div>
//     </div>
//   );
// };

// // ─── Main Dashboard ────────────────────────────────────────────────────────────

// const LdrrmoDashboard: React.FC = () => {
//   const navigate = useNavigate();
//   const { activePlan, loading: planLoading } = useActiveBudgetPlan();
//   const planId = activePlan?.budget_plan_id;

//   const [gfSummary,   setGfSummary]   = useState<LdrrmfSummary | null>(null);
//   const [saSummaries, setSaSummaries] = useState<SpecialAccountFund[]>([]);
//   const [saLoading,   setSaLoading]   = useState(false);
//   const [gfLoading,   setGfLoading]   = useState(false);

//   // ── GF: ldrrmfip/summary → calamity_fund (full 5%) + total_70pct (allocated) ──
//   useEffect(() => {
//     if (!planId) return;
//     setGfLoading(true);
//     API.get("/ldrrmfip/summary", { params: { budget_plan_id: planId, source: "general-fund" } })
//       .then(r => {
//         const d = r.data?.data ?? r.data ?? {};
//         setGfSummary({
//           budget_plan_id: d.budget_plan_id,
//           source:         d.source,
//           total_70pct:    Number(d.total_70pct    ?? 0),
//           reserved_30:    Number(d.reserved_30    ?? 0),
//           calamity_fund:  Number(d.calamity_fund  ?? 0),
//         });
//       })
//       .catch(() => setGfSummary(null))
//       .finally(() => setGfLoading(false));
//   }, [planId]);

//   // ── SA: ldrrmf-plan gives total_5pct per source;
//   //        then ldrrmfip/summary per source gives actual allocated (total_70pct).
//   //        qrf/predis are ALWAYS derived as 30%/70% of total_5pct. ─────────────
//   useEffect(() => {
//     if (!planId) return;
//     setSaLoading(true);

//     API.get("/ldrrmf-plan")
//   .then(async r => {
//     const sections: any[] = r.data?.data?.special_accounts ?? [];

//     // Fetch departments to get logos
//     let deptMap: Record<string, { logo: string | null; abbreviation: string }> = {};
//     try {
//       const deptRes = await API.get("/departments");
//       const depts: any[] = deptRes.data?.data ?? deptRes.data ?? [];
//       depts.forEach((d: any) => {
//   if (d.dept_abbreviation) {
//     deptMap[d.dept_abbreviation.toLowerCase()] = {
//       logo: d.logo ? `/storage/${d.logo}` : null,
//       abbreviation: d.dept_abbreviation ?? "",
//     };
//   }
// });
// // console.log("deptMap keys:", Object.keys(deptMap));
//     } catch { /* leave empty */ }

//         const mapped: SpecialAccountFund[] = await Promise.all(
//           sections.map(async (s: any) => {
//             // total_5pct from the plan — this is the true 5% calamity fund budget
//             const total5pct = Number(s.budget_year?.total_5pct ?? 0);

//             // actual items allocated (70% bucket spend) from ldrrmfip/summary
//             let allocated70 = 0;
//             try {
//               const sumRes = await API.get("/ldrrmfip/summary", {
//                 params: { budget_plan_id: planId, source: s.source },
//               });
//               const d = sumRes.data?.data ?? sumRes.data ?? {};
//               allocated70 = Number(d.total_70pct ?? 0);
//             } catch { /* leave 0 */ }

//             return {
//               source:            String(s.source),
//               dept_name:         String(s.dept_name),
//               dept_abbreviation: String(s.dept_abbreviation ?? ""),
//             //   logo:              s.logo ? `/storage/${s.logo}` : null,
//             logo: deptMap[String(s.source).toLowerCase()]?.logo ?? null,
//               total_5pct:        total5pct,
//               qrf_30:            total5pct * 0.30,
//               preparedness_70:   total5pct * 0.70,
//               allocated_70:      Number.isFinite(allocated70) ? allocated70 : 0,
//             };
//           })
//         );

//         setSaSummaries(mapped);
//       })
//       .catch(() => setSaSummaries([]))
//       .finally(() => setSaLoading(false));
//   }, [planId]);

//   // ── GF values — identical logic to AdminDashboard ────────────────────────────
//   const gfBudgeted  = gfSummary?.calamity_fund ?? 0;   // full 5%
//   const gfQrf       = gfBudgeted * 0.30;                // 30% reserved
//   const gfPredis    = gfBudgeted * 0.70;                // 70% ceiling
//   const gfAllocated = gfSummary?.total_70pct   ?? 0;   // actual items entered

//   const st = (i: number): React.CSSProperties => ({ animationDelay: `${i * 55}ms` });

//   if (planLoading) {
//     return (
//       <div className="p-5 space-y-4">
//         <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
//         <Shimmer className="h-7 w-44" />
//         <Shimmer className="h-20 w-full rounded-2xl" />
//         <Shimmer className="h-64 w-full rounded-2xl" />
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
//           {[0, 1, 2].map(i => <Shimmer key={i} className="h-64 rounded-2xl" />)}
//         </div>
//       </div>
//     );
//   }

//   return (
//     <>
//       <style>{`
//         @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(100%)} }
//         @keyframes fadeUp  { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:translateY(0)} }
//         .fade-up { animation: fadeUp .4s cubic-bezier(.25,.8,.25,1) forwards; opacity: 0; }
//       `}</style>

//       <div className="p-5 pb-12 space-y-5">

//         {/* ── Header ── */}
//         <div className="fade-up flex items-end justify-between" style={st(0)}>
//           <div>
//             <p className="text-[10px] font-medium tracking-[0.12em] uppercase text-zinc-400">
//               {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
//             </p>
//             <h1 className="text-2xl font-semibold text-zinc-900 tracking-tight">LDRRMO Overview</h1>
//           </div>
//           {activePlan && (
//             <div className="flex items-center gap-1.5 rounded-xl bg-zinc-100 px-3 py-1.5">
//               <span className="relative flex h-1.5 w-1.5">
//                 <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
//                 <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
//               </span>
//               <span className="text-xs font-semibold text-zinc-600">FY {activePlan.year}</span>
//             </div>
//           )}
//         </div>

//         {/* ── Budget Plan Year card ── */}
//         <div className="fade-up" style={st(1)}>
//           <div
//             onClick={() => navigate("/admin/ldrrmfip")}
//             className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex items-center gap-4 cursor-pointer hover:border-zinc-200 hover:shadow-md transition-all"
//           >
//             <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
//               <DocumentTextIcon className="w-5 h-5 text-red-500" />
//             </div>
//             <div className="flex-1 min-w-0">
//               <p className="text-[10px] font-semibold tracking-[0.1em] uppercase text-zinc-400">Budget Plan Year</p>
//               <p className="text-2xl font-bold text-zinc-900 leading-tight">
//                 {activePlan ? activePlan.year : "—"}
//               </p>
//               <p className="text-xs text-zinc-400">LDRRMF Investment Plan</p>
//             </div>
//             <ChevronRightIcon className="w-4 h-4 text-zinc-300 flex-shrink-0" />
//           </div>
//         </div>

//         {/* ── General Fund ── */}
//         <div className="fade-up" style={st(2)}>
//           <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">General Fund</p>
//           <LdrrmfCard
//             label="Local Disaster Risk Reduction Mgmt. Fund"
//             budgeted={gfBudgeted}
//             qrf={gfQrf}
//             predis={gfPredis}
//             predisAllocated={gfAllocated}
//             loading={gfLoading || !planId}
//             onClick={() => navigate("/admin/ldrrmfip")}
//           />
//         </div>

//         {/* ── Special Accounts ── */}
//         {(saLoading || saSummaries.length > 0) && (
//           <div className="fade-up" style={st(3)}>
//             <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2">Special Accounts</p>
//             <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
//               {saLoading
//                 ? [0, 1, 2].map(i => <Shimmer key={i} className="h-64 rounded-2xl" />)
//                 : saSummaries.map((sa, i) => (
//                   <div key={sa.source} className="fade-up" style={st(4 + i)}>
//                     <LdrrmfCard
//                       label={sa.dept_name}
//                       abbr={sa.dept_abbreviation}
//                       logoUrl={sa.logo}
//                       budgeted={sa.total_5pct}
//                       qrf={sa.qrf_30}
//                       predis={sa.preparedness_70}
//                       predisAllocated={sa.allocated_70}
//                       loading={false}
//                       onClick={() => navigate("/admin/ldrrmf-plan")}
//                     />
//                   </div>
//                 ))
//               }
//             </div>
//           </div>
//         )}

//       </div>
//     </>
//   );
// };

// export default LdrrmoDashboard;


import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { cn } from "@/src/lib/utils";
import { Card as ShadcnCard } from "../../components/ui/card";
import {
  ShieldCheckIcon,
  DocumentTextIcon,
  ChevronRightIcon,
  BoltIcon,
  LifebuoyIcon,
  BuildingLibraryIcon,
} from "@heroicons/react/24/outline";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import {
  useDepartments,
  useLdrrmfSummary,
  useLdrrmfSummarySource,
  useLdrrmfPlanSpecialAccounts,
} from "@/src/hooks/useDashboardQueries";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SpecialAccountFund {
  source: string;
  dept_name: string;
  dept_abbreviation: string;
  logo: string | null;
  total_5pct: number;      // full 5% calamity fund
  qrf_30: number;          // 30% of total_5pct  (derived, not from API)
  preparedness_70: number; // 70% of total_5pct  (derived, not from API)
  allocated_70: number;    // actual items entered so far (from ldrrmfip/summary)
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const peso = (v: number) =>
  `₱${Number.isFinite(v) ? v.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}`;

const pesoC = (v: number): string => {
  if (v >= 1_000_000_000) return `₱${(v / 1_000_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}B`;
  if (v >= 1_000_000)     return `₱${(v / 1_000_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}M`;
  if (v >= 1_000)         return `₱${(v / 1_000).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}K`;
  return peso(v);
};

const st = (i: number): React.CSSProperties => ({ animationDelay: `${i * 60}ms` });

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div style={style} className={cn("relative overflow-hidden rounded-2xl bg-muted animate-in fade-in duration-700 fill-mode-both", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-background/70 to-transparent" />
    </div>
  );
}

// Dashboard-local wrapper around shadcn/ui's <Card> — matches AdminDashboard exactly
function Card({ children, className, style, onClick }: {
  children: React.ReactNode; className?: string;
  style?: React.CSSProperties; onClick?: () => void;
}) {
  return (
    <ShadcnCard
      onClick={onClick}
      style={style}
      className={cn(
        "rounded-2xl shadow-sm",
        "animate-in fade-in slide-in-from-bottom-3 duration-600 fill-mode-both",
        onClick && "cursor-pointer hover:border-foreground/20 hover:shadow-md transition-all",
        className
      )}
    >
      {children}
    </ShadcnCard>
  );
}

// ─── LDRRMF Card ──────────────────────────────────────────────────────────────
// budgeted        = full 5% calamity fund
// qrf             = budgeted × 0.30  (reserved, not yet disbursed)
// predis          = budgeted × 0.70  (ceiling for Pre-Disaster spending)
// predisAllocated = actual items entered so far

const LdrrmfCard: React.FC<{
  label: string;
  abbr?: string;
  logoUrl?: string | null;
  budgeted: number;
  qrf: number;
  predis: number;
  predisAllocated: number;
  loading: boolean;
  onClick?: () => void;
  style?: React.CSSProperties;
}> = ({ label, abbr, logoUrl, budgeted, qrf, predis, predisAllocated, loading, onClick, style }) => {
  const safeAllocated   = Number.isFinite(predisAllocated) ? predisAllocated : 0;
  const predisRemaining = Math.max(0, predis - safeAllocated);
  const pct = predis > 0 ? Math.round((safeAllocated / predis) * 100) : 0;

  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!logoUrl && !imgFailed;

  return (
    <Card style={style} className="overflow-hidden rounded-lg">
      {/* Header */}
      <div className="px-4 pt-4 pb-3 border-b flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0 overflow-hidden">
            {showImg ? (
              <img
                src={logoUrl!}
                alt={label}
                className="w-full h-full object-contain p-0.5"
                onError={() => setImgFailed(true)}
              />
            ) : abbr ? (
              <span className="text-[9px] font-bold text-red-600 leading-none">{abbr}</span>
            ) : (
              <ShieldCheckIcon className="w-3.5 h-3.5 text-red-500" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-eyebrow">5% LDRRMF</p>
            <p className="text-section-title mt-0.5 truncate">{label}</p>
          </div>
        </div>
        {onClick && (
          <button onClick={onClick} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors font-medium flex-shrink-0">
            View <ChevronRightIcon className="w-3 h-3" />
          </button>
        )}
      </div>

      <div className="p-4">
        <div className="rounded-lg border p-3 space-y-2.5">
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-muted-foreground">5% Calamity Fund · Budgeted</p>
            {loading
              ? <Shimmer className="h-5 w-24" />
              : <span className="text-sm font-bold text-foreground tabular-nums">{peso(budgeted)}</span>
            }
          </div>

          <div className="grid grid-cols-2 gap-2">

            {/* 30% QRF */}
            <div className="rounded-lg border p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <BoltIcon className="w-3 h-3 flex-shrink-0 text-fin-qrf" /> 30% QRF
                </p>
                <span className="text-[9px] text-muted-foreground">reserved</span>
              </div>
              {loading ? <Shimmer className="h-5 w-full" /> : (
                <>
                  <p className="text-sm font-semibold text-foreground">{peso(qrf)}</p>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div className="h-full w-full bg-fin-qrf rounded-full" />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Available</span>
                    <span className="text-[10px] font-medium">{peso(qrf)}</span>
                  </div>
                </>
              )}
            </div>

            {/* 70% Pre-Disaster */}
            <div className="rounded-lg border p-2.5 space-y-1">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <LifebuoyIcon className="w-3 h-3 flex-shrink-0 text-fin-predisaster" /> 70% Pre-Disaster
                </p>
                {!loading && (
                  <span className="text-[9px] text-muted-foreground">{pct}%</span>
                )}
              </div>
              {loading ? <Shimmer className="h-5 w-full" /> : (
                <>
                  <p className="text-sm font-semibold text-foreground">{peso(safeAllocated)} <span className="text-[10px] text-muted-foreground font-normal">/ {peso(predis)}</span></p>
                  <div className="h-1 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-fin-predisaster rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, pct)}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] text-muted-foreground">Remaining</span>
                    <span className="text-[10px] font-medium">{peso(predisRemaining)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          <p className="text-[9px] text-muted-foreground/60 text-right">JMC 2013-1 · R.A. 10121</p>
        </div>
      </div>
    </Card>
  );
};

// ─── Main Dashboard ────────────────────────────────────────────────────────────

const LdrrmoDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const planId = activePlan?.budget_plan_id;

  const { data: departments = [] } = useDepartments();

  // ── GF: calamity_fund (full 5%) + total70 (allocated) ──
  const { data: gfSummary, isLoading: gfLoading } = useLdrrmfSummary(planId);

  // ── SA: /ldrrmf-plan gives total_5pct per source; /ldrrmfip/summary per source
  //        gives actual allocated (total70). qrf/predis are ALWAYS derived
  //        as 30%/70% of total_5pct. ─────────────────────────────────────────
  const { data: specialAccounts = [], isLoading: saPlanLoading } = useLdrrmfPlanSpecialAccounts();
  const { data: ldrrmfSh  = { reserved30: 0, total70: 0, calamityFund: 0 } } = useLdrrmfSummarySource(planId, "sh");
  const { data: ldrrmfOcc = { reserved30: 0, total70: 0, calamityFund: 0 } } = useLdrrmfSummarySource(planId, "occ");
  const { data: ldrrmfPm  = { reserved30: 0, total70: 0, calamityFund: 0 } } = useLdrrmfSummarySource(planId, "pm");

  const allocatedBySource: Record<string, number> = {
    sh:  ldrrmfSh.total70,
    occ: ldrrmfOcc.total70,
    pm:  ldrrmfPm.total70,
  };

  const saLoading = saPlanLoading;

  const saSummaries: SpecialAccountFund[] = specialAccounts.map(s => {
    const dept = departments.find(
      d => (d.dept_abbreviation ?? "").toLowerCase() === s.source.toLowerCase()
    );
    return {
      source:            s.source,
      dept_name:         s.dept_name,
      dept_abbreviation: s.dept_abbreviation,
      logo:              dept?.logo ? `/storage/${dept.logo}` : null,
      total_5pct:        s.total_5pct,
      qrf_30:            s.total_5pct * 0.30,
      preparedness_70:   s.total_5pct * 0.70,
      allocated_70:      allocatedBySource[s.source.toLowerCase()] ?? 0,
    };
  });

  // ── GF values ────────────────────────────────────────────────────────────────
  const gfBudgeted  = gfSummary?.calamityFund ?? 0;   // full 5%
  const gfQrf       = gfBudgeted * 0.30;                // 30% reserved
  const gfPredis    = gfBudgeted * 0.70;                // 70% ceiling
  const gfAllocated = gfSummary?.total70   ?? 0;   // actual items entered

  const grandTotalBudgeted = gfBudgeted + saSummaries.reduce((sum, sa) => sum + sa.total_5pct, 0);
//   const grandTotalQrf      = gfQrf + saSummaries.reduce((sum, sa) => sum + sa.qrf_30, 0);
  const grandTotalPredis   = gfPredis + saSummaries.reduce((sum, sa) => sum + sa.preparedness_70, 0);
  const grandTotalAllocated = gfAllocated + saSummaries.reduce((sum, sa) => sum + sa.allocated_70, 0);

  if (planLoading) {
    return (
      <div className="p-3 sm:p-5 pb-10 space-y-4">
        <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        <div className="space-y-2">
          <Shimmer className="h-3 w-52" style={st(0)} />
          <Shimmer className="h-7 w-44" style={st(1)} />
        </div>
        <Shimmer className="h-20 w-full" style={st(2)} />
        <Shimmer className="h-64 w-full" style={st(3)} />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[0, 1, 2].map(i => <Shimmer key={i} className="h-64" style={st(4 + i)} />)}
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
      <div className="p-3 sm:p-5 pb-10">
        <div className="space-y-4">

          {/* ── Header ── */}
          <div className="flex items-end justify-between animate-in fade-in duration-500" style={st(0)}>
            <div>
              <p className="text-eyebrow">
                {new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
              <h1 className="text-page-title">LDRRMO Overview</h1>
            </div>
            {activePlan && (
              <div className="flex items-center gap-1.5">
                <span className="animate-ping absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400 opacity-60" />
                <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-[11px] font-medium text-emerald-500 tracking-wide ml-2">FY {activePlan.year}</span>
              </div>
            )}
          </div>

          {/* ── ROW 1: Budget Plan Year + Grand Total ── */}
          <div className="grid grid-cols-12 gap-3 sm:gap-4 items-stretch">

            <Card style={st(1)} onClick={() => navigate("/admin/ldrrmfip")}
              className="col-span-12 sm:col-span-6 lg:col-span-4 p-3.5 relative overflow-hidden flex flex-col rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-red-50 flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-3.5 h-3.5 text-red-500" />
                </div>
                <p className="text-eyebrow leading-none">Budget Plan Year</p>
              </div>
              <div className="flex-1">
                <p className="text-subtitle leading-snug">LDRRMF Investment Plan</p>
                <p className="text-metric leading-none mt-1">
                  {activePlan ? activePlan.year : "—"}
                </p>
              </div>
              <div className="border-t border-border pt-2.5 flex items-center justify-between mt-4">
                <span className="text-eyebrow">Investment Plan</span>
                <ChevronRightIcon className="w-3 h-3 text-muted-foreground" />
              </div>
            </Card>

            <Card style={st(2)} className="col-span-12 sm:col-span-6 lg:col-span-4 p-3.5 flex flex-col rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-7 h-7 rounded-md bg-indigo-50 flex items-center justify-center flex-shrink-0">
                  <BuildingLibraryIcon className="w-3.5 h-3.5 text-indigo-500" />
                </div>
                <p className="text-eyebrow leading-none">Combined 5% Calamity Fund</p>
              </div>
              <div className="flex-1">
                <p className="text-subtitle leading-snug">General Fund + Special Accounts</p>
                {gfLoading || saLoading ? (
                  <Shimmer className="h-8 w-40 mt-1.5" />
                ) : (
                  <>
                    <p className="text-metric leading-none mt-1">{pesoC(grandTotalBudgeted)}</p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">{peso(grandTotalBudgeted)}</p>
                  </>
                )}
              </div>
              <div className="border-t border-border pt-2.5 flex items-center justify-between mt-4">
                <span className="text-eyebrow">{saSummaries.length + 1} funds tracked</span>
              </div>
            </Card>

            <Card style={st(3)} className="col-span-12 sm:col-span-6 lg:col-span-4 p-3.5 flex flex-col rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-md bg-orange-50 flex items-center justify-center flex-shrink-0">
                    <LifebuoyIcon className="w-3.5 h-3.5 text-fin-predisaster" />
                  </div>
                  <p className="text-eyebrow leading-none">70% Pre-Disaster Combined</p>
                </div>
                {!(gfLoading || saLoading) && grandTotalPredis > 0 && (
                  <span className="text-[10px] font-semibold text-fin-predisaster bg-fin-predisaster/10 rounded-full px-2 py-0.5">
                    {Math.round((grandTotalAllocated / grandTotalPredis) * 100)}% allocated
                  </span>
                )}
              </div>
              <div className="flex-1">
                <p className="text-subtitle leading-snug">Allocated vs. Ceiling</p>
                {gfLoading || saLoading ? (
                  <Shimmer className="h-8 w-40 mt-1.5" />
                ) : (
                  <>
                    <p className="text-metric leading-none mt-1">
                      {pesoC(grandTotalAllocated)} <span className="text-metric-support font-normal">/ {pesoC(grandTotalPredis)}</span>
                    </p>
                    <p className="text-[10px] font-mono text-muted-foreground mt-1.5">
                      {peso(grandTotalAllocated)} / {peso(grandTotalPredis)}
                    </p>
                  </>
                )}
              </div>
              <div className="border-t border-border pt-2.5 mt-4 space-y-2">
                {gfLoading || saLoading ? (
                  <Shimmer className="h-1 w-full" />
                ) : (
                  <>
                    <div className="h-1 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-fin-predisaster rounded-full transition-all duration-700"
                        style={{ width: grandTotalPredis > 0 ? `${Math.min(100, (grandTotalAllocated / grandTotalPredis) * 100)}%` : "0%" }}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-eyebrow">Remaining</span>
                      <span className="text-xs font-medium text-foreground">{peso(Math.max(0, grandTotalPredis - grandTotalAllocated))}</span>
                    </div>
                  </>
                )}
              </div>
            </Card>

          </div>

          {/* ── General Fund ── */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={st(3)}>
            <p className="text-eyebrow mb-2">General Fund</p>
            <LdrrmfCard
              label="Local Disaster Risk Reduction Mgmt. Fund"
              budgeted={gfBudgeted}
              qrf={gfQrf}
              predis={gfPredis}
              predisAllocated={gfAllocated}
              loading={gfLoading || !planId}
              onClick={() => navigate("/admin/ldrrmfip?source=general-fund")}
            />
          </div>

          {/* ── Special Accounts ── */}
          {(saLoading || saSummaries.length > 0) && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500 fill-mode-both" style={st(4)}>
              <p className="text-eyebrow mb-2">Special Accounts</p>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-4">
                {saLoading
                  ? [0, 1, 2].map(i => <Shimmer key={i} className="h-64" style={st(5 + i)} />)
                  : saSummaries.map((sa, i) => (
                    <LdrrmfCard
                      key={sa.source}
                      style={st(5 + i)}
                      label={sa.dept_name}
                      abbr={sa.dept_abbreviation}
                      logoUrl={sa.logo}
                      budgeted={sa.total_5pct}
                      qrf={sa.qrf_30}
                      predis={sa.preparedness_70}
                      predisAllocated={sa.allocated_70}
                      loading={false}
                      onClick={() => navigate(`/admin/ldrrmfip?source=${encodeURIComponent(sa.source)}`)}
                    />
                  ))
                }
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

export default LdrrmoDashboard;
