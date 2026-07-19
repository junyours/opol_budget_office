import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/src/hooks/useAuth";
import { useActiveBudgetPlan } from "@/src/hooks/useActiveBudgetPlan";
import { cn } from "@/src/lib/utils";
import { LoadingState } from "@/src/components/states/LoadingState";
import {
  useForm7GeneralFund,
  useForm7SpecialAccount,
  useBudgetPlansList,
  Form7Data,
} from "@/src/hooks/useForm7Queries";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/src/components/ui/card";
import { Input } from "@/src/components/ui/input";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/src/components/ui/tabs";
import { useIsMobile } from "@/src/hooks/use-mobile";

// ─────────────────────────────────────────────────────────────────────────
// ✏️  EDIT YOUR NUMBERS HERE — this is the only section you need to touch.
//     (Pooling from the DB comes later; for now it's just plain variables.)
// ─────────────────────────────────────────────────────────────────────────

// Years are now derived dynamically from the active budget plan (see ComparativeSummaryPage below).

interface PabRow {
    label: string;
    prev: number; // CY 2026
    curr: number; // CY 2027
}

// // General Funds
// const GENERAL_FUND_ROWS: PabRow[] = [
//     { label: "Personnel Services (PS)", prev: 132104560, curr: 151860452.90 },
//     { label: "Maintenance & Other Operating Expenses (MOOE)", prev: 106097748, curr: 123829944.00 },
//     { label: "Financial Expenses (FE)", prev: 87359957, curr: 95935288.56 },
//     { label: "Capital Outlay (CO)", prev: 4765000, curr: 10588000.00 },
//     { label: "Special Programs (SPA)", prev: 89951305, curr: 103282500.00 },
// ];

// Estimated Income (single row, sits above General Funds table)
const ESTIMATED_INCOME_ROW: PabRow = {
    label: "Income (GF)",
    prev: 420278570,   // ✏️ input grand total for CY 2026 here
    curr: 459093158,   // ✏️ input grand total for CY 2027 here
};

// Estimated Income for Special Accounts (single row, sits above Special Accounts table)
const SA_ESTIMATED_INCOME_ROW: PabRow = {
    label: "Consolidated Income (SA)",
    prev: 90159400,   // ✏️ input grand total for CY 2026 here
    curr: 90360000.00,   // ✏️ input grand total for CY 2027 here
};

// // Special Accounts
// const SPECIAL_ACCOUNT_ROWS: PabRow[] = [
//     { label: "Personnel Services (PS)", prev: 41559972, curr: 44017540.86 },
//     { label: "Maintenance & Other Operating Expenses (MOOE)", prev: 21517749, curr: 21991580 },
//     { label: "Capital Outlay (CO)", prev: 12073709, curr: 6600000 },
//     { label: "Financial Expenses (FE)", prev: 4507970, curr: 4518000 },
//     { label: "Special Programs (SPA)", prev: 10500000, curr: 6580000 },
// ];

// ─────────────────────────────────────────────────────────────────────────
// End of editable section.
// ─────────────────────────────────────────────────────────────────────────

const fmtP = (n: number) => `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const clr = (v: number) => (v < 0 ? "text-red-500" : v > 0 ? "text-emerald-600" : "text-gray-400");
const pctOf = (past: number, d: number) => (past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100);

const TH = "border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left";
const TH_PREV = "border-b border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700 text-right";
const TH_CURR = "border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right";
const TD = "px-3 py-2.5 text-[12px]";
const TD_M = "px-3 py-2.5 text-[12px] font-mono tabular-nums text-right";
const TD_PREV = `${TD_M} bg-blue-50/30 text-blue-700`;
const TD_CURR = `${TD_M} bg-orange-50/30 text-orange-700`;
const C_PREV_SUB = "bg-blue-50 border-blue-200";
const C_CURR_SUB = "bg-orange-50 border-orange-200";
const C_PREV_GT = "bg-blue-950/20 border-blue-900/40 text-blue-300";
const C_CURR_GT = "bg-orange-950/20 border-orange-900/40 text-orange-300";

interface SectionProps {
    title: string;
    badgeText: string;
    badgeClass: string;
    rows: PabRow[];
    prevYear: number;
    currYear: number;
}

const ComparativeSection: React.FC<SectionProps> = ({ title, badgeText, badgeClass, rows, prevYear, currYear }) => {
    const isMobile = useIsMobile();
    const totals = useMemo(() => {
        const prev = rows.reduce((s, r) => s + r.prev, 0);
        const curr = rows.reduce((s, r) => s + r.curr, 0);
        return { prev, curr, diff: curr - prev, pct: pctOf(prev, curr - prev) };
    }, [rows]);

    if (isMobile) {
        return (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="divide-y divide-gray-100">
                    {rows.map((row) => {
                        const diff = row.curr - row.prev;
                        const pct = pctOf(row.prev, diff);
                        return (
                            <div key={row.label} className="px-4 py-3">
                                <p className="text-[12px] font-medium text-gray-800 mb-2">{row.label}</p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="rounded-md border border-blue-100 bg-blue-50/40 px-2 py-1.5">
                                        <p className="text-[9px] text-blue-700/70 mb-0.5">{prevYear}</p>
                                        <p className="font-mono text-[12px] text-blue-700 text-right">{fmtP(row.prev)}</p>
                                    </div>
                                    <div className="rounded-md border border-orange-100 bg-orange-50/40 px-2 py-1.5">
                                        <p className="text-[9px] text-orange-700/70 mb-0.5">{currYear}</p>
                                        <p className="font-mono text-[12px] text-orange-700 text-right">{fmtP(row.curr)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className={cn("font-mono", clr(diff))}>
                                        {diff === 0 ? "–" : (diff > 0 ? "+" : "") + fmtP(diff)}
                                    </span>
                                    <span className={cn("font-mono", clr(diff))}>
                                        {row.prev === 0 && diff === 0 ? "–" : `${pct.toFixed(2)}%`}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
                <div className="px-4 py-3 bg-gray-900 text-white">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2">
                        Expenditures Grand Total
                    </p>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <div className={cn("rounded-md border px-2 py-1.5", C_PREV_GT)}>
                            <p className="opacity-70 text-[9px]">{prevYear}</p>
                            <p className="font-mono font-bold text-right">{fmtP(totals.prev)}</p>
                        </div>
                        <div className={cn("rounded-md border px-2 py-1.5", C_CURR_GT)}>
                            <p className="opacity-70 text-[9px]">{currYear}</p>
                            <p className="font-mono font-bold text-right">{fmtP(totals.curr)}</p>
                        </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                        <span className={cn("font-mono font-semibold", clr(totals.diff))}>
                            {totals.diff === 0 ? "–" : (totals.diff > 0 ? "+" : "") + fmtP(totals.diff)}
                        </span>
                        <span className={cn("font-mono font-semibold", clr(totals.diff))}>
                            {totals.prev === 0 && totals.diff === 0 ? "–" : `${totals.pct.toFixed(2)}%`}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 640 }}>
                        <colgroup>
                            <col style={{ width: "32%" }} />
                            <col style={{ width: "17%" }} />
                            <col style={{ width: "17%" }} />
                            <col style={{ width: "17%" }} />
                            <col style={{ width: "17%" }} />
                        </colgroup>
                        <thead>
                            <tr>
                                <th className={TH}>Expenditures</th>
                            <th className={cn(TH_PREV, "border-l")}>Annual Budget {prevYear}</th>
                            <th className={cn(TH_CURR, "border-l")}>Annual Budget {currYear}</th>
                            <th className={cn(TH, "text-right")}>Increase / Decrease</th>
                            <th className={cn(TH, "text-right")}>Percentage</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => {
                            const diff = row.curr - row.prev;
                            const pct = pctOf(row.prev, diff);
                            return (
                                <tr key={row.label} className="hover:bg-gray-50/60 transition-colors">
                                    <td className={cn(TD, "text-gray-800 font-medium")}>{row.label}</td>
                                    <td className={cn(TD_PREV, "border-l border-blue-100")}>{fmtP(row.prev)}</td>
                                    <td className={cn(TD_CURR, "border-l border-orange-100")}>{fmtP(row.curr)}</td>
                                    <td className={cn(TD_M, clr(diff))}>{diff === 0 ? "–" : (diff > 0 ? "+" : "") + fmtP(diff)}</td>
                                    <td className={cn(TD_M, clr(diff))}>
                                        {row.prev === 0 && diff === 0 ? "–" : `${pct.toFixed(2)}%`}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                    <tfoot>
                        <tr className="bg-gray-900 text-white">
                            <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                                Expenditures Grand Total
                            </td>
                            <td className={cn("px-3 py-3 text-right font-mono font-bold tabular-nums border-l", C_PREV_GT)}>
                                {fmtP(totals.prev)}
                            </td>
                            <td className={cn("px-3 py-3 text-right font-mono font-bold tabular-nums border-l", C_CURR_GT)}>
                                {fmtP(totals.curr)}
                            </td>
                            <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", clr(totals.diff))}>
                                {totals.diff === 0 ? "–" : (totals.diff > 0 ? "+" : "") + fmtP(totals.diff)}
                            </td>
                            <td className={cn("px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700", clr(totals.diff))}>
                                {totals.prev === 0 && totals.diff === 0 ? "–" : `${totals.pct.toFixed(2)}%`}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </div>
    );
};

// Pulls a section's total (e.g. 'PS', 'MOOE', 'FE', 'CO', 'SPA') out of a Form7Data payload.
const getSectionTotal = (data: Form7Data | undefined, code: string): number =>
    data?.sections.sections.find(s => s.section_code === code)?.subtotal.total ?? 0;

// Sums a section's total across several Form7Data payloads (used to combine SH + OCC + PM).
const sumSectionAcross = (datas: (Form7Data | undefined)[], code: string): number =>
    datas.reduce((sum, d) => sum + getSectionTotal(d, code), 0);

// ── Per-item comparative helpers ───────────────────────────────────────────

interface ItemPabRow {
    label:        string;
    accountCode:  string;
    sectionCode:  string;
    prev:         number;
    curr:         number;
}

const itemKey = (sectionCode: string, accountCode: string, name: string) =>
    `${sectionCode}|${(accountCode || '').trim().toLowerCase()}|${name.trim().toLowerCase()}`;

// Flattens one or more Form7Data payloads into a flat map keyed by section+account+name,
// preserving Form 7's own order (sections in their given order, rows within each section
// in their given order). When multiple payloads share the same key (e.g. combining
// SH + OCC + PM special accounts), their totals are summed together.
const flattenItemsOrdered = (datas: (Form7Data | undefined)[]): Map<string, ItemPabRow> => {
    const map = new Map<string, ItemPabRow>();
    datas.forEach(data => {
        if (!data) return;
        data.sections.sections.forEach(section => {
            section.rows.forEach(row => {
                const key = itemKey(section.section_code, row.account_code, row.item_name);
                const existing = map.get(key);
                if (existing) {
                    existing.curr += row.total;
                } else {
                    map.set(key, {
                        label:       row.item_name,
                        accountCode: row.account_code || '',
                        sectionCode: section.section_code,
                        prev:        0,
                        curr:        row.total,
                    });
                }
            });
        });
    });
    return map;
};

// Builds comparative rows in Form 7's natural order (section order, then row order within
// each section — taken from the CURRENT year's layout since that's the one being reviewed;
// any prev-year-only item is appended after). Accepts arrays so General Fund (single source)
// and Special Accounts (SH + OCC + PM combined) can share the same logic.
const buildItemRows = (
    prevDatas: (Form7Data | undefined)[],
    currDatas: (Form7Data | undefined)[]
): ItemPabRow[] => {
    const prevMap = flattenItemsOrdered(prevDatas);
    const currMap = flattenItemsOrdered(currDatas);

    const rows: ItemPabRow[] = [];
    const seen = new Set<string>();

    // Walk current year's order first — this is what determines on-screen ordering.
    currMap.forEach((row, key) => {
        rows.push({ ...row, prev: prevMap.get(key)?.curr ?? 0 });
        seen.add(key);
    });

    // Any item that existed in the prior year but was dropped this year — append at the end.
    prevMap.forEach((row, key) => {
        if (seen.has(key)) return;
        rows.push({ label: row.label, accountCode: row.accountCode, sectionCode: row.sectionCode, prev: row.curr, curr: 0 });
    });

    return rows;
};

const ComparativeSummaryPage: React.FC = () => {
    const isMobile = useIsMobile();
    const { user, loading } = useAuth();
    const { activePlan, loading: planLoading } = useActiveBudgetPlan();

    // ── Dynamic years: current = active budget plan's year, previous = year before it ──
    const currYear = activePlan?.year ?? new Date().getFullYear();
    const prevYear = currYear - 1;

    // ── Dynamic "as of" date — today's date, e.g. "JULY 5, 2026" ──
    const asOfLabel = new Date()
        .toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
        .toUpperCase();

    // ── Resolve prevYear / currYear → their budget_plan_id ────────────────────
    const { data: budgetPlans, isLoading: plansLoading } = useBudgetPlansList();
    const prevPlanId = useMemo(
        () => budgetPlans?.find(p => Number(p.year) === prevYear)?.budget_plan_id,
        [budgetPlans, prevYear]
    );
    const currPlanId = useMemo(
        () => budgetPlans?.find(p => Number(p.year) === currYear)?.budget_plan_id,
        [budgetPlans, currYear]
    );

    // ── General Fund (Form 7, filter = general-fund) ──────────────────────────
    const { data: gfPrev, isLoading: gfPrevLoading } = useForm7GeneralFund(prevPlanId);
    const { data: gfCurr, isLoading: gfCurrLoading } = useForm7GeneralFund(currPlanId);

    // ── Special Accounts (Form 7, filter = sh / occ / pm) — summed together ──
    const { data: shPrev, isLoading: shPrevLoading } = useForm7SpecialAccount('sh', prevPlanId);
    const { data: shCurr, isLoading: shCurrLoading } = useForm7SpecialAccount('sh', currPlanId);
    const { data: occPrev, isLoading: occPrevLoading } = useForm7SpecialAccount('occ', prevPlanId);
    const { data: occCurr, isLoading: occCurrLoading } = useForm7SpecialAccount('occ', currPlanId);
    const { data: pmPrev, isLoading: pmPrevLoading } = useForm7SpecialAccount('pm', prevPlanId);
    const { data: pmCurr, isLoading: pmCurrLoading } = useForm7SpecialAccount('pm', currPlanId);

    const form7Loading =
        plansLoading || gfPrevLoading || gfCurrLoading ||
        shPrevLoading || shCurrLoading || occPrevLoading || occCurrLoading ||
        pmPrevLoading || pmCurrLoading;

    const generalFundRows: PabRow[] = useMemo(() => [
        { label: "Personnel Services (PS)", prev: getSectionTotal(gfPrev, 'PS'), curr: getSectionTotal(gfCurr, 'PS') },
        { label: "Maintenance & Other Operating Expenses (MOOE)", prev: getSectionTotal(gfPrev, 'MOOE'), curr: getSectionTotal(gfCurr, 'MOOE') },
        { label: "Financial Expenses (FE)", prev: getSectionTotal(gfPrev, 'FE'), curr: getSectionTotal(gfCurr, 'FE') },
        { label: "Capital Outlay (CO)", prev: getSectionTotal(gfPrev, 'CO'), curr: getSectionTotal(gfCurr, 'CO') },
        { label: "Special Programs (SPA)", prev: getSectionTotal(gfPrev, 'SPA'), curr: getSectionTotal(gfCurr, 'SPA') },
    ], [gfPrev, gfCurr]);

    const specialAccountRows: PabRow[] = useMemo(() => {
        const prevDatas = [shPrev, occPrev, pmPrev];
        const currDatas = [shCurr, occCurr, pmCurr];
        return [
            { label: "Personnel Services (PS)", prev: sumSectionAcross(prevDatas, 'PS'), curr: sumSectionAcross(currDatas, 'PS') },
            { label: "Maintenance & Other Operating Expenses (MOOE)", prev: sumSectionAcross(prevDatas, 'MOOE'), curr: sumSectionAcross(currDatas, 'MOOE') },
            { label: "Capital Outlay (CO)", prev: sumSectionAcross(prevDatas, 'CO'), curr: sumSectionAcross(currDatas, 'CO') },
            { label: "Financial Expenses (FE)", prev: sumSectionAcross(prevDatas, 'FE'), curr: sumSectionAcross(currDatas, 'FE') },
            { label: "Special Programs (SPA)", prev: sumSectionAcross(prevDatas, 'SPA'), curr: sumSectionAcross(currDatas, 'SPA') },
        ];
    }, [shPrev, shCurr, occPrev, occCurr, pmPrev, pmCurr]);

    // ── Fund switcher — drives BOTH the sector tables above and the item table below ──
    const [activeFund, setActiveFund] = useState<'general-fund' | 'special-accounts'>('general-fund');
    const [itemSearch, setItemSearch] = useState('');

    const gfItemRows: ItemPabRow[] = useMemo(
        () => buildItemRows([gfPrev], [gfCurr]),
        [gfPrev, gfCurr]
    );

    const saItemRows: ItemPabRow[] = useMemo(
        () => buildItemRows([shPrev, occPrev, pmPrev], [shCurr, occCurr, pmCurr]),
        [shPrev, shCurr, occPrev, occCurr, pmPrev, pmCurr]
    );

    const itemRows = activeFund === 'general-fund' ? gfItemRows : saItemRows;

    const filteredItemRows = useMemo(() => {
        const q = itemSearch.trim().toLowerCase();
        if (!q) return itemRows;
        return itemRows.filter(r =>
            r.label.toLowerCase().includes(q) || r.accountCode.toLowerCase().includes(q)
        );
    }, [itemRows, itemSearch]);

    if (loading || planLoading || form7Loading) return <LoadingState />;

    const role = (user as any)?.role;
    if (role !== "admin" && role !== "super-admin") {
        return <Navigate to="/dashboard" replace />;
    }

    const incomeDiff = ESTIMATED_INCOME_ROW.curr - ESTIMATED_INCOME_ROW.prev;
    const incomePct  = pctOf(ESTIMATED_INCOME_ROW.prev, incomeDiff);

    const saIncomeDiff = SA_ESTIMATED_INCOME_ROW.curr - SA_ESTIMATED_INCOME_ROW.prev;
    const saIncomePct  = pctOf(SA_ESTIMATED_INCOME_ROW.prev, saIncomeDiff);

    return (
        <div className="p-6 flex flex-col gap-5">
            <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                    Comparative Summary
                </p>
                <h2 className="text-[20px] font-semibold text-gray-900 mt-0.5">
                    Proposed Annual Budget — Appropriation {prevYear} vs Proposed {currYear}
                </h2>
                <h2 className="text-[20px] font-semibold text-gray-900 mt-0.5">
                    AS OF {asOfLabel}
                </h2>
            </div>

            <Tabs value={activeFund} onValueChange={(v) => setActiveFund(v as 'general-fund' | 'special-accounts')} className="w-full">
                <TabsList className="h-9 bg-gray-100 border border-gray-200 rounded-lg p-1 mb-5">
                    <TabsTrigger
                        value="general-fund"
                        className="text-xs px-4 rounded-md data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-white text-gray-500 hover:text-gray-700"
                    >
                        General Fund
                    </TabsTrigger>
                    <TabsTrigger
                        value="special-accounts"
                        className="text-xs px-4 rounded-md data-[state=active]:bg-gray-900 data-[state=active]:shadow-sm data-[state=active]:text-white text-gray-500 hover:text-gray-700"
                    >
                        Special Accounts
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general-fund" className="mt-0 flex flex-col gap-5">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2.5">
                            <h3 className="text-[15px] font-semibold text-gray-900">General Funds</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                                GF
                            </span>
                        </div>
                        {isMobile ? (
                            <div className="px-4 py-3">
                                <p className="text-[12px] font-medium text-gray-800 mb-2">{ESTIMATED_INCOME_ROW.label}</p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="rounded-md border border-blue-100 bg-blue-50/40 px-2 py-1.5">
                                        <p className="text-[9px] text-blue-700/70 mb-0.5">{prevYear}</p>
                                        <p className="font-mono text-[12px] text-blue-700 text-right">{fmtP(ESTIMATED_INCOME_ROW.prev)}</p>
                                    </div>
                                    <div className="rounded-md border border-orange-100 bg-orange-50/40 px-2 py-1.5">
                                        <p className="text-[9px] text-orange-700/70 mb-0.5">{currYear}</p>
                                        <p className="font-mono text-[12px] text-orange-700 text-right">{fmtP(ESTIMATED_INCOME_ROW.curr)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className={cn("font-mono", clr(incomeDiff))}>
                                        {incomeDiff === 0 ? "–" : (incomeDiff > 0 ? "+" : "") + fmtP(incomeDiff)}
                                    </span>
                                    <span className={cn("font-mono", clr(incomeDiff))}>
                                        {ESTIMATED_INCOME_ROW.prev === 0 && incomeDiff === 0 ? "–" : `${incomePct.toFixed(2)}%`}
                                    </span>
                                </div>
                            </div>
                        ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 640 }}>
                                <colgroup>
                                    <col style={{ width: "32%" }} />
                                    <col style={{ width: "17%" }} />
                                    <col style={{ width: "17%" }} />
                                    <col style={{ width: "17%" }} />
                                    <col style={{ width: "17%" }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className={TH}>Estimated Income Revenue</th>
                                        <th className={cn(TH_PREV, "border-l")}>Annual Budget {prevYear}</th>
                                        <th className={cn(TH_CURR, "border-l")}>Annual Budget {currYear}</th>
                                        <th className={cn(TH, "text-right")}>Increase / Decrease</th>
                                        <th className={cn(TH, "text-right")}>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-gray-50/60 transition-colors">
                                        <td className={cn(TD, "text-gray-800 font-medium")}>{ESTIMATED_INCOME_ROW.label}</td>
                                        <td className={cn(TD_PREV, "border-l border-blue-100")}>{fmtP(ESTIMATED_INCOME_ROW.prev)}</td>
                                        <td className={cn(TD_CURR, "border-l border-orange-100")}>{fmtP(ESTIMATED_INCOME_ROW.curr)}</td>
                                        <td className={cn(TD_M, clr(incomeDiff))}>{incomeDiff === 0 ? "–" : (incomeDiff > 0 ? "+" : "") + fmtP(incomeDiff)}</td>
                                        <td className={cn(TD_M, clr(incomeDiff))}>
                                            {ESTIMATED_INCOME_ROW.prev === 0 && incomeDiff === 0 ? "–" : `${incomePct.toFixed(2)}%`}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>

                    <ComparativeSection
                        title="General Funds"
                        badgeText="GF"
                        badgeClass="text-blue-700 bg-blue-50 border-blue-200"
                        rows={generalFundRows}
                        prevYear={prevYear}
                        currYear={currYear}
                    />
                </TabsContent>

                <TabsContent value="special-accounts" className="mt-0 flex flex-col gap-5">
                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2.5">
                            <h3 className="text-[15px] font-semibold text-gray-900">Special Accounts</h3>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                                SA
                            </span>
                        </div>
                        {isMobile ? (
                            <div className="px-4 py-3">
                                <p className="text-[12px] font-medium text-gray-800 mb-2">{SA_ESTIMATED_INCOME_ROW.label}</p>
                                <div className="grid grid-cols-2 gap-2 mb-2">
                                    <div className="rounded-md border border-blue-100 bg-blue-50/40 px-2 py-1.5">
                                        <p className="text-[9px] text-blue-700/70 mb-0.5">{prevYear}</p>
                                        <p className="font-mono text-[12px] text-blue-700 text-right">{fmtP(SA_ESTIMATED_INCOME_ROW.prev)}</p>
                                    </div>
                                    <div className="rounded-md border border-orange-100 bg-orange-50/40 px-2 py-1.5">
                                        <p className="text-[9px] text-orange-700/70 mb-0.5">{currYear}</p>
                                        <p className="font-mono text-[12px] text-orange-700 text-right">{fmtP(SA_ESTIMATED_INCOME_ROW.curr)}</p>
                                    </div>
                                </div>
                                <div className="flex items-center justify-between text-[11px]">
                                    <span className={cn("font-mono", clr(saIncomeDiff))}>
                                        {saIncomeDiff === 0 ? "–" : (saIncomeDiff > 0 ? "+" : "") + fmtP(saIncomeDiff)}
                                    </span>
                                    <span className={cn("font-mono", clr(saIncomeDiff))}>
                                        {SA_ESTIMATED_INCOME_ROW.prev === 0 && saIncomeDiff === 0 ? "–" : `${saIncomePct.toFixed(2)}%`}
                                    </span>
                                </div>
                            </div>
                        ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 640 }}>
                                <colgroup>
                                    <col style={{ width: "32%" }} />
                                    <col style={{ width: "17%" }} />
                                    <col style={{ width: "17%" }} />
                                    <col style={{ width: "17%" }} />
                                    <col style={{ width: "17%" }} />
                                </colgroup>
                                <thead>
                                    <tr>
                                        <th className={TH}>Estimated Income Revenue</th>
                                        <th className={cn(TH_PREV, "border-l")}>Annual Budget {prevYear}</th>
                                        <th className={cn(TH_CURR, "border-l")}>Annual Budget {currYear}</th>
                                        <th className={cn(TH, "text-right")}>Increase / Decrease</th>
                                        <th className={cn(TH, "text-right")}>Percentage</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr className="hover:bg-gray-50/60 transition-colors">
                                        <td className={cn(TD, "text-gray-800 font-medium")}>{SA_ESTIMATED_INCOME_ROW.label}</td>
                                        <td className={cn(TD_PREV, "border-l border-blue-100")}>{fmtP(SA_ESTIMATED_INCOME_ROW.prev)}</td>
                                        <td className={cn(TD_CURR, "border-l border-orange-100")}>{fmtP(SA_ESTIMATED_INCOME_ROW.curr)}</td>
                                        <td className={cn(TD_M, clr(saIncomeDiff))}>{saIncomeDiff === 0 ? "–" : (saIncomeDiff > 0 ? "+" : "") + fmtP(saIncomeDiff)}</td>
                                        <td className={cn(TD_M, clr(saIncomeDiff))}>
                                            {SA_ESTIMATED_INCOME_ROW.prev === 0 && saIncomeDiff === 0 ? "–" : `${saIncomePct.toFixed(2)}%`}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                        )}
                    </div>

                    <ComparativeSection
                        title="Special Accounts"
                        badgeText="SA"
                        badgeClass="text-emerald-700 bg-emerald-50 border-emerald-200"
                        rows={specialAccountRows}
                        prevYear={prevYear}
                        currYear={currYear}
                    />
                </TabsContent>
            </Tabs>

            <Card className="rounded-xl border-gray-200 shadow-sm overflow-hidden">
                <CardHeader className="px-5 py-4 border-b border-gray-200">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-[15px] font-semibold text-gray-900">
                                    Item-by-Item Comparative
                                </CardTitle>
                                {activeFund === 'general-fund' ? (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                                        GF
                                    </span>
                                ) : (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                                        SA · SH + OCC + PM combined
                                    </span>
                                )}
                            </div>
                            <CardDescription className="text-xs text-gray-400 mt-0.5">
                                {activeFund === 'general-fund'
                                    ? `General Fund line items, ${prevYear} vs ${currYear}.`
                                    : `Special Accounts line items (combined), ${prevYear} vs ${currYear}.`}
                            </CardDescription>
                        </div>
                        <div className="relative w-full sm:w-72">
                            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                            <Input
                                className="pl-9 h-9 text-sm border-gray-200"
                                placeholder="Search item or account code…"
                                value={itemSearch}
                                onChange={e => setItemSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {isMobile ? (
                        <div className="max-h-[480px] overflow-y-auto divide-y divide-gray-100">
                            {filteredItemRows.length === 0 ? (
                                <p className="py-10 text-center text-gray-400 text-sm">No matching items.</p>
                            ) : (
                                filteredItemRows.map((row, idx) => {
                                    const diff = row.curr - row.prev;
                                    const pct  = pctOf(row.prev, diff);
                                    return (
                                        <div key={`${row.accountCode}-${row.label}-${idx}`} className="px-4 py-3">
                                            <div className="mb-2">
                                                {row.accountCode && (
                                                    <span className="text-gray-400 font-mono text-[10px] block">{row.accountCode}</span>
                                                )}
                                                <span className="text-[12px] font-medium text-gray-800">{row.label}</span>
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 mb-2">
                                                <div className="rounded-md border border-blue-100 bg-blue-50/40 px-2 py-1.5">
                                                    <p className="text-[9px] text-blue-700/70 mb-0.5">{prevYear}</p>
                                                    <p className="font-mono text-[12px] text-blue-700 text-right">{fmtP(row.prev)}</p>
                                                </div>
                                                <div className="rounded-md border border-orange-100 bg-orange-50/40 px-2 py-1.5">
                                                    <p className="text-[9px] text-orange-700/70 mb-0.5">{currYear}</p>
                                                    <p className="font-mono text-[12px] text-orange-700 text-right">{fmtP(row.curr)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between text-[11px]">
                                                <span className={cn("font-mono", clr(diff))}>
                                                    {diff === 0 ? "–" : (diff > 0 ? "+" : "") + fmtP(diff)}
                                                </span>
                                                <span className={cn("font-mono", clr(diff))}>
                                                    {row.prev === 0 && diff === 0 ? "–" : `${pct.toFixed(2)}%`}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    ) : (
                    <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
                        <table className="w-full text-[12px] border-collapse table-fixed" style={{ minWidth: 640 }}>
                            <colgroup>
                                <col style={{ width: "34%" }} />
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "16%" }} />
                                <col style={{ width: "17%" }} />
                                <col style={{ width: "17%" }} />
                            </colgroup>
                            <thead className="sticky top-0 z-10">
                                <tr>
                                    <th className={TH}>Item</th>
                                    <th className={cn(TH_PREV, "border-l")}>{prevYear}</th>
                                    <th className={cn(TH_CURR, "border-l")}>{currYear}</th>
                                    <th className={cn(TH, "text-right")}>Increase / Decrease</th>
                                    <th className={cn(TH, "text-right")}>Percentage</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredItemRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="py-10 text-center text-gray-400 text-sm">
                                            No matching items.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredItemRows.map((row, idx) => {
                                        const diff = row.curr - row.prev;
                                        const pct  = pctOf(row.prev, diff);
                                        return (
                                            <tr key={`${row.accountCode}-${row.label}-${idx}`} className="hover:bg-gray-50/60 transition-colors border-b border-gray-50">
                                                <td className={cn(TD, "text-gray-800 font-medium")}>
                                                    {row.accountCode && (
                                                        <span className="text-gray-400 font-mono text-[10px] block">{row.accountCode}</span>
                                                    )}
                                                    {row.label}
                                                </td>
                                                <td className={cn(TD_PREV, "border-l border-blue-100")}>{fmtP(row.prev)}</td>
                                                <td className={cn(TD_CURR, "border-l border-orange-100")}>{fmtP(row.curr)}</td>
                                                <td className={cn(TD_M, clr(diff))}>{diff === 0 ? "–" : (diff > 0 ? "+" : "") + fmtP(diff)}</td>
                                                <td className={cn(TD_M, clr(diff))}>
                                                    {row.prev === 0 && diff === 0 ? "–" : `${pct.toFixed(2)}%`}
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                    </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default ComparativeSummaryPage;
