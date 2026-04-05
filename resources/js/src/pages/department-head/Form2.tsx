// // // // import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// // // // import API from '../../services/api';
// // // // import {
// // // //   DepartmentBudgetPlan,
// // // //   ExpenseClassification,
// // // //   ExpenseItem,
// // // //   DepartmentBudgetPlanItem,
// // // //   DepartmentBudgetPlanForm4Item,
// // // // } from '../../types/api';
// // // // import AddItemModal from './AddItemModal';
// // // // import { Button } from '@/src/components/ui/button';
// // // // import { toast } from 'sonner';
// // // // import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// // // // import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// // // // import { cn } from '@/src/lib/utils';
// // // // import { useCalamityFund } from '../../hooks/useCalamityFund';


// // // // // ─── Column color tokens ──────────────────────────────────────────────────────
// // // // // Appropriation (past year) → blue
// // // // // Proposed (budget year)    → orange

// // // // const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// // // // const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// // // // const C_APP_SUB = 'bg-blue-50   border-blue-200';
// // // // const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// // // // const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// // // // const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// // // // const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// // // // const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // // // // ─── Animation keyframes ──────────────────────────────────────────────────────

// // // // const ANIM_CSS = `
// // // // @keyframes _rowIn {
// // // //   from { opacity: 0; transform: translateY(6px); }
// // // //   to   { opacity: 1; transform: translateY(0); }
// // // // }
// // // // @media (prefers-reduced-motion: reduce) {
// // // //   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// // // // }
// // // // `;
// // // // let _animInjected = false;
// // // // function ensureAnim() {
// // // //   if (_animInjected || typeof document === 'undefined') return;
// // // //   const el = document.createElement('style');
// // // //   el.textContent = ANIM_CSS;
// // // //   document.head.appendChild(el);
// // // //   _animInjected = true;
// // // // }

// // // // // ─── Dept → income-fund source key ───────────────────────────────────────────

// // // // const getSourceForDepartment = (dept?: {
// // // //   dept_abbreviation?: string; dept_name?: string;
// // // // }): string | undefined => {
// // // //   if (!dept) return undefined;
// // // //   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
// // // //   const name = dept.dept_name?.toLowerCase() ?? '';
// // // //   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
// // // //   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
// // // //   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
// // // //   return undefined;
// // // // };

// // // // const PS_CLASS_ID = 1;

// // // // // ─── Types ────────────────────────────────────────────────────────────────────

// // // // interface Form2Props {
// // // //   plan: DepartmentBudgetPlan;
// // // //   pastYearPlan: DepartmentBudgetPlan | null;
// // // //   obligationYearPlan: DepartmentBudgetPlan | null;
// // // //   classifications: ExpenseClassification[];
// // // //   expenseItems: ExpenseItem[];
// // // //   isEditable: boolean;
// // // //   isAdmin?: boolean;
// // // //   onItemUpdate: () => void;
// // // // }

// // // // interface ItemWithMeta extends DepartmentBudgetPlanItem {
// // // //   pastTotal: number; pastSem1: number; pastSem2: number;
// // // //   pastObligation: number;
// // // //   pastObligationItemId?: number;
// // // //   pastItemId?: number; expense_item?: ExpenseItem;
// // // //   recommendation?: string | null;
// // // // }

// // // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // // const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// // // // const fmtP  = (n: number) => `₱${fmt(n)}`;
// // // // const incr  = (past: number, prop: number) => prop - past;
// // // // const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// // // // const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// // // // const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // // // // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// // // // const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // // // // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// // // // const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// // // // const TD      = 'px-3 py-2.5 text-[12px]';
// // // // const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // // // // ── Appropriation (blue) ───────────────────────────────────────────────────────
// // // // const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// // // // const TD_APP  = `${TD_M} bg-blue-50/30`;

// // // // // ── Proposed (orange) ─────────────────────────────────────────────────────────
// // // // const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// // // // const TD_PRO  = `${TD_M} bg-orange-50/30`;

// // // // const inputCls =
// // // //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // // //   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// // // // const inputAppCls =
// // // //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // // //   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// // // // const recCls =
// // // //   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // // //   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // // // // ─── Sub-header ───────────────────────────────────────────────────────────────

// // // // // const SubHeader: React.FC<{
// // // // //   prevYear: number | string | undefined;
// // // // //   currYear: number | string | undefined;
// // // // // }> = ({ prevYear, currYear }) => (
// // // // //   <>
// // // // //     <tr>
// // // // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// // // // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// // // // //       {/* Appropriation — blue */}
// // // // //       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// // // // //         Appropriation ({prevYear})
// // // // //       </th>
// // // // //       {/* Proposed — orange */}
// // // // //       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// // // // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// // // // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// // // // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>
// // // // //     </tr>
// // // // //     <tr>
// // // // //       <th className={TH_APP}>Sem 1</th>
// // // // //       <th className={TH_APP}>Sem 2</th>
// // // // //       <th className={TH_APP}>Total</th>
// // // // //     </tr>
// // // // //   </>
// // // // // );
// // // //   const SubHeader: React.FC<{
// // // //     prevYear: number | string | undefined;
// // // //     currYear: number | string | undefined;
// // // //     isAdmin?: boolean;
// // // //   }> = ({ prevYear, currYear, isAdmin }) => (
// // // //     <>
// // // //       <tr>
// // // //         <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// // // //         <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// // // //         {isAdmin && (
// // // //           <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
// // // //             Past Year ({Number(prevYear) - 1})
// // // //           </th>
// // // //         )}
// // // //         <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// // // //           Appropriation ({prevYear})
// // // //         </th>
// // // //         <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// // // //         <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// // // //         <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// // // //         {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
// // // //       </tr>
// // // //       <tr>
// // // //         <th className={TH_APP}>Sem 1</th>
// // // //         <th className={TH_APP}>Sem 2</th>
// // // //         <th className={TH_APP}>Total</th>
// // // //       </tr>
// // // //     </>
// // // //   );

// // // // // ─── Component ────────────────────────────────────────────────────────────────

// // // // const Form2: React.FC<Form2Props> = ({
// // // //   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// // // // }) => {
// // // //   useEffect(() => { ensureAnim(); }, []);

// // // //   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
// // // //   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

// // // //   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
// // // //   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
// // // //   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
// // // //   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

// // // //   const savedValues             = useRef<Map<number, number>>(new Map());
// // // //   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
// // // //   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

// // // //   const [pastSem1Edits,       setPastSem1Edits]       = useState<Map<number, number>>(new Map());
// // // //   const [obligationEdits,     setObligationEdits]     = useState<Map<number, number>>(new Map());
// // // //   const [savingObligations,   setSavingObligations]   = useState<Set<number>>(new Set());
// // // //   const [uploadingObligations,setUploadingObligations]= useState(false);
// // // //   const [inputDraft,          setInputDraft]          = useState<Map<string, string>>(new Map());
// // // //   const [modalState,          setModalState]          = useState<{
// // // //     isOpen: boolean; classificationId: number; classificationName: string;
// // // //   } | null>(null);
// // // //   const [pastModalState,      setPastModalState]      = useState<{
// // // //     isOpen: boolean; classificationId: number; classificationName: string;
// // // //   } | null>(null);
// // // //   const fileInputRef = useRef<HTMLInputElement>(null);
// // // //   const savedObligations = useRef<Map<number, number>>(new Map());

// // // //   const incomeSource = getSourceForDepartment(plan.department);
// // // //   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
// // // //     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

// // // //   const expenseItemMap = useMemo(
// // // //     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
// // // //     [expenseItems]
// // // //   );

// // // //   useEffect(() => {
// // // //     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// // // //       .then(res => {
// // // //         const raw = res.data.data || [];
// // // //         setAipItems(raw.map((item: any) => ({
// // // //           ...item,
// // // //           ps_amount:    parseFloat(item.ps_amount)    || 0,
// // // //           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
// // // //           co_amount:    parseFloat(item.co_amount)    || 0,
// // // //           total_amount: parseFloat(item.total_amount) || 0,
// // // //           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
// // // //           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
// // // //           recommendation: item.recommendation ?? null,
// // // //         })));
// // // //         raw.forEach((item: any) =>
// // // //           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
// // // //         );
// // // //       })
// // // //       .catch(console.error);
// // // //   }, [plan.dept_budget_plan_id]);

// // // //   useEffect(() => {
// // // //     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
// // // //     pastYearPlan?.items.forEach(item => {
// // // //       pastData.set(item.expense_item_id, {
// // // //         total:  Number(item.total_amount) || 0,
// // // //         sem1:   Number((item as any).sem1_amount) || 0,
// // // //         sem2:   Number((item as any).sem2_amount) || 0,
// // // //         itemId: item.dept_bp_form2_item_id,
// // // //       });
// // // //     });

// // // //     // Obligation data comes from the year BEFORE pastYearPlan (obligationYearPlan)
// // // //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// // // //     obligationYearPlan?.items.forEach(item => {
// // // //       obligationData.set(item.expense_item_id, {
// // // //         amount: Number((item as any).obligation_amount) || 0,
// // // //         itemId: item.dept_bp_form2_item_id,
// // // //       });
// // // //     });
// // // //     const merged: ItemWithMeta[] = plan.items.map(planItem => {
// // // //       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0, obligation: 0 };
// // // //       return {
// // // //         ...planItem,
// // // //         expense_item:   expenseItemMap.get(planItem.expense_item_id),
// // // //         pastTotal:      past.total,
// // // //         pastSem1:       past.sem1,
// // // //         pastSem2:       past.sem2,
// // // //         pastObligation:      obligationData.get(planItem.expense_item_id)?.amount ?? 0,
// // // //         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
// // // //         pastItemId:          past.itemId || undefined,
// // // //         recommendation: (planItem as any).recommendation ?? null,
// // // //       };
// // // //     });
// // // //     setItems(merged);
// // // //     merged.forEach(item => {
// // // //       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
// // // //       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
// // // //       savedObligations.current.set(item.expense_item_id, item.pastObligation);
// // // //     });
// // // //   }, [plan, pastYearPlan, expenseItemMap]);

// // // //   const handleProposedChange = useCallback((id: number, value: number) =>
// // // //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

// // // //   const handleBlur = useCallback(async (expenseItemId: number) => {
// // // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // // //     if (!item) return;
// // // //     const cur = Number(item.total_amount);
// // // //     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
// // // //     setSavingItems(prev => new Set(prev).add(expenseItemId));
// // // //     const promise = (async () => {
// // // //       const payload = { total_amount: cur };
// // // //       const res = item.dept_bp_form2_item_id === 0
// // // //         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
// // // //         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
// // // //       savedValues.current.set(expenseItemId, cur);
// // // //       onItemUpdate();
// // // //       return res.data;
// // // //     })();
// // // //     toast.promise(promise, {
// // // //       loading: 'Saving…',
// // // //       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
// // // //       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
// // // //     });
// // // //     try { await promise; } catch {}
// // // //     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // // //   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

// // // //   const handlePastSem1Change = (id: number, value: number) =>
// // // //     setPastSem1Edits(prev => new Map(prev).set(id, value));

// // // //   const handlePastSem1Blur = async (expenseItemId: number) => {
// // // //     const edit = pastSem1Edits.get(expenseItemId);
// // // //     if (edit === undefined) return;
// // // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // // //     if (!item) return;
// // // //     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
// // // //     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
// // // //     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
// // // //     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
// // // //     if (!targetId || !planId) return;
// // // //     const clamped = Math.min(Math.max(edit, 0), cap);
// // // //     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
// // // //     if (clamped === item.pastSem1) {
// // // //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // // //       return;
// // // //     }
// // // //     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
// // // //     const promise = (async () => {
// // // //       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
// // // //       setItems(prev => prev.map(i =>
// // // //         i.expense_item_id === expenseItemId
// // // //           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
// // // //       ));
// // // //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // // //     })();
// // // //     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
// // // //     try { await promise; } catch {}
// // // //     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // // //   };

// // // //   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
// // // //     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
// // // //     if (!item) return;
// // // //     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
// // // //     if (!confirm('Remove this item?')) return;
// // // //     try {
// // // //       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
// // // //       toast.success('Item deleted'); onItemUpdate();
// // // //     } catch { toast.error('Failed to delete item.'); }
// // // //   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

// // // //   const handleRecommendationChange = useCallback((id: number, value: string) =>
// // // //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

// // // //   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
// // // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // // //     if (!item || item.dept_bp_form2_item_id === 0) return;
// // // //     const cur = item.recommendation ?? null;
// // // //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// // // //     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
// // // //     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
// // // //     const promise = (async () => {
// // // //       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
// // // //       savedRecommendations.current.set(expenseItemId, cur);
// // // //     })();
// // // //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// // // //     try { await promise; } catch {}
// // // //     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // // //   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

// // // //   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
// // // //     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

// // // //   const handleAipRecommendationBlur = useCallback(async (id: number) => {
// // // //     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
// // // //     if (!item) return;
// // // //     const cur = (item as any).recommendation ?? null;
// // // //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// // // //     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
// // // //     setSavingAipRecommendations(prev => new Set(prev).add(id));
// // // //     const promise = (async () => {
// // // //       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
// // // //       savedAipRecommendations.current.set(id, cur);
// // // //     })();
// // // //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// // // //     try { await promise; } catch {}
// // // //     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
// // // //   }, [aipItems, savingAipRecommendations]);

// // // //   // ── Obligation handlers (admin only, edits past plan item) ───────────────

// // // //   const handleObligationChange = (expenseItemId: number, value: number) =>
// // // //     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

// // // //   const handleObligationBlur = async (expenseItemId: number) => {
// // // //     const edit = obligationEdits.get(expenseItemId);
// // // //     if (edit === undefined) return;
// // // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // // //     if (!item) return;
// // // //     const clamped = Math.max(edit, 0);
// // // //     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
// // // //     if (clamped === savedObligations.current.get(expenseItemId)) {
// // // //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // // //       return;
// // // //     }
// // // //     // We need the past plan item id. If no past item, we must create one on the past plan first.
// // // //     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// // // //     if (!oblPlanId) { toast.error('No obligation year plan (2025) found for this department.'); return; }
// // // //     setSavingObligations(prev => new Set(prev).add(expenseItemId));
// // // //     const promise = (async () => {
// // // //       if (item.pastObligationItemId) {
// // // //         // Update existing obligation year item
// // // //         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
// // // //       } else {
// // // //         // Create new item on the obligation year plan (2025)
// // // //         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
// // // //           expense_item_id: expenseItemId,
// // // //           obligation_amount: clamped,
// // // //         });
// // // //         const newItemId = res.data.data?.dept_bp_form2_item_id;
// // // //         setItems(prev => prev.map(i =>
// // // //           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
// // // //         ));
// // // //         // Cascade: ensure item exists on current (pastYearPlan = 2026) and proposed (plan = 2027)
// // // //         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
// // // //           expense_item_id: expenseItemId,
// // // //         }).catch(() => {}); // ignore 422 duplicate
// // // //         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
// // // //           expense_item_id: expenseItemId,
// // // //         }).catch(() => {}); // ignore 422 duplicate
// // // //       }
// // // //       savedObligations.current.set(expenseItemId, clamped);
// // // //       setItems(prev => prev.map(i =>
// // // //         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
// // // //       ));
// // // //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // // //       onItemUpdate();
// // // //     })();
// // // //     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
// // // //     try { await promise; } catch {}
// // // //     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // // //   };

// // // //   // ── Excel upload handler ──────────────────────────────────────────────────

// // // //   const handleObligationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
// // // //     const file = e.target.files?.[0];
// // // //     if (!file) return;
// // // //     // Reset input so same file can be re-uploaded
// // // //     e.target.value = '';
// // // //     setUploadingObligations(true);
// // // //     try {
// // // //       // Dynamically import SheetJS (xlsx) — it must be installed: npm i xlsx
// // // //       const XLSX = await import('xlsx');
// // // //       const data  = await file.arrayBuffer();
// // // //       const wb    = XLSX.read(data, { type: 'array' });

// // // //       // Parse all sheets: match by sheet name containing 'ps', 'mooe', 'co', 'aip'
// // // //       const expenseRows: { expense_item_name: string; amount: number }[] = [];
// // // //       const aipRows:     { program_description: string; amount: number }[] = [];

// // // //       wb.SheetNames.forEach(name => {
// // // //         const lower = name.toLowerCase();
// // // //         const sheet  = wb.Sheets[name];
// // // //         const rows   = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
// // // //         if (lower.includes('aip')) {
// // // //           rows.forEach(row => {
// // // //             const desc   = String(row['program_description'] ?? row['Program Description'] ?? row['description'] ?? row['Description'] ?? '').trim();
// // // //             const amount = parseFloat(String(row['amount'] ?? row['Amount'] ?? row['obligation'] ?? row['Obligation'] ?? 0).replace(/,/g, ''));
// // // //             if (desc && !isNaN(amount) && amount >= 0) aipRows.push({ program_description: desc, amount });
// // // //           });
// // // //         } else {
// // // //           rows.forEach(row => {
// // // //             const name   = String(row['expense_item_name'] ?? row['Item'] ?? row['item'] ?? row['Name'] ?? row['name'] ?? '').trim();
// // // //             const amount = parseFloat(String(row['amount'] ?? row['Amount'] ?? row['obligation'] ?? row['Obligation'] ?? 0).replace(/,/g, ''));
// // // //             if (name && !isNaN(amount) && amount >= 0) expenseRows.push({ expense_item_name: name, amount });
// // // //           });
// // // //         }
// // // //       });

// // // //       const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// // // //       if (!oblPlanId) { toast.error('No obligation year plan (2025) found.'); return; }

// // // //       await API.post(`/department-budget-plans/${oblPlanId}/upload-obligations`, {
// // // //         items:        expenseRows,
// // // //         aip_programs: aipRows,
// // // //       });

// // // //       toast.success(`Uploaded ${expenseRows.length} expense items and ${aipRows.length} AIP programs.`);
// // // //       onItemUpdate();
// // // //     } catch (err: any) {
// // // //       toast.error(`Upload failed: ${err?.response?.data?.message ?? err.message}`);
// // // //     } finally {
// // // //       setUploadingObligations(false);
// // // //     }
// // // //   };

// // // //   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
// // // //     const key = `${id}_${field}`;
// // // //     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
// // // //   };

// // // //   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
// // // //     const digits = rawValue.replace(/[^0-9]/g, '');
// // // //     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
// // // //     const num = digits === '' ? 0 : parseInt(digits, 10);
// // // //     if (field === 'proposed') handleProposedChange(id, num);
// // // //     else if (field === 'sem1') handlePastSem1Change(id, num);
// // // //     else handleObligationChange(id, num);
// // // //   };

// // // //   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
// // // //     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
// // // //     if (field === 'proposed') handleBlur(id);
// // // //     else if (field === 'sem1') handlePastSem1Blur(id);
// // // //     else handleObligationBlur(id);
// // // //   };

// // // //   // const itemsByClassification = useMemo(() =>
// // // //   //   classifications.map(c => ({
// // // //   //     ...c,
// // // //   //     items: items
// // // //   //       .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// // // //   //       .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// // // //   //   })), [classifications, items]);
// // // //   const itemsByClassification = useMemo(() =>
// // // //     classifications
// // // //       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
// // // //       .map(c => ({
// // // //         ...c,
// // // //         items: items
// // // //           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// // // //           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// // // //       })), [classifications, items]);

// // // //   const grandTotals = useMemo(() => ({
// // // //     pastSem1:  items.reduce((s, i) => s + i.pastSem1, 0),
// // // //     pastSem2:  items.reduce((s, i) => s + i.pastSem2, 0),
// // // //     pastTotal: items.reduce((s, i) => s + i.pastTotal, 0),
// // // //     proposed:  items.reduce((s, i) => s + Number(i.total_amount), 0),
// // // //   }), [items]);

// // // //   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
// // // //   const calamityTotal = calamityData?.calamity_fund ?? 0;

// // // //   const grandFinal = useMemo(() => ({
// // // //     pastSem1:  grandTotals.pastSem1,
// // // //     pastSem2:  grandTotals.pastSem2,
// // // //     pastTotal: grandTotals.pastTotal,
// // // //     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
// // // //   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

// // // //   const prevYear = Number(plan.budget_plan?.year) - 1;
// // // //   const currYear = plan.budget_plan?.year;
// // // //   const hasRows  = items.length > 0 || aipItems.length > 0;

// // // //   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
// // // //   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

// // // //   const hasAipSection      = aipItems.length > 0;
// // // //   const hasCalamitySection = isSpecialAccount;

// // // //   let gIdx = 0;

// // // //   return (
// // // //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// // // //       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
// // // //         <div>
// // // //           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
// // // //           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
// // // //             Programmed Appropriation and Obligation by Object of Expenditures
// // // //           </h3>
// // // //         </div>
// // // //         {isAdmin && (
// // // //           <div className="flex items-center gap-2">
// // // //             <Tooltip>
// // // //               <TooltipTrigger asChild>
// // // //                 <Button
// // // //                   size="sm" variant="outline"
// // // //                   disabled={uploadingObligations}
// // // //                   onClick={() => fileInputRef.current?.click()}
// // // //                   className="gap-1.5 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
// // // //                   {uploadingObligations
// // // //                     ? <><span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> Uploading…</>
// // // //                     : <><PlusIcon className="w-3.5 h-3.5" /> Upload SAAOB ({prevYear})</>}
// // // //                 </Button>
// // // //               </TooltipTrigger>
// // // //               <TooltipContent className="text-xs max-w-xs">
// // // //                 Upload an Excel file with obligation amounts for {prevYear}. Sheets named "PS", "MOOE", "CO", "AIP". Columns: expense_item_name (or "Item"), amount (or "Amount").
// // // //               </TooltipContent>
// // // //             </Tooltip>
// // // //             <input
// // // //               ref={fileInputRef}
// // // //               type="file"
// // // //               accept=".xlsx,.xls,.csv"
// // // //               className="hidden"
// // // //               onChange={handleObligationUpload}
// // // //             />
// // // //           </div>
// // // //         )}
// // // //       </div>

// // // //       <div className="overflow-x-auto">
// // // //         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

// // // //           {/* <colgroup>
// // // //             {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
// // // //           </colgroup> */}
// // // //           <colgroup>
// // // //             {/* Obligation col only for admin, recommendation col only for admin */}
// // // //             {COL_WIDTHS.map((w, i) => {
// // // //               // index 2 = obligation col (admin only), index 9 = recommendation col (admin only)
// // // //               if ((i === 2 || i === 9) && !isAdmin) return null;
// // // //               return <col key={i} style={{ width: w }} />;
// // // //             })}
// // // //           </colgroup>

// // // //           {/* ── Main thead ──────────────────────────────────────────────── */}
// // // //           <thead className="sticky top-0 z-10">
// // // //             <tr>
// // // //               <th className={TH} rowSpan={2}>Acct Code</th>
// // // //               <th className={TH} rowSpan={2}>Object of Expenditure</th>

// // // //               {/* Obligation — admin only, blue tint, single col */}
// // // //               {isAdmin && (
// // // //                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
// // // //                   Past Year ({Number(plan.budget_plan?.year) - 2})
// // // //                 </th>
// // // //               )}

// // // //               {/* Appropriation — blue group header */}
// // // //               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
// // // //                 Appropriation ({prevYear})
// // // //               </th>

// // // //               {/* Proposed — orange */}
// // // //               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

// // // //               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
// // // //               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
// // // //               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
// // // //             </tr>
// // // //             <tr>
// // // //               {/* Appropriation sub-headers — blue */}
// // // //               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
// // // //               <th className={TH_APP}>Sem 2</th>
// // // //               <th className={TH_APP}>Total</th>
// // // //             </tr>
// // // //           </thead>

// // // //           <tbody>
// // // //             {itemsByClassification.map((cls, clsIndex) => {
// // // //               const isPS = cls.expense_class_id === PS_CLASS_ID;
// // // //               // const canEdit     = isEditable && !isPS;
// // // //               // const canEditSem1 = isEditable && (isAdmin || !isPS);
// // // //               const canEdit     = isEditable && (!isPS || isAdmin);
// // // //               const canEditSem1 = isEditable && (isAdmin || !isPS);

// // // //               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
// // // //                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

// // // //               const clsSem1 = cls.items.reduce((s, i) => s + i.pastSem1, 0);
// // // //               const clsSem2 = cls.items.reduce((s, i) => s + i.pastSem2, 0);
// // // //               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
// // // //               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
// // // //               const clsDiff = clsProp - clsPast;
// // // //               const clsPct  = pctOf(clsPast, clsDiff);

// // // //               const isLastCls       = clsIndex === itemsByClassification.length - 1;
// // // //               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
// // // //               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

// // // //               return (
// // // //                 <React.Fragment key={cls.expense_class_id}>

// // // //                   {/* Section divider */}
// // // //                   <tr className="bg-gray-50 border-y border-gray-200">
// // // //                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // // //                       <div className="flex items-center justify-between">
// // // //                         <div className="flex items-center gap-2">
// // // //                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
// // // //                           {isPS && (
// // // //                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
// // // //                               Auto-filled from Personnel Services
// // // //                             </span>
// // // //                           )}
// // // //                         </div>
// // // //                         <div className="flex items-center gap-1.5">
// // // //                           {/* Admin: Add item to past year */}
// // // //                           {isAdmin && (
// // // //                             <Tooltip>
// // // //                               <TooltipTrigger asChild>
// // // //                                 <Button size="sm" variant="outline"
// // // //                                   className="gap-1.5 text-xs h-7 border-blue-200 text-blue-600 hover:text-blue-900 bg-blue-50"
// // // //                                   onClick={() => setPastModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// // // //                                   <PlusIcon className="w-3.5 h-3.5" /> Past Year Item
// // // //                                 </Button>
// // // //                               </TooltipTrigger>
// // // //                               <TooltipContent side="left" className="text-xs">Add item to past year ({prevYear})</TooltipContent>
// // // //                             </Tooltip>
// // // //                           )}
// // // //                           {canEdit && (
// // // //                             <Tooltip>
// // // //                               <TooltipTrigger asChild>
// // // //                                 <Button size="sm" variant="outline"
// // // //                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
// // // //                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// // // //                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
// // // //                                 </Button>
// // // //                               </TooltipTrigger>
// // // //                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
// // // //                             </Tooltip>
// // // //                           )}
// // // //                         </div>
// // // //                       </div>
// // // //                     </td>
// // // //                   </tr>

// // // //                   {cls.items.length === 0 ? (
// // // //                     <>
// // // //                       {/* <tr><td colSpan={9} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr> */}
// // // //                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
// // // //                       {/* {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// // // //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // // //                     </>
// // // //                   ) : (
// // // //                     <>
// // // //                       {cls.items.map(item => {
// // // //                         const delay    = Math.min(gIdx * 18, 280);
// // // //                         gIdx++;
// // // //                         const past     = item.pastTotal;
// // // //                         const proposed = Number(item.total_amount);
// // // //                         const d        = incr(past, proposed);
// // // //                         const p        = pctOf(past, d);
// // // //                         const isSaving = savingItems.has(item.expense_item_id);

// // // //                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
// // // //                           ? pastSem1Edits.get(item.expense_item_id)!
// // // //                           : item.pastSem1;
// // // //                         const sem2Cap  = past > 0 ? past : proposed;
// // // //                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
// // // //                           ? sem2Cap - dispSem1
// // // //                           : item.pastSem2;

// // // //                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

// // // //                         return (
// // // //                           <tr
// // // //                             key={item.expense_item_id}
// // // //                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
// // // //                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
// // // //                           >
// // // //                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
// // // //                             <td className={cn(TD, 'text-gray-800 font-medium')}>
// // // //                               <div className="flex items-center justify-between gap-1">
// // // //                                 <span>{item.expense_item?.expense_class_item_name}</span>
// // // //                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
// // // //                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
// // // //                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
// // // //                                     <TrashIcon className="w-3.5 h-3.5" />
// // // //                                   </button>
// // // //                                 )}
// // // //                               </div>
// // // //                             </td>

// // // //                             {/* ── Obligation — blue, admin only ─────────── */}
// // // //                             {isAdmin && (
// // // //                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
// // // //                                 {isAdmin ? (
// // // //                                   <input type="text" inputMode="numeric"
// // // //                                     value={getDraftValue(item.expense_item_id, 'obligation',
// // // //                                       obligationEdits.has(item.expense_item_id)
// // // //                                         ? obligationEdits.get(item.expense_item_id)!
// // // //                                         : item.pastObligation)}
// // // //                                     onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
// // // //                                     onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
// // // //                                     disabled={savingObligations.has(item.expense_item_id)}
// // // //                                     className={inputAppCls}
// // // //                                   />
// // // //                                 ) : (
// // // //                                   <span className="text-gray-600">{item.pastObligation === 0 ? '–' : fmtP(item.pastObligation)}</span>
// // // //                                 )}
// // // //                               </td>
// // // //                             )}

// // // //                             {/* ── Sem 1 — blue ────────────────────────────── */}
// // // //                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
// // // //                               {sem1Editable ? (
// // // //                                 <input type="text" inputMode="numeric"
// // // //                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
// // // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
// // // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
// // // //                                   disabled={savingPastItems.has(item.expense_item_id)}
// // // //                                   className={inputAppCls}
// // // //                                 />
// // // //                               ) : (
// // // //                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
// // // //                               )}
// // // //                             </td>

// // // //                             {/* ── Sem 2 — blue ────────────────────────────── */}
// // // //                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

// // // //                             {/* ── Past Total — blue ────────────────────────── */}
// // // //                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

// // // //                             {/* ── Proposed — orange ────────────────────────── */}
// // // //                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
// // // //                               {canEdit ? (
// // // //                                 <input type="text" inputMode="numeric"
// // // //                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
// // // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
// // // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
// // // //                                   disabled={isSaving} className={inputCls} />
// // // //                               ) : (
// // // //                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
// // // //                                   {proposed === 0 ? '–' : fmtP(proposed)}
// // // //                                 </span>
// // // //                               )}
// // // //                             </td>

// // // //                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
// // // //                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

// // // //                             {/* Recommendation */}
// // // //                             {isAdmin && (
// // // //                               <td className={TD}>
// // // //                                 {isEditable && (isAdmin || !isPS) ? (
// // // //                                   <input type="text" value={item.recommendation ?? ''}
// // // //                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// // // //                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// // // //                                     disabled={savingRecommendations.has(item.expense_item_id)}
// // // //                                     placeholder="Add note…" maxLength={255} className={recCls} />
// // // //                                 ) : (
// // // //                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// // // //                                 )}
// // // //                               </td>
// // // //                             )}
// // // //                             {/* <td className={TD}>
// // // //                               {isEditable && (isAdmin || !isPS) ? (
// // // //                                 <input type="text" value={item.recommendation ?? ''}
// // // //                                   onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// // // //                                   onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// // // //                                   disabled={savingRecommendations.has(item.expense_item_id)}
// // // //                                   placeholder="Add note…" maxLength={255} className={recCls} />
// // // //                               ) : (
// // // //                                 <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// // // //                               )}
// // // //                             </td> */}
// // // //                           </tr>
// // // //                         );
// // // //                       })}

// // // //                       {/* Classification subtotal */}
// // // //                       <tr className="border-t border-gray-200">
// // // //                         <td className="bg-gray-100" />
// // // //                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
// // // //                        {/* obligation subtotal — blank (obligation is a past-year actual display only) */}
// // // //                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
// // // //                         {/* blue subtotals */}
// // // //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
// // // //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
// // // //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
// // // //                         {/* orange subtotal */}
// // // //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
// // // //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
// // // //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
// // // //                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
// // // //                         </td>
// // // //                         {/* <td className="bg-gray-100" /> */}
// // // //                         {isAdmin && <td className="bg-gray-100" />}
// // // //                       </tr>

// // // //                       {/* {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// // // //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // // //                     </>
// // // //                   )}
// // // //                 </React.Fragment>
// // // //               );
// // // //             })}

// // // //             {/* ── Special Programs (AIP) ── */}
// // // //             {aipItems.length > 0 && (
// // // //               <React.Fragment>
// // // //                 <tr className="bg-gray-50 border-y border-gray-200">
// // // //                   {/* <td colSpan={8} className="px-4 py-2"> */}
// // // //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // // //                     <div className="flex items-center gap-2">
// // // //                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
// // // //                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
// // // //                     </div>
// // // //                   </td>
// // // //                   <td className="bg-gray-50" />
// // // //                 </tr>

// // // //                 {aipItems.map(item => {
// // // //                   const delay = Math.min(gIdx * 18, 280);
// // // //                   gIdx++;
// // // //                   return (
// // // //                     <tr key={item.dept_bp_form4_item_id}
// // // //                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
// // // //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// // // //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
// // // //                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
// // // //                       {/* obligation — blank for AIP rows (AIP uses form4 items) */}
// // // //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// // // //                       {/* blue — blank for AIP rows */}
// // // //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// // // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // // //                       {/* orange — amount */}
// // // //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
// // // //                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
// // // //                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
// // // //                       {isAdmin && (
// // // //                         <td className={TD}>
// // // //                           {isEditable ? (
// // // //                             <input type="text" value={(item as any).recommendation ?? ''}
// // // //                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// // // //                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// // // //                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// // // //                               placeholder="Add note…" maxLength={255} className={recCls} />
// // // //                           ) : (
// // // //                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// // // //                           )}
// // // //                         </td>
// // // //                       )}
// // // //                       {/* <td className={TD}>
// // // //                         {isEditable ? (
// // // //                           <input type="text" value={(item as any).recommendation ?? ''}
// // // //                             onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// // // //                             onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// // // //                             disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// // // //                             placeholder="Add note…" maxLength={255} className={recCls} />
// // // //                         ) : (
// // // //                           <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// // // //                         )}
// // // //                       </td> */}
// // // //                     </tr>
// // // //                   );
// // // //                 })}

// // // //                 <tr className="border-t border-gray-200">
// // // //                   <td className="bg-gray-100" />
// // // //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
// // // //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// // // //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// // // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // // //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
// // // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
// // // //                   {/* <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// // // //                   <td className="bg-gray-100" /> */}
// // // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// // // //                   {isAdmin && <td className="bg-gray-100" />}
// // // //                 </tr>

// // // //                 {/* {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// // // //                 {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // // //               </React.Fragment>
// // // //             )}

// // // //             {/* ── 5% Calamity Fund ── */}
// // // //             {isSpecialAccount && (
// // // //               <React.Fragment>
// // // //                 <tr className="bg-gray-50 border-y border-gray-200">
// // // //                   {/* <td colSpan={8} className="px-4 py-2"> */}
// // // //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // // //                     <div className="flex items-center gap-2">
// // // //                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
// // // //                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
// // // //                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
// // // //                       </span>
// // // //                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
// // // //                     </div>
// // // //                   </td>
// // // //                   <td className="bg-gray-50" />
// // // //                 </tr>

// // // //                 {[
// // // //                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
// // // //                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
// // // //                 ].map(row => {
// // // //                   const delay = Math.min(gIdx * 18, 280);
// // // //                   gIdx++;
// // // //                   return (
// // // //                     <tr key={row.code}
// // // //                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
// // // //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// // // //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
// // // //                       <td className={cn(TD, 'text-gray-800')}>
// // // //                         {row.label}
// // // //                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
// // // //                       </td>
// // // //                       {/* obligation — blank for calamity rows */}
// // // //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// // // //                       {/* blue — blank */}
// // // //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// // // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // // //                       {/* orange — derived value */}
// // // //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
// // // //                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
// // // //                       </td>
// // // //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
// // // //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
// // // //                       <td />
// // // //                     </tr>
// // // //                   );
// // // //                 })}

// // // //                 <tr className="border-t border-gray-200">
// // // //                   <td className="bg-gray-100" />
// // // //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
// // // //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// // // //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// // // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // // //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
// // // //                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
// // // //                   </td>
// // // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
// // // //                   {/* <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// // // //                   <td className="bg-gray-100" /> */}
// // // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// // // //                   {isAdmin && <td className="bg-gray-100" />}
// // // //                 </tr>

// // // //                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
// // // //                   <tr>
// // // //                     {/* <td colSpan={9} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100"> */}
// // // //                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
// // // //                       Base:{' '}
// // // //                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
// // // //                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
// // // //                     </td>
// // // //                   </tr>
// // // //                 )}
// // // //               </React.Fragment>
// // // //             )}
// // // //           </tbody>

// // // //           {/* ── Grand Total ── */}
// // // //           <tfoot>
// // // //             {hasRows && (
// // // //               <tr className="bg-gray-900 text-white">
// // // //                 <td className="px-3 py-3" />
// // // //                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
// // // //                   Grand Total
// // // //                   {isSpecialAccount && calamityTotal > 0 && (
// // // //                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
// // // //                   )}
// // // //                 </td>
// // // //                 {/* Obligation — blank in grand total */}
// // // //                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
// // // //                 {/* Appropriation — blue tint */}
// // // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
// // // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
// // // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
// // // //                 {/* Proposed — orange tint */}
// // // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
// // // //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// // // //                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
// // // //                 </td>
// // // //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// // // //                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
// // // //                 </td>
// // // //                 {/* <td className="border-l border-gray-700" /> */}
// // // //                 {isAdmin && <td className="border-l border-gray-700" />}
// // // //               </tr>
// // // //             )}
// // // //           </tfoot>
// // // //         </table>
// // // //       </div>

// // // //       {modalState && (
// // // //         <AddItemModal
// // // //           isOpen={modalState.isOpen}
// // // //           onClose={() => setModalState(null)}
// // // //           classificationId={modalState.classificationId}
// // // //           classificationName={modalState.classificationName}
// // // //           planId={plan.dept_budget_plan_id}
// // // //           expenseItems={expenseItems}
// // // //           existingItemIds={items.map(i => i.expense_item_id)}
// // // //           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
// // // //         />
// // // //       )}

// // // //       {/* Past-year add item modal — admin adds items to the past year plan */}
// // // //       {pastModalState && obligationYearPlan && (
// // // //         <AddItemModal
// // // //           isOpen={pastModalState.isOpen}
// // // //           onClose={() => setPastModalState(null)}
// // // //           classificationId={pastModalState.classificationId}
// // // //           classificationName={pastModalState.classificationName}
// // // //           planId={obligationYearPlan.dept_budget_plan_id}
// // // //           expenseItems={expenseItems}
// // // //           existingItemIds={obligationYearPlan.items.map((i: any) => i.expense_item_id)}
// // // //           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added. Current/proposed plans updated.'); }}
// // // //         />
// // // //       )}
// // // //     </div>
// // // //   );
// // // // };

// // // // export default Form2;
// // // import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// // // import API from '../../services/api';
// // // import {
// // //   DepartmentBudgetPlan,
// // //   ExpenseClassification,
// // //   ExpenseItem,
// // //   DepartmentBudgetPlanItem,
// // //   DepartmentBudgetPlanForm4Item,
// // // } from '../../types/api';
// // // import AddItemModal from './AddItemModal';
// // // import { Button } from '@/src/components/ui/button';
// // // import { toast } from 'sonner';
// // // import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// // // import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// // // import { cn } from '@/src/lib/utils';
// // // import { useCalamityFund } from '../../hooks/useCalamityFund';


// // // // ─── Column color tokens ──────────────────────────────────────────────────────
// // // // Appropriation (past year) → blue
// // // // Proposed (budget year)    → orange

// // // const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// // // const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// // // const C_APP_SUB = 'bg-blue-50   border-blue-200';
// // // const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// // // const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// // // const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// // // const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// // // const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // // // ─── Animation keyframes ──────────────────────────────────────────────────────

// // // const ANIM_CSS = `
// // // @keyframes _rowIn {
// // //   from { opacity: 0; transform: translateY(6px); }
// // //   to   { opacity: 1; transform: translateY(0); }
// // // }
// // // @media (prefers-reduced-motion: reduce) {
// // //   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// // // }
// // // `;
// // // let _animInjected = false;
// // // function ensureAnim() {
// // //   if (_animInjected || typeof document === 'undefined') return;
// // //   const el = document.createElement('style');
// // //   el.textContent = ANIM_CSS;
// // //   document.head.appendChild(el);
// // //   _animInjected = true;
// // // }

// // // // ─── Dept → income-fund source key ───────────────────────────────────────────

// // // const getSourceForDepartment = (dept?: {
// // //   dept_abbreviation?: string; dept_name?: string;
// // // }): string | undefined => {
// // //   if (!dept) return undefined;
// // //   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
// // //   const name = dept.dept_name?.toLowerCase() ?? '';
// // //   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
// // //   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
// // //   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
// // //   return undefined;
// // // };

// // // const PS_CLASS_ID = 1;

// // // // ─── Types ────────────────────────────────────────────────────────────────────

// // // interface Form2Props {
// // //   plan: DepartmentBudgetPlan;
// // //   pastYearPlan: DepartmentBudgetPlan | null;
// // //   obligationYearPlan: DepartmentBudgetPlan | null;
// // //   classifications: ExpenseClassification[];
// // //   expenseItems: ExpenseItem[];
// // //   isEditable: boolean;
// // //   isAdmin?: boolean;
// // //   onItemUpdate: () => void;
// // // }

// // // interface ItemWithMeta extends DepartmentBudgetPlanItem {
// // //   pastTotal: number; pastSem1: number; pastSem2: number;
// // //   pastObligation: number;
// // //   pastObligationItemId?: number;
// // //   pastItemId?: number; expense_item?: ExpenseItem;
// // //   recommendation?: string | null;
// // // }

// // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// // // const fmtP  = (n: number) => `₱${fmt(n)}`;
// // // const incr  = (past: number, prop: number) => prop - past;
// // // const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// // // const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// // // const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // // // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// // // const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // // // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// // // const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// // // const TD      = 'px-3 py-2.5 text-[12px]';
// // // const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // // // ── Appropriation (blue) ───────────────────────────────────────────────────────
// // // const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// // // const TD_APP  = `${TD_M} bg-blue-50/30`;

// // // // ── Proposed (orange) ─────────────────────────────────────────────────────────
// // // const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// // // const TD_PRO  = `${TD_M} bg-orange-50/30`;

// // // const inputCls =
// // //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // //   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// // // const inputAppCls =
// // //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // //   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// // // const recCls =
// // //   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // //   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // // // ─── Sub-header ───────────────────────────────────────────────────────────────

// // // const SubHeader: React.FC<{
// // //   prevYear: number | string | undefined;
// // //   currYear: number | string | undefined;
// // //   isAdmin?: boolean;
// // // }> = ({ prevYear, currYear, isAdmin }) => (
// // //   <>
// // //     <tr>
// // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// // //       {isAdmin && (
// // //         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
// // //           Past Year ({Number(prevYear) - 1})
// // //         </th>
// // //       )}
// // //       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// // //         Appropriation ({prevYear})
// // //       </th>
// // //       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// // //       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
// // //     </tr>
// // //     <tr>
// // //       <th className={TH_APP}>Sem 1</th>
// // //       <th className={TH_APP}>Sem 2</th>
// // //       <th className={TH_APP}>Total</th>
// // //     </tr>
// // //   </>
// // // );

// // // // ─── Component ────────────────────────────────────────────────────────────────

// // // const Form2: React.FC<Form2Props> = ({
// // //   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// // // }) => {
// // //   useEffect(() => { ensureAnim(); }, []);

// // //   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
// // //   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

// // //   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
// // //   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
// // //   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
// // //   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

// // //   const savedValues             = useRef<Map<number, number>>(new Map());
// // //   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
// // //   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

// // //   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
// // //   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
// // //   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
// // //   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
// // //   const [modalState,        setModalState]        = useState<{
// // //     isOpen: boolean; classificationId: number; classificationName: string;
// // //   } | null>(null);
// // //   const [pastModalState, setPastModalState] = useState<{
// // //     isOpen: boolean; classificationId: number; classificationName: string;
// // //   } | null>(null);

// // //   const savedObligations = useRef<Map<number, number>>(new Map());

// // //   const incomeSource = getSourceForDepartment(plan.department);
// // //   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
// // //     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

// // //   const expenseItemMap = useMemo(
// // //     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
// // //     [expenseItems]
// // //   );

// // //   useEffect(() => {
// // //     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// // //       .then(res => {
// // //         const raw = res.data.data || [];
// // //         setAipItems(raw.map((item: any) => ({
// // //           ...item,
// // //           ps_amount:    parseFloat(item.ps_amount)    || 0,
// // //           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
// // //           co_amount:    parseFloat(item.co_amount)    || 0,
// // //           total_amount: parseFloat(item.total_amount) || 0,
// // //           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
// // //           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
// // //           recommendation: item.recommendation ?? null,
// // //         })));
// // //         raw.forEach((item: any) =>
// // //           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
// // //         );
// // //       })
// // //       .catch(console.error);
// // //   }, [plan.dept_budget_plan_id]);

// // //   useEffect(() => {
// // //     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
// // //     pastYearPlan?.items.forEach(item => {
// // //       pastData.set(item.expense_item_id, {
// // //         total:  Number(item.total_amount) || 0,
// // //         sem1:   Number((item as any).sem1_amount) || 0,
// // //         sem2:   Number((item as any).sem2_amount) || 0,
// // //         itemId: item.dept_bp_form2_item_id,
// // //       });
// // //     });

// // //     // Obligation data comes from the year BEFORE pastYearPlan (obligationYearPlan)
// // //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// // //     obligationYearPlan?.items.forEach(item => {
// // //       obligationData.set(item.expense_item_id, {
// // //         amount: Number((item as any).obligation_amount) || 0,
// // //         itemId: item.dept_bp_form2_item_id,
// // //       });
// // //     });
// // //     const merged: ItemWithMeta[] = plan.items.map(planItem => {
// // //       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0, obligation: 0 };
// // //       return {
// // //         ...planItem,
// // //         expense_item:        expenseItemMap.get(planItem.expense_item_id),
// // //         pastTotal:           past.total,
// // //         pastSem1:            past.sem1,
// // //         pastSem2:            past.sem2,
// // //         pastObligation:      obligationData.get(planItem.expense_item_id)?.amount ?? 0,
// // //         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
// // //         pastItemId:          past.itemId || undefined,
// // //         recommendation:      (planItem as any).recommendation ?? null,
// // //       };
// // //     });
// // //     setItems(merged);
// // //     // Reset draft edits when base data changes (e.g. after refetch)
// // //     setPastSem1Edits(new Map());
// // //     setObligationEdits(new Map());
// // //     merged.forEach(item => {
// // //       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
// // //       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
// // //       savedObligations.current.set(item.expense_item_id, item.pastObligation);
// // //     });
// // //   }, [plan, pastYearPlan, obligationYearPlan, expenseItemMap]);

// // //   const handleProposedChange = useCallback((id: number, value: number) =>
// // //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

// // //   const handleBlur = useCallback(async (expenseItemId: number) => {
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item) return;
// // //     const cur = Number(item.total_amount);
// // //     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
// // //     setSavingItems(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       const payload = { total_amount: cur };
// // //       const res = item.dept_bp_form2_item_id === 0
// // //         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
// // //         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
// // //       savedValues.current.set(expenseItemId, cur);
// // //       // Update local state immediately so value shows without reload
// // //       const saved = res.data.data;
// // //       if (saved) {
// // //         setItems(prev => prev.map(i =>
// // //           i.expense_item_id === expenseItemId
// // //             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
// // //             : i
// // //         ));
// // //       }
// // //       onItemUpdate();
// // //       return res.data;
// // //     })();
// // //     toast.promise(promise, {
// // //       loading: 'Saving…',
// // //       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
// // //       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
// // //     });
// // //     try { await promise; } catch {}
// // //     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

// // //   const handlePastSem1Change = (id: number, value: number) =>
// // //     setPastSem1Edits(prev => new Map(prev).set(id, value));

// // //   const handlePastSem1Blur = async (expenseItemId: number) => {
// // //     const edit = pastSem1Edits.get(expenseItemId);
// // //     if (edit === undefined) return;
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item) return;
// // //     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
// // //     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
// // //     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
// // //     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
// // //     if (!targetId || !planId) return;
// // //     const clamped = Math.min(Math.max(edit, 0), cap);
// // //     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
// // //     if (clamped === item.pastSem1) {
// // //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //       return;
// // //     }
// // //     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
// // //       // Update local state immediately — don't wait for full reload
// // //       setItems(prev => prev.map(i =>
// // //         i.expense_item_id === expenseItemId
// // //           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
// // //       ));
// // //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
// // //     try { await promise; } catch {}
// // //     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   };

// // //   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
// // //     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
// // //     if (!item) return;
// // //     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
// // //     if (!confirm('Remove this item?')) return;
// // //     try {
// // //       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
// // //       toast.success('Item deleted'); onItemUpdate();
// // //     } catch { toast.error('Failed to delete item.'); }
// // //   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

// // //   const handleRecommendationChange = useCallback((id: number, value: string) =>
// // //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

// // //   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item || item.dept_bp_form2_item_id === 0) return;
// // //     const cur = item.recommendation ?? null;
// // //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// // //     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
// // //     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
// // //       savedRecommendations.current.set(expenseItemId, cur);
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// // //     try { await promise; } catch {}
// // //     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

// // //   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
// // //     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

// // //   const handleAipRecommendationBlur = useCallback(async (id: number) => {
// // //     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
// // //     if (!item) return;
// // //     const cur = (item as any).recommendation ?? null;
// // //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// // //     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
// // //     setSavingAipRecommendations(prev => new Set(prev).add(id));
// // //     const promise = (async () => {
// // //       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
// // //       savedAipRecommendations.current.set(id, cur);
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// // //     try { await promise; } catch {}
// // //     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
// // //   }, [aipItems, savingAipRecommendations]);

// // //   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

// // //   const handleObligationChange = (expenseItemId: number, value: number) =>
// // //     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

// // //   const handleObligationBlur = async (expenseItemId: number) => {
// // //     const edit = obligationEdits.get(expenseItemId);
// // //     if (edit === undefined) return;
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item) return;
// // //     const clamped = Math.max(edit, 0);
// // //     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
// // //     if (clamped === savedObligations.current.get(expenseItemId)) {
// // //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //       return;
// // //     }
// // //     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// // //     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
// // //     setSavingObligations(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       if (item.pastObligationItemId) {
// // //         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
// // //       } else {
// // //         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
// // //           expense_item_id: expenseItemId,
// // //           obligation_amount: clamped,
// // //         });
// // //         const newItemId = res.data.data?.dept_bp_form2_item_id;
// // //         setItems(prev => prev.map(i =>
// // //           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
// // //         ));
// // //         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
// // //         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
// // //           expense_item_id: expenseItemId,
// // //         }).catch(() => {}); // ignore 422 duplicate
// // //         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
// // //           expense_item_id: expenseItemId,
// // //         }).catch(() => {}); // ignore 422 duplicate
// // //       }
// // //       savedObligations.current.set(expenseItemId, clamped);
// // //       // Update local state immediately so amount shows without reload
// // //       setItems(prev => prev.map(i =>
// // //         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
// // //       ));
// // //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //       onItemUpdate();
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
// // //     try { await promise; } catch {}
// // //     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   };

// // //   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
// // //     const key = `${id}_${field}`;
// // //     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
// // //   };

// // //   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
// // //     const digits = rawValue.replace(/[^0-9]/g, '');
// // //     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
// // //     const num = digits === '' ? 0 : parseInt(digits, 10);
// // //     if (field === 'proposed') handleProposedChange(id, num);
// // //     else if (field === 'sem1') handlePastSem1Change(id, num);
// // //     else handleObligationChange(id, num);
// // //   };

// // //   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
// // //     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
// // //     if (field === 'proposed') handleBlur(id);
// // //     else if (field === 'sem1') handlePastSem1Blur(id);
// // //     else handleObligationBlur(id);
// // //   };

// // //   const itemsByClassification = useMemo(() =>
// // //     classifications
// // //       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
// // //       .map(c => ({
// // //         ...c,
// // //         items: items
// // //           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// // //           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// // //       })), [classifications, items]);

// // //   // Grand totals: account for in-flight pastSem1Edits so subtotals calculate live
// // //   const grandTotals = useMemo(() => {
// // //     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
// // //     for (const i of items) {
// // //       const sem1 = pastSem1Edits.has(i.expense_item_id)
// // //         ? pastSem1Edits.get(i.expense_item_id)!
// // //         : i.pastSem1;
// // //       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
// // //       const sem2 = pastSem1Edits.has(i.expense_item_id)
// // //         ? Math.max(cap - sem1, 0)
// // //         : i.pastSem2;
// // //       pastSem1  += sem1;
// // //       pastSem2  += sem2;
// // //       pastTotal += i.pastTotal;
// // //       proposed  += Number(i.total_amount);
// // //     }
// // //     return { pastSem1, pastSem2, pastTotal, proposed };
// // //   }, [items, pastSem1Edits]);

// // //   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
// // //   const calamityTotal = calamityData?.calamity_fund ?? 0;

// // //   const grandFinal = useMemo(() => ({
// // //     pastSem1:  grandTotals.pastSem1,
// // //     pastSem2:  grandTotals.pastSem2,
// // //     pastTotal: grandTotals.pastTotal,
// // //     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
// // //   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

// // //   const prevYear = Number(plan.budget_plan?.year) - 1;
// // //   const currYear = plan.budget_plan?.year;
// // //   const hasRows  = items.length > 0 || aipItems.length > 0;

// // //   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
// // //   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

// // //   const hasAipSection      = aipItems.length > 0;
// // //   const hasCalamitySection = isSpecialAccount;

// // //   let gIdx = 0;

// // //   return (
// // //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// // //       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
// // //         <div>
// // //           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
// // //           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
// // //             Programmed Appropriation and Obligation by Object of Expenditures
// // //           </h3>
// // //         </div>
// // //       </div>

// // //       <div className="overflow-x-auto">
// // //         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

// // //           <colgroup>
// // //             {COL_WIDTHS.map((w, i) => {
// // //               if ((i === 2 || i === 9) && !isAdmin) return null;
// // //               return <col key={i} style={{ width: w }} />;
// // //             })}
// // //           </colgroup>

// // //           {/* ── Main thead ──────────────────────────────────────────────── */}
// // //           <thead className="sticky top-0 z-10">
// // //             <tr>
// // //               <th className={TH} rowSpan={2}>Acct Code</th>
// // //               <th className={TH} rowSpan={2}>Object of Expenditure</th>

// // //               {isAdmin && (
// // //                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
// // //                   Past Year ({Number(plan.budget_plan?.year) - 2})
// // //                 </th>
// // //               )}

// // //               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
// // //                 Appropriation ({prevYear})
// // //               </th>

// // //               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

// // //               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
// // //               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
// // //               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
// // //             </tr>
// // //             <tr>
// // //               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
// // //               <th className={TH_APP}>Sem 2</th>
// // //               <th className={TH_APP}>Total</th>
// // //             </tr>
// // //           </thead>

// // //           <tbody>
// // //             {itemsByClassification.map((cls, clsIndex) => {
// // //               const isPS = cls.expense_class_id === PS_CLASS_ID;
// // //               const canEdit     = isEditable && (!isPS || isAdmin);
// // //               const canEditSem1 = isEditable && (isAdmin || !isPS);

// // //               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
// // //                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

// // //               // Subtotals: use live pastSem1Edits for past year columns
// // //               const clsSem1 = cls.items.reduce((s, i) => {
// // //                 const sem1 = pastSem1Edits.has(i.expense_item_id)
// // //                   ? pastSem1Edits.get(i.expense_item_id)!
// // //                   : i.pastSem1;
// // //                 return s + sem1;
// // //               }, 0);
// // //               const clsSem2 = cls.items.reduce((s, i) => {
// // //                 if (pastSem1Edits.has(i.expense_item_id)) {
// // //                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
// // //                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
// // //                   return s + Math.max(cap - sem1, 0);
// // //                 }
// // //                 return s + i.pastSem2;
// // //               }, 0);
// // //               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
// // //               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
// // //               const clsDiff = clsProp - clsPast;
// // //               const clsPct  = pctOf(clsPast, clsDiff);

// // //               const isLastCls       = clsIndex === itemsByClassification.length - 1;
// // //               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
// // //               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

// // //               return (
// // //                 <React.Fragment key={cls.expense_class_id}>

// // //                   {/* Section divider */}
// // //                   <tr className="bg-gray-50 border-y border-gray-200">
// // //                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // //                       <div className="flex items-center justify-between">
// // //                         <div className="flex items-center gap-2">
// // //                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
// // //                           {isPS && (
// // //                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
// // //                               Auto-filled from Personnel Services
// // //                             </span>
// // //                           )}
// // //                         </div>
// // //                         <div className="flex items-center gap-1.5">
// // //                           {/* Admin: Add item to past year (pastYearPlan) */}
// // //                           {isAdmin && (
// // //                             <Tooltip>
// // //                               <TooltipTrigger asChild>
// // //                                 <Button size="sm" variant="outline"
// // //                                   className="gap-1.5 text-xs h-7 border-blue-200 text-blue-600 hover:text-blue-900 bg-blue-50"
// // //                                   onClick={() => setPastModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// // //                                   <PlusIcon className="w-3.5 h-3.5" /> Past Year Item
// // //                                 </Button>
// // //                               </TooltipTrigger>
// // //                               <TooltipContent side="left" className="text-xs">Add item to past year ({prevYear})</TooltipContent>
// // //                             </Tooltip>
// // //                           )}
// // //                           {canEdit && (
// // //                             <Tooltip>
// // //                               <TooltipTrigger asChild>
// // //                                 <Button size="sm" variant="outline"
// // //                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
// // //                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// // //                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
// // //                                 </Button>
// // //                               </TooltipTrigger>
// // //                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
// // //                             </Tooltip>
// // //                           )}
// // //                         </div>
// // //                       </div>
// // //                     </td>
// // //                   </tr>

// // //                   {cls.items.length === 0 ? (
// // //                     <>
// // //                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
// // //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // //                     </>
// // //                   ) : (
// // //                     <>
// // //                       {cls.items.map(item => {
// // //                         const delay    = Math.min(gIdx * 18, 280);
// // //                         gIdx++;
// // //                         const past     = item.pastTotal;
// // //                         const proposed = Number(item.total_amount);
// // //                         const d        = incr(past, proposed);
// // //                         const p        = pctOf(past, d);
// // //                         const isSaving = savingItems.has(item.expense_item_id);

// // //                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
// // //                           ? pastSem1Edits.get(item.expense_item_id)!
// // //                           : item.pastSem1;
// // //                         const sem2Cap  = past > 0 ? past : proposed;
// // //                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
// // //                           ? sem2Cap - dispSem1
// // //                           : item.pastSem2;

// // //                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

// // //                         return (
// // //                           <tr
// // //                             key={item.expense_item_id}
// // //                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
// // //                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
// // //                           >
// // //                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
// // //                             <td className={cn(TD, 'text-gray-800 font-medium')}>
// // //                               <div className="flex items-center justify-between gap-1">
// // //                                 <span>{item.expense_item?.expense_class_item_name}</span>
// // //                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
// // //                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
// // //                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
// // //                                     <TrashIcon className="w-3.5 h-3.5" />
// // //                                   </button>
// // //                                 )}
// // //                               </div>
// // //                             </td>

// // //                             {/* ── Obligation — blue, admin only ─────────── */}
// // //                             {isAdmin && (
// // //                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
// // //                                 <input type="text" inputMode="numeric"
// // //                                   value={getDraftValue(item.expense_item_id, 'obligation',
// // //                                     obligationEdits.has(item.expense_item_id)
// // //                                       ? obligationEdits.get(item.expense_item_id)!
// // //                                       : item.pastObligation)}
// // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
// // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
// // //                                   disabled={savingObligations.has(item.expense_item_id)}
// // //                                   className={inputAppCls}
// // //                                 />
// // //                               </td>
// // //                             )}

// // //                             {/* ── Sem 1 — blue ────────────────────────────── */}
// // //                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
// // //                               {sem1Editable ? (
// // //                                 <input type="text" inputMode="numeric"
// // //                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
// // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
// // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
// // //                                   disabled={savingPastItems.has(item.expense_item_id)}
// // //                                   className={inputAppCls}
// // //                                 />
// // //                               ) : (
// // //                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
// // //                               )}
// // //                             </td>

// // //                             {/* ── Sem 2 — blue ────────────────────────────── */}
// // //                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

// // //                             {/* ── Past Total — blue ────────────────────────── */}
// // //                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

// // //                             {/* ── Proposed — orange ────────────────────────── */}
// // //                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
// // //                               {canEdit ? (
// // //                                 <input type="text" inputMode="numeric"
// // //                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
// // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
// // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
// // //                                   disabled={isSaving} className={inputCls} />
// // //                               ) : (
// // //                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
// // //                                   {proposed === 0 ? '–' : fmtP(proposed)}
// // //                                 </span>
// // //                               )}
// // //                             </td>

// // //                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
// // //                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

// // //                             {/* Recommendation */}
// // //                             {isAdmin && (
// // //                               <td className={TD}>
// // //                                 {isEditable && (isAdmin || !isPS) ? (
// // //                                   <input type="text" value={item.recommendation ?? ''}
// // //                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// // //                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// // //                                     disabled={savingRecommendations.has(item.expense_item_id)}
// // //                                     placeholder="Add note…" maxLength={255} className={recCls} />
// // //                                 ) : (
// // //                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// // //                                 )}
// // //                               </td>
// // //                             )}
// // //                           </tr>
// // //                         );
// // //                       })}

// // //                       {/* Classification subtotal */}
// // //                       <tr className="border-t border-gray-200">
// // //                         <td className="bg-gray-100" />
// // //                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
// // //                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
// // //                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
// // //                         </td>
// // //                         {isAdmin && <td className="bg-gray-100" />}
// // //                       </tr>

// // //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // //                     </>
// // //                   )}
// // //                 </React.Fragment>
// // //               );
// // //             })}

// // //             {/* ── Special Programs (AIP) ── */}
// // //             {aipItems.length > 0 && (
// // //               <React.Fragment>
// // //                 <tr className="bg-gray-50 border-y border-gray-200">
// // //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // //                     <div className="flex items-center gap-2">
// // //                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
// // //                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
// // //                     </div>
// // //                   </td>
// // //                   <td className="bg-gray-50" />
// // //                 </tr>

// // //                 {aipItems.map(item => {
// // //                   const delay = Math.min(gIdx * 18, 280);
// // //                   gIdx++;
// // //                   return (
// // //                     <tr key={item.dept_bp_form4_item_id}
// // //                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
// // //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// // //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
// // //                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
// // //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// // //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
// // //                       {isAdmin && (
// // //                         <td className={TD}>
// // //                           {isEditable ? (
// // //                             <input type="text" value={(item as any).recommendation ?? ''}
// // //                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// // //                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// // //                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// // //                               placeholder="Add note…" maxLength={255} className={recCls} />
// // //                           ) : (
// // //                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// // //                           )}
// // //                         </td>
// // //                       )}
// // //                     </tr>
// // //                   );
// // //                 })}

// // //                 <tr className="border-t border-gray-200">
// // //                   <td className="bg-gray-100" />
// // //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
// // //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// // //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// // //                   {isAdmin && <td className="bg-gray-100" />}
// // //                 </tr>

// // //                 {<SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // //               </React.Fragment>
// // //             )}

// // //             {/* ── 5% Calamity Fund ── */}
// // //             {isSpecialAccount && (
// // //               <React.Fragment>
// // //                 <tr className="bg-gray-50 border-y border-gray-200">
// // //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // //                     <div className="flex items-center gap-2">
// // //                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
// // //                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
// // //                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
// // //                       </span>
// // //                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
// // //                     </div>
// // //                   </td>
// // //                   <td className="bg-gray-50" />
// // //                 </tr>

// // //                 {[
// // //                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
// // //                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
// // //                 ].map(row => {
// // //                   const delay = Math.min(gIdx * 18, 280);
// // //                   gIdx++;
// // //                   return (
// // //                     <tr key={row.code}
// // //                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
// // //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// // //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
// // //                       <td className={cn(TD, 'text-gray-800')}>
// // //                         {row.label}
// // //                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
// // //                       </td>
// // //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// // //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
// // //                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
// // //                       </td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
// // //                       <td />
// // //                     </tr>
// // //                   );
// // //                 })}

// // //                 <tr className="border-t border-gray-200">
// // //                   <td className="bg-gray-100" />
// // //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
// // //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// // //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
// // //                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
// // //                   </td>
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// // //                   {isAdmin && <td className="bg-gray-100" />}
// // //                 </tr>

// // //                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
// // //                   <tr>
// // //                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
// // //                       Base:{' '}
// // //                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
// // //                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
// // //                     </td>
// // //                   </tr>
// // //                 )}
// // //               </React.Fragment>
// // //             )}
// // //           </tbody>

// // //           {/* ── Grand Total ── */}
// // //           <tfoot>
// // //             {hasRows && (
// // //               <tr className="bg-gray-900 text-white">
// // //                 <td className="px-3 py-3" />
// // //                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
// // //                   Grand Total
// // //                   {isSpecialAccount && calamityTotal > 0 && (
// // //                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
// // //                   )}
// // //                 </td>
// // //                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// // //                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
// // //                 </td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// // //                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
// // //                 </td>
// // //                 {isAdmin && <td className="border-l border-gray-700" />}
// // //               </tr>
// // //             )}
// // //           </tfoot>
// // //         </table>
// // //       </div>

// // //       {modalState && (
// // //         <AddItemModal
// // //           isOpen={modalState.isOpen}
// // //           onClose={() => setModalState(null)}
// // //           classificationId={modalState.classificationId}
// // //           classificationName={modalState.classificationName}
// // //           planId={plan.dept_budget_plan_id}
// // //           expenseItems={expenseItems}
// // //           existingItemIds={items.map(i => i.expense_item_id)}
// // //           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
// // //         />
// // //       )}

// // //       {/* Past-year add item modal — admin adds items to the PAST year plan (prevYear appropriation) */}
// // //       {pastModalState && pastYearPlan && (
// // //         <AddItemModal
// // //           isOpen={pastModalState.isOpen}
// // //           onClose={() => setPastModalState(null)}
// // //           classificationId={pastModalState.classificationId}
// // //           classificationName={pastModalState.classificationName}
// // //           planId={pastYearPlan.dept_budget_plan_id}
// // //           expenseItems={expenseItems}
// // //           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
// // //           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
// // //         />
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // export default Form2;

// // import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// // import API from '../../services/api';
// // import {
// //   DepartmentBudgetPlan,
// //   ExpenseClassification,
// //   ExpenseItem,
// //   DepartmentBudgetPlanItem,
// //   DepartmentBudgetPlanForm4Item,
// // } from '../../types/api';
// // import AddItemModal from './AddItemModal';
// // import { Button } from '@/src/components/ui/button';
// // import { toast } from 'sonner';
// // import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// // import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// // import { cn } from '@/src/lib/utils';
// // import { useCalamityFund } from '../../hooks/useCalamityFund';


// // // ─── Column color tokens ──────────────────────────────────────────────────────
// // // Appropriation (past year) → blue
// // // Proposed (budget year)    → orange

// // const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// // const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// // const C_APP_SUB = 'bg-blue-50   border-blue-200';
// // const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// // const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// // const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// // const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// // const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // // ─── Animation keyframes ──────────────────────────────────────────────────────

// // const ANIM_CSS = `
// // @keyframes _rowIn {
// //   from { opacity: 0; transform: translateY(6px); }
// //   to   { opacity: 1; transform: translateY(0); }
// // }
// // @media (prefers-reduced-motion: reduce) {
// //   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// // }
// // `;
// // let _animInjected = false;
// // function ensureAnim() {
// //   if (_animInjected || typeof document === 'undefined') return;
// //   const el = document.createElement('style');
// //   el.textContent = ANIM_CSS;
// //   document.head.appendChild(el);
// //   _animInjected = true;
// // }

// // // ─── Dept → income-fund source key ───────────────────────────────────────────

// // const getSourceForDepartment = (dept?: {
// //   dept_abbreviation?: string; dept_name?: string;
// // }): string | undefined => {
// //   if (!dept) return undefined;
// //   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
// //   const name = dept.dept_name?.toLowerCase() ?? '';
// //   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
// //   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
// //   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
// //   return undefined;
// // };

// // const PS_CLASS_ID = 1;

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface Form2Props {
// //   plan: DepartmentBudgetPlan;
// //   pastYearPlan: DepartmentBudgetPlan | null;
// //   obligationYearPlan: DepartmentBudgetPlan | null;
// //   classifications: ExpenseClassification[];
// //   expenseItems: ExpenseItem[];
// //   isEditable: boolean;
// //   isAdmin?: boolean;
// //   onItemUpdate: () => void;
// // }

// // interface ItemWithMeta extends DepartmentBudgetPlanItem {
// //   pastTotal: number; pastSem1: number; pastSem2: number;
// //   pastObligation: number;
// //   pastObligationItemId?: number;
// //   pastItemId?: number; expense_item?: ExpenseItem;
// //   recommendation?: string | null;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// // const fmtP  = (n: number) => `₱${fmt(n)}`;
// // const incr  = (past: number, prop: number) => prop - past;
// // const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// // const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// // const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// // const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// // const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// // const TD      = 'px-3 py-2.5 text-[12px]';
// // const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // // ── Appropriation (blue) ───────────────────────────────────────────────────────
// // const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// // const TD_APP  = `${TD_M} bg-blue-50/30`;

// // // ── Proposed (orange) ─────────────────────────────────────────────────────────
// // const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// // const TD_PRO  = `${TD_M} bg-orange-50/30`;

// // const inputCls =
// //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// // const inputAppCls =
// //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// // const recCls =
// //   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // // ─── Sub-header ───────────────────────────────────────────────────────────────

// // const SubHeader: React.FC<{
// //   prevYear: number | string | undefined;
// //   currYear: number | string | undefined;
// //   isAdmin?: boolean;
// // }> = ({ prevYear, currYear, isAdmin }) => (
// //   <>
// //     <tr>
// //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// //       {isAdmin && (
// //         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
// //           Past Year ({Number(prevYear) - 1})
// //         </th>
// //       )}
// //       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// //         Appropriation ({prevYear})
// //       </th>
// //       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// //       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
// //     </tr>
// //     <tr>
// //       <th className={TH_APP}>Sem 1</th>
// //       <th className={TH_APP}>Sem 2</th>
// //       <th className={TH_APP}>Total</th>
// //     </tr>
// //   </>
// // );

// // // ─── Component ────────────────────────────────────────────────────────────────

// // const Form2: React.FC<Form2Props> = ({
// //   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// // }) => {
// //   useEffect(() => { ensureAnim(); }, []);

// //   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
// //   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

// //   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
// //   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
// //   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
// //   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

// //   const savedValues             = useRef<Map<number, number>>(new Map());
// //   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
// //   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

// //   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
// //   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
// //   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
// //   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
// //   const [modalState,        setModalState]        = useState<{
// //     isOpen: boolean; classificationId: number; classificationName: string;
// //   } | null>(null);
// //   const [pastModalState, setPastModalState] = useState<{
// //     isOpen: boolean; classificationId: number; classificationName: string;
// //   } | null>(null);

// //   const savedObligations = useRef<Map<number, number>>(new Map());

// //   const incomeSource = getSourceForDepartment(plan.department);
// //   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
// //     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

// //   const expenseItemMap = useMemo(
// //     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
// //     [expenseItems]
// //   );

// //   useEffect(() => {
// //     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// //       .then(res => {
// //         const raw = res.data.data || [];
// //         setAipItems(raw.map((item: any) => ({
// //           ...item,
// //           ps_amount:    parseFloat(item.ps_amount)    || 0,
// //           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
// //           co_amount:    parseFloat(item.co_amount)    || 0,
// //           total_amount: parseFloat(item.total_amount) || 0,
// //           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
// //           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
// //           recommendation: item.recommendation ?? null,
// //         })));
// //         raw.forEach((item: any) =>
// //           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
// //         );
// //       })
// //       .catch(console.error);
// //   }, [plan.dept_budget_plan_id]);

// //   // ── Effect 1: Rebuild full items list when plan/pastYear changes ─────────
// //   // Does NOT depend on obligationYearPlan so a silent obligation refresh
// //   // from LBPForms won't wipe the entire local state.
// //   useEffect(() => {
// //     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
// //     pastYearPlan?.items.forEach(item => {
// //       pastData.set(item.expense_item_id, {
// //         total:  Number(item.total_amount) || 0,
// //         sem1:   Number((item as any).sem1_amount) || 0,
// //         sem2:   Number((item as any).sem2_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });

// //     // Seed obligation data from obligationYearPlan at build time
// //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// //     obligationYearPlan?.items.forEach(item => {
// //       obligationData.set(item.expense_item_id, {
// //         amount: Number((item as any).obligation_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });

// //     const merged: ItemWithMeta[] = plan.items.map(planItem => {
// //       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0 };
// //       return {
// //         ...planItem,
// //         expense_item:         expenseItemMap.get(planItem.expense_item_id),
// //         pastTotal:            past.total,
// //         pastSem1:             past.sem1,
// //         pastSem2:             past.sem2,
// //         pastObligation:       obligationData.get(planItem.expense_item_id)?.amount ?? 0,
// //         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
// //         pastItemId:           past.itemId || undefined,
// //         recommendation:       (planItem as any).recommendation ?? null,
// //       };
// //     });

// //     setItems(merged);
// //     setPastSem1Edits(new Map());
// //     setObligationEdits(new Map());
// //     merged.forEach(item => {
// //       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
// //       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
// //       savedObligations.current.set(item.expense_item_id, item.pastObligation);
// //     });
// //     // eslint-disable-next-line react-hooks/exhaustive-deps
// //   }, [plan, pastYearPlan, expenseItemMap]); // intentionally excludes obligationYearPlan

// //   // ── Effect 2: Patch ONLY obligation fields when obligationYearPlan refreshes
// //   // This runs after LBPForms silently re-fetches the obligation year plan.
// //   // It MERGES updated obligation data into existing items without rebuilding,
// //   // so any in-flight edits or local state for other fields are preserved.
// //   useEffect(() => {
// //     if (!obligationYearPlan) return;

// //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// //     obligationYearPlan.items.forEach((item: any) => {
// //       obligationData.set(item.expense_item_id, {
// //         amount: Number(item.obligation_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });

// //     setItems(prev => prev.map(i => {
// //       const obl = obligationData.get(i.expense_item_id);
// //       if (!obl) return i;
// //       // Only update if the value actually changed (avoid unnecessary re-renders)
// //       if (obl.amount === i.pastObligation && obl.itemId === i.pastObligationItemId) return i;
// //       // Update savedObligations ref so the blur guard stays accurate
// //       savedObligations.current.set(i.expense_item_id, obl.amount);
// //       return { ...i, pastObligation: obl.amount, pastObligationItemId: obl.itemId };
// //     }));
// //   }, [obligationYearPlan]);

// //   const handleProposedChange = useCallback((id: number, value: number) =>
// //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

// //   const handleBlur = useCallback(async (expenseItemId: number) => {
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const cur = Number(item.total_amount);
// //     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
// //     setSavingItems(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       const payload = { total_amount: cur };
// //       const res = item.dept_bp_form2_item_id === 0
// //         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
// //         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
// //       savedValues.current.set(expenseItemId, cur);
// //       // Update local state immediately so value shows without reload
// //       const saved = res.data.data;
// //       if (saved) {
// //         setItems(prev => prev.map(i =>
// //           i.expense_item_id === expenseItemId
// //             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
// //             : i
// //         ));
// //       }
// //       onItemUpdate();
// //       return res.data;
// //     })();
// //     toast.promise(promise, {
// //       loading: 'Saving…',
// //       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
// //       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
// //     });
// //     try { await promise; } catch {}
// //     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

// //   const handlePastSem1Change = (id: number, value: number) =>
// //     setPastSem1Edits(prev => new Map(prev).set(id, value));

// //   const handlePastSem1Blur = async (expenseItemId: number) => {
// //     const edit = pastSem1Edits.get(expenseItemId);
// //     if (edit === undefined) return;
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
// //     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
// //     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
// //     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
// //     if (!targetId || !planId) return;
// //     const clamped = Math.min(Math.max(edit, 0), cap);
// //     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
// //     if (clamped === item.pastSem1) {
// //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       return;
// //     }
// //     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
// //       // Update local state immediately — don't wait for full reload
// //       setItems(prev => prev.map(i =>
// //         i.expense_item_id === expenseItemId
// //           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
// //       ));
// //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //     })();
// //     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
// //     try { await promise; } catch {}
// //     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   };

// //   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
// //     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
// //     if (!item) return;
// //     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
// //     if (!confirm('Remove this item?')) return;
// //     try {
// //       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
// //       toast.success('Item deleted'); onItemUpdate();
// //     } catch { toast.error('Failed to delete item.'); }
// //   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

// //   const handleRecommendationChange = useCallback((id: number, value: string) =>
// //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

// //   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item || item.dept_bp_form2_item_id === 0) return;
// //     const cur = item.recommendation ?? null;
// //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// //     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
// //     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
// //       savedRecommendations.current.set(expenseItemId, cur);
// //     })();
// //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

// //   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
// //     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

// //   const handleAipRecommendationBlur = useCallback(async (id: number) => {
// //     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
// //     if (!item) return;
// //     const cur = (item as any).recommendation ?? null;
// //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// //     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
// //     setSavingAipRecommendations(prev => new Set(prev).add(id));
// //     const promise = (async () => {
// //       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
// //       savedAipRecommendations.current.set(id, cur);
// //     })();
// //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
// //   }, [aipItems, savingAipRecommendations]);

// //   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

// //   const handleObligationChange = (expenseItemId: number, value: number) =>
// //     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

// //   const handleObligationBlur = async (expenseItemId: number) => {
// //     const edit = obligationEdits.get(expenseItemId);
// //     if (edit === undefined) return;
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const clamped = Math.max(edit, 0);
// //     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
// //     if (clamped === savedObligations.current.get(expenseItemId)) {
// //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       return;
// //     }
// //     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// //     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
// //     setSavingObligations(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       if (item.pastObligationItemId) {
// //         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
// //       } else {
// //         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
// //           expense_item_id: expenseItemId,
// //           obligation_amount: clamped,
// //         });
// //         const newItemId = res.data.data?.dept_bp_form2_item_id;
// //         setItems(prev => prev.map(i =>
// //           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
// //         ));
// //         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
// //         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
// //           expense_item_id: expenseItemId,
// //         }).catch(() => {}); // ignore 422 duplicate
// //         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
// //           expense_item_id: expenseItemId,
// //         }).catch(() => {}); // ignore 422 duplicate
// //       }
// //       savedObligations.current.set(expenseItemId, clamped);
// //       // Update local state immediately so amount shows without reload
// //       setItems(prev => prev.map(i =>
// //         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
// //       ));
// //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       onItemUpdate();
// //     })();
// //     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   };

// //   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
// //     const key = `${id}_${field}`;
// //     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
// //   };

// //   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
// //     const digits = rawValue.replace(/[^0-9]/g, '');
// //     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
// //     const num = digits === '' ? 0 : parseInt(digits, 10);
// //     if (field === 'proposed') handleProposedChange(id, num);
// //     else if (field === 'sem1') handlePastSem1Change(id, num);
// //     else handleObligationChange(id, num);
// //   };

// //   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
// //     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
// //     if (field === 'proposed') handleBlur(id);
// //     else if (field === 'sem1') handlePastSem1Blur(id);
// //     else handleObligationBlur(id);
// //   };

// //   const itemsByClassification = useMemo(() =>
// //     classifications
// //       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
// //       .map(c => ({
// //         ...c,
// //         items: items
// //           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// //           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// //       })), [classifications, items]);

// //   // Grand totals: account for in-flight pastSem1Edits so subtotals calculate live
// //   const grandTotals = useMemo(() => {
// //     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
// //     for (const i of items) {
// //       const sem1 = pastSem1Edits.has(i.expense_item_id)
// //         ? pastSem1Edits.get(i.expense_item_id)!
// //         : i.pastSem1;
// //       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
// //       const sem2 = pastSem1Edits.has(i.expense_item_id)
// //         ? Math.max(cap - sem1, 0)
// //         : i.pastSem2;
// //       pastSem1  += sem1;
// //       pastSem2  += sem2;
// //       pastTotal += i.pastTotal;
// //       proposed  += Number(i.total_amount);
// //     }
// //     return { pastSem1, pastSem2, pastTotal, proposed };
// //   }, [items, pastSem1Edits]);

// //   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
// //   const calamityTotal = calamityData?.calamity_fund ?? 0;

// //   const grandFinal = useMemo(() => ({
// //     pastSem1:  grandTotals.pastSem1,
// //     pastSem2:  grandTotals.pastSem2,
// //     pastTotal: grandTotals.pastTotal,
// //     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
// //   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

// //   const prevYear = Number(plan.budget_plan?.year) - 1;
// //   const currYear = plan.budget_plan?.year;
// //   const hasRows  = items.length > 0 || aipItems.length > 0;

// //   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
// //   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

// //   const hasAipSection      = aipItems.length > 0;
// //   const hasCalamitySection = isSpecialAccount;

// //   let gIdx = 0;

// //   return (
// //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// //       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
// //         <div>
// //           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
// //           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
// //             Programmed Appropriation and Obligation by Object of Expenditures
// //           </h3>
// //         </div>
// //       </div>

// //       <div className="overflow-x-auto">
// //         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

// //           <colgroup>
// //             {COL_WIDTHS.map((w, i) => {
// //               if ((i === 2 || i === 9) && !isAdmin) return null;
// //               return <col key={i} style={{ width: w }} />;
// //             })}
// //           </colgroup>

// //           {/* ── Main thead ──────────────────────────────────────────────── */}
// //           <thead className="sticky top-0 z-10">
// //             <tr>
// //               <th className={TH} rowSpan={2}>Acct Code</th>
// //               <th className={TH} rowSpan={2}>Object of Expenditure</th>

// //               {isAdmin && (
// //                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
// //                   Past Year ({Number(plan.budget_plan?.year) - 2})
// //                 </th>
// //               )}

// //               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
// //                 Appropriation ({prevYear})
// //               </th>

// //               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

// //               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
// //               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
// //               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
// //             </tr>
// //             <tr>
// //               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
// //               <th className={TH_APP}>Sem 2</th>
// //               <th className={TH_APP}>Total</th>
// //             </tr>
// //           </thead>

// //           <tbody>
// //             {itemsByClassification.map((cls, clsIndex) => {
// //               const isPS = cls.expense_class_id === PS_CLASS_ID;
// //               const canEdit     = isEditable && (!isPS || isAdmin);
// //               const canEditSem1 = isEditable && (isAdmin || !isPS);

// //               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
// //                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

// //               // Subtotals: use live pastSem1Edits for past year columns
// //               const clsSem1 = cls.items.reduce((s, i) => {
// //                 const sem1 = pastSem1Edits.has(i.expense_item_id)
// //                   ? pastSem1Edits.get(i.expense_item_id)!
// //                   : i.pastSem1;
// //                 return s + sem1;
// //               }, 0);
// //               const clsSem2 = cls.items.reduce((s, i) => {
// //                 if (pastSem1Edits.has(i.expense_item_id)) {
// //                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
// //                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
// //                   return s + Math.max(cap - sem1, 0);
// //                 }
// //                 return s + i.pastSem2;
// //               }, 0);
// //               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
// //               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
// //               const clsDiff = clsProp - clsPast;
// //               const clsPct  = pctOf(clsPast, clsDiff);

// //               const isLastCls       = clsIndex === itemsByClassification.length - 1;
// //               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
// //               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

// //               return (
// //                 <React.Fragment key={cls.expense_class_id}>

// //                   {/* Section divider */}
// //                   <tr className="bg-gray-50 border-y border-gray-200">
// //                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                       <div className="flex items-center justify-between">
// //                         <div className="flex items-center gap-2">
// //                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
// //                           {isPS && (
// //                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
// //                               Auto-filled from Personnel Services
// //                             </span>
// //                           )}
// //                         </div>
// //                         <div className="flex items-center gap-1.5">
                          
// //                           {canEdit && (
// //                             <Tooltip>
// //                               <TooltipTrigger asChild>
// //                                 <Button size="sm" variant="outline"
// //                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
// //                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// //                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
// //                                 </Button>
// //                               </TooltipTrigger>
// //                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
// //                             </Tooltip>
// //                           )}
// //                         </div>
// //                       </div>
// //                     </td>
// //                   </tr>

// //                   {cls.items.length === 0 ? (
// //                     <>
// //                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
// //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //                     </>
// //                   ) : (
// //                     <>
// //                       {cls.items.map(item => {
// //                         const delay    = Math.min(gIdx * 18, 280);
// //                         gIdx++;
// //                         const past     = item.pastTotal;
// //                         const proposed = Number(item.total_amount);
// //                         const d        = incr(past, proposed);
// //                         const p        = pctOf(past, d);
// //                         const isSaving = savingItems.has(item.expense_item_id);

// //                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
// //                           ? pastSem1Edits.get(item.expense_item_id)!
// //                           : item.pastSem1;
// //                         const sem2Cap  = past > 0 ? past : proposed;
// //                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
// //                           ? sem2Cap - dispSem1
// //                           : item.pastSem2;

// //                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

// //                         return (
// //                           <tr
// //                             key={item.expense_item_id}
// //                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
// //                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
// //                           >
// //                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
// //                             <td className={cn(TD, 'text-gray-800 font-medium')}>
// //                               <div className="flex items-center justify-between gap-1">
// //                                 <span>{item.expense_item?.expense_class_item_name}</span>
// //                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
// //                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
// //                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
// //                                     <TrashIcon className="w-3.5 h-3.5" />
// //                                   </button>
// //                                 )}
// //                               </div>
// //                             </td>

// //                             {/* ── Obligation — blue, admin only ─────────── */}
// //                             {isAdmin && (
// //                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'obligation',
// //                                     obligationEdits.has(item.expense_item_id)
// //                                       ? obligationEdits.get(item.expense_item_id)!
// //                                       : item.pastObligation)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
// //                                   disabled={savingObligations.has(item.expense_item_id)}
// //                                   className={inputAppCls}
// //                                 />
// //                               </td>
// //                             )}

// //                             {/* ── Sem 1 — blue ────────────────────────────── */}
// //                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
// //                               {sem1Editable ? (
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
// //                                   disabled={savingPastItems.has(item.expense_item_id)}
// //                                   className={inputAppCls}
// //                                 />
// //                               ) : (
// //                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
// //                               )}
// //                             </td>

// //                             {/* ── Sem 2 — blue ────────────────────────────── */}
// //                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

// //                             {/* ── Past Total — blue ────────────────────────── */}
// //                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

// //                             {/* ── Proposed — orange ────────────────────────── */}
// //                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
// //                               {canEdit ? (
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
// //                                   disabled={isSaving} className={inputCls} />
// //                               ) : (
// //                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
// //                                   {proposed === 0 ? '–' : fmtP(proposed)}
// //                                 </span>
// //                               )}
// //                             </td>

// //                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
// //                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

// //                             {/* Recommendation */}
// //                             {isAdmin && (
// //                               <td className={TD}>
// //                                 {isEditable && (isAdmin || !isPS) ? (
// //                                   <input type="text" value={item.recommendation ?? ''}
// //                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// //                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// //                                     disabled={savingRecommendations.has(item.expense_item_id)}
// //                                     placeholder="Add note…" maxLength={255} className={recCls} />
// //                                 ) : (
// //                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// //                                 )}
// //                               </td>
// //                             )}
// //                           </tr>
// //                         );
// //                       })}

// //                       {/* Classification subtotal */}
// //                       <tr className="border-t border-gray-200">
// //                         <td className="bg-gray-100" />
// //                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
// //                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
// //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
// //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
// //                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
// //                         </td>
// //                         {isAdmin && <td className="bg-gray-100" />}
// //                       </tr>

// //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //                     </>
// //                   )}
// //                 </React.Fragment>
// //               );
// //             })}

// //             {/* ── Special Programs (AIP) ── */}
// //             {aipItems.length > 0 && (
// //               <React.Fragment>
// //                 <tr className="bg-gray-50 border-y border-gray-200">
// //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                     <div className="flex items-center gap-2">
// //                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
// //                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
// //                     </div>
// //                   </td>
// //                   <td className="bg-gray-50" />
// //                 </tr>

// //                 {aipItems.map(item => {
// //                   const delay = Math.min(gIdx * 18, 280);
// //                   gIdx++;
// //                   return (
// //                     <tr key={item.dept_bp_form4_item_id}
// //                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
// //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
// //                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
// //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
// //                       {isAdmin && (
// //                         <td className={TD}>
// //                           {isEditable ? (
// //                             <input type="text" value={(item as any).recommendation ?? ''}
// //                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// //                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// //                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// //                               placeholder="Add note…" maxLength={255} className={recCls} />
// //                           ) : (
// //                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// //                           )}
// //                         </td>
// //                       )}
// //                     </tr>
// //                   );
// //                 })}

// //                 <tr className="border-t border-gray-200">
// //                   <td className="bg-gray-100" />
// //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
// //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// //                   {isAdmin && <td className="bg-gray-100" />}
// //                 </tr>

// //                 {<SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //               </React.Fragment>
// //             )}

// //             {/* ── 5% Calamity Fund ── */}
// //             {isSpecialAccount && (
// //               <React.Fragment>
// //                 <tr className="bg-gray-50 border-y border-gray-200">
// //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                     <div className="flex items-center gap-2">
// //                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
// //                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
// //                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
// //                       </span>
// //                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
// //                     </div>
// //                   </td>
// //                   <td className="bg-gray-50" />
// //                 </tr>

// //                 {[
// //                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
// //                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
// //                 ].map(row => {
// //                   const delay = Math.min(gIdx * 18, 280);
// //                   gIdx++;
// //                   return (
// //                     <tr key={row.code}
// //                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
// //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
// //                       <td className={cn(TD, 'text-gray-800')}>
// //                         {row.label}
// //                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
// //                       </td>
// //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
// //                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
// //                       </td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
// //                       <td />
// //                     </tr>
// //                   );
// //                 })}

// //                 <tr className="border-t border-gray-200">
// //                   <td className="bg-gray-100" />
// //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
// //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
// //                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
// //                   </td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// //                   {isAdmin && <td className="bg-gray-100" />}
// //                 </tr>

// //                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
// //                   <tr>
// //                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
// //                       Base:{' '}
// //                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
// //                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
// //                     </td>
// //                   </tr>
// //                 )}
// //               </React.Fragment>
// //             )}
// //           </tbody>

// //           {/* ── Grand Total ── */}
// //           <tfoot>
// //             {hasRows && (
// //               <tr className="bg-gray-900 text-white">
// //                 <td className="px-3 py-3" />
// //                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
// //                   Grand Total
// //                   {isSpecialAccount && calamityTotal > 0 && (
// //                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
// //                   )}
// //                 </td>
// //                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// //                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
// //                 </td>
// //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// //                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
// //                 </td>
// //                 {isAdmin && <td className="border-l border-gray-700" />}
// //               </tr>
// //             )}
// //           </tfoot>
// //         </table>
// //       </div>

// //       {modalState && (
// //         <AddItemModal
// //           isOpen={modalState.isOpen}
// //           onClose={() => setModalState(null)}
// //           classificationId={modalState.classificationId}
// //           classificationName={modalState.classificationName}
// //           planId={plan.dept_budget_plan_id}
// //           expenseItems={expenseItems}
// //           existingItemIds={items.map(i => i.expense_item_id)}
// //           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
// //         />
// //       )}

// //       {/* Past-year add item modal — admin adds items to the PAST year plan (prevYear appropriation) */}
// //       {pastModalState && pastYearPlan && (
// //         <AddItemModal
// //           isOpen={pastModalState.isOpen}
// //           onClose={() => setPastModalState(null)}
// //           classificationId={pastModalState.classificationId}
// //           classificationName={pastModalState.classificationName}
// //           planId={pastYearPlan.dept_budget_plan_id}
// //           expenseItems={expenseItems}
// //           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
// //           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // export default Form2;
// // // import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// // // import API from '../../services/api';
// // // import {
// // //   DepartmentBudgetPlan,
// // //   ExpenseClassification,
// // //   ExpenseItem,
// // //   DepartmentBudgetPlanItem,
// // //   DepartmentBudgetPlanForm4Item,
// // // } from '../../types/api';
// // // import AddItemModal from './AddItemModal';
// // // import { Button } from '@/src/components/ui/button';
// // // import { toast } from 'sonner';
// // // import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// // // import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// // // import { cn } from '@/src/lib/utils';
// // // import { useCalamityFund } from '../../hooks/useCalamityFund';


// // // // ─── Column color tokens ──────────────────────────────────────────────────────
// // // // Appropriation (past year) → blue
// // // // Proposed (budget year)    → orange

// // // const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// // // const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// // // const C_APP_SUB = 'bg-blue-50   border-blue-200';
// // // const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// // // const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// // // const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// // // const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// // // const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // // // ─── Animation keyframes ──────────────────────────────────────────────────────

// // // const ANIM_CSS = `
// // // @keyframes _rowIn {
// // //   from { opacity: 0; transform: translateY(6px); }
// // //   to   { opacity: 1; transform: translateY(0); }
// // // }
// // // @media (prefers-reduced-motion: reduce) {
// // //   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// // // }
// // // `;
// // // let _animInjected = false;
// // // function ensureAnim() {
// // //   if (_animInjected || typeof document === 'undefined') return;
// // //   const el = document.createElement('style');
// // //   el.textContent = ANIM_CSS;
// // //   document.head.appendChild(el);
// // //   _animInjected = true;
// // // }

// // // // ─── Dept → income-fund source key ───────────────────────────────────────────

// // // const getSourceForDepartment = (dept?: {
// // //   dept_abbreviation?: string; dept_name?: string;
// // // }): string | undefined => {
// // //   if (!dept) return undefined;
// // //   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
// // //   const name = dept.dept_name?.toLowerCase() ?? '';
// // //   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
// // //   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
// // //   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
// // //   return undefined;
// // // };

// // // const PS_CLASS_ID = 1;

// // // // ─── Types ────────────────────────────────────────────────────────────────────

// // // interface Form2Props {
// // //   plan: DepartmentBudgetPlan;
// // //   pastYearPlan: DepartmentBudgetPlan | null;
// // //   obligationYearPlan: DepartmentBudgetPlan | null;
// // //   classifications: ExpenseClassification[];
// // //   expenseItems: ExpenseItem[];
// // //   isEditable: boolean;
// // //   isAdmin?: boolean;
// // //   onItemUpdate: () => void;
// // // }

// // // interface ItemWithMeta extends DepartmentBudgetPlanItem {
// // //   pastTotal: number; pastSem1: number; pastSem2: number;
// // //   pastObligation: number;
// // //   pastObligationItemId?: number;
// // //   pastItemId?: number; expense_item?: ExpenseItem;
// // //   recommendation?: string | null;
// // // }

// // // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // // const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// // // const fmtP  = (n: number) => `₱${fmt(n)}`;
// // // const incr  = (past: number, prop: number) => prop - past;
// // // const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// // // const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// // // const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // // // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// // // const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // // // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// // // const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// // // const TD      = 'px-3 py-2.5 text-[12px]';
// // // const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // // // ── Appropriation (blue) ───────────────────────────────────────────────────────
// // // const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// // // const TD_APP  = `${TD_M} bg-blue-50/30`;

// // // // ── Proposed (orange) ─────────────────────────────────────────────────────────
// // // const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// // // const TD_PRO  = `${TD_M} bg-orange-50/30`;

// // // const inputCls =
// // //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // //   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// // // const inputAppCls =
// // //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // //   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// // // const recCls =
// // //   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// // //   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // // // ─── Sub-header ───────────────────────────────────────────────────────────────

// // // // const SubHeader: React.FC<{
// // // //   prevYear: number | string | undefined;
// // // //   currYear: number | string | undefined;
// // // // }> = ({ prevYear, currYear }) => (
// // // //   <>
// // // //     <tr>
// // // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// // // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// // // //       {/* Appropriation — blue */}
// // // //       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// // // //         Appropriation ({prevYear})
// // // //       </th>
// // // //       {/* Proposed — orange */}
// // // //       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// // // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// // // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// // // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>
// // // //     </tr>
// // // //     <tr>
// // // //       <th className={TH_APP}>Sem 1</th>
// // // //       <th className={TH_APP}>Sem 2</th>
// // // //       <th className={TH_APP}>Total</th>
// // // //     </tr>
// // // //   </>
// // // // );
// // //   const SubHeader: React.FC<{
// // //     prevYear: number | string | undefined;
// // //     currYear: number | string | undefined;
// // //     isAdmin?: boolean;
// // //   }> = ({ prevYear, currYear, isAdmin }) => (
// // //     <>
// // //       <tr>
// // //         <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// // //         <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// // //         {isAdmin && (
// // //           <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
// // //             Past Year ({Number(prevYear) - 1})
// // //           </th>
// // //         )}
// // //         <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// // //           Appropriation ({prevYear})
// // //         </th>
// // //         <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// // //         <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// // //         <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// // //         {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
// // //       </tr>
// // //       <tr>
// // //         <th className={TH_APP}>Sem 1</th>
// // //         <th className={TH_APP}>Sem 2</th>
// // //         <th className={TH_APP}>Total</th>
// // //       </tr>
// // //     </>
// // //   );

// // // // ─── Component ────────────────────────────────────────────────────────────────

// // // const Form2: React.FC<Form2Props> = ({
// // //   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// // // }) => {
// // //   useEffect(() => { ensureAnim(); }, []);

// // //   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
// // //   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

// // //   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
// // //   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
// // //   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
// // //   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

// // //   const savedValues             = useRef<Map<number, number>>(new Map());
// // //   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
// // //   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

// // //   const [pastSem1Edits,       setPastSem1Edits]       = useState<Map<number, number>>(new Map());
// // //   const [obligationEdits,     setObligationEdits]     = useState<Map<number, number>>(new Map());
// // //   const [savingObligations,   setSavingObligations]   = useState<Set<number>>(new Set());
// // //   const [uploadingObligations,setUploadingObligations]= useState(false);
// // //   const [inputDraft,          setInputDraft]          = useState<Map<string, string>>(new Map());
// // //   const [modalState,          setModalState]          = useState<{
// // //     isOpen: boolean; classificationId: number; classificationName: string;
// // //   } | null>(null);
// // //   const [pastModalState,      setPastModalState]      = useState<{
// // //     isOpen: boolean; classificationId: number; classificationName: string;
// // //   } | null>(null);
// // //   const fileInputRef = useRef<HTMLInputElement>(null);
// // //   const savedObligations = useRef<Map<number, number>>(new Map());

// // //   const incomeSource = getSourceForDepartment(plan.department);
// // //   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
// // //     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

// // //   const expenseItemMap = useMemo(
// // //     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
// // //     [expenseItems]
// // //   );

// // //   useEffect(() => {
// // //     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// // //       .then(res => {
// // //         const raw = res.data.data || [];
// // //         setAipItems(raw.map((item: any) => ({
// // //           ...item,
// // //           ps_amount:    parseFloat(item.ps_amount)    || 0,
// // //           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
// // //           co_amount:    parseFloat(item.co_amount)    || 0,
// // //           total_amount: parseFloat(item.total_amount) || 0,
// // //           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
// // //           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
// // //           recommendation: item.recommendation ?? null,
// // //         })));
// // //         raw.forEach((item: any) =>
// // //           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
// // //         );
// // //       })
// // //       .catch(console.error);
// // //   }, [plan.dept_budget_plan_id]);

// // //   useEffect(() => {
// // //     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
// // //     pastYearPlan?.items.forEach(item => {
// // //       pastData.set(item.expense_item_id, {
// // //         total:  Number(item.total_amount) || 0,
// // //         sem1:   Number((item as any).sem1_amount) || 0,
// // //         sem2:   Number((item as any).sem2_amount) || 0,
// // //         itemId: item.dept_bp_form2_item_id,
// // //       });
// // //     });

// // //     // Obligation data comes from the year BEFORE pastYearPlan (obligationYearPlan)
// // //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// // //     obligationYearPlan?.items.forEach(item => {
// // //       obligationData.set(item.expense_item_id, {
// // //         amount: Number((item as any).obligation_amount) || 0,
// // //         itemId: item.dept_bp_form2_item_id,
// // //       });
// // //     });
// // //     const merged: ItemWithMeta[] = plan.items.map(planItem => {
// // //       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0, obligation: 0 };
// // //       return {
// // //         ...planItem,
// // //         expense_item:   expenseItemMap.get(planItem.expense_item_id),
// // //         pastTotal:      past.total,
// // //         pastSem1:       past.sem1,
// // //         pastSem2:       past.sem2,
// // //         pastObligation:      obligationData.get(planItem.expense_item_id)?.amount ?? 0,
// // //         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
// // //         pastItemId:          past.itemId || undefined,
// // //         recommendation: (planItem as any).recommendation ?? null,
// // //       };
// // //     });
// // //     setItems(merged);
// // //     merged.forEach(item => {
// // //       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
// // //       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
// // //       savedObligations.current.set(item.expense_item_id, item.pastObligation);
// // //     });
// // //   }, [plan, pastYearPlan, expenseItemMap]);

// // //   const handleProposedChange = useCallback((id: number, value: number) =>
// // //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

// // //   const handleBlur = useCallback(async (expenseItemId: number) => {
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item) return;
// // //     const cur = Number(item.total_amount);
// // //     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
// // //     setSavingItems(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       const payload = { total_amount: cur };
// // //       const res = item.dept_bp_form2_item_id === 0
// // //         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
// // //         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
// // //       savedValues.current.set(expenseItemId, cur);
// // //       onItemUpdate();
// // //       return res.data;
// // //     })();
// // //     toast.promise(promise, {
// // //       loading: 'Saving…',
// // //       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
// // //       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
// // //     });
// // //     try { await promise; } catch {}
// // //     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

// // //   const handlePastSem1Change = (id: number, value: number) =>
// // //     setPastSem1Edits(prev => new Map(prev).set(id, value));

// // //   const handlePastSem1Blur = async (expenseItemId: number) => {
// // //     const edit = pastSem1Edits.get(expenseItemId);
// // //     if (edit === undefined) return;
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item) return;
// // //     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
// // //     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
// // //     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
// // //     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
// // //     if (!targetId || !planId) return;
// // //     const clamped = Math.min(Math.max(edit, 0), cap);
// // //     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
// // //     if (clamped === item.pastSem1) {
// // //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //       return;
// // //     }
// // //     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
// // //       setItems(prev => prev.map(i =>
// // //         i.expense_item_id === expenseItemId
// // //           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
// // //       ));
// // //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
// // //     try { await promise; } catch {}
// // //     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   };

// // //   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
// // //     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
// // //     if (!item) return;
// // //     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
// // //     if (!confirm('Remove this item?')) return;
// // //     try {
// // //       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
// // //       toast.success('Item deleted'); onItemUpdate();
// // //     } catch { toast.error('Failed to delete item.'); }
// // //   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

// // //   const handleRecommendationChange = useCallback((id: number, value: string) =>
// // //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

// // //   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item || item.dept_bp_form2_item_id === 0) return;
// // //     const cur = item.recommendation ?? null;
// // //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// // //     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
// // //     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
// // //       savedRecommendations.current.set(expenseItemId, cur);
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// // //     try { await promise; } catch {}
// // //     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

// // //   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
// // //     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

// // //   const handleAipRecommendationBlur = useCallback(async (id: number) => {
// // //     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
// // //     if (!item) return;
// // //     const cur = (item as any).recommendation ?? null;
// // //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// // //     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
// // //     setSavingAipRecommendations(prev => new Set(prev).add(id));
// // //     const promise = (async () => {
// // //       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
// // //       savedAipRecommendations.current.set(id, cur);
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// // //     try { await promise; } catch {}
// // //     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
// // //   }, [aipItems, savingAipRecommendations]);

// // //   // ── Obligation handlers (admin only, edits past plan item) ───────────────

// // //   const handleObligationChange = (expenseItemId: number, value: number) =>
// // //     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

// // //   const handleObligationBlur = async (expenseItemId: number) => {
// // //     const edit = obligationEdits.get(expenseItemId);
// // //     if (edit === undefined) return;
// // //     const item = items.find(i => i.expense_item_id === expenseItemId);
// // //     if (!item) return;
// // //     const clamped = Math.max(edit, 0);
// // //     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
// // //     if (clamped === savedObligations.current.get(expenseItemId)) {
// // //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //       return;
// // //     }
// // //     // We need the past plan item id. If no past item, we must create one on the past plan first.
// // //     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// // //     if (!oblPlanId) { toast.error('No obligation year plan (2025) found for this department.'); return; }
// // //     setSavingObligations(prev => new Set(prev).add(expenseItemId));
// // //     const promise = (async () => {
// // //       if (item.pastObligationItemId) {
// // //         // Update existing obligation year item
// // //         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
// // //       } else {
// // //         // Create new item on the obligation year plan (2025)
// // //         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
// // //           expense_item_id: expenseItemId,
// // //           obligation_amount: clamped,
// // //         });
// // //         const newItemId = res.data.data?.dept_bp_form2_item_id;
// // //         setItems(prev => prev.map(i =>
// // //           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
// // //         ));
// // //         // Cascade: ensure item exists on current (pastYearPlan = 2026) and proposed (plan = 2027)
// // //         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
// // //           expense_item_id: expenseItemId,
// // //         }).catch(() => {}); // ignore 422 duplicate
// // //         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
// // //           expense_item_id: expenseItemId,
// // //         }).catch(() => {}); // ignore 422 duplicate
// // //       }
// // //       savedObligations.current.set(expenseItemId, clamped);
// // //       setItems(prev => prev.map(i =>
// // //         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
// // //       ));
// // //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// // //       onItemUpdate();
// // //     })();
// // //     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
// // //     try { await promise; } catch {}
// // //     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// // //   };

// // //   // ── Excel upload handler ──────────────────────────────────────────────────

// // //   const handleObligationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
// // //     const file = e.target.files?.[0];
// // //     if (!file) return;
// // //     // Reset input so same file can be re-uploaded
// // //     e.target.value = '';
// // //     setUploadingObligations(true);
// // //     try {
// // //       // Dynamically import SheetJS (xlsx) — it must be installed: npm i xlsx
// // //       const XLSX = await import('xlsx');
// // //       const data  = await file.arrayBuffer();
// // //       const wb    = XLSX.read(data, { type: 'array' });

// // //       // Parse all sheets: match by sheet name containing 'ps', 'mooe', 'co', 'aip'
// // //       const expenseRows: { expense_item_name: string; amount: number }[] = [];
// // //       const aipRows:     { program_description: string; amount: number }[] = [];

// // //       wb.SheetNames.forEach(name => {
// // //         const lower = name.toLowerCase();
// // //         const sheet  = wb.Sheets[name];
// // //         const rows   = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
// // //         if (lower.includes('aip')) {
// // //           rows.forEach(row => {
// // //             const desc   = String(row['program_description'] ?? row['Program Description'] ?? row['description'] ?? row['Description'] ?? '').trim();
// // //             const amount = parseFloat(String(row['amount'] ?? row['Amount'] ?? row['obligation'] ?? row['Obligation'] ?? 0).replace(/,/g, ''));
// // //             if (desc && !isNaN(amount) && amount >= 0) aipRows.push({ program_description: desc, amount });
// // //           });
// // //         } else {
// // //           rows.forEach(row => {
// // //             const name   = String(row['expense_item_name'] ?? row['Item'] ?? row['item'] ?? row['Name'] ?? row['name'] ?? '').trim();
// // //             const amount = parseFloat(String(row['amount'] ?? row['Amount'] ?? row['obligation'] ?? row['Obligation'] ?? 0).replace(/,/g, ''));
// // //             if (name && !isNaN(amount) && amount >= 0) expenseRows.push({ expense_item_name: name, amount });
// // //           });
// // //         }
// // //       });

// // //       const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// // //       if (!oblPlanId) { toast.error('No obligation year plan (2025) found.'); return; }

// // //       await API.post(`/department-budget-plans/${oblPlanId}/upload-obligations`, {
// // //         items:        expenseRows,
// // //         aip_programs: aipRows,
// // //       });

// // //       toast.success(`Uploaded ${expenseRows.length} expense items and ${aipRows.length} AIP programs.`);
// // //       onItemUpdate();
// // //     } catch (err: any) {
// // //       toast.error(`Upload failed: ${err?.response?.data?.message ?? err.message}`);
// // //     } finally {
// // //       setUploadingObligations(false);
// // //     }
// // //   };

// // //   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
// // //     const key = `${id}_${field}`;
// // //     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
// // //   };

// // //   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
// // //     const digits = rawValue.replace(/[^0-9]/g, '');
// // //     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
// // //     const num = digits === '' ? 0 : parseInt(digits, 10);
// // //     if (field === 'proposed') handleProposedChange(id, num);
// // //     else if (field === 'sem1') handlePastSem1Change(id, num);
// // //     else handleObligationChange(id, num);
// // //   };

// // //   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
// // //     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
// // //     if (field === 'proposed') handleBlur(id);
// // //     else if (field === 'sem1') handlePastSem1Blur(id);
// // //     else handleObligationBlur(id);
// // //   };

// // //   // const itemsByClassification = useMemo(() =>
// // //   //   classifications.map(c => ({
// // //   //     ...c,
// // //   //     items: items
// // //   //       .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// // //   //       .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// // //   //   })), [classifications, items]);
// // //   const itemsByClassification = useMemo(() =>
// // //     classifications
// // //       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
// // //       .map(c => ({
// // //         ...c,
// // //         items: items
// // //           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// // //           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// // //       })), [classifications, items]);

// // //   const grandTotals = useMemo(() => ({
// // //     pastSem1:  items.reduce((s, i) => s + i.pastSem1, 0),
// // //     pastSem2:  items.reduce((s, i) => s + i.pastSem2, 0),
// // //     pastTotal: items.reduce((s, i) => s + i.pastTotal, 0),
// // //     proposed:  items.reduce((s, i) => s + Number(i.total_amount), 0),
// // //   }), [items]);

// // //   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
// // //   const calamityTotal = calamityData?.calamity_fund ?? 0;

// // //   const grandFinal = useMemo(() => ({
// // //     pastSem1:  grandTotals.pastSem1,
// // //     pastSem2:  grandTotals.pastSem2,
// // //     pastTotal: grandTotals.pastTotal,
// // //     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
// // //   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

// // //   const prevYear = Number(plan.budget_plan?.year) - 1;
// // //   const currYear = plan.budget_plan?.year;
// // //   const hasRows  = items.length > 0 || aipItems.length > 0;

// // //   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
// // //   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

// // //   const hasAipSection      = aipItems.length > 0;
// // //   const hasCalamitySection = isSpecialAccount;

// // //   let gIdx = 0;

// // //   return (
// // //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// // //       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
// // //         <div>
// // //           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
// // //           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
// // //             Programmed Appropriation and Obligation by Object of Expenditures
// // //           </h3>
// // //         </div>
// // //         {isAdmin && (
// // //           <div className="flex items-center gap-2">
// // //             <Tooltip>
// // //               <TooltipTrigger asChild>
// // //                 <Button
// // //                   size="sm" variant="outline"
// // //                   disabled={uploadingObligations}
// // //                   onClick={() => fileInputRef.current?.click()}
// // //                   className="gap-1.5 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
// // //                   {uploadingObligations
// // //                     ? <><span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> Uploading…</>
// // //                     : <><PlusIcon className="w-3.5 h-3.5" /> Upload SAAOB ({prevYear})</>}
// // //                 </Button>
// // //               </TooltipTrigger>
// // //               <TooltipContent className="text-xs max-w-xs">
// // //                 Upload an Excel file with obligation amounts for {prevYear}. Sheets named "PS", "MOOE", "CO", "AIP". Columns: expense_item_name (or "Item"), amount (or "Amount").
// // //               </TooltipContent>
// // //             </Tooltip>
// // //             <input
// // //               ref={fileInputRef}
// // //               type="file"
// // //               accept=".xlsx,.xls,.csv"
// // //               className="hidden"
// // //               onChange={handleObligationUpload}
// // //             />
// // //           </div>
// // //         )}
// // //       </div>

// // //       <div className="overflow-x-auto">
// // //         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

// // //           {/* <colgroup>
// // //             {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
// // //           </colgroup> */}
// // //           <colgroup>
// // //             {/* Obligation col only for admin, recommendation col only for admin */}
// // //             {COL_WIDTHS.map((w, i) => {
// // //               // index 2 = obligation col (admin only), index 9 = recommendation col (admin only)
// // //               if ((i === 2 || i === 9) && !isAdmin) return null;
// // //               return <col key={i} style={{ width: w }} />;
// // //             })}
// // //           </colgroup>

// // //           {/* ── Main thead ──────────────────────────────────────────────── */}
// // //           <thead className="sticky top-0 z-10">
// // //             <tr>
// // //               <th className={TH} rowSpan={2}>Acct Code</th>
// // //               <th className={TH} rowSpan={2}>Object of Expenditure</th>

// // //               {/* Obligation — admin only, blue tint, single col */}
// // //               {isAdmin && (
// // //                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
// // //                   Past Year ({Number(plan.budget_plan?.year) - 2})
// // //                 </th>
// // //               )}

// // //               {/* Appropriation — blue group header */}
// // //               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
// // //                 Appropriation ({prevYear})
// // //               </th>

// // //               {/* Proposed — orange */}
// // //               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

// // //               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
// // //               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
// // //               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
// // //             </tr>
// // //             <tr>
// // //               {/* Appropriation sub-headers — blue */}
// // //               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
// // //               <th className={TH_APP}>Sem 2</th>
// // //               <th className={TH_APP}>Total</th>
// // //             </tr>
// // //           </thead>

// // //           <tbody>
// // //             {itemsByClassification.map((cls, clsIndex) => {
// // //               const isPS = cls.expense_class_id === PS_CLASS_ID;
// // //               // const canEdit     = isEditable && !isPS;
// // //               // const canEditSem1 = isEditable && (isAdmin || !isPS);
// // //               const canEdit     = isEditable && (!isPS || isAdmin);
// // //               const canEditSem1 = isEditable && (isAdmin || !isPS);

// // //               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
// // //                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

// // //               const clsSem1 = cls.items.reduce((s, i) => s + i.pastSem1, 0);
// // //               const clsSem2 = cls.items.reduce((s, i) => s + i.pastSem2, 0);
// // //               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
// // //               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
// // //               const clsDiff = clsProp - clsPast;
// // //               const clsPct  = pctOf(clsPast, clsDiff);

// // //               const isLastCls       = clsIndex === itemsByClassification.length - 1;
// // //               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
// // //               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

// // //               return (
// // //                 <React.Fragment key={cls.expense_class_id}>

// // //                   {/* Section divider */}
// // //                   <tr className="bg-gray-50 border-y border-gray-200">
// // //                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // //                       <div className="flex items-center justify-between">
// // //                         <div className="flex items-center gap-2">
// // //                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
// // //                           {isPS && (
// // //                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
// // //                               Auto-filled from Personnel Services
// // //                             </span>
// // //                           )}
// // //                         </div>
// // //                         <div className="flex items-center gap-1.5">
// // //                           {/* Admin: Add item to past year */}
// // //                           {isAdmin && (
// // //                             <Tooltip>
// // //                               <TooltipTrigger asChild>
// // //                                 <Button size="sm" variant="outline"
// // //                                   className="gap-1.5 text-xs h-7 border-blue-200 text-blue-600 hover:text-blue-900 bg-blue-50"
// // //                                   onClick={() => setPastModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// // //                                   <PlusIcon className="w-3.5 h-3.5" /> Past Year Item
// // //                                 </Button>
// // //                               </TooltipTrigger>
// // //                               <TooltipContent side="left" className="text-xs">Add item to past year ({prevYear})</TooltipContent>
// // //                             </Tooltip>
// // //                           )}
// // //                           {canEdit && (
// // //                             <Tooltip>
// // //                               <TooltipTrigger asChild>
// // //                                 <Button size="sm" variant="outline"
// // //                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
// // //                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// // //                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
// // //                                 </Button>
// // //                               </TooltipTrigger>
// // //                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
// // //                             </Tooltip>
// // //                           )}
// // //                         </div>
// // //                       </div>
// // //                     </td>
// // //                   </tr>

// // //                   {cls.items.length === 0 ? (
// // //                     <>
// // //                       {/* <tr><td colSpan={9} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr> */}
// // //                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
// // //                       {/* {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// // //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // //                     </>
// // //                   ) : (
// // //                     <>
// // //                       {cls.items.map(item => {
// // //                         const delay    = Math.min(gIdx * 18, 280);
// // //                         gIdx++;
// // //                         const past     = item.pastTotal;
// // //                         const proposed = Number(item.total_amount);
// // //                         const d        = incr(past, proposed);
// // //                         const p        = pctOf(past, d);
// // //                         const isSaving = savingItems.has(item.expense_item_id);

// // //                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
// // //                           ? pastSem1Edits.get(item.expense_item_id)!
// // //                           : item.pastSem1;
// // //                         const sem2Cap  = past > 0 ? past : proposed;
// // //                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
// // //                           ? sem2Cap - dispSem1
// // //                           : item.pastSem2;

// // //                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

// // //                         return (
// // //                           <tr
// // //                             key={item.expense_item_id}
// // //                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
// // //                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
// // //                           >
// // //                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
// // //                             <td className={cn(TD, 'text-gray-800 font-medium')}>
// // //                               <div className="flex items-center justify-between gap-1">
// // //                                 <span>{item.expense_item?.expense_class_item_name}</span>
// // //                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
// // //                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
// // //                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
// // //                                     <TrashIcon className="w-3.5 h-3.5" />
// // //                                   </button>
// // //                                 )}
// // //                               </div>
// // //                             </td>

// // //                             {/* ── Obligation — blue, admin only ─────────── */}
// // //                             {isAdmin && (
// // //                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
// // //                                 {isAdmin ? (
// // //                                   <input type="text" inputMode="numeric"
// // //                                     value={getDraftValue(item.expense_item_id, 'obligation',
// // //                                       obligationEdits.has(item.expense_item_id)
// // //                                         ? obligationEdits.get(item.expense_item_id)!
// // //                                         : item.pastObligation)}
// // //                                     onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
// // //                                     onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
// // //                                     disabled={savingObligations.has(item.expense_item_id)}
// // //                                     className={inputAppCls}
// // //                                   />
// // //                                 ) : (
// // //                                   <span className="text-gray-600">{item.pastObligation === 0 ? '–' : fmtP(item.pastObligation)}</span>
// // //                                 )}
// // //                               </td>
// // //                             )}

// // //                             {/* ── Sem 1 — blue ────────────────────────────── */}
// // //                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
// // //                               {sem1Editable ? (
// // //                                 <input type="text" inputMode="numeric"
// // //                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
// // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
// // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
// // //                                   disabled={savingPastItems.has(item.expense_item_id)}
// // //                                   className={inputAppCls}
// // //                                 />
// // //                               ) : (
// // //                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
// // //                               )}
// // //                             </td>

// // //                             {/* ── Sem 2 — blue ────────────────────────────── */}
// // //                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

// // //                             {/* ── Past Total — blue ────────────────────────── */}
// // //                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

// // //                             {/* ── Proposed — orange ────────────────────────── */}
// // //                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
// // //                               {canEdit ? (
// // //                                 <input type="text" inputMode="numeric"
// // //                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
// // //                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
// // //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
// // //                                   disabled={isSaving} className={inputCls} />
// // //                               ) : (
// // //                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
// // //                                   {proposed === 0 ? '–' : fmtP(proposed)}
// // //                                 </span>
// // //                               )}
// // //                             </td>

// // //                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
// // //                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

// // //                             {/* Recommendation */}
// // //                             {isAdmin && (
// // //                               <td className={TD}>
// // //                                 {isEditable && (isAdmin || !isPS) ? (
// // //                                   <input type="text" value={item.recommendation ?? ''}
// // //                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// // //                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// // //                                     disabled={savingRecommendations.has(item.expense_item_id)}
// // //                                     placeholder="Add note…" maxLength={255} className={recCls} />
// // //                                 ) : (
// // //                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// // //                                 )}
// // //                               </td>
// // //                             )}
// // //                             {/* <td className={TD}>
// // //                               {isEditable && (isAdmin || !isPS) ? (
// // //                                 <input type="text" value={item.recommendation ?? ''}
// // //                                   onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// // //                                   onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// // //                                   disabled={savingRecommendations.has(item.expense_item_id)}
// // //                                   placeholder="Add note…" maxLength={255} className={recCls} />
// // //                               ) : (
// // //                                 <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// // //                               )}
// // //                             </td> */}
// // //                           </tr>
// // //                         );
// // //                       })}

// // //                       {/* Classification subtotal */}
// // //                       <tr className="border-t border-gray-200">
// // //                         <td className="bg-gray-100" />
// // //                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
// // //                        {/* obligation subtotal — blank (obligation is a past-year actual display only) */}
// // //                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
// // //                         {/* blue subtotals */}
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
// // //                         {/* orange subtotal */}
// // //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
// // //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
// // //                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
// // //                         </td>
// // //                         {/* <td className="bg-gray-100" /> */}
// // //                         {isAdmin && <td className="bg-gray-100" />}
// // //                       </tr>

// // //                       {/* {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// // //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // //                     </>
// // //                   )}
// // //                 </React.Fragment>
// // //               );
// // //             })}

// // //             {/* ── Special Programs (AIP) ── */}
// // //             {aipItems.length > 0 && (
// // //               <React.Fragment>
// // //                 <tr className="bg-gray-50 border-y border-gray-200">
// // //                   {/* <td colSpan={8} className="px-4 py-2"> */}
// // //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // //                     <div className="flex items-center gap-2">
// // //                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
// // //                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
// // //                     </div>
// // //                   </td>
// // //                   <td className="bg-gray-50" />
// // //                 </tr>

// // //                 {aipItems.map(item => {
// // //                   const delay = Math.min(gIdx * 18, 280);
// // //                   gIdx++;
// // //                   return (
// // //                     <tr key={item.dept_bp_form4_item_id}
// // //                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
// // //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// // //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
// // //                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
// // //                       {/* obligation — blank for AIP rows (AIP uses form4 items) */}
// // //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// // //                       {/* blue — blank for AIP rows */}
// // //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       {/* orange — amount */}
// // //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
// // //                       {isAdmin && (
// // //                         <td className={TD}>
// // //                           {isEditable ? (
// // //                             <input type="text" value={(item as any).recommendation ?? ''}
// // //                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// // //                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// // //                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// // //                               placeholder="Add note…" maxLength={255} className={recCls} />
// // //                           ) : (
// // //                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// // //                           )}
// // //                         </td>
// // //                       )}
// // //                       {/* <td className={TD}>
// // //                         {isEditable ? (
// // //                           <input type="text" value={(item as any).recommendation ?? ''}
// // //                             onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// // //                             onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// // //                             disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// // //                             placeholder="Add note…" maxLength={255} className={recCls} />
// // //                         ) : (
// // //                           <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// // //                         )}
// // //                       </td> */}
// // //                     </tr>
// // //                   );
// // //                 })}

// // //                 <tr className="border-t border-gray-200">
// // //                   <td className="bg-gray-100" />
// // //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
// // //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// // //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
// // //                   {/* <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// // //                   <td className="bg-gray-100" /> */}
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// // //                   {isAdmin && <td className="bg-gray-100" />}
// // //                 </tr>

// // //                 {/* {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// // //                 {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// // //               </React.Fragment>
// // //             )}

// // //             {/* ── 5% Calamity Fund ── */}
// // //             {isSpecialAccount && (
// // //               <React.Fragment>
// // //                 <tr className="bg-gray-50 border-y border-gray-200">
// // //                   {/* <td colSpan={8} className="px-4 py-2"> */}
// // //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// // //                     <div className="flex items-center gap-2">
// // //                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
// // //                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
// // //                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
// // //                       </span>
// // //                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
// // //                     </div>
// // //                   </td>
// // //                   <td className="bg-gray-50" />
// // //                 </tr>

// // //                 {[
// // //                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
// // //                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
// // //                 ].map(row => {
// // //                   const delay = Math.min(gIdx * 18, 280);
// // //                   gIdx++;
// // //                   return (
// // //                     <tr key={row.code}
// // //                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
// // //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// // //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
// // //                       <td className={cn(TD, 'text-gray-800')}>
// // //                         {row.label}
// // //                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
// // //                       </td>
// // //                       {/* obligation — blank for calamity rows */}
// // //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// // //                       {/* blue — blank */}
// // //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// // //                       {/* orange — derived value */}
// // //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
// // //                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
// // //                       </td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
// // //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
// // //                       <td />
// // //                     </tr>
// // //                   );
// // //                 })}

// // //                 <tr className="border-t border-gray-200">
// // //                   <td className="bg-gray-100" />
// // //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
// // //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// // //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// // //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
// // //                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
// // //                   </td>
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
// // //                   {/* <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// // //                   <td className="bg-gray-100" /> */}
// // //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// // //                   {isAdmin && <td className="bg-gray-100" />}
// // //                 </tr>

// // //                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
// // //                   <tr>
// // //                     {/* <td colSpan={9} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100"> */}
// // //                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
// // //                       Base:{' '}
// // //                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
// // //                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
// // //                     </td>
// // //                   </tr>
// // //                 )}
// // //               </React.Fragment>
// // //             )}
// // //           </tbody>

// // //           {/* ── Grand Total ── */}
// // //           <tfoot>
// // //             {hasRows && (
// // //               <tr className="bg-gray-900 text-white">
// // //                 <td className="px-3 py-3" />
// // //                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
// // //                   Grand Total
// // //                   {isSpecialAccount && calamityTotal > 0 && (
// // //                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
// // //                   )}
// // //                 </td>
// // //                 {/* Obligation — blank in grand total */}
// // //                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
// // //                 {/* Appropriation — blue tint */}
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
// // //                 {/* Proposed — orange tint */}
// // //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// // //                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
// // //                 </td>
// // //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// // //                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
// // //                 </td>
// // //                 {/* <td className="border-l border-gray-700" /> */}
// // //                 {isAdmin && <td className="border-l border-gray-700" />}
// // //               </tr>
// // //             )}
// // //           </tfoot>
// // //         </table>
// // //       </div>

// // //       {modalState && (
// // //         <AddItemModal
// // //           isOpen={modalState.isOpen}
// // //           onClose={() => setModalState(null)}
// // //           classificationId={modalState.classificationId}
// // //           classificationName={modalState.classificationName}
// // //           planId={plan.dept_budget_plan_id}
// // //           expenseItems={expenseItems}
// // //           existingItemIds={items.map(i => i.expense_item_id)}
// // //           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
// // //         />
// // //       )}

// // //       {/* Past-year add item modal — admin adds items to the past year plan */}
// // //       {pastModalState && obligationYearPlan && (
// // //         <AddItemModal
// // //           isOpen={pastModalState.isOpen}
// // //           onClose={() => setPastModalState(null)}
// // //           classificationId={pastModalState.classificationId}
// // //           classificationName={pastModalState.classificationName}
// // //           planId={obligationYearPlan.dept_budget_plan_id}
// // //           expenseItems={expenseItems}
// // //           existingItemIds={obligationYearPlan.items.map((i: any) => i.expense_item_id)}
// // //           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added. Current/proposed plans updated.'); }}
// // //         />
// // //       )}
// // //     </div>
// // //   );
// // // };

// // // export default Form2;
// // import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// // import API from '../../services/api';
// // import {
// //   DepartmentBudgetPlan,
// //   ExpenseClassification,
// //   ExpenseItem,
// //   DepartmentBudgetPlanItem,
// //   DepartmentBudgetPlanForm4Item,
// // } from '../../types/api';
// // import AddItemModal from './AddItemModal';
// // import { Button } from '@/src/components/ui/button';
// // import { toast } from 'sonner';
// // import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// // import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// // import { cn } from '@/src/lib/utils';
// // import { useCalamityFund } from '../../hooks/useCalamityFund';


// // // ─── Column color tokens ──────────────────────────────────────────────────────
// // // Appropriation (past year) → blue
// // // Proposed (budget year)    → orange

// // const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// // const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// // const C_APP_SUB = 'bg-blue-50   border-blue-200';
// // const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// // const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// // const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// // const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// // const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // // ─── Animation keyframes ──────────────────────────────────────────────────────

// // const ANIM_CSS = `
// // @keyframes _rowIn {
// //   from { opacity: 0; transform: translateY(6px); }
// //   to   { opacity: 1; transform: translateY(0); }
// // }
// // @media (prefers-reduced-motion: reduce) {
// //   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// // }
// // `;
// // let _animInjected = false;
// // function ensureAnim() {
// //   if (_animInjected || typeof document === 'undefined') return;
// //   const el = document.createElement('style');
// //   el.textContent = ANIM_CSS;
// //   document.head.appendChild(el);
// //   _animInjected = true;
// // }

// // // ─── Dept → income-fund source key ───────────────────────────────────────────

// // const getSourceForDepartment = (dept?: {
// //   dept_abbreviation?: string; dept_name?: string;
// // }): string | undefined => {
// //   if (!dept) return undefined;
// //   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
// //   const name = dept.dept_name?.toLowerCase() ?? '';
// //   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
// //   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
// //   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
// //   return undefined;
// // };

// // const PS_CLASS_ID = 1;

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface Form2Props {
// //   plan: DepartmentBudgetPlan;
// //   pastYearPlan: DepartmentBudgetPlan | null;
// //   obligationYearPlan: DepartmentBudgetPlan | null;
// //   classifications: ExpenseClassification[];
// //   expenseItems: ExpenseItem[];
// //   isEditable: boolean;
// //   isAdmin?: boolean;
// //   onItemUpdate: () => void;
// // }

// // interface ItemWithMeta extends DepartmentBudgetPlanItem {
// //   pastTotal: number; pastSem1: number; pastSem2: number;
// //   pastObligation: number;
// //   pastObligationItemId?: number;
// //   pastItemId?: number; expense_item?: ExpenseItem;
// //   recommendation?: string | null;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// // const fmtP  = (n: number) => `₱${fmt(n)}`;
// // const incr  = (past: number, prop: number) => prop - past;
// // const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// // const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// // const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// // const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// // const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// // const TD      = 'px-3 py-2.5 text-[12px]';
// // const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // // ── Appropriation (blue) ───────────────────────────────────────────────────────
// // const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// // const TD_APP  = `${TD_M} bg-blue-50/30`;

// // // ── Proposed (orange) ─────────────────────────────────────────────────────────
// // const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// // const TD_PRO  = `${TD_M} bg-orange-50/30`;

// // const inputCls =
// //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// // const inputAppCls =
// //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// // const recCls =
// //   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // // ─── Sub-header ───────────────────────────────────────────────────────────────

// // const SubHeader: React.FC<{
// //   prevYear: number | string | undefined;
// //   currYear: number | string | undefined;
// //   isAdmin?: boolean;
// // }> = ({ prevYear, currYear, isAdmin }) => (
// //   <>
// //     <tr>
// //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// //       {isAdmin && (
// //         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
// //           Past Year ({Number(prevYear) - 1})
// //         </th>
// //       )}
// //       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// //         Appropriation ({prevYear})
// //       </th>
// //       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// //       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
// //     </tr>
// //     <tr>
// //       <th className={TH_APP}>Sem 1</th>
// //       <th className={TH_APP}>Sem 2</th>
// //       <th className={TH_APP}>Total</th>
// //     </tr>
// //   </>
// // );

// // // ─── Component ────────────────────────────────────────────────────────────────

// // const Form2: React.FC<Form2Props> = ({
// //   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// // }) => {
// //   useEffect(() => { ensureAnim(); }, []);

// //   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
// //   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

// //   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
// //   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
// //   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
// //   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

// //   const savedValues             = useRef<Map<number, number>>(new Map());
// //   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
// //   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

// //   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
// //   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
// //   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
// //   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
// //   const [modalState,        setModalState]        = useState<{
// //     isOpen: boolean; classificationId: number; classificationName: string;
// //   } | null>(null);
// //   const [pastModalState, setPastModalState] = useState<{
// //     isOpen: boolean; classificationId: number; classificationName: string;
// //   } | null>(null);

// //   const savedObligations = useRef<Map<number, number>>(new Map());

// //   const incomeSource = getSourceForDepartment(plan.department);
// //   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
// //     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

// //   const expenseItemMap = useMemo(
// //     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
// //     [expenseItems]
// //   );

// //   useEffect(() => {
// //     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// //       .then(res => {
// //         const raw = res.data.data || [];
// //         setAipItems(raw.map((item: any) => ({
// //           ...item,
// //           ps_amount:    parseFloat(item.ps_amount)    || 0,
// //           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
// //           co_amount:    parseFloat(item.co_amount)    || 0,
// //           total_amount: parseFloat(item.total_amount) || 0,
// //           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
// //           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
// //           recommendation: item.recommendation ?? null,
// //         })));
// //         raw.forEach((item: any) =>
// //           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
// //         );
// //       })
// //       .catch(console.error);
// //   }, [plan.dept_budget_plan_id]);

// //   useEffect(() => {
// //     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
// //     pastYearPlan?.items.forEach(item => {
// //       pastData.set(item.expense_item_id, {
// //         total:  Number(item.total_amount) || 0,
// //         sem1:   Number((item as any).sem1_amount) || 0,
// //         sem2:   Number((item as any).sem2_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });

// //     // Obligation data comes from the year BEFORE pastYearPlan (obligationYearPlan)
// //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// //     obligationYearPlan?.items.forEach(item => {
// //       obligationData.set(item.expense_item_id, {
// //         amount: Number((item as any).obligation_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });
// //     const merged: ItemWithMeta[] = plan.items.map(planItem => {
// //       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0, obligation: 0 };
// //       return {
// //         ...planItem,
// //         expense_item:        expenseItemMap.get(planItem.expense_item_id),
// //         pastTotal:           past.total,
// //         pastSem1:            past.sem1,
// //         pastSem2:            past.sem2,
// //         pastObligation:      obligationData.get(planItem.expense_item_id)?.amount ?? 0,
// //         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
// //         pastItemId:          past.itemId || undefined,
// //         recommendation:      (planItem as any).recommendation ?? null,
// //       };
// //     });
// //     setItems(merged);
// //     // Reset draft edits when base data changes (e.g. after refetch)
// //     setPastSem1Edits(new Map());
// //     setObligationEdits(new Map());
// //     merged.forEach(item => {
// //       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
// //       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
// //       savedObligations.current.set(item.expense_item_id, item.pastObligation);
// //     });
// //   }, [plan, pastYearPlan, obligationYearPlan, expenseItemMap]);

// //   const handleProposedChange = useCallback((id: number, value: number) =>
// //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

// //   const handleBlur = useCallback(async (expenseItemId: number) => {
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const cur = Number(item.total_amount);
// //     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
// //     setSavingItems(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       const payload = { total_amount: cur };
// //       const res = item.dept_bp_form2_item_id === 0
// //         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
// //         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
// //       savedValues.current.set(expenseItemId, cur);
// //       // Update local state immediately so value shows without reload
// //       const saved = res.data.data;
// //       if (saved) {
// //         setItems(prev => prev.map(i =>
// //           i.expense_item_id === expenseItemId
// //             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
// //             : i
// //         ));
// //       }
// //       onItemUpdate();
// //       return res.data;
// //     })();
// //     toast.promise(promise, {
// //       loading: 'Saving…',
// //       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
// //       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
// //     });
// //     try { await promise; } catch {}
// //     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

// //   const handlePastSem1Change = (id: number, value: number) =>
// //     setPastSem1Edits(prev => new Map(prev).set(id, value));

// //   const handlePastSem1Blur = async (expenseItemId: number) => {
// //     const edit = pastSem1Edits.get(expenseItemId);
// //     if (edit === undefined) return;
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
// //     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
// //     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
// //     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
// //     if (!targetId || !planId) return;
// //     const clamped = Math.min(Math.max(edit, 0), cap);
// //     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
// //     if (clamped === item.pastSem1) {
// //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       return;
// //     }
// //     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
// //       // Update local state immediately — don't wait for full reload
// //       setItems(prev => prev.map(i =>
// //         i.expense_item_id === expenseItemId
// //           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
// //       ));
// //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //     })();
// //     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
// //     try { await promise; } catch {}
// //     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   };

// //   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
// //     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
// //     if (!item) return;
// //     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
// //     if (!confirm('Remove this item?')) return;
// //     try {
// //       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
// //       toast.success('Item deleted'); onItemUpdate();
// //     } catch { toast.error('Failed to delete item.'); }
// //   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

// //   const handleRecommendationChange = useCallback((id: number, value: string) =>
// //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

// //   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item || item.dept_bp_form2_item_id === 0) return;
// //     const cur = item.recommendation ?? null;
// //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// //     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
// //     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
// //       savedRecommendations.current.set(expenseItemId, cur);
// //     })();
// //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

// //   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
// //     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

// //   const handleAipRecommendationBlur = useCallback(async (id: number) => {
// //     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
// //     if (!item) return;
// //     const cur = (item as any).recommendation ?? null;
// //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// //     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
// //     setSavingAipRecommendations(prev => new Set(prev).add(id));
// //     const promise = (async () => {
// //       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
// //       savedAipRecommendations.current.set(id, cur);
// //     })();
// //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
// //   }, [aipItems, savingAipRecommendations]);

// //   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

// //   const handleObligationChange = (expenseItemId: number, value: number) =>
// //     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

// //   const handleObligationBlur = async (expenseItemId: number) => {
// //     const edit = obligationEdits.get(expenseItemId);
// //     if (edit === undefined) return;
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const clamped = Math.max(edit, 0);
// //     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
// //     if (clamped === savedObligations.current.get(expenseItemId)) {
// //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       return;
// //     }
// //     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// //     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
// //     setSavingObligations(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       if (item.pastObligationItemId) {
// //         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
// //       } else {
// //         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
// //           expense_item_id: expenseItemId,
// //           obligation_amount: clamped,
// //         });
// //         const newItemId = res.data.data?.dept_bp_form2_item_id;
// //         setItems(prev => prev.map(i =>
// //           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
// //         ));
// //         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
// //         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
// //           expense_item_id: expenseItemId,
// //         }).catch(() => {}); // ignore 422 duplicate
// //         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
// //           expense_item_id: expenseItemId,
// //         }).catch(() => {}); // ignore 422 duplicate
// //       }
// //       savedObligations.current.set(expenseItemId, clamped);
// //       // Update local state immediately so amount shows without reload
// //       setItems(prev => prev.map(i =>
// //         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
// //       ));
// //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       onItemUpdate();
// //     })();
// //     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   };

// //   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
// //     const key = `${id}_${field}`;
// //     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
// //   };

// //   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
// //     const digits = rawValue.replace(/[^0-9]/g, '');
// //     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
// //     const num = digits === '' ? 0 : parseInt(digits, 10);
// //     if (field === 'proposed') handleProposedChange(id, num);
// //     else if (field === 'sem1') handlePastSem1Change(id, num);
// //     else handleObligationChange(id, num);
// //   };

// //   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
// //     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
// //     if (field === 'proposed') handleBlur(id);
// //     else if (field === 'sem1') handlePastSem1Blur(id);
// //     else handleObligationBlur(id);
// //   };

// //   const itemsByClassification = useMemo(() =>
// //     classifications
// //       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
// //       .map(c => ({
// //         ...c,
// //         items: items
// //           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// //           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// //       })), [classifications, items]);

// //   // Grand totals: account for in-flight pastSem1Edits so subtotals calculate live
// //   const grandTotals = useMemo(() => {
// //     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
// //     for (const i of items) {
// //       const sem1 = pastSem1Edits.has(i.expense_item_id)
// //         ? pastSem1Edits.get(i.expense_item_id)!
// //         : i.pastSem1;
// //       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
// //       const sem2 = pastSem1Edits.has(i.expense_item_id)
// //         ? Math.max(cap - sem1, 0)
// //         : i.pastSem2;
// //       pastSem1  += sem1;
// //       pastSem2  += sem2;
// //       pastTotal += i.pastTotal;
// //       proposed  += Number(i.total_amount);
// //     }
// //     return { pastSem1, pastSem2, pastTotal, proposed };
// //   }, [items, pastSem1Edits]);

// //   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
// //   const calamityTotal = calamityData?.calamity_fund ?? 0;

// //   const grandFinal = useMemo(() => ({
// //     pastSem1:  grandTotals.pastSem1,
// //     pastSem2:  grandTotals.pastSem2,
// //     pastTotal: grandTotals.pastTotal,
// //     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
// //   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

// //   const prevYear = Number(plan.budget_plan?.year) - 1;
// //   const currYear = plan.budget_plan?.year;
// //   const hasRows  = items.length > 0 || aipItems.length > 0;

// //   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
// //   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

// //   const hasAipSection      = aipItems.length > 0;
// //   const hasCalamitySection = isSpecialAccount;

// //   let gIdx = 0;

// //   return (
// //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// //       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
// //         <div>
// //           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
// //           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
// //             Programmed Appropriation and Obligation by Object of Expenditures
// //           </h3>
// //         </div>
// //       </div>

// //       <div className="overflow-x-auto">
// //         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

// //           <colgroup>
// //             {COL_WIDTHS.map((w, i) => {
// //               if ((i === 2 || i === 9) && !isAdmin) return null;
// //               return <col key={i} style={{ width: w }} />;
// //             })}
// //           </colgroup>

// //           {/* ── Main thead ──────────────────────────────────────────────── */}
// //           <thead className="sticky top-0 z-10">
// //             <tr>
// //               <th className={TH} rowSpan={2}>Acct Code</th>
// //               <th className={TH} rowSpan={2}>Object of Expenditure</th>

// //               {isAdmin && (
// //                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
// //                   Past Year ({Number(plan.budget_plan?.year) - 2})
// //                 </th>
// //               )}

// //               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
// //                 Appropriation ({prevYear})
// //               </th>

// //               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

// //               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
// //               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
// //               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
// //             </tr>
// //             <tr>
// //               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
// //               <th className={TH_APP}>Sem 2</th>
// //               <th className={TH_APP}>Total</th>
// //             </tr>
// //           </thead>

// //           <tbody>
// //             {itemsByClassification.map((cls, clsIndex) => {
// //               const isPS = cls.expense_class_id === PS_CLASS_ID;
// //               const canEdit     = isEditable && (!isPS || isAdmin);
// //               const canEditSem1 = isEditable && (isAdmin || !isPS);

// //               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
// //                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

// //               // Subtotals: use live pastSem1Edits for past year columns
// //               const clsSem1 = cls.items.reduce((s, i) => {
// //                 const sem1 = pastSem1Edits.has(i.expense_item_id)
// //                   ? pastSem1Edits.get(i.expense_item_id)!
// //                   : i.pastSem1;
// //                 return s + sem1;
// //               }, 0);
// //               const clsSem2 = cls.items.reduce((s, i) => {
// //                 if (pastSem1Edits.has(i.expense_item_id)) {
// //                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
// //                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
// //                   return s + Math.max(cap - sem1, 0);
// //                 }
// //                 return s + i.pastSem2;
// //               }, 0);
// //               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
// //               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
// //               const clsDiff = clsProp - clsPast;
// //               const clsPct  = pctOf(clsPast, clsDiff);

// //               const isLastCls       = clsIndex === itemsByClassification.length - 1;
// //               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
// //               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

// //               return (
// //                 <React.Fragment key={cls.expense_class_id}>

// //                   {/* Section divider */}
// //                   <tr className="bg-gray-50 border-y border-gray-200">
// //                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                       <div className="flex items-center justify-between">
// //                         <div className="flex items-center gap-2">
// //                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
// //                           {isPS && (
// //                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
// //                               Auto-filled from Personnel Services
// //                             </span>
// //                           )}
// //                         </div>
// //                         <div className="flex items-center gap-1.5">
// //                           {/* Admin: Add item to past year (pastYearPlan) */}
// //                           {isAdmin && (
// //                             <Tooltip>
// //                               <TooltipTrigger asChild>
// //                                 <Button size="sm" variant="outline"
// //                                   className="gap-1.5 text-xs h-7 border-blue-200 text-blue-600 hover:text-blue-900 bg-blue-50"
// //                                   onClick={() => setPastModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// //                                   <PlusIcon className="w-3.5 h-3.5" /> Past Year Item
// //                                 </Button>
// //                               </TooltipTrigger>
// //                               <TooltipContent side="left" className="text-xs">Add item to past year ({prevYear})</TooltipContent>
// //                             </Tooltip>
// //                           )}
// //                           {canEdit && (
// //                             <Tooltip>
// //                               <TooltipTrigger asChild>
// //                                 <Button size="sm" variant="outline"
// //                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
// //                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// //                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
// //                                 </Button>
// //                               </TooltipTrigger>
// //                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
// //                             </Tooltip>
// //                           )}
// //                         </div>
// //                       </div>
// //                     </td>
// //                   </tr>

// //                   {cls.items.length === 0 ? (
// //                     <>
// //                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
// //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //                     </>
// //                   ) : (
// //                     <>
// //                       {cls.items.map(item => {
// //                         const delay    = Math.min(gIdx * 18, 280);
// //                         gIdx++;
// //                         const past     = item.pastTotal;
// //                         const proposed = Number(item.total_amount);
// //                         const d        = incr(past, proposed);
// //                         const p        = pctOf(past, d);
// //                         const isSaving = savingItems.has(item.expense_item_id);

// //                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
// //                           ? pastSem1Edits.get(item.expense_item_id)!
// //                           : item.pastSem1;
// //                         const sem2Cap  = past > 0 ? past : proposed;
// //                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
// //                           ? sem2Cap - dispSem1
// //                           : item.pastSem2;

// //                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

// //                         return (
// //                           <tr
// //                             key={item.expense_item_id}
// //                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
// //                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
// //                           >
// //                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
// //                             <td className={cn(TD, 'text-gray-800 font-medium')}>
// //                               <div className="flex items-center justify-between gap-1">
// //                                 <span>{item.expense_item?.expense_class_item_name}</span>
// //                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
// //                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
// //                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
// //                                     <TrashIcon className="w-3.5 h-3.5" />
// //                                   </button>
// //                                 )}
// //                               </div>
// //                             </td>

// //                             {/* ── Obligation — blue, admin only ─────────── */}
// //                             {isAdmin && (
// //                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'obligation',
// //                                     obligationEdits.has(item.expense_item_id)
// //                                       ? obligationEdits.get(item.expense_item_id)!
// //                                       : item.pastObligation)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
// //                                   disabled={savingObligations.has(item.expense_item_id)}
// //                                   className={inputAppCls}
// //                                 />
// //                               </td>
// //                             )}

// //                             {/* ── Sem 1 — blue ────────────────────────────── */}
// //                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
// //                               {sem1Editable ? (
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
// //                                   disabled={savingPastItems.has(item.expense_item_id)}
// //                                   className={inputAppCls}
// //                                 />
// //                               ) : (
// //                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
// //                               )}
// //                             </td>

// //                             {/* ── Sem 2 — blue ────────────────────────────── */}
// //                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

// //                             {/* ── Past Total — blue ────────────────────────── */}
// //                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

// //                             {/* ── Proposed — orange ────────────────────────── */}
// //                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
// //                               {canEdit ? (
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
// //                                   disabled={isSaving} className={inputCls} />
// //                               ) : (
// //                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
// //                                   {proposed === 0 ? '–' : fmtP(proposed)}
// //                                 </span>
// //                               )}
// //                             </td>

// //                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
// //                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

// //                             {/* Recommendation */}
// //                             {isAdmin && (
// //                               <td className={TD}>
// //                                 {isEditable && (isAdmin || !isPS) ? (
// //                                   <input type="text" value={item.recommendation ?? ''}
// //                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// //                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// //                                     disabled={savingRecommendations.has(item.expense_item_id)}
// //                                     placeholder="Add note…" maxLength={255} className={recCls} />
// //                                 ) : (
// //                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// //                                 )}
// //                               </td>
// //                             )}
// //                           </tr>
// //                         );
// //                       })}

// //                       {/* Classification subtotal */}
// //                       <tr className="border-t border-gray-200">
// //                         <td className="bg-gray-100" />
// //                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
// //                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
// //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
// //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
// //                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
// //                         </td>
// //                         {isAdmin && <td className="bg-gray-100" />}
// //                       </tr>

// //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //                     </>
// //                   )}
// //                 </React.Fragment>
// //               );
// //             })}

// //             {/* ── Special Programs (AIP) ── */}
// //             {aipItems.length > 0 && (
// //               <React.Fragment>
// //                 <tr className="bg-gray-50 border-y border-gray-200">
// //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                     <div className="flex items-center gap-2">
// //                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
// //                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
// //                     </div>
// //                   </td>
// //                   <td className="bg-gray-50" />
// //                 </tr>

// //                 {aipItems.map(item => {
// //                   const delay = Math.min(gIdx * 18, 280);
// //                   gIdx++;
// //                   return (
// //                     <tr key={item.dept_bp_form4_item_id}
// //                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
// //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
// //                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
// //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
// //                       {isAdmin && (
// //                         <td className={TD}>
// //                           {isEditable ? (
// //                             <input type="text" value={(item as any).recommendation ?? ''}
// //                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// //                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// //                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// //                               placeholder="Add note…" maxLength={255} className={recCls} />
// //                           ) : (
// //                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// //                           )}
// //                         </td>
// //                       )}
// //                     </tr>
// //                   );
// //                 })}

// //                 <tr className="border-t border-gray-200">
// //                   <td className="bg-gray-100" />
// //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
// //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// //                   {isAdmin && <td className="bg-gray-100" />}
// //                 </tr>

// //                 {<SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //               </React.Fragment>
// //             )}

// //             {/* ── 5% Calamity Fund ── */}
// //             {isSpecialAccount && (
// //               <React.Fragment>
// //                 <tr className="bg-gray-50 border-y border-gray-200">
// //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                     <div className="flex items-center gap-2">
// //                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
// //                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
// //                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
// //                       </span>
// //                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
// //                     </div>
// //                   </td>
// //                   <td className="bg-gray-50" />
// //                 </tr>

// //                 {[
// //                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
// //                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
// //                 ].map(row => {
// //                   const delay = Math.min(gIdx * 18, 280);
// //                   gIdx++;
// //                   return (
// //                     <tr key={row.code}
// //                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
// //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
// //                       <td className={cn(TD, 'text-gray-800')}>
// //                         {row.label}
// //                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
// //                       </td>
// //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
// //                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
// //                       </td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
// //                       <td />
// //                     </tr>
// //                   );
// //                 })}

// //                 <tr className="border-t border-gray-200">
// //                   <td className="bg-gray-100" />
// //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
// //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
// //                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
// //                   </td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// //                   {isAdmin && <td className="bg-gray-100" />}
// //                 </tr>

// //                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
// //                   <tr>
// //                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
// //                       Base:{' '}
// //                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
// //                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
// //                     </td>
// //                   </tr>
// //                 )}
// //               </React.Fragment>
// //             )}
// //           </tbody>

// //           {/* ── Grand Total ── */}
// //           <tfoot>
// //             {hasRows && (
// //               <tr className="bg-gray-900 text-white">
// //                 <td className="px-3 py-3" />
// //                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
// //                   Grand Total
// //                   {isSpecialAccount && calamityTotal > 0 && (
// //                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
// //                   )}
// //                 </td>
// //                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// //                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
// //                 </td>
// //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// //                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
// //                 </td>
// //                 {isAdmin && <td className="border-l border-gray-700" />}
// //               </tr>
// //             )}
// //           </tfoot>
// //         </table>
// //       </div>

// //       {modalState && (
// //         <AddItemModal
// //           isOpen={modalState.isOpen}
// //           onClose={() => setModalState(null)}
// //           classificationId={modalState.classificationId}
// //           classificationName={modalState.classificationName}
// //           planId={plan.dept_budget_plan_id}
// //           expenseItems={expenseItems}
// //           existingItemIds={items.map(i => i.expense_item_id)}
// //           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
// //         />
// //       )}

// //       {/* Past-year add item modal — admin adds items to the PAST year plan (prevYear appropriation) */}
// //       {pastModalState && pastYearPlan && (
// //         <AddItemModal
// //           isOpen={pastModalState.isOpen}
// //           onClose={() => setPastModalState(null)}
// //           classificationId={pastModalState.classificationId}
// //           classificationName={pastModalState.classificationName}
// //           planId={pastYearPlan.dept_budget_plan_id}
// //           expenseItems={expenseItems}
// //           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
// //           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // export default Form2;

// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import API from '../../services/api';
// import {
//   DepartmentBudgetPlan,
//   ExpenseClassification,
//   ExpenseItem,
//   DepartmentBudgetPlanItem,
//   DepartmentBudgetPlanForm4Item,
// } from '../../types/api';
// import AddItemModal from './AddItemModal';
// import { Button } from '@/src/components/ui/button';
// import { toast } from 'sonner';
// import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// import { cn } from '@/src/lib/utils';
// import { useCalamityFund } from '../../hooks/useCalamityFund';


// // ─── Column color tokens ──────────────────────────────────────────────────────
// // Appropriation (past year) → blue
// // Proposed (budget year)    → orange

// const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// const C_APP_SUB = 'bg-blue-50   border-blue-200';
// const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // ─── Animation keyframes ──────────────────────────────────────────────────────

// const ANIM_CSS = `
// @keyframes _rowIn {
//   from { opacity: 0; transform: translateY(6px); }
//   to   { opacity: 1; transform: translateY(0); }
// }
// @media (prefers-reduced-motion: reduce) {
//   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// }
// `;
// let _animInjected = false;
// function ensureAnim() {
//   if (_animInjected || typeof document === 'undefined') return;
//   const el = document.createElement('style');
//   el.textContent = ANIM_CSS;
//   document.head.appendChild(el);
//   _animInjected = true;
// }

// // ─── Dept → income-fund source key ───────────────────────────────────────────

// const getSourceForDepartment = (dept?: {
//   dept_abbreviation?: string; dept_name?: string;
// }): string | undefined => {
//   if (!dept) return undefined;
//   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
//   const name = dept.dept_name?.toLowerCase() ?? '';
//   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//   return undefined;
// };

// const PS_CLASS_ID = 1;

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Form2Props {
//   plan: DepartmentBudgetPlan;
//   pastYearPlan: DepartmentBudgetPlan | null;
//   obligationYearPlan: DepartmentBudgetPlan | null;
//   classifications: ExpenseClassification[];
//   expenseItems: ExpenseItem[];
//   isEditable: boolean;
//   isAdmin?: boolean;
//   onItemUpdate: () => void;
// }

// interface ItemWithMeta extends DepartmentBudgetPlanItem {
//   pastTotal: number; pastSem1: number; pastSem2: number;
//   pastObligation: number;
//   pastObligationItemId?: number;
//   pastItemId?: number; expense_item?: ExpenseItem;
//   recommendation?: string | null;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// const fmtP  = (n: number) => `₱${fmt(n)}`;
// const incr  = (past: number, prop: number) => prop - past;
// const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// const TD      = 'px-3 py-2.5 text-[12px]';
// const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // ── Appropriation (blue) ───────────────────────────────────────────────────────
// const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// const TD_APP  = `${TD_M} bg-blue-50/30`;

// // ── Proposed (orange) ─────────────────────────────────────────────────────────
// const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// const TD_PRO  = `${TD_M} bg-orange-50/30`;

// const inputCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// const inputAppCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// const recCls =
//   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // ─── Sub-header ───────────────────────────────────────────────────────────────

// const SubHeader: React.FC<{
//   prevYear: number | string | undefined;
//   currYear: number | string | undefined;
//   isAdmin?: boolean;
// }> = ({ prevYear, currYear, isAdmin }) => (
//   <>
//     <tr>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
//       {isAdmin && (
//         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
//           Past Year ({Number(prevYear) - 1})
//         </th>
//       )}
//       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
//         Appropriation ({prevYear})
//       </th>
//       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
//       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
//     </tr>
//     <tr>
//       <th className={TH_APP}>Sem 1</th>
//       <th className={TH_APP}>Sem 2</th>
//       <th className={TH_APP}>Total</th>
//     </tr>
//   </>
// );

// // ─── Component ────────────────────────────────────────────────────────────────

// const Form2: React.FC<Form2Props> = ({
//   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// }) => {
//   useEffect(() => { ensureAnim(); }, []);

//   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
//   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

//   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
//   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
//   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
//   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

//   const savedValues             = useRef<Map<number, number>>(new Map());
//   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
//   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

//   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
//   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
//   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
//   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
//   const [modalState,        setModalState]        = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);
//   const [pastModalState, setPastModalState] = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);

//   const savedObligations = useRef<Map<number, number>>(new Map());

//   const incomeSource = getSourceForDepartment(plan.department);
//   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
//     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

//   const expenseItemMap = useMemo(
//     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
//     [expenseItems]
//   );

//   useEffect(() => {
//     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
//       .then(res => {
//         const raw = res.data.data || [];
//         setAipItems(raw.map((item: any) => ({
//           ...item,
//           ps_amount:    parseFloat(item.ps_amount)    || 0,
//           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
//           co_amount:    parseFloat(item.co_amount)    || 0,
//           total_amount: parseFloat(item.total_amount) || 0,
//           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
//           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
//           recommendation: item.recommendation ?? null,
//         })));
//         raw.forEach((item: any) =>
//           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
//         );
//       })
//       .catch(console.error);
//   }, [plan.dept_budget_plan_id]);

//   // ── Effect 1: Rebuild full items list when plan/pastYear changes ─────────
//   // Does NOT depend on obligationYearPlan so a silent obligation refresh
//   // from LBPForms won't wipe the entire local state.
//   useEffect(() => {
//     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
//     pastYearPlan?.items.forEach(item => {
//       pastData.set(item.expense_item_id, {
//         total:  Number(item.total_amount) || 0,
//         sem1:   Number((item as any).sem1_amount) || 0,
//         sem2:   Number((item as any).sem2_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     // Seed obligation data from obligationYearPlan at build time
//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan?.items.forEach(item => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number((item as any).obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     const merged: ItemWithMeta[] = plan.items.map(planItem => {
//       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0 };
//       return {
//         ...planItem,
//         expense_item:         expenseItemMap.get(planItem.expense_item_id),
//         pastTotal:            past.total,
//         pastSem1:             past.sem1,
//         pastSem2:             past.sem2,
//         pastObligation:       obligationData.get(planItem.expense_item_id)?.amount ?? 0,
//         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
//         pastItemId:           past.itemId || undefined,
//         recommendation:       (planItem as any).recommendation ?? null,
//       };
//     });

//     setItems(merged);
//     setPastSem1Edits(new Map());
//     setObligationEdits(new Map());
//     merged.forEach(item => {
//       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
//       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
//       savedObligations.current.set(item.expense_item_id, item.pastObligation);
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [plan, pastYearPlan, expenseItemMap]); // intentionally excludes obligationYearPlan

//   // ── Effect 2: Patch ONLY obligation fields when obligationYearPlan refreshes
//   // This runs after LBPForms silently re-fetches the obligation year plan.
//   // It MERGES updated obligation data into existing items without rebuilding,
//   // so any in-flight edits or local state for other fields are preserved.
//   useEffect(() => {
//     if (!obligationYearPlan) return;

//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan.items.forEach((item: any) => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number(item.obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     setItems(prev => prev.map(i => {
//       const obl = obligationData.get(i.expense_item_id);
//       if (!obl) return i;
//       // Only update if the value actually changed (avoid unnecessary re-renders)
//       if (obl.amount === i.pastObligation && obl.itemId === i.pastObligationItemId) return i;
//       // Update savedObligations ref so the blur guard stays accurate
//       savedObligations.current.set(i.expense_item_id, obl.amount);
//       return { ...i, pastObligation: obl.amount, pastObligationItemId: obl.itemId };
//     }));
//   }, [obligationYearPlan]);

//   const handleProposedChange = useCallback((id: number, value: number) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

//   const handleBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const cur = Number(item.total_amount);
//     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
//     setSavingItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       const payload = { total_amount: cur };
//       const res = item.dept_bp_form2_item_id === 0
//         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
//         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
//       savedValues.current.set(expenseItemId, cur);
//       // Update local state immediately so value shows without reload
//       const saved = res.data.data;
//       if (saved) {
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
//             : i
//         ));
//       }
//       onItemUpdate();
//       return res.data;
//     })();
//     toast.promise(promise, {
//       loading: 'Saving…',
//       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
//       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
//     });
//     try { await promise; } catch {}
//     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

//   const handlePastSem1Change = (id: number, value: number) =>
//     setPastSem1Edits(prev => new Map(prev).set(id, value));

//   const handlePastSem1Blur = async (expenseItemId: number) => {
//     const edit = pastSem1Edits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;

//     const hasPastRecord = item.pastTotal > 0 && !!item.pastItemId;
//     const pastPlanId    = pastYearPlan?.dept_budget_plan_id;

//     // Admin editing past year sem1:
//     //   - If a past-year record exists → PUT to pastYearPlan
//     //   - If no past-year record yet   → POST to pastYearPlan to create it first
//     // Non-admin: can only split existing sem1 on their own draft plan
//     if (isAdmin && !hasPastRecord) {
//       // Guard: pastYearPlan must be available for admin to create a new past-year item
//       if (!pastPlanId) {
//         toast.error('Past year plan not found for this department.');
//         setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//         return;
//       }
//     }

//     const cap      = hasPastRecord ? item.pastTotal : Number(item.total_amount);
//     const clamped  = Math.min(Math.max(edit, 0), cap);
//     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === item.pastSem1) {
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }

//     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (hasPastRecord) {
//         // Update existing past-year item
//         await API.put(
//           `/department-budget-plans/${pastPlanId}/items/${item.pastItemId}`,
//           { sem1_amount: clamped }
//         );
//       } else if (isAdmin && pastPlanId) {
//         // Admin: no past-year record → create one on pastYearPlan
//         const res = await API.post(
//           `/department-budget-plans/${pastPlanId}/items`,
//           { expense_item_id: expenseItemId, sem1_amount: clamped, sem2_amount: 0, total_amount: clamped }
//         );
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, pastItemId: newItemId, pastTotal: clamped } : i
//         ));
//       } else {
//         // Non-admin fallback (should not normally reach here)
//         const targetId = item.dept_bp_form2_item_id;
//         const planId   = plan.dept_budget_plan_id;
//         if (!targetId || !planId) return;
//         await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
//       }
//       // Update local sem1/sem2 display immediately
//       const newTotal = hasPastRecord ? item.pastTotal : clamped;
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId
//           ? { ...i, pastSem1: clamped, pastSem2: newTotal - clamped } : i
//       ));
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//     })();
//     toast.promise(promise, { loading: 'Saving Sem 1…', success: 'Sem 1 saved', error: (err: any) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
//     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
//     if (!item) return;
//     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
//     if (!confirm('Remove this item?')) return;
//     try {
//       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
//       toast.success('Item deleted'); onItemUpdate();
//     } catch { toast.error('Failed to delete item.'); }
//   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

//   const handleRecommendationChange = useCallback((id: number, value: string) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item || item.dept_bp_form2_item_id === 0) return;
//     const cur = item.recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
//     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
//       savedRecommendations.current.set(expenseItemId, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

//   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
//     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleAipRecommendationBlur = useCallback(async (id: number) => {
//     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
//     if (!item) return;
//     const cur = (item as any).recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
//     setSavingAipRecommendations(prev => new Set(prev).add(id));
//     const promise = (async () => {
//       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
//       savedAipRecommendations.current.set(id, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
//   }, [aipItems, savingAipRecommendations]);

//   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

//   const handleObligationChange = (expenseItemId: number, value: number) =>
//     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

//   const handleObligationBlur = async (expenseItemId: number) => {
//     const edit = obligationEdits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const clamped = Math.max(edit, 0);
//     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === savedObligations.current.get(expenseItemId)) {
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }
//     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
//     setSavingObligations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (item.pastObligationItemId) {
//         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
//       } else {
//         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
//           expense_item_id: expenseItemId,
//           obligation_amount: clamped,
//         });
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
//         ));
//         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
//         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {}); // ignore 422 duplicate
//         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {}); // ignore 422 duplicate
//       }
//       savedObligations.current.set(expenseItemId, clamped);
//       // Update local state immediately so amount shows without reload
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
//       ));
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       onItemUpdate();
//     })();
//     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
//     try { await promise; } catch {}
//     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
//     const key = `${id}_${field}`;
//     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
//   };

//   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
//     const digits = rawValue.replace(/[^0-9]/g, '');
//     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
//     const num = digits === '' ? 0 : parseInt(digits, 10);
//     if (field === 'proposed') handleProposedChange(id, num);
//     else if (field === 'sem1') handlePastSem1Change(id, num);
//     else handleObligationChange(id, num);
//   };

//   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
//     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
//     if (field === 'proposed') handleBlur(id);
//     else if (field === 'sem1') handlePastSem1Blur(id);
//     else handleObligationBlur(id);
//   };

//   const itemsByClassification = useMemo(() =>
//     classifications
//       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
//       .map(c => ({
//         ...c,
//         items: items
//           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
//           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
//       })), [classifications, items]);

//   // Grand totals: account for in-flight pastSem1Edits so subtotals calculate live
//   const grandTotals = useMemo(() => {
//     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
//     for (const i of items) {
//       const sem1 = pastSem1Edits.has(i.expense_item_id)
//         ? pastSem1Edits.get(i.expense_item_id)!
//         : i.pastSem1;
//       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//       const sem2 = pastSem1Edits.has(i.expense_item_id)
//         ? Math.max(cap - sem1, 0)
//         : i.pastSem2;
//       pastSem1  += sem1;
//       pastSem2  += sem2;
//       pastTotal += i.pastTotal;
//       proposed  += Number(i.total_amount);
//     }
//     return { pastSem1, pastSem2, pastTotal, proposed };
//   }, [items, pastSem1Edits]);

//   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
//   const calamityTotal = calamityData?.calamity_fund ?? 0;

//   const grandFinal = useMemo(() => ({
//     pastSem1:  grandTotals.pastSem1,
//     pastSem2:  grandTotals.pastSem2,
//     pastTotal: grandTotals.pastTotal,
//     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
//   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

//   const prevYear = Number(plan.budget_plan?.year) - 1;
//   const currYear = plan.budget_plan?.year;
//   const hasRows  = items.length > 0 || aipItems.length > 0;

//   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
//   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

//   const hasAipSection      = aipItems.length > 0;
//   const hasCalamitySection = isSpecialAccount;

//   let gIdx = 0;

//   return (
//     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

//       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
//           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
//             Programmed Appropriation and Obligation by Object of Expenditures
//           </h3>
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

//           <colgroup>
//             {COL_WIDTHS.map((w, i) => {
//               if ((i === 2 || i === 9) && !isAdmin) return null;
//               return <col key={i} style={{ width: w }} />;
//             })}
//           </colgroup>

//           {/* ── Main thead ──────────────────────────────────────────────── */}
//           <thead className="sticky top-0 z-10">
//             <tr>
//               <th className={TH} rowSpan={2}>Acct Code</th>
//               <th className={TH} rowSpan={2}>Object of Expenditure</th>

//               {isAdmin && (
//                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
//                   Past Year ({Number(plan.budget_plan?.year) - 2})
//                 </th>
//               )}

//               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
//                 Appropriation ({prevYear})
//               </th>

//               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

//               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
//               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
//               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
//             </tr>
//             <tr>
//               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
//               <th className={TH_APP}>Sem 2</th>
//               <th className={TH_APP}>Total</th>
//             </tr>
//           </thead>

//           <tbody>
//             {itemsByClassification.map((cls, clsIndex) => {
//               const isPS = cls.expense_class_id === PS_CLASS_ID;
//               const canEdit     = isEditable && (!isPS || isAdmin);
//               const canEditSem1 = isEditable && (isAdmin || !isPS);

//               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
//                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

//               // Subtotals: use live pastSem1Edits for past year columns
//               const clsSem1 = cls.items.reduce((s, i) => {
//                 const sem1 = pastSem1Edits.has(i.expense_item_id)
//                   ? pastSem1Edits.get(i.expense_item_id)!
//                   : i.pastSem1;
//                 return s + sem1;
//               }, 0);
//               const clsSem2 = cls.items.reduce((s, i) => {
//                 if (pastSem1Edits.has(i.expense_item_id)) {
//                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
//                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//                   return s + Math.max(cap - sem1, 0);
//                 }
//                 return s + i.pastSem2;
//               }, 0);
//               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
//               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
//               const clsDiff = clsProp - clsPast;
//               const clsPct  = pctOf(clsPast, clsDiff);

//               const isLastCls       = clsIndex === itemsByClassification.length - 1;
//               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
//               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

//               return (
//                 <React.Fragment key={cls.expense_class_id}>

//                   {/* Section divider */}
//                   <tr className="bg-gray-50 border-y border-gray-200">
//                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
//                           {isPS && (
//                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
//                               Auto-filled from Personnel Services
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-1.5">
                          
//                           {canEdit && (
//                             <Tooltip>
//                               <TooltipTrigger asChild>
//                                 <Button size="sm" variant="outline"
//                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
//                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
//                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
//                                 </Button>
//                               </TooltipTrigger>
//                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
//                             </Tooltip>
//                           )}
//                         </div>
//                       </div>
//                     </td>
//                   </tr>

//                   {cls.items.length === 0 ? (
//                     <>
//                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   ) : (
//                     <>
//                       {cls.items.map(item => {
//                         const delay    = Math.min(gIdx * 18, 280);
//                         gIdx++;
//                         const past     = item.pastTotal;
//                         const proposed = Number(item.total_amount);
//                         const d        = incr(past, proposed);
//                         const p        = pctOf(past, d);
//                         const isSaving = savingItems.has(item.expense_item_id);

//                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
//                           ? pastSem1Edits.get(item.expense_item_id)!
//                           : item.pastSem1;
//                         const sem2Cap  = past > 0 ? past : proposed;
//                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
//                           ? sem2Cap - dispSem1
//                           : item.pastSem2;

//                         // Admin can edit Sem 1 whenever pastYearPlan is available (even if past=0 —
//                         // they may be entering the appropriation from scratch for a special account).
//                         // Non-admin can only split an existing past total.
//                         const sem1Editable = canEditSem1 && (
//                           (isAdmin && !!pastYearPlan) || (!isAdmin && past > 0)
//                         );

//                         return (
//                           <tr
//                             key={item.expense_item_id}
//                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
//                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
//                           >
//                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
//                             <td className={cn(TD, 'text-gray-800 font-medium')}>
//                               <div className="flex items-center justify-between gap-1">
//                                 <span>{item.expense_item?.expense_class_item_name}</span>
//                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
//                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
//                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
//                                     <TrashIcon className="w-3.5 h-3.5" />
//                                   </button>
//                                 )}
//                               </div>
//                             </td>

//                             {/* ── Obligation — blue, admin only ─────────── */}
//                             {isAdmin && (
//                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'obligation',
//                                     obligationEdits.has(item.expense_item_id)
//                                       ? obligationEdits.get(item.expense_item_id)!
//                                       : item.pastObligation)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
//                                   disabled={savingObligations.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               </td>
//                             )}

//                             {/* ── Sem 1 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                               {sem1Editable ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
//                                   disabled={savingPastItems.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               ) : (
//                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
//                               )}
//                             </td>

//                             {/* ── Sem 2 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

//                             {/* ── Past Total — blue ────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

//                             {/* ── Proposed — orange ────────────────────────── */}
//                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
//                               {canEdit ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
//                                   disabled={isSaving} className={inputCls} />
//                               ) : (
//                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
//                                   {proposed === 0 ? '–' : fmtP(proposed)}
//                                 </span>
//                               )}
//                             </td>

//                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
//                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

//                             {/* Recommendation */}
//                             {isAdmin && (
//                               <td className={TD}>
//                                 {isEditable && (isAdmin || !isPS) ? (
//                                   <input type="text" value={item.recommendation ?? ''}
//                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
//                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
//                                     disabled={savingRecommendations.has(item.expense_item_id)}
//                                     placeholder="Add note…" maxLength={255} className={recCls} />
//                                 ) : (
//                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
//                                 )}
//                               </td>
//                             )}
//                           </tr>
//                         );
//                       })}

//                       {/* Classification subtotal */}
//                       <tr className="border-t border-gray-200">
//                         <td className="bg-gray-100" />
//                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
//                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
//                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
//                         </td>
//                         {isAdmin && <td className="bg-gray-100" />}
//                       </tr>

//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   )}
//                 </React.Fragment>
//               );
//             })}

//             {/* ── Special Programs (AIP) ── */}
//             {aipItems.length > 0 && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
//                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {aipItems.map(item => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   return (
//                     <tr key={item.dept_bp_form4_item_id}
//                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
//                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
//                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
//                       {isAdmin && (
//                         <td className={TD}>
//                           {isEditable ? (
//                             <input type="text" value={(item as any).recommendation ?? ''}
//                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
//                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
//                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
//                               placeholder="Add note…" maxLength={255} className={recCls} />
//                           ) : (
//                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
//                           )}
//                         </td>
//                       )}
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {<SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//               </React.Fragment>
//             )}

//             {/* ── 5% Calamity Fund ── */}
//             {isSpecialAccount && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
//                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
//                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
//                       </span>
//                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {[
//                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
//                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
//                 ].map(row => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   return (
//                     <tr key={row.code}
//                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
//                       <td className={cn(TD, 'text-gray-800')}>
//                         {row.label}
//                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
//                       </td>
//                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
//                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
//                       </td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
//                       <td />
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
//                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
//                   </td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
//                   <tr>
//                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
//                       Base:{' '}
//                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
//                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             )}
//           </tbody>

//           {/* ── Grand Total ── */}
//           <tfoot>
//             {hasRows && (
//               <tr className="bg-gray-900 text-white">
//                 <td className="px-3 py-3" />
//                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
//                   Grand Total
//                   {isSpecialAccount && calamityTotal > 0 && (
//                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
//                   )}
//                 </td>
//                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
//                 </td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
//                 </td>
//                 {isAdmin && <td className="border-l border-gray-700" />}
//               </tr>
//             )}
//           </tfoot>
//         </table>
//       </div>

//       {modalState && (
//         <AddItemModal
//           isOpen={modalState.isOpen}
//           onClose={() => setModalState(null)}
//           classificationId={modalState.classificationId}
//           classificationName={modalState.classificationName}
//           planId={plan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={items.map(i => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
//         />
//       )}

//       {/* Past-year add item modal — admin adds items to the PAST year plan (prevYear appropriation) */}
//       {pastModalState && pastYearPlan && (
//         <AddItemModal
//           isOpen={pastModalState.isOpen}
//           onClose={() => setPastModalState(null)}
//           classificationId={pastModalState.classificationId}
//           classificationName={pastModalState.classificationName}
//           planId={pastYearPlan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
//         />
//       )}
//     </div>
//   );
// };

// export default Form2;
// // import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// // import API from '../../services/api';
// // import {
// //   DepartmentBudgetPlan,
// //   ExpenseClassification,
// //   ExpenseItem,
// //   DepartmentBudgetPlanItem,
// //   DepartmentBudgetPlanForm4Item,
// // } from '../../types/api';
// // import AddItemModal from './AddItemModal';
// // import { Button } from '@/src/components/ui/button';
// // import { toast } from 'sonner';
// // import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// // import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// // import { cn } from '@/src/lib/utils';
// // import { useCalamityFund } from '../../hooks/useCalamityFund';


// // // ─── Column color tokens ──────────────────────────────────────────────────────
// // // Appropriation (past year) → blue
// // // Proposed (budget year)    → orange

// // const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// // const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// // const C_APP_SUB = 'bg-blue-50   border-blue-200';
// // const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// // const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// // const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// // const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// // const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // // ─── Animation keyframes ──────────────────────────────────────────────────────

// // const ANIM_CSS = `
// // @keyframes _rowIn {
// //   from { opacity: 0; transform: translateY(6px); }
// //   to   { opacity: 1; transform: translateY(0); }
// // }
// // @media (prefers-reduced-motion: reduce) {
// //   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// // }
// // `;
// // let _animInjected = false;
// // function ensureAnim() {
// //   if (_animInjected || typeof document === 'undefined') return;
// //   const el = document.createElement('style');
// //   el.textContent = ANIM_CSS;
// //   document.head.appendChild(el);
// //   _animInjected = true;
// // }

// // // ─── Dept → income-fund source key ───────────────────────────────────────────

// // const getSourceForDepartment = (dept?: {
// //   dept_abbreviation?: string; dept_name?: string;
// // }): string | undefined => {
// //   if (!dept) return undefined;
// //   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
// //   const name = dept.dept_name?.toLowerCase() ?? '';
// //   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
// //   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
// //   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
// //   return undefined;
// // };

// // const PS_CLASS_ID = 1;

// // // ─── Types ────────────────────────────────────────────────────────────────────

// // interface Form2Props {
// //   plan: DepartmentBudgetPlan;
// //   pastYearPlan: DepartmentBudgetPlan | null;
// //   obligationYearPlan: DepartmentBudgetPlan | null;
// //   classifications: ExpenseClassification[];
// //   expenseItems: ExpenseItem[];
// //   isEditable: boolean;
// //   isAdmin?: boolean;
// //   onItemUpdate: () => void;
// // }

// // interface ItemWithMeta extends DepartmentBudgetPlanItem {
// //   pastTotal: number; pastSem1: number; pastSem2: number;
// //   pastObligation: number;
// //   pastObligationItemId?: number;
// //   pastItemId?: number; expense_item?: ExpenseItem;
// //   recommendation?: string | null;
// // }

// // // ─── Helpers ──────────────────────────────────────────────────────────────────

// // const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// // const fmtP  = (n: number) => `₱${fmt(n)}`;
// // const incr  = (past: number, prop: number) => prop - past;
// // const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// // const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// // const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// // const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// // const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// // const TD      = 'px-3 py-2.5 text-[12px]';
// // const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // // ── Appropriation (blue) ───────────────────────────────────────────────────────
// // const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// // const TD_APP  = `${TD_M} bg-blue-50/30`;

// // // ── Proposed (orange) ─────────────────────────────────────────────────────────
// // const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// // const TD_PRO  = `${TD_M} bg-orange-50/30`;

// // const inputCls =
// //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// // const inputAppCls =
// //   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// // const recCls =
// //   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
// //   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // // ─── Sub-header ───────────────────────────────────────────────────────────────

// // // const SubHeader: React.FC<{
// // //   prevYear: number | string | undefined;
// // //   currYear: number | string | undefined;
// // // }> = ({ prevYear, currYear }) => (
// // //   <>
// // //     <tr>
// // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// // //       {/* Appropriation — blue */}
// // //       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// // //         Appropriation ({prevYear})
// // //       </th>
// // //       {/* Proposed — orange */}
// // //       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// // //       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// // //       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>
// // //     </tr>
// // //     <tr>
// // //       <th className={TH_APP}>Sem 1</th>
// // //       <th className={TH_APP}>Sem 2</th>
// // //       <th className={TH_APP}>Total</th>
// // //     </tr>
// // //   </>
// // // );
// //   const SubHeader: React.FC<{
// //     prevYear: number | string | undefined;
// //     currYear: number | string | undefined;
// //     isAdmin?: boolean;
// //   }> = ({ prevYear, currYear, isAdmin }) => (
// //     <>
// //       <tr>
// //         <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
// //         <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
// //         {isAdmin && (
// //           <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
// //             Past Year ({Number(prevYear) - 1})
// //           </th>
// //         )}
// //         <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
// //           Appropriation ({prevYear})
// //         </th>
// //         <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
// //         <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
// //         <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
// //         {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
// //       </tr>
// //       <tr>
// //         <th className={TH_APP}>Sem 1</th>
// //         <th className={TH_APP}>Sem 2</th>
// //         <th className={TH_APP}>Total</th>
// //       </tr>
// //     </>
// //   );

// // // ─── Component ────────────────────────────────────────────────────────────────

// // const Form2: React.FC<Form2Props> = ({
// //   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// // }) => {
// //   useEffect(() => { ensureAnim(); }, []);

// //   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
// //   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

// //   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
// //   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
// //   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
// //   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

// //   const savedValues             = useRef<Map<number, number>>(new Map());
// //   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
// //   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

// //   const [pastSem1Edits,       setPastSem1Edits]       = useState<Map<number, number>>(new Map());
// //   const [obligationEdits,     setObligationEdits]     = useState<Map<number, number>>(new Map());
// //   const [savingObligations,   setSavingObligations]   = useState<Set<number>>(new Set());
// //   const [uploadingObligations,setUploadingObligations]= useState(false);
// //   const [inputDraft,          setInputDraft]          = useState<Map<string, string>>(new Map());
// //   const [modalState,          setModalState]          = useState<{
// //     isOpen: boolean; classificationId: number; classificationName: string;
// //   } | null>(null);
// //   const [pastModalState,      setPastModalState]      = useState<{
// //     isOpen: boolean; classificationId: number; classificationName: string;
// //   } | null>(null);
// //   const fileInputRef = useRef<HTMLInputElement>(null);
// //   const savedObligations = useRef<Map<number, number>>(new Map());

// //   const incomeSource = getSourceForDepartment(plan.department);
// //   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
// //     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

// //   const expenseItemMap = useMemo(
// //     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
// //     [expenseItems]
// //   );

// //   useEffect(() => {
// //     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// //       .then(res => {
// //         const raw = res.data.data || [];
// //         setAipItems(raw.map((item: any) => ({
// //           ...item,
// //           ps_amount:    parseFloat(item.ps_amount)    || 0,
// //           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
// //           co_amount:    parseFloat(item.co_amount)    || 0,
// //           total_amount: parseFloat(item.total_amount) || 0,
// //           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
// //           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
// //           recommendation: item.recommendation ?? null,
// //         })));
// //         raw.forEach((item: any) =>
// //           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
// //         );
// //       })
// //       .catch(console.error);
// //   }, [plan.dept_budget_plan_id]);

// //   useEffect(() => {
// //     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
// //     pastYearPlan?.items.forEach(item => {
// //       pastData.set(item.expense_item_id, {
// //         total:  Number(item.total_amount) || 0,
// //         sem1:   Number((item as any).sem1_amount) || 0,
// //         sem2:   Number((item as any).sem2_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });

// //     // Obligation data comes from the year BEFORE pastYearPlan (obligationYearPlan)
// //     const obligationData = new Map<number, { amount: number; itemId: number }>();
// //     obligationYearPlan?.items.forEach(item => {
// //       obligationData.set(item.expense_item_id, {
// //         amount: Number((item as any).obligation_amount) || 0,
// //         itemId: item.dept_bp_form2_item_id,
// //       });
// //     });
// //     const merged: ItemWithMeta[] = plan.items.map(planItem => {
// //       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0, obligation: 0 };
// //       return {
// //         ...planItem,
// //         expense_item:   expenseItemMap.get(planItem.expense_item_id),
// //         pastTotal:      past.total,
// //         pastSem1:       past.sem1,
// //         pastSem2:       past.sem2,
// //         pastObligation:      obligationData.get(planItem.expense_item_id)?.amount ?? 0,
// //         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
// //         pastItemId:          past.itemId || undefined,
// //         recommendation: (planItem as any).recommendation ?? null,
// //       };
// //     });
// //     setItems(merged);
// //     merged.forEach(item => {
// //       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
// //       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
// //       savedObligations.current.set(item.expense_item_id, item.pastObligation);
// //     });
// //   }, [plan, pastYearPlan, expenseItemMap]);

// //   const handleProposedChange = useCallback((id: number, value: number) =>
// //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

// //   const handleBlur = useCallback(async (expenseItemId: number) => {
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const cur = Number(item.total_amount);
// //     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
// //     setSavingItems(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       const payload = { total_amount: cur };
// //       const res = item.dept_bp_form2_item_id === 0
// //         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
// //         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
// //       savedValues.current.set(expenseItemId, cur);
// //       onItemUpdate();
// //       return res.data;
// //     })();
// //     toast.promise(promise, {
// //       loading: 'Saving…',
// //       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
// //       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
// //     });
// //     try { await promise; } catch {}
// //     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

// //   const handlePastSem1Change = (id: number, value: number) =>
// //     setPastSem1Edits(prev => new Map(prev).set(id, value));

// //   const handlePastSem1Blur = async (expenseItemId: number) => {
// //     const edit = pastSem1Edits.get(expenseItemId);
// //     if (edit === undefined) return;
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
// //     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
// //     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
// //     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
// //     if (!targetId || !planId) return;
// //     const clamped = Math.min(Math.max(edit, 0), cap);
// //     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
// //     if (clamped === item.pastSem1) {
// //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       return;
// //     }
// //     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
// //       setItems(prev => prev.map(i =>
// //         i.expense_item_id === expenseItemId
// //           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
// //       ));
// //       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //     })();
// //     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
// //     try { await promise; } catch {}
// //     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   };

// //   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
// //     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
// //     if (!item) return;
// //     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
// //     if (!confirm('Remove this item?')) return;
// //     try {
// //       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
// //       toast.success('Item deleted'); onItemUpdate();
// //     } catch { toast.error('Failed to delete item.'); }
// //   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

// //   const handleRecommendationChange = useCallback((id: number, value: string) =>
// //     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

// //   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item || item.dept_bp_form2_item_id === 0) return;
// //     const cur = item.recommendation ?? null;
// //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// //     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
// //     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
// //       savedRecommendations.current.set(expenseItemId, cur);
// //     })();
// //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

// //   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
// //     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

// //   const handleAipRecommendationBlur = useCallback(async (id: number) => {
// //     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
// //     if (!item) return;
// //     const cur = (item as any).recommendation ?? null;
// //     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
// //     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
// //     setSavingAipRecommendations(prev => new Set(prev).add(id));
// //     const promise = (async () => {
// //       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
// //       savedAipRecommendations.current.set(id, cur);
// //     })();
// //     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
// //   }, [aipItems, savingAipRecommendations]);

// //   // ── Obligation handlers (admin only, edits past plan item) ───────────────

// //   const handleObligationChange = (expenseItemId: number, value: number) =>
// //     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

// //   const handleObligationBlur = async (expenseItemId: number) => {
// //     const edit = obligationEdits.get(expenseItemId);
// //     if (edit === undefined) return;
// //     const item = items.find(i => i.expense_item_id === expenseItemId);
// //     if (!item) return;
// //     const clamped = Math.max(edit, 0);
// //     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
// //     if (clamped === savedObligations.current.get(expenseItemId)) {
// //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       return;
// //     }
// //     // We need the past plan item id. If no past item, we must create one on the past plan first.
// //     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// //     if (!oblPlanId) { toast.error('No obligation year plan (2025) found for this department.'); return; }
// //     setSavingObligations(prev => new Set(prev).add(expenseItemId));
// //     const promise = (async () => {
// //       if (item.pastObligationItemId) {
// //         // Update existing obligation year item
// //         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
// //       } else {
// //         // Create new item on the obligation year plan (2025)
// //         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
// //           expense_item_id: expenseItemId,
// //           obligation_amount: clamped,
// //         });
// //         const newItemId = res.data.data?.dept_bp_form2_item_id;
// //         setItems(prev => prev.map(i =>
// //           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
// //         ));
// //         // Cascade: ensure item exists on current (pastYearPlan = 2026) and proposed (plan = 2027)
// //         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
// //           expense_item_id: expenseItemId,
// //         }).catch(() => {}); // ignore 422 duplicate
// //         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
// //           expense_item_id: expenseItemId,
// //         }).catch(() => {}); // ignore 422 duplicate
// //       }
// //       savedObligations.current.set(expenseItemId, clamped);
// //       setItems(prev => prev.map(i =>
// //         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
// //       ));
// //       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
// //       onItemUpdate();
// //     })();
// //     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
// //     try { await promise; } catch {}
// //     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
// //   };

// //   // ── Excel upload handler ──────────────────────────────────────────────────

// //   const handleObligationUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
// //     const file = e.target.files?.[0];
// //     if (!file) return;
// //     // Reset input so same file can be re-uploaded
// //     e.target.value = '';
// //     setUploadingObligations(true);
// //     try {
// //       // Dynamically import SheetJS (xlsx) — it must be installed: npm i xlsx
// //       const XLSX = await import('xlsx');
// //       const data  = await file.arrayBuffer();
// //       const wb    = XLSX.read(data, { type: 'array' });

// //       // Parse all sheets: match by sheet name containing 'ps', 'mooe', 'co', 'aip'
// //       const expenseRows: { expense_item_name: string; amount: number }[] = [];
// //       const aipRows:     { program_description: string; amount: number }[] = [];

// //       wb.SheetNames.forEach(name => {
// //         const lower = name.toLowerCase();
// //         const sheet  = wb.Sheets[name];
// //         const rows   = XLSX.utils.sheet_to_json<any>(sheet, { defval: '' });
// //         if (lower.includes('aip')) {
// //           rows.forEach(row => {
// //             const desc   = String(row['program_description'] ?? row['Program Description'] ?? row['description'] ?? row['Description'] ?? '').trim();
// //             const amount = parseFloat(String(row['amount'] ?? row['Amount'] ?? row['obligation'] ?? row['Obligation'] ?? 0).replace(/,/g, ''));
// //             if (desc && !isNaN(amount) && amount >= 0) aipRows.push({ program_description: desc, amount });
// //           });
// //         } else {
// //           rows.forEach(row => {
// //             const name   = String(row['expense_item_name'] ?? row['Item'] ?? row['item'] ?? row['Name'] ?? row['name'] ?? '').trim();
// //             const amount = parseFloat(String(row['amount'] ?? row['Amount'] ?? row['obligation'] ?? row['Obligation'] ?? 0).replace(/,/g, ''));
// //             if (name && !isNaN(amount) && amount >= 0) expenseRows.push({ expense_item_name: name, amount });
// //           });
// //         }
// //       });

// //       const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
// //       if (!oblPlanId) { toast.error('No obligation year plan (2025) found.'); return; }

// //       await API.post(`/department-budget-plans/${oblPlanId}/upload-obligations`, {
// //         items:        expenseRows,
// //         aip_programs: aipRows,
// //       });

// //       toast.success(`Uploaded ${expenseRows.length} expense items and ${aipRows.length} AIP programs.`);
// //       onItemUpdate();
// //     } catch (err: any) {
// //       toast.error(`Upload failed: ${err?.response?.data?.message ?? err.message}`);
// //     } finally {
// //       setUploadingObligations(false);
// //     }
// //   };

// //   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
// //     const key = `${id}_${field}`;
// //     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
// //   };

// //   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
// //     const digits = rawValue.replace(/[^0-9]/g, '');
// //     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
// //     const num = digits === '' ? 0 : parseInt(digits, 10);
// //     if (field === 'proposed') handleProposedChange(id, num);
// //     else if (field === 'sem1') handlePastSem1Change(id, num);
// //     else handleObligationChange(id, num);
// //   };

// //   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
// //     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
// //     if (field === 'proposed') handleBlur(id);
// //     else if (field === 'sem1') handlePastSem1Blur(id);
// //     else handleObligationBlur(id);
// //   };

// //   // const itemsByClassification = useMemo(() =>
// //   //   classifications.map(c => ({
// //   //     ...c,
// //   //     items: items
// //   //       .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// //   //       .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// //   //   })), [classifications, items]);
// //   const itemsByClassification = useMemo(() =>
// //     classifications
// //       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
// //       .map(c => ({
// //         ...c,
// //         items: items
// //           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
// //           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
// //       })), [classifications, items]);

// //   const grandTotals = useMemo(() => ({
// //     pastSem1:  items.reduce((s, i) => s + i.pastSem1, 0),
// //     pastSem2:  items.reduce((s, i) => s + i.pastSem2, 0),
// //     pastTotal: items.reduce((s, i) => s + i.pastTotal, 0),
// //     proposed:  items.reduce((s, i) => s + Number(i.total_amount), 0),
// //   }), [items]);

// //   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
// //   const calamityTotal = calamityData?.calamity_fund ?? 0;

// //   const grandFinal = useMemo(() => ({
// //     pastSem1:  grandTotals.pastSem1,
// //     pastSem2:  grandTotals.pastSem2,
// //     pastTotal: grandTotals.pastTotal,
// //     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
// //   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

// //   const prevYear = Number(plan.budget_plan?.year) - 1;
// //   const currYear = plan.budget_plan?.year;
// //   const hasRows  = items.length > 0 || aipItems.length > 0;

// //   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
// //   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

// //   const hasAipSection      = aipItems.length > 0;
// //   const hasCalamitySection = isSpecialAccount;

// //   let gIdx = 0;

// //   return (
// //     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

// //       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
// //         <div>
// //           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
// //           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
// //             Programmed Appropriation and Obligation by Object of Expenditures
// //           </h3>
// //         </div>
// //         {isAdmin && (
// //           <div className="flex items-center gap-2">
// //             <Tooltip>
// //               <TooltipTrigger asChild>
// //                 <Button
// //                   size="sm" variant="outline"
// //                   disabled={uploadingObligations}
// //                   onClick={() => fileInputRef.current?.click()}
// //                   className="gap-1.5 text-xs h-8 border-blue-200 text-blue-700 hover:bg-blue-50">
// //                   {uploadingObligations
// //                     ? <><span className="w-3 h-3 border-2 border-blue-200 border-t-blue-600 rounded-full animate-spin" /> Uploading…</>
// //                     : <><PlusIcon className="w-3.5 h-3.5" /> Upload SAAOB ({prevYear})</>}
// //                 </Button>
// //               </TooltipTrigger>
// //               <TooltipContent className="text-xs max-w-xs">
// //                 Upload an Excel file with obligation amounts for {prevYear}. Sheets named "PS", "MOOE", "CO", "AIP". Columns: expense_item_name (or "Item"), amount (or "Amount").
// //               </TooltipContent>
// //             </Tooltip>
// //             <input
// //               ref={fileInputRef}
// //               type="file"
// //               accept=".xlsx,.xls,.csv"
// //               className="hidden"
// //               onChange={handleObligationUpload}
// //             />
// //           </div>
// //         )}
// //       </div>

// //       <div className="overflow-x-auto">
// //         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

// //           {/* <colgroup>
// //             {COL_WIDTHS.map((w, i) => <col key={i} style={{ width: w }} />)}
// //           </colgroup> */}
// //           <colgroup>
// //             {/* Obligation col only for admin, recommendation col only for admin */}
// //             {COL_WIDTHS.map((w, i) => {
// //               // index 2 = obligation col (admin only), index 9 = recommendation col (admin only)
// //               if ((i === 2 || i === 9) && !isAdmin) return null;
// //               return <col key={i} style={{ width: w }} />;
// //             })}
// //           </colgroup>

// //           {/* ── Main thead ──────────────────────────────────────────────── */}
// //           <thead className="sticky top-0 z-10">
// //             <tr>
// //               <th className={TH} rowSpan={2}>Acct Code</th>
// //               <th className={TH} rowSpan={2}>Object of Expenditure</th>

// //               {/* Obligation — admin only, blue tint, single col */}
// //               {isAdmin && (
// //                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
// //                   Past Year ({Number(plan.budget_plan?.year) - 2})
// //                 </th>
// //               )}

// //               {/* Appropriation — blue group header */}
// //               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
// //                 Appropriation ({prevYear})
// //               </th>

// //               {/* Proposed — orange */}
// //               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

// //               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
// //               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
// //               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
// //             </tr>
// //             <tr>
// //               {/* Appropriation sub-headers — blue */}
// //               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
// //               <th className={TH_APP}>Sem 2</th>
// //               <th className={TH_APP}>Total</th>
// //             </tr>
// //           </thead>

// //           <tbody>
// //             {itemsByClassification.map((cls, clsIndex) => {
// //               const isPS = cls.expense_class_id === PS_CLASS_ID;
// //               // const canEdit     = isEditable && !isPS;
// //               // const canEditSem1 = isEditable && (isAdmin || !isPS);
// //               const canEdit     = isEditable && (!isPS || isAdmin);
// //               const canEditSem1 = isEditable && (isAdmin || !isPS);

// //               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
// //                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

// //               const clsSem1 = cls.items.reduce((s, i) => s + i.pastSem1, 0);
// //               const clsSem2 = cls.items.reduce((s, i) => s + i.pastSem2, 0);
// //               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
// //               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
// //               const clsDiff = clsProp - clsPast;
// //               const clsPct  = pctOf(clsPast, clsDiff);

// //               const isLastCls       = clsIndex === itemsByClassification.length - 1;
// //               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
// //               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

// //               return (
// //                 <React.Fragment key={cls.expense_class_id}>

// //                   {/* Section divider */}
// //                   <tr className="bg-gray-50 border-y border-gray-200">
// //                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                       <div className="flex items-center justify-between">
// //                         <div className="flex items-center gap-2">
// //                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
// //                           {isPS && (
// //                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
// //                               Auto-filled from Personnel Services
// //                             </span>
// //                           )}
// //                         </div>
// //                         <div className="flex items-center gap-1.5">
// //                           {/* Admin: Add item to past year */}
// //                           {isAdmin && (
// //                             <Tooltip>
// //                               <TooltipTrigger asChild>
// //                                 <Button size="sm" variant="outline"
// //                                   className="gap-1.5 text-xs h-7 border-blue-200 text-blue-600 hover:text-blue-900 bg-blue-50"
// //                                   onClick={() => setPastModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// //                                   <PlusIcon className="w-3.5 h-3.5" /> Past Year Item
// //                                 </Button>
// //                               </TooltipTrigger>
// //                               <TooltipContent side="left" className="text-xs">Add item to past year ({prevYear})</TooltipContent>
// //                             </Tooltip>
// //                           )}
// //                           {canEdit && (
// //                             <Tooltip>
// //                               <TooltipTrigger asChild>
// //                                 <Button size="sm" variant="outline"
// //                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
// //                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
// //                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
// //                                 </Button>
// //                               </TooltipTrigger>
// //                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
// //                             </Tooltip>
// //                           )}
// //                         </div>
// //                       </div>
// //                     </td>
// //                   </tr>

// //                   {cls.items.length === 0 ? (
// //                     <>
// //                       {/* <tr><td colSpan={9} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr> */}
// //                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
// //                       {/* {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //                     </>
// //                   ) : (
// //                     <>
// //                       {cls.items.map(item => {
// //                         const delay    = Math.min(gIdx * 18, 280);
// //                         gIdx++;
// //                         const past     = item.pastTotal;
// //                         const proposed = Number(item.total_amount);
// //                         const d        = incr(past, proposed);
// //                         const p        = pctOf(past, d);
// //                         const isSaving = savingItems.has(item.expense_item_id);

// //                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
// //                           ? pastSem1Edits.get(item.expense_item_id)!
// //                           : item.pastSem1;
// //                         const sem2Cap  = past > 0 ? past : proposed;
// //                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
// //                           ? sem2Cap - dispSem1
// //                           : item.pastSem2;

// //                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

// //                         return (
// //                           <tr
// //                             key={item.expense_item_id}
// //                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
// //                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
// //                           >
// //                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
// //                             <td className={cn(TD, 'text-gray-800 font-medium')}>
// //                               <div className="flex items-center justify-between gap-1">
// //                                 <span>{item.expense_item?.expense_class_item_name}</span>
// //                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
// //                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
// //                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
// //                                     <TrashIcon className="w-3.5 h-3.5" />
// //                                   </button>
// //                                 )}
// //                               </div>
// //                             </td>

// //                             {/* ── Obligation — blue, admin only ─────────── */}
// //                             {isAdmin && (
// //                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
// //                                 {isAdmin ? (
// //                                   <input type="text" inputMode="numeric"
// //                                     value={getDraftValue(item.expense_item_id, 'obligation',
// //                                       obligationEdits.has(item.expense_item_id)
// //                                         ? obligationEdits.get(item.expense_item_id)!
// //                                         : item.pastObligation)}
// //                                     onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
// //                                     onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
// //                                     disabled={savingObligations.has(item.expense_item_id)}
// //                                     className={inputAppCls}
// //                                   />
// //                                 ) : (
// //                                   <span className="text-gray-600">{item.pastObligation === 0 ? '–' : fmtP(item.pastObligation)}</span>
// //                                 )}
// //                               </td>
// //                             )}

// //                             {/* ── Sem 1 — blue ────────────────────────────── */}
// //                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
// //                               {sem1Editable ? (
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
// //                                   disabled={savingPastItems.has(item.expense_item_id)}
// //                                   className={inputAppCls}
// //                                 />
// //                               ) : (
// //                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
// //                               )}
// //                             </td>

// //                             {/* ── Sem 2 — blue ────────────────────────────── */}
// //                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

// //                             {/* ── Past Total — blue ────────────────────────── */}
// //                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

// //                             {/* ── Proposed — orange ────────────────────────── */}
// //                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
// //                               {canEdit ? (
// //                                 <input type="text" inputMode="numeric"
// //                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
// //                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
// //                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
// //                                   disabled={isSaving} className={inputCls} />
// //                               ) : (
// //                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
// //                                   {proposed === 0 ? '–' : fmtP(proposed)}
// //                                 </span>
// //                               )}
// //                             </td>

// //                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
// //                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

// //                             {/* Recommendation */}
// //                             {isAdmin && (
// //                               <td className={TD}>
// //                                 {isEditable && (isAdmin || !isPS) ? (
// //                                   <input type="text" value={item.recommendation ?? ''}
// //                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// //                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// //                                     disabled={savingRecommendations.has(item.expense_item_id)}
// //                                     placeholder="Add note…" maxLength={255} className={recCls} />
// //                                 ) : (
// //                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// //                                 )}
// //                               </td>
// //                             )}
// //                             {/* <td className={TD}>
// //                               {isEditable && (isAdmin || !isPS) ? (
// //                                 <input type="text" value={item.recommendation ?? ''}
// //                                   onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
// //                                   onBlur={() => handleRecommendationBlur(item.expense_item_id)}
// //                                   disabled={savingRecommendations.has(item.expense_item_id)}
// //                                   placeholder="Add note…" maxLength={255} className={recCls} />
// //                               ) : (
// //                                 <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
// //                               )}
// //                             </td> */}
// //                           </tr>
// //                         );
// //                       })}

// //                       {/* Classification subtotal */}
// //                       <tr className="border-t border-gray-200">
// //                         <td className="bg-gray-100" />
// //                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
// //                        {/* obligation subtotal — blank (obligation is a past-year actual display only) */}
// //                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
// //                         {/* blue subtotals */}
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
// //                         {/* orange subtotal */}
// //                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
// //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
// //                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
// //                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
// //                         </td>
// //                         {/* <td className="bg-gray-100" /> */}
// //                         {isAdmin && <td className="bg-gray-100" />}
// //                       </tr>

// //                       {/* {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// //                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //                     </>
// //                   )}
// //                 </React.Fragment>
// //               );
// //             })}

// //             {/* ── Special Programs (AIP) ── */}
// //             {aipItems.length > 0 && (
// //               <React.Fragment>
// //                 <tr className="bg-gray-50 border-y border-gray-200">
// //                   {/* <td colSpan={8} className="px-4 py-2"> */}
// //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                     <div className="flex items-center gap-2">
// //                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
// //                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
// //                     </div>
// //                   </td>
// //                   <td className="bg-gray-50" />
// //                 </tr>

// //                 {aipItems.map(item => {
// //                   const delay = Math.min(gIdx * 18, 280);
// //                   gIdx++;
// //                   return (
// //                     <tr key={item.dept_bp_form4_item_id}
// //                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
// //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
// //                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
// //                       {/* obligation — blank for AIP rows (AIP uses form4 items) */}
// //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// //                       {/* blue — blank for AIP rows */}
// //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       {/* orange — amount */}
// //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
// //                       {isAdmin && (
// //                         <td className={TD}>
// //                           {isEditable ? (
// //                             <input type="text" value={(item as any).recommendation ?? ''}
// //                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// //                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// //                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// //                               placeholder="Add note…" maxLength={255} className={recCls} />
// //                           ) : (
// //                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// //                           )}
// //                         </td>
// //                       )}
// //                       {/* <td className={TD}>
// //                         {isEditable ? (
// //                           <input type="text" value={(item as any).recommendation ?? ''}
// //                             onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
// //                             onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
// //                             disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
// //                             placeholder="Add note…" maxLength={255} className={recCls} />
// //                         ) : (
// //                           <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
// //                         )}
// //                       </td> */}
// //                     </tr>
// //                   );
// //                 })}

// //                 <tr className="border-t border-gray-200">
// //                   <td className="bg-gray-100" />
// //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
// //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
// //                   {/* <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// //                   <td className="bg-gray-100" /> */}
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
// //                   {isAdmin && <td className="bg-gray-100" />}
// //                 </tr>

// //                 {/* {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} />} */}
// //                 {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
// //               </React.Fragment>
// //             )}

// //             {/* ── 5% Calamity Fund ── */}
// //             {isSpecialAccount && (
// //               <React.Fragment>
// //                 <tr className="bg-gray-50 border-y border-gray-200">
// //                   {/* <td colSpan={8} className="px-4 py-2"> */}
// //                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
// //                     <div className="flex items-center gap-2">
// //                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
// //                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
// //                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
// //                       </span>
// //                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
// //                     </div>
// //                   </td>
// //                   <td className="bg-gray-50" />
// //                 </tr>

// //                 {[
// //                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
// //                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
// //                 ].map(row => {
// //                   const delay = Math.min(gIdx * 18, 280);
// //                   gIdx++;
// //                   return (
// //                     <tr key={row.code}
// //                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
// //                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
// //                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
// //                       <td className={cn(TD, 'text-gray-800')}>
// //                         {row.label}
// //                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
// //                       </td>
// //                       {/* obligation — blank for calamity rows */}
// //                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
// //                       {/* blue — blank */}
// //                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
// //                       {/* orange — derived value */}
// //                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
// //                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
// //                       </td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
// //                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
// //                       <td />
// //                     </tr>
// //                   );
// //                 })}

// //                 <tr className="border-t border-gray-200">
// //                   <td className="bg-gray-100" />
// //                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
// //                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
// //                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn('bg-gray-100', C_APP_SUB)} />
// //                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
// //                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
// //                   </td>
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
// //                   {/* <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// //                   <td className="bg-gray-100" /> */}
// //                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
// //                   {isAdmin && <td className="bg-gray-100" />}
// //                 </tr>

// //                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
// //                   <tr>
// //                     {/* <td colSpan={9} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100"> */}
// //                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
// //                       Base:{' '}
// //                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
// //                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
// //                     </td>
// //                   </tr>
// //                 )}
// //               </React.Fragment>
// //             )}
// //           </tbody>

// //           {/* ── Grand Total ── */}
// //           <tfoot>
// //             {hasRows && (
// //               <tr className="bg-gray-900 text-white">
// //                 <td className="px-3 py-3" />
// //                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
// //                   Grand Total
// //                   {isSpecialAccount && calamityTotal > 0 && (
// //                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
// //                   )}
// //                 </td>
// //                 {/* Obligation — blank in grand total */}
// //                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
// //                 {/* Appropriation — blue tint */}
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
// //                 {/* Proposed — orange tint */}
// //                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
// //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// //                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
// //                 </td>
// //                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
// //                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
// //                 </td>
// //                 {/* <td className="border-l border-gray-700" /> */}
// //                 {isAdmin && <td className="border-l border-gray-700" />}
// //               </tr>
// //             )}
// //           </tfoot>
// //         </table>
// //       </div>

// //       {modalState && (
// //         <AddItemModal
// //           isOpen={modalState.isOpen}
// //           onClose={() => setModalState(null)}
// //           classificationId={modalState.classificationId}
// //           classificationName={modalState.classificationName}
// //           planId={plan.dept_budget_plan_id}
// //           expenseItems={expenseItems}
// //           existingItemIds={items.map(i => i.expense_item_id)}
// //           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
// //         />
// //       )}

// //       {/* Past-year add item modal — admin adds items to the past year plan */}
// //       {pastModalState && obligationYearPlan && (
// //         <AddItemModal
// //           isOpen={pastModalState.isOpen}
// //           onClose={() => setPastModalState(null)}
// //           classificationId={pastModalState.classificationId}
// //           classificationName={pastModalState.classificationName}
// //           planId={obligationYearPlan.dept_budget_plan_id}
// //           expenseItems={expenseItems}
// //           existingItemIds={obligationYearPlan.items.map((i: any) => i.expense_item_id)}
// //           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added. Current/proposed plans updated.'); }}
// //         />
// //       )}
// //     </div>
// //   );
// // };

// // export default Form2;
// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import API from '../../services/api';
// import {
//   DepartmentBudgetPlan,
//   ExpenseClassification,
//   ExpenseItem,
//   DepartmentBudgetPlanItem,
//   DepartmentBudgetPlanForm4Item,
// } from '../../types/api';
// import AddItemModal from './AddItemModal';
// import { Button } from '@/src/components/ui/button';
// import { toast } from 'sonner';
// import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// import { cn } from '@/src/lib/utils';
// import { useCalamityFund } from '../../hooks/useCalamityFund';


// // ─── Column color tokens ──────────────────────────────────────────────────────
// // Appropriation (past year) → blue
// // Proposed (budget year)    → orange

// const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// const C_APP_SUB = 'bg-blue-50   border-blue-200';
// const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // ─── Animation keyframes ──────────────────────────────────────────────────────

// const ANIM_CSS = `
// @keyframes _rowIn {
//   from { opacity: 0; transform: translateY(6px); }
//   to   { opacity: 1; transform: translateY(0); }
// }
// @media (prefers-reduced-motion: reduce) {
//   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// }
// `;
// let _animInjected = false;
// function ensureAnim() {
//   if (_animInjected || typeof document === 'undefined') return;
//   const el = document.createElement('style');
//   el.textContent = ANIM_CSS;
//   document.head.appendChild(el);
//   _animInjected = true;
// }

// // ─── Dept → income-fund source key ───────────────────────────────────────────

// const getSourceForDepartment = (dept?: {
//   dept_abbreviation?: string; dept_name?: string;
// }): string | undefined => {
//   if (!dept) return undefined;
//   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
//   const name = dept.dept_name?.toLowerCase() ?? '';
//   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//   return undefined;
// };

// const PS_CLASS_ID = 1;

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Form2Props {
//   plan: DepartmentBudgetPlan;
//   pastYearPlan: DepartmentBudgetPlan | null;
//   obligationYearPlan: DepartmentBudgetPlan | null;
//   classifications: ExpenseClassification[];
//   expenseItems: ExpenseItem[];
//   isEditable: boolean;
//   isAdmin?: boolean;
//   onItemUpdate: () => void;
// }

// interface ItemWithMeta extends DepartmentBudgetPlanItem {
//   pastTotal: number; pastSem1: number; pastSem2: number;
//   pastObligation: number;
//   pastObligationItemId?: number;
//   pastItemId?: number; expense_item?: ExpenseItem;
//   recommendation?: string | null;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// const fmtP  = (n: number) => `₱${fmt(n)}`;
// const incr  = (past: number, prop: number) => prop - past;
// const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// const TD      = 'px-3 py-2.5 text-[12px]';
// const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // ── Appropriation (blue) ───────────────────────────────────────────────────────
// const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// const TD_APP  = `${TD_M} bg-blue-50/30`;

// // ── Proposed (orange) ─────────────────────────────────────────────────────────
// const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// const TD_PRO  = `${TD_M} bg-orange-50/30`;

// const inputCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// const inputAppCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// const recCls =
//   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // ─── Sub-header ───────────────────────────────────────────────────────────────

// const SubHeader: React.FC<{
//   prevYear: number | string | undefined;
//   currYear: number | string | undefined;
//   isAdmin?: boolean;
// }> = ({ prevYear, currYear, isAdmin }) => (
//   <>
//     <tr>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
//       {isAdmin && (
//         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
//           Past Year ({Number(prevYear) - 1})
//         </th>
//       )}
//       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
//         Appropriation ({prevYear})
//       </th>
//       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
//       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
//     </tr>
//     <tr>
//       <th className={TH_APP}>Sem 1</th>
//       <th className={TH_APP}>Sem 2</th>
//       <th className={TH_APP}>Total</th>
//     </tr>
//   </>
// );

// // ─── Component ────────────────────────────────────────────────────────────────

// const Form2: React.FC<Form2Props> = ({
//   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// }) => {
//   useEffect(() => { ensureAnim(); }, []);

//   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
//   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

//   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
//   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
//   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
//   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

//   const savedValues             = useRef<Map<number, number>>(new Map());
//   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
//   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

//   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
//   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
//   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
//   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
//   const [modalState,        setModalState]        = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);
//   const [pastModalState, setPastModalState] = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);

//   const savedObligations = useRef<Map<number, number>>(new Map());

//   const incomeSource = getSourceForDepartment(plan.department);
//   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
//     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

//   const expenseItemMap = useMemo(
//     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
//     [expenseItems]
//   );

//   useEffect(() => {
//     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
//       .then(res => {
//         const raw = res.data.data || [];
//         setAipItems(raw.map((item: any) => ({
//           ...item,
//           ps_amount:    parseFloat(item.ps_amount)    || 0,
//           mooe_amount:  parseFloat(item.mooe_amount)  || 0,
//           co_amount:    parseFloat(item.co_amount)    || 0,
//           total_amount: parseFloat(item.total_amount) || 0,
//           sem1_amount:  parseFloat(item.sem1_amount)  || 0,
//           sem2_amount:  parseFloat(item.sem2_amount)  || 0,
//           recommendation: item.recommendation ?? null,
//         })));
//         raw.forEach((item: any) =>
//           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null)
//         );
//       })
//       .catch(console.error);
//   }, [plan.dept_budget_plan_id]);

//   useEffect(() => {
//     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
//     pastYearPlan?.items.forEach(item => {
//       pastData.set(item.expense_item_id, {
//         total:  Number(item.total_amount) || 0,
//         sem1:   Number((item as any).sem1_amount) || 0,
//         sem2:   Number((item as any).sem2_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     // Obligation data comes from the year BEFORE pastYearPlan (obligationYearPlan)
//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan?.items.forEach(item => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number((item as any).obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });
//     const merged: ItemWithMeta[] = plan.items.map(planItem => {
//       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0, obligation: 0 };
//       return {
//         ...planItem,
//         expense_item:        expenseItemMap.get(planItem.expense_item_id),
//         pastTotal:           past.total,
//         pastSem1:            past.sem1,
//         pastSem2:            past.sem2,
//         pastObligation:      obligationData.get(planItem.expense_item_id)?.amount ?? 0,
//         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
//         pastItemId:          past.itemId || undefined,
//         recommendation:      (planItem as any).recommendation ?? null,
//       };
//     });
//     setItems(merged);
//     // Reset draft edits when base data changes (e.g. after refetch)
//     setPastSem1Edits(new Map());
//     setObligationEdits(new Map());
//     merged.forEach(item => {
//       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
//       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
//       savedObligations.current.set(item.expense_item_id, item.pastObligation);
//     });
//   }, [plan, pastYearPlan, obligationYearPlan, expenseItemMap]);

//   const handleProposedChange = useCallback((id: number, value: number) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

//   const handleBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const cur = Number(item.total_amount);
//     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
//     setSavingItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       const payload = { total_amount: cur };
//       const res = item.dept_bp_form2_item_id === 0
//         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
//         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
//       savedValues.current.set(expenseItemId, cur);
//       // Update local state immediately so value shows without reload
//       const saved = res.data.data;
//       if (saved) {
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
//             : i
//         ));
//       }
//       onItemUpdate();
//       return res.data;
//     })();
//     toast.promise(promise, {
//       loading: 'Saving…',
//       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
//       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
//     });
//     try { await promise; } catch {}
//     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

//   const handlePastSem1Change = (id: number, value: number) =>
//     setPastSem1Edits(prev => new Map(prev).set(id, value));

//   const handlePastSem1Blur = async (expenseItemId: number) => {
//     const edit = pastSem1Edits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const hasPast  = item.pastTotal > 0 && !!item.pastItemId;
//     const cap      = hasPast ? item.pastTotal : Number(item.total_amount);
//     const targetId = hasPast ? item.pastItemId : item.dept_bp_form2_item_id;
//     const planId   = hasPast ? pastYearPlan?.dept_budget_plan_id : plan.dept_budget_plan_id;
//     if (!targetId || !planId) return;
//     const clamped = Math.min(Math.max(edit, 0), cap);
//     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === item.pastSem1) {
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }
//     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
//       // Update local state immediately — don't wait for full reload
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId
//           ? { ...i, pastSem1: clamped, pastSem2: cap - clamped } : i
//       ));
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//     })();
//     toast.promise(promise, { loading: 'Saving Sem1…', success: 'Sem1 saved', error: 'Failed' });
//     try { await promise; } catch {}
//     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
//     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
//     if (!item) return;
//     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
//     if (!confirm('Remove this item?')) return;
//     try {
//       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
//       toast.success('Item deleted'); onItemUpdate();
//     } catch { toast.error('Failed to delete item.'); }
//   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

//   const handleRecommendationChange = useCallback((id: number, value: string) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item || item.dept_bp_form2_item_id === 0) return;
//     const cur = item.recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
//     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
//       savedRecommendations.current.set(expenseItemId, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

//   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
//     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleAipRecommendationBlur = useCallback(async (id: number) => {
//     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
//     if (!item) return;
//     const cur = (item as any).recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
//     setSavingAipRecommendations(prev => new Set(prev).add(id));
//     const promise = (async () => {
//       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
//       savedAipRecommendations.current.set(id, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
//   }, [aipItems, savingAipRecommendations]);

//   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

//   const handleObligationChange = (expenseItemId: number, value: number) =>
//     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

//   const handleObligationBlur = async (expenseItemId: number) => {
//     const edit = obligationEdits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const clamped = Math.max(edit, 0);
//     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === savedObligations.current.get(expenseItemId)) {
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }
//     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
//     setSavingObligations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (item.pastObligationItemId) {
//         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
//       } else {
//         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
//           expense_item_id: expenseItemId,
//           obligation_amount: clamped,
//         });
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
//         ));
//         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
//         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {}); // ignore 422 duplicate
//         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {}); // ignore 422 duplicate
//       }
//       savedObligations.current.set(expenseItemId, clamped);
//       // Update local state immediately so amount shows without reload
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
//       ));
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       onItemUpdate();
//     })();
//     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
//     try { await promise; } catch {}
//     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
//     const key = `${id}_${field}`;
//     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
//   };

//   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
//     const digits = rawValue.replace(/[^0-9]/g, '');
//     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
//     const num = digits === '' ? 0 : parseInt(digits, 10);
//     if (field === 'proposed') handleProposedChange(id, num);
//     else if (field === 'sem1') handlePastSem1Change(id, num);
//     else handleObligationChange(id, num);
//   };

//   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
//     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
//     if (field === 'proposed') handleBlur(id);
//     else if (field === 'sem1') handlePastSem1Blur(id);
//     else handleObligationBlur(id);
//   };

//   const itemsByClassification = useMemo(() =>
//     classifications
//       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
//       .map(c => ({
//         ...c,
//         items: items
//           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
//           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
//       })), [classifications, items]);

//   // Grand totals: account for in-flight pastSem1Edits so subtotals calculate live
//   const grandTotals = useMemo(() => {
//     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
//     for (const i of items) {
//       const sem1 = pastSem1Edits.has(i.expense_item_id)
//         ? pastSem1Edits.get(i.expense_item_id)!
//         : i.pastSem1;
//       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//       const sem2 = pastSem1Edits.has(i.expense_item_id)
//         ? Math.max(cap - sem1, 0)
//         : i.pastSem2;
//       pastSem1  += sem1;
//       pastSem2  += sem2;
//       pastTotal += i.pastTotal;
//       proposed  += Number(i.total_amount);
//     }
//     return { pastSem1, pastSem2, pastTotal, proposed };
//   }, [items, pastSem1Edits]);

//   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
//   const calamityTotal = calamityData?.calamity_fund ?? 0;

//   const grandFinal = useMemo(() => ({
//     pastSem1:  grandTotals.pastSem1,
//     pastSem2:  grandTotals.pastSem2,
//     pastTotal: grandTotals.pastTotal,
//     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
//   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

//   const prevYear = Number(plan.budget_plan?.year) - 1;
//   const currYear = plan.budget_plan?.year;
//   const hasRows  = items.length > 0 || aipItems.length > 0;

//   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
//   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

//   const hasAipSection      = aipItems.length > 0;
//   const hasCalamitySection = isSpecialAccount;

//   let gIdx = 0;

//   return (
//     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

//       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
//           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
//             Programmed Appropriation and Obligation by Object of Expenditures
//           </h3>
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

//           <colgroup>
//             {COL_WIDTHS.map((w, i) => {
//               if ((i === 2 || i === 9) && !isAdmin) return null;
//               return <col key={i} style={{ width: w }} />;
//             })}
//           </colgroup>

//           {/* ── Main thead ──────────────────────────────────────────────── */}
//           <thead className="sticky top-0 z-10">
//             <tr>
//               <th className={TH} rowSpan={2}>Acct Code</th>
//               <th className={TH} rowSpan={2}>Object of Expenditure</th>

//               {isAdmin && (
//                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
//                   Past Year ({Number(plan.budget_plan?.year) - 2})
//                 </th>
//               )}

//               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
//                 Appropriation ({prevYear})
//               </th>

//               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

//               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
//               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
//               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
//             </tr>
//             <tr>
//               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
//               <th className={TH_APP}>Sem 2</th>
//               <th className={TH_APP}>Total</th>
//             </tr>
//           </thead>

//           <tbody>
//             {itemsByClassification.map((cls, clsIndex) => {
//               const isPS = cls.expense_class_id === PS_CLASS_ID;
//               const canEdit     = isEditable && (!isPS || isAdmin);
//               const canEditSem1 = isEditable && (isAdmin || !isPS);

//               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
//                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

//               // Subtotals: use live pastSem1Edits for past year columns
//               const clsSem1 = cls.items.reduce((s, i) => {
//                 const sem1 = pastSem1Edits.has(i.expense_item_id)
//                   ? pastSem1Edits.get(i.expense_item_id)!
//                   : i.pastSem1;
//                 return s + sem1;
//               }, 0);
//               const clsSem2 = cls.items.reduce((s, i) => {
//                 if (pastSem1Edits.has(i.expense_item_id)) {
//                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
//                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//                   return s + Math.max(cap - sem1, 0);
//                 }
//                 return s + i.pastSem2;
//               }, 0);
//               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
//               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
//               const clsDiff = clsProp - clsPast;
//               const clsPct  = pctOf(clsPast, clsDiff);

//               const isLastCls       = clsIndex === itemsByClassification.length - 1;
//               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
//               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

//               return (
//                 <React.Fragment key={cls.expense_class_id}>

//                   {/* Section divider */}
//                   <tr className="bg-gray-50 border-y border-gray-200">
//                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
//                           {isPS && (
//                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
//                               Auto-filled from Personnel Services
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-1.5">
//                           {/* Admin: Add item to past year (pastYearPlan) */}
//                           {isAdmin && (
//                             <Tooltip>
//                               <TooltipTrigger asChild>
//                                 <Button size="sm" variant="outline"
//                                   className="gap-1.5 text-xs h-7 border-blue-200 text-blue-600 hover:text-blue-900 bg-blue-50"
//                                   onClick={() => setPastModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
//                                   <PlusIcon className="w-3.5 h-3.5" /> Past Year Item
//                                 </Button>
//                               </TooltipTrigger>
//                               <TooltipContent side="left" className="text-xs">Add item to past year ({prevYear})</TooltipContent>
//                             </Tooltip>
//                           )}
//                           {canEdit && (
//                             <Tooltip>
//                               <TooltipTrigger asChild>
//                                 <Button size="sm" variant="outline"
//                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
//                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
//                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
//                                 </Button>
//                               </TooltipTrigger>
//                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
//                             </Tooltip>
//                           )}
//                         </div>
//                       </div>
//                     </td>
//                   </tr>

//                   {cls.items.length === 0 ? (
//                     <>
//                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   ) : (
//                     <>
//                       {cls.items.map(item => {
//                         const delay    = Math.min(gIdx * 18, 280);
//                         gIdx++;
//                         const past     = item.pastTotal;
//                         const proposed = Number(item.total_amount);
//                         const d        = incr(past, proposed);
//                         const p        = pctOf(past, d);
//                         const isSaving = savingItems.has(item.expense_item_id);

//                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
//                           ? pastSem1Edits.get(item.expense_item_id)!
//                           : item.pastSem1;
//                         const sem2Cap  = past > 0 ? past : proposed;
//                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
//                           ? sem2Cap - dispSem1
//                           : item.pastSem2;

//                         const sem1Editable = canEditSem1 && (isAdmin || past > 0);

//                         return (
//                           <tr
//                             key={item.expense_item_id}
//                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
//                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
//                           >
//                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
//                             <td className={cn(TD, 'text-gray-800 font-medium')}>
//                               <div className="flex items-center justify-between gap-1">
//                                 <span>{item.expense_item?.expense_class_item_name}</span>
//                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
//                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
//                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
//                                     <TrashIcon className="w-3.5 h-3.5" />
//                                   </button>
//                                 )}
//                               </div>
//                             </td>

//                             {/* ── Obligation — blue, admin only ─────────── */}
//                             {isAdmin && (
//                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'obligation',
//                                     obligationEdits.has(item.expense_item_id)
//                                       ? obligationEdits.get(item.expense_item_id)!
//                                       : item.pastObligation)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
//                                   disabled={savingObligations.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               </td>
//                             )}

//                             {/* ── Sem 1 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                               {sem1Editable ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
//                                   disabled={savingPastItems.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               ) : (
//                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
//                               )}
//                             </td>

//                             {/* ── Sem 2 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

//                             {/* ── Past Total — blue ────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

//                             {/* ── Proposed — orange ────────────────────────── */}
//                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
//                               {canEdit ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
//                                   disabled={isSaving} className={inputCls} />
//                               ) : (
//                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
//                                   {proposed === 0 ? '–' : fmtP(proposed)}
//                                 </span>
//                               )}
//                             </td>

//                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
//                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

//                             {/* Recommendation */}
//                             {isAdmin && (
//                               <td className={TD}>
//                                 {isEditable && (isAdmin || !isPS) ? (
//                                   <input type="text" value={item.recommendation ?? ''}
//                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
//                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
//                                     disabled={savingRecommendations.has(item.expense_item_id)}
//                                     placeholder="Add note…" maxLength={255} className={recCls} />
//                                 ) : (
//                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
//                                 )}
//                               </td>
//                             )}
//                           </tr>
//                         );
//                       })}

//                       {/* Classification subtotal */}
//                       <tr className="border-t border-gray-200">
//                         <td className="bg-gray-100" />
//                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
//                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
//                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
//                         </td>
//                         {isAdmin && <td className="bg-gray-100" />}
//                       </tr>

//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   )}
//                 </React.Fragment>
//               );
//             })}

//             {/* ── Special Programs (AIP) ── */}
//             {aipItems.length > 0 && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
//                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {aipItems.map(item => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   return (
//                     <tr key={item.dept_bp_form4_item_id}
//                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
//                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
//                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
//                       {isAdmin && (
//                         <td className={TD}>
//                           {isEditable ? (
//                             <input type="text" value={(item as any).recommendation ?? ''}
//                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
//                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
//                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
//                               placeholder="Add note…" maxLength={255} className={recCls} />
//                           ) : (
//                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
//                           )}
//                         </td>
//                       )}
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {<SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//               </React.Fragment>
//             )}

//             {/* ── 5% Calamity Fund ── */}
//             {isSpecialAccount && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
//                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
//                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
//                       </span>
//                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {[
//                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
//                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
//                 ].map(row => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   return (
//                     <tr key={row.code}
//                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
//                       <td className={cn(TD, 'text-gray-800')}>
//                         {row.label}
//                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
//                       </td>
//                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
//                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
//                       </td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
//                       <td />
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
//                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
//                   </td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
//                   <tr>
//                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
//                       Base:{' '}
//                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
//                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             )}
//           </tbody>

//           {/* ── Grand Total ── */}
//           <tfoot>
//             {hasRows && (
//               <tr className="bg-gray-900 text-white">
//                 <td className="px-3 py-3" />
//                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
//                   Grand Total
//                   {isSpecialAccount && calamityTotal > 0 && (
//                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
//                   )}
//                 </td>
//                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
//                 </td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
//                 </td>
//                 {isAdmin && <td className="border-l border-gray-700" />}
//               </tr>
//             )}
//           </tfoot>
//         </table>
//       </div>

//       {modalState && (
//         <AddItemModal
//           isOpen={modalState.isOpen}
//           onClose={() => setModalState(null)}
//           classificationId={modalState.classificationId}
//           classificationName={modalState.classificationName}
//           planId={plan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={items.map(i => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
//         />
//       )}

//       {/* Past-year add item modal — admin adds items to the PAST year plan (prevYear appropriation) */}
//       {pastModalState && pastYearPlan && (
//         <AddItemModal
//           isOpen={pastModalState.isOpen}
//           onClose={() => setPastModalState(null)}
//           classificationId={pastModalState.classificationId}
//           classificationName={pastModalState.classificationName}
//           planId={pastYearPlan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
//         />
//       )}
//     </div>
//   );
// };

// export default Form2;

// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import API from '../../services/api';
// import {
//   DepartmentBudgetPlan,
//   ExpenseClassification,
//   ExpenseItem,
//   DepartmentBudgetPlanItem,
//   DepartmentBudgetPlanForm4Item,
// } from '../../types/api';
// import AddItemModal from './AddItemModal';
// import { Button } from '@/src/components/ui/button';
// import { toast } from 'sonner';
// import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// import { cn } from '@/src/lib/utils';
// import { useCalamityFund } from '../../hooks/useCalamityFund';


// // ─── Column color tokens ──────────────────────────────────────────────────────
// // Appropriation (past year) → blue
// // Proposed (budget year)    → orange

// const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// const C_APP_SUB = 'bg-blue-50   border-blue-200';
// const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // ─── Animation keyframes ──────────────────────────────────────────────────────

// const ANIM_CSS = `
// @keyframes _rowIn {
//   from { opacity: 0; transform: translateY(6px); }
//   to   { opacity: 1; transform: translateY(0); }
// }
// @media (prefers-reduced-motion: reduce) {
//   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// }
// `;
// let _animInjected = false;
// function ensureAnim() {
//   if (_animInjected || typeof document === 'undefined') return;
//   const el = document.createElement('style');
//   el.textContent = ANIM_CSS;
//   document.head.appendChild(el);
//   _animInjected = true;
// }

// // ─── Dept → income-fund source key ───────────────────────────────────────────

// const getSourceForDepartment = (dept?: {
//   dept_abbreviation?: string; dept_name?: string;
// }): string | undefined => {
//   if (!dept) return undefined;
//   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
//   const name = dept.dept_name?.toLowerCase() ?? '';
//   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//   return undefined;
// };

// const PS_CLASS_ID = 1;

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Form2Props {
//   plan: DepartmentBudgetPlan;
//   pastYearPlan: DepartmentBudgetPlan | null;
//   obligationYearPlan: DepartmentBudgetPlan | null;
//   classifications: ExpenseClassification[];
//   expenseItems: ExpenseItem[];
//   isEditable: boolean;
//   isAdmin?: boolean;
//   onItemUpdate: () => void;
// }

// interface ItemWithMeta extends DepartmentBudgetPlanItem {
//   pastTotal: number; pastSem1: number; pastSem2: number;
//   pastObligation: number;
//   pastObligationItemId?: number;
//   pastItemId?: number; expense_item?: ExpenseItem;
//   recommendation?: string | null;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// const fmtP  = (n: number) => `₱${fmt(n)}`;
// const incr  = (past: number, prop: number) => prop - past;
// const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// const TD      = 'px-3 py-2.5 text-[12px]';
// const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // ── Appropriation (blue) ───────────────────────────────────────────────────────
// const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// const TD_APP  = `${TD_M} bg-blue-50/30`;

// // ── Proposed (orange) ─────────────────────────────────────────────────────────
// const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// const TD_PRO  = `${TD_M} bg-orange-50/30`;

// const inputCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// const inputAppCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// const recCls =
//   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // ─── Sub-header ───────────────────────────────────────────────────────────────

// const SubHeader: React.FC<{
//   prevYear: number | string | undefined;
//   currYear: number | string | undefined;
//   isAdmin?: boolean;
// }> = ({ prevYear, currYear, isAdmin }) => (
//   <>
//     <tr>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
//       {isAdmin && (
//         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
//           Past Year ({Number(prevYear) - 1})
//         </th>
//       )}
//       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
//         Appropriation ({prevYear})
//       </th>
//       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
//       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
//     </tr>
//     <tr>
//       <th className={TH_APP}>Sem 1</th>
//       <th className={TH_APP}>Sem 2</th>
//       <th className={TH_APP}>Total</th>
//     </tr>
//   </>
// );

// // ─── Component ────────────────────────────────────────────────────────────────

// const Form2: React.FC<Form2Props> = ({
//   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// }) => {
//   useEffect(() => { ensureAnim(); }, []);

//   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
//   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

//   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
//   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
//   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
//   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

//   const savedValues             = useRef<Map<number, number>>(new Map());
//   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
//   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

//   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
//   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
//   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
//   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
//   const [modalState,        setModalState]        = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);
//   const [pastModalState, setPastModalState] = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);

//   const savedObligations    = useRef<Map<number, number>>(new Map());
//   const savedAipObligations = useRef<Map<number, number>>(new Map());

//   const [aipObligationEdits,   setAipObligationEdits]   = useState<Map<number, number>>(new Map());
//   const [savingAipObligations, setSavingAipObligations] = useState<Set<number>>(new Set());

//   const incomeSource = getSourceForDepartment(plan.department);
//   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
//     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

//   const expenseItemMap = useMemo(
//     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
//     [expenseItems]
//   );

//   useEffect(() => {
//     const pastPlanId = pastYearPlan?.dept_budget_plan_id;

//     API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
//       .then(async res => {
//         const raw = res.data.data || [];

//         // Also fetch past year's form4 items so we can look up existing obligation entries
//         let pastByProgram = new Map<number, { itemId: number; obligation: number }>();
//         if (pastPlanId) {
//           try {
//             const pastRes = await API.get('/form4-items', { params: { budget_plan_id: pastPlanId } });
//             (pastRes.data.data || []).forEach((pi: any) => {
//               pastByProgram.set(pi.aip_program_id, {
//                 itemId:     pi.dept_bp_form4_item_id,
//                 obligation: parseFloat(pi.obligation_amount) || 0,
//               });
//             });
//           } catch { /* silent — past plan may not exist */ }
//         }

//         setAipItems(raw.map((item: any) => {
//           const past = pastByProgram.get(item.aip_program_id);
//           return {
//             ...item,
//             ps_amount:         parseFloat(item.ps_amount)         || 0,
//             mooe_amount:       parseFloat(item.mooe_amount)       || 0,
//             co_amount:         parseFloat(item.co_amount)         || 0,
//             total_amount:      parseFloat(item.total_amount)      || 0,
//             sem1_amount:       parseFloat(item.sem1_amount)       || 0,
//             sem2_amount:       parseFloat(item.sem2_amount)       || 0,
//             // obligation_amount shown in the column is from the PAST year item
//             obligation_amount: past?.obligation ?? 0,
//             // track the past year form4 item id so we can PUT to it on save
//             pastAipItemId:     past?.itemId ?? undefined,
//             recommendation:    item.recommendation ?? null,
//           };
//         }));

//         raw.forEach((item: any) => {
//           savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null);
//           const past = pastByProgram.get(item.aip_program_id);
//           savedAipObligations.current.set(item.dept_bp_form4_item_id, past?.obligation ?? 0);
//         });
//       })
//       .catch(console.error);
//   }, [plan.dept_budget_plan_id, pastYearPlan?.dept_budget_plan_id]);

//   // ── Effect 1: Rebuild full items list when plan/pastYear changes ─────────
//   // Does NOT depend on obligationYearPlan so a silent obligation refresh
//   // from LBPForms won't wipe the entire local state.
//   useEffect(() => {
//     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
//     pastYearPlan?.items.forEach(item => {
//       pastData.set(item.expense_item_id, {
//         total:  Number(item.total_amount) || 0,
//         sem1:   Number((item as any).sem1_amount) || 0,
//         sem2:   Number((item as any).sem2_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     // Seed obligation data from obligationYearPlan at build time
//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan?.items.forEach(item => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number((item as any).obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     const merged: ItemWithMeta[] = plan.items.map(planItem => {
//       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0 };
//       return {
//         ...planItem,
//         expense_item:         expenseItemMap.get(planItem.expense_item_id),
//         pastTotal:            past.total,
//         pastSem1:             past.sem1,
//         pastSem2:             past.sem2,
//         pastObligation:       obligationData.get(planItem.expense_item_id)?.amount ?? 0,
//         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
//         pastItemId:           past.itemId || undefined,
//         recommendation:       (planItem as any).recommendation ?? null,
//       };
//     });

//     setItems(merged);
//     setPastSem1Edits(new Map());
//     setObligationEdits(new Map());
//     merged.forEach(item => {
//       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
//       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
//       savedObligations.current.set(item.expense_item_id, item.pastObligation);
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [plan, pastYearPlan, expenseItemMap]); // intentionally excludes obligationYearPlan

//   // ── Effect 2: Patch ONLY obligation fields when obligationYearPlan refreshes
//   // This runs after LBPForms silently re-fetches the obligation year plan.
//   // It MERGES updated obligation data into existing items without rebuilding,
//   // so any in-flight edits or local state for other fields are preserved.
//   useEffect(() => {
//     if (!obligationYearPlan) return;

//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan.items.forEach((item: any) => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number(item.obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     setItems(prev => prev.map(i => {
//       const obl = obligationData.get(i.expense_item_id);
//       if (!obl) return i;
//       // Only update if the value actually changed (avoid unnecessary re-renders)
//       if (obl.amount === i.pastObligation && obl.itemId === i.pastObligationItemId) return i;
//       // Update savedObligations ref so the blur guard stays accurate
//       savedObligations.current.set(i.expense_item_id, obl.amount);
//       return { ...i, pastObligation: obl.amount, pastObligationItemId: obl.itemId };
//     }));
//   }, [obligationYearPlan]);

//   const handleProposedChange = useCallback((id: number, value: number) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

//   const handleBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const cur = Number(item.total_amount);
//     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
//     setSavingItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       const payload = { total_amount: cur };
//       const res = item.dept_bp_form2_item_id === 0
//         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
//         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
//       savedValues.current.set(expenseItemId, cur);
//       // Update local state immediately so value shows without reload
//       const saved = res.data.data;
//       if (saved) {
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
//             : i
//         ));
//       }
//       onItemUpdate();
//       return res.data;
//     })();
//     toast.promise(promise, {
//       loading: 'Saving…',
//       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
//       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
//     });
//     try { await promise; } catch {}
//     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

//   const handlePastSem1Change = (id: number, value: number) =>
//     setPastSem1Edits(prev => new Map(prev).set(id, value));

//   const handlePastSem1Blur = async (expenseItemId: number) => {
//     const edit = pastSem1Edits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;

//     const hasPastRecord = item.pastTotal > 0 && !!item.pastItemId;
//     const pastPlanId    = pastYearPlan?.dept_budget_plan_id;

//     // Admin editing past year sem1:
//     //   - If a past-year record exists → PUT to pastYearPlan
//     //   - If no past-year record yet   → POST to pastYearPlan to create it first
//     // Non-admin: can only split existing sem1 on their own draft plan
//     if (isAdmin && !hasPastRecord) {
//       // Guard: pastYearPlan must be available for admin to create a new past-year item
//       if (!pastPlanId) {
//         toast.error('Past year plan not found for this department.');
//         setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//         return;
//       }
//     }

//     const cap      = hasPastRecord ? item.pastTotal : Number(item.total_amount);
//     const clamped  = Math.min(Math.max(edit, 0), cap);
//     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === item.pastSem1) {
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }

//     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (hasPastRecord) {
//         // Update existing past-year item
//         await API.put(
//           `/department-budget-plans/${pastPlanId}/items/${item.pastItemId}`,
//           { sem1_amount: clamped }
//         );
//       } else if (isAdmin && pastPlanId) {
//         // Admin: no past-year record → create one on pastYearPlan
//         const res = await API.post(
//           `/department-budget-plans/${pastPlanId}/items`,
//           { expense_item_id: expenseItemId, sem1_amount: clamped, sem2_amount: 0, total_amount: clamped }
//         );
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, pastItemId: newItemId, pastTotal: clamped } : i
//         ));
//       } else {
//         // Non-admin fallback (should not normally reach here)
//         const targetId = item.dept_bp_form2_item_id;
//         const planId   = plan.dept_budget_plan_id;
//         if (!targetId || !planId) return;
//         await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
//       }
//       // Update local sem1/sem2 display immediately
//       const newTotal = hasPastRecord ? item.pastTotal : clamped;
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId
//           ? { ...i, pastSem1: clamped, pastSem2: newTotal - clamped } : i
//       ));
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//     })();
//     toast.promise(promise, { loading: 'Saving Sem 1…', success: 'Sem 1 saved', error: (err: any) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
//     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
//     if (!item) return;
//     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
//     if (!confirm('Remove this item?')) return;
//     try {
//       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
//       toast.success('Item deleted'); onItemUpdate();
//     } catch { toast.error('Failed to delete item.'); }
//   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

//   const handleRecommendationChange = useCallback((id: number, value: string) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item || item.dept_bp_form2_item_id === 0) return;
//     const cur = item.recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
//     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
//       savedRecommendations.current.set(expenseItemId, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

//   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
//     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleAipRecommendationBlur = useCallback(async (id: number) => {
//     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
//     if (!item) return;
//     const cur = (item as any).recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
//     setSavingAipRecommendations(prev => new Set(prev).add(id));
//     const promise = (async () => {
//       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
//       savedAipRecommendations.current.set(id, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
//   }, [aipItems, savingAipRecommendations]);

//   // ── AIP obligation handlers (admin only — saves to obligation_amount on PAST YEAR form4 item) ──
//   // `id` here is the dept_bp_form4_item_id of the CURRENT plan's AIP item.
//   // We must find (or create) the matching AIP entry on pastYearPlan, then save there.

//   const handleAipObligationChange = (id: number, value: number) =>
//     setAipObligationEdits(prev => new Map(prev).set(id, value));

//   const handleAipObligationBlur = async (id: number) => {
//     const edit = aipObligationEdits.get(id);
//     if (edit === undefined) return;
//     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
//     if (!item) return;
//     const clamped = Math.max(edit, 0);
//     if (clamped !== edit) setAipObligationEdits(prev => new Map(prev).set(id, clamped));
//     if (clamped === savedAipObligations.current.get(id)) {
//       setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//       return;
//     }

//     const pastPlanId = pastYearPlan?.dept_budget_plan_id;
//     if (!pastPlanId) {
//       toast.error('Past year plan not found for this department.');
//       setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//       return;
//     }

//     setSavingAipObligations(prev => new Set(prev).add(id));
//     const promise = (async () => {
//       // Check if pastYearPlan already has a form4 item for this AIP program
//       const pastItemId: number | undefined = (item as any).pastAipItemId;

//       if (pastItemId) {
//         // Already exists on past year plan — just update obligation_amount
//         await API.put(`/form4-items/${pastItemId}`, { obligation_amount: clamped });
//       } else {
//         // No past-year form4 item yet — create one on pastYearPlan
//         const res = await API.post('/form4-items', {
//           budget_plan_id:      pastPlanId,
//           aip_program_id:      item.aip_program_id,
//           program_description: item.program_description,
//           obligation_amount:   clamped,
//           ps_amount:           0,
//           mooe_amount:         0,
//           co_amount:           0,
//         });
//         const newPastItemId: number = res.data.data?.dept_bp_form4_item_id;
//         // Store the newly created past-year item ID on the current item in state
//         setAipItems(prev => prev.map(i =>
//           i.dept_bp_form4_item_id === id ? { ...i, pastAipItemId: newPastItemId } : i
//         ));
//       }

//       savedAipObligations.current.set(id, clamped);
//       // Update displayed obligation_amount on the current item so it reflects the save
//       setAipItems(prev => prev.map(i =>
//         i.dept_bp_form4_item_id === id ? { ...i, obligation_amount: clamped } : i
//       ));
//       setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//       onItemUpdate();
//     })();
//     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
//     try { await promise; } catch {}
//     finally { setSavingAipObligations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
//   };

//   const handleAipCommaInput = (id: number, rawValue: string) => {
//     const digits = rawValue.replace(/[^0-9]/g, '');
//     setInputDraft(prev => new Map(prev).set(`aip_${id}_obligation`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
//     const num = digits === '' ? 0 : parseInt(digits, 10);
//     handleAipObligationChange(id, num);
//   };

//   const handleAipCommaBlur = (id: number) => {
//     setInputDraft(prev => { const n = new Map(prev); n.delete(`aip_${id}_obligation`); return n; });
//     handleAipObligationBlur(id);
//   };

//   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

//   const handleObligationChange = (expenseItemId: number, value: number) =>
//     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

//   const handleObligationBlur = async (expenseItemId: number) => {
//     const edit = obligationEdits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const clamped = Math.max(edit, 0);
//     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === savedObligations.current.get(expenseItemId)) {
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }
//     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
//     setSavingObligations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (item.pastObligationItemId) {
//         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
//       } else {
//         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
//           expense_item_id: expenseItemId,
//           obligation_amount: clamped,
//         });
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
//         ));
//         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
//         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {}); // ignore 422 duplicate
//         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {}); // ignore 422 duplicate
//       }
//       savedObligations.current.set(expenseItemId, clamped);
//       // Update local state immediately so amount shows without reload
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
//       ));
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       onItemUpdate();
//     })();
//     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
//     try { await promise; } catch {}
//     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
//     const key = `${id}_${field}`;
//     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
//   };

//   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
//     const digits = rawValue.replace(/[^0-9]/g, '');
//     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
//     const num = digits === '' ? 0 : parseInt(digits, 10);
//     if (field === 'proposed') handleProposedChange(id, num);
//     else if (field === 'sem1') handlePastSem1Change(id, num);
//     else handleObligationChange(id, num);
//   };

//   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
//     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
//     if (field === 'proposed') handleBlur(id);
//     else if (field === 'sem1') handlePastSem1Blur(id);
//     else handleObligationBlur(id);
//   };

//   const itemsByClassification = useMemo(() =>
//     classifications
//       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
//       .map(c => ({
//         ...c,
//         items: items
//           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
//           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
//       })), [classifications, items]);

//   // Grand totals: account for in-flight pastSem1Edits so subtotals calculate live
//   const grandTotals = useMemo(() => {
//     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
//     for (const i of items) {
//       const sem1 = pastSem1Edits.has(i.expense_item_id)
//         ? pastSem1Edits.get(i.expense_item_id)!
//         : i.pastSem1;
//       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//       const sem2 = pastSem1Edits.has(i.expense_item_id)
//         ? Math.max(cap - sem1, 0)
//         : i.pastSem2;
//       pastSem1  += sem1;
//       pastSem2  += sem2;
//       pastTotal += i.pastTotal;
//       proposed  += Number(i.total_amount);
//     }
//     return { pastSem1, pastSem2, pastTotal, proposed };
//   }, [items, pastSem1Edits]);

//   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
//   const calamityTotal = calamityData?.calamity_fund ?? 0;

//   const grandFinal = useMemo(() => ({
//     pastSem1:  grandTotals.pastSem1,
//     pastSem2:  grandTotals.pastSem2,
//     pastTotal: grandTotals.pastTotal,
//     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
//   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

//   const prevYear = Number(plan.budget_plan?.year) - 1;
//   const currYear = plan.budget_plan?.year;
//   const hasRows  = items.length > 0 || aipItems.length > 0;

//   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
//   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

//   const hasAipSection      = aipItems.length > 0;
//   const hasCalamitySection = isSpecialAccount;

//   let gIdx = 0;

//   return (
//     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

//       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
//           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
//             Programmed Appropriation and Obligation by Object of Expenditures
//           </h3>
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

//           <colgroup>
//             {COL_WIDTHS.map((w, i) => {
//               if ((i === 2 || i === 9) && !isAdmin) return null;
//               return <col key={i} style={{ width: w }} />;
//             })}
//           </colgroup>

//           {/* ── Main thead ──────────────────────────────────────────────── */}
//           <thead className="sticky top-0 z-10">
//             <tr>
//               <th className={TH} rowSpan={2}>Acct Code</th>
//               <th className={TH} rowSpan={2}>Object of Expenditure</th>

//               {isAdmin && (
//                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
//                   Past Year ({Number(plan.budget_plan?.year) - 2})
//                 </th>
//               )}

//               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
//                 Appropriation ({prevYear})
//               </th>

//               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

//               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
//               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
//               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
//             </tr>
//             <tr>
//               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
//               <th className={TH_APP}>Sem 2</th>
//               <th className={TH_APP}>Total</th>
//             </tr>
//           </thead>

//           <tbody>
//             {itemsByClassification.map((cls, clsIndex) => {
//               const isPS = cls.expense_class_id === PS_CLASS_ID;
//               const canEdit     = isEditable && (!isPS || isAdmin);
//               const canEditSem1 = isEditable && (isAdmin || !isPS);

//               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
//                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

//               // Subtotals: use live pastSem1Edits for past year columns
//               const clsSem1 = cls.items.reduce((s, i) => {
//                 const sem1 = pastSem1Edits.has(i.expense_item_id)
//                   ? pastSem1Edits.get(i.expense_item_id)!
//                   : i.pastSem1;
//                 return s + sem1;
//               }, 0);
//               const clsSem2 = cls.items.reduce((s, i) => {
//                 if (pastSem1Edits.has(i.expense_item_id)) {
//                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
//                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//                   return s + Math.max(cap - sem1, 0);
//                 }
//                 return s + i.pastSem2;
//               }, 0);
//               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
//               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
//               const clsDiff = clsProp - clsPast;
//               const clsPct  = pctOf(clsPast, clsDiff);

//               const isLastCls       = clsIndex === itemsByClassification.length - 1;
//               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
//               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

//               return (
//                 <React.Fragment key={cls.expense_class_id}>

//                   {/* Section divider */}
//                   <tr className="bg-gray-50 border-y border-gray-200">
//                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
//                           {isPS && (
//                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
//                               Auto-filled from Personnel Services
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-1.5">
                          
//                           {canEdit && (
//                             <Tooltip>
//                               <TooltipTrigger asChild>
//                                 <Button size="sm" variant="outline"
//                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
//                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
//                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
//                                 </Button>
//                               </TooltipTrigger>
//                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
//                             </Tooltip>
//                           )}
//                         </div>
//                       </div>
//                     </td>
//                   </tr>

//                   {cls.items.length === 0 ? (
//                     <>
//                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   ) : (
//                     <>
//                       {cls.items.map(item => {
//                         const delay    = Math.min(gIdx * 18, 280);
//                         gIdx++;
//                         const past     = item.pastTotal;
//                         const proposed = Number(item.total_amount);
//                         const d        = incr(past, proposed);
//                         const p        = pctOf(past, d);
//                         const isSaving = savingItems.has(item.expense_item_id);

//                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
//                           ? pastSem1Edits.get(item.expense_item_id)!
//                           : item.pastSem1;
//                         const sem2Cap  = past > 0 ? past : proposed;
//                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
//                           ? sem2Cap - dispSem1
//                           : item.pastSem2;

//                         // Admin can edit Sem 1 whenever pastYearPlan is available (even if past=0 —
//                         // they may be entering the appropriation from scratch for a special account).
//                         // Non-admin can only split an existing past total.
//                         const sem1Editable = canEditSem1 && (
//                           (isAdmin && !!pastYearPlan) || (!isAdmin && past > 0)
//                         );

//                         return (
//                           <tr
//                             key={item.expense_item_id}
//                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
//                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
//                           >
//                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
//                             <td className={cn(TD, 'text-gray-800 font-medium')}>
//                               <div className="flex items-center justify-between gap-1">
//                                 <span>{item.expense_item?.expense_class_item_name}</span>
//                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
//                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
//                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
//                                     <TrashIcon className="w-3.5 h-3.5" />
//                                   </button>
//                                 )}
//                               </div>
//                             </td>

//                             {/* ── Obligation — blue, admin only ─────────── */}
//                             {isAdmin && (
//                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'obligation',
//                                     obligationEdits.has(item.expense_item_id)
//                                       ? obligationEdits.get(item.expense_item_id)!
//                                       : item.pastObligation)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
//                                   disabled={savingObligations.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               </td>
//                             )}

//                             {/* ── Sem 1 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                               {sem1Editable ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
//                                   disabled={savingPastItems.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               ) : (
//                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
//                               )}
//                             </td>

//                             {/* ── Sem 2 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

//                             {/* ── Past Total — blue ────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

//                             {/* ── Proposed — orange ────────────────────────── */}
//                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
//                               {canEdit ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
//                                   disabled={isSaving} className={inputCls} />
//                               ) : (
//                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
//                                   {proposed === 0 ? '–' : fmtP(proposed)}
//                                 </span>
//                               )}
//                             </td>

//                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
//                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

//                             {/* Recommendation */}
//                             {isAdmin && (
//                               <td className={TD}>
//                                 {isEditable && (isAdmin || !isPS) ? (
//                                   <input type="text" value={item.recommendation ?? ''}
//                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
//                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
//                                     disabled={savingRecommendations.has(item.expense_item_id)}
//                                     placeholder="Add note…" maxLength={255} className={recCls} />
//                                 ) : (
//                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
//                                 )}
//                               </td>
//                             )}
//                           </tr>
//                         );
//                       })}

//                       {/* Classification subtotal */}
//                       <tr className="border-t border-gray-200">
//                         <td className="bg-gray-100" />
//                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
//                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
//                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
//                         </td>
//                         {isAdmin && <td className="bg-gray-100" />}
//                       </tr>

//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   )}
//                 </React.Fragment>
//               );
//             })}

//             {/* ── Special Programs (AIP) ── */}
//             {aipItems.length > 0 && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
//                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {aipItems.map(item => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   const aipObligation = aipObligationEdits.has(item.dept_bp_form4_item_id)
//                     ? aipObligationEdits.get(item.dept_bp_form4_item_id)!
//                     : ((item as any).obligation_amount ?? 0);
//                   const aipOblDraftKey = `aip_${item.dept_bp_form4_item_id}_obligation`;
//                   const aipOblDisplay = inputDraft.has(aipOblDraftKey)
//                     ? inputDraft.get(aipOblDraftKey)!
//                     : comma(aipObligation);
//                   return (
//                     <tr key={item.dept_bp_form4_item_id}
//                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
//                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
//                       {/* ── Obligation — blue, admin only ── */}
//                       {isAdmin && (
//                         <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                           <input type="text" inputMode="numeric"
//                             value={aipOblDisplay}
//                             onChange={e => handleAipCommaInput(item.dept_bp_form4_item_id, e.target.value)}
//                             onBlur={() => handleAipCommaBlur(item.dept_bp_form4_item_id)}
//                             disabled={savingAipObligations.has(item.dept_bp_form4_item_id)}
//                             className={inputAppCls}
//                           />
//                         </td>
//                       )}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
//                       {isAdmin && (
//                         <td className={TD}>
//                           {isEditable ? (
//                             <input type="text" value={(item as any).recommendation ?? ''}
//                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
//                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
//                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
//                               placeholder="Add note…" maxLength={255} className={recCls} />
//                           ) : (
//                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
//                           )}
//                         </td>
//                       )}
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {/* Only render sub-header if there's a calamity section below */}
//                 {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//               </React.Fragment>
//             )}

//             {/* ── 5% Calamity Fund ── */}
//             {isSpecialAccount && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
//                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
//                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
//                       </span>
//                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {[
//                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
//                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
//                 ].map(row => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   return (
//                     <tr key={row.code}
//                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
//                       <td className={cn(TD, 'text-gray-800')}>
//                         {row.label}
//                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
//                       </td>
//                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
//                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
//                       </td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
//                       <td />
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
//                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
//                   </td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
//                   <tr>
//                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
//                       Base:{' '}
//                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
//                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             )}
//           </tbody>

//           {/* ── Grand Total ── */}
//           <tfoot>
//             {hasRows && (
//               <tr className="bg-gray-900 text-white">
//                 <td className="px-3 py-3" />
//                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
//                   Grand Total
//                   {isSpecialAccount && calamityTotal > 0 && (
//                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
//                   )}
//                 </td>
//                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
//                 </td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
//                 </td>
//                 {isAdmin && <td className="border-l border-gray-700" />}
//               </tr>
//             )}
//           </tfoot>
//         </table>
//       </div>

//       {modalState && (
//         <AddItemModal
//           isOpen={modalState.isOpen}
//           onClose={() => setModalState(null)}
//           classificationId={modalState.classificationId}
//           classificationName={modalState.classificationName}
//           planId={plan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={items.map(i => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
//         />
//       )}

//       {/* Past-year add item modal — admin adds items to the PAST year plan (prevYear appropriation) */}
//       {pastModalState && pastYearPlan && (
//         <AddItemModal
//           isOpen={pastModalState.isOpen}
//           onClose={() => setPastModalState(null)}
//           classificationId={pastModalState.classificationId}
//           classificationName={pastModalState.classificationName}
//           planId={pastYearPlan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
//         />
//       )}
//     </div>
//   );
// };

// export default Form2;
// import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// import API from '../../services/api';
// import {
//   DepartmentBudgetPlan,
//   ExpenseClassification,
//   ExpenseItem,
//   DepartmentBudgetPlanItem,
//   DepartmentBudgetPlanForm4Item,
// } from '../../types/api';
// import AddItemModal from './AddItemModal';
// import { Button } from '@/src/components/ui/button';
// import { toast } from 'sonner';
// import { Tooltip, TooltipContent, TooltipTrigger } from '@/src/components/ui/tooltip';
// import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
// import { cn } from '@/src/lib/utils';
// import { useCalamityFund } from '../../hooks/useCalamityFund';


// // ─── Column color tokens ──────────────────────────────────────────────────────
// // Appropriation (past year) → blue
// // Proposed (budget year)    → orange

// const C_APP_TH  = 'bg-blue-50   border-blue-200   text-blue-700';
// const C_APP_TD  = 'bg-blue-50/30  border-blue-100';
// const C_APP_SUB = 'bg-blue-50   border-blue-200';
// const C_APP_GT  = 'bg-blue-950/20  border-blue-900/40  text-blue-300';

// const C_PRO_TH  = 'bg-orange-50  border-orange-200  text-orange-700';
// const C_PRO_TD  = 'bg-orange-50/30 border-orange-100';
// const C_PRO_SUB = 'bg-orange-50  border-orange-200';
// const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// // ─── Animation keyframes ──────────────────────────────────────────────────────

// const ANIM_CSS = `
// @keyframes _rowIn {
//   from { opacity: 0; transform: translateY(6px); }
//   to   { opacity: 1; transform: translateY(0); }
// }
// @media (prefers-reduced-motion: reduce) {
//   ._rowAnim { animation: none !important; opacity: 1 !important; transform: none !important; }
// }
// `;
// let _animInjected = false;
// function ensureAnim() {
//   if (_animInjected || typeof document === 'undefined') return;
//   const el = document.createElement('style');
//   el.textContent = ANIM_CSS;
//   document.head.appendChild(el);
//   _animInjected = true;
// }

// // ─── Dept → income-fund source key ───────────────────────────────────────────

// const getSourceForDepartment = (dept?: {
//   dept_abbreviation?: string; dept_name?: string;
// }): string | undefined => {
//   if (!dept) return undefined;
//   const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
//   const name = dept.dept_name?.toLowerCase() ?? '';
//   if (abbr === 'sh'  || name.includes('slaughter'))       return 'sh';
//   if (abbr === 'occ' || name.includes('opol community'))  return 'occ';
//   if (abbr === 'pm'  || name.includes('public market'))   return 'pm';
//   return undefined;
// };

// const PS_CLASS_ID = 1;

// // ─── Types ────────────────────────────────────────────────────────────────────

// interface Form2Props {
//   plan: DepartmentBudgetPlan;
//   pastYearPlan: DepartmentBudgetPlan | null;
//   obligationYearPlan: DepartmentBudgetPlan | null;
//   classifications: ExpenseClassification[];
//   expenseItems: ExpenseItem[];
//   isEditable: boolean;
//   isAdmin?: boolean;
//   onItemUpdate: () => void;
// }

// interface ItemWithMeta extends DepartmentBudgetPlanItem {
//   pastTotal: number; pastSem1: number; pastSem2: number;
//   pastObligation: number;
//   pastObligationItemId?: number;
//   pastItemId?: number; expense_item?: ExpenseItem;
//   recommendation?: string | null;
// }

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
// const fmtP  = (n: number) => `₱${fmt(n)}`;
// const incr  = (past: number, prop: number) => prop - past;
// const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
// const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
// const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

// // Columns: AcctCode, Name, Obligation(past), Sem1, Sem2, PastTotal, Proposed, Inc/Dec, %, Recommendation
// const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// // ── Base th/td classes (neutral — no color zone) ──────────────────────────────
// const TH      = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// const TD      = 'px-3 py-2.5 text-[12px]';
// const TD_M    = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';

// // ── Appropriation (blue) ───────────────────────────────────────────────────────
// const TH_APP  = `border-b border-blue-200   bg-blue-50   px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700  text-right`;
// const TD_APP  = `${TD_M} bg-blue-50/30`;

// // ── Proposed (orange) ─────────────────────────────────────────────────────────
// const TH_PRO  = `border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right`;
// const TD_PRO  = `${TD_M} bg-orange-50/30`;

// const inputCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-orange-300 placeholder:text-gray-300 disabled:opacity-50';

// const inputAppCls =
//   'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-blue-300 placeholder:text-gray-300 disabled:opacity-50';

// const recCls =
//   'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full ' +
//   'focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

// // ─── Sub-header ───────────────────────────────────────────────────────────────

// const SubHeader: React.FC<{
//   prevYear: number | string | undefined;
//   currYear: number | string | undefined;
//   isAdmin?: boolean;
// }> = ({ prevYear, currYear, isAdmin }) => (
//   <>
//     <tr>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
//       <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
//       {isAdmin && (
//         <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
//           Past Year ({Number(prevYear) - 1})
//         </th>
//       )}
//       <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
//         Appropriation ({prevYear})
//       </th>
//       <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>Proposed ({currYear})</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
//       <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
//       {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
//     </tr>
//     <tr>
//       <th className={TH_APP}>Sem 1</th>
//       <th className={TH_APP}>Sem 2</th>
//       <th className={TH_APP}>Total</th>
//     </tr>
//   </>
// );

// // ─── Component ────────────────────────────────────────────────────────────────

// const Form2: React.FC<Form2Props> = ({
//   plan, pastYearPlan, obligationYearPlan, classifications, expenseItems, isEditable, isAdmin = false, onItemUpdate,
// }) => {
//   useEffect(() => { ensureAnim(); }, []);

//   const [items,    setItems]    = useState<ItemWithMeta[]>([]);
//   const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

//   const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
//   const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
//   const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
//   const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

//   const savedValues             = useRef<Map<number, number>>(new Map());
//   const savedRecommendations    = useRef<Map<number, string | null>>(new Map());
//   const savedAipRecommendations = useRef<Map<number, string | null>>(new Map());

//   const [pastSem1Edits,     setPastSem1Edits]     = useState<Map<number, number>>(new Map());
//   const [obligationEdits,   setObligationEdits]   = useState<Map<number, number>>(new Map());
//   const [savingObligations, setSavingObligations] = useState<Set<number>>(new Set());
//   const [inputDraft,        setInputDraft]        = useState<Map<string, string>>(new Map());
//   const [modalState,        setModalState]        = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);
//   const [pastModalState, setPastModalState] = useState<{
//     isOpen: boolean; classificationId: number; classificationName: string;
//   } | null>(null);

//   const savedObligations    = useRef<Map<number, number>>(new Map());
//   const savedAipObligations = useRef<Map<number, number>>(new Map());
//   // Maps current-plan form4 item id → obligation-year plan form4 item id
//   const oblAipItemIdRef     = useRef<Map<number, number>>(new Map());
//   // Maps current-plan form4 item id → aip_program_id (avoids stale aipItems reads in blur)
//   const aipProgramIdRef     = useRef<Map<number, number>>(new Map());

//   const [aipObligationEdits,   setAipObligationEdits]   = useState<Map<number, number>>(new Map());
//   const [savingAipObligations, setSavingAipObligations] = useState<Set<number>>(new Set());
//   // Ref mirror so blur handlers always read the latest edit value (avoids stale closure)
//   const aipObligationEditsRef = useRef<Map<number, number>>(new Map());

//   const incomeSource = getSourceForDepartment(plan.department);
//   const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
//     useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

//   const expenseItemMap = useMemo(
//     () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
//     [expenseItems]
//   );

//   // ─────────────────────────────────────────────────────────────────────────
//   // FIX: AIP items — obligations come from the OBLIGATION year plan (2025),
//   //      NOT from pastYearPlan (2026).
//   //
//   //  plan               = 2027  (the plan being proposed)
//   //  pastYearPlan       = 2026  (appropriation year — Sem1/Sem2/Total columns)
//   //  obligationYearPlan = 2025  (obligation year — the "Past Year" blue column)
//   // ─────────────────────────────────────────────────────────────────────────
//   // useEffect(() => {
//   //   const oblPlanId = obligationYearPlan?.dept_budget_plan_id;

//   //   API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
//   //     .then(async res => {
//   //       const raw = res.data.data || [];

//   //       // Fetch the OBLIGATION year plan's form4 items (2025) so we can display
//   //       // and edit obligation_amount correctly.
//   //       let oblByProgram = new Map<number, { itemId: number; obligation: number }>();
//   //       if (oblPlanId) {
//   //         try {
//   //           const oblRes = await API.get('/form4-items', { params: { budget_plan_id: oblPlanId } });
//   //           (oblRes.data.data || []).forEach((pi: any) => {
//   //             oblByProgram.set(pi.aip_program_id, {
//   //               itemId:     pi.dept_bp_form4_item_id,
//   //               obligation: parseFloat(pi.obligation_amount) || 0,
//   //             });
//   //           });
//   //         } catch { /* silent — obligation plan may not exist yet */ }
//   //       }

//   //       setAipItems(raw.map((item: any) => {
//   //         const obl = oblByProgram.get(item.aip_program_id);
//   //         return {
//   //           ...item,
//   //           ps_amount:         parseFloat(item.ps_amount)         || 0,
//   //           mooe_amount:       parseFloat(item.mooe_amount)       || 0,
//   //           co_amount:         parseFloat(item.co_amount)         || 0,
//   //           total_amount:      parseFloat(item.total_amount)      || 0,
//   //           sem1_amount:       parseFloat(item.sem1_amount)       || 0,
//   //           sem2_amount:       parseFloat(item.sem2_amount)       || 0,
//   //           // The displayed "Past Year" obligation value comes from the 2025 plan
//   //           obligation_amount: obl?.obligation ?? 0,
//   //           // Store the 2025 form4 item id so saves go to the right record
//   //           oblAipItemId:      obl?.itemId ?? undefined,
//   //           recommendation:    item.recommendation ?? null,
//   //         };
//   //       }));

//   //       raw.forEach((item: any) => {
//   //         savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null);
//   //         const obl = oblByProgram.get(item.aip_program_id);
//   //         savedAipObligations.current.set(item.dept_bp_form4_item_id, obl?.obligation ?? 0);
//   //         // Cache the obligation-year item id in a ref so blur handler never reads stale state
//   //         if (obl?.itemId) oblAipItemIdRef.current.set(item.dept_bp_form4_item_id, obl.itemId);
//   //         aipProgramIdRef.current.set(item.dept_bp_form4_item_id, item.aip_program_id);
//   //       });
//   //     })
//   //     .catch(console.error);
//   // // Re-run when either the proposed plan OR the obligation year plan changes
//   // }, [plan.dept_budget_plan_id, obligationYearPlan?.dept_budget_plan_id]);
// //   useEffect(() => {
// //   const oblPlanId = obligationYearPlan?.dept_budget_plan_id;

// //   API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } })
// //     .then(async res => {
// //       const raw = res.data.data || [];

// //       // Fetch the OBLIGATION year plan's form4 items (2025)
// //       let oblByProgram = new Map<number, { itemId: number; obligation: number }>();
// //       if (oblPlanId) {
// //         try {
// //           const oblRes = await API.get('/form4-items', { params: { budget_plan_id: oblPlanId } });
// //           (oblRes.data.data || []).forEach((pi: any) => {
// //             oblByProgram.set(pi.aip_program_id, {
// //               itemId:     pi.dept_bp_form4_item_id,
// //               obligation: parseFloat(pi.obligation_amount) || 0,
// //             });
// //           });
// //         } catch { /* silent — obligation plan may not exist yet */ }
// //       }

// //       // CRITICAL FIX: Also fetch the current plan's form4 items to get their IDs
// //       const currentPlanItems = new Map();
// //       raw.forEach((item: any) => {
// //         currentPlanItems.set(item.aip_program_id, {
// //           currentItemId: item.dept_bp_form4_item_id,
// //           programData: item
// //         });
// //       });

// //       setAipItems(raw.map((item: any) => {
// //         const obl = oblByProgram.get(item.aip_program_id);
// //         const currentId = currentPlanItems.get(item.aip_program_id)?.currentItemId;
        
// //         return {
// //           ...item,
// //           ps_amount:         parseFloat(item.ps_amount)         || 0,
// //           mooe_amount:       parseFloat(item.mooe_amount)       || 0,
// //           co_amount:         parseFloat(item.co_amount)         || 0,
// //           total_amount:      parseFloat(item.total_amount)      || 0,
// //           sem1_amount:       parseFloat(item.sem1_amount)       || 0,
// //           sem2_amount:       parseFloat(item.sem2_amount)       || 0,
// //           obligation_amount: obl?.obligation ?? 0,
// //           oblAipItemId:      obl?.itemId ?? undefined,
// //           currentAipItemId:  currentId, // Store the current plan's item ID
// //           recommendation:    item.recommendation ?? null,
// //         };
// //       }));

// //       // Cache the mappings
// //       raw.forEach((item: any) => {
// //         savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null);
// //         const obl = oblByProgram.get(item.aip_program_id);
// //         savedAipObligations.current.set(item.dept_bp_form4_item_id, obl?.obligation ?? 0);
// //         if (obl?.itemId) oblAipItemIdRef.current.set(item.dept_bp_form4_item_id, obl.itemId);
// //         aipProgramIdRef.current.set(item.dept_bp_form4_item_id, item.aip_program_id);
// //       });
// //     })
// //     .catch(console.error);
// // }, [plan.dept_budget_plan_id, obligationYearPlan?.dept_budget_plan_id]);
// useEffect(() => {
//   const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//   console.log('🟢 Loading AIP items');
//   console.log('🟢 Current plan ID (2026/2027):', plan.dept_budget_plan_id);
//   console.log('🟢 Obligation plan ID (2025):', oblPlanId);

//   // Fetch BOTH current plan items AND obligation plan items
//   const currentPlanPromise = API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } });
//   const obligationPlanPromise = oblPlanId ? API.get('/form4-items', { params: { budget_plan_id: oblPlanId } }) : Promise.resolve({ data: { data: [] } });

//   Promise.all([currentPlanPromise, obligationPlanPromise])
//     .then(async ([currentRes, obligationRes]) => {
//       const currentItems = currentRes.data.data || [];
//       const obligationItems = obligationRes.data.data || [];
      
//       console.log('🟢 Current plan items (2026/2027):', currentItems);
//       console.log('🟢 Obligation plan items (2025):', obligationItems);

//       // Map obligation items by aip_program_id
//       const oblByProgram = new Map();
//       obligationItems.forEach((pi: any) => {
//         oblByProgram.set(pi.aip_program_id, {
//           itemId: pi.dept_bp_form4_item_id,
//           obligation: parseFloat(pi.obligation_amount) || 0,
//         });
//       });

//       // Create a map of current items by aip_program_id
//       const currentByProgram = new Map();
//       currentItems.forEach((item: any) => {
//         currentByProgram.set(item.aip_program_id, {
//           currentItemId: item.dept_bp_form4_item_id,
//           itemData: item
//         });
//       });

//       // For each CURRENT plan item, find the corresponding OBLIGATION plan item
//       const mergedItems = currentItems.map((item: any) => {
//         const obl = oblByProgram.get(item.aip_program_id);
//         console.log(`🟢 Program ${item.aip_program_id}:`, {
//           current_item_id: item.dept_bp_form4_item_id,
//           obligation_item_id: obl?.itemId,
//           obligation_amount: obl?.obligation ?? 0
//         });
        
//         return {
//           ...item,
//           ps_amount:         parseFloat(item.ps_amount)         || 0,
//           mooe_amount:       parseFloat(item.mooe_amount)       || 0,
//           co_amount:         parseFloat(item.co_amount)         || 0,
//           total_amount:      parseFloat(item.total_amount)      || 0,
//           sem1_amount:       parseFloat(item.sem1_amount)       || 0,
//           sem2_amount:       parseFloat(item.sem2_amount)       || 0,
//           // The obligation amount comes from the 2025 plan item
//           obligation_amount: obl?.obligation ?? 0,
//           // Store the 2025 plan item ID for updates
//           oblAipItemId:      obl?.itemId ?? undefined,
//           recommendation:    item.recommendation ?? null,
//         };
//       });

//       setAipItems(mergedItems);

//       // Set up refs for all items
//       mergedItems.forEach((item: any) => {
//         savedAipRecommendations.current.set(item.dept_bp_form4_item_id, item.recommendation ?? null);
//         savedAipObligations.current.set(item.dept_bp_form4_item_id, item.obligation_amount);
//         if (item.oblAipItemId) {
//           oblAipItemIdRef.current.set(item.dept_bp_form4_item_id, item.oblAipItemId);
//         }
//         aipProgramIdRef.current.set(item.dept_bp_form4_item_id, item.aip_program_id);
//       });
//     })
//     .catch(console.error);
// }, [plan.dept_budget_plan_id, obligationYearPlan?.dept_budget_plan_id]);

//   // ── Effect 1: Rebuild full items list when plan/pastYear changes ─────────
//   useEffect(() => {
//     const pastData = new Map<number, { total: number; sem1: number; sem2: number; itemId: number }>();
//     pastYearPlan?.items.forEach(item => {
//       pastData.set(item.expense_item_id, {
//         total:  Number(item.total_amount) || 0,
//         sem1:   Number((item as any).sem1_amount) || 0,
//         sem2:   Number((item as any).sem2_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     // Seed obligation data from obligationYearPlan at build time
//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan?.items.forEach(item => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number((item as any).obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     const merged: ItemWithMeta[] = plan.items.map(planItem => {
//       const past = pastData.get(planItem.expense_item_id) || { total: 0, sem1: 0, sem2: 0, itemId: 0 };
//       return {
//         ...planItem,
//         expense_item:         expenseItemMap.get(planItem.expense_item_id),
//         pastTotal:            past.total,
//         pastSem1:             past.sem1,
//         pastSem2:             past.sem2,
//         pastObligation:       obligationData.get(planItem.expense_item_id)?.amount ?? 0,
//         pastObligationItemId: obligationData.get(planItem.expense_item_id)?.itemId,
//         pastItemId:           past.itemId || undefined,
//         recommendation:       (planItem as any).recommendation ?? null,
//       };
//     });

//     setItems(merged);
//     setPastSem1Edits(new Map());
//     setObligationEdits(new Map());
//     merged.forEach(item => {
//       savedValues.current.set(item.expense_item_id, Number(item.total_amount));
//       savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
//       savedObligations.current.set(item.expense_item_id, item.pastObligation);
//     });
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, [plan, pastYearPlan, expenseItemMap]);

//   // ── Effect 2: Patch ONLY obligation fields when obligationYearPlan refreshes
//   useEffect(() => {
//     if (!obligationYearPlan) return;

//     const obligationData = new Map<number, { amount: number; itemId: number }>();
//     obligationYearPlan.items.forEach((item: any) => {
//       obligationData.set(item.expense_item_id, {
//         amount: Number(item.obligation_amount) || 0,
//         itemId: item.dept_bp_form2_item_id,
//       });
//     });

//     setItems(prev => prev.map(i => {
//       const obl = obligationData.get(i.expense_item_id);
//       if (!obl) return i;
//       if (obl.amount === i.pastObligation && obl.itemId === i.pastObligationItemId) return i;
//       savedObligations.current.set(i.expense_item_id, obl.amount);
//       return { ...i, pastObligation: obl.amount, pastObligationItemId: obl.itemId };
//     }));
//   }, [obligationYearPlan]);

//   const handleProposedChange = useCallback((id: number, value: number) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)), []);

//   const handleBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const cur = Number(item.total_amount);
//     if (savedValues.current.get(expenseItemId) === cur || savingItems.has(expenseItemId)) return;
//     setSavingItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       const payload = { total_amount: cur };
//       const res = item.dept_bp_form2_item_id === 0
//         ? await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: item.expense_item_id, ...payload })
//         : await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, payload);
//       savedValues.current.set(expenseItemId, cur);
//       const saved = res.data.data;
//       if (saved) {
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
//             : i
//         ));
//       }
//       onItemUpdate();
//       return res.data;
//     })();
//     toast.promise(promise, {
//       loading: 'Saving…',
//       success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
//       error: (err) => `Failed: ${err.response?.data?.message || err.message}`,
//     });
//     try { await promise; } catch {}
//     finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

//   const handlePastSem1Change = (id: number, value: number) =>
//     setPastSem1Edits(prev => new Map(prev).set(id, value));

//   const handlePastSem1Blur = async (expenseItemId: number) => {
//     const edit = pastSem1Edits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;

//     const hasPastRecord = item.pastTotal > 0 && !!item.pastItemId;
//     const pastPlanId    = pastYearPlan?.dept_budget_plan_id;

//     if (isAdmin && !hasPastRecord) {
//       if (!pastPlanId) {
//         toast.error('Past year plan not found for this department.');
//         setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//         return;
//       }
//     }

//     const cap      = hasPastRecord ? item.pastTotal : Number(item.total_amount);
//     const clamped  = Math.min(Math.max(edit, 0), cap);
//     if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === item.pastSem1) {
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }

//     setSavingPastItems(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (hasPastRecord) {
//         await API.put(
//           `/department-budget-plans/${pastPlanId}/items/${item.pastItemId}`,
//           { sem1_amount: clamped }
//         );
//       } else if (isAdmin && pastPlanId) {
//         const res = await API.post(
//           `/department-budget-plans/${pastPlanId}/items`,
//           { expense_item_id: expenseItemId, sem1_amount: clamped, sem2_amount: 0, total_amount: clamped }
//         );
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId
//             ? { ...i, pastItemId: newItemId, pastTotal: clamped } : i
//         ));
//       } else {
//         const targetId = item.dept_bp_form2_item_id;
//         const planId   = plan.dept_budget_plan_id;
//         if (!targetId || !planId) return;
//         await API.put(`/department-budget-plans/${planId}/items/${targetId}`, { sem1_amount: clamped });
//       }
//       const newTotal = hasPastRecord ? item.pastTotal : clamped;
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId
//           ? { ...i, pastSem1: clamped, pastSem2: newTotal - clamped } : i
//       ));
//       setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//     })();
//     toast.promise(promise, { loading: 'Saving Sem 1…', success: 'Sem 1 saved', error: (err: any) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
//     const item = items.find(i => i.dept_bp_form2_item_id === itemId);
//     if (!item) return;
//     if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
//     if (!confirm('Remove this item?')) return;
//     try {
//       await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
//       toast.success('Item deleted'); onItemUpdate();
//     } catch { toast.error('Failed to delete item.'); }
//   }, [items, plan.dept_budget_plan_id, onItemUpdate]);

//   const handleRecommendationChange = useCallback((id: number, value: string) =>
//     setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item || item.dept_bp_form2_item_id === 0) return;
//     const cur = item.recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedRecommendations.current.get(expenseItemId)) === norm(cur) || savingRecommendations.has(expenseItemId)) return;
//     setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: norm(cur) });
//       savedRecommendations.current.set(expenseItemId, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   }, [items, plan.dept_budget_plan_id, savingRecommendations]);

//   const handleAipRecommendationChange = useCallback((id: number, value: string) =>
//     setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)), []);

//   const handleAipRecommendationBlur = useCallback(async (id: number) => {
//     const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
//     if (!item) return;
//     const cur = (item as any).recommendation ?? null;
//     const norm = (v: string | null | undefined) => v === '' ? null : (v ?? null);
//     if (norm(savedAipRecommendations.current.get(id)) === norm(cur) || savingAipRecommendations.has(id)) return;
//     setSavingAipRecommendations(prev => new Set(prev).add(id));
//     const promise = (async () => {
//       await API.put(`/form4-items/${id}`, { recommendation: norm(cur) });
//       savedAipRecommendations.current.set(id, cur);
//     })();
//     toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
//     try { await promise; } catch {}
//     finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
//   }, [aipItems, savingAipRecommendations]);

//   // ── AIP obligation handlers ───────────────────────────────────────────────
//   //
//   // The "Past Year" obligation column for AIP/Special Programs must save to the
//   // OBLIGATION year plan (2025), not the appropriation year plan (2026).
//   //
//   // `id` = dept_bp_form4_item_id on the CURRENT (2027) plan's AIP item.
//   // We look up (or create) the matching item on the OBLIGATION year plan (2025)
//   // and write obligation_amount there.

//   const handleAipObligationChange = (id: number, value: number) => {
//     aipObligationEditsRef.current.set(id, value);
//     setAipObligationEdits(prev => new Map(prev).set(id, value));
//   };

//   // const handleAipObligationBlur = async (id: number) => {
//   //   // Read from refs — state may be stale in this closure
//   //   const edit = aipObligationEditsRef.current.get(id);
//   //   if (edit === undefined) return;
//   //   const aipProgramId = aipProgramIdRef.current.get(id);
//   //   if (!aipProgramId) return;
//   //   const clamped = Math.max(edit, 0);
//   //   if (clamped !== edit) setAipObligationEdits(prev => new Map(prev).set(id, clamped));
//   //   if (clamped === savedAipObligations.current.get(id)) {
//   //     aipObligationEditsRef.current.delete(id);
//   //     setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//   //     return;
//   //   }

//   //   // FIX: target the OBLIGATION year plan (2025), not pastYearPlan (2026)
//   //   const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//   //   if (!oblPlanId) {
//   //     toast.error('Obligation year plan (2025) not found for this department.');
//   //     setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//   //     return;
//   //   }

//   //   setSavingAipObligations(prev => new Set(prev).add(id));
//   //   const promise = (async () => {
//   //     // Read from ref — avoids stale closure on item state
//   //     let oblItemId: number | undefined = oblAipItemIdRef.current.get(id);

//   //     if (oblItemId) {
//   //       // Already have the ID — PUT directly
//   //       await API.put(`/form4-items/${oblItemId}`, { obligation_amount: clamped });
//   //     } else {
//   //       // Try to create a new form4 item on the obligation year plan
//   //       try {
//   //         const res = await API.post('/form4-items', {
//   //           budget_plan_id:      oblPlanId,
//   //           aip_program_id:      aipProgramId,
//   //           program_description: aipItems.find(i => i.dept_bp_form4_item_id === id)?.program_description ?? '',
//   //           obligation_amount:   clamped,
//   //           ps_amount:           0,
//   //           mooe_amount:         0,
//   //           co_amount:           0,
//   //         });
//   //         oblItemId = res.data.data?.dept_bp_form4_item_id;
//   //       } catch (postErr: any) {
//   //         // 422 = duplicate — the program already exists on the obligation year plan
//   //         // but oblAipItemId was never cached (e.g. first load before this session).
//   //         // Fetch all form4 items for that plan and find the matching one by aip_program_id.
//   //         if (postErr?.response?.status === 422) {
//   //           const listRes = await API.get('/form4-items', { params: { budget_plan_id: oblPlanId } });
//   //           const existing = (listRes.data.data || []).find(
//   //             (pi: any) => pi.aip_program_id === aipProgramId
//   //           );
//   //           if (!existing) throw postErr; // genuinely unexpected — re-throw
//   //           oblItemId = existing.dept_bp_form4_item_id;
//   //           // Now PUT the correct value
//   //           await API.put(`/form4-items/${oblItemId}`, { obligation_amount: clamped });
//   //         } else {
//   //           throw postErr;
//   //         }
//   //       }

//   //       // Cache the resolved ID in ref AND state so future saves go straight to PUT
//   //       if (oblItemId) oblAipItemIdRef.current.set(id, oblItemId);
//   //       setAipItems(prev => prev.map(i =>
//   //         i.dept_bp_form4_item_id === id ? { ...i, oblAipItemId: oblItemId } : i
//   //       ));
//   //     }

//   //     savedAipObligations.current.set(id, clamped);
//   //     // Reflect the saved value immediately in the displayed column
//   //     setAipItems(prev => prev.map(i =>
//   //       i.dept_bp_form4_item_id === id ? { ...i, obligation_amount: clamped } : i
//   //     ));
//   //     aipObligationEditsRef.current.delete(id);
//   //     setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//   //     onItemUpdate();
//   //   })();
//   //   toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
//   //   try { await promise; } catch {}
//   //   finally { setSavingAipObligations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
//   // };
//   const handleAipObligationBlur = async (id: number) => {
//   const edit = aipObligationEditsRef.current.get(id);
//   if (edit === undefined) return;

//   const aipProgramId = aipProgramIdRef.current.get(id);
//   if (!aipProgramId) {
//     console.error('No aipProgramId for id:', id);
//     return;
//   }

//   const clamped = Math.max(edit, 0);
//   const savedValue = savedAipObligations.current.get(id);
//   if (clamped === savedValue) {
//     aipObligationEditsRef.current.delete(id);
//     setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//     return;
//   }

//   const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//   if (!oblPlanId) {
//     toast.error('Obligation year plan not found.');
//     return;
//   }

//   setSavingAipObligations(prev => new Set(prev).add(id));

//   const promise = (async () => {
//     // ✅ ALWAYS fetch fresh from obligation plan — never trust cached ref
//     const listRes = await API.get('/form4-items', { 
//       params: { budget_plan_id: oblPlanId } 
//     });
    
//     const allOblItems = listRes.data.data || [];
//     console.log('🟢 Obligation plan items fetched:', allOblItems);
//     console.log('🟢 Looking for aip_program_id:', aipProgramId);
    
//     const existing = allOblItems.find(
//       (pi: any) => Number(pi.aip_program_id) === Number(aipProgramId)
//     );
//     console.log('🟢 Found existing:', existing);

//     let oblItemId: number | undefined;

//     if (existing) {
//       oblItemId = existing.dept_bp_form4_item_id;
//       console.log('🟢 Will PUT to item:', oblItemId, 'on plan:', oblPlanId);
//       await API.put(`/form4-items/${oblItemId}`, { obligation_amount: clamped });
//     } else {
//       // Item doesn't exist on obligation plan yet — create it
//       const currentItem = aipItems.find(i => i.dept_bp_form4_item_id === id);
//       console.log('🟢 Creating new item on obligation plan:', oblPlanId);
//       const res = await API.post('/form4-items', {
//         budget_plan_id:      oblPlanId,
//         aip_program_id:      aipProgramId,
//         program_description: currentItem?.program_description ?? '',
//         obligation_amount:   clamped,
//         ps_amount:           0,
//         mooe_amount:         0,
//         co_amount:           0,
//       });
//       oblItemId = res.data.data?.dept_bp_form4_item_id;
//       console.log('🟢 Created item:', oblItemId);
//     }

//     // Update ref cache with verified ID
//     if (oblItemId) oblAipItemIdRef.current.set(id, oblItemId);

//     savedAipObligations.current.set(id, clamped);
//     setAipItems(prev => prev.map(i =>
//       i.dept_bp_form4_item_id === id ? { ...i, obligation_amount: clamped } : i
//     ));
//     aipObligationEditsRef.current.delete(id);
//     setAipObligationEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
//     onItemUpdate();
//   })();

//   toast.promise(promise, {
//     loading: 'Saving obligation…',
//     success: 'Obligation saved',
//     error: (e: any) => `Failed: ${e.response?.data?.message || e.message}`,
//   });

//   try { await promise; } catch {}
//   finally { 
//     setSavingAipObligations(prev => { const n = new Set(prev); n.delete(id); return n; }); 
//   }
// };

//   const handleAipCommaInput = (id: number, rawValue: string) => {
//   const digits = rawValue.replace(/[^0-9]/g, '');
//   console.log('✏️ handleAipCommaInput - id:', id, 'rawValue:', rawValue, 'digits:', digits);
  
//   setInputDraft(prev => new Map(prev).set(`aip_${id}_obligation`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
//   const num = digits === '' ? 0 : parseInt(digits, 10);
//   console.log('✏️ Setting value to:', num);
  
//   // Update ref immediately so blur handler sees the latest value
//   aipObligationEditsRef.current.set(id, num);
//   handleAipObligationChange(id, num);
// };

//   const handleAipCommaBlur = (id: number) => {
//     setInputDraft(prev => { const n = new Map(prev); n.delete(`aip_${id}_obligation`); return n; });
//     handleAipObligationBlur(id);
//   };

//   // ── Obligation handlers (admin only, edits obligation year plan item) ──────

//   const handleObligationChange = (expenseItemId: number, value: number) =>
//     setObligationEdits(prev => new Map(prev).set(expenseItemId, value));

//   const handleObligationBlur = async (expenseItemId: number) => {
//     const edit = obligationEdits.get(expenseItemId);
//     if (edit === undefined) return;
//     const item = items.find(i => i.expense_item_id === expenseItemId);
//     if (!item) return;
//     const clamped = Math.max(edit, 0);
//     if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
//     if (clamped === savedObligations.current.get(expenseItemId)) {
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       return;
//     }
//     const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
//     if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }
//     setSavingObligations(prev => new Set(prev).add(expenseItemId));
//     const promise = (async () => {
//       if (item.pastObligationItemId) {
//         await API.put(`/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`, { obligation_amount: clamped });
//       } else {
//         const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
//           expense_item_id: expenseItemId,
//           obligation_amount: clamped,
//         });
//         const newItemId = res.data.data?.dept_bp_form2_item_id;
//         setItems(prev => prev.map(i =>
//           i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i
//         ));
//         // Cascade: ensure item exists on current (pastYearPlan) and proposed (plan)
//         await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {});
//         await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, {
//           expense_item_id: expenseItemId,
//         }).catch(() => {});
//       }
//       savedObligations.current.set(expenseItemId, clamped);
//       setItems(prev => prev.map(i =>
//         i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i
//       ));
//       setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
//       onItemUpdate();
//     })();
//     toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
//     try { await promise; } catch {}
//     finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
//   };

//   const getDraftValue = (id: number, field: 'proposed' | 'sem1' | 'obligation', raw: number) => {
//     const key = `${id}_${field}`;
//     return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
//   };

//   const handleCommaInput = (id: number, field: 'proposed' | 'sem1' | 'obligation', rawValue: string) => {
//     const digits = rawValue.replace(/[^0-9]/g, '');
//     setInputDraft(prev => new Map(prev).set(`${id}_${field}`, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
//     const num = digits === '' ? 0 : parseInt(digits, 10);
//     if (field === 'proposed') handleProposedChange(id, num);
//     else if (field === 'sem1') handlePastSem1Change(id, num);
//     else handleObligationChange(id, num);
//   };

//   const handleCommaBlur = (id: number, field: 'proposed' | 'sem1' | 'obligation') => {
//     setInputDraft(prev => { const n = new Map(prev); n.delete(`${id}_${field}`); return n; });
//     if (field === 'proposed') handleBlur(id);
//     else if (field === 'sem1') handlePastSem1Blur(id);
//     else handleObligationBlur(id);
//   };

//   const itemsByClassification = useMemo(() =>
//     classifications
//       .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
//       .map(c => ({
//         ...c,
//         items: items
//           .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
//           .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
//       })), [classifications, items]);

//   const grandTotals = useMemo(() => {
//     let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0;
//     for (const i of items) {
//       const sem1 = pastSem1Edits.has(i.expense_item_id)
//         ? pastSem1Edits.get(i.expense_item_id)!
//         : i.pastSem1;
//       const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//       const sem2 = pastSem1Edits.has(i.expense_item_id)
//         ? Math.max(cap - sem1, 0)
//         : i.pastSem2;
//       pastSem1  += sem1;
//       pastSem2  += sem2;
//       pastTotal += i.pastTotal;
//       proposed  += Number(i.total_amount);
//     }
//     return { pastSem1, pastSem2, pastTotal, proposed };
//   }, [items, pastSem1Edits]);

//   const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
//   const calamityTotal = calamityData?.calamity_fund ?? 0;

//   const grandFinal = useMemo(() => ({
//     pastSem1:  grandTotals.pastSem1,
//     pastSem2:  grandTotals.pastSem2,
//     pastTotal: grandTotals.pastTotal,
//     proposed:  grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
//   }), [grandTotals, aipTotal, isSpecialAccount, calamityTotal]);

//   const prevYear = Number(plan.budget_plan?.year) - 1;
//   const currYear = plan.budget_plan?.year;
//   const hasRows  = items.length > 0 || aipItems.length > 0;

//   const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
//   const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

//   const hasAipSection      = aipItems.length > 0;
//   const hasCalamitySection = isSpecialAccount;

//   let gIdx = 0;

//   return (
//     <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

//       <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
//         <div>
//           <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
//           <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
//             Programmed Appropriation and Obligation by Object of Expenditures
//           </h3>
//         </div>
//       </div>

//       <div className="overflow-x-auto">
//         <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>

//           <colgroup>
//             {COL_WIDTHS.map((w, i) => {
//               if ((i === 2 || i === 9) && !isAdmin) return null;
//               return <col key={i} style={{ width: w }} />;
//             })}
//           </colgroup>

//           {/* ── Main thead ──────────────────────────────────────────────── */}
//           <thead className="sticky top-0 z-10">
//             <tr>
//               <th className={TH} rowSpan={2}>Acct Code</th>
//               <th className={TH} rowSpan={2}>Object of Expenditure</th>

//               {isAdmin && (
//                 <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
//                   Past Year ({Number(plan.budget_plan?.year) - 2})
//                 </th>
//               )}

//               <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
//                 Appropriation ({prevYear})
//               </th>

//               <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>

//               <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
//               <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
//               {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
//             </tr>
//             <tr>
//               <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
//               <th className={TH_APP}>Sem 2</th>
//               <th className={TH_APP}>Total</th>
//             </tr>
//           </thead>

//           <tbody>
//             {itemsByClassification.map((cls, clsIndex) => {
//               const isPS = cls.expense_class_id === PS_CLASS_ID;
//               const canEdit     = isEditable && (!isPS || isAdmin);
//               const canEditSem1 = isEditable && (isAdmin || !isPS);

//               const label = cls.expense_class_name === 'Prop/Plant/Eqpt'
//                 ? 'Capital Outlay (CO)' : cls.expense_class_name;

//               const clsSem1 = cls.items.reduce((s, i) => {
//                 const sem1 = pastSem1Edits.has(i.expense_item_id)
//                   ? pastSem1Edits.get(i.expense_item_id)!
//                   : i.pastSem1;
//                 return s + sem1;
//               }, 0);
//               const clsSem2 = cls.items.reduce((s, i) => {
//                 if (pastSem1Edits.has(i.expense_item_id)) {
//                   const sem1 = pastSem1Edits.get(i.expense_item_id)!;
//                   const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
//                   return s + Math.max(cap - sem1, 0);
//                 }
//                 return s + i.pastSem2;
//               }, 0);
//               const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
//               const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
//               const clsDiff = clsProp - clsPast;
//               const clsPct  = pctOf(clsPast, clsDiff);

//               const isLastCls       = clsIndex === itemsByClassification.length - 1;
//               const nextClsWithData = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
//               const showSubHeader   = nextClsWithData || hasAipSection || hasCalamitySection;

//               return (
//                 <React.Fragment key={cls.expense_class_id}>

//                   {/* Section divider */}
//                   <tr className="bg-gray-50 border-y border-gray-200">
//                     <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                       <div className="flex items-center justify-between">
//                         <div className="flex items-center gap-2">
//                           <span className="text-[12px] font-semibold text-gray-700">{label}</span>
//                           {isPS && (
//                             <span className="text-[10px] font-semibold text-blue-600 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
//                               Auto-filled from Personnel Services
//                             </span>
//                           )}
//                         </div>
//                         <div className="flex items-center gap-1.5">
//                           {canEdit && (
//                             <Tooltip>
//                               <TooltipTrigger asChild>
//                                 <Button size="sm" variant="outline"
//                                   className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
//                                   onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}>
//                                   <PlusIcon className="w-3.5 h-3.5" /> Add Item
//                                 </Button>
//                               </TooltipTrigger>
//                               <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
//                             </Tooltip>
//                           )}
//                         </div>
//                       </div>
//                     </td>
//                   </tr>

//                   {cls.items.length === 0 ? (
//                     <>
//                       <tr><td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">No expense items.</td></tr>
//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   ) : (
//                     <>
//                       {cls.items.map(item => {
//                         const delay    = Math.min(gIdx * 18, 280);
//                         gIdx++;
//                         const past     = item.pastTotal;
//                         const proposed = Number(item.total_amount);
//                         const d        = incr(past, proposed);
//                         const p        = pctOf(past, d);
//                         const isSaving = savingItems.has(item.expense_item_id);

//                         const dispSem1 = pastSem1Edits.has(item.expense_item_id)
//                           ? pastSem1Edits.get(item.expense_item_id)!
//                           : item.pastSem1;
//                         const sem2Cap  = past > 0 ? past : proposed;
//                         const dispSem2 = pastSem1Edits.has(item.expense_item_id)
//                           ? sem2Cap - dispSem1
//                           : item.pastSem2;

//                         const sem1Editable = canEditSem1 && (
//                           (isAdmin && !!pastYearPlan) || (!isAdmin && past > 0)
//                         );

//                         return (
//                           <tr
//                             key={item.expense_item_id}
//                             className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
//                             style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
//                           >
//                             <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.expense_item?.expense_class_item_acc_code || '–'}</td>
//                             <td className={cn(TD, 'text-gray-800 font-medium')}>
//                               <div className="flex items-center justify-between gap-1">
//                                 <span>{item.expense_item?.expense_class_item_name}</span>
//                                 {canEdit && item.dept_bp_form2_item_id > 0 && (
//                                   <button onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
//                                     className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0" title="Remove">
//                                     <TrashIcon className="w-3.5 h-3.5" />
//                                   </button>
//                                 )}
//                               </div>
//                             </td>

//                             {/* ── Obligation — blue, admin only ─────────── */}
//                             {isAdmin && (
//                               <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'obligation',
//                                     obligationEdits.has(item.expense_item_id)
//                                       ? obligationEdits.get(item.expense_item_id)!
//                                       : item.pastObligation)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
//                                   disabled={savingObligations.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               </td>
//                             )}

//                             {/* ── Sem 1 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'border-l border-blue-100')}>
//                               {sem1Editable ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'sem1', dispSem1)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'sem1', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'sem1')}
//                                   disabled={savingPastItems.has(item.expense_item_id)}
//                                   className={inputAppCls}
//                                 />
//                               ) : (
//                                 <span className="text-gray-600">{dispSem1 === 0 ? '–' : fmtP(dispSem1)}</span>
//                               )}
//                             </td>

//                             {/* ── Sem 2 — blue ────────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>

//                             {/* ── Past Total — blue ────────────────────────── */}
//                             <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

//                             {/* ── Proposed — orange ────────────────────────── */}
//                             <td className={cn(TD_PRO, 'border-l border-orange-100')}>
//                               {canEdit ? (
//                                 <input type="text" inputMode="numeric"
//                                   value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
//                                   onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
//                                   onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
//                                   disabled={isSaving} className={inputCls} />
//                               ) : (
//                                 <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
//                                   {proposed === 0 ? '–' : fmtP(proposed)}
//                                 </span>
//                               )}
//                             </td>

//                             <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
//                             <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

//                             {/* Recommendation */}
//                             {isAdmin && (
//                               <td className={TD}>
//                                 {isEditable && (isAdmin || !isPS) ? (
//                                   <input type="text" value={item.recommendation ?? ''}
//                                     onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
//                                     onBlur={() => handleRecommendationBlur(item.expense_item_id)}
//                                     disabled={savingRecommendations.has(item.expense_item_id)}
//                                     placeholder="Add note…" maxLength={255} className={recCls} />
//                                 ) : (
//                                   <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
//                                 )}
//                               </td>
//                             )}
//                           </tr>
//                         );
//                       })}

//                       {/* Classification subtotal */}
//                       <tr className="border-t border-gray-200">
//                         <td className="bg-gray-100" />
//                         <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
//                         {isAdmin && <td className={cn(TD_M, 'bg-blue-50/30 border-l border-blue-100 text-blue-200')}>–</td>}
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
//                         <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
//                         <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
//                           {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
//                         </td>
//                         {isAdmin && <td className="bg-gray-100" />}
//                       </tr>

//                       {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//                     </>
//                   )}
//                 </React.Fragment>
//               );
//             })}

//             {/* ── Special Programs (AIP) ── */}
//             {aipItems.length > 0 && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
//                       <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">From AIP Form 4</span>
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {aipItems.map(item => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   // Use the tracked edit value if present, otherwise fall back to the
//                   // obligation_amount that was fetched from the 2025 obligation year plan.
//                   const aipObligation = aipObligationEdits.has(item.dept_bp_form4_item_id)
//                     ? aipObligationEdits.get(item.dept_bp_form4_item_id)!
//                     : ((item as any).obligation_amount ?? 0);
//                   const aipOblDraftKey = `aip_${item.dept_bp_form4_item_id}_obligation`;
//                   const aipOblDisplay = inputDraft.has(aipOblDraftKey)
//                     ? inputDraft.get(aipOblDraftKey)!
//                     : comma(aipObligation);
//                   return (
//                     <tr key={item.dept_bp_form4_item_id}
//                       className="_rowAnim hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
//                       <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>
//                       {/* ── Obligation — blue, admin only — saves to 2025 obligation year plan ── */}
//                       {/* ── Obligation — blue, admin only — saves to 2025 obligation year plan ── */}
// {isAdmin && (
//   <td className={cn(TD_APP, 'border-l border-blue-100')}>
//     <input 
//       type="text" 
//       inputMode="numeric"
//       value={aipOblDisplay}
//       onChange={(e) => {
//         console.log('🔴 INPUT ONCHANGE TRIGGERED for item:', item.dept_bp_form4_item_id);
//         console.log('🔴 New value:', e.target.value);
//         handleAipCommaInput(item.dept_bp_form4_item_id, e.target.value);
//       }}
//       onBlur={(e) => {
//         console.log('🔴 INPUT ONBLUR TRIGGERED for item:', item.dept_bp_form4_item_id);
//         console.log('🔴 Current value:', e.target.value);
//         handleAipCommaBlur(item.dept_bp_form4_item_id);
//       }}
//       disabled={savingAipObligations.has(item.dept_bp_form4_item_id)}
//       className={inputAppCls}
//       placeholder="Enter obligation amount"
//     />
//   </td>
// )}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>
//                       {isAdmin && (
//                         <td className={TD}>
//                           {isEditable ? (
//                             <input type="text" value={(item as any).recommendation ?? ''}
//                               onChange={e => handleAipRecommendationChange(item.dept_bp_form4_item_id, e.target.value)}
//                               onBlur={() => handleAipRecommendationBlur(item.dept_bp_form4_item_id)}
//                               disabled={savingAipRecommendations.has(item.dept_bp_form4_item_id)}
//                               placeholder="Add note…" maxLength={255} className={recCls} />
//                           ) : (
//                             <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
//                           )}
//                         </td>
//                       )}
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
//               </React.Fragment>
//             )}

//             {/* ── 5% Calamity Fund ── */}
//             {isSpecialAccount && (
//               <React.Fragment>
//                 <tr className="bg-gray-50 border-y border-gray-200">
//                   <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
//                     <div className="flex items-center gap-2">
//                       <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
//                       <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
//                         Derived from {['sh','occ','pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
//                       </span>
//                       {calamityLoading && <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />}
//                     </div>
//                   </td>
//                   <td className="bg-gray-50" />
//                 </tr>

//                 {[
//                   { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
//                   { code: '5% × 30%', label: 'Quick Response Fund (QRF)', note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
//                 ].map(row => {
//                   const delay = Math.min(gIdx * 18, 280);
//                   gIdx++;
//                   return (
//                     <tr key={row.code}
//                       className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
//                       style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}>
//                       <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
//                       <td className={cn(TD, 'text-gray-800')}>
//                         {row.label}
//                         <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
//                       </td>
//                       {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
//                       <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_APP, 'text-blue-200')}>–</td>
//                       <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>
//                         {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (row.value ? fmtP(row.value) : '–')}
//                       </td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? fmtP(row.value) : '–'}</td>
//                       <td className={cn(TD_M, 'text-emerald-600')}>{row.value ? '100.00%' : '–'}</td>
//                       <td />
//                     </tr>
//                   );
//                 })}

//                 <tr className="border-t border-gray-200">
//                   <td className="bg-gray-100" />
//                   <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total 5% Calamity Fund</td>
//                   {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
//                   <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn('bg-gray-100', C_APP_SUB)} />
//                   <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
//                     {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
//                   </td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
//                   <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
//                   {isAdmin && <td className="bg-gray-100" />}
//                 </tr>

//                 {calamityData?.total_tax_revenue_proposed && calamityData.total_tax_revenue_proposed > 0 && (
//                   <tr>
//                     <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
//                       Base:{' '}
//                       <span className="font-semibold text-gray-600 font-mono">{fmtP(calamityData.total_tax_revenue_proposed)}</span>
//                       {' '}× 5% = {fmtP(calamityTotal)}. Pre-Disaster = 70% · QRF = 30%.
//                     </td>
//                   </tr>
//                 )}
//               </React.Fragment>
//             )}
//           </tbody>

//           {/* ── Grand Total ── */}
//           <tfoot>
//             {hasRows && (
//               <tr className="bg-gray-900 text-white">
//                 <td className="px-3 py-3" />
//                 <td className="px-3 py-3 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
//                   Grand Total
//                   {isSpecialAccount && calamityTotal > 0 && (
//                     <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">incl. 5% Calamity Fund</span>
//                   )}
//                 </td>
//                 {isAdmin && <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l', C_APP_GT)}>–</td>}
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {gtDiff === 0 ? '–' : fmtP(gtDiff)}
//                 </td>
//                 <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
//                   {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
//                 </td>
//                 {isAdmin && <td className="border-l border-gray-700" />}
//               </tr>
//             )}
//           </tfoot>
//         </table>
//       </div>

//       {modalState && (
//         <AddItemModal
//           isOpen={modalState.isOpen}
//           onClose={() => setModalState(null)}
//           classificationId={modalState.classificationId}
//           classificationName={modalState.classificationName}
//           planId={plan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={items.map(i => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Item added successfully'); }}
//         />
//       )}

//       {pastModalState && pastYearPlan && (
//         <AddItemModal
//           isOpen={pastModalState.isOpen}
//           onClose={() => setPastModalState(null)}
//           classificationId={pastModalState.classificationId}
//           classificationName={pastModalState.classificationName}
//           planId={pastYearPlan.dept_budget_plan_id}
//           expenseItems={expenseItems}
//           existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
//           onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
//         />
//       )}
//     </div>
//   );
// };

// export default Form2;
import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
} from 'react';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PS_CLASS_ID = 1;

const COL_WIDTHS = [110, 220, 100, 95, 95, 100, 100, 95, 75, 170];

// ─── Column color tokens ──────────────────────────────────────────────────────

const C_APP_SUB = 'bg-blue-50 border-blue-200';
const C_APP_GT  = 'bg-blue-950/20 border-blue-900/40 text-blue-300';
const C_PRO_SUB = 'bg-orange-50 border-orange-200';
const C_PRO_GT  = 'bg-orange-950/20 border-orange-900/40 text-orange-300';

// ─── Table class tokens ───────────────────────────────────────────────────────

const TH     = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
const TD     = 'px-3 py-2.5 text-[12px]';
const TD_M   = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right';
const TH_APP = 'border-b border-blue-200 bg-blue-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-blue-700 text-right';
const TH_PRO = 'border-b border-orange-200 bg-orange-50 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-orange-700 text-right';
const TD_APP = `${TD_M} bg-blue-50/30`;
const TD_PRO = `${TD_M} bg-orange-50/30`;

const INPUT_BASE = 'text-[12px] font-mono text-right h-7 px-2 rounded border border-gray-200 bg-white w-full focus:outline-none placeholder:text-gray-300 disabled:opacity-50';
const inputCls    = `${INPUT_BASE} focus:ring-2 focus:ring-orange-300 focus:border-orange-300`;
const inputAppCls = `${INPUT_BASE} focus:ring-2 focus:ring-blue-300 focus:border-blue-300`;
const recCls      = 'text-[12px] h-7 px-2 rounded border border-gray-200 bg-white w-full focus:outline-none focus:ring-2 focus:ring-gray-400 placeholder:text-gray-300 disabled:opacity-50';

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
  if (_animInjected || typeof document === 'undefined') return;
  const el = document.createElement('style');
  el.textContent = ANIM_CSS;
  document.head.appendChild(el);
  _animInjected = true;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt   = (n: number) => Math.round(n).toLocaleString(undefined, { maximumFractionDigits: 0 });
const fmtP  = (n: number) => `₱${fmt(n)}`;
const pctOf = (past: number, d: number) => past === 0 ? (d === 0 ? 0 : 100) : (d / past) * 100;
const clr   = (v: number) => v < 0 ? 'text-red-500' : v > 0 ? 'text-emerald-600' : '';
const comma = (n: number) => n === 0 ? '' : Math.round(n).toLocaleString('en-US');

const normRec = (v: string | null | undefined): string | null =>
  v === '' ? null : (v ?? null);

const getSourceForDepartment = (dept?: {
  dept_abbreviation?: string;
  dept_name?: string;
}): string | undefined => {
  if (!dept) return undefined;
  const abbr = dept.dept_abbreviation?.toLowerCase() ?? '';
  const name = dept.dept_name?.toLowerCase() ?? '';
  if (abbr === 'sh'  || name.includes('slaughter'))      return 'sh';
  if (abbr === 'occ' || name.includes('opol community')) return 'occ';
  if (abbr === 'pm'  || name.includes('public market'))  return 'pm';
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

type DraftField = 'proposed' | 'sem1' | 'obligation';

// ─── Sub-header ───────────────────────────────────────────────────────────────

interface SubHeaderProps {
  prevYear: number | string | undefined;
  currYear: number | string | undefined;
  isAdmin?: boolean;
}

const SubHeader: React.FC<SubHeaderProps> = ({ prevYear, currYear, isAdmin }) => (
  <>
    <tr>
      <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Acct Code</th>
      <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Object of Expenditure</th>
      {isAdmin && (
        <th className={cn(TH_APP, 'border-t-2 border-blue-300 text-right')} rowSpan={2}>
          Past Year ({Number(prevYear) - 1})
        </th>
      )}
      <th className={cn(TH_APP, 'text-center border-t-2 border-blue-300')} colSpan={3}>
        Appropriation ({prevYear})
      </th>
      <th className={cn(TH_PRO, 'border-t-2 border-orange-300')} rowSpan={2}>
        Proposed ({currYear})
      </th>
      <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>Inc / Dec</th>
      <th className={cn(TH, 'text-right border-t-2 border-gray-300')} rowSpan={2}>%</th>
      {isAdmin && <th className={cn(TH, 'border-t-2 border-gray-300')} rowSpan={2}>Recommendation</th>}
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
  plan,
  pastYearPlan,
  obligationYearPlan,
  classifications,
  expenseItems,
  isEditable,
  isAdmin = false,
  onItemUpdate,
}) => {
  useEffect(() => { ensureAnim(); }, []);

  // ── State ──────────────────────────────────────────────────────────────────

  const [items,    setItems]    = useState<ItemWithMeta[]>([]);
  const [aipItems, setAipItems] = useState<DepartmentBudgetPlanForm4Item[]>([]);

  const [savingItems,              setSavingItems]              = useState<Set<number>>(new Set());
  const [savingPastItems,          setSavingPastItems]          = useState<Set<number>>(new Set());
  const [savingObligations,        setSavingObligations]        = useState<Set<number>>(new Set());
  const [savingRecommendations,    setSavingRecommendations]    = useState<Set<number>>(new Set());
  const [savingAipObligations,     setSavingAipObligations]     = useState<Set<number>>(new Set());
  const [savingAipRecommendations, setSavingAipRecommendations] = useState<Set<number>>(new Set());

  const [pastSem1Edits,   setPastSem1Edits]   = useState<Map<number, number>>(new Map());
  const [obligationEdits, setObligationEdits] = useState<Map<number, number>>(new Map());
  const [aipOblEdits,     setAipOblEdits]     = useState<Map<number, number>>(new Map());
  const [inputDraft,      setInputDraft]      = useState<Map<string, string>>(new Map());

  const [modalState,     setModalState]     = useState<{ isOpen: boolean; classificationId: number; classificationName: string } | null>(null);
  const [pastModalState, setPastModalState] = useState<{ isOpen: boolean; classificationId: number; classificationName: string } | null>(null);

  // ── Refs (never cause re-renders — used in async handlers) ────────────────

  const savedValues             = useRef(new Map<number, number>());
  const savedObligations        = useRef(new Map<number, number>());
  const savedAipObligations     = useRef(new Map<number, number>());
  const savedRecommendations    = useRef(new Map<number, string | null>());
  const savedAipRecommendations = useRef(new Map<number, string | null>());
  // current-plan form4 item id → obligation-year plan form4 item id
  const oblAipItemIdRef         = useRef(new Map<number, number>());
  // current-plan form4 item id → aip_program_id
  const aipProgramIdRef         = useRef(new Map<number, number>());
  // mirror of aipOblEdits state — readable in async blur without stale closures
  const aipOblEditsRef          = useRef(new Map<number, number>());

  // ── Derived ───────────────────────────────────────────────────────────────

  const incomeSource = getSourceForDepartment(plan.department);
  const { data: calamityData, loading: calamityLoading, isSpecialAccount } =
    useCalamityFund(plan.budget_plan?.budget_plan_id, incomeSource);

  const expenseItemMap = useMemo(
    () => new Map(expenseItems.map(i => [i.expense_class_item_id, i])),
    [expenseItems],
  );

  const prevYear = Number(plan.budget_plan?.year) - 1;
  const currYear = plan.budget_plan?.year;

  // ── Effect: Load AIP items + obligation-year obligations ──────────────────
  //
  //  plan               = proposed year  (e.g. 2027)
  //  pastYearPlan       = appropriation  (e.g. 2026) — Sem1/Sem2/Total columns
  //  obligationYearPlan = obligation     (e.g. 2025) — "Past Year" blue column

  useEffect(() => {
    const oblPlanId = obligationYearPlan?.dept_budget_plan_id;

    const currentReq    = API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } });
    const obligationReq = oblPlanId
      ? API.get('/form4-items', { params: { budget_plan_id: oblPlanId } })
      : Promise.resolve({ data: { data: [] as any[] } });

    Promise.all([currentReq, obligationReq])
      .then(([currentRes, oblRes]) => {
        const currentItems: any[]    = currentRes.data.data ?? [];
        const obligationItems: any[] = oblRes.data.data ?? [];

        // Map obligation items by aip_program_id for O(1) lookup
        const oblByProgram = new Map<number, { itemId: number; obligation: number }>();
        for (const pi of obligationItems) {
          oblByProgram.set(pi.aip_program_id, {
            itemId:     pi.dept_bp_form4_item_id,
            obligation: parseFloat(pi.obligation_amount) || 0,
          });
        }

        const merged = currentItems.map((item: any) => {
          const obl = oblByProgram.get(item.aip_program_id);
          return {
            ...item,
            ps_amount:         parseFloat(item.ps_amount)    || 0,
            mooe_amount:       parseFloat(item.mooe_amount)  || 0,
            co_amount:         parseFloat(item.co_amount)    || 0,
            total_amount:      parseFloat(item.total_amount) || 0,
            sem1_amount:       parseFloat(item.sem1_amount)  || 0,
            sem2_amount:       parseFloat(item.sem2_amount)  || 0,
            obligation_amount: obl?.obligation ?? 0,
            oblAipItemId:      obl?.itemId,
            recommendation:    item.recommendation ?? null,
          };
        });

        setAipItems(merged);

        // Populate refs — clear first to avoid stale data when plan changes
        oblAipItemIdRef.current.clear();
        aipProgramIdRef.current.clear();
        savedAipObligations.current.clear();
        savedAipRecommendations.current.clear();

        for (const item of merged) {
          const id = item.dept_bp_form4_item_id;
          savedAipRecommendations.current.set(id, item.recommendation ?? null);
          savedAipObligations.current.set(id, item.obligation_amount);
          if (item.oblAipItemId) oblAipItemIdRef.current.set(id, item.oblAipItemId);
          aipProgramIdRef.current.set(id, item.aip_program_id);
        }
      })
      .catch(console.error);
  }, [plan.dept_budget_plan_id, obligationYearPlan?.dept_budget_plan_id]);

  // ── Effect: Build regular items from plan + pastYear + obligationYear ─────

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

    const obligationData = new Map<number, { amount: number; itemId: number }>();
    obligationYearPlan?.items.forEach((item: any) => {
      obligationData.set(item.expense_item_id, {
        amount: Number(item.obligation_amount) || 0,
        itemId: item.dept_bp_form2_item_id,
      });
    });

    const merged: ItemWithMeta[] = plan.items.map(planItem => {
      const past = pastData.get(planItem.expense_item_id) ?? { total: 0, sem1: 0, sem2: 0, itemId: 0 };
      const obl  = obligationData.get(planItem.expense_item_id);
      return {
        ...planItem,
        expense_item:         expenseItemMap.get(planItem.expense_item_id),
        pastTotal:            past.total,
        pastSem1:             past.sem1,
        pastSem2:             past.sem2,
        pastObligation:       obl?.amount ?? 0,
        pastObligationItemId: obl?.itemId,
        pastItemId:           past.itemId || undefined,
        recommendation:       (planItem as any).recommendation ?? null,
      };
    });

    setItems(merged);
    setPastSem1Edits(new Map());
    setObligationEdits(new Map());

    savedValues.current.clear();
    savedObligations.current.clear();
    savedRecommendations.current.clear();

    for (const item of merged) {
      savedValues.current.set(item.expense_item_id, Number(item.total_amount));
      savedRecommendations.current.set(item.expense_item_id, item.recommendation ?? null);
      savedObligations.current.set(item.expense_item_id, item.pastObligation);
    }
  // expenseItemMap is stable (memo) — safe to include
  }, [plan, pastYearPlan, obligationYearPlan, expenseItemMap]);

  // ── Effect: Patch obligation fields when obligationYearPlan refreshes ─────

  useEffect(() => {
    if (!obligationYearPlan) return;

    const obligationData = new Map<number, { amount: number; itemId: number }>();
    obligationYearPlan.items.forEach((item: any) => {
      obligationData.set(item.expense_item_id, {
        amount: Number(item.obligation_amount) || 0,
        itemId: item.dept_bp_form2_item_id,
      });
    });

    setItems(prev => prev.map(i => {
      const obl = obligationData.get(i.expense_item_id);
      if (!obl) return i;
      if (obl.amount === i.pastObligation && obl.itemId === i.pastObligationItemId) return i;
      savedObligations.current.set(i.expense_item_id, obl.amount);
      return { ...i, pastObligation: obl.amount, pastObligationItemId: obl.itemId };
    }));
  }, [obligationYearPlan]);

  // ── Input draft helpers ───────────────────────────────────────────────────

  const getDraftValue = useCallback((id: number, field: DraftField, raw: number) => {
    const key = `${id}_${field}`;
    return inputDraft.has(key) ? inputDraft.get(key)! : comma(raw);
  }, [inputDraft]);

  const setDraft = useCallback((key: string, digits: string) => {
    setInputDraft(prev => new Map(prev).set(key, digits === '' ? '' : Number(digits).toLocaleString('en-US')));
  }, []);

  const clearDraft = useCallback((key: string) => {
    setInputDraft(prev => { const n = new Map(prev); n.delete(key); return n; });
  }, []);

  const parseDigits = (rawValue: string): number => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    return digits === '' ? 0 : parseInt(digits, 10);
  };

  // ── Handlers: proposed amount ─────────────────────────────────────────────

  const handleProposedChange = useCallback((id: number, value: number) =>
    setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: value } : i)),
  []);

  const handleProposedBlur = useCallback(async (expenseItemId: number) => {
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
      const saved = res.data.data;
      if (saved) {
        setItems(prev => prev.map(i =>
          i.expense_item_id === expenseItemId
            ? { ...i, total_amount: Number(saved.total_amount ?? cur), dept_bp_form2_item_id: saved.dept_bp_form2_item_id ?? i.dept_bp_form2_item_id }
            : i,
        ));
      }
      onItemUpdate();
      return res.data;
    })();

    toast.promise(promise, {
      loading: 'Saving…',
      success: () => `${item.expense_item?.expense_class_item_name || 'Item'} saved`,
      error:   (err) => `Failed: ${err.response?.data?.message || err.message}`,
    });
    try { await promise; } catch { /* handled by toast */ }
    finally { setSavingItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  }, [items, plan.dept_budget_plan_id, savingItems, onItemUpdate]);

  // ── Handlers: Sem 1 ───────────────────────────────────────────────────────

  const handlePastSem1Blur = useCallback(async (expenseItemId: number) => {
    const edit = pastSem1Edits.get(expenseItemId);
    if (edit === undefined) return;
    const item = items.find(i => i.expense_item_id === expenseItemId);
    if (!item) return;

    const hasPastRecord = item.pastTotal > 0 && !!item.pastItemId;
    const pastPlanId    = pastYearPlan?.dept_budget_plan_id;

    if (isAdmin && !hasPastRecord && !pastPlanId) {
      toast.error('Past year plan not found for this department.');
      setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
      return;
    }

    const cap     = hasPastRecord ? item.pastTotal : Number(item.total_amount);
    const clamped = Math.min(Math.max(edit, 0), cap);
    if (clamped !== edit) setPastSem1Edits(prev => new Map(prev).set(expenseItemId, clamped));
    if (clamped === item.pastSem1) {
      setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
      return;
    }

    setSavingPastItems(prev => new Set(prev).add(expenseItemId));
    const promise = (async () => {
      if (hasPastRecord) {
        await API.put(
          `/department-budget-plans/${pastPlanId}/items/${item.pastItemId}`,
          { sem1_amount: clamped },
        );
      } else if (isAdmin && pastPlanId) {
        const res = await API.post(
          `/department-budget-plans/${pastPlanId}/items`,
          { expense_item_id: expenseItemId, sem1_amount: clamped, sem2_amount: 0, total_amount: clamped },
        );
        const newItemId = res.data.data?.dept_bp_form2_item_id;
        setItems(prev => prev.map(i =>
          i.expense_item_id === expenseItemId ? { ...i, pastItemId: newItemId, pastTotal: clamped } : i,
        ));
      } else {
        const targetId = item.dept_bp_form2_item_id;
        if (!targetId || !plan.dept_budget_plan_id) return;
        await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${targetId}`, { sem1_amount: clamped });
      }

      const newTotal = hasPastRecord ? item.pastTotal : clamped;
      setItems(prev => prev.map(i =>
        i.expense_item_id === expenseItemId
          ? { ...i, pastSem1: clamped, pastSem2: newTotal - clamped } : i,
      ));
      setPastSem1Edits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
    })();

    toast.promise(promise, { loading: 'Saving Sem 1…', success: 'Sem 1 saved', error: (err: any) => `Failed: ${err.response?.data?.message || err.message}` });
    try { await promise; } catch { /* handled by toast */ }
    finally { setSavingPastItems(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  }, [items, pastSem1Edits, pastYearPlan, isAdmin, plan.dept_budget_plan_id]);

  // ── Handlers: obligation (regular items) ──────────────────────────────────

  const handleObligationBlur = useCallback(async (expenseItemId: number) => {
    const edit = obligationEdits.get(expenseItemId);
    if (edit === undefined) return;
    const item = items.find(i => i.expense_item_id === expenseItemId);
    if (!item) return;

    const clamped = Math.max(edit, 0);
    if (clamped !== edit) setObligationEdits(prev => new Map(prev).set(expenseItemId, clamped));
    if (clamped === savedObligations.current.get(expenseItemId)) {
      setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
      return;
    }

    const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
    if (!oblPlanId) { toast.error('No obligation year plan found for this department.'); return; }

    setSavingObligations(prev => new Set(prev).add(expenseItemId));
    const promise = (async () => {
      if (item.pastObligationItemId) {
        await API.put(
          `/department-budget-plans/${oblPlanId}/items/${item.pastObligationItemId}`,
          { obligation_amount: clamped },
        );
      } else {
        const res = await API.post(`/department-budget-plans/${oblPlanId}/items`, {
          expense_item_id:   expenseItemId,
          obligation_amount: clamped,
        });
        const newItemId = res.data.data?.dept_bp_form2_item_id;
        setItems(prev => prev.map(i =>
          i.expense_item_id === expenseItemId ? { ...i, pastObligationItemId: newItemId } : i,
        ));
        // Ensure item exists on appropriation and proposed plans
        await API.post(`/department-budget-plans/${pastYearPlan?.dept_budget_plan_id}/items`, { expense_item_id: expenseItemId }).catch(() => {});
        await API.post(`/department-budget-plans/${plan.dept_budget_plan_id}/items`, { expense_item_id: expenseItemId }).catch(() => {});
      }

      savedObligations.current.set(expenseItemId, clamped);
      setItems(prev => prev.map(i =>
        i.expense_item_id === expenseItemId ? { ...i, pastObligation: clamped } : i,
      ));
      setObligationEdits(prev => { const n = new Map(prev); n.delete(expenseItemId); return n; });
      onItemUpdate();
    })();

    toast.promise(promise, { loading: 'Saving obligation…', success: 'Obligation saved', error: (e: any) => `Failed: ${e.response?.data?.message || e.message}` });
    try { await promise; } catch { /* handled by toast */ }
    finally { setSavingObligations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  }, [items, obligationEdits, obligationYearPlan, pastYearPlan, plan.dept_budget_plan_id, onItemUpdate]);

  // ── Handlers: delete item ─────────────────────────────────────────────────

  const handleDeleteItem = useCallback(async (itemId: number, expenseItemId: number) => {
    const item = items.find(i => i.dept_bp_form2_item_id === itemId);
    if (!item) return;
    if (item.pastTotal > 0) { toast.warning('Has past year data. Set proposed to 0 instead.'); return; }
    if (!confirm('Remove this item?')) return;
    try {
      await API.delete(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${itemId}`);
      toast.success('Item deleted');
      onItemUpdate();
    } catch {
      toast.error('Failed to delete item.');
    }
  }, [items, plan.dept_budget_plan_id, onItemUpdate]);

  // ── Handlers: recommendation (regular items) ──────────────────────────────

  const handleRecommendationChange = useCallback((id: number, value: string) =>
    setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, recommendation: value } : i)),
  []);

  const handleRecommendationBlur = useCallback(async (expenseItemId: number) => {
    const item = items.find(i => i.expense_item_id === expenseItemId);
    if (!item || item.dept_bp_form2_item_id === 0) return;

    const cur = item.recommendation ?? null;
    if (normRec(savedRecommendations.current.get(expenseItemId)) === normRec(cur) || savingRecommendations.has(expenseItemId)) return;

    setSavingRecommendations(prev => new Set(prev).add(expenseItemId));
    const promise = (async () => {
      await API.put(`/department-budget-plans/${plan.dept_budget_plan_id}/items/${item.dept_bp_form2_item_id}`, { recommendation: normRec(cur) });
      savedRecommendations.current.set(expenseItemId, cur);
    })();

    toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
    try { await promise; } catch { /* handled by toast */ }
    finally { setSavingRecommendations(prev => { const n = new Set(prev); n.delete(expenseItemId); return n; }); }
  }, [items, plan.dept_budget_plan_id, savingRecommendations]);

  // ── Handlers: AIP recommendation ─────────────────────────────────────────

  const handleAipRecChange = useCallback((id: number, value: string) =>
    setAipItems(prev => prev.map(i => i.dept_bp_form4_item_id === id ? { ...i, recommendation: value } : i)),
  []);

  const handleAipRecBlur = useCallback(async (id: number) => {
    const item = aipItems.find(i => i.dept_bp_form4_item_id === id);
    if (!item) return;

    const cur = (item as any).recommendation ?? null;
    if (normRec(savedAipRecommendations.current.get(id)) === normRec(cur) || savingAipRecommendations.has(id)) return;

    setSavingAipRecommendations(prev => new Set(prev).add(id));
    const promise = (async () => {
      await API.put(`/form4-items/${id}`, { recommendation: normRec(cur) });
      savedAipRecommendations.current.set(id, cur);
    })();

    toast.promise(promise, { loading: 'Saving…', success: 'Recommendation saved', error: (err) => `Failed: ${err.response?.data?.message || err.message}` });
    try { await promise; } catch { /* handled by toast */ }
    finally { setSavingAipRecommendations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  }, [aipItems, savingAipRecommendations]);

  // ── Handlers: AIP obligation ──────────────────────────────────────────────
  //
  // Saves to the OBLIGATION year plan item (e.g. 2025), not the current plan.
  // Always does a fresh fetch by aip_program_id to get the correct target item.

  const handleAipOblBlur = useCallback(async (id: number) => {
    const edit = aipOblEditsRef.current.get(id);
    if (edit === undefined) return;

    const aipProgramId = aipProgramIdRef.current.get(id);
    if (!aipProgramId) return;

    const clamped = Math.max(edit, 0);
    if (clamped === savedAipObligations.current.get(id)) {
      aipOblEditsRef.current.delete(id);
      setAipOblEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
      return;
    }

    const oblPlanId = obligationYearPlan?.dept_budget_plan_id;
    if (!oblPlanId) {
      toast.error('Obligation year plan not found.');
      return;
    }

    setSavingAipObligations(prev => new Set(prev).add(id));

    const promise = (async () => {
      // Always fetch fresh — avoids stale cached IDs across plan/dept switches
      const listRes = await API.get('/form4-items', { params: { budget_plan_id: oblPlanId } });
      const existing = (listRes.data.data ?? []).find(
        (pi: any) => Number(pi.aip_program_id) === Number(aipProgramId),
      );

      if (existing) {
        await API.put(`/form4-items/${existing.dept_bp_form4_item_id}`, { obligation_amount: clamped });
        oblAipItemIdRef.current.set(id, existing.dept_bp_form4_item_id);
      } else {
        const currentItem = aipItems.find(i => i.dept_bp_form4_item_id === id);
        const res = await API.post('/form4-items', {
          budget_plan_id:      oblPlanId,
          aip_program_id:      aipProgramId,
          program_description: currentItem?.program_description ?? '',
          obligation_amount:   clamped,
          ps_amount:           0,
          mooe_amount:         0,
          co_amount:           0,
        });
        const newId = res.data.data?.dept_bp_form4_item_id;
        if (newId) oblAipItemIdRef.current.set(id, newId);
      }

      savedAipObligations.current.set(id, clamped);
      setAipItems(prev => prev.map(i =>
        i.dept_bp_form4_item_id === id ? { ...i, obligation_amount: clamped } : i,
      ));
      aipOblEditsRef.current.delete(id);
      setAipOblEdits(prev => { const n = new Map(prev); n.delete(id); return n; });
      onItemUpdate();
    })();

    toast.promise(promise, {
      loading: 'Saving obligation…',
      success: 'Obligation saved',
      error:   (e: any) => `Failed: ${e.response?.data?.message || e.message}`,
    });
    try { await promise; } catch { /* handled by toast */ }
    finally { setSavingAipObligations(prev => { const n = new Set(prev); n.delete(id); return n; }); }
  }, [aipItems, obligationYearPlan, onItemUpdate]);

  // ── Unified comma-input helpers ───────────────────────────────────────────

  const handleCommaInput = useCallback((id: number, field: DraftField, rawValue: string) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    setDraft(`${id}_${field}`, digits);
    const num = digits === '' ? 0 : parseInt(digits, 10);
    if (field === 'proposed')    setItems(prev => prev.map(i => i.expense_item_id === id ? { ...i, total_amount: num } : i));
    else if (field === 'sem1')   setPastSem1Edits(prev => new Map(prev).set(id, num));
    else                         setObligationEdits(prev => new Map(prev).set(id, num));
  }, [setDraft]);

  const handleCommaBlur = useCallback((id: number, field: DraftField) => {
    clearDraft(`${id}_${field}`);
    if (field === 'proposed')    handleProposedBlur(id);
    else if (field === 'sem1')   handlePastSem1Blur(id);
    else                         handleObligationBlur(id);
  }, [clearDraft, handleProposedBlur, handlePastSem1Blur, handleObligationBlur]);

  const handleAipCommaInput = useCallback((id: number, rawValue: string) => {
    const digits = rawValue.replace(/[^0-9]/g, '');
    setDraft(`aip_${id}_obligation`, digits);
    const num = digits === '' ? 0 : parseInt(digits, 10);
    aipOblEditsRef.current.set(id, num);
    setAipOblEdits(prev => new Map(prev).set(id, num));
  }, [setDraft]);

  const handleAipCommaBlur = useCallback((id: number) => {
    clearDraft(`aip_${id}_obligation`);
    handleAipOblBlur(id);
  }, [clearDraft, handleAipOblBlur]);

  // ── Memoized derived data ─────────────────────────────────────────────────

  const itemsByClassification = useMemo(() =>
    classifications
      .filter(c => !c.expense_class_name.toLowerCase().includes('financial expenses'))
      .map(c => ({
        ...c,
        items: items
          .filter(i => i.expense_item?.expense_class_id === c.expense_class_id)
          .sort((a, b) => (a.expense_item?.expense_class_item_id ?? 0) - (b.expense_item?.expense_class_item_id ?? 0)),
      })),
  [classifications, items]);

  const grandTotals = useMemo(() => {
  let pastSem1 = 0, pastSem2 = 0, pastTotal = 0, proposed = 0, obligation = 0;
  for (const i of items) {
    const sem1 = pastSem1Edits.has(i.expense_item_id) ? pastSem1Edits.get(i.expense_item_id)! : i.pastSem1;
    const cap  = i.pastTotal > 0 ? i.pastTotal : 0;
    const sem2 = pastSem1Edits.has(i.expense_item_id) ? Math.max(cap - sem1, 0) : i.pastSem2;
    pastSem1   += sem1;
    pastSem2   += sem2;
    pastTotal  += i.pastTotal;
    proposed   += Number(i.total_amount);
    obligation += i.pastObligation;  // ← add
  }
  return { pastSem1, pastSem2, pastTotal, proposed, obligation };
}, [items, pastSem1Edits]);

  const aipTotal      = useMemo(() => aipItems.reduce((s, i) => s + i.total_amount, 0), [aipItems]);
  const calamityTotal = calamityData?.calamity_fund ?? 0;

  const aipObligationTotal = useMemo(
  () => aipItems.reduce((s, i) => s + ((i as any).obligation_amount ?? 0), 0),
  [aipItems],
);

const grandFinal = useMemo(() => ({
  ...grandTotals,
  proposed:   grandTotals.proposed + aipTotal + (isSpecialAccount ? calamityTotal : 0),
  obligation: grandTotals.obligation + aipObligationTotal,  // ← add
}), [grandTotals, aipTotal, aipObligationTotal, isSpecialAccount, calamityTotal]);

  const gtDiff = grandFinal.proposed - grandFinal.pastTotal;
  const gtPct  = pctOf(grandFinal.pastTotal, gtDiff);

  const hasRows           = items.length > 0 || aipItems.length > 0;
  const hasAipSection     = aipItems.length > 0;
  const hasCalamitySection = isSpecialAccount;

  let gIdx = 0;

  // ─────────────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 2</p>
          <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
            Programmed Appropriation and Obligation by Object of Expenditures
          </h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse" style={{ minWidth: 960 }}>
          <colgroup>
            {COL_WIDTHS.map((w, i) => {
              if ((i === 2 || i === 9) && !isAdmin) return null;
              return <col key={i} style={{ width: w }} />;
            })}
          </colgroup>

          {/* ── Header ── */}
          <thead className="sticky top-0 z-10">
            <tr>
              <th className={TH} rowSpan={2}>Acct Code</th>
              <th className={TH} rowSpan={2}>Object of Expenditure</th>
              {isAdmin && (
                <th className={cn(TH_APP, 'border-l text-right')} rowSpan={2}>
                  Past Year ({Number(plan.budget_plan?.year) - 2})
                </th>
              )}
              <th className={cn(TH_APP, 'text-center border-l')} colSpan={3}>
                Appropriation ({prevYear})
              </th>
              <th className={cn(TH_PRO, 'border-l')} rowSpan={2}>Proposed ({currYear})</th>
              <th className={cn(TH, 'text-right')} rowSpan={2}>Inc / Dec</th>
              <th className={cn(TH, 'text-right')} rowSpan={2}>%</th>
              {isAdmin && <th className={TH} rowSpan={2}>Recommendation</th>}
            </tr>
            <tr>
              <th className={cn(TH_APP, 'border-l')}>Sem 1</th>
              <th className={TH_APP}>Sem 2</th>
              <th className={TH_APP}>Total</th>
            </tr>
          </thead>

          <tbody>
            {/* ── Regular expense items by classification ── */}
            {itemsByClassification.map((cls, clsIndex) => {
              const isPS        = cls.expense_class_id === PS_CLASS_ID;
              const canEdit     = isEditable && (!isPS || isAdmin);
              const canEditSem1 = isEditable && (isAdmin || !isPS);
              const label       = cls.expense_class_name === 'Prop/Plant/Eqpt' ? 'Capital Outlay (CO)' : cls.expense_class_name;

              const clsSem1 = cls.items.reduce((s, i) =>
                s + (pastSem1Edits.has(i.expense_item_id) ? pastSem1Edits.get(i.expense_item_id)! : i.pastSem1), 0);
              const clsSem2 = cls.items.reduce((s, i) => {
                if (pastSem1Edits.has(i.expense_item_id)) {
                  const sem1 = pastSem1Edits.get(i.expense_item_id)!;
                  return s + Math.max((i.pastTotal > 0 ? i.pastTotal : 0) - sem1, 0);
                }
                return s + i.pastSem2;
              }, 0);
              const clsPast = cls.items.reduce((s, i) => s + i.pastTotal, 0);
              const clsProp = cls.items.reduce((s, i) => s + Number(i.total_amount), 0);
              const clsDiff = clsProp - clsPast;
              const clsPct  = pctOf(clsPast, clsDiff);

              const isLastCls      = clsIndex === itemsByClassification.length - 1;
              const nextHasData    = !isLastCls && itemsByClassification.slice(clsIndex + 1).some(c => c.items.length > 0);
              const showSubHeader  = nextHasData || hasAipSection || hasCalamitySection;

              return (
                <React.Fragment key={cls.expense_class_id}>

                  {/* Section header row */}
                  <tr className="bg-gray-50 border-y border-gray-200">
                    <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
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
                              <Button
                                size="sm"
                                variant="outline"
                                className="gap-1.5 text-xs h-7 border-gray-200 text-gray-600 hover:text-gray-900"
                                onClick={() => setModalState({ isOpen: true, classificationId: cls.expense_class_id, classificationName: cls.expense_class_name })}
                              >
                                <PlusIcon className="w-3.5 h-3.5" /> Add Item
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="left" className="text-xs">Add item in {cls.abbreviation}</TooltipContent>
                          </Tooltip>
                        )}
                      </div>
                    </td>
                  </tr>

                  {cls.items.length === 0 ? (
                    <>
                      <tr>
                        <td colSpan={isAdmin ? 10 : 8} className="px-4 py-3 text-[12px] text-gray-400 italic">
                          No expense items.
                        </td>
                      </tr>
                      {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
                    </>
                  ) : (
                    <>
                      {cls.items.map(item => {
                        const delay    = Math.min(gIdx++ * 18, 280);
                        const past     = item.pastTotal;
                        const proposed = Number(item.total_amount);
                        const d        = proposed - past;
                        const p        = pctOf(past, d);
                        const isSaving = savingItems.has(item.expense_item_id);

                        const dispSem1     = pastSem1Edits.has(item.expense_item_id) ? pastSem1Edits.get(item.expense_item_id)! : item.pastSem1;
                        const sem2Cap      = past > 0 ? past : proposed;
                        const dispSem2     = pastSem1Edits.has(item.expense_item_id) ? sem2Cap - dispSem1 : item.pastSem2;
                        // const sem1Editable = canEditSem1 && ((isAdmin && !!pastYearPlan) || (!isAdmin && past > 0));
                        const sem1Editable = canEditSem1 &&
  past > 0 &&  // ← add this: Total must be non-zero
  ((isAdmin && !!pastYearPlan) || (!isAdmin && past > 0));

                        return (
                          <tr
                            key={item.expense_item_id}
                            className={cn('_rowAnim hover:bg-gray-50/60 transition-colors', isPS && 'bg-blue-50/10')}
                            style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
                          >
                            <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>
                              {item.expense_item?.expense_class_item_acc_code || '–'}
                            </td>
                            <td className={cn(TD, 'text-gray-800 font-medium')}>
                              <div className="flex items-center justify-between gap-1">
                                <span>{item.expense_item?.expense_class_item_name}</span>
                                {canEdit && item.dept_bp_form2_item_id > 0 && (
                                  <button
                                    onClick={() => handleDeleteItem(item.dept_bp_form2_item_id, item.expense_item_id)}
                                    className="text-gray-300 hover:text-red-500 transition-colors flex-shrink-0"
                                    title="Remove"
                                  >
                                    <TrashIcon className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>

                            {isAdmin && (
                              <td className={cn(TD_APP, 'border-l border-blue-100')}>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={getDraftValue(item.expense_item_id, 'obligation',
                                    obligationEdits.has(item.expense_item_id) ? obligationEdits.get(item.expense_item_id)! : item.pastObligation)}
                                  onChange={e => handleCommaInput(item.expense_item_id, 'obligation', e.target.value)}
                                  onBlur={() => handleCommaBlur(item.expense_item_id, 'obligation')}
                                  disabled={savingObligations.has(item.expense_item_id)}
                                  className={inputAppCls}
                                />
                              </td>
                            )}

                            <td className={cn(TD_APP, 'border-l border-blue-100')}>
                              {sem1Editable ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
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

                            <td className={cn(TD_APP, 'text-gray-500')}>{dispSem2 === 0 ? '–' : fmtP(dispSem2)}</td>
                            <td className={cn(TD_APP, 'text-gray-600')}>{past === 0 ? '–' : fmtP(past)}</td>

                            <td className={cn(TD_PRO, 'border-l border-orange-100')}>
                              {canEdit ? (
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  value={getDraftValue(item.expense_item_id, 'proposed', proposed)}
                                  onChange={e => handleCommaInput(item.expense_item_id, 'proposed', e.target.value)}
                                  onBlur={() => handleCommaBlur(item.expense_item_id, 'proposed')}
                                  disabled={isSaving}
                                  className={inputCls}
                                />
                              ) : (
                                <span className={cn('font-mono tabular-nums', isPS ? 'text-blue-700 font-semibold' : 'text-gray-700')}>
                                  {proposed === 0 ? '–' : fmtP(proposed)}
                                </span>
                              )}
                            </td>

                            <td className={cn(TD_M, clr(d))}>{d === 0 ? '–' : fmtP(d)}</td>
                            <td className={cn(TD_M, clr(d))}>{past === 0 && d === 0 ? '–' : `${p.toFixed(2)}%`}</td>

                            {isAdmin && (
                              <td className={TD}>
                                {isEditable && (isAdmin || !isPS) ? (
                                  <input
                                    type="text"
                                    value={item.recommendation ?? ''}
                                    onChange={e => handleRecommendationChange(item.expense_item_id, e.target.value)}
                                    onBlur={() => handleRecommendationBlur(item.expense_item_id)}
                                    disabled={savingRecommendations.has(item.expense_item_id)}
                                    placeholder="Add note…"
                                    maxLength={255}
                                    className={recCls}
                                  />
                                ) : (
                                  <span className="text-gray-500 text-[11px]">{item.recommendation || '–'}</span>
                                )}
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {/* Classification subtotal */}
                      {/* Classification subtotal */}
                      <tr className="border-t border-gray-200">
                        <td className="bg-gray-100" />
                        <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total {label}</td>
                        {isAdmin && (
                          <td className={cn(TD_M, 'font-semibold border-l border-blue-100', C_APP_SUB)}>
                            {/* obligation subtotal per classification */}
                            {(() => {
                              const clsObl = cls.items.reduce((s, i) => s + i.pastObligation, 0);
                              return clsObl === 0 ? '–' : fmtP(clsObl);
                            })()}
                          </td>
                        )}
                        <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_APP_SUB)}>{fmtP(clsSem1)}</td>
                        <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsSem2)}</td>
                        <td className={cn(TD_M, 'font-semibold text-gray-700', C_APP_SUB)}>{fmtP(clsPast)}</td>
                        <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(clsProp)}</td>
                        <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>{clsDiff === 0 ? '–' : fmtP(clsDiff)}</td>
                        <td className={cn(TD_M, 'font-semibold bg-gray-100', clr(clsDiff))}>
                          {clsPast === 0 && clsDiff === 0 ? '–' : `${clsPct.toFixed(2)}%`}
                        </td>
                        {isAdmin && <td className="bg-gray-100" />}
                      </tr>

                      {showSubHeader && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
                    </>
                  )}
                </React.Fragment>
              );
            })}

            {/* ── Special Programs (AIP) ── */}
            {hasAipSection && (
              <React.Fragment>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-gray-700">Special Programs</span>
                      <span className="text-[10px] font-semibold text-violet-600 bg-violet-50 border border-violet-200 px-2 py-0.5 rounded-full">
                        From AIP Form 4
                      </span>
                    </div>
                  </td>
                  <td className="bg-gray-50" />
                </tr>

                {aipItems.map(item => {
                  const delay          = Math.min(gIdx++ * 18, 280);
                  const id             = item.dept_bp_form4_item_id;
                  const oblVal         = aipOblEdits.has(id) ? aipOblEdits.get(id)! : ((item as any).obligation_amount ?? 0);
                  const oblDraftKey    = `aip_${id}_obligation`;
                  const oblDisplay     = inputDraft.has(oblDraftKey) ? inputDraft.get(oblDraftKey)! : comma(oblVal);

                  return (
                    <tr
                      key={id}
                      className="_rowAnim hover:bg-gray-50/60 transition-colors"
                      style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
                    >
                      <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{item.aip_reference_code || '–'}</td>
                      <td className={cn(TD, 'text-gray-800 font-medium')}>{item.program_description || '–'}</td>

                      {isAdmin && (
                        <td className={cn(TD_APP, 'border-l border-blue-100')}>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={oblDisplay}
                            onChange={e => handleAipCommaInput(id, e.target.value)}
                            onBlur={() => handleAipCommaBlur(id)}
                            disabled={savingAipObligations.has(id)}
                            placeholder="0"
                            className={inputAppCls}
                          />
                        </td>
                      )}

                      <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      <td className={cn(TD_PRO, 'border-l border-orange-100 text-orange-700 font-semibold')}>{fmtP(item.total_amount)}</td>
                      <td className={cn(TD_M, 'text-emerald-600')}>{fmtP(item.total_amount)}</td>
                      <td className={cn(TD_M, 'text-emerald-600')}>100.00%</td>

                      {isAdmin && (
                        <td className={TD}>
                          {isEditable ? (
                            <input
                              type="text"
                              value={(item as any).recommendation ?? ''}
                              onChange={e => handleAipRecChange(id, e.target.value)}
                              onBlur={() => handleAipRecBlur(id)}
                              disabled={savingAipRecommendations.has(id)}
                              placeholder="Add note…"
                              maxLength={255}
                              className={recCls}
                            />
                          ) : (
                            <span className="text-gray-500 text-[11px]">{(item as any).recommendation || '–'}</span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}

                <tr className="border-t border-gray-200">
  <td className="bg-gray-100" />
  <td className={cn(TD, 'font-semibold text-gray-700 bg-gray-100')}>Total Special Programs</td>
  {isAdmin && (
    <td className={cn(TD_M, 'font-semibold border-l border-blue-100 bg-gray-100')}>
      {aipObligationTotal === 0 ? '–' : fmtP(aipObligationTotal)}
    </td>
  )}
  <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>{fmtP(aipTotal)}</td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : fmtP(aipTotal)}</td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{aipTotal === 0 ? '–' : '100.00%'}</td>
                  {isAdmin && <td className="bg-gray-100" />}
                </tr>

                {hasCalamitySection && <SubHeader prevYear={prevYear} currYear={currYear} isAdmin={isAdmin} />}
              </React.Fragment>
            )}

            {/* ── 5% Calamity Fund ── */}
            {isSpecialAccount && (
              <React.Fragment>
                <tr className="bg-gray-50 border-y border-gray-200">
                  <td colSpan={isAdmin ? 9 : 7} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[12px] font-semibold text-gray-700">5% Calamity Fund</span>
                      <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                        Derived from {['sh', 'occ', 'pm'].includes(incomeSource ?? '') ? 'Non-Tax Revenue' : 'Tax Revenue'}
                      </span>
                      {calamityLoading && (
                        <span className="w-3 h-3 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin inline-block" />
                      )}
                    </div>
                  </td>
                  <td className="bg-gray-50" />
                </tr>

                {([
                  { code: '5% × 70%', label: 'Pre-Disaster Preparedness', note: '(70% of 5% Calamity Fund)', value: calamityData?.pre_disaster },
                  { code: '5% × 30%', label: 'Quick Response Fund (QRF)',  note: '(30% of 5% Calamity Fund)', value: calamityData?.quick_response },
                ] as const).map(row => {
                  const delay = Math.min(gIdx++ * 18, 280);
                  return (
                    <tr
                      key={row.code}
                      className="_rowAnim bg-white hover:bg-gray-50/60 transition-colors"
                      style={{ animation: `_rowIn 220ms cubic-bezier(0.22,1,0.36,1) ${delay}ms both` }}
                    >
                      <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>{row.code}</td>
                      <td className={cn(TD, 'text-gray-800')}>
                        {row.label}
                        <span className="ml-2 text-[10px] text-gray-400">{row.note}</span>
                      </td>
                      {isAdmin && <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>}
                      <td className={cn(TD_APP, 'border-l border-blue-100 text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
                      <td className={cn(TD_APP, 'text-blue-200')}>–</td>
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
                  {isAdmin && <td className="bg-gray-100 border-l border-blue-100" />}
                  <td className={cn('bg-gray-100 border-l', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn('bg-gray-100', C_APP_SUB)} />
                  <td className={cn(TD_M, 'font-semibold text-gray-700 border-l', C_PRO_SUB)}>
                    {calamityLoading ? <span className="text-gray-300 animate-pulse">…</span> : (calamityTotal > 0 ? fmtP(calamityTotal) : '–')}
                  </td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? fmtP(calamityTotal) : '–'}</td>
                  <td className={cn(TD_M, 'font-semibold text-emerald-600 bg-gray-100')}>{calamityTotal > 0 ? '100.00%' : '–'}</td>
                  {isAdmin && <td className="bg-gray-100" />}
                </tr>

                {calamityData?.total_tax_revenue_proposed != null && calamityData.total_tax_revenue_proposed > 0 && (
                  <tr>
                    <td colSpan={isAdmin ? 10 : 8} className="px-4 py-1.5 text-[10px] text-gray-400 bg-white border-b border-gray-100">
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
                    <span className="ml-2 text-[9px] font-normal text-gray-500 normal-case tracking-normal">
                      incl. 5% Calamity Fund
                    </span>
                  )}
                </td>
                {isAdmin && (
                  <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>
                    {grandFinal.obligation === 0 ? '–' : fmtP(grandFinal.obligation)}  {/* ← was just '–' */}
                  </td>
                )}
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem1)}</td>
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastSem2)}</td>
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_APP_GT)}>{fmtP(grandFinal.pastTotal)}</td>
                <td className={cn('px-3 py-3 text-right font-mono font-bold tabular-nums border-l', C_PRO_GT)}>{fmtP(grandFinal.proposed)}</td>
                <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
                  {gtDiff === 0 ? '–' : fmtP(gtDiff)}
                </td>
                <td className={cn('px-3 py-3 text-right font-mono tabular-nums border-l border-gray-700', clr(gtDiff))}>
                  {grandFinal.pastTotal === 0 && gtDiff === 0 ? '–' : `${gtPct.toFixed(2)}%`}
                </td>
                {isAdmin && <td className="border-l border-gray-700" />}
              </tr>
            )}
          </tfoot>
        </table>
      </div>

      {/* ── Modals ── */}
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

      {pastModalState && pastYearPlan && (
        <AddItemModal
          isOpen={pastModalState.isOpen}
          onClose={() => setPastModalState(null)}
          classificationId={pastModalState.classificationId}
          classificationName={pastModalState.classificationName}
          planId={pastYearPlan.dept_budget_plan_id}
          expenseItems={expenseItems}
          existingItemIds={pastYearPlan.items.map((i: any) => i.expense_item_id)}
          onItemAdded={() => { onItemUpdate(); toast.success('Past year item added.'); }}
        />
      )}
    </div>
  );
};

export default Form2;