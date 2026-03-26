import React, { useMemo } from "react";
import { useActiveBudgetPlan } from "../../hooks/useActiveBudgetPlan";
import { cn } from "@/src/lib/utils";
import {
  useSummaryDepartments, useSummaryCategories, useSummaryDeptPlans,
  useSummaryAipPrograms, useExpenseClassifications, useExpenseClassItems,
  useSummaryGfFund, useSpecialPlans, computeCategoryBlocks,
} from "../../hooks/useSummaryQueries";

// ─── Shimmer ──────────────────────────────────────────────────────────────────

function Shimmer({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <div className={cn("relative overflow-hidden rounded bg-zinc-100", className)} style={style}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.4s_infinite] bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function SummaryOfExpenditures() {
  const { activePlan, loading: planLoading } = useActiveBudgetPlan();
  const planId = activePlan?.budget_plan_id;

  // ── All queries via hook ───────────────────────────────────────────────────
  const { data: departments  = [], isLoading: deptsLoading      } = useSummaryDepartments();
  const { data: categories   = [], isLoading: catsLoading       } = useSummaryCategories();
  const { data: deptPlans    = [], isLoading: deptPlansLoading  } = useSummaryDeptPlans(planId);
  const { data: aipPrograms  = [], isLoading: aipLoading        } = useSummaryAipPrograms(planId);
  const { data: rawClasses   = [], isLoading: classLoading      } = useExpenseClassifications();
  const { data: rawClassItems= [], isLoading: classItemsLoading } = useExpenseClassItems();
  const { data: gfFund,            isLoading: fundLoading       } = useSummaryGfFund();
  const { specialPlans, specialPlansLoading }                     = useSpecialPlans(planId);

  // ── Derived ───────────────────────────────────────────────────────────────
  const coreLoading = planLoading || deptsLoading || catsLoading ||
    deptPlansLoading || aipLoading || classLoading || classItemsLoading || fundLoading;

  const categoryBlocks = useMemo(() => {
    if (coreLoading) return [];
    return computeCategoryBlocks(departments, categories, deptPlans, aipPrograms, rawClasses, rawClassItems);
  }, [departments, categories, deptPlans, aipPrograms, rawClasses, rawClassItems, coreLoading]);

  const mdf    = (gfFund?.nta   ?? 0) * 0.20;
  const ldrrmf = (gfFund?.total ?? 0) * 0.05;

  const grandPS        = categoryBlocks.reduce((s, c) => s + c.totals.ps,   0);
  const grandMOOE      = categoryBlocks.reduce((s, c) => s + c.totals.mooe, 0);
  const grandCO        = categoryBlocks.reduce((s, c) => s + c.totals.co,   0);
  const grandSPA_depts = categoryBlocks.reduce((s, c) => s + c.totals.spa,  0);
  const grandSPA_plans = specialPlans.reduce((s, p) => s + p.total, 0);
  const subTotal       = grandPS + grandMOOE + grandCO + grandSPA_depts;
  const statutory      = mdf + ldrrmf;
  const grandTotal     = subTotal + statutory;
  const year           = activePlan?.year ?? new Date().getFullYear();

  // ── Loading ───────────────────────────────────────────────────────────────
  if (coreLoading) {
    return (
      <div className="p-6 space-y-5">
        <style>{`@keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}`}</style>
        <div className="space-y-2">
          <Shimmer className="h-2.5 w-52" />
          <Shimmer className="h-7 w-80" />
          <Shimmer className="h-3 w-32" />
        </div>
        <div className="border border-zinc-200 rounded-2xl overflow-hidden">
          <div className="bg-zinc-50 border-b border-zinc-200 flex gap-6 px-4 py-3">
            <Shimmer className="h-3 w-48 rounded" />
            {[70, 70, 70, 110, 70].map((w, i) => <Shimmer key={i} className="h-3 rounded ml-auto" style={{ width: w }} />)}
          </div>
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className={cn("flex gap-6 px-4 py-2.5 border-b border-zinc-100", i % 6 === 0 && "bg-zinc-50/80")}>
              <Shimmer className="h-3 rounded" style={{ width: i % 6 === 0 ? 110 : 190, marginLeft: i % 6 === 0 ? 0 : 16 }} />
              {[55, 55, 55, 85, 65].map((w, j) => <Shimmer key={j} className="h-3 rounded ml-auto" style={{ width: w }} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (!activePlan) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-zinc-400 text-sm">No active budget plan found.</p>
      </div>
    );
  }

  // ── Formatters ────────────────────────────────────────────────────────────
  const fmt      = (v: number) => new Intl.NumberFormat("en-PH", { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(v));
  const numPlain = (v: number) => v === 0 ? "–" : fmt(v);
  const numFirst = (v: number) => v === 0 ? " ₱–" : " ₱" + fmt(v);
  const numSub   = (v: number) => v === 0 ? " ₱–" : " ₱" + fmt(v);

  const thS = "border-b border-r border-gray-200 bg-white px-3 py-2.5 align-bottom font-semibold text-gray-600 text-[10px] uppercase tracking-widest whitespace-nowrap";
  const thR = cn(thS, "text-right");

  const SectionHeader = ({ label }: { label: string }) => (
    <tr>
      <td colSpan={6} className="px-4 py-2 text-[11px] font-extrabold uppercase tracking-[0.1em] text-gray-900 bg-gray-50 border-b-2 border-t border-gray-200">
        {label}
      </td>
    </tr>
  );

  const Spacer = () => <tr><td colSpan={6} className="py-1 border-b border-gray-50 bg-white" /></tr>;

  const Nc = ({ v, first = false, dim = false }: { v: number; first?: boolean; dim?: boolean }) => (
    <td className={cn("px-3 py-2 text-right font-mono tabular-nums text-[12px] border-b border-gray-100 font-normal", dim ? "text-gray-300" : v === 0 ? "text-gray-300" : "text-gray-700")}>
      {first ? numFirst(v) : (dim ? "–" : numPlain(v))}
    </td>
  );

  const SubRow = ({ label, ps, mooe, co, spa, total }: { label: string; ps: number; mooe: number; co: number; spa: number; total: number }) => (
    <tr className="bg-gray-50 border-t border-b-2 border-gray-300">
      <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-700 tracking-wide border-r border-gray-200">{label}</td>
      {[ps, mooe, co, spa].map((v, i) => (
        <td key={i} className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-[12px] text-gray-800 bg-gray-50 border-r border-gray-200">{numSub(v)}</td>
      ))}
      <td className="px-3 py-2.5 text-right font-mono tabular-nums font-bold text-[12px] text-gray-900 bg-gray-50 border-r border-gray-200">{numSub(total)}</td>
    </tr>
  );

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-6 pb-16">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">General Fund — In Pesos</span>
            <span className="text-gray-300 text-[10px]">·</span>
            <span className="text-[10px] font-medium text-gray-400">FY {year}</span>
          </div>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Summary of Expenditures</h1>
          <p className="text-[11px] text-gray-400 mt-0.5">Municipal Budget Office · Opol, Misamis Oriental · CY {year}</p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-[12px] border-collapse" style={{ minWidth: 900 }}>
            <thead>
              <tr>
                <th className={cn(thS, "text-left")} style={{ width: "38%" }}>Office</th>
                <th className={thR}>Personal Services</th>
                <th className={thR}>MOOE</th>
                <th className={thR}>Capital Outlay</th>
                <th className={thR}>Special Purpose Appropriation</th>
                <th className={cn(thR, "border-r-0")}>Total</th>
              </tr>
              <tr className="border-b-2 border-gray-200">
                {["(1)","(2)","(3)","(4)","(5)","(6)"].map((n, i) => (
                  <td key={i} className={cn("border-r border-gray-200 bg-white px-3 py-1 text-center text-[10px] text-gray-300", i === 5 && "border-r-0")}>{n}</td>
                ))}
              </tr>
            </thead>

            <tbody>
              {categoryBlocks.map((block, bi) => (
                <React.Fragment key={block.category_id}>
                  <SectionHeader label={block.category_name} />
                  {block.rows.map((row, ri) => (
                    <tr key={row.dept_id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 pl-8 py-2 text-gray-600 border-b border-r border-gray-100">{row.dept_name}</td>
                      <Nc v={row.ps}   first={ri === 0} />
                      <Nc v={row.mooe} first={ri === 0} />
                      <Nc v={row.co}   first={ri === 0} />
                      <Nc v={row.spa}  first={ri === 0} />
                      <td className={cn("px-3 py-2 text-right font-mono tabular-nums font-semibold text-[12px] border-b border-gray-100", row.total > 0 ? "text-gray-900" : "text-gray-300")}>
                        {ri === 0 ? numFirst(row.total) : numPlain(row.total)}
                      </td>
                    </tr>
                  ))}
                  <SubRow label={`Total ${block.category_name}`} ps={block.totals.ps} mooe={block.totals.mooe} co={block.totals.co} spa={block.totals.spa} total={block.totals.total} />
                  {bi < categoryBlocks.length - 1 && <Spacer />}
                </React.Fragment>
              ))}

              {/* Special Plans */}
              <Spacer />
              {specialPlansLoading
                ? Array.from({ length: 10 }).map((_, i) => (
                    <tr key={i}>
                      <td className="px-4 pl-8 py-2 border-b border-r border-gray-100"><Shimmer className="h-3 w-64 rounded" /></td>
                      {[0,1,2].map(j => <td key={j} className="px-3 py-2 border-b border-r border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>)}
                      <td className="px-3 py-2 border-b border-r border-gray-100"><Shimmer className="h-3 w-20 rounded ml-auto" /></td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>
                    </tr>
                  ))
                : specialPlans.map((plan, pi) => (
                    <tr key={plan.key} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 pl-8 py-2 text-gray-600 border-b border-r border-gray-100">{plan.label}</td>
                      <td className="px-3 py-2 border-b border-r border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>
                      <td className="px-3 py-2 border-b border-r border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>
                      <td className="px-3 py-2 border-b border-r border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>
                      <td className="px-3 py-2 border-b border-r border-gray-100 text-right font-mono tabular-nums text-[12px] text-gray-700">
                        {pi === 0 ? numFirst(plan.total) : numPlain(plan.total)}
                      </td>
                      <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>
                    </tr>
                  ))
              }

              <tr className="bg-gray-50 border-t border-b-2 border-gray-300">
                <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-700 tracking-wide border-r border-gray-200">Total Plans / Programs</td>
                <td className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-right font-mono text-[12px] font-semibold text-gray-300">–</td>
                <td className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-right font-mono text-[12px] font-semibold text-gray-300">–</td>
                <td className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-right font-mono text-[12px] font-semibold text-gray-300">–</td>
                <td className="px-3 py-2.5 bg-gray-50 border-r border-gray-200 text-right font-mono tabular-nums text-[12px] font-semibold text-gray-800">{numSub(grandSPA_plans)}</td>
                <td className="px-3 py-2.5 bg-gray-50 text-right font-mono text-[12px] font-semibold text-gray-300">–</td>
              </tr>

              <Spacer />
              <tr className="bg-gray-900 text-white">
                <td className="px-4 py-3 text-[11px] font-bold uppercase tracking-widest border-r border-gray-700">Sub-Total</td>
                {[grandPS, grandMOOE, grandCO, grandSPA_depts].map((v, i) => (
                  <td key={i} className="px-3 py-3 text-right font-mono tabular-nums font-semibold text-[12px] border-r border-gray-700">{numSub(v)}</td>
                ))}
                <td className="px-3 py-3 text-right font-mono tabular-nums font-bold text-[12px]">{numSub(subTotal)}</td>
              </tr>

              <Spacer />
              <SectionHeader label="Other Services" />
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 pl-8 py-2 text-gray-600 border-b border-r border-gray-100 font-medium">Budgetary &amp; Statutory Requirements</td>
                <td colSpan={4} className="border-b border-r border-gray-100" />
                <td className="px-3 py-2 border-b border-gray-100 text-right text-gray-300 font-mono text-[12px]">–</td>
              </tr>
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 pl-16 py-2 text-[11px] text-gray-500 border-b border-r border-gray-100">20% Municipal Development Fund</td>
                <td colSpan={4} className="border-b border-r border-gray-100" />
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[12px] text-gray-700 border-b border-gray-100 font-medium">{numFirst(mdf)}</td>
              </tr>
              <tr className="hover:bg-gray-50/60 transition-colors">
                <td className="px-4 pl-16 py-2 text-[11px] text-gray-500 border-b border-r border-gray-100">5% LDRRMF</td>
                <td colSpan={4} className="border-b border-r border-gray-100" />
                <td className="px-3 py-2 text-right font-mono tabular-nums text-[12px] text-gray-700 border-b border-gray-100 font-medium">{numPlain(ldrrmf)}</td>
              </tr>
              <tr className="bg-gray-50 border-t border-b-2 border-gray-300">
                <td className="px-4 py-2.5 text-[11px] font-semibold text-gray-700 tracking-wide border-r border-gray-200">Sub-Total</td>
                <td colSpan={4} className="bg-gray-50 border-r border-gray-200" />
                <td className="px-3 py-2.5 text-right font-mono tabular-nums font-semibold text-[12px] text-gray-800 bg-gray-50">{numSub(statutory)}</td>
              </tr>
              <tr className="bg-gray-900 text-white">
                <td className="px-4 py-4 text-[13px] font-bold uppercase tracking-widest border-r border-gray-700">Grand Total</td>
                <td colSpan={4} className="border-r border-gray-700" />
                <td className="px-3 py-4 text-right font-mono tabular-nums font-bold text-sm">{numSub(grandTotal)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[11px] text-gray-400">
        <span>
          PS / MOOE / CO from Form 2 items, classified by expense classification. &nbsp;
          SPA per office = AIP Program (Form 4) totals. &nbsp;
          Special Plans from their respective plan pages. &nbsp;
          20% MDF = 20% of NTA · 5% LDRRMF = 5% of total GF income.
        </span>
      </div>
    </div>
  );
}