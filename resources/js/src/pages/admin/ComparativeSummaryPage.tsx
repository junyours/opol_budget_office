import React, { useMemo } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/src/hooks/useAuth";
import { cn } from "@/src/lib/utils";

// ─────────────────────────────────────────────────────────────────────────
// ✏️  EDIT YOUR NUMBERS HERE — this is the only section you need to touch.
//     (Pooling from the DB comes later; for now it's just plain variables.)
// ─────────────────────────────────────────────────────────────────────────

const PAB_YEAR_PREV = 2026;
const PAB_YEAR_CURR = 2027;

interface PabRow {
    label: string;
    prev: number; // CY 2026
    curr: number; // CY 2027
}

// General Funds
const GENERAL_FUND_ROWS: PabRow[] = [
    { label: "Personnel Services (PS)", prev: 132104560, curr: 151860452.90 },
    { label: "Maintenance & Other Operating Expenses (MOOE)", prev: 106097748, curr: 123829944.00 },
    { label: "Financial Expenses (FE)", prev: 87359957, curr: 95935288.56 },
    { label: "Capital Outlay (CO)", prev: 4765000, curr: 10588000.00 },
    { label: "Special Programs (SPA)", prev: 89951305, curr: 103282500.00 },
];

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

// Special Accounts
const SPECIAL_ACCOUNT_ROWS: PabRow[] = [
    { label: "Personnel Services (PS)", prev: 41559972, curr: 44017540.86 },
    { label: "Maintenance & Other Operating Expenses (MOOE)", prev: 21517749, curr: 21991580 },
    { label: "Capital Outlay (CO)", prev: 12073709, curr: 6600000 },
    { label: "Financial Expenses (FE)", prev: 4507970, curr: 4518000 },
    { label: "Special Programs (SPA)", prev: 10500000, curr: 6580000 },
];

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
}

const ComparativeSection: React.FC<SectionProps> = ({ title, badgeText, badgeClass, rows }) => {
    const totals = useMemo(() => {
        const prev = rows.reduce((s, r) => s + r.prev, 0);
        const curr = rows.reduce((s, r) => s + r.curr, 0);
        return { prev, curr, diff: curr - prev, pct: pctOf(prev, curr - prev) };
    }, [rows]);

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
                            <th className={cn(TH_PREV, "border-l")}>Annual Budget {PAB_YEAR_PREV}</th>
                            <th className={cn(TH_CURR, "border-l")}>Annual Budget {PAB_YEAR_CURR}</th>
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

const ComparativeSummaryPage: React.FC = () => {
    const { user, loading } = useAuth();

    if (loading) return null;

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
                    Proposed Annual Budget — Appropriation {PAB_YEAR_PREV} vs Proposed {PAB_YEAR_CURR}
                </h2>
                <h2 className="text-[20px] font-semibold text-gray-900 mt-0.5">
                    AS OF JULY 2, 2026
                </h2>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2.5">
                    <h3 className="text-[15px] font-semibold text-gray-900">General Funds</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-blue-700 bg-blue-50 border-blue-200">
                        GF
                    </span>
                </div>
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
                                <th className={cn(TH_PREV, "border-l")}>Annual Budget {PAB_YEAR_PREV}</th>
                                <th className={cn(TH_CURR, "border-l")}>Annual Budget {PAB_YEAR_CURR}</th>
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
            </div>

            <ComparativeSection
                title="General Funds"
                badgeText="GF"
                badgeClass="text-blue-700 bg-blue-50 border-blue-200"
                rows={GENERAL_FUND_ROWS}
            />

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2.5">
                    <h3 className="text-[15px] font-semibold text-gray-900">Special Accounts</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full border text-emerald-700 bg-emerald-50 border-emerald-200">
                        SA
                    </span>
                </div>
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
                                <th className={cn(TH_PREV, "border-l")}>Annual Budget {PAB_YEAR_PREV}</th>
                                <th className={cn(TH_CURR, "border-l")}>Annual Budget {PAB_YEAR_CURR}</th>
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
            </div>

            <ComparativeSection
                title="Special Accounts"
                badgeText="SA"
                badgeClass="text-emerald-700 bg-emerald-50 border-emerald-200"
                rows={SPECIAL_ACCOUNT_ROWS}
            />
        </div>
    );
};

export default ComparativeSummaryPage;
