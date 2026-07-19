import React, {
    useState,
    useEffect,
    useMemo,
    useCallback,
    useRef,
} from "react";
import { createPortal } from "react-dom";
import API from "../../services/api";
import { useQueries, useQuery } from "@tanstack/react-query";
import {
    DepartmentBudgetPlan,
    ExpenseClassification,
    ExpenseItem,
    DepartmentBudgetPlanItem,
    DepartmentBudgetPlanForm4Item,
} from "../../types/api";
import AddItemModal from "./AddItemModal";
// BudgetComparisonBanner import removed — component was never rendered in this file.
// If you intended to show it (e.g. near the Form 2 header), let me know and I'll wire it in
// with the right props instead of just deleting the import.
import { Button } from "@/src/components/ui/button";
import { toast } from "sonner";
import {
    Tooltip,
    TooltipContent,
    TooltipTrigger,
} from "@/src/components/ui/tooltip";
import { PlusIcon, TrashIcon, BanknotesIcon, ArrowsRightLeftIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Switch } from "@/src/components/ui/switch";
import { cn } from "@/src/lib/utils";
import { useCalamityFund } from "../../hooks/useCalamityFund";
import { useAuth } from "../../hooks/useAuth";
import { useIsMobile } from "../../hooks/use-mobile";

import { MAX_AMOUNT, clampMoneyDigits as clampAmountDigits } from "@/src/utils/moneyInput";

// ─── Constants ────────────────────────────────────────────────────────────────
const PS_CLASS_ID = 1;
const COL_WIDTHS = [100, 210, 100, 95, 95, 100, 100, 95, 75, 170];

// ─── Sticky first-two-columns (Acct Code / Object of Expenditure) ─────────
const STICKY_1 = "sticky left-0 z-10";
const STICKY_2 = "sticky left-[100px] z-10 border-r border-gray-200";

// ─── Optimistic delete (undo window) ──────────────────────────────────────
const DELETE_GRACE_MS = 5000;
// Scoped by plan id since a single browser session can have pending deletes
// across multiple department budget plans.
const FORM2_PENDING_DELETE_PREFIX = "pending_delete_form2_item_";
const form2PendingDeleteKey = (planId: number, itemId: number) =>
    `${FORM2_PENDING_DELETE_PREFIX}${planId}_${itemId}`;

// ─── Column color tokens ──────────────────────────────────────────────────────
const C_APP_SUB = "bg-green-50 border-green-200";
const C_APP_GT = "bg-green-950/20 border-green-900/40 text-green-300";
const C_PRO_SUB = "bg-orange-50 border-orange-200";
const C_PRO_GT = "bg-orange-950/20 border-orange-900/40 text-orange-300";

// ─── Table class tokens ───────────────────────────────────────────────────────
const TH =
    "border-b border-gray-200 bg-white px-3 py-2 text-sm font-medium text-muted-foreground text-left";
const TD = "px-3 py-2.5 text-[12px]";
const TD_M = "px-3 py-2.5 text-[12px] font-mono tabular-nums text-right";
const TH_APP =
    "border-b border-green-200 bg-green-50 px-3 py-2 text-sm font-medium text-green-700 text-right";
const TH_PRO =
    "border-b border-orange-200 bg-orange-50 px-3 py-2 text-sm font-medium text-orange-700 text-center";
const TD_APP = `${TD_M} bg-green-50/30`;
const TD_PRO = `${TD_M} bg-orange-50/30`;

const INPUT_BASE =
    "text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full focus:outline-none placeholder:text-gray-300 disabled:opacity-50";
const inputCls = `${INPUT_BASE} focus:ring-2 focus:ring-orange-300 focus:border-orange-300`;
const inputAppCls = `${INPUT_BASE} focus:ring-2 focus:ring-green-300 focus:border-green-300`;
const recCls =
    "text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50";

const TH_CUR =
    "border-b border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 text-right";
const TD_CUR = `${TD_M} bg-blue-50/30`;
const C_CUR_SUB = "bg-blue-50 border-blue-200";
const C_CUR_GT  = "bg-blue-950/20 border-blue-900/40 text-blue-300";
const inputCurCls = `${INPUT_BASE} focus:ring-2 focus:ring-blue-300 focus:border-blue-300`;

// ─── Animation (injected once) ────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes _rowIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
}`;

let _animInjected = false;
function ensureAnim() {
    if (_animInjected || typeof document === "undefined") return;
    const el = document.createElement("style");
    el.textContent = ANIM_CSS;
    document.head.appendChild(el);
    _animInjected = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) =>
    Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtP = (n: number) => `₱${fmt(n)}`;
const fmtP2 = (n: number) =>
    `₱${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const pctOf = (past: number, d: number) =>
    past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
const clr = (v: number) =>
    v < 0 ? "text-red-500" : v > 0 ? "text-emerald-600" : "";
const comma = (n: number) =>
    n === 0 ? "" : Math.round(n).toLocaleString("en-US");

const normRec = (v: string | null | undefined): string | null =>
    v === "" ? null : (v ?? null);

// // Hard ceiling for any peso amount field (proposed, sem1, obligation, etc.) —
// // prevents huge typed values from overflowing into Infinity% once divided.
// const MAX_AMOUNT = 999999999.99;

// // Clamps a raw digit string (already stripped of non-numeric chars) so its
// // parsed value never exceeds MAX_AMOUNT. Returns the digits unchanged if
// // they're empty, not yet a valid number (e.g. mid-typing "12."), or already
// // within range.
// const clampAmountDigits = (digits: string): string => {
//     if (digits === "") return digits;
//     const num = parseFloat(digits);
//     if (isNaN(num)) return digits;
//     if (num > MAX_AMOUNT) return MAX_AMOUNT.toFixed(2);
//     return digits;
// };

// Pressing Enter in any of these amount/recommendation inputs blurs the field,
// which triggers the existing onBlur save handlers (same as clicking away / tabbing out).
const blurOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
        e.preventDefault();
        e.currentTarget.blur();
    }
};

const getSourceForDepartment = (dept?: {
    dept_abbreviation?: string;
    dept_name?: string;
}): string | undefined => {
    if (!dept) return undefined;
    const abbr = dept.dept_abbreviation?.toLowerCase() ?? "";
    const name = dept.dept_name?.toLowerCase() ?? "";
    if (abbr === "sh" || name.includes("slaughter")) return "sh";
    if (abbr === "occ" || name.includes("opol community")) return "occ";
    if (abbr === "pm" || name.includes("public market")) return "pm";
    return undefined;
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface Form2Props {
    plan: DepartmentBudgetPlan;
    pastYearPlan: DepartmentBudgetPlan | null;
    obligationYearPlan: DepartmentBudgetPlan | null;
    classifications: ExpenseClassification[];
    expenseItems: ExpenseItem[];
    isEditable: boolean;
    isAdmin?: boolean;
    onItemUpdate: () => void;
    cardView?: boolean;
}

interface ItemWithMeta extends DepartmentBudgetPlanItem {
    pastTotal: number;
    pastSem1: number;
    pastSem2: number;
    pastObligation: number;
    pastObligationItemId?: number;
    pastItemId?: number;
    expense_item?: ExpenseItem;
    recommendation?: string | null;
}

type DraftField = "proposed" | "sem1" | "obligation";

// ─── Sub-header ───────────────────────────────────────────────────────────────

interface SubHeaderProps {
    prevYear: number | string | undefined;
    currYear: number | string | undefined;
    isAdmin?: boolean;
}

const SubHeader: React.FC<SubHeaderProps> = ({
    prevYear,
    currYear,
    isAdmin,
}) => (
    <>
        <tr>
            <th className={cn(TH, "border-t-2 border-gray-300 sticky left-0 z-20 bg-white")} rowSpan={2}>
                Acct Code
            </th>
            <th className={cn(TH, "border-t-2 border-gray-300 sticky left-[100px] z-20 bg-white border-r ")} rowSpan={2}>
                Object of Expenditure
            </th>
            {isAdmin && (
    <th
        className={cn(
            TH_APP,
            "border-t-2 border-green-300 text-right",
        )}
        rowSpan={2}
    >
        Past Year ({Number(prevYear) - 1})
    </th>
)}
<th
    className={cn(TH_CUR, "text-center border-t-2 border-blue-300")}
    colSpan={3}
>
    Appropriation ({prevYear})
</th>
            <th
                className={cn(TH_PRO, "border-t-2 border-orange-300")}
                rowSpan={2}
            >
                Proposed ({currYear})
            </th>
            <th
                className={cn(TH, "text-right border-t-2 border-gray-300")}
                rowSpan={2}
            >
                Inc / Dec
            </th>
            <th
                className={cn(TH, "text-right border-t-2 border-gray-300")}
                rowSpan={2}
            >
                Percentage
            </th>
            {isAdmin && (
                <th
                    className={cn(TH, "border-t-2 border-gray-300")}
                    rowSpan={2}
                >
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <span className="cursor-help border-b border-dotted border-gray-400">
                                Recommendation
                            </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-xs max-w-[220px]">
                            Budget officer's note on this item — visible only to admins.
                        </TooltipContent>
                    </Tooltip>
                </th>
            )}
        </tr>
        <tr>
    <th className={TH_CUR}>Sem 1</th>
    <th className={TH_CUR}>Sem 2</th>
    <th className={TH_CUR}>Total</th>
</tr>
    </>
);

// ─── Countdown number for the delete-undo toast ────────────────────────────
const CountdownRing: React.FC<{ durationMs: number }> = ({ durationMs }) => {
    const totalSeconds = Math.ceil(durationMs / 1000);
    const [secondsLeft, setSecondsLeft] = useState(totalSeconds);
    const spanRef = useRef<HTMLSpanElement>(null);
    const pausedRef = useRef(false);
    const elapsedRef = useRef(0);
    const lastTickRef = useRef(Date.now());

    useEffect(() => {
        const toastEl = spanRef.current?.closest('[data-sonner-toast]');
        const onEnter = () => { pausedRef.current = true; };
        const onLeave = () => { pausedRef.current = false; lastTickRef.current = Date.now(); };
        toastEl?.addEventListener('mouseenter', onEnter);
        toastEl?.addEventListener('mouseleave', onLeave);

        const interval = setInterval(() => {
            const now = Date.now();
            const delta = now - lastTickRef.current;
            lastTickRef.current = now;
            if (!pausedRef.current) {
                elapsedRef.current += delta;
                setSecondsLeft(Math.max(0, totalSeconds - Math.floor(elapsedRef.current / 1000)));
            }
        }, 200);

        return () => {
            clearInterval(interval);
            toastEl?.removeEventListener('mouseenter', onEnter);
            toastEl?.removeEventListener('mouseleave', onLeave);
        };
    }, [totalSeconds]);

    return (
        <span ref={spanRef} className="flex-shrink-0 w-5 text-center text-lg font-bold tabular-nums leading-none text-gray-700">
            {secondsLeft}
        </span>
    );
};

// ─── Component ────────────────────────────────────────────────────────────────

const Form2: React.FC<Form2Props> = ({
    plan,
    pastYearPlan,
    obligationYearPlan,
    classifications,
    expenseItems,
    isEditable,
    isAdmin = false,
    onItemUpdate,
    cardView = false,
}) => {
    useEffect(() => {
        ensureAnim();
    }, []);

   const { user } = useAuth();
    const isViewer = user?.role === 'viewer';
    const isMobile = useIsMobile();

    // ── State ──────────────────────────────────────────────────────────────────

    const [items, setItems] = useState<ItemWithMeta[]>([]);
    const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>(
        [],
    );

    const [savingItems, setSavingItems] = useState<Set<number>>(new Set());
    const [savingPastItems, setSavingPastItems] = useState<Set<number>>(
        new Set(),
    );
    const [savingObligations, setSavingObligations] = useState<Set<number>>(
        new Set(),
    );
    const [savingRecommendations, setSavingRecommendations] = useState<
        Set<number>
    >(new Set());
    const [savingAipObligations, setSavingAipObligations] = useState<
        Set<number>
    >(new Set());
    const [savingAipRecommendations, setSavingAipRecommendations] = useState<
        Set<number>
    >(new Set());

    const [pastSem1Edits, setPastSem1Edits] = useState<Map<number, number>>(
        new Map(),
    );
    const [obligationEdits, setObligationEdits] = useState<Map<number, number>>(
        new Map(),
    );
    const [aipOblEdits, setAipOblEdits] = useState<Map<number, number>>(
        new Map(),
    );
    const [aipSem1Edits, setAipSem1Edits] = useState<Map<number, number>>(new Map());
    const [savingAipSem1, setSavingAipSem1] = useState<Set<number>>(new Set());

    const [inputDraft, setInputDraft] = useState<Map<string, string>>(
        new Map(),
    );

    // ── Mobile-only search filter ──────────────────────────────────────────
    const [mobileSearch, setMobileSearch] = useState('');
    // Breakdown (Past Obligation / Sem 1 / Sem 2 / Total) is collapsed by default per card
    const [expandedMobileItems, setExpandedMobileItems] = useState<Set<number>>(new Set());
    const toggleMobileExpand = useCallback((id: number) => {
        setExpandedMobileItems((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    }, []);
    // Same collapse behavior for AIP program cards, keyed separately (different id space)
    const [expandedMobileAipItems, setExpandedMobileAipItems] = useState<Set<number>>(new Set());
    const toggleMobileAipExpand = useCallback((id: number) => {
        setExpandedMobileAipItems((prev) => {
            const n = new Set(prev);
            if (n.has(id)) n.delete(id); else n.add(id);
            return n;
        });
    }, []);
    const matchesMobileSearch = useCallback(
        (item: ItemWithMeta) => {
            if (!mobileSearch.trim()) return true;
            const q = mobileSearch.toLowerCase();
            return (
                item.expense_item?.expense_class_item_name?.toLowerCase().includes(q) ||
                item.expense_item?.expense_class_item_acc_code?.toLowerCase().includes(q)
            );
        },
        [mobileSearch],
    );

    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        classificationId: number;
        classificationName: string;
    } | null>(null);
    const [pastModalState, setPastModalState] = useState<{
        isOpen: boolean;
        classificationId: number;
        classificationName: string;
    } | null>(null);
    // const [deleteTarget, setDeleteTarget] = useState<ItemWithMeta | null>(null);

    // ── "New item" highlight: badge + autofocus on the item just added ────────
    const [newlyAddedItemId, setNewlyAddedItemId] = useState<number | null>(null);
    const preAddItemIdsRef = useRef<Set<number>>(new Set());
    const pendingNewItemDetectionRef = useRef(false);
    const proposedInputRefs = useRef<Map<number, HTMLInputElement>>(new Map());

    // ── Move-to / context menu (card review mode) ─────────────────────────────
    const [ctxMenuItem, setCtxMenuItem] = useState<ItemWithMeta | null>(null);
    const [ctxMenuPos, setCtxMenuPos] = useState<{ x: number; y: number } | null>(null);
    const ctxMenuRef = useRef<HTMLDivElement>(null);

    // ── Review mode: collapsible classifications + keyboard focus navigation ──
    // Default Personal Services to collapsed when Review Mode is active on mount.
    // This only sets the initial state — the user can still manually expand it.
    const [collapsedClasses, setCollapsedClasses] = useState<Set<number>>(
        () => (cardView ? new Set([PS_CLASS_ID]) : new Set()),
    );
    const [aipCollapsed, setAipCollapsed] = useState(false);

    // If Review Mode is toggled on while Form2 is already mounted, also default
    // Personal Services to collapsed at that moment (still freely re-expandable after).
    const prevCardViewRef = useRef(cardView);
    useEffect(() => {
        if (!prevCardViewRef.current && cardView) {
            setCollapsedClasses(new Set([PS_CLASS_ID]));
        }
        prevCardViewRef.current = cardView;
    }, [cardView]);
    const toggleClassCollapsed = useCallback((classId: number) => {
        setCollapsedClasses((prev) => {
            const n = new Set(prev);
            if (n.has(classId)) n.delete(classId); else n.add(classId);
            return n;
        });
    }, []);

    const [focusedCardKey, setFocusedCardKey] = useState<string | null>(null);
    const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const setCardRef = useCallback((key: string) => (el: HTMLDivElement | null) => {
        if (el) cardRefs.current.set(key, el);
        else cardRefs.current.delete(key);
    }, []);
    const [moveSource, setMoveSource] = useState<ItemWithMeta | null>(null);
    const [moveSearch, setMoveSearch] = useState('');
    const [moveDestination, setMoveDestination] = useState<ItemWithMeta | null>(null);
    const [moving, setMoving] = useState(false);
    const [moveAmountDraft, setMoveAmountDraft] = useState('');   // raw ₱ amount typed by user
    const [movePercentDraft, setMovePercentDraft] = useState(''); // raw % typed by user
    const [moveInputMode, setMoveInputMode] = useState<'amount' | 'percent'>('amount');
    const [moveAnchorPos, setMoveAnchorPos] = useState<{ x: number; y: number } | null>(null);
    const [moveClassFilter, setMoveClassFilter] = useState<string>('all');
    const moveModalRef = useRef<HTMLDivElement>(null);

    // ── Horizontal scroll: click-and-drag + arrow-key support for the table ───
    const tableScrollRef = useRef<HTMLDivElement>(null);
    const dragStateRef = useRef<{ isDown: boolean; startX: number; startScrollLeft: number }>({
        isDown: false,
        startX: 0,
        startScrollLeft: 0,
    });
    const [isDraggingTable, setIsDraggingTable] = useState(false);
    const [tableIsScrollable, setTableIsScrollable] = useState(false);

    // Recompute whenever the table's content or container size could have
    // changed — covers initial mount, window resizes, and data/columns
    // changing the table's rendered width.
    useEffect(() => {
        const el = tableScrollRef.current;
        if (!el) return;

        const checkOverflow = () => {
            setTableIsScrollable(el.scrollWidth > el.clientWidth + 1);
        };

        checkOverflow();

        const resizeObserver = new ResizeObserver(checkOverflow);
        resizeObserver.observe(el);
        window.addEventListener("resize", checkOverflow);

        return () => {
            resizeObserver.disconnect();
            window.removeEventListener("resize", checkOverflow);
        };
    }, [items, aipItems, isAdmin, cardView, isMobile]);

    const handleTableMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!tableIsScrollable) return;
        // Don't hijack drags that start on interactive elements (inputs, buttons, links, etc.)
        const target = e.target as HTMLElement;
        if (target.closest('input, button, textarea, select, a')) return;
        const el = tableScrollRef.current;
        if (!el) return;
        dragStateRef.current = { isDown: true, startX: e.pageX, startScrollLeft: el.scrollLeft };
        setIsDraggingTable(true);
    }, [tableIsScrollable]);

    const handleTableMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const el = tableScrollRef.current;
        if (!el || !dragStateRef.current.isDown) return;
        e.preventDefault();
        const dx = e.pageX - dragStateRef.current.startX;
        el.scrollLeft = dragStateRef.current.startScrollLeft - dx;
    }, []);

    const endTableDrag = useCallback(() => {
        dragStateRef.current.isDown = false;
        setIsDraggingTable(false);
    }, []);

    const handleTableKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
        const el = tableScrollRef.current;
        if (!el) return;
        const step = e.shiftKey ? 300 : 80;
        if (e.key === "ArrowLeft") {
            e.preventDefault();
            el.scrollBy({ left: -step, behavior: "smooth" });
        } else if (e.key === "ArrowRight") {
            e.preventDefault();
            el.scrollBy({ left: step, behavior: "smooth" });
        } else if (e.key === "Home") {
            e.preventDefault();
            el.scrollTo({ left: 0, behavior: "smooth" });
        } else if (e.key === "End") {
            e.preventDefault();
            el.scrollTo({ left: el.scrollWidth, behavior: "smooth" });
        }
    }, []);

    // Close the move panel on outside click / scroll — same pattern as the ctx menu
    useEffect(() => {
        if (!moveSource) return;
        const handler = (e: MouseEvent) => {
            if (moveModalRef.current && !moveModalRef.current.contains(e.target as Node)) {
                setMoveSource(null);
                setMoveDestination(null);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [moveSource]);

    // Same pattern as Form4's ctxMenu: mousedown-outside + scroll(capture) closes it,
    // and the menu itself is portaled to <body> so it's never clipped/misaligned
    // by the panel's animated/overflow ancestors.
    useEffect(() => {
        if (!ctxMenuItem) return;
        const handler = (e: MouseEvent) => {
            if (ctxMenuRef.current && !ctxMenuRef.current.contains(e.target as Node)) {
                setCtxMenuItem(null);
                setCtxMenuPos(null);
            }
        };
        const closeOnScroll = () => {
            setCtxMenuItem(null);
            setCtxMenuPos(null);
        };
        document.addEventListener('mousedown', handler);
        window.addEventListener('scroll', closeOnScroll, true);
        return () => {
            document.removeEventListener('mousedown', handler);
            window.removeEventListener('scroll', closeOnScroll, true);
        };
    }, [ctxMenuItem]);

    // ── Refs (never cause re-renders — used in async handlers) ────────────────

    const savedValues = useRef(new Map<number, number>());
    const savedObligations = useRef(new Map<number, number>());
    const savedAipObligations = useRef(new Map<number, number>());
    const savedRecommendations = useRef(new Map<number, string | null>());
    const savedAipRecommendations = useRef(new Map<number, string | null>());
    const oblAipItemIdRef = useRef(new Map<number, number>());
    const aipProgramIdRef = useRef(new Map<number, number>());
    const aipOblEditsRef = useRef(new Map<number, number>());
    const aipSem1EditsRef = useRef(new Map<number, number>());
    const savedAipSem1 = useRef(new Map<number, number>());

    // Optimistic-delete bookkeeping — keyed by dept_bp_form2_item_id
    const undoneDeleteIdsRef = useRef<Set<number>>(new Set());
    const pendingDeleteItemsRef = useRef<Map<number, ItemWithMeta>>(new Map());
    const hasReconciledForm2Deletes = useRef(false);

    // ── Derived ───────────────────────────────────────────────────────────────

    const incomeSource = getSourceForDepartment(plan.department);
    const {
        data: calamityData,
        loading: calamityLoading,
        isSpecialAccount,
    } = useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

    // Actual allocated amounts from LDRRMFIP items (not the theoretical 70/30 split) —
    // mirrors the dashboard's useLdrrmfSummarySource so Form2 reflects real entered data.
    const { data: ldrrmfActual } = useQuery<{ reserved30: number; total70: number }>({
        queryKey: ["ldrrmf-summary", plan.budget_plan?.budget_plan_id, incomeSource],
        queryFn: () =>
            API.get("/ldrrmfip/summary", {
                params: { budget_plan_id: plan.budget_plan?.budget_plan_id, source: incomeSource },
            })
                .then((r) => {
                    const d = r.data?.data ?? r.data;
                    return {
                        reserved30: Number(d?.reserved_30 ?? 0),
                        total70: Number(d?.total_70pct ?? 0),
                    };
                })
                .catch(() => ({ reserved30: 0, total70: 0 })),
        enabled: !!plan.budget_plan?.budget_plan_id && isSpecialAccount,
    });

    // QRF (30%) is always fixed/reserved regardless of allocation — use the theoretical split.
    // Only Pre-Disaster (70%) reflects what's actually been allocated to LDRRMFIP items.
    const calamityActualPre   = ldrrmfActual?.total70 ?? 0;
    const calamityActualQrf   = calamityData?.quick_response ?? 0;
    const calamityActualTotal = calamityActualPre + calamityActualQrf;

    const expenseItemMap = useMemo(
        () => new Map(expenseItems.map((i) => [i.expense_class_item_id, i])),
        [expenseItems],
    );

    const prevYear = Number(plan.budget_plan?.year) - 1;
    const currYear = plan.budget_plan?.year;

    const [appropriationAipItems, setAppropriationAipItems] = useState<any[]>([]);

    const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
    const appPlanId = pastYearPlan?.dept_budget_plan_id;

    const [currentForm4Q, oblForm4Q, appForm4Q] = useQueries({
        queries: [
            {
                queryKey: ["form4-items", plan.dept_budget_plan_id ?? "current-pending"],
                queryFn: () =>
                    API.get("/form4-items", { params: { budget_plan_id: plan.dept_budget_plan_id } })
                        .then(r => r.data?.data ?? []),
                enabled: !!plan.dept_budget_plan_id,
            },
            {
                queryKey: ["form4-items", oblPlanId ?? "obligation-pending"],
                queryFn: () =>
                    API.get("/form4-items", { params: { budget_plan_id: oblPlanId } })
                        .then(r => r.data?.data ?? []),
                enabled: !!oblPlanId,
            },
            {
                queryKey: ["form4-items", appPlanId ?? "appropriation-pending"],
                queryFn: () =>
                    API.get("/form4-items", { params: { budget_plan_id: appPlanId } })
                        .then(r => r.data?.data ?? []),
                enabled: !!appPlanId,
            },
        ],
    });

    // ── Effect: Merge AIP items + obligation-year obligations ─────────────────

    useEffect(() => {
        if (currentForm4Q.isLoading) return;
        const currentItems: any[] = currentForm4Q.data ?? [];
        const obligationItems: any[] = oblForm4Q.data ?? [];
        const appropriationItems: any[] = appForm4Q.data ?? [];
        (() => {

            // existing oblByProgram map...
            const oblByProgram = new Map<number, { itemId: number; obligation: number }>();
            for (const pi of obligationItems) {
                oblByProgram.set(pi.aip_program_id, {
                    itemId: pi.dept_bp_form4_item_id,
                    obligation: parseFloat(pi.obligation_amount) || 0,
                });
            }

            //  appropriation map by aip_program_id
            const appByProgram = new Map<number, { sem1: number; sem2: number; total: number }>();
            for (const pi of appropriationItems) {
                appByProgram.set(pi.aip_program_id, {
                    sem1:  parseFloat(pi.sem1_amount)  || 0,
                    sem2:  parseFloat(pi.sem2_amount)  || 0,
                    total: parseFloat(pi.total_amount) || 0,
                });
            }

            const merged = currentItems.map((item: any) => {
                const obl = oblByProgram.get(item.aip_program_id);
                const app = appByProgram.get(item.aip_program_id);
                return {
                    ...item,
                    ps_amount:          parseFloat(item.ps_amount)    || 0,
                    mooe_amount:        parseFloat(item.mooe_amount)   || 0,
                    co_amount:          parseFloat(item.co_amount)     || 0,
                    total_amount:       parseFloat(item.total_amount)  || 0,
                    sem1_amount:        parseFloat(item.sem1_amount)   || 0,
                    sem2_amount:        parseFloat(item.sem2_amount)   || 0,
                    obligation_amount:  obl?.obligation ?? 0,
                    oblAipItemId:       obl?.itemId,
                    recommendation:     item.recommendation ?? null,
                    // appropriation year data
                    app_sem1:  app?.sem1  ?? 0,
                    app_sem2:  app?.sem2  ?? 0,
                    app_total: app?.total ?? 0,
                };
            });

           setAipItems(merged);

            oblAipItemIdRef.current.clear();
            aipProgramIdRef.current.clear();
            savedAipObligations.current.clear();
            savedAipRecommendations.current.clear();
            savedAipSem1.current.clear();

            for (const item of merged) {
                const id = item.dept_bp_form4_item_id;
                savedAipRecommendations.current.set(id, item.recommendation ?? null);
                savedAipObligations.current.set(id, item.obligation_amount);
                savedAipSem1.current.set(id, item.app_sem1 ?? 0);
                if (item.oblAipItemId) oblAipItemIdRef.current.set(id, item.oblAipItemId);
                aipProgramIdRef.current.set(id, item.aip_program_id);
            }
        })();
    }, [currentForm4Q.data, oblForm4Q.data, appForm4Q.data]);

    // ── Effect: Build regular items from plan + pastYear + obligationYear ─────

    useEffect(() => {
        const pastData = new Map<
            number,
            { total: number; sem1: number; sem2: number; itemId: number }
        >();
        pastYearPlan?.items.forEach((item) => {
            pastData.set(item.expense_item_id, {
                total: Number(item.total_amount) || 0,
                sem1: Number((item as any).sem1_amount) || 0,
                sem2: Number((item as any).sem2_amount) || 0,
                itemId: item.dept_bp_form2_item_id,
            });
        });

        const obligationData = new Map<
            number,
            { amount: number; itemId: number }
        >();
        obligationYearPlan?.items.forEach((item: any) => {
            obligationData.set(item.expense_item_id, {
                amount: Number(item.obligation_amount) || 0,
                itemId: item.dept_bp_form2_item_id,
            });
        });

        // Items already in the current (2027) plan
        const merged: ItemWithMeta[] = plan.items.map((planItem) => {
            const past = pastData.get(planItem.expense_item_id) ?? {
                total: 0, sem1: 0, sem2: 0, itemId: 0,
            };
            const obl = obligationData.get(planItem.expense_item_id);
            return {
                ...planItem,
                expense_item: expenseItemMap.get(planItem.expense_item_id),
                pastTotal: past.total,
                pastSem1: past.sem1,
                pastSem2: past.sem2,
                pastObligation: obl?.amount ?? 0,
                pastObligationItemId: obl?.itemId,
                pastItemId: past.itemId || undefined,
                recommendation: (planItem as any).recommendation ?? null,
            };
        });

        // Past year items that are NOT yet in the current plan — show with 0 proposed
        const currentExpenseItemIds = new Set(plan.items.map((i) => i.expense_item_id));
        pastYearPlan?.items.forEach((pastItem) => {
            if (currentExpenseItemIds.has(pastItem.expense_item_id)) return;
            if ((Number(pastItem.total_amount) || 0) === 0) return; // skip zero-amount past items
            const obl = obligationData.get(pastItem.expense_item_id);
            merged.push({
                dept_bp_form2_item_id: 0,
                dept_budget_plan_id: plan.dept_budget_plan_id,
                expense_item_id: pastItem.expense_item_id,
                total_amount: 0,
                sem1_amount: 0,
                sem2_amount: 0,
                expense_item: expenseItemMap.get(pastItem.expense_item_id),
                pastTotal: Number(pastItem.total_amount) || 0,
                pastSem1: Number((pastItem as any).sem1_amount) || 0,
                pastSem2: Number((pastItem as any).sem2_amount) || 0,
                pastObligation: obl?.amount ?? 0,
                pastObligationItemId: obl?.itemId,
                pastItemId: pastItem.dept_bp_form2_item_id || undefined,
                recommendation: null,
            } as ItemWithMeta);

        });

        setItems(merged);
        setPastSem1Edits(new Map());
        setObligationEdits(new Map());

        savedValues.current.clear();
        savedObligations.current.clear();
        savedRecommendations.current.clear();

        for (const item of merged) {
            savedValues.current.set(
                item.expense_item_id,
                Number(item.total_amount),
            );
            savedRecommendations.current.set(
                item.expense_item_id,
                item.recommendation ?? null,
            );
            savedObligations.current.set(
                item.expense_item_id,
                item.pastObligation,
            );
        }
    }, [plan, pastYearPlan, obligationYearPlan, expenseItemMap]);

    // ── Effect: Patch obligation fields when obligationYearPlan refreshes ─────

    useEffect(() => {
        if (!obligationYearPlan) return;

        const obligationData = new Map<
            number,
            { amount: number; itemId: number }
        >();
        obligationYearPlan.items.forEach((item: any) => {
            obligationData.set(item.expense_item_id, {
                amount: Number(item.obligation_amount) || 0,
                itemId: item.dept_bp_form2_item_id,
            });
        });

        setItems((prev) =>
            prev.map((i) => {
                const obl = obligationData.get(i.expense_item_id);
                if (!obl) return i;
                if (
                    obl.amount === i.pastObligation &&
                    obl.itemId === i.pastObligationItemId
                )
                    return i;
                savedObligations.current.set(i.expense_item_id, obl.amount);
                return {
                    ...i,
                    pastObligation: obl.amount,
                    pastObligationItemId: obl.itemId,
                };
            }),
        );
    }, [obligationYearPlan]);

    // ── Input draft helpers ───────────────────────────────────────────────────

    const getDraftValue = useCallback(
        (id: number, field: DraftField, raw: number) => {
            const key = `${id}_${field}`;
            if (inputDraft.has(key)) return inputDraft.get(key)!;
            // if (field === "obligation") return raw === 0 ? "" : raw.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            // return comma(raw);
            return raw === 0 ? "" : raw.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        },
        [inputDraft],
    );

    const cursorRef = useRef<{ el: HTMLInputElement; pos: number } | null>(null);

    const setDraft = useCallback((key: string, digits: string, el?: HTMLInputElement, cursorPos?: number) => {
        if (el !== undefined && cursorPos !== undefined) {
            cursorRef.current = { el, pos: cursorPos };
        }
        setInputDraft((prev) =>
            new Map(prev).set(
                key,
                digits === "" ? "" : digits,
            ),
        );
    }, []);

    useEffect(() => {
        if (cursorRef.current) {
            const { el, pos } = cursorRef.current;
            el.setSelectionRange(pos, pos);
            cursorRef.current = null;
        }
    });

    const clearDraft = useCallback((key: string) => {
        setInputDraft((prev) => {
            const n = new Map(prev);
            n.delete(key);
            return n;
        });
    }, []);

    // Reset the "already reconciled" flag whenever we're looking at a
    // different plan, so switching plans re-checks localStorage for that plan.
    useEffect(() => {
        hasReconciledForm2Deletes.current = false;
    }, [plan.dept_budget_plan_id]);

    // Detect the newly added expense item once `items` refreshes after
    // AddItemModal's onItemAdded triggers onItemUpdate() → parent refetch.
    // Diffing on expense_item_id is safe here: AddItemModal only offers
    // expense items not already present in `items` (existingItemIds), so a
    // freshly appearing expense_item_id is unambiguously the one just added.
    useEffect(() => {
        if (!pendingNewItemDetectionRef.current) return;
        const added = items.find(
            (i) => !preAddItemIdsRef.current.has(i.expense_item_id),
        );
        if (added) {
            pendingNewItemDetectionRef.current = false;
            setNewlyAddedItemId(added.expense_item_id);
        }
    }, [items]);

    // Autofocus + select the proposed-amount input for the newly added item,
    // once it's actually mounted in the table.
    useEffect(() => {
        if (newlyAddedItemId == null) return;
        const el = proposedInputRefs.current.get(newlyAddedItemId);
        if (el) {
            el.focus();
            el.select();
        }
    }, [newlyAddedItemId, items]);

    // ── Handlers: proposed amount ───────────────────────────────────────────── [items, plan.dept_budget_plan_id, finalizeItemDelete, showDeleteToast]);

    // ── Handlers: proposed amount ─────────────────────────────────────────────

    const handleProposedChange = useCallback(
        (id: number, value: number) =>
            setItems((prev) =>
                prev.map((i) =>
                    i.expense_item_id === id
                        ? { ...i, total_amount: value }
                        : i,
                ),
            ),
        [],
    );

    const handleProposedBlur = useCallback(
        async (expenseItemId: number) => {
            const item = items.find((i) => i.expense_item_id === expenseItemId);
            if (!item) return;
            const cur = Number(item.total_amount);
            if (
                savedValues.current.get(expenseItemId) === cur ||
                savingItems.has(expenseItemId)
            )
                return;

            setSavingItems((prev) => new Set(prev).add(expenseItemId));
            const promise = (async () => {
                const payload = { total_amount: cur };
                const res =
                    item.dept_bp_form2_item_id === 0
                        ? await API.post(
                              `/department-budget-plans/${plan.dept_budget_plan_id}/items`,
                              {
                                  expense_item_id: item.expense_item_id,
                                  ...payload,
                              },
                          )
                        : await API.put(
                              `/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`,
                              payload,
                          );

                savedValues.current.set(expenseItemId, cur);
                const saved = res.data.data;
                if (saved) {
                    setItems((prev) =>
                        prev.map((i) =>
                            i.expense_item_id === expenseItemId
                                ? {
                                      ...i,
                                      total_amount: Number(
                                          saved.total_amount ?? cur,
                                      ),
                                      dept_bp_form2_item_id:
                                          saved.dept_bp_form2_item_id ??
                                          i.dept_bp_form2_item_id,
                                  }
                                : i,
                        ),
                    );
                }
                onItemUpdate();
                return res.data;
            })();

            toast.promise(promise, {
                loading: "Saving…",
                success: () =>
                    `${item.expense_item?.expense_class_item_name || "Item"} saved`,
                error: (err) =>
                    `Failed: ${err.response?.data?.message || err.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingItems((prev) => {
                    const n = new Set(prev);
                    n.delete(expenseItemId);
                    return n;
                });
            }
        },
        [items, plan.dept_budget_plan_id, savingItems, onItemUpdate],
    );

    // ── Handlers: Sem 1 ───────────────────────────────────────────────────────

    const handlePastSem1Blur = useCallback(
        async (expenseItemId: number) => {
            const edit = pastSem1Edits.get(expenseItemId);
            if (edit === undefined) return;
            const item = items.find((i) => i.expense_item_id === expenseItemId);
            if (!item) return;

            const hasPastRecord = item.pastTotal > 0 && !!item.pastItemId;
            const pastPlanId = pastYearPlan?.dept_budget_plan_id;

            if (isAdmin && !hasPastRecord && !pastPlanId) {
                toast.error("Past year plan not found for this department.");
                setPastSem1Edits((prev) => {
                    const n = new Map(prev);
                    n.delete(expenseItemId);
                    return n;
                });
                return;
            }

            const cap = hasPastRecord
                ? item.pastTotal
                : Number(item.total_amount);
            const clamped = Math.min(Math.max(edit, 0), cap);
            if (clamped !== edit)
                setPastSem1Edits((prev) =>
                    new Map(prev).set(expenseItemId, clamped),
                );
            if (clamped === item.pastSem1) {
                setPastSem1Edits((prev) => {
                    const n = new Map(prev);
                    n.delete(expenseItemId);
                    return n;
                });
                return;
            }

            setSavingPastItems((prev) => new Set(prev).add(expenseItemId));
            const promise = (async () => {
                if (hasPastRecord) {
                    await API.put(
                        `/department-budget-plans/${pastPlanId}/items/${item.pastItemId}`,
                        { sem1_amount: clamped },
                    );
                } else if (isAdmin && pastPlanId) {
                    const res = await API.post(
                        `/department-budget-plans/${pastPlanId}/items`,
                        {
                            expense_item_id: expenseItemId,
                            sem1_amount: clamped,
                            sem2_amount: 0,
                            total_amount: clamped,
                        },
                    );
                    const newItemId = res.data.data?.dept_bp_form2_item_id;
                    setItems((prev) =>
                        prev.map((i) =>
                            i.expense_item_id === expenseItemId
                                ? {
                                      ...i,
                                      pastItemId: newItemId,
                                      pastTotal: clamped,
                                  }
                                : i,
                        ),
                    );
                } else {
                    const targetId = item.dept_bp_form2_item_id;
                    if (!targetId || !plan.dept_budget_plan_id) return;
                    await API.put(
                        `/department-budget-plans/${plan.dept_budget_plan_id}/items/${targetId}`,
                        { sem1_amount: clamped },
                    );
                }

                const newTotal = hasPastRecord ? item.pastTotal : clamped;
                setItems((prev) =>
                    prev.map((i) =>
                        i.expense_item_id === expenseItemId
                            ? {
                                  ...i,
                                  pastSem1: clamped,
                                  pastSem2: newTotal - clamped,
                              }
                            : i,
                    ),
                );
                setPastSem1Edits((prev) => {
                    const n = new Map(prev);
                    n.delete(expenseItemId);
                    return n;
                });
            })();

            toast.promise(promise, {
                loading: "Saving Sem 1…",
                success: "Sem 1 saved",
                error: (err: any) =>
                    `Failed: ${err.response?.data?.message || err.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingPastItems((prev) => {
                    const n = new Set(prev);
                    n.delete(expenseItemId);
                    return n;
                });
            }
        },
        [items, pastSem1Edits, pastYearPlan, isAdmin, plan.dept_budget_plan_id],
    );

    // ── Handlers: obligation (regular items) ──────────────────────────────────

    const handleObligationBlur = useCallback(
        async (expenseItemId: number) => {
            const edit = obligationEdits.get(expenseItemId);
            if (edit === undefined) return;
            const item = items.find((i) => i.expense_item_id === expenseItemId);
            if (!item) return;

            const clamped = Math.max(edit, 0);
            if (clamped !== edit)
                setObligationEdits((prev) =>
                    new Map(prev).set(expenseItemId, clamped),
                );
            if (clamped === savedObligations.current.get(expenseItemId)) {
                setObligationEdits((prev) => {
                    const n = new Map(prev);
                    n.delete(expenseItemId);
                    return n;
                });
                return;
            }

            const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
            if (!oblPlanId) {
                toast.error(
                    "No obligation year plan found for this department.",
                );
                return;
            }

            setSavingObligations((prev) => new Set(prev).add(expenseItemId));
            const promise = (async () => {
                if (item.pastObligationItemId) {
                    await API.put(
                        `/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`,
                        { obligation_amount: clamped },
                    );
                } else {
                    const res = await API.post(
                        `/department-budget-plans/${oblPlanId}/items`,
                        {
                            expense_item_id: expenseItemId,
                            obligation_amount: clamped,
                        },
                    );
                    const newItemId = res.data.data?.dept_bp_form2_item_id;
                    setItems((prev) =>
                        prev.map((i) =>
                            i.expense_item_id === expenseItemId
                                ? { ...i, pastObligationItemId: newItemId }
                                : i,
                        ),
                    );
                    await API.post(
                        `/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`,
                        { expense_item_id: expenseItemId },
                    ).catch(() => {});
                    await API.post(
                        `/department-budget-plans/${plan.dept_budget_plan_id}/items`,
                        { expense_item_id: expenseItemId },
                    ).catch(() => {});
                }

                savedObligations.current.set(expenseItemId, clamped);
                setItems((prev) =>
                    prev.map((i) =>
                        i.expense_item_id === expenseItemId
                            ? { ...i, pastObligation: clamped }
                            : i,
                    ),
                );
                setObligationEdits((prev) => {
                    const n = new Map(prev);
                    n.delete(expenseItemId);
                    return n;
                });
                onItemUpdate();
            })();

            toast.promise(promise, {
                loading: "Saving obligation…",
                success: "Obligation saved",
                error: (e: any) =>
                    `Failed: ${e.response?.data?.message || e.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingObligations((prev) => {
                    const n = new Set(prev);
                    n.delete(expenseItemId);
                    return n;
                });
            }
        },
        [
            items,
            obligationEdits,
            obligationYearPlan,
            pastYearPlan,
            plan.dept_budget_plan_id,
            onItemUpdate,
        ],
    );

    // ── Handlers: delete item ─────────────────────────────────────────────────

    // Puts a removed item back into the list if the delete is undone or the
    // API call fails. Order doesn't matter — itemsByClassification re-sorts
    // by expense_class_item_id every render.
    const restoreItemToList = useCallback((item: ItemWithMeta) => {
        setItems((prev) =>
            prev.some((i) => i.dept_bp_form2_item_id === item.dept_bp_form2_item_id)
                ? prev
                : [...prev, item],
        );
    }, []);

    const finalizeItemDelete = useCallback(
        (item: ItemWithMeta) => {
            const itemId = item.dept_bp_form2_item_id;
            API.delete(
                `/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`,
            )
                .then(() => {
                    onItemUpdate();
                })
                .catch(() => {
                    toast.error("Failed to delete item — restoring it.");
                    restoreItemToList(item);
                })
                .finally(() => {
                    pendingDeleteItemsRef.current.delete(itemId);
                    localStorage.removeItem(
                        form2PendingDeleteKey(plan.dept_budget_plan_id, itemId),
                    );
                });
        },
        [plan.dept_budget_plan_id, onItemUpdate, restoreItemToList],
    );

    const showDeleteToast = useCallback(
        (item: ItemWithMeta, durationMs: number) => {
            const itemId = item.dept_bp_form2_item_id;
            undoneDeleteIdsRef.current.delete(itemId);

            toast(`"${item.expense_item?.expense_class_item_name || "Item"}" deleted`, {
                id: `delete-form2-item-${itemId}`,
                description: "Cannot be undone",
                duration: durationMs,
                icon: <CountdownRing durationMs={durationMs} />,
                classNames: {
                    title: "!text-red-900",
                    description: "!text-red-600",
                },
                action: {
                    label: "Undo",
                    onClick: () => {
                        undoneDeleteIdsRef.current.add(itemId);
                        pendingDeleteItemsRef.current.delete(itemId);
                        localStorage.removeItem(
                            form2PendingDeleteKey(plan.dept_budget_plan_id, itemId),
                        );
                        restoreItemToList(item);
                    },
                },
                // fires only when Sonner's own timer completes — which Sonner
                // already pauses automatically while the toast is hovered
                onAutoClose: () => {
                    if (undoneDeleteIdsRef.current.has(itemId)) return;
                    finalizeItemDelete(item);
                },
            });
        },
        [finalizeItemDelete, restoreItemToList, plan.dept_budget_plan_id],
    );

    const handleDeleteItem = useCallback(
        (itemId: number, expenseItemId: number) => {
            const item = items.find((i) => i.dept_bp_form2_item_id === itemId);
            if (!item) return;
            if (Number(item.total_amount) > 0) {
                toast.warning("Cannot delete — this item has a proposed amount. Set it to 0 first.");
                return;
            }
            if (item.pastTotal > 0) {
                toast.warning("Cannot delete — this item has appropriation data in the prior year.");
                return;
            }
            if (item.pastObligation > 0) {
                toast.warning("Cannot delete — this item has obligation data in the obligation year.");
                return;
            }

            const deleteAt = Date.now() + DELETE_GRACE_MS;
            // Persist BEFORE touching state, so a refresh during the undo
            // window can pick this back up instead of losing track of it.
            localStorage.setItem(
                form2PendingDeleteKey(plan.dept_budget_plan_id, itemId),
                JSON.stringify({ item, deleteAt }),
            );

            // Optimistic removal — gone from the list immediately, undoable for 5s
            pendingDeleteItemsRef.current.set(itemId, item);
            setItems((prev) => prev.filter((i) => i.dept_bp_form2_item_id !== itemId));
            showDeleteToast(item, DELETE_GRACE_MS);
        },
        [items, showDeleteToast, plan.dept_budget_plan_id],
    );

    // ── Resume any pending deletes that were still in their undo window when
    // this component was last unmounted (e.g. a hard refresh mid-countdown).
    // Runs after `items` has been (re)built from plan/pastYearPlan/obligationYearPlan,
    // so it can immediately re-remove the item if the server never got the delete.
    // Placed after finalizeItemDelete/showDeleteToast so it can reference them
    // without a "used before declaration" error.
    useEffect(() => {
        if (hasReconciledForm2Deletes.current) return;
        const planId = plan.dept_budget_plan_id;
        if (!planId) return;
        hasReconciledForm2Deletes.current = true;

        const prefix = `${FORM2_PENDING_DELETE_PREFIX}${planId}_`;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key || !key.startsWith(prefix)) continue;
            const raw = localStorage.getItem(key);
            if (!raw) continue;

            let parsed: { item: ItemWithMeta; deleteAt: number } | null = null;
            try {
                parsed = JSON.parse(raw);
            } catch {
                localStorage.removeItem(key);
                continue;
            }
            if (!parsed) continue;

            const { item, deleteAt } = parsed;
            const itemId = item.dept_bp_form2_item_id;

            // Re-remove from the freshly rebuilt list (the server never got
            // the delete request, so it's still present in plan.items).
            setItems((prev) => prev.filter((i) => i.dept_bp_form2_item_id !== itemId));
            pendingDeleteItemsRef.current.set(itemId, item);

            const remaining = deleteAt - Date.now();
            if (remaining <= 0) {
                localStorage.removeItem(key);
                finalizeItemDelete(item);
            } else {
                showDeleteToast(item, remaining);
            }
        }
    }, [items, plan.dept_budget_plan_id, finalizeItemDelete, showDeleteToast]);

    // ── Card click → context menu (admin + review/card mode only) ─────────────
    const handleCardContextClick = useCallback(
        (e: React.MouseEvent, item: ItemWithMeta) => {
            if (!isAdmin || !cardView) return;
            const target = e.target as HTMLElement;
            if (target.closest('input, button, textarea, select')) return; // don't hijack existing inputs/trash icon
            e.preventDefault();
            e.stopPropagation();
            const MENU_W = 180, MENU_H = 95;
            const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
            const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
            setCtxMenuItem(item);
            setCtxMenuPos({ x, y });
        },
        [isAdmin, cardView],
    );

    const openMoveModal = useCallback(() => {
        if (!ctxMenuItem) return;
        setMoveSource(ctxMenuItem);
        setMoveSearch('');
        setMoveDestination(null);
        setMoveClassFilter('all');
        setMoveInputMode('amount');
        const fullAmount = Number(ctxMenuItem.total_amount);
        setMoveAmountDraft(
            Number.isInteger(fullAmount) ? fullAmount.toString() : fullAmount.toFixed(2),
        );
        setMovePercentDraft('100');
        setMoveAnchorPos(ctxMenuPos); // open the move panel right where the menu was
        setCtxMenuItem(null);
        setCtxMenuPos(null);
    }, [ctxMenuItem, ctxMenuPos]);

    // Raw (unclamped) numeric reading of whichever field the user is typing in —
    // used to detect and display "exceeds available" errors before we clamp anything.
    const moveRawAmountNum  = useMemo(() => parseFloat(moveAmountDraft.replace(/[^0-9.]/g, ''))  || 0, [moveAmountDraft]);
    const moveRawPercentNum = useMemo(() => parseFloat(movePercentDraft.replace(/[^0-9.]/g, '')) || 0, [movePercentDraft]);

    const moveSourceTotal = moveSource ? Number(moveSource.total_amount) : 0;

    const moveAmountExceeds =
        !!moveSource && moveInputMode === 'amount' && moveRawAmountNum > moveSourceTotal;
    const movePercentExceeds =
        !!moveSource && moveInputMode === 'percent' && moveRawPercentNum > 100;
    const moveInputInvalid = moveAmountExceeds || movePercentExceeds;

    // Parsed + clamped move amount (0 .. full source amount), derived from whichever
    // input mode is active — direct ₱ amount, or a typed percentage of the source total.
    // Clamped only for safe internal math (e.g. previewing "remains on source");
    // the raw values above are what drive the red/error state shown to the user.
    const moveAmount = useMemo(() => {
        if (!moveSource) return 0;
        const sourceTotal = Number(moveSource.total_amount);
        if (moveInputMode === 'percent') {
            const clampedPct = Math.min(Math.max(moveRawPercentNum, 0), 100);
            return Math.round((sourceTotal * clampedPct) / 100);
        }
        return Math.min(Math.max(moveRawAmountNum, 0), sourceTotal);
    }, [moveInputMode, moveRawAmountNum, moveRawPercentNum, moveSource]);

    // Keep the two drafts roughly in sync so switching modes doesn't reset the value
    const toggleMoveInputMode = useCallback(() => {
        if (!moveSource) return;
        const sourceTotal = Number(moveSource.total_amount);
        if (moveInputMode === 'amount') {
            const pct = sourceTotal > 0 ? (moveAmount / sourceTotal) * 100 : 0;
            setMovePercentDraft(pct ? pct.toFixed(2).replace(/\.?0+$/, '') : '');
            setMoveInputMode('percent');
        } else {
            setMoveAmountDraft(moveAmount ? Math.round(moveAmount).toString() : '');
            setMoveInputMode('amount');
        }
    }, [moveInputMode, moveAmount, moveSource]);

    const openRemoveAppropriation = useCallback(() => {
        if (!ctxMenuItem) return;
        handleDeleteItem(ctxMenuItem.dept_bp_form2_item_id, ctxMenuItem.expense_item_id);
        setCtxMenuItem(null);
        setCtxMenuPos(null);
    }, [ctxMenuItem, handleDeleteItem]);

    // `items` is Form2's flat state covering every classification — the grouping
    // in `itemsByClassification` is only a rendering concern, so this candidate
    // list (and therefore "Move to…") already spans every classification, not
    // just the source item's own class.
    const classNameById = useMemo(() => {
        const map = new Map<number, string>();
        classifications.forEach((c) => map.set(c.expense_class_id, c.expense_class_name));
        return map;
    }, [classifications]);

    // Classifications actually present among move candidates (for the filter chips)
    const moveClassOptions = useMemo(() => {
        if (!moveSource) return [];
        const seen = new Map<number, string>();
        items.forEach((i) => {
            if (i.expense_item_id === moveSource.expense_item_id) return;
            const id = i.expense_item?.expense_class_id;
            if (id == null) return;
            const name = classNameById.get(id);
            if (name) seen.set(id, name);
        });
        return Array.from(seen.entries())
            .map(([id, name]) => ({ id, name }))
            .sort((a, b) => a.id - b.id);
    }, [items, moveSource, classNameById]);

    const moveCandidates = useMemo(() => {
        if (!moveSource) return [];
        const q = moveSearch.toLowerCase();
        return items
            .filter((i) => i.expense_item_id !== moveSource.expense_item_id)
            .filter((i) =>
                moveClassFilter === 'all'
                    ? true
                    : String(i.expense_item?.expense_class_id) === moveClassFilter,
            )
            .filter((i) => {
                if (!q) return true;
                const clsName = classNameById.get(i.expense_item?.expense_class_id ?? -1) ?? '';
                return (
                    i.expense_item?.expense_class_item_name?.toLowerCase().includes(q) ||
                    i.expense_item?.expense_class_item_acc_code?.toLowerCase().includes(q) ||
                    clsName.toLowerCase().includes(q)
                );
            })
            .sort((a, b) => (a.expense_item?.expense_class_id ?? 999) - (b.expense_item?.expense_class_id ?? 999));
    }, [items, moveSource, moveSearch, moveClassFilter, classNameById]);

    // Appends a new note to an existing recommendation instead of overwriting it.
    // Notes are stored joined by ";" — a plain-text marker that survives any
    // backend whitespace trimming and never collides with the commas already
    // present in peso-formatted amounts (e.g. "₱150,000").
    const REC_DELIM = ';';
    const appendRecommendation = (existing: string | null | undefined, note: string): string => {
        const trimmed = (existing ?? '').trim();
        return trimmed ? `${trimmed}${REC_DELIM}${note}` : note;
    };

    // Expands a stored ";"-joined recommendation into separate lines for the
    // tooltip — no bullets, just one note per line. Single notes (no
    // delimiter) pass through unchanged.
    const formatRecommendationTooltip = (rec: string | null | undefined): string => {
        if (!rec) return '';
        const parts = rec.split(REC_DELIM).map(p => p.trim()).filter(Boolean);
        if (parts.length <= 1) return rec;
        return parts.join('\n');
    };

    const handleMoveConfirmed = useCallback(async () => {
        if (!moveSource || !moveDestination) return;
        const sourceAmt   = Number(moveSource.total_amount);
        const amountMoved = Math.min(Math.max(moveAmount, 0), sourceAmt); // safety clamp
        if (amountMoved <= 0) return;

        const sourceRemaining = sourceAmt - amountMoved;
        const destNewAmt      = Number(moveDestination.total_amount) + amountMoved;
        const isFullMove       = sourceRemaining === 0;
        const sourceName = moveSource.expense_item?.expense_class_item_name || 'Item';
        const destName   = moveDestination.expense_item?.expense_class_item_name || 'Item';

        // Today's date for the note, e.g. "Jul 5, 2026"
        const today = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        const sourceNote = `Moved ${fmtP(amountMoved)} to "${destName}" (${today})`;
        const destNote    = `Received ${fmtP(amountMoved)} from "${sourceName}" (${today})`;
        const sourceNewRec = appendRecommendation(moveSource.recommendation, sourceNote);
        const destNewRec   = appendRecommendation(moveDestination.recommendation, destNote);

        setMoving(true);
        const promise = (async () => {
            // Save/increment destination (amount + appended recommendation)
            if (moveDestination.dept_bp_form2_item_id === 0) {
                const res = await API.post(
                    `/department-budget-plans/${plan.dept_budget_plan_id}/items`,
                    {
                        expense_item_id: moveDestination.expense_item_id,
                        total_amount: destNewAmt,
                        recommendation: destNewRec,
                    },
                );
                const savedId = res.data.data?.dept_bp_form2_item_id;
                setItems((prev) =>
                    prev.map((i) =>
                        i.expense_item_id === moveDestination.expense_item_id
                            ? {
                                  ...i,
                                  total_amount: destNewAmt,
                                  recommendation: destNewRec,
                                  dept_bp_form2_item_id: savedId ?? i.dept_bp_form2_item_id,
                              }
                            : i,
                    ),
                );
            } else {
                await API.put(
                    `/department-budget-plans/${plan.dept_budget_plan_id}/items/${moveDestination.dept_bp_form2_item_id}`,
                    { total_amount: destNewAmt, recommendation: destNewRec },
                );
                setItems((prev) =>
                    prev.map((i) =>
                        i.expense_item_id === moveDestination.expense_item_id
                            ? { ...i, total_amount: destNewAmt, recommendation: destNewRec }
                            : i,
                    ),
                );
            }

            // Reduce source by the moved amount (may or may not hit 0), append its own note
            if (moveSource.dept_bp_form2_item_id > 0) {
                await API.put(
                    `/department-budget-plans/${plan.dept_budget_plan_id}/items/${moveSource.dept_bp_form2_item_id}`,
                    { total_amount: sourceRemaining, recommendation: sourceNewRec },
                );
            }
            setItems((prev) =>
                prev.map((i) =>
                    i.expense_item_id === moveSource.expense_item_id
                        ? { ...i, total_amount: sourceRemaining, recommendation: sourceNewRec }
                        : i,
                ),
            );

            savedValues.current.set(moveDestination.expense_item_id, destNewAmt);
            savedValues.current.set(moveSource.expense_item_id, sourceRemaining);
            savedRecommendations.current.set(moveSource.expense_item_id, sourceNewRec);
            savedRecommendations.current.set(moveDestination.expense_item_id, destNewRec);
            onItemUpdate();
        })();

        toast.promise(promise, {
            loading: 'Moving…',
            success: isFullMove
                ? `${fmtP(amountMoved)} of "${sourceName}" moved to "${destName}" — combined total ${fmtP(destNewAmt)}`
                : `${fmtP(amountMoved)} moved from "${sourceName}" (₱${fmt(sourceRemaining)} remaining) to "${destName}" — new total ${fmtP(destNewAmt)}`,
            error: (err: any) => `Failed to move: ${err.response?.data?.message || err.message}`,
        });

        try {
            await promise;
        } catch {
            /* handled by toast */
        } finally {
            setMoving(false);
            setMoveSource(null);
            setMoveDestination(null);
        }
    }, [moveSource, moveDestination, moveAmount, plan.dept_budget_plan_id, onItemUpdate]);

    // ── Handlers: recommendation (regular items) ──────────────────────────────

    const handleRecommendationChange = useCallback(
        (id: number, value: string) =>
            setItems((prev) =>
                prev.map((i) =>
                    i.expense_item_id === id
                        ? { ...i, recommendation: value }
                        : i,
                ),
            ),
        [],
    );

    const handleRecommendationBlur = useCallback(
        async (expenseItemId: number) => {
            const item = items.find((i) => i.expense_item_id === expenseItemId);
            if (!item || item.dept_bp_form2_item_id === 0) return;

            const cur = item.recommendation ?? null;
            if (
                normRec(savedRecommendations.current.get(expenseItemId)) ===
                    normRec(cur) ||
                savingRecommendations.has(expenseItemId)
            )
                return;

            setSavingRecommendations((prev) =>
                new Set(prev).add(expenseItemId),
            );
            const promise = (async () => {
                await API.put(
                    `/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`,
                    { recommendation: normRec(cur) },
                );
                savedRecommendations.current.set(expenseItemId, cur);
            })();

            toast.promise(promise, {
                loading: "Saving…",
                success: "Recommendation saved",
                error: (err) =>
                    `Failed: ${err.response?.data?.message || err.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingRecommendations((prev) => {
                    const n = new Set(prev);
                    n.delete(expenseItemId);
                    return n;
                });
            }
        },
        [items, plan.dept_budget_plan_id, savingRecommendations],
    );

    // ── Handlers: AIP recommendation ─────────────────────────────────────────

    const handleAipRecChange = useCallback(
        (id: number, value: string) =>
            setAipItems((prev) =>
                prev.map((i) =>
                    i.dept_bp_form4_item_id === id
                        ? { ...i, recommendation: value }
                        : i,
                ),
            ),
        [],
    );

    const handleAipRecBlur = useCallback(
        async (id: number) => {
            const item = aipItems.find((i) => i.dept_bp_form4_item_id === id);
            if (!item) return;

            const cur = (item as any).recommendation ?? null;
            if (
                normRec(savedAipRecommendations.current.get(id)) ===
                    normRec(cur) ||
                savingAipRecommendations.has(id)
            )
                return;

            setSavingAipRecommendations((prev) => new Set(prev).add(id));
            const promise = (async () => {
                await API.put(`/form4-items/${id}`, {
                    recommendation: normRec(cur),
                });
                savedAipRecommendations.current.set(id, cur);
            })();

            toast.promise(promise, {
                loading: "Saving…",
                success: "Recommendation saved",
                error: (err) =>
                    `Failed: ${err.response?.data?.message || err.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingAipRecommendations((prev) => {
                    const n = new Set(prev);
                    n.delete(id);
                    return n;
                });
            }
        },
        [aipItems, savingAipRecommendations],
    );

    // ── Handlers: AIP obligation ──────────────────────────────────────────────

    const handleAipOblBlur = useCallback(
        async (id: number) => {
            const edit = aipOblEditsRef.current.get(id);
            if (edit === undefined) return;

            const aipProgramId = aipProgramIdRef.current.get(id);
            if (!aipProgramId) return;

            const clamped = Math.max(edit, 0);
            if (clamped === savedAipObligations.current.get(id)) {
                aipOblEditsRef.current.delete(id);
                setAipOblEdits((prev) => {
                    const n = new Map(prev);
                    n.delete(id);
                    return n;
                });
                return;
            }

            const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
            if (!oblPlanId) {
                toast.error("Obligation year plan not found.");
                return;
            }

            setSavingAipObligations((prev) => new Set(prev).add(id));

            const promise = (async () => {
                const listRes = await API.get("/form4-items", {
                    params: { budget_plan_id: oblPlanId },
                });
                const existing = (listRes.data.data ?? []).find(
                    (pi: any) =>
                        Number(pi.aip_program_id) === Number(aipProgramId),
                );

                if (existing) {
                    await API.put(
                        `/form4-items/${existing.dept_bp_form4_item_id}`,
                        { obligation_amount: clamped },
                    );
                    oblAipItemIdRef.current.set(
                        id,
                        existing.dept_bp_form4_item_id,
                    );
                } else {
                    const currentItem = aipItems.find(
                        (i) => i.dept_bp_form4_item_id === id,
                    );
                    const res = await API.post("/form4-items", {
                        budget_plan_id: oblPlanId,
                        aip_program_id: aipProgramId,
                        program_description:
                            currentItem?.program_description ?? "",
                        obligation_amount: clamped,
                        ps_amount: 0,
                        mooe_amount: 0,
                        co_amount: 0,
                    });
                    const newId = res.data.data?.dept_bp_form4_item_id;
                    if (newId) oblAipItemIdRef.current.set(id, newId);
                }

                savedAipObligations.current.set(id, clamped);
                setAipItems((prev) =>
                    prev.map((i) =>
                        i.dept_bp_form4_item_id === id
                            ? { ...i, obligation_amount: clamped }
                            : i,
                    ),
                );
                aipOblEditsRef.current.delete(id);
                setAipOblEdits((prev) => {
                    const n = new Map(prev);
                    n.delete(id);
                    return n;
                });
                onItemUpdate();
            })();

            toast.promise(promise, {
                loading: "Saving obligation…",
                success: "Obligation saved",
                error: (e: any) =>
                    `Failed: ${e.response?.data?.message || e.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingAipObligations((prev) => {
                    const n = new Set(prev);
                    n.delete(id);
                    return n;
                });
            }
        },
        [aipItems, obligationYearPlan, onItemUpdate],
    );

    // ── Handlers: AIP sem1 ────────────────────────────────────────────────────

    const handleAipSem1Blur = useCallback(
        async (id: number) => {
            const edit = aipSem1EditsRef.current.get(id);
            if (edit === undefined) return;
            const clamped = Math.max(edit, 0);
            if (clamped === savedAipSem1.current.get(id)) {
                aipSem1EditsRef.current.delete(id);
                setAipSem1Edits((prev) => {
                    const n = new Map(prev);
                    n.delete(id);
                    return n;
                });
                return;
            }
            const appPlanId = pastYearPlan?.dept_budget_plan_id;
            if (!appPlanId) {
                toast.error("Appropriation year plan not found.");
                return;
            }
            const aipProgramId = aipProgramIdRef.current.get(id);
            if (!aipProgramId) return;
            setSavingAipSem1((prev) => new Set(prev).add(id));
            const promise = (async () => {
                const listRes = await API.get("/form4-items", {
                    params: { budget_plan_id: appPlanId },
                });
                const existing = (listRes.data.data ?? []).find(
                    (pi: any) =>
                        Number(pi.aip_program_id) === Number(aipProgramId),
                );
                const appTotal =
                    (aipItems.find((i) => i.dept_bp_form4_item_id === id) as any)
                        ?.app_total ?? 0;
                const sem2 = Math.max(appTotal - clamped, 0);
                if (existing) {
                    await API.put(
                        `/form4-items/${existing.dept_bp_form4_item_id}`,
                        { sem1_amount: clamped, sem2_amount: sem2 },
                    );
                } else {
                    const currentItem = aipItems.find(
                        (i) => i.dept_bp_form4_item_id === id,
                    );
                    await API.post("/form4-items", {
                        budget_plan_id: appPlanId,
                        aip_program_id: aipProgramId,
                        program_description:
                            currentItem?.program_description ?? "",
                        sem1_amount: clamped,
                        sem2_amount: sem2,
                    });
                }
                savedAipSem1.current.set(id, clamped);
                setAipItems((prev) =>
                    prev.map((i) =>
                        i.dept_bp_form4_item_id === id
                            ? { ...i, app_sem1: clamped, app_sem2: sem2 }
                            : i,
                    ),
                );
                aipSem1EditsRef.current.delete(id);
                setAipSem1Edits((prev) => {
                    const n = new Map(prev);
                    n.delete(id);
                    return n;
                });
            })();
            toast.promise(promise, {
                loading: "Saving Sem 1…",
                success: "Sem 1 saved",
                error: (e: any) =>
                    `Failed: ${e.response?.data?.message || e.message}`,
            });
            try {
                await promise;
            } catch {
                /* handled by toast */
            } finally {
                setSavingAipSem1((prev) => {
                    const n = new Set(prev);
                    n.delete(id);
                    return n;
                });
            }
        },
        [aipItems, pastYearPlan],
    );

    // ── Unified comma-input helpers ───────────────────────────────────────────

    const handleCommaInput = useCallback(
        (id: number, field: DraftField, rawValue: string, el?: HTMLInputElement, cursorPos?: number) => {
            const rawDigits = rawValue.replace(/[^0-9.]/g, "");
            const digits = clampAmountDigits(rawDigits);
            // If clamping shortened the string (user typed past the cap), pin the
            // cursor to the end so it doesn't end up past the visible text.
            const cappedPos =
                cursorPos !== undefined
                    ? Math.min(cursorPos, digits.length)
                    : cursorPos;
            setDraft(`${id}_${field}`, digits, el, cappedPos);
            const num = digits === "" ? 0 : parseFloat(digits);
            if (field === "proposed")
                setItems((prev) =>
                    prev.map((i) =>
                        i.expense_item_id === id
                            ? { ...i, total_amount: num }
                            : i,
                    ),
                );
            else if (field === "sem1")
                setPastSem1Edits((prev) => new Map(prev).set(id, num));
            else setObligationEdits((prev) => new Map(prev).set(id, num));
        },
        [setDraft],
    );

    const handleCommaBlur = useCallback(
        (id: number, field: DraftField) => {
            clearDraft(`${id}_${field}`);
            if (field === "proposed") handleProposedBlur(id);
            else if (field === "sem1") handlePastSem1Blur(id);
            else handleObligationBlur(id);
        },
        [
            clearDraft,
            handleProposedBlur,
            handlePastSem1Blur,
            handleObligationBlur,
        ],
    );

    const handleAipCommaInput = useCallback(
        (id: number, field: "obligation" | "sem1", rawValue: string) => {
            const rawDigits = rawValue.replace(/[^0-9]/g, "");
            const clamped = clampAmountDigits(rawDigits).replace(/[^0-9]/g, "");
            const digits = clamped;
            const num = digits === "" ? 0 : parseInt(digits, 10);
            setDraft(`aip_${id}_${field}`, digits);
            if (field === "obligation") {
                aipOblEditsRef.current.set(id, num);
                setAipOblEdits((prev) => new Map(prev).set(id, num));
            } else {
                aipSem1EditsRef.current.set(id, num);
                setAipSem1Edits((prev) => new Map(prev).set(id, num));
            }
        },
        [setDraft],
    );

    const handleAipCommaBlur = useCallback(
        (id: number, field: "obligation" | "sem1") => {
            clearDraft(`aip_${id}_${field}`);
            if (field === "obligation") handleAipOblBlur(id);
            else handleAipSem1Blur(id);
        },
        [clearDraft, handleAipOblBlur, handleAipSem1Blur],
    );

    // ── Memoized derived data ─────────────────────────────────────────────────

    const itemsByClassification = useMemo(
        () =>
            classifications
                .filter(
                    (c) =>
                        !c.expense_class_name
                            .toLowerCase()
                            .includes("financial expenses"),
                )
                .map((c) => ({
                    ...c,
                    items: items
                        .filter(
                            (i) =>
                                i.expense_item?.expense_class_id ===
                                c.expense_class_id,
                        )
                        .sort(
                            (a, b) =>
                                (a.expense_item?.expense_class_item_id ?? 0) -
                                (b.expense_item?.expense_class_item_id ?? 0),
                        ),
                })),
        [classifications, items],
    );



    const grandTotals = useMemo(() => {
        let pastSem1 = 0,
            pastSem2 = 0,
            pastTotal = 0,
            proposed = 0,
            obligation = 0;
        for (const i of items) {
            const sem1 = pastSem1Edits.has(i.expense_item_id)
                ? pastSem1Edits.get(i.expense_item_id)!
                : i.pastSem1;
            const cap = i.pastTotal > 0 ? i.pastTotal : 0;
            // const sem2 = pastSem1Edits.has(i.expense_item_id)
            //     ? Math.max(cap - sem1, 0)
            //     : i.pastSem2;
            const sem2 = Math.max(cap - sem1, 0);
            pastSem1 += sem1;
            pastSem2 += sem2;
            pastTotal += i.pastTotal;
            proposed += Number(i.total_amount);
            obligation += i.pastObligation;
        }
        return { pastSem1, pastSem2, pastTotal, proposed, obligation };
    }, [items, pastSem1Edits]);

    const aipTotal = useMemo(
        () => aipItems.reduce((s, i) => s + i.total_amount, 0),
        [aipItems],
    );
    const calamityTotal = calamityActualTotal;

    const aipObligationTotal = useMemo(
        () =>
            aipItems.reduce(
                (s, i) => s + ((i as any).obligation_amount ?? 0),
                0,
            ),
        [aipItems],
    );

    // ── AIP appropriation-year subtotals (needed for grand-total blue columns) ─
    const aipAppSem1 = useMemo(
        () => aipItems.reduce((s, i) => s + ((i as any).app_sem1 ?? 0), 0),
        [aipItems],
    );
    const aipAppSem2 = useMemo(
        () => aipItems.reduce((s, i) => s + ((i as any).app_sem2 ?? 0), 0),
        [aipItems],
    );
    const aipAppTotal = useMemo(
        () => aipItems.reduce((s, i) => s + ((i as any).app_total ?? 0), 0),
        [aipItems],
    );

    const grandFinal = useMemo(
        () => ({
            ...grandTotals,
            // Add AIP appropriation-year amounts into the blue Appropriation columns
            pastSem1:  grandTotals.pastSem1  + aipAppSem1,
            pastSem2:  grandTotals.pastSem2  + aipAppSem2,
            pastTotal: grandTotals.pastTotal + aipAppTotal,
            proposed:
                grandTotals.proposed +
                aipTotal +
                (isSpecialAccount ? calamityTotal : 0),
            obligation: grandTotals.obligation + aipObligationTotal,
        }),
        [
            grandTotals,
            aipTotal,
            aipAppSem1,
            aipAppSem2,
            aipAppTotal,
            aipObligationTotal,
            isSpecialAccount,
            calamityTotal,
        ],
    );

    const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
    const gtPct = pctOf(grandFinal.pastTotal, gtDiff);

    const hasRows = items.length > 0 || aipItems.length > 0;
    const hasAipSection = aipItems.length > 0;
    const hasCalamitySection = isSpecialAccount;

    let gIdx = 0;

    // Fixed-width grid so number columns line up across item rows, subtotals, and grand total
    const CARD_NUM_GRID = isAdmin
        ? 'grid grid-cols-[280px_280px_180px_140px_260px] gap-x-6 items-center'
        : 'grid grid-cols-[280px_280px_180px_140px] gap-x-6 items-center';

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    return (
        <>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
                <div>
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                        Form 2
                    </p>
                    <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
                        Programmed Appropriation and Obligation by Object of
                        Expenditures
                    </h3>
                </div>
            </div>

            {/* Submissions closed — department head view only. Admins keep full
                access regardless of isEditable, so this never shows for them. */}
            {plan.status === 'draft' && (plan.budget_plan as any)?.is_open === false && !isAdmin && !isViewer && (
                <div className="px-5 py-3 border-b border-amber-200 bg-amber-50 flex items-center gap-2.5">
                    <svg className="w-4 h-4 text-amber-500 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm.75-11.25a.75.75 0 00-1.5 0v4.5c0 .199.079.39.22.53l3 3a.75.75 0 101.06-1.06l-2.78-2.78V6.75z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[12.5px] text-amber-800">
                        <span className="font-semibold">Submissions are closed.</span>{" "}
                        Please wait for the Budget Office to open the Budget Preparation.
                    </p>
                </div>
            )}

           {isMobile ? (
  <div className="p-3 flex flex-col gap-2.5">
    <div className="sticky top-0 z-20 -mx-3 -mt-3 mb-1 px-3 pt-3 pb-2 bg-white/95 backdrop-blur-sm border-b border-gray-100">
      <div className="relative">
        <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={mobileSearch}
          onChange={(e) => setMobileSearch(e.target.value)}
          placeholder="Search items…"
          className="w-full h-10 pl-9 pr-9 text-[13px] rounded-full border border-gray-200 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-gray-300 focus:bg-white"
        />
        {mobileSearch && (
          <button
            onClick={() => setMobileSearch('')}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
    {itemsByClassification.map((cls) => {
      const filteredItems = cls.items.filter(matchesMobileSearch);
      if (cls.items.length === 0 || filteredItems.length === 0) return null;
      const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
        ? 'Capital Outlay (CO)'
        : cls.expense_class_name;
      const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
      const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
      const clsDiff = clsProp - clsPast;
      const clsPct = pctOf(clsPast, clsDiff);
      const isPS = cls.expense_class_id === PS_CLASS_ID;
      const canEdit = isEditable && (!isPS || isAdmin);
      return (
        <div key={cls.expense_class_id}>
          <div className="flex items-center justify-between gap-2 mb-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
            <div className="flex items-start gap-2 min-w-0">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-900 flex-shrink-0 mt-1" />
              <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900 leading-snug">{label}</p>
            </div>
            {canEdit && (
              <button
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    classificationId: cls.expense_class_id,
                    classificationName: cls.expense_class_name,
                  })
                }
                className="flex items-center gap-1 text-[10px] font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-full pl-2 pr-2.5 py-1 transition-colors flex-shrink-0"
              >
                <PlusIcon className="w-3 h-3" /> Add
              </button>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {filteredItems.map((item) => {
              const past = item.pastTotal;
              const proposed = Number(item.total_amount);
              const d = proposed - past;
              const p = pctOf(past, d);
              const isSaving = savingItems.has(item.expense_item_id);
              const dispSem1 = pastSem1Edits.has(item.expense_item_id)
                ? pastSem1Edits.get(item.expense_item_id)!
                : item.pastSem1;
              const sem2Cap = past > 0 ? past : 0;
              const dispSem2 = Math.max(sem2Cap - dispSem1, 0);
              const sem1Editable = isAdmin && isEditable && past > 0 && !!pastYearPlan;
              const isExpanded = expandedMobileItems.has(item.expense_item_id);
              return (
                <div key={item.expense_item_id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-3">
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-gray-800 leading-snug">
                        {item.expense_item?.expense_class_item_name ?? '—'}
                      </p>
                      <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                        {item.expense_item?.expense_class_item_acc_code ?? '—'}
                      </p>
                    </div>
                    {canEdit && item.dept_bp_form2_item_id > 0 && (
                      <button
                        onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
                        className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Proposed amount — the hero field, full-width tinted band, no border-box */}
                  <div className="bg-orange-50/70 px-4 py-3 flex items-center justify-between gap-2">
                    <div className="min-w-0 flex-shrink">
                      <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-500 whitespace-nowrap">
                        Proposed ({currYear})
                      </p>
                      <p className={cn('text-[10px] font-mono font-semibold mt-0.5 whitespace-nowrap', d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400')}>
                        {d === 0 ? 'No change' : `${d > 0 ? '+' : ''}${fmtP(d)} · ${past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}`}
                      </p>
                    </div>
                    {canEdit && isEditable ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={13}
                        value={getDraftValue(item.expense_item_id, "proposed", proposed)}
                        onChange={(e) => {
                          const pos = e.target.selectionStart ?? e.target.value.length;
                          handleCommaInput(item.expense_item_id, "proposed", e.target.value, e.target, pos);
                        }}
                        onBlur={() => handleCommaBlur(item.expense_item_id, "proposed")}
                        disabled={isSaving}
                        className="text-[16px] font-mono font-bold text-orange-700 w-full max-w-[168px] bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-right focus:outline-none focus:ring-2 focus:ring-orange-300"
                      />
                    ) : (
                      <p className="text-[18px] font-mono font-bold text-orange-700">
                        {proposed === 0 ? '–' : fmtP(proposed)}
                      </p>
                    )}
                  </div>

                  {/* Toggle — breakdown is collapsed by default */}
                  <button
                    onClick={() => toggleMobileExpand(item.expense_item_id)}
                    className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-100 text-[11px] font-medium text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    <span>{isExpanded ? 'Hide' : 'Show'} appropriation breakdown</span>
                    <svg
                      className={cn('w-3.5 h-3.5 transition-transform', isExpanded && 'rotate-180')}
                      viewBox="0 0 20 20" fill="currentColor"
                    >
                      <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                    </svg>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-gray-100">
                      {/* Past Obligation — green band, its own color like Proposed */}
                      {isAdmin && (
                        <div className="bg-emerald-50/70 px-4 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-emerald-600">
                            Past Obligation ({obligationYearPlan?.budget_plan?.year ?? '—'})
                          </span>
                          {isEditable ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getDraftValue(
                                item.expense_item_id,
                                "obligation",
                                obligationEdits.has(item.expense_item_id)
                                  ? obligationEdits.get(item.expense_item_id)!
                                  : item.pastObligation,
                              )}
                              onChange={(e) => {
                                const pos = e.target.selectionStart ?? e.target.value.length;
                                handleCommaInput(item.expense_item_id, "obligation", e.target.value, e.target, pos);
                              }}
                              onBlur={() => handleCommaBlur(item.expense_item_id, "obligation")}
                              disabled={savingObligations.has(item.expense_item_id)}
                              className="text-[13px] font-mono font-semibold text-emerald-700 w-28 bg-white border border-emerald-200 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                            />
                          ) : (
                            <span className="text-[13px] font-mono font-semibold text-emerald-700">
                              {item.pastObligation === 0 ? '–' : fmtP(item.pastObligation)}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Current appropriation — blue band, ordered Sem1 → Sem2 → Total */}
                      <div className="bg-blue-50/70 divide-y divide-blue-100/60">
                        <div className="px-4 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-blue-500">1st Sem</span>
                          {sem1Editable ? (
                            <input
                              type="text"
                              inputMode="numeric"
                              value={getDraftValue(item.expense_item_id, "sem1", dispSem1)}
                              onChange={(e) => {
                                const pos = e.target.selectionStart ?? e.target.value.length;
                                handleCommaInput(item.expense_item_id, "sem1", e.target.value, e.target, pos);
                              }}
                              onBlur={() => handleCommaBlur(item.expense_item_id, "sem1")}
                              disabled={savingPastItems.has(item.expense_item_id)}
                              className="text-[13px] font-mono font-semibold text-blue-700 w-28 bg-white border border-blue-200 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                            />
                          ) : (
                            <span className="text-[13px] font-mono font-semibold text-blue-700">
                              {dispSem1 === 0 ? '–' : fmtP(dispSem1)}
                            </span>
                          )}
                        </div>

                        <div className="px-4 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] font-medium text-blue-500">2nd Sem (auto)</span>
                          <span className="text-[13px] font-mono font-medium text-blue-600">
                            {dispSem2 === 0 ? '–' : fmtP(dispSem2)}
                          </span>
                        </div>

                        <div className="px-4 py-2.5 flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-blue-600">
                            Total Current ({prevYear})
                          </span>
                          <span className="text-[13px] font-mono font-bold text-blue-700">
                            {past === 0 ? '–' : fmtP(past)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Recommendation — quiet footer strip */}
                  {isAdmin && (
                    <div className="border-t border-gray-100 bg-gray-50/60 px-4 py-2.5">
                      {isEditable ? (
                        <input
                          type="text"
                          value={item.recommendation ?? ''}
                          onChange={(e) => handleRecommendationChange(item.expense_item_id, e.target.value)}
                          onBlur={() => handleRecommendationBlur(item.expense_item_id)}
                          placeholder="Add recommendation note…"
                          maxLength={255}
                          className="text-[12px] w-full bg-transparent focus:outline-none placeholder:text-gray-300"
                        />
                      ) : (
                        <span className="text-[12px] text-gray-500">{item.recommendation || 'No recommendation'}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mt-2">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mb-1.5">
              Total · {label}
            </p>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[19px] font-mono font-bold text-orange-700 leading-none">
                {clsProp === 0 ? '–' : fmtP2(clsProp)}
              </span>
              {!(clsPast === 0 && clsDiff === 0) && (
                <span className={cn(
                  'text-[10px] font-mono font-bold px-2 py-1 rounded-full flex-shrink-0',
                  clsDiff > 0 ? 'text-emerald-700 bg-emerald-100' : clsDiff < 0 ? 'text-red-700 bg-red-100' : 'text-gray-500 bg-gray-100',
                )}>
                  {clsDiff >= 0 ? '+' : ''}{fmtP2(clsDiff)} ({clsPct.toFixed(1)}%)
                </span>
              )}
            </div>
          </div>
        </div>
      );
    })}

    {aipItems.length > 0 && (
      <div>
        <div className="flex items-center gap-2 mb-2 px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 shadow-sm">
          <span className="w-1.5 h-1.5 rounded-full bg-violet-500 flex-shrink-0" />
          <p className="text-[11px] font-bold uppercase tracking-wide text-gray-900">Special Programs (AIP)</p>
        </div>
        <div className="flex flex-col gap-2">
          {aipItems.map((item) => {
            const appTotal = (item as any).app_total ?? 0;
            const proposed = item.total_amount;
            const d = proposed - appTotal;
            const p = pctOf(appTotal, d);
            const id = item.dept_bp_form4_item_id;
            const isAipExpanded = expandedMobileAipItems.has(id);
            return (
              <div key={id} className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
                {/* Header */}
                <div className="flex items-start justify-between gap-2 px-4 pt-3.5 pb-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-gray-800 leading-snug">
                      {item.program_description || '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 font-mono mt-0.5">
                      {item.aip_reference_code || '—'}
                    </p>
                  </div>
                </div>

                {/* Proposed amount — hero band, boxed value like the regular item cards */}
                <div className="bg-orange-50/70 px-4 py-3 flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-shrink">
                    <p className="text-[9px] font-semibold uppercase tracking-wide text-orange-500 whitespace-nowrap">
                      Proposed ({currYear})
                    </p>
                    <p className={cn('text-[10px] font-mono font-semibold mt-0.5 whitespace-nowrap', d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {d === 0 ? 'No change' : `${d > 0 ? '+' : ''}${fmtP(d)} · ${appTotal === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}`}
                    </p>
                  </div>
                  <span className="text-[16px] font-mono font-bold text-orange-700 w-full max-w-[168px] bg-white border border-orange-200 rounded-lg px-2.5 py-1.5 text-right flex-shrink-0">
                    {proposed === 0 ? '–' : fmtP(proposed)}
                  </span>
                </div>

                {/* Toggle — breakdown collapsed by default, same as regular expense items */}
                <button
                  onClick={() => toggleMobileAipExpand(id)}
                  className="w-full flex items-center justify-between px-4 py-2 border-t border-gray-100 text-[11px] font-medium text-gray-400 hover:bg-gray-50 transition-colors"
                >
                  <span>{isAipExpanded ? 'Hide' : 'Show'} appropriation breakdown</span>
                  <svg
                    className={cn('w-3.5 h-3.5 transition-transform', isAipExpanded && 'rotate-180')}
                    viewBox="0 0 20 20" fill="currentColor"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </button>

                {isAipExpanded && (
                  <div className="border-t border-gray-100">
                    {/* Past Obligation — green band, editable, admin only — matches regular item cards */}
                    {isAdmin && (
                      <div className="bg-emerald-50/70 px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-emerald-600">
                          Past Obligation ({obligationYearPlan?.budget_plan?.year ?? '—'})
                        </span>
                        {isEditable ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              inputDraft.has(`aip_${id}_obligation`)
                                ? inputDraft.get(`aip_${id}_obligation`)!
                                : comma(aipOblEdits.has(id) ? aipOblEdits.get(id)! : ((item as any).obligation_amount ?? 0))
                            }
                            onChange={(e) => handleAipCommaInput(id, "obligation", e.target.value)}
                            onBlur={() => handleAipCommaBlur(id, "obligation")}
                            disabled={savingAipObligations.has(id)}
                            placeholder="0"
                            className="text-[13px] font-mono font-semibold text-emerald-700 w-28 bg-white border border-emerald-200 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-emerald-300"
                          />
                        ) : (
                          <span className="text-[13px] font-mono font-semibold text-emerald-700">
                            {((item as any).obligation_amount ?? 0) === 0 ? '–' : fmtP((item as any).obligation_amount)}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Current appropriation — blue band, Sem1 → Sem2 → Total, same order as regular items */}
                    <div className="bg-blue-50/70 divide-y divide-blue-100/60">
                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-blue-500">1st Sem</span>
                        {isEditable && isAdmin ? (
                          <input
                            type="text"
                            inputMode="numeric"
                            value={
                              inputDraft.has(`aip_${id}_sem1`)
                                ? inputDraft.get(`aip_${id}_sem1`)!
                                : comma(aipSem1Edits.has(id) ? aipSem1Edits.get(id)! : ((item as any).app_sem1 ?? 0))
                            }
                            onChange={(e) => handleAipCommaInput(id, "sem1", e.target.value)}
                            onBlur={() => handleAipCommaBlur(id, "sem1")}
                            disabled={savingAipSem1.has(id)}
                            className="text-[13px] font-mono font-semibold text-blue-700 w-28 bg-white border border-blue-200 rounded-md px-2 py-1 text-right focus:outline-none focus:ring-2 focus:ring-blue-300"
                          />
                        ) : (
                          <span className="text-[13px] font-mono font-semibold text-blue-700">
                            {((item as any).app_sem1 ?? 0) === 0 ? '–' : fmtP((item as any).app_sem1)}
                          </span>
                        )}
                      </div>

                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-medium text-blue-500">2nd Sem (auto)</span>
                        <span className="text-[13px] font-mono font-medium text-blue-600">
                          {(() => {
                            const s1 = aipSem1Edits.has(id) ? aipSem1Edits.get(id)! : ((item as any).app_sem1 ?? 0);
                            const s2 = Math.max(appTotal - s1, 0);
                            return s2 === 0 ? '–' : fmtP(s2);
                          })()}
                        </span>
                      </div>

                      <div className="px-4 py-2.5 flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-blue-600">
                          Total Current ({prevYear})
                        </span>
                        <span className="text-[13px] font-mono font-bold text-blue-700">
                          {appTotal === 0 ? '–' : fmtP(appTotal)}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    )}

    {isSpecialAccount && (
      <div className="bg-gray-50 border border-gray-200 rounded-lg px-3.5 py-3 flex items-center justify-between gap-2">
        <p className="text-[11px] font-semibold text-gray-600">5% Calamity Fund</p>
        <span className="text-[13px] font-mono font-semibold text-orange-700">
          {calamityLoading ? '…' : calamityTotal > 0 ? fmtP2(calamityTotal) : '–'}
        </span>
      </div>
    )}

    <div className="bg-gray-900 rounded-2xl px-5 py-4 mt-1">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1.5">Grand Total</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-[24px] font-mono font-bold text-orange-300 leading-none">
          {fmtP2(grandFinal.proposed)}
        </span>
        {!(grandFinal.pastTotal === 0 && gtDiff === 0) && (
          <span className={cn(
            'text-[11px] font-mono font-bold px-2.5 py-1 rounded-full flex-shrink-0',
            gtDiff > 0 ? 'text-emerald-300 bg-emerald-900/40' : gtDiff < 0 ? 'text-red-300 bg-red-900/40' : 'text-gray-300 bg-gray-800',
          )}>
            {gtDiff >= 0 ? '+' : ''}{fmtP2(gtDiff)} ({gtPct.toFixed(1)}%)
          </span>
        )}
      </div>
    </div>
  </div>
) : cardView ? (
  <div className="p-4 flex flex-col gap-3">
    {itemsByClassification.map((cls) => {
      if (cls.items.length === 0) return null;
      const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
        ? 'Capital Outlay (CO)'
        : cls.expense_class_name;
      const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
      const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
      const clsDiff = clsProp - clsPast;
      const clsPct = pctOf(clsPast, clsDiff);
      const isCollapsed = collapsedClasses.has(cls.expense_class_id);
      const isPS = cls.expense_class_id === PS_CLASS_ID;
      const canEdit = isEditable && (!isPS || isAdmin);
      return (
        <div key={cls.expense_class_id}>
          <div className="w-full flex items-center justify-between gap-2 mb-3 px-4 py-3 rounded-xl bg-white border border-gray-200 hover:border-gray-300 shadow-sm transition-colors group">
            <button
              onClick={() => toggleClassCollapsed(cls.expense_class_id)}
              className="flex items-start gap-2.5 flex-1 min-w-0 text-left"
            >
              <svg
                className={cn('w-4 h-4 text-gray-400 transition-transform flex-shrink-0 mt-0.5', isCollapsed ? '-rotate-90' : '')}
                viewBox="0 0 20 20" fill="currentColor"
              >
                <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
              </svg>
              <span className="min-w-0">
                <p className="text-[15px] font-bold uppercase tracking-wider text-gray-900 leading-snug">{label}</p>
                {isCollapsed && (
                  <span className="text-[11px] font-semibold text-gray-400 block mt-0.5">
                    {cls.items.length} item{cls.items.length === 1 ? '' : 's'} · click to expand
                  </span>
                )}
              </span>
            </button>
            {canEdit && (
              <button
                onClick={() =>
                  setModalState({
                    isOpen: true,
                    classificationId: cls.expense_class_id,
                    classificationName: cls.expense_class_name,
                  })
                }
                className="flex items-center gap-1 text-[11px] font-bold text-white bg-gray-900 hover:bg-gray-800 rounded-full pl-2.5 pr-3 py-1.5 transition-colors flex-shrink-0"
              >
                <PlusIcon className="w-3.5 h-3.5" /> Add
              </button>
            )}
          </div>
          {!isCollapsed && (
          <div className="flex flex-col gap-3">
            {cls.items.map((item, idx) => {
              const past = item.pastTotal;
              const proposed = Number(item.total_amount);
              const d = proposed - past;
              const p = pctOf(past, d);
              const isSaving = savingItems.has(item.expense_item_id);
              return (
                <div
                  key={item.expense_item_id}
                  onClick={(e) => handleCardContextClick(e, item)}
                  onContextMenu={(e) => { if (isAdmin && cardView) handleCardContextClick(e, item); }}
                  className={cn(
                    "bg-white border-2 border-gray-200 rounded-2xl px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-3 select-none transition-colors",
                    isAdmin && cardView && "cursor-pointer hover:border-gray-400 hover:shadow-sm",
                  )}
                  style={{
                    opacity: 0,
                    animation: `_rowIn 260ms cubic-bezier(0.22,1,0.36,1) ${idx * 35}ms both`,
                  }}
                >
                  <div className="flex-1 min-w-[220px]">
                    <p className="text-[17px] font-semibold text-gray-800 leading-tight">
                      {item.expense_item?.expense_class_item_name ?? '—'}
                    </p>
                    <p className="text-[12px] text-gray-400 font-mono mt-1">
                      {item.expense_item?.expense_class_item_acc_code ?? '—'}
                    </p>
                  </div>
                  <div className={CARD_NUM_GRID}>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
                        Appropriation ({prevYear})
                      </span>
                      <span className="text-[22px] font-mono font-bold text-blue-700">
                        {past === 0 ? '–' : fmtP(past)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-400">
                        Proposed ({currYear})
                      </span>
                      {isEditable ? (
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={13}
                          value={getDraftValue(item.expense_item_id, "proposed", proposed)}
                          onChange={(e) => {
                            const pos = e.target.selectionStart ?? e.target.value.length;
                            handleCommaInput(item.expense_item_id, "proposed", e.target.value, e.target, pos);
                          }}
                          onBlur={() => handleCommaBlur(item.expense_item_id, "proposed")}
                          onKeyDown={blurOnEnter}
                          disabled={isSaving}
                          className="text-[22px] font-mono font-bold text-orange-700 w-40 h-11 px-3 rounded-lg border border-orange-200 bg-white focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 text-right"
                        />
                      ) : (
                        <span className="text-[22px] font-mono font-bold text-orange-700">
                          {proposed === 0 ? '–' : fmtP(proposed)}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col items-end min-w-[100px]">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Inc / Dec</span>
                      <span className={cn('text-[18px] font-mono font-bold', d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400')}>
                        {d === 0 ? '–' : (d > 0 ? '+' : '') + fmtP(d)}
                      </span>
                    </div>
                    <div className="flex flex-col items-end min-w-[70px]">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Percentage</span>
                      <span className={cn('text-[18px] font-mono font-bold', d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400')}>
                        {past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}
                      </span>
                    </div>
                    {isAdmin && (
                      <div className="flex flex-col items-end min-w-[180px]">
                        <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Recommendation</span>
                        {isEditable ? (
                          <input
                            type="text"
                            value={item.recommendation ?? ''}
                            onChange={(e) => handleRecommendationChange(item.expense_item_id, e.target.value)}
                            onBlur={() => handleRecommendationBlur(item.expense_item_id)}
                            onKeyDown={blurOnEnter}
                            placeholder="Add note…"
                            maxLength={255}
                            className="text-[14px] h-9 px-3 rounded-lg border border-gray-200 bg-white w-full focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300"
                          />
                        ) : (
                          <span className="text-[14px] text-gray-600">{item.recommendation || '–'}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          )}
          <div className="bg-gray-100 border-2 border-gray-300 rounded-xl px-5 py-4 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-sm">
            <div className="flex-1 min-w-[180px]">
              <p className="text-[15px] font-bold text-gray-800 uppercase tracking-wide">Total {label}</p>
            </div>
            <div className={CARD_NUM_GRID}>
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-500">
                  Appropriation ({prevYear})
                </span>
                <span className="text-[24px] font-mono font-bold text-blue-700">{clsPast === 0 ? '–' : fmtP2(clsPast)}</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-500">
                  Proposed ({currYear})
                </span>
                <span className="text-[24px] font-mono font-bold text-orange-700">{clsProp === 0 ? '–' : fmtP2(clsProp)}</span>
              </div>
              <div className="flex flex-col items-end min-w-[80px]">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Inc / Dec</span>
                <span className={cn('text-[20px] font-mono font-bold', clr(clsDiff))}>
                  {clsDiff === 0 ? '–' : (clsDiff > 0 ? '+' : '') + fmtP2(clsDiff)}
                </span>
              </div>
              <div className="flex flex-col items-end min-w-[60px]">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Percentage</span>
                <span className={cn('text-[20px] font-mono font-bold', clr(clsDiff))}>
                  {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
                </span>
              </div>
              {isAdmin && <div className="min-w-[140px]" />}
            </div>
          </div>
        </div>
      );
    })}

    {aipItems.length > 0 && (
      <div>
        <button
          onClick={() => setAipCollapsed(v => !v)}
          className="w-full flex items-center justify-between gap-2 mb-3 px-4 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 transition-colors group"
        >
          <div className="flex items-center gap-2.5">
            <svg
              className={cn('w-4 h-4 text-gray-400 transition-transform flex-shrink-0', aipCollapsed ? '-rotate-90' : '')}
              viewBox="0 0 20 20" fill="currentColor"
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
            <p className="text-[15px] font-bold uppercase tracking-wider text-white">Special Programs (AIP)</p>
            <span className="text-[10px] font-semibold text-violet-300 bg-violet-950/40 border border-violet-800/40 px-2 py-0.5 rounded-full">
              From AIP Form 4
            </span>
          </div>
          {aipCollapsed && (
            <span className="text-[11px] font-semibold text-gray-400">
              {aipItems.length} item{aipItems.length === 1 ? '' : 's'} · click to expand
            </span>
          )}
        </button>
        {!aipCollapsed && (
        <div className="flex flex-col gap-3">
          {aipItems.map((item, idx) => {
            const appTotal = (item as any).app_total ?? 0;
            const proposed = item.total_amount;
            const d = proposed - appTotal;
            const p = pctOf(appTotal, d);
            return (
              <div
                key={item.dept_bp_form4_item_id}
                className="bg-white border-2 border-gray-200 rounded-2xl px-6 py-5 flex flex-wrap items-center gap-x-8 gap-y-3 select-none"
                style={{
                  opacity: 0,
                  animation: `_rowIn 260ms cubic-bezier(0.22,1,0.36,1) ${idx * 35}ms both`,
                }}
              >
                <div className="flex-1 min-w-[220px]">
                  <p className="text-[17px] font-semibold text-gray-800 leading-tight">{item.program_description || '—'}</p>
                  <p className="text-[12px] text-gray-400 font-mono mt-1">{item.aip_reference_code || '—'}</p>
                </div>
                <div className={CARD_NUM_GRID}>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
                      Appropriation ({prevYear})
                    </span>
                    <span className="text-[22px] font-mono font-bold text-blue-700">{appTotal === 0 ? '–' : fmtP(appTotal)}</span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-400">
                      Proposed ({currYear})
                    </span>
                    <span className="text-[22px] font-mono font-bold text-orange-700">{proposed === 0 ? '–' : fmtP(proposed)}</span>
                  </div>
                  <div className="flex flex-col items-end min-w-[100px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Inc / Dec</span>
                    <span className={cn('text-[18px] font-mono font-bold', d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {d === 0 ? '–' : (d > 0 ? '+' : '') + fmtP(d)}
                    </span>
                  </div>
                  <div className="flex flex-col items-end min-w-[70px]">
                    <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Percentage</span>
                    <span className={cn('text-[18px] font-mono font-bold', d > 0 ? 'text-emerald-600' : d < 0 ? 'text-red-500' : 'text-gray-400')}>
                      {appTotal === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-col items-end min-w-[180px]">
                      <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Recommendation</span>
                      {isEditable ? (
                        <input
                          type="text"
                          value={(item as any).recommendation ?? ''}
                          onChange={(e) => handleAipRecChange(item.dept_bp_form4_item_id, e.target.value)}
                          onBlur={() => handleAipRecBlur(item.dept_bp_form4_item_id)}
                          placeholder="Add note…"
                          maxLength={255}
                          className="text-[14px] h-9 px-3 rounded-lg border border-gray-200 bg-white w-full focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300"
                        />
                      ) : (
                        <span className="text-[14px] text-gray-600">{(item as any).recommendation || '–'}</span>
                      )}
                    </div>
                  )}
                </div>
             </div>
            );
          })}
        </div>
        )}
        <div className="bg-gray-100 border-2 border-gray-300 rounded-xl px-5 py-4 mt-3 flex flex-wrap items-center gap-x-6 gap-y-2 shadow-sm">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[15px] font-bold text-gray-800 uppercase tracking-wide">Total Special Programs</p>
          </div>
          <div className={CARD_NUM_GRID}>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-500">
                Appropriation ({prevYear})
              </span>
              <span className="text-[24px] font-mono font-bold text-blue-700">{aipAppTotal === 0 ? '–' : fmtP2(aipAppTotal)}</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-500">
                Proposed ({currYear})
              </span>
              <span className="text-[24px] font-mono font-bold text-orange-700">{aipTotal === 0 ? '–' : fmtP2(aipTotal)}</span>
            </div>
            <div className="flex flex-col items-end min-w-[80px]">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Inc / Dec</span>
              <span className={cn('text-[20px] font-mono font-bold', clr(aipTotal - aipAppTotal))}>
                {(aipTotal - aipAppTotal) === 0 ? '–' : ((aipTotal - aipAppTotal) > 0 ? '+' : '') + fmtP2(aipTotal - aipAppTotal)}
              </span>
            </div>
            <div className="flex flex-col items-end min-w-[60px]">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-500">Percentage</span>
              <span className={cn('text-[20px] font-mono font-bold', clr(aipTotal - aipAppTotal))}>
                {aipAppTotal === 0 && (aipTotal - aipAppTotal) === 0 ? '–' : `${pctOf(aipAppTotal, aipTotal - aipAppTotal).toFixed(2)}%`}
              </span>
            </div>
            {isAdmin && <div className="min-w-[140px]" />}
          </div>
        </div>
      </div>
    )}

    {isSpecialAccount && (
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-2 px-1">5% Calamity Fund</p>
        <div className="flex flex-col gap-2">
          {([
            { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
            { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
          ] as const).map((row) => (
            <div key={row.code} className="bg-white border border-gray-200 rounded-xl px-4 py-3 flex flex-wrap items-center gap-x-6 gap-y-2">
              <div className="flex-1 min-w-[180px]">
                <p className="text-[12px] font-medium text-gray-800 leading-tight">{row.label}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">{row.code} <span className="text-gray-400">{row.note}</span></p>
              </div>
              <div className="flex items-center gap-5 flex-wrap">
                <div className="flex flex-col items-end">
                  <span className="text-[9px] font-semibold uppercase tracking-widest text-orange-400">
                    Proposed ({currYear})
                  </span>
                  <span className="text-[13px] font-mono font-semibold text-orange-700">
                    {calamityLoading ? '…' : row.value ? fmtP(row.value) : '–'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
        <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2.5 mt-2 flex flex-wrap items-center gap-x-6 gap-y-2">
          <div className="flex-1 min-w-[180px]">
            <p className="text-[11px] font-semibold text-gray-600">Total 5% Calamity Fund</p>
          </div>
          <div className="flex items-center gap-5 flex-wrap">
            <div className="flex flex-col items-end">
              <span className="text-[9px] font-semibold uppercase tracking-widest text-orange-400">
                Proposed ({currYear})
              </span>
              <span className="text-[13px] font-mono font-semibold text-orange-700">
                {calamityLoading ? '…' : calamityTotal > 0 ? fmtP2(calamityTotal) : '–'}
              </span>
            </div>
          </div>
        </div>
      </div>
    )}

    <div className="bg-gray-900 text-white rounded-2xl px-6 py-5 mt-3 flex flex-wrap items-center gap-x-8 gap-y-3 shadow-lg">
      <div className="flex-1 min-w-[180px]">
        <p className="text-[13px] font-bold uppercase tracking-widest text-gray-300">
          Grand Total
          {isSpecialAccount && calamityTotal > 0 && (
            <span className="ml-2 text-[10px] font-normal text-gray-500 normal-case tracking-normal">
              incl. 5% Calamity Fund
            </span>
          )}
        </p>
      </div>
      <div className={CARD_NUM_GRID}>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-blue-400">
            Appropriation ({prevYear})
          </span>
          <span className="text-[26px] font-mono font-bold text-blue-300 leading-tight whitespace-nowrap">
            {fmtP2(grandFinal.pastTotal)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-orange-400">
            Proposed ({currYear})
          </span>
          <span className="text-[26px] font-mono font-bold text-orange-300 leading-tight whitespace-nowrap">
            {fmtP2(grandFinal.proposed)}
          </span>
        </div>
        <div className="flex flex-col items-end min-w-[80px]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Inc / Dec</span>
          <span className={cn('text-[19px] font-mono font-bold leading-tight whitespace-nowrap', clr(gtDiff))}>
            {gtDiff === 0 ? '-' : fmtP2(gtDiff)}
          </span>
        </div>
        <div className="flex flex-col items-end min-w-[60px]">
          <span className="text-[11px] font-semibold uppercase tracking-widest text-gray-400">Percentage</span>
          <span className={cn('text-[19px] font-mono font-bold leading-tight whitespace-nowrap', clr(gtDiff))}>
            {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
          </span>
        </div>
        {isAdmin && <div />}
      </div>
    </div>
  </div>
) : (
            <div
                ref={tableScrollRef}
                tabIndex={0}
                onMouseDown={handleTableMouseDown}
                onMouseMove={handleTableMouseMove}
                onMouseUp={endTableDrag}
                onMouseLeave={endTableDrag}
                onKeyDown={handleTableKeyDown}
                className={cn(
                    "overflow-x-auto focus:outline-none focus:ring-2 focus:ring-gray-300 rounded-b-xl",
                    tableIsScrollable && (isDraggingTable ? "cursor-grabbing select-none" : "cursor-grab"),
                )}
            >
                <table
                    className="w-full text-[12px] border-collapse"
                    style={{ minWidth: 960, tableLayout: "fixed" }}
                >
                    <colgroup>
                        {COL_WIDTHS.map((w, i) => {
                            if ((i === 2 || i === 9) && !isAdmin) return null;
                            return <col key={i} style={{ width: w }} />;
                        })}
                    </colgroup>

                    {/* ── Header ── */}
                    <thead className="sticky top-0 z-10">
                        <tr>
                            <th className={cn(TH, "sticky left-0 z-20 bg-white")} rowSpan={2}>
                                Acct Code
                            </th>
                            <th className={cn(TH, "sticky left-[100px] z-20 bg-white border-r border-gray-200")} rowSpan={2}>
                                Object of Expenditure
                            </th>
                            {isAdmin && (
                                <th
                                    className={cn(
                                        TH_APP,
                                        "border-l text-right",
                                    )}
                                    rowSpan={2}
                                >
                                    Past Year (
                                    {Number(plan.budget_plan?.year) - 2})
                                </th>
                            )}
                            <th
    className={cn(TH_CUR, "text-center border-l")}
    colSpan={3}
>
    Appropriation ({prevYear})
</th>
                            <th className={cn(TH_PRO, "border-l")} rowSpan={2}>
                                Proposed ({currYear})
                            </th>
                            <th className={cn(TH, "text-right")} rowSpan={2}>
                                Increase / Decrease
                            </th>
                            <th className={cn(TH, "text-left")} rowSpan={2}>
                                Percentage
                            </th>
                            {isAdmin && (
                                <th className={TH} rowSpan={2}>
                                    Recommendation
                                </th>
                            )}
                        </tr>
                        <tr>
                            <th className={cn(TH_CUR, "border-l")}>Sem 1</th>
<th className={TH_CUR}>Sem 2</th>
<th className={TH_CUR}>Total</th>
                        </tr>
                    </thead>

                    <tbody>
                        {/* ── Regular expense items by classification ── */}
                        {itemsByClassification.map((cls, clsIndex) => {
                            const isPS = cls.expense_class_id === PS_CLASS_ID;
                            const canEdit = isEditable && (!isPS || isAdmin);
                            const canEditSem1 =
                                isEditable && (isAdmin || !isPS);
                            const label =
                                cls.expense_class_name === "Prop/Plant/Eqpt"
                                    ? "Capital Outlay (CO)"
                                    : cls.expense_class_name;

                            const clsSem1 = cls.items.reduce(
                                (s, i) =>
                                    s +
                                    (pastSem1Edits.has(i.expense_item_id)
                                        ? pastSem1Edits.get(i.expense_item_id)!
                                        : i.pastSem1),
                                0,
                            );

                            const clsSem2 = cls.items.reduce((s, i) => {
                                const sem1 = pastSem1Edits.has(i.expense_item_id)
                                    ? pastSem1Edits.get(i.expense_item_id)!
                                    : i.pastSem1;
                                return s + Math.max((i.pastTotal > 0 ? i.pastTotal : 0) - sem1, 0);
                            }, 0);
                            const clsPast = cls.items.reduce(
                                (s, i) => s + i.pastTotal,
                                0,
                            );
                            const clsProp = cls.items.reduce(
                                (s, i) => s + Number(i.total_amount),
                                0,
                            );
                            const clsDiff = clsProp - clsPast;
                            const clsPct = pctOf(clsPast, clsDiff);

                            const isLastCls =
                                clsIndex === itemsByClassification.length - 1;
                            const nextHasData =
                                !isLastCls &&
                                itemsByClassification
                                    .slice(clsIndex + 1)
                                    .some((c) => c.items.length > 0);
                            const showSubHeader =
                                nextHasData ||
                                hasAipSection ||
                                hasCalamitySection;

                            return (
                                <React.Fragment key={cls.expense_class_id}>
                                    {/* Section header row — sticky both vertically (below column header) and horizontally (left edge) */}
                                    <tr className="bg-gray-50 border-y border-gray-200">
                                        <td
                                            colSpan={isAdmin ? 9 : 7}
                                            className="px-4 py-2 sticky top-[73px] z-[15] bg-gray-50"
                                        >
                                            <div className="relative flex items-center min-h-[28px]">
                                                <div className="flex items-center gap-2 sticky left-4">
                                                    <span className="text-[12px] font-semibold text-gray-700">
                                                        {label}
                                                    </span>
                                                    {isPS && (
                                                        <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                                            Auto-filled from
                                                            Personnel Services
                                                        </span>
                                                    )}
                                                </div>

                                                {canEdit && (
    <div className="ml-auto sticky right-4">
    <Tooltip>
        <TooltipTrigger asChild>
            <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900 bg-gray-50"
                onClick={() =>
                    setModalState({
                        isOpen: true,
                        classificationId: cls.expense_class_id,
                        classificationName: cls.expense_class_name,
                    })
                }
            >
                <PlusIcon className="w-3.5 h-3.5" /> Add Item
            </Button>
        </TooltipTrigger>
        <TooltipContent side="left" className="text-xs">
            Add item in {cls.abbreviation}
        </TooltipContent>
    </Tooltip>
    </div>
)}
                                            </div>
                                        </td>
                                    </tr>

                                    {cls.items.length === 0 ? (
                                        <>
                                            <tr>
                                                <td
                                                    colSpan={isAdmin ? 10 : 8}
                                                    className="px-4 py-3 text-[12px] text-gray-400 italic"
                                                >
                                                    No expense items.
                                                </td>
                                            </tr>
                                            {showSubHeader && (
                                                <SubHeader
                                                    prevYear={prevYear}
                                                    currYear={currYear}
                                                    isAdmin={isAdmin}
                                                />
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {cls.items.map((item) => {
                                                const rowIdx = gIdx;
                                                const delay = Math.min(
                                                    gIdx++ * 18,
                                                    280,
                                                );
                                                const past = item.pastTotal;
                                                const proposed = Number(
                                                    item.total_amount,
                                                );
                                                const d = proposed - past;
                                                const p = pctOf(past, d);
                                                const isSaving =
                                                    savingItems.has(
                                                        item.expense_item_id,
                                                    );

                                                const dispSem1 =
                                                    pastSem1Edits.has(
                                                        item.expense_item_id,
                                                    )
                                                        ? pastSem1Edits.get(
                                                              item.expense_item_id,
                                                          )!
                                                        : item.pastSem1;

                                                const sem2Cap = past > 0 ? past : 0;
const dispSem2 = Math.max(sem2Cap - dispSem1, 0);
                                                const sem1Editable =
                                                    isAdmin &&
                                                    isEditable &&
                                                    past > 0 &&
                                                    !!pastYearPlan;

                                                const isNewlyAdded =
                                                    newlyAddedItemId === item.expense_item_id;

                                                return (
                                                    <tr
                                                        key={
                                                            item.expense_item_id
                                                        }
                                                        className={cn(
                                                            "_rowAnim transition-colors",
                                                            isNewlyAdded
                                                                ? "bg-emerald-50 hover:bg-emerald-50 border-l-2 border-l-emerald-400"
                                                                : "hover:bg-gray-50/60",
                                                            isPS &&
                                                                !isNewlyAdded &&
                                                                "bg-blue-50/10",
                                                        )}
                                                        style={{
                                                            animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
                                                        }}
                                                    >
                                                        <td
                                                            className={cn(
                                                                TD,
                                                                "text-gray-400 font-mono text-[11px] whitespace-nowrap align-top",
                                                                STICKY_1,
                                                                isNewlyAdded ? "bg-emerald-50" : "bg-white",
                                                            )}
                                                        >
                                                            {item.expense_item
                                                                ?.expense_class_item_acc_code ||
                                                                "–"}
                                                        </td>
                                                        <td
                                                            className={cn(
                                                                TD,
                                                                "text-gray-800 font-medium align-top",
                                                                STICKY_2,
                                                                isNewlyAdded ? "bg-emerald-50" : "bg-white",
                                                            )}
                                                        >
                                                            <div className="flex items-start justify-between gap-1">
                                                                <span className="flex items-start gap-1.5 min-w-0">
                                                                    <span className="whitespace-normal break-words leading-snug">
                                                                        {
                                                                            item
                                                                                .expense_item
                                                                                ?.expense_class_item_name
                                                                        }
                                                                    </span>
                                                                    {newlyAddedItemId === item.expense_item_id && (
                                                                        <span className="flex-shrink-0 text-[9px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-full uppercase tracking-wide mt-0.5">
                                                                            New
                                                                        </span>
                                                                    )}
                                                                </span>
                                                                {canEdit &&
                                                                    item.dept_bp_form2_item_id >
                                                                        0 && (
                                                                        <button
                                                                        tabIndex={-1}
                                                                            onClick={() =>
                                                                                handleDeleteItem(
                                                                                    item.dept_bp_form2_item_id,
                                                                                    item.expense_item_id,
                                                                                )
                                                                            }
                                                                            className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0 mt-0.5"
                                                                            title="Remove"
                                                                        >
                                                                            <TrashIcon className="w-3.5 h-3.5" />
                                                                        </button>
                                                                    )}
                                                            </div>
                                                        </td>

                                                        {isAdmin && (
    <td
        className={cn(
            TD_APP,
            "border-l border-green-100",
        )}
    >
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={getDraftValue(
                                                                        item.expense_item_id,
                                                                        "obligation",
                                                                        obligationEdits.has(
                                                                            item.expense_item_id,
                                                                        )
                                                                            ? obligationEdits.get(
                                                                                  item.expense_item_id,
                                                                              )!
                                                                            : item.pastObligation,
                                                                    )}
                                                                    onChange={(e) => {
                                                        const pos = e.target.selectionStart ?? e.target.value.length;
                                                        handleCommaInput(item.expense_item_id, "obligation", e.target.value, e.target, pos);
                                                    }}
                                                                    onBlur={() =>
                                                                        handleCommaBlur(
                                                                            item.expense_item_id,
                                                                            "obligation",
                                                                        )
                                                                    }
                                                                    onKeyDown={blurOnEnter}
                                                                    disabled={savingObligations.has(
                                                                        item.expense_item_id,
                                                                    )}
                                                                    tabIndex={1000 + rowIdx}
                                                                    className={
                                                                        inputAppCls
                                                                    }
                                                                />
                                                            </td>
                                                        )}

                                                        <td
    className={cn(
        TD_CUR,
        "border-l border-blue-100",
    )}
>
    {sem1Editable ? (
                                                                <input
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    value={getDraftValue(
                                                                        item.expense_item_id,
                                                                        "sem1",
                                                                        dispSem1,
                                                                    )}
                                                                    onChange={(e) => {
                                                                        const pos = e.target.selectionStart ?? e.target.value.length;
                                                                        handleCommaInput(item.expense_item_id, "sem1", e.target.value, e.target, pos);
                                                                    }}
                                                                    onBlur={() =>
                                                                        handleCommaBlur(
                                                                            item.expense_item_id,
                                                                            "sem1",
                                                                        )
                                                                    }
                                                                    onKeyDown={blurOnEnter}
                                                                    disabled={savingPastItems.has(
                                                                        item.expense_item_id,
                                                                    )}
                                                                    tabIndex={2000 + rowIdx}
                                                                    className={
                                                                        inputCurCls
                                                                    }
                                                                />
                                                            ) : (
                                                                <span className="text-gray-600">
                                                                    {dispSem1 ===
                                                                    0
                                                                        ? "–"
                                                                        : fmtP(
                                                                              dispSem1,
                                                                          )}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td
                                                            className={cn(
                                                                TD_CUR,
                                                                "text-gray-500",
                                                            )}
                                                        >
                                                            {dispSem2 === 0
                                                                ? "–"
                                                                : fmtP(
                                                                      dispSem2,
                                                                  )}
                                                        </td>
                                                        <td
                                                            className={cn(
                                                                TD_CUR,
                                                                "text-gray-600",
                                                            )}
                                                        >
                                                            {past === 0
                                                                ? "–"
                                                                : fmtP(past)}
                                                        </td>

                                                        <td
                                                            className={cn(
                                                                TD_PRO,
                                                                "border-l border-orange-100",
                                                            )}
                                                        >
                                                            {canEdit && isEditable ? (
                                                                <input
                                                                    ref={(el) => {
                                                                        if (el) proposedInputRefs.current.set(item.expense_item_id, el);
                                                                        else proposedInputRefs.current.delete(item.expense_item_id);
                                                                    }}
                                                                    type="text"
                                                                    inputMode="numeric"
                                                                    maxLength={13}
                                                                    value={getDraftValue(
                                                                        item.expense_item_id,
                                                                        "proposed",
                                                                        proposed,
                                                                    )}
                                                                    onChange={(e) => {
                                                                        const pos = e.target.selectionStart ?? e.target.value.length;
                                                                        handleCommaInput(item.expense_item_id, "proposed", e.target.value, e.target, pos);
                                                                    }}
                                                                    onBlur={() => {
                                                                        // Blurring the amount field is the signal that the
                                                                        // user is done with the newly added item — drop
                                                                        // the badge/highlight, independent of save success.
                                                                        if (newlyAddedItemId === item.expense_item_id) {
                                                                            setNewlyAddedItemId(null);
                                                                        }
                                                                        handleCommaBlur(
                                                                            item.expense_item_id,
                                                                            "proposed",
                                                                        );
                                                                    }}
                                                                    onKeyDown={blurOnEnter}
                                                                    disabled={
                                                                        !isEditable || isSaving
                                                                    }
                                                                    tabIndex={isEditable ? 3000 + rowIdx : -1}
                                                                    className={
                                                                        inputCls
                                                                    }
                                                                />
                                                            ) : (
                                                                <span
                                                                    className={cn(
                                                                        "font-mono tabular-nums",
                                                                        isPS
                                                                            ? "text-blue-700 font-semibold"
                                                                            : "text-gray-700",
                                                                    )}
                                                                >
                                                                    {proposed ===
                                                                    0
                                                                        ? "–"
                                                                        : fmtP(
                                                                              proposed,
                                                                          )}
                                                                </span>
                                                            )}
                                                        </td>

                                                        <td
                                                            className={cn(
                                                                TD_M,
                                                                clr(d),
                                                            )}
                                                        >
                                                            {d === 0
                                                                ? "–"
                                                                : fmtP(d)}
                                                        </td>
                                                        <td
                                                            className={cn(
                                                                TD_M,
                                                                clr(d),
                                                            )}
                                                        >
                                                            {past === 0 &&
                                                            d === 0
                                                                ? "–"
                                                                : `${p.toFixed(2)}%`}
                                                        </td>

                                                        {isAdmin && (
                                                            <td className={TD}>
                                                                {isEditable &&
                                                                (isAdmin ||
                                                                    !isPS) ? (
                                                                    <input
                                                                        type="text"
                                                                        value={
                                                                            item.recommendation ??
                                                                            ""
                                                                        }
                                                                        onChange={(
                                                                            e,
                                                                        ) =>
                                                                            handleRecommendationChange(
                                                                                item.expense_item_id,
                                                                                e
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        onBlur={() =>
                                                                            handleRecommendationBlur(
                                                                                item.expense_item_id,
                                                                            )
                                                                        }
                                                                        onKeyDown={blurOnEnter}
                                                                        disabled={savingRecommendations.has(
                                                                            item.expense_item_id,
                                                                        )}
                                                                        placeholder="Add note…"
                                                                        maxLength={
                                                                            255
                                                                        }
                                                                        tabIndex={4000 + rowIdx}
                                                                        title={
                                                            formatRecommendationTooltip(item.recommendation)
                                                        }
                                                        className={
                                                            recCls
                                                        }
                                                    />
                                                ) : (
                                                    <span
                                                        className="text-gray-500 text-[11px]"
                                                        title={formatRecommendationTooltip(item.recommendation)}
                                                    >
                                                        {item.recommendation ||
                                                            "–"}
                                                    </span>
                                                )}
                                                            </td>
                                                        )}
                                                    </tr>
                                                );
                                            })}

                                            {/* Classification subtotal */}
                                            <tr className="border-t border-gray-200">
                                                <td className={cn("bg-gray-100", STICKY_1)} />
                                                <td
                                                    className={cn(
                                                        TD,
                                                        "font-semibold text-gray-700 bg-gray-100",
                                                        STICKY_2,
                                                    )}
                                                >
                                                    Total {label}
                                                </td>
                                                {isAdmin && (
    <td
        className={cn(
            TD_M,
            "font-semibold border-l border-green-100",
            C_APP_SUB,
        )}
    >
        {(() => {
            const clsObl =
                                                                cls.items.reduce(
                                                                    (s, i) =>
                                                                        s +
                                                                        i.pastObligation,
                                                                    0,
                                                                );
                                                            return clsObl === 0
                                                                ? "–"
                                                                : fmtP2(clsObl);
                                                        })()}
                                                    </td>
                                                )}
                                                <td
                                                    className={cn(
                                                        TD_M,
                                                        "font-semibold text-gray-700 border-l",
                                                        C_CUR_SUB,
                                                    )}
                                                >
                                                    {fmtP2(clsSem1)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        TD_M,
                                                        "font-semibold text-gray-700",
                                                        C_CUR_SUB,
                                                    )}
                                                >
                                                    {fmtP2(clsSem2)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        TD_M,
                                                        "font-semibold text-gray-700",
                                                        C_CUR_SUB,
                                                    )}
                                                >
                                                    {fmtP2(clsPast)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        TD_M,
                                                        "font-semibold text-gray-700 border-l",
                                                        C_PRO_SUB,
                                                    )}
                                                >
                                                    {fmtP2(clsProp)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        TD_M,
                                                        "font-semibold bg-gray-100",
                                                        clr(clsDiff),
                                                    )}
                                                >
                                                    {clsDiff === 0
                                                        ? "–"
                                                        : fmtP2(clsDiff)}
                                                </td>
                                                <td
                                                    className={cn(
                                                        TD_M,
                                                        "font-semibold bg-gray-100",
                                                        clr(clsDiff),
                                                    )}
                                                >
                                                    {clsPast === 0 &&
                                                    clsDiff === 0
                                                        ? "–"
                                                        : `${clsPct.toFixed(2)}%`}
                                                </td>
                                                {isAdmin && (
                                                    <td className="bg-gray-100" />
                                                )}
                                            </tr>

                                            {showSubHeader && (
                                                <SubHeader
                                                    prevYear={prevYear}
                                                    currYear={currYear}
                                                    isAdmin={isAdmin}
                                                />
                                            )}
                                        </>
                                    )}
                                </React.Fragment>
                            );
                        })}

                        {/* ── Special Programs (AIP) ── */}
                        {hasAipSection && (
                            <React.Fragment>
                                <tr className="bg-gray-50 border-y border-gray-200">
                                    <td
                                        colSpan={isAdmin ? 9 : 7}
                                        className="px-4 py-2 sticky top-[73px] z-[15] bg-gray-50"
                                    >
                                        <div className="flex items-center gap-2 sticky left-4 w-fit max-w-[calc(100vw-100px)]">
                                            <span className="text-[12px] font-semibold text-gray-700">
                                                Special Programs
                                            </span>
                                            <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                                                From AIP Form 4
                                            </span>
                                        </div>
                                    </td>
                                    <td className="bg-gray-50" />
                                </tr>

                                {aipItems.map((item) => {
                                    const rowIdx = gIdx;
                                    const delay = Math.min(gIdx++ * 18, 280);
                                    const id = item.dept_bp_form4_item_id;
                                    const oblVal = aipOblEdits.has(id)
                                        ? aipOblEdits.get(id)!
                                        : ((item as any).obligation_amount ??
                                          0);
                                    const oblDraftKey = `aip_${id}_obligation`;
                                    const oblDisplay = inputDraft.has(
                                        oblDraftKey,
                                    )
                                        ? inputDraft.get(oblDraftKey)!
                                        : comma(oblVal);

                                    return (
                                        <tr
                                            key={id}
                                            className="_rowAnim hover:bg-gray-50/60 transition-colors"
                                            style={{
                                                animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
                                            }}
                                        >
                                            <td
                                                className={cn(
                                                    TD,
                                                    "text-gray-400 font-mono text-[11px]",
                                                    STICKY_1,
                                                    "bg-white",
                                                )}
                                            >
                                                {item.aip_reference_code || "–"}
                                            </td>
                                            <td
                                                className={cn(
                                                    TD,
                                                    "text-gray-800 font-medium align-top whitespace-normal break-words leading-snug",
                                                    STICKY_2,
                                                    "bg-white",
                                                )}
                                            >
                                                {item.program_description ||
                                                    "–"}
                                            </td>

                                            {isAdmin && (
                                                <td
                                                    className={cn(
                                                        TD_APP,
                                                        "border-l border-green-100",
                                                    )}
                                                >
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={oblDisplay}
                                                        onChange={(e) =>
                                            handleAipCommaInput(
                                                id,
                                                "obligation",
                                                e.target.value,
                                            )
                                        }
                                        onBlur={() =>
                                            handleAipCommaBlur(
                                                id,
                                                "obligation",
                                            )
                                        }
                                                        onKeyDown={blurOnEnter}
                                                        disabled={savingAipObligations.has(
                                                            id,
                                                        )}
                                                        placeholder="0"
                                                        tabIndex={1000 + rowIdx}
                                                        className={inputAppCls}
                                                    />
                                                </td>
                                            )}

                                            <td className={cn(TD_CUR, "border-l border-blue-100")}>
                                                {isEditable && isAdmin ? (
                                                    <input
                                                        type="text"
                                                        inputMode="numeric"
                                                        value={
                                                            inputDraft.has(`aip_${id}_sem1`)
                                                                ? inputDraft.get(`aip_${id}_sem1`)!
                                                                : comma(aipSem1Edits.has(id) ? aipSem1Edits.get(id)! : ((item as any).app_sem1 ?? 0))
                                                        }
                                                        onChange={(e) =>
                                                            handleAipCommaInput(id, "sem1", e.target.value)
                                                        }
                                                        onBlur={() =>
                                                            handleAipCommaBlur(id, "sem1")
                                                        }
                                                        onKeyDown={blurOnEnter}
                                                        disabled={savingAipSem1.has(id)}
                                                        tabIndex={2000 + rowIdx}
                                                        className={inputCurCls}
                                                    />
                                                ) : (
                                                    <span className="text-gray-600">
                                                        {((item as any).app_sem1 ?? 0) === 0 ? "–" : fmtP((item as any).app_sem1)}
                                                    </span>
                                                )}
                                            </td>
                                            <td className={cn(TD_CUR,"text-gray-500")}>
                                                {(() => {
                                                    const s1 = aipSem1Edits.has(id) ? aipSem1Edits.get(id)! : ((item as any).app_sem1 ?? 0);
                                                    const s2 = Math.max(((item as any).app_total ?? 0) - s1, 0);
                                                    return s2 === 0 ? "–" : fmtP(s2);
                                                })()}
                                            </td>
                                            <td className={cn(TD_CUR, "text-gray-600")}>
    {(item as any).app_total === 0 ? "–" : fmtP((item as any).app_total)}
</td>
                                            <td
                                                className={cn(
                                                    TD_PRO,
                                                    "border-l border-orange-100 text-orange-700 font-semibold",
                                                )}
                                            >
                                                {fmtP(item.total_amount)}
                                            </td>

                                            {(() => {
    const appTotal = (item as any).app_total ?? 0;
    const proposed = item.total_amount;
    const diff = proposed - appTotal;
    const pct = pctOf(appTotal, diff);
    return (
        <>
            <td className={cn(TD_M, clr(diff))}>
                {diff === 0 ? "–" : fmtP(diff)}
            </td>
            <td className={cn(TD_M, clr(diff))}>
                {appTotal === 0 && diff === 0 ? "–" : `${pct.toFixed(2)}%`}
            </td>
        </>
    );
})()}

                                            {isAdmin && (
                                                <td className={TD}>
                                                    {isEditable ? (
                                                        <input
                                                            type="text"
                                                            value={
                                                                (item as any)
                                                                    .recommendation ??
                                                                ""
                                                            }
                                                            onChange={(e) =>
                                                                handleAipRecChange(
                                                                    id,
                                                                    e.target
                                                                        .value,
                                                                )
                                                            }
                                                            onBlur={() =>
                                                                handleAipRecBlur(
                                                                    id,
                                                                )
                                                            }
                                                            onKeyDown={blurOnEnter}
                                                            disabled={savingAipRecommendations.has(
                                                                id,
                                                            )}
                                                            placeholder="Add note…"
                                                            maxLength={255}
                                                            tabIndex={4000 + rowIdx}
                                                            title={
                                                                formatRecommendationTooltip((item as any).recommendation)
                                                            }
                                                            className={recCls}
                                                        />
                                                    ) : (
                                                        <span
                                                            className="text-gray-500 text-[11px]"
                                                            title={formatRecommendationTooltip((item as any).recommendation)}
                                                        >
                                                            {(item as any)
                                                                .recommendation ||
                                                                "–"}
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    );
                                })}

                                <tr className="border-t border-gray-200">
                                    <td className={cn("bg-gray-100", STICKY_1)} />
                                    <td
                                        className={cn(
                                            TD,
                                            "font-semibold text-gray-700 bg-gray-100",
                                            STICKY_2,
                                        )}
                                    >
                                        Total Special Programs
                                    </td>
                                    {isAdmin && (
    <td
        className={cn(
            TD_M,
            "font-semibold border-l border-green-100",
            C_APP_SUB,
        )}
    >
        {aipObligationTotal === 0
                                                ? "–"
                                                : fmtP(aipObligationTotal)}
                                        </td>
                                    )}

                                    <td className={cn(TD_M, "font-semibold text-gray-700 border-l", C_CUR_SUB)}>
                                        {fmtP2(aipItems.reduce((s, i) => s + ((i as any).app_sem1 ?? 0), 0))}
                                    </td>
                                    <td className={cn(TD_M, "font-semibold text-gray-700", C_CUR_SUB)}>
                                        {fmtP2(aipItems.reduce((s, i) => s + ((i as any).app_sem2 ?? 0), 0))}
                                    </td>
                                    <td className={cn(TD_M, "font-semibold text-gray-700", C_CUR_SUB)}>
                                        {fmtP2(aipItems.reduce((s, i) => s + ((i as any).app_total ?? 0), 0))}
                                    </td>
                                    <td
                                        className={cn(
                                            TD_M,
                                            "font-semibold text-gray-700 border-l",
                                            C_PRO_SUB,
                                        )}
                                    >
                                        {fmtP2(aipTotal)}
                                    </td>
                                    <td
                                        className={cn(
                                            TD_M,
                                            "font-semibold text-emerald-600 bg-gray-100",
                                        )}
                                    >
                                        {aipTotal === 0 ? "–" : fmtP2(aipTotal)}
                                    </td>
                                    <td
                                        className={cn(
                                            TD_M,
                                            "font-semibold text-emerald-600 bg-gray-100",
                                        )}
                                    >
                                        {aipTotal === 0 ? "–" : "100.00%"}
                                    </td>
                                    {isAdmin && <td className="bg-gray-100" />}
                                </tr>

                                {hasCalamitySection && (
                                    <SubHeader
                                        prevYear={prevYear}
                                        currYear={currYear}
                                        isAdmin={isAdmin}
                                    />
                                )}
                            </React.Fragment>
                        )}

                        {/* ── 5% Calamity Fund ── */}
                        {isSpecialAccount && (
                            <React.Fragment>
                                <tr className="bg-gray-50 border-y border-gray-200">
                                    <td
                                        colSpan={isAdmin ? 9 : 7}
                                        className="px-4 py-2 sticky top-[73px] z-[15] bg-gray-50"
                                    >
                                        <div className="flex items-center gap-2 sticky left-4 w-fit max-w-[calc(100vw-100px)]">
                                            <span className="text-[12px] font-semibold text-gray-700">
                                                5% Calamity Fund
                                            </span>
                                            <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                                Derived from{" "}
                                                {["sh", "occ", "pm"].includes(
                                                    incomeSource ?? "",
                                                )
                                                    ? "Non-Tax Revenue"
                                                    : "Tax Revenue"}
                                            </span>
                                            {calamityLoading && (
                                                <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />
                                            )}
                                        </div>
                                    </td>
                                    <td className="bg-gray-50" />
                                </tr>

                                {(
                    [
                        {
                            code: "5% × 70%",
                            label: "Pre-Disaster Preparedness",
                            note: "(70% of 5% Calamity Fund)",
                            value: calamityActualPre,
                        },
                        {
                            code: "5% × 30%",
                            label: "Quick Response Fund (QRF)",
                            note: "(30% of 5% Calamity Fund)",
                            value: calamityActualQrf,
                        },
                    ] as const
                ).map((row) => {
                                    const delay = Math.min(gIdx++ * 18, 280);
                                    return (
                                        <tr
                                            key={row.code}
                                            className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
                                            style={{
                                                animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both`,
                                            }}
                                        >
                                            <td
                                                className={cn(
                                                    TD,
                                                    "text-gray-400 font-mono text-[11px]",
                                                    STICKY_1,
                                                    "bg-white",
                                                )}
                                            >
                                                {row.code}
                                            </td>
                                            <td
                                                className={cn(
                                                    TD,
                                                    "text-gray-800",
                                                    STICKY_2,
                                                    "bg-white",
                                                )}
                                            >
                                                {row.label}
                                                <span className="ml-2 text-[10px] text-gray-400">
                                                    {row.note}
                                                </span>
                                            </td>
                                            {isAdmin && (<td className={cn(TD_CUR, "border-l border-blue-100 text-blue-200",)}>–</td> )}
                                            <td
                                                className={cn(
                                                    TD_CUR,
                                                    "border-l border-blue-100 text-blue-200",
                                                )}
                                            >
                                                –
                                            </td>
                                            <td
                                                className={cn(
                                                    TD_CUR,
                                                    "text-blue-200",
                                                )}
                                            >
                                                –
                                            </td>
                                            <td
                                                className={cn(
                                                    TD_CUR,
                                                    "text-blue-200",
                                                )}
                                            >
                                                –
                                            </td>
                                            <td
                                                className={cn(
                                                    TD_PRO,
                                                    "border-l border-orange-100 text-orange-700 font-semibold",
                                                )}
                                            >
                                                {calamityLoading ? (
                                                    <span className="text-gray-300 animate-pulse">
                                                        …
                                                    </span>
                                                ) : row.value ? (
                                                    fmtP(row.value)
                                                ) : (
                                                    "–"
                                                )}
                                            </td>
                                            <td
                                                className={cn(
                                                    TD_M,
                                                    "text-emerald-600",
                                                )}
                                            >
                                                {row.value
                                                    ? fmtP(row.value)
                                                    : "–"}
                                            </td>
                                            <td
                                                className={cn(
                                                    TD_M,
                                                    "text-emerald-600",
                                                )}
                                            >
                                                {row.value ? "100.00%" : "–"}
                                            </td>
                                            {isAdmin && <td />}
                                        </tr>
                                    );
                                })}

                                <tr className="border-t border-gray-200">
                                    <td className={cn("bg-gray-100", STICKY_1)} />
                                    <td
                                        className={cn(
                                            TD,
                                            "font-semibold text-gray-700 bg-gray-100",
                                            STICKY_2,
                                        )}
                                    >
                                        Total 5% Calamity Fund
                                    </td>
                                    {isAdmin && (
                                        <td className="bg-gray-100 border-l border-blue-100" />
                                    )}
                                    <td
                                        className={cn(
                                            "bg-gray-100 border-l",
                                            C_APP_SUB,
                                        )}
                                    />
                                    <td
                                        className={cn("bg-gray-100", C_APP_SUB)}
                                    />
                                    <td
                                        className={cn("bg-gray-100", C_APP_SUB)}
                                    />
                                    <td
                                        className={cn(
                                            TD_M,
                                            "font-semibold text-gray-700 border-l",
                                            C_PRO_SUB,
                                        )}
                                    >
                                        {calamityLoading ? (
                                            <span className="text-gray-300 animate-pulse">
                                                …
                                            </span>
                                        ) : calamityTotal > 0 ? (
                                            fmtP2(calamityTotal)
                                        ) : (
                                            "–"
                                        )}
                                    </td>
                                    <td
                                        className={cn(
                                            TD_M,
                                            "font-semibold text-emerald-600 bg-gray-100",
                                        )}
                                    >
                                        {calamityTotal > 0
                                            ? fmtP2(calamityTotal)
                                            : "–"}
                                    </td>
                                    <td
                                        className={cn(
                                            TD_M,
                                            "font-semibold text-emerald-600 bg-gray-100",
                                        )}
                                    >
                                        {calamityTotal > 0 ? "100.00%" : "–"}
                                    </td>
                                    {isAdmin && <td className="bg-gray-100" />}
                                </tr>

                                {calamityData?.total_tax_revenue_proposed !=
                                    null &&
                                    calamityData.total_tax_revenue_proposed >
                                        0 && (
                                        <tr>
                                            <td
                                                colSpan={isAdmin ? 10 : 8}
                                                className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100"
                                            >
                                                Base:{" "}
                                                <span className="font-semibold text-gray-600 font-mono">
                                                    {fmtP(
                                                        calamityData.total_tax_revenue_proposed,
                                                    )}
                                                </span>{" "}
                                                × 5% = {fmtP(calamityTotal)}.
                                                Pre-Disaster = 70% · QRF = 30%.
                                            </td>
                                        </tr>
                                    )}
                            </React.Fragment>
                        )}
                    </tbody>

                    {/* ── Grand Total ── */}
                    <tfoot>
                        {hasRows && (
                            <tr className="bg-gray-900 text-white">
                                <td className="px-3 py-3 sticky left-0 z-10 bg-gray-900" />
                                <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400 sticky left-[100px] z-10 bg-gray-900 border-r border-gray-700">
                                    Grand Total
                                    {isSpecialAccount && calamityTotal > 0 && (
                                        <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">
                                            incl. 5% Calamity Fund
                                        </span>
                                    )}
                                </td>
                                {isAdmin && (
                                    <td
                                        className={cn(
                                            "px-3 py-3 text-right font-mono font-bold tabular-nums border-l",
                                            C_APP_GT,
                                        )}
                                    >
                                        {grandFinal.obligation === 0
                                            ? "–"
                                            : fmtP2(grandFinal.obligation)}
                                    </td>
                                )}
                                <td
                                    className={cn(
                                        "px-3 py-3 text-right font-mono font-bold tabular-nums border-l",
                                        C_CUR_GT,
                                    )}
                                >
                                    {fmtP2(grandFinal.pastSem1)}
                                </td>
                                <td
                                    className={cn(
                                        "px-3 py-3 text-right font-mono font-bold tabular-nums border-l",
                                        C_CUR_GT,
                                    )}
                                >
                                    {fmtP2(grandFinal.pastSem2)}
                                </td>
                                <td
                                    className={cn(
                                        "px-3 py-3 text-right font-mono font-bold tabular-nums border-l",
                                        C_CUR_GT,
                                    )}
                                >
                                    {fmtP2(grandFinal.pastTotal)}
                                </td>
                                <td
                                    className={cn(
                                        "px-3 py-3 text-right font-mono font-bold tabular-nums border-l",
                                        C_PRO_GT,
                                    )}
                                >
                                    {fmtP2(grandFinal.proposed)}
                                </td>
                                <td
                                    className={cn(
                                        "px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700",
                                        clr(gtDiff),
                                    )}
                                >
                                    {gtDiff === 0 ? "–" : fmtP2(gtDiff)}
                                </td>
                                <td
                                    className={cn(
                                        "px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700",
                                        clr(gtDiff),
                                    )}
                                >
                                    {grandFinal.pastTotal === 0 && gtDiff === 0
                                        ? "–"
                                        : `${gtPct.toFixed(2)}%`}
                                </td>
                                {isAdmin && (
                                    <td className="border-l border-gray-700" />
                                )}
                            </tr>
                        )}
                    </tfoot>
                </table>
            </div>

            )}

            {/* ── Modals ── */}
            {modalState && (
                <AddItemModal
                    isOpen={modalState.isOpen}
                    onClose={() => setModalState(null)}
                    classificationId={modalState.classificationId}
                    classificationName={modalState.classificationName}
                    planId={plan.dept_budget_plan_id}
                    expenseItems={expenseItems}
                    existingItemIds={items.map((i) => i.expense_item_id)}
                    onItemAdded={() => {
                        // Snapshot current ids so the detection effect above
                        // can spot the one new id once onItemUpdate() causes
                        // `items` to refresh with the newly saved item.
                        preAddItemIdsRef.current = new Set(
                            items.map((i) => i.expense_item_id),
                        );
                        pendingNewItemDetectionRef.current = true;
                        onItemUpdate();
                        toast.success("Item added successfully");
                    }}
                />
            )}



            {ctxMenuItem && ctxMenuPos && createPortal(
                <div
                    ref={ctxMenuRef}
                    style={{ position: 'fixed', top: ctxMenuPos.y, left: ctxMenuPos.x, zIndex: 9999 }}
                    className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[210px] overflow-hidden"
                >
                    <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
                    <div className="px-3 py-2 border-b border-gray-100 mb-1">
                        <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[185px]">
                            {ctxMenuItem.expense_item?.expense_class_item_name ?? 'Item'}
                        </p>
                    </div>
                    <button
                        onClick={openMoveModal}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                        <ArrowsRightLeftIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        Move Appropriation
                    </button>
                    <div className="my-1 border-t border-gray-100" />
                    <button
                        onClick={openRemoveAppropriation}
                        className="flex items-center gap-2.5 w-full px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 transition-colors"
                    >
                        <TrashIcon className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                        Delete Item
                    </button>
                </div>,
                document.body,
            )}

            {moveSource && createPortal(
                (() => {
                    const PANEL_W = 340, PANEL_H = 520;
                    const anchor = moveAnchorPos ?? { x: window.innerWidth / 2 - PANEL_W / 2, y: 80 };
                    const x = Math.min(Math.max(anchor.x, 12), window.innerWidth - PANEL_W - 12);
                    const y = Math.min(Math.max(anchor.y, 12), window.innerHeight - PANEL_H - 12);

                    return (
                        <div
                            ref={moveModalRef}
                            style={{
                                position: 'fixed',
                                top: y,
                                left: x,
                                width: PANEL_W,
                                maxHeight: PANEL_H,
                                zIndex: 9999,
                            }}
                            className="bg-white rounded-2xl border border-gray-200 shadow-2xl flex flex-col"
                        >
                            <div className="px-4 py-3 border-b border-gray-100 flex-shrink-0">
                                <div className="flex items-center justify-between gap-2">
                                    <p className="text-[13px] font-semibold text-gray-900 truncate">
                                        Move from "{moveSource.expense_item?.expense_class_item_name}"
                                    </p>
                                    <button
                                        onClick={() => { setMoveSource(null); setMoveDestination(null); }}
                                        className="text-gray-400 hover:text-gray-700 text-[16px] leading-none flex-shrink-0"
                                    >
                                        ×
                                    </button>
                                </div>
                                <p className="text-[11px] text-gray-400 mt-0.5">
                                    Available: {fmtP(Number(moveSource.total_amount))}
                                </p>

                                {/* Amount to move — switch between typing a ₱ amount or a % */}
                                <div className="mt-2.5">
                                    <div className="flex items-center justify-between">
                                        <label className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                                            {moveInputMode === 'amount' ? 'Amount to move' : 'Percent to move'}
                                        </label>
                                        <div className="flex items-center gap-1.5">
                                            <span className={cn('text-[10px] font-medium', moveInputMode === 'amount' ? 'text-gray-700' : 'text-gray-300')}>
                                                ₱
                                            </span>
                                            <Switch
                                                checked={moveInputMode === 'percent'}
                                                onCheckedChange={toggleMoveInputMode}
                                                className="scale-75"
                                            />
                                            <span className={cn('text-[10px] font-medium', moveInputMode === 'percent' ? 'text-gray-700' : 'text-gray-300')}>
                                                %
                                            </span>
                                        </div>
                                    </div>
                                    <div className="relative mt-1">
                                        <span className={cn(
                                            'absolute left-2.5 top-1/2 -translate-y-1/2 text-[12px] pointer-events-none',
                                            moveInputInvalid ? 'text-red-400' : 'text-gray-400',
                                        )}>
                                            {moveInputMode === 'amount' ? '₱' : '%'}
                                        </span>
                                        {moveInputMode === 'amount' ? (
                                            <input
                                                type="text"
                                                inputMode="numeric"
                                                value={moveAmountDraft}
                                                onChange={(e) => setMoveAmountDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                                                onKeyDown={blurOnEnter}
                                                placeholder="0"
                                                className={cn(
                                                    'w-full h-8 pl-6 pr-2.5 text-[12px] font-mono text-right rounded-lg border focus:outline-none focus:ring-2',
                                                    moveAmountExceeds
                                                        ? 'border-red-400 text-red-600 focus:ring-red-300 focus:border-red-400'
                                                        : 'border-gray-200 focus:ring-gray-400',
                                                )}
                                            />
                                        ) : (
                                            <input
                                                type="text"
                                                inputMode="decimal"
                                                value={movePercentDraft}
                                                onChange={(e) => setMovePercentDraft(e.target.value.replace(/[^0-9.]/g, ''))}
                                                onKeyDown={blurOnEnter}
                                                placeholder="0"
                                                className={cn(
                                                    'w-full h-8 pl-6 pr-2.5 text-[12px] font-mono text-right rounded-lg border focus:outline-none focus:ring-2',
                                                    movePercentExceeds
                                                        ? 'border-red-400 text-red-600 focus:ring-red-300 focus:border-red-400'
                                                        : 'border-gray-200 focus:ring-gray-400',
                                                )}
                                            />
                                        )}
                                    </div>
                                    {moveAmountExceeds && (
                                        <p className="text-[10px] text-red-500 mt-1 font-medium">
                                            Amount exceeds available balance of {fmtP(moveSourceTotal)}.
                                        </p>
                                    )}
                                    {movePercentExceeds && (
                                        <p className="text-[10px] text-red-500 mt-1 font-medium">
                                            Percentage exceeds 100% ({fmtP(moveSourceTotal)} available).
                                        </p>
                                    )}
                                    {!moveInputInvalid && moveAmount > 0 && (
                                        <p className="text-[10px] text-gray-400 mt-1">
                                            {fmtP(moveAmount)} moves · {fmtP(moveSourceTotal - moveAmount)} remains on source
                                        </p>
                                    )}
                                </div>

                                <input
                                    type="text"
                                    value={moveSearch}
                                    onChange={(e) => setMoveSearch(e.target.value)}
                                    placeholder="Search destination item…"
                                    className="mt-3 w-full h-8 px-2.5 text-[12px] rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400"
                                />

                                {/* Classification filter chips */}
                                {moveClassOptions.length > 0 && (
                                    <div className="flex flex-wrap gap-1 mt-2">
                                        <button
                                            onClick={() => setMoveClassFilter('all')}
                                            className={cn(
                                                'text-[10px] font-medium px-2 py-1 rounded-full border transition-colors',
                                                moveClassFilter === 'all'
                                                    ? 'bg-gray-900 border-gray-900 text-white'
                                                    : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                                            )}
                                        >
                                            All
                                        </button>
                                        {moveClassOptions.map((c) => (
                                            <button
                                                key={c.id}
                                                onClick={() => setMoveClassFilter(String(c.id))}
                                                className={cn(
                                                    'text-[10px] font-medium px-2 py-1 rounded-full border transition-colors truncate max-w-[110px]',
                                                    moveClassFilter === String(c.id)
                                                        ? 'bg-gray-900 border-gray-900 text-white'
                                                        : 'border-gray-200 text-gray-500 hover:bg-gray-50',
                                                )}
                                                title={c.name}
                                            >
                                                {c.name}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            {!moveDestination ? (
                                <>
                                    <div className="flex-1 overflow-y-auto py-1">
                                        {moveCandidates.length === 0 ? (
                                            <p className="px-4 py-6 text-[12px] text-gray-400 text-center">No matching items.</p>
                                        ) : (
                                            moveCandidates.map((cand) => {
                                                const clsName = classNameById.get(cand.expense_item?.expense_class_id ?? -1);
                                                return (
                                                    <button
                                            key={cand.expense_item_id}
                                            onClick={() => { if (!moveInputInvalid) setMoveDestination(cand); }}
                                            disabled={moveInputInvalid}
                                            className={cn(
                                                'w-full text-left px-4 py-2 text-[12px] flex items-center justify-between gap-2',
                                                moveInputInvalid ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50',
                                            )}
                                        >
                                                        <div className="min-w-0">
                                                            <span className="text-gray-700 truncate block">
                                                                {cand.expense_item?.expense_class_item_name}
                                                            </span>
                                                            {clsName && (
                                                                <span className="text-[10px] text-gray-400">{clsName}</span>
                                                            )}
                                                        </div>
                                                        <span className="text-gray-400 font-mono text-[11px] flex-shrink-0">
                                                            {fmtP(Number(cand.total_amount))}
                                                        </span>
                                                    </button>
                                                );
                                            })
                                        )}
                                    </div>
                                    <div className="px-4 py-3 border-t border-gray-100 flex justify-end flex-shrink-0">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => { setMoveSource(null); setMoveDestination(null); }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </>
                            ) : (
                                /* ── Inline confirm step — stays in the same anchored panel ── */
                                <div className="flex-1 overflow-y-auto px-4 py-4">
                                    <p className="text-[13px] font-semibold text-gray-900">
                                        Move {fmtP(moveAmount)}?
                                    </p>
                                    <p className="text-[12px] text-gray-500 mt-2 leading-relaxed">
                                        <span className="font-medium text-gray-700">{fmtP(moveAmount)}</span>{' '}
                                        from{' '}
                                        <span className="font-medium text-gray-700">
                                            {moveSource.expense_item?.expense_class_item_name}
                                        </span>{' '}
                                        will be added to{' '}
                                        <span className="font-medium text-gray-700">
                                            {moveDestination.expense_item?.expense_class_item_name}
                                        </span>
                                        .{' '}
                                        {moveSource.expense_item?.expense_class_id !== moveDestination.expense_item?.expense_class_id && (
                                            <>This moves the amount into a different classification.{' '}</>
                                        )}
                                        {moveAmount < Number(moveSource.total_amount) ? (
                                            <>
                                                The source item will keep{' '}
                                                <span className="font-medium text-gray-700">
                                                    {fmtP(Number(moveSource.total_amount) - moveAmount)}
                                                </span>.
                                            </>
                                        ) : (
                                            <>The source item will be set to ₱0.</>
                                        )}
                                        {' '}This cannot be undone.
                                    </p>

                                    <div className="mt-4 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2.5 flex items-center justify-between gap-3">
                                        <div className="min-w-0">
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {moveSource.expense_item?.expense_class_item_name}
                                            </p>
                                            <p className="text-[13px] font-mono font-semibold text-gray-700">
                                                {fmtP(Number(moveSource.total_amount) - moveAmount)}
                                            </p>
                                        </div>
                                        <span className="text-gray-300">→</span>
                                        <div className="min-w-0 text-right">
                                            <p className="text-[11px] text-gray-400 truncate">
                                                {moveDestination.expense_item?.expense_class_item_name}
                                            </p>
                                            <p className="text-[13px] font-mono font-semibold text-emerald-600">
                                                {fmtP(Number(moveDestination.total_amount) + moveAmount)}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="mt-5 flex justify-end gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-8 text-xs"
                                            onClick={() => setMoveDestination(null)}
                                            disabled={moving}
                                        >
                                            Back
                                        </Button>
                                        <Button
                                            size="sm"
                                            className="h-8 text-xs bg-gray-900 hover:bg-gray-800 text-white"
                                            onClick={handleMoveConfirmed}
                                            disabled={moving || moveAmount <= 0 || moveInputInvalid}
                                        >
                                            {moving ? 'Moving…' : `Move ${fmtP(moveAmount)}`}
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })(),
                document.body,
            )}



            {pastModalState && pastYearPlan && (
                <AddItemModal
                    isOpen={pastModalState.isOpen}
                    onClose={() => setPastModalState(null)}
                    classificationId={pastModalState.classificationId}
                    classificationName={pastModalState.classificationName}
                    planId={pastYearPlan.dept_budget_plan_id}
                    expenseItems={expenseItems}
                    existingItemIds={pastYearPlan.items.map(
                        (i: any) => i.expense_item_id,
                    )}
                    onItemAdded={() => {
                        onItemUpdate();
                        toast.success("Past year item added.");
                    }}
                />
            )}
        </div>
        </>
    );
};

export default Form2;
