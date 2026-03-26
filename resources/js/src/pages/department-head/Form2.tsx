import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import API from '../../services/api';
import {
  DepartmentBudgetPlan,
  ExpenseClassification,
  ExpenseItem,
  DepartmentBudgetPlanItem,
  DepartmentBudgetPlanForm4Item,
} from '../../types/api';
import AddItemModal from './AddItemModal';
import { Button } from '@/src/components/ui/button';
import { toast } from 'sonner';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';
import { useCalamityFund } from '../../hooks/useCalamityFund';

// ─── Column color tokens ──────────────────────────────────────────────────────
// Appropriation (past year) → blue
// Proposed (budget year)    → orange

const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
const C_APP_SUB = 'bg-blue-50   border-blue-200';
const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
const C_PRO_SUB = 'bg-orange-50  border-orange-200';
const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// ─── Animation keyframes ──────────────────────────────────────────────────────

const ANIM_CSS = `
@keyframes _rowIn {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
@media (prefers-reduced-motion: reduce) {
  ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;
let _animInjected = false;
function ensureAnim() {
  if (_animInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
  _animInjected = true;
}

// ─── Dept → income-fund source key ───────────────────────────────────────────

const getSourceForDepartment = (dept?: {
  dept_abbreviation?: string; dept_name?: string;
}): string | undefined => {
  if (!dept) return undefined;
  const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
  const name = dept.dept_name?.toLowerCase() ?? '';
  if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
  if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
  if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
  return undefined;
};

const PS_CLASS_ID = 1;

// ─── Types ────────────────────────────────────────────────────────────────────

interface Form2Props {
  plan: DepartmentBudgetPlan;
  pastYearPlan: DepartmentBudgetPlan | null;
  classifications: ExpenseClassification[];
  expenseItems: ExpenseItem[];
  isEditable: boolean;
  isAdmin?: boolean;
  onItemUpdate: () => void;
}

interface ItemWithMeta extends DepartmentBudgetPlanItem {
  pastTotal: number; pastSem1: number; pastSem2: number;
  pastItemId?: number; expense_item?: ExpenseItem;
  recommendation?: string | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtP  = (n: number) => `₱${fmt(n)}`;
const incr  = (past: number, prop: number) => prop - past;
const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

const COL_WIDTHS = [110, 220, 95, 95, 100, 100, 95, 75, 170];

// ── Base th/td classes (neutral — no color zone) ──────────────────────────────
const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
const TD      = 'px-3 py-2.5 text-[12px]';
const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// ── Appropriation (blue) ───────────────────────────────────────────────────────
const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
const TD_APP  = `${TD_M} bg-blue-50/30`;

// ── Proposed (orange) ─────────────────────────────────────────────────────────
const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
const TD_PRO  = `${TD_M} bg-orange-50/30`;

const inputCls =
  'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
  'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

const inputAppCls =
  'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
  'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

const recCls =
  'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
  'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// ─── Sub-header ───────────────────────────────────────────────────────────────

const SubHeader: React.FC<{
  prevYear: number | string | undefined;
  currYear: number | string | undefined;
}> = ({ prevYear, currYear }) => (
  <>
    <tr>
      <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
      <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
      {/* Appropriation — blue */}
      <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
        Appropriation ({prevYear})
      </th>
      {/* Proposed — orange */}
      <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
      <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
      <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
      <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>
    </tr>
    <tr>
      <th className={TH_APP}>Sem 1</th>
      <th className={TH_APP}>Sem 2</th>
      <th className={TH_APP}>Total</th>
    </tr>
  </>
);

// ─── Component ────────────────────────────────────────────────────────────────

const Form2: React.FC<Form2Props> = ({
  plan, pastYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
}) => {
  useEffect(() => { ensureAnim(); }, []);

  const [items,    setItems]    = useState<ItemWithMeta[]>([]);
  const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

  const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
  const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
  const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
  const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

  const savedValues             = useRef<Map<number, number>>(new Map());
  const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
  const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

  const [pastSem1Edits, setPastSem1Edits] = useState<Map<number, number>>(new Map());
  const [inputDraft,    setInputDraft]    = useState<Map<string, string>>(new Map());
  const [modalState,    setModalState]    = useState<{
    isOpen: boolean; classificationId: number; classificationName: string;
  } | null>(null);

  const incomeSource = getSourceForDepartment(plan.department);
  const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
    useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

  const expenseItemMap = useMemo(
    () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
    [expenseItems]
  );

  useEffect(() => {
    API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
      .then(res => {
        const raw = res.data.data || [];
        setAipItems(raw.map((item: any) => ({
          ...item,
          ps_amount:    parseFloat(item.ps_amount)    || 0,
          mooe_amount:  parseFloat(item.mooe_amount)  || 0,
          co_amount:    parseFloat(item.co_amount)    || 0,
          total_amount: parseFloat(item.total_amount) || 0,
          sem1_amount:  parseFloat(item.sem1_amount)  || 0,
          sem2_amount:  parseFloat(item.sem2_amount)  || 0,
          recommendation: item.recommendation ?? null,
        })));
        raw.forEach((item: any) =>
          savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
        );
      })
      .catch(console.error);
  }, [plan.dept_budget_plan_id]);

  useEffect(() => {
    const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
    pastYearPlan?.items.forEach(item => {
      pastData.set(item.expense_item_id, {
        total:  Number(item.total_amount) || 0,
        sem1:   Number((item as any).sem1_amount) || 0,
        sem2:   Number((item as any).sem2_amount) || 0,
        itemId: item.dept_bp_form2_item_id,
      });
    });
    const merged: ItemWithMeta[] = plan.items.map(planItem => {
      const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0 };
      return {
        ...planItem,
        expense_item:   expenseItemMap.get(planItem.expense_item_id),
        pastTotal: past.total, pastSem1: past.sem1, pastSem2: past.sem2,
        pastItemId: past.itemId || undefined,
        recommendation: (planItem as any).recommendation ?? null,
      };
    });
    setItems(merged);
    merged.forEach(item => {
      savedValues.current.set(item.expense_item_id, Number(item.total_amount));
      savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
    });
  }, [plan, pastYearPlan, expenseItemMap]);

  const handleProposedChange = useCallback((id: number, value: number) =>
    setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

  const handleBlur = useCallback(async (expenseItemId: number) => {
    const item = items.find(i => i.expense_item_id === expenseItemId);
    if (!item) return;
    const cur = Number(item.total_amount);
    if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
    setSavingItems(prev => new Set(prev).add(expenseItemId));
    const promise = (async () => {
      const payload = { total_amount: cur };
      const res = item.dept_bp_form2_item_id === 0
        ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
        : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
      savedValues.current.set(expenseItemId, cur);
      onItemUpdate();
      return res.data;
    })();
    toast.promise(promise, {
      loading: 'Saving…',
      success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
      error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
    });
    try { await promise; } catch {}
    finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

  const handlePastSem1Change = (id: number, value: number) =>
    setPastSem1Edits(prev => new Map(prev).set(id, value));

  const handlePastSem1Blur = async (expenseItemId: number) => {
    const edit = pastSem1Edits.get(expenseItemId);
    if (edit === undefined) return;
    const item = items.find(i => i.expense_item_id === expenseItemId);
    if (!item) return;
    const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
    const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
    const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
    const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
    if (!targetId || !planId) return;
    const clamped = Math.min(Math.max(edit, 0), cap);
    if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
    if (clamped === item.pastSem1) {
      setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
      return;
    }
    setSavingPastItems(prev => new Set(prev).add(expenseItemId));
    const promise = (async () => {
      await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
      setItems(prev => prev.map(i =>
        i.expense_item_id === expenseItemId
          ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
      ));
      setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
    })();
    toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
    try { await promise; } catch {}
    finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  };

  const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
    const item = items.find(i => i.dept_bp_form2_item_id === itemId);
    if (!item) return;
    if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
    if (!confirm('Remove this item?')) return;
    try {
      await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
      toast.success('Item deleted'); onItemUpdate();
    } catch { toast.error('Failed to delete item.'); }
  }, [items, plan.dept_budget_plan_id, onItemUpdate]);

  const handleRecommendationChange = useCallback((id: number, value: string) =>
    setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

  const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
    const item = items.find(i => i.expense_item_id === expenseItemId);
    if (!item || item.dept_bp_form2_item_id === 0) return;
    const cur = item.recommendation ?? null;
    const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
    if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
    setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
    const promise = (async () => {
      await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
      savedRecommendations.current.set(expenseItemId, cur);
    })();
    toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
    try { await promise; } catch {}
    finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  }, [items, plan.dept_budget_plan_id, savingRecommendations]);

  const handleAipRecommendationChange = useCallback((id: number, value: string) =>
    setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

  const handleAipRecommendationBlur = useCallback(async (id: number) => {
    const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
    if (!item) return;
    const cur = (item as any).recommendation ?? null;
    const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
    if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
    setSavingAipRecommendations(prev => new Set(prev).add(id));
    const promise = (async () => {
      await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
      savedAipRecommendations.current.set(id, cur);
    })();
    toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
    try { await promise; } catch {}
    finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  }, [aipItems, savingAipRecommendations]);

  const getDraftValue = (id: number, field: 'proposed' | 'sem1', raw: number) => {
    const key = `${id}_${field}`;
    return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
  };

  const handleCommaInput = (id: number, field: 'proposed' | 'sem1', rawValue: string) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
    const num = digits === '' ? 0 : parseInt(digits, 10);
    if (field === 'proposed') handleProposedChange(id, num); else handlePastSem1Change(id, num);
  };

  const handleCommaBlur = (id: number, field: 'proposed' | 'sem1') => {
    setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
    if (field === 'proposed') handleBlur(id); else handlePastSem1Blur(id);
  };

  // const itemsByClassification = useMemo(() =>
  //   classifications.map(c => ({
  //     ...c,
  //     items: items
  //       .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
  //       .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
  //   })), [classifications, items]);
  const itemsByClassification = useMemo(() =>
    classifications
      .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
      .map(c => ({
        ...c,
        items: items
          .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
          .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
      })), [classifications, items]);

  const grandTotals = useMemo(() => ({
    pastSem1:  items.reduce((s, i) => s + i.pastSem1, 0),
    pastSem2:  items.reduce((s, i) => s + i.pastSem2, 0),
    pastTotal: items.reduce((s, i) => s + i.pastTotal, 0),
    proposed:  items.reduce((s, i) => s + Number(i.total_amount), 0),
  }), [items]);

  const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
  const calamityTotal = calamityData?.calamity_fund ?? 0;

  const grandFinal = useMemo(() => ({
    pastSem1:  grandTotals.pastSem1,
    pastSem2:  grandTotals.pastSem2,
    pastTotal: grandTotals.pastTotal,
    proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
  }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

  const prevYear = Number(plan.budget_plan?.year) - 1;
  const currYear = plan.budget_plan?.year;
  const hasRows  = items.length > 0 || aipItems.length > 0;

  const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
  const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

  const hasAipSection      = aipItems.length > 0;
  const hasCalamitySection = isSpecialAccount;

  let gIdx = 0;

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      <div className="px-5 py-4 border-b border-gray-200">
        <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
        <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
          Programmed Appropriation and Obligation by Object of Expenditures
        </h3>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

          <colgroup>
            {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
          </colgroup>

          {/* ── Main thead ──────────────────────────────────────────────── */}
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH} rowSpan={2}>Acct Code</th>
              <th className={TH} rowSpan={2}>Object of Expenditure</th>

              {/* Appropriation — blue group header */}
              <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
                Appropriation ({prevYear})
              </th>

              {/* Proposed — orange */}
              <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

              <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
              <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
              <th className={TH} rowSpan={2}>Recommendation</th>
            </tr>
            <tr>
              {/* Appropriation sub-headers — blue */}
              <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
              <th className={TH_APP}>Sem 2</th>
              <th className={TH_APP}>Total</th>
            </tr>
          </thead>

          <tbody>
            {itemsByClassification.map((cls, clsIndex) => {
              const isPS = cls.expense_class_id === PS_CLASS_ID;
              // const canEdit     = isEditable && !isPS;
              // const canEditSem1 = isEditable && (isAdmin || !isPS);
              const canEdit     = isEditable && (!isPS || isAdmin);
              const canEditSem1 = isEditable && (isAdmin || !isPS);

              const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
                ? 'Capital Outlay (CO)' : cls.expense_class_name;

              const clsSem1 = cls.items.reduce((s, i) => s + i.pastSem1, 0);
              const clsSem2 = cls.items.reduce((s, i) => s + i.pastSem2, 0);
              const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
              const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
              const clsDiff = clsProp - clsPast;
              const clsPct  = pctOf(clsPast, clsDiff);

              const isLastCls       = clsIndex === itemsByClassification.length - 1;
              const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
              const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

              return (
                <React.Fragment key={cls.expense_class_id}>

                  {/* Section divider */}
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <td colSpan={8} className="px-4 py-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-semibold text-gray-700">{label}</span>
                          {isPS && (
                            <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                              Auto-filled from Personnel Services
                            </span>
                          )}
                        </div>
                        {canEdit && (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button size="sm" variant="outline"
                                className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
                                onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
                                <PlusIcon className="w-3.5 h-3.5" /> Add Item
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                    <td className="bg-gray-50" />
                  </tr>

                  {cls.items.length === 0 ? (
                    <>
                      <tr><td colSpan={9} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
                      {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />}
                    </>
                  ) : (
                    <>
                      {cls.items.map(item => {
                        const delay    = Math.min(gIdx * 18, 280);
                        gIdx++;
                        const past     = item.pastTotal;
                        const proposed = Number(item.total_amount);
                        const d        = incr(past, proposed);
                        const p        = pctOf(past, d);
                        const isSaving = savingItems.has(item.expense_item_id);

                        const dispSem1 = pastSem1Edits.has(item.expense_item_id)
                          ? pastSem1Edits.get(item.expense_item_id)!
                          : item.pastSem1;
                        const sem2Cap  = past > 0 ? past : proposed;
                        const dispSem2 = pastSem1Edits.has(item.expense_item_id)
                          ? sem2Cap - dispSem1
                          : item.pastSem2;

                        const sem1Editable = canEditSem1 && (isAdmin || past > 0);

                        return (
                          <tr
                            key={item.expense_item_id}
                            className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
                            style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
                          >
                            <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
                            <td className={cn(TD, 'text-gray-800 font-medium')}>
                              <div className="flex items-center justify-between gap-1">
                                <span>{item.expense_item?.expense_class_item_name}</span>
                                {canEdit && item.dept_bp_form2_item_id > 0 && (
                                  <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {/* ── Sem 1 — blue ────────────────────────────── */}
                            <td className={cn(TD_APP, 'border-l border-blue-100')}>
                              {sem1Editable ? (
                                <input type="text" inputMode="numeric"
                                  value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
                                  onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
                                  onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
                                  disabled={savingPastItems.has(item.expense_item_id)}
                                  className={inputAppCls}
                                />
                              ) : (
                                <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
                              )}
                            </td>

                            {/* ── Sem 2 — blue ────────────────────────────── */}
                            <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

                            {/* ── Past Total — blue ────────────────────────── */}
                            <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

                            {/* ── Proposed — orange ────────────────────────── */}
                            <td className={cn(TD_PRO, 'border-l border-orange-100')}>
                              {canEdit ? (
                                <input type="text" inputMode="numeric"
                                  value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
                                  onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
                                  onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
                                  disabled={isSaving} className={inputCls} />
                              ) : (
                                <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
                                  {proposed === 0 ? '–' : fmtP(proposed)}
                                </span>
                              )}
                            </td>

                            <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
                            <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

                            {/* Recommendation */}
                            <td className={TD}>
                              {isEditable && (isAdmin || !isPS) ? (
                                <input type="text" value={item.recommendation ?? ''}
                                  onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
                                  onBlur={() => handleRecommendationBlur(item.expense_item_id)}
                                  disabled={savingRecommendations.has(item.expense_item_id)}
                                  placeholder="Add note…" maxLength={255} className={recCls} />
                              ) : (
                                <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}

                      {/* Classification subtotal */}
                      <tr className="border-t border-gray-200">
                        <td className="bg-gray-100" />
                        <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
                        {/* blue subtotals */}
                        <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
                        <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
                        <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
                        {/* orange subtotal */}
                        <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
                        <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
                        <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
                          {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
                        </td>
                        <td className="bg-gray-100" />
                      </tr>

                      {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />}
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Special Programs (AIP) ── */}
            {aipItems.length > 0 && (
              <React.Fragment>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <td colSpan={8} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
                      <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
                    </div>
                  </td>
                  <td className="bg-gray-50" />
                </tr>

                {aipItems.map(item => {
                  const delay = Math.min(gIdx * 18, 280);
                  gIdx++;
                  return (
                    <tr key={item.dept_bp_form4_item_id}
                      className="_rowAnim hover:bg-gray-50/60 transition-colors"
                      style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
                      <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
                      <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
                      {/* blue — blank for AIP rows */}
                      <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      {/* orange — amount */}
                      <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
                      <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
                      <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
                      <td className={TD}>
                        {isEditable ? (
                          <input type="text" value={(item as any).recommendation ?? ''}
                            onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
                            onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
                            disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
                            placeholder="Add note…" maxLength={255} className={recCls} />
                        ) : (
                          <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
                        )}
                      </td>
                    </tr>
                  );
                })}

                <tr className="border-t border-gray-200">
                  <td className="bg-gray-100" />
                  <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
                  <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
                  <td className="bg-gray-100" />
                </tr>

                {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} />}
              </React.Fragment>
            )}

            {/* ── 5% Calamity Fund ── */}
            {isSpecialAccount && (
              <React.Fragment>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <td colSpan={8} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
                      </span>
                      {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
                    </div>
                  </td>
                  <td className="bg-gray-50" />
                </tr>

                {[
                  { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
                  { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
                ].map(row => {
                  const delay = Math.min(gIdx * 18, 280);
                  gIdx++;
                  return (
                    <tr key={row.code}
                      className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
                      style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
                      <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
                      <td className={cn(TD, 'text-gray-800')}>
                        {row.label}
                        <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
                      </td>
                      {/* blue — blank */}
                      <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      {/* orange — derived value */}
                      <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
                        {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
                      </td>
                      <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
                      <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
                      <td />
                    </tr>
                  );
                })}

                <tr className="border-t border-gray-200">
                  <td className="bg-gray-100" />
                  <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
                  <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
                    {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
                  </td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
                  <td className="bg-gray-100" />
                </tr>

                {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
                      Base:{' '}
                      <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
                      {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
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
                <td className="px-3 py-3" />
                <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                  Grand Total
                  {isSpecialAccount && calamityTotal > 0 && (
                    <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
                  )}
                </td>
                {/* Appropriation — blue tint */}
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
                {/* Proposed — orange tint */}
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
                <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
                  {gtDiff === 0 ? '–' : fmtP(gtDiff)}
                </td>
                <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
                  {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
                </td>
                <td className="border-l border-gray-700" />
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {modalState && (
        <AddItemModal
          isOpen={modalState.isOpen}
          onClose={() => setModalState(null)}
          classificationId={modalState.classificationId}
          classificationName={modalState.classificationName}
          planId={plan.dept_budget_plan_id}
          expenseItems={expenseItems}
          existingItemIds={items.map(i => i.expense_item_id)}
          onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
        />
      )}
    </div>
  );
};

export default Form2;