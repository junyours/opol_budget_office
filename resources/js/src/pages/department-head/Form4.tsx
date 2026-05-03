import React, { useEffect, useState, useMemo, useRef } from 'react';
import API from '../../services/api';
import { LoadingState } from '../common/LoadingState';
import { DepartmentBudgetPlan, DepartmentBudgetPlanForm4Item } from '../../types/api';
import { PlusIcon } from '@heroicons/react/24/outline';
import { Button } from '@/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/src/components/ui/dialog';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Badge } from '@/src/components/ui/badge';
import { MagnifyingGlassIcon, PlusCircleIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';
import { toast } from 'sonner';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AIPProgram {
  aip_program_id: number;
  aip_reference_code: string | null;
  program_description: string;
  dept_id: number;
  is_active: boolean;
}

interface Form4Props {
  plan: DepartmentBudgetPlan;
  isEditable: boolean;
}

interface CtxMenuState {
  x: number;
  y: number;
  item: DepartmentBudgetPlanForm4Item;
}

type ModalMode = 'choose' | 'existing' | 'new';

const EMPTY_FORM = {
  aip_reference_code: '', program_description: '', major_final_output: '',
  performance_indicator: '', target: '',
  ps_amount: 0, mooe_amount: 0, co_amount: 0, sem1_amount: 0, sem2_amount: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmtCurrency = (v: number) => {
  if (typeof v !== 'number' || isNaN(v)) return '₱0';
  return `₱${Math.round(v).toLocaleString('en-PH')}`;
};

const fmtAmount = (v: number) => {
  if (!v || v === 0) return '–';
  return `₱${Math.round(v).toLocaleString('en-PH')}`;
};

const TH_R = 'border-b border-gray-200 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right whitespace-nowrap';
const TH   = 'border-b border-gray-200 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left whitespace-nowrap';
const TD      = 'px-4 py-3 text-[12px] text-gray-700';
const TD_MONO = 'px-4 py-3 text-[12px] font-mono tabular-nums text-right text-gray-700';

// ─── Component ────────────────────────────────────────────────────────────────

const Form4: React.FC<Form4Props> = ({ plan, isEditable }) => {
  const [items, setItems]                       = useState<DepartmentBudgetPlanForm4Item[]>([]);
  const [existingPrograms, setExistingPrograms] = useState<AIPProgram[]>([]);
  const [loading, setLoading]                   = useState(true);
  const [seeding, setSeeding]                   = useState(false);

  const [modalOpen, setModalOpen]             = useState(false);
  const [modalMode, setModalMode]             = useState<ModalMode>('choose');
  const [editingItem, setEditingItem]         = useState<DepartmentBudgetPlanForm4Item | null>(null);
  const [programSearch, setProgramSearch]     = useState('');
  const [selectedProgram, setSelectedProgram] = useState<AIPProgram | null>(null);
  const [formData, setFormData]               = useState({ ...EMPTY_FORM });
  const [saving, setSaving]                   = useState(false);

  // ── Context menu ────────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<CtxMenuState | null>(null);
  const ctxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctxMenu]);

const handleRowClick = (e: React.MouseEvent, item: DepartmentBudgetPlanForm4Item) => {
    if ((e.target as HTMLElement).closest('[data-no-ctx]')) return;
    e.preventDefault();
    e.stopPropagation();
    console.log('clientX:', e.clientX, 'clientY:', e.clientY);
    const MENU_W = 175, MENU_H = 110;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, item });
  };

  // ── Data ────────────────────────────────────────────────────────────────────

  const usedProgramIds = useMemo(() => new Set(items.map(i => i.aip_program_id)), [items]);

  const usedDescriptions = useMemo(
    () => new Set(items.map(i => (i.program_description || '').trim().toLowerCase())),
    [items]
  );

  useEffect(() => {
    Promise.all([fetchItems(), fetchExistingPrograms()]).then(() => setLoading(false));
  }, [plan.dept_budget_plan_id]);

  const fetchItems = async () => {
    try {
      const res = await API.get('/form4-items', { params: { budget_plan_id: plan.dept_budget_plan_id } });
      setItems((res.data.data || []).map((item: any) => ({
        ...item,
        ps_amount:    parseFloat(item.ps_amount)    || 0,
        mooe_amount:  parseFloat(item.mooe_amount)  || 0,
        co_amount:    parseFloat(item.co_amount)    || 0,
        total_amount: parseFloat(item.total_amount) || 0,
        sem1_amount:  parseFloat(item.sem1_amount)  || 0,
        sem2_amount:  parseFloat(item.sem2_amount)  || 0,
      })));
    } catch (err) {
      console.error('Failed to fetch Form 4 items', err);
    }
  };

  const fetchExistingPrograms = async () => {
    if (!plan.dept_id) return;
    try {
      const res = await API.get('/aip-programs', { params: { dept_id: plan.dept_id } });
      setExistingPrograms(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch AIP programs', err);
    }
  };

  const seedPastPrograms = async (
    currentItems: DepartmentBudgetPlanForm4Item[],
    programs: AIPProgram[]
  ) => {
    if (currentItems.length > 0) return;
    const toAdd = programs.filter(p => p.is_active);
    if (toAdd.length === 0) return;
    setSeeding(true);
    try {
      await Promise.all(
        toAdd.map(p =>
          API.post('/form4-items', {
            budget_plan_id:      plan.dept_budget_plan_id,
            aip_program_id:      p.aip_program_id,
            program_description: p.program_description,
            aip_reference_code:  p.aip_reference_code ?? '',
            ps_amount:   0,
            mooe_amount: 0,
            co_amount:   0,
          }).catch(() => {})
        )
      );
      await fetchItems();
      toast.info(`Pre-filled ${toAdd.length} AIP program(s) from past plans. Set your amounts to complete.`);
    } catch (err) {
      console.error('Seeding past programs failed', err);
    } finally {
      setSeeding(false);
    }
  };

  useEffect(() => {
    if (loading) return;
    seedPastPrograms(items, existingPrograms);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  const filteredPrograms = useMemo(() => {
    const q = programSearch.toLowerCase();
    return existingPrograms.filter(p =>
      p.program_description.toLowerCase().includes(q) ||
      (p.aip_reference_code?.toLowerCase().includes(q) ?? false)
    );
  }, [existingPrograms, programSearch]);

  // ── Modal openers ────────────────────────────────────────────────────────────

  const openAddModal = () => {
    setEditingItem(null);
    setFormData({ ...EMPTY_FORM });
    setSelectedProgram(null);
    setProgramSearch('');
    const hasAvailable = existingPrograms.some(p => !usedProgramIds.has(p.aip_program_id));
    setModalMode(hasAvailable ? 'choose' : 'new');
    setModalOpen(true);
  };

  const openEditModal = (item: DepartmentBudgetPlanForm4Item) => {
    setCtxMenu(null);
    setEditingItem(item);
    setModalMode('new');
    setSelectedProgram(null);
    setFormData({
      aip_reference_code:    item.aip_reference_code    || '',
      program_description:   item.program_description   || '',
      major_final_output:    item.major_final_output     || '',
      performance_indicator: item.performance_indicator || '',
      target:                item.target                || '',
      ps_amount:             item.ps_amount,
      mooe_amount:           item.mooe_amount,
      co_amount:             item.co_amount,
      sem1_amount:           item.sem1_amount,
      sem2_amount:           item.sem2_amount,
    });
    setModalOpen(true);
  };

  const handleSelectExistingProgram = (program: AIPProgram) => {
    setSelectedProgram(program);
    setFormData(prev => ({
      ...prev,
      aip_reference_code:  program.aip_reference_code || '',
      program_description: program.program_description,
    }));
    setModalMode('existing');
  };

  // ── Form handlers ────────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const raw = value.replace(/,/g, '').replace(/[^\d]/g, '');
    setFormData(prev => ({ ...prev, [name]: raw === '' ? 0 : parseInt(raw, 10) }));
  };

  const formatAmountDisplay = (val: number): string => {
    if (val === 0) return '';
    return Math.round(val).toLocaleString('en-PH');
  };

  // ── Save / Delete ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (modalMode === 'new' && !editingItem) {
      const desc = formData.program_description.trim().toLowerCase();
      if (!desc) { toast.error('Program description is required.'); return; }
      if (usedDescriptions.has(desc)) {
        toast.error('A program with this description already exists in this budget plan.');
        return;
      }
      const descExistsInMaster = existingPrograms.some(
        p => p.program_description.trim().toLowerCase() === desc
      );
      if (descExistsInMaster) {
        toast.error('This program description already exists. Select it from the existing programs list instead.');
        return;
      }
    }
    setSaving(true);
    try {
      const payload: any = { ...formData, budget_plan_id: plan.dept_budget_plan_id };
      if (modalMode === 'existing' && selectedProgram) payload.aip_program_id = selectedProgram.aip_program_id;
      if (editingItem) {
        await API.put(`/form4-items/${editingItem.dept_bp_form4_item_id}`, payload);
        toast.success('Item updated.');
      } else {
        await API.post('/form4-items', payload);
        toast.success('Item added.');
      }
      await fetchItems();
      await fetchExistingPrograms();
      setModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save item.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (itemId: number) => {
    setCtxMenu(null);
    if (!confirm('Delete this item?')) return;
    try {
      await API.delete(`/form4-items/${itemId}`);
      await fetchItems();
      toast.success('Item deleted.');
    } catch (err) {
      toast.error('Failed to delete item.');
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────────

  const totals = items.reduce(
    (acc, item) => ({
      ps: acc.ps + item.ps_amount, mooe: acc.mooe + item.mooe_amount,
      co: acc.co + item.co_amount, total: acc.total + item.total_amount,
    }),
    { ps: 0, mooe: 0, co: 0, total: 0 }
  );

  const modalTotal = formData.ps_amount + formData.mooe_amount + formData.co_amount;

  const newDescDuplicate = useMemo(() => {
    if (modalMode !== 'new' || editingItem) return false;
    const desc = formData.program_description.trim().toLowerCase();
    if (!desc) return false;
    return (
      usedDescriptions.has(desc) ||
      existingPrograms.some(p => p.program_description.trim().toLowerCase() === desc)
    );
  }, [modalMode, editingItem, formData.program_description, usedDescriptions, existingPrograms]);

  if (loading || seeding) return <LoadingState />;

  // ── Render ────────────────────────────────────────────────────────────────────

  return (
    // ↓ "relative" is required — same as AipProgramsTab's outer div
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm">

      {/* Section title */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 4</p>
          <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
            Mandate, Vision, Mission, Major Final Output, Performance Indicators &amp; Targets
            <span className="ml-2 text-gray-400 font-normal text-[13px]">CY {plan.budget_plan?.year ?? 'N/A'}</span>
          </h3>
        </div>
        <div className="flex items-center gap-3">
          {isEditable && (
            <>
              <span className="text-[10px] text-gray-400 italic hidden sm:block">Click a row to edit or delete</span>
              <Button
                size="sm"
                onClick={openAddModal}
                className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
              >
                <PlusIcon className="w-3.5 h-3.5" />
                Add Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[12px] border-collapse" style={{ minWidth: 1100 }}>
          <thead>
            <tr>
              <th className={TH}>AIP Ref. Code</th>
              <th className={TH}>Program / Project / Activity</th>
              <th className={TH}>Major Final Output</th>
              <th className={TH}>Performance Indicator</th>
              <th className={TH}>Target</th>
              <th className={TH_R}>PS</th>
              <th className={TH_R}>MOOE</th>
              <th className={TH_R}>CO</th>
              <th className={TH_R}>Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr
                key={item.dept_bp_form4_item_id}
                onClick={isEditable ? (e) => handleRowClick(e, item) : undefined}
                onContextMenu={isEditable ? (e) => { e.preventDefault(); handleRowClick(e, item); } : undefined}
                className={cn(
                  'hover:bg-gray-50/80 transition-colors select-none',
                  isEditable && 'cursor-pointer'
                )}
              >
                <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>
                  {item.aip_reference_code || '–'}
                </td>
                <td className={cn(TD, 'font-medium text-gray-800')}>
                  {item.program_description || '–'}
                </td>
                <td className={TD}>{item.major_final_output || '–'}</td>
                <td className={TD}>{item.performance_indicator || '–'}</td>
                <td className={TD}>{item.target || '–'}</td>
                <td className={TD_MONO}>{fmtAmount(item.ps_amount)}</td>
                <td className={TD_MONO}>{fmtAmount(item.mooe_amount)}</td>
                <td className={TD_MONO}>{fmtAmount(item.co_amount)}</td>
                <td className={cn(TD_MONO, 'font-semibold')}>{fmtAmount(item.total_amount)}</td>
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={9} className="py-12 text-center text-gray-400 text-sm">
                  No items.{' '}
                  {isEditable && (
                    <button
                      data-no-ctx
                      onClick={openAddModal}
                      className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900"
                    >
                      Add the first one
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="bg-gray-900 text-white">
              <td colSpan={5} className="px-3 py-3 text-right text-[10px] font-semibold uppercase tracking-widest text-gray-400">
                Total Appropriations
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold border-l border-gray-700">
                {fmtCurrency(totals.ps)}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold border-l border-gray-700">
                {fmtCurrency(totals.mooe)}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums font-semibold border-l border-gray-700">
                {fmtCurrency(totals.co)}
              </td>
              <td className="px-3 py-3 text-right font-mono tabular-nums font-bold border-l border-gray-700">
                {fmtCurrency(totals.total)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ── Context Menu — exactly like AipProgramsTab ── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[175px] overflow-hidden"
        >
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[155px]">
              {ctxMenu.item.aip_reference_code
                ? ctxMenu.item.aip_reference_code
                : (ctxMenu.item.program_description ?? '').slice(0, 26)}
            </p>
          </div>
          <button
            onClick={() => openEditModal(ctxMenu.item)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Item
          </button>
          <button
            onClick={() => handleDelete(ctxMenu.item.dept_bp_form4_item_id)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            Delete
          </button>
        </div>
      )}

      {/* ── Add / Edit Dialog ── */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-gray-200 gap-0 p-0">

          {/* Screen 1: Choose */}
          {modalMode === 'choose' && (
            <>
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
                <DialogTitle className="text-[15px] font-semibold text-gray-900">Add AIP Program Item</DialogTitle>
                <DialogDescription className="text-xs text-gray-400 mt-0.5">
                  Select an existing program or create a new one.
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 py-5 space-y-4">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm border-gray-200"
                    placeholder="Search by code or description…"
                    value={programSearch}
                    onChange={e => setProgramSearch(e.target.value)}
                  />
                </div>
                <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 max-h-56 overflow-y-auto">
                  {filteredPrograms.length === 0 ? (
                    <p className="p-4 text-[12px] text-gray-400 text-center">No matching programs.</p>
                  ) : (
                    filteredPrograms.map(program => {
                      const used = usedProgramIds.has(program.aip_program_id);
                      return (
                        <button
                          key={program.aip_program_id}
                          type="button"
                          disabled={used}
                          onClick={() => handleSelectExistingProgram(program)}
                          className={cn(
                            'w-full text-left px-4 py-2.5 flex items-start justify-between gap-3 transition-colors',
                            used ? 'bg-gray-50 cursor-not-allowed opacity-50' : 'hover:bg-gray-50 cursor-pointer'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            {program.aip_reference_code && (
                              <span className="text-[10px] text-gray-400 block mb-0.5 font-mono">{program.aip_reference_code}</span>
                            )}
                            <span className="text-[12px] font-medium text-gray-900 block truncate">{program.program_description}</span>
                          </div>
                          {used
                            ? <Badge variant="secondary" className="text-[10px] shrink-0">Already added</Badge>
                            : <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">Select →</span>
                          }
                        </button>
                      );
                    })
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span>or create a new program</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>
                <Button
                  variant="outline" size="sm"
                  className="w-full h-9 text-xs border-gray-200 gap-1.5"
                  onClick={() => { setSelectedProgram(null); setFormData({ ...EMPTY_FORM }); setModalMode('new'); }}
                >
                  <PlusCircleIcon className="w-3.5 h-3.5" />
                  Create New AIP Program
                </Button>
              </div>
              <div className="px-6 py-4 border-t border-gray-100 flex justify-end">
                <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
                  onClick={() => setModalOpen(false)}>Cancel</Button>
              </div>
            </>
          )}

          {/* Screen 2: Form */}
          {(modalMode === 'existing' || modalMode === 'new') && (
            <>
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
                <DialogTitle className="text-[15px] font-semibold text-gray-900">
                  {editingItem ? 'Edit Item' : modalMode === 'existing' ? 'Add Item — Existing Program' : 'Add Item — New Program'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 mt-0.5">
                  {modalMode === 'existing'
                    ? 'Program fields are locked. Only budget amounts can be changed.'
                    : editingItem ? 'Update item details.' : 'Fill in all details.'}
                </DialogDescription>
              </DialogHeader>
              <div className="px-6 py-5 space-y-4">
                {!editingItem && (
                  <button
                    type="button"
                    onClick={() => { setProgramSearch(''); setModalMode('choose'); }}
                    className="text-[12px] text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    ← Back to program selection
                  </button>
                )}
                {modalMode === 'existing' && selectedProgram && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700">
                    <span className="font-medium flex-shrink-0">Using:</span>
                    <span className="flex-1 truncate">{selectedProgram.program_description}</span>
                    {selectedProgram.aip_reference_code && (
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">{selectedProgram.aip_reference_code}</Badge>
                    )}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">AIP Reference Code</Label>
                  <Input
                    name="aip_reference_code" value={formData.aip_reference_code}
                    onChange={handleInputChange} placeholder="e.g. 1000-02-04-003"
                    readOnly={modalMode === 'existing'}
                    className={cn('h-9 text-sm border-gray-200', modalMode === 'existing' && 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Program / Project / Activity Description</Label>
                  <Textarea
                    name="program_description" value={formData.program_description}
                    onChange={handleInputChange} rows={2} placeholder="e.g. IRR Crafting Improved Services"
                    readOnly={modalMode === 'existing'}
                    className={cn(
                      'text-sm resize-none border-gray-200',
                      modalMode === 'existing' && 'bg-gray-50 text-gray-400 cursor-not-allowed',
                      newDescDuplicate && 'border-red-400 focus:ring-red-300'
                    )}
                  />
                  {modalMode === 'existing' && (
                    <p className="text-[10px] text-gray-400">🔒 Program fields are locked to the selected record.</p>
                  )}
                  {newDescDuplicate && modalMode === 'new' && (
                    <p className="text-[11px] text-red-600 flex items-center gap-1">
                      ⚠ A program with this description already exists. Select it from the list instead.
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Major Final Output</Label>
                  <Textarea name="major_final_output" value={formData.major_final_output}
                    onChange={handleInputChange} rows={2} placeholder="e.g. IRR Crafted"
                    className="text-sm resize-none border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Performance Indicator</Label>
                  <Textarea name="performance_indicator" value={formData.performance_indicator}
                    onChange={handleInputChange} rows={2}
                    className="text-sm resize-none border-gray-200" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Target for the Budget Year</Label>
                  <Input name="target" value={formData.target} onChange={handleInputChange}
                    placeholder="e.g. Jan–Dec" className="h-9 text-sm border-gray-200" />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {(['ps_amount', 'mooe_amount', 'co_amount'] as const).map(field => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">
                        {field === 'ps_amount' ? 'PS' : field === 'mooe_amount' ? 'MOOE' : 'CO'}
                      </Label>
                      <Input
                        name={field} type="text" inputMode="numeric"
                        value={formatAmountDisplay((formData as any)[field])}
                        onChange={handleAmountChange} placeholder="0"
                        className="h-9 text-sm text-right font-mono border-gray-200"
                      />
                    </div>
                  ))}
                </div>
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Total</span>
                  <span className="text-[14px] font-semibold font-mono text-gray-900">{fmtCurrency(modalTotal)}</span>
                </div>
              </div>
              <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
                  onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button
                  size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
                  onClick={handleSave}
                  disabled={saving || (modalMode === 'new' && !editingItem && newDescDuplicate)}
                >
                  {saving
                    ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                    : editingItem ? 'Update' : 'Add Item'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Form4;
