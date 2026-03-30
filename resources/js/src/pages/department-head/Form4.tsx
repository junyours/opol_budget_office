import React, { useEffect, useState, useMemo } from 'react';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/src/components/ui/dropdown-menu';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Textarea } from '@/src/components/ui/textarea';
import { Badge } from '@/src/components/ui/badge';
import { MoreHorizontalIcon } from 'lucide-react';
import { MagnifyingGlassIcon, PlusCircleIcon } from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';

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

type ModalMode = 'choose' | 'existing' | 'new';

const EMPTY_FORM = {
  aip_reference_code: '', program_description: '', major_final_output: '',
  performance_indicator: '', target: '',
  ps_amount: 0, mooe_amount: 0, co_amount: 0, sem1_amount: 0, sem2_amount: 0,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

// const fmtCurrency = (v: number) => {
//   if (typeof v !== 'number' || isNaN(v)) return '₱0.00';
//   return `₱${v.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
// };
const fmtCurrency = (v: number) => {
  if (typeof v !== 'number' || isNaN(v)) return '₱0';
  return `₱${Math.round(v).toLocaleString('en-PH')}`;
};

const fmtAmount = (v: number) => {
  if (!v || v === 0) return '–';
  return `₱${Math.round(v).toLocaleString('en-PH')}`;
};

// const TH = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left';
// const TH_R = 'border-b border-gray-200 bg-white px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right';
// const TD = 'px-3 py-2.5 text-[12px] text-gray-700';
// const TD_MONO = 'px-3 py-2.5 text-[12px] font-mono tabular-nums text-right text-gray-700';

const TH_R = 'border-b border-gray-200 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-right whitespace-nowrap';
const TH   = 'border-b border-gray-200 bg-white px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wide text-gray-500 text-left whitespace-nowrap';
const TD      = 'px-4 py-3 text-[12px] text-gray-700';
const TD_MONO = 'px-4 py-3 text-[12px] font-mono tabular-nums text-right text-gray-700';

// ─── Component ────────────────────────────────────────────────────────────────

const Form4: React.FC<Form4Props> = ({ plan, isEditable }) => {
  const [items, setItems]                     = useState<DepartmentBudgetPlanForm4Item[]>([]);
  const [existingPrograms, setExistingPrograms] = useState<AIPProgram[]>([]);
  const [loading, setLoading]                 = useState(true);

  const [modalOpen, setModalOpen]             = useState(false);
  const [modalMode, setModalMode]             = useState<ModalMode>('choose');
  const [editingItem, setEditingItem]         = useState<DepartmentBudgetPlanForm4Item | null>(null);
  const [programSearch, setProgramSearch]     = useState('');
  const [selectedProgram, setSelectedProgram] = useState<AIPProgram | null>(null);
  const [formData, setFormData]               = useState({ ...EMPTY_FORM });

  const usedProgramIds = useMemo(() => new Set(items.map(i => i.aip_program_id)), [items]);

  useEffect(() => {
    fetchItems();
    fetchExistingPrograms();
  }, [plan.dept_budget_plan_id]);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  const fetchItems = async () => {
    setLoading(true);
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
    } finally {
      setLoading(false);
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

  // ── Filtered programs ─────────────────────────────────────────────────────

  const filteredPrograms = useMemo(() => {
    const q = programSearch.toLowerCase();
    return existingPrograms.filter(p =>
      p.program_description.toLowerCase().includes(q) ||
      (p.aip_reference_code?.toLowerCase().includes(q) ?? false)
    );
  }, [existingPrograms, programSearch]);

  // ── Modal openers ─────────────────────────────────────────────────────────

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

  // ── Form handlers ─────────────────────────────────────────────────────────

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  //   const { name, value } = e.target;
  //   setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }));
  // };
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    // Strip commas, allow only digits
    const raw = value.replace(/,/g, '').replace(/[^\d]/g, '');
    setFormData(prev => ({ ...prev, [name]: raw === '' ? 0 : parseInt(raw, 10) }));
  };
  const formatAmountDisplay = (val: number): string => {
    if (val === 0) return '';
    return Math.round(val).toLocaleString('en-PH');
  };

  // ── Save / Delete ─────────────────────────────────────────────────────────

  const handleSave = async () => {
    try {
      const payload: any = { ...formData, budget_plan_id: plan.dept_budget_plan_id };
      if (modalMode === 'existing' && selectedProgram) payload.aip_program_id = selectedProgram.aip_program_id;
      editingItem
        ? await API.put(`/form4-items/${editingItem.dept_bp_form4_item_id}`, payload)
        : await API.post('/form4-items', payload);
      await fetchItems();
      await fetchExistingPrograms();
      setModalOpen(false);
    } catch (err) {
      console.error('Save failed', err);
      alert('Failed to save item.');
    }
  };

  const handleDelete = async (itemId: number) => {
    if (!confirm('Delete this item?')) return;
    try {
      await API.delete(`/form4-items/${itemId}`);
      await fetchItems();
    } catch (err) {
      console.error('Delete failed', err);
      alert('Failed to delete item.');
    }
  };

  // ── Totals ────────────────────────────────────────────────────────────────

  const totals = items.reduce(
    (acc, item) => ({
      ps: acc.ps + item.ps_amount, mooe: acc.mooe + item.mooe_amount,
      co: acc.co + item.co_amount, total: acc.total + item.total_amount,
    }),
    { ps: 0, mooe: 0, co: 0, total: 0 }
  );

  const modalTotal = formData.ps_amount + formData.mooe_amount + formData.co_amount;

  if (loading) return <LoadingState />;

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">

      {/* Section title */}
      <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400">Form 4</p>
          <h3 className="text-[15px] font-semibold text-gray-900 mt-0.5">
            Mandate, Vision, Mission, Major Final Output, Performance Indicators &amp; Targets
            <span className="ml-2 text-gray-400 font-normal text-[13px]">CY {plan.budget_plan?.year ?? 'N/A'}</span>
          </h3>
        </div>
        {isEditable && (
          <Button
            size="sm"
            onClick={openAddModal}
            className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            Add Item
          </Button>
        )}
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
              {isEditable && <th className={cn(TH, 'text-center w-12')} />}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {items.map(item => (
              <tr key={item.dept_bp_form4_item_id} className="hover:bg-gray-50/60 transition-colors">
                <td className={cn(TD, 'text-gray-400 font-mono text-[11px]')}>
                  {item.aip_reference_code || '–'}
                </td>
                <td className={cn(TD, 'font-medium text-gray-800')}>
                  {item.program_description || '–'}
                </td>
                <td className={TD}>{item.major_final_output || '–'}</td>
                <td className={TD}>{item.performance_indicator || '–'}</td>
                <td className={TD}>{item.target || '–'}</td>
                {/* <td className={TD_MONO}>{fmtCurrency(item.ps_amount)}</td>
                <td className={TD_MONO}>{fmtCurrency(item.mooe_amount)}</td>
                <td className={TD_MONO}>{fmtCurrency(item.co_amount)}</td>
                <td className={cn(TD_MONO, 'font-semibold')}>{fmtCurrency(item.total_amount)}</td> */}
                <td className={TD_MONO}>{fmtAmount(item.ps_amount)}</td>
                <td className={TD_MONO}>{fmtAmount(item.mooe_amount)}</td>
                <td className={TD_MONO}>{fmtAmount(item.co_amount)}</td>
                <td className={cn(TD_MONO, 'font-semibold')}>{fmtAmount(item.total_amount)}</td>
                {isEditable && (
                  <td className="px-2 py-2 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                          <MoreHorizontalIcon className="w-4 h-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-32">
                        <DropdownMenuItem onClick={() => openEditModal(item)}>Edit</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-red-600 focus:text-red-600 focus:bg-red-50"
                          onClick={() => handleDelete(item.dept_bp_form4_item_id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                )}
              </tr>
            ))}
            {items.length === 0 && (
              <tr>
                <td colSpan={isEditable ? 10 : 9} className="py-12 text-center text-gray-400 text-sm">
                  No items.{' '}
                  {isEditable && (
                    <button
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

          {/* Footer totals */}
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
              {isEditable && <td className="border-l border-gray-700" />}
            </tr>
          </tfoot>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════════════
          Add / Edit Dialog
      ════════════════════════════════════════════════════════════════════ */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border-gray-200 gap-0 p-0">

          {/* ── Screen 1: Choose ── */}
          {modalMode === 'choose' && (
            <>
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
                <DialogTitle className="text-[15px] font-semibold text-gray-900">
                  Add AIP Program Item
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 mt-0.5">
                  Select an existing program or create a new one.
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-5 space-y-4">
                {/* Search */}
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none" />
                  <Input
                    className="pl-9 h-9 text-sm border-gray-200"
                    placeholder="Search by code or description…"
                    value={programSearch}
                    onChange={e => setProgramSearch(e.target.value)}
                  />
                </div>

                {/* Program list */}
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
                            used
                              ? 'bg-gray-50 cursor-not-allowed opacity-50'
                              : 'hover:bg-gray-50 cursor-pointer'
                          )}
                        >
                          <div className="flex-1 min-w-0">
                            {program.aip_reference_code && (
                              <span className="text-[10px] text-gray-400 block mb-0.5 font-mono">
                                {program.aip_reference_code}
                              </span>
                            )}
                            <span className="text-[12px] font-medium text-gray-900 block truncate">
                              {program.program_description}
                            </span>
                          </div>
                          {used ? (
                            <Badge variant="secondary" className="text-[10px] shrink-0">Already added</Badge>
                          ) : (
                            <span className="text-[11px] text-gray-400 shrink-0 mt-0.5">Select →</span>
                          )}
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Divider */}
                <div className="flex items-center gap-3 text-[10px] text-gray-400">
                  <div className="flex-1 h-px bg-gray-200" />
                  <span>or create a new program</span>
                  <div className="flex-1 h-px bg-gray-200" />
                </div>

                <Button
                  variant="outline"
                  size="sm"
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

          {/* ── Screen 2: Form (existing or new) ── */}
          {(modalMode === 'existing' || modalMode === 'new') && (
            <>
              <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
                <DialogTitle className="text-[15px] font-semibold text-gray-900">
                  {editingItem
                    ? 'Edit Item'
                    : modalMode === 'existing'
                    ? 'Add Item — Existing Program'
                    : 'Add Item — New Program'}
                </DialogTitle>
                <DialogDescription className="text-xs text-gray-400 mt-0.5">
                  {modalMode === 'existing'
                    ? 'Program fields are locked. Only budget amounts can be changed.'
                    : editingItem ? 'Update item details.' : 'Fill in all details.'}
                </DialogDescription>
              </DialogHeader>

              <div className="px-6 py-5 space-y-4">
                {/* Back link */}
                {!editingItem && (
                  <button
                    type="button"
                    onClick={() => { setProgramSearch(''); setModalMode('choose'); }}
                    className="text-[12px] text-gray-500 hover:text-gray-900 flex items-center gap-1"
                  >
                    ← Back to program selection
                  </button>
                )}

                {/* Selected program banner */}
                {modalMode === 'existing' && selectedProgram && (
                  <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-[12px] text-gray-700">
                    <span className="font-medium flex-shrink-0">Using:</span>
                    <span className="flex-1 truncate">{selectedProgram.program_description}</span>
                    {selectedProgram.aip_reference_code && (
                      <Badge variant="outline" className="text-[10px] shrink-0 font-mono">
                        {selectedProgram.aip_reference_code}
                      </Badge>
                    )}
                  </div>
                )}

                {/* AIP Reference Code */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">AIP Reference Code</Label>
                  <Input
                    name="aip_reference_code" value={formData.aip_reference_code}
                    onChange={handleInputChange} placeholder="e.g. 1000-02-04-003"
                    readOnly={modalMode === 'existing'}
                    className={cn('h-9 text-sm border-gray-200', modalMode === 'existing' && 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                  />
                </div>

                {/* Program Description */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Program / Project / Activity Description</Label>
                  <Textarea
                    name="program_description" value={formData.program_description}
                    onChange={handleInputChange} rows={2} placeholder="e.g. IRR Crafting Improved Services"
                    readOnly={modalMode === 'existing'}
                    className={cn('text-sm resize-none border-gray-200', modalMode === 'existing' && 'bg-gray-50 text-gray-400 cursor-not-allowed')}
                  />
                  {modalMode === 'existing' && (
                    <p className="text-[10px] text-gray-400">🔒 Program fields are locked to the selected record.</p>
                  )}
                </div>

                {/* Major Final Output */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Major Final Output</Label>
                  <Textarea name="major_final_output" value={formData.major_final_output}
                    onChange={handleInputChange} rows={2} placeholder="e.g. IRR Crafted"
                    className="text-sm resize-none border-gray-200" />
                </div>

                {/* Performance Indicator */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Performance Indicator</Label>
                  <Textarea name="performance_indicator" value={formData.performance_indicator}
                    onChange={handleInputChange} rows={2}
                    className="text-sm resize-none border-gray-200" />
                </div>

                {/* Target */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Target for the Budget Year</Label>
                  <Input name="target" value={formData.target} onChange={handleInputChange}
                    placeholder="e.g. Jan–Dec" className="h-9 text-sm border-gray-200" />
                </div>

                {/* PS / MOOE / CO */}
                {/* <div className="grid grid-cols-3 gap-3">
                  {(['ps_amount', 'mooe_amount', 'co_amount'] as const).map(field => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">
                        {field === 'ps_amount' ? 'PS' : field === 'mooe_amount' ? 'MOOE' : 'CO'}
                      </Label>
                      <Input id={field} name={field} type="number" min="0" step="0.01"
                        value={(formData as any)[field]} onChange={handleNumberChange}
                        className="h-9 text-sm text-right font-mono border-gray-200" />
                    </div>
                  ))}
                </div> */}
                {/* PS / MOOE / CO */}
                <div className="grid grid-cols-3 gap-3">
                  {(['ps_amount', 'mooe_amount', 'co_amount'] as const).map(field => (
                    <div key={field} className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">
                        {field === 'ps_amount' ? 'PS' : field === 'mooe_amount' ? 'MOOE' : 'CO'}
                      </Label>
                      <Input
                        name={field}
                        type="text"
                        inputMode="numeric"
                        value={formatAmountDisplay((formData as any)[field])}
                        onChange={handleAmountChange}
                        placeholder="0"
                        className="h-9 text-sm text-right font-mono border-gray-200"
                      />
                    </div>
                  ))}
                </div>

                {/* Live total */}
                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5">
                  <span className="text-[11px] text-gray-500 font-semibold uppercase tracking-wide">Total</span>
                  <span className="text-[14px] font-semibold font-mono text-gray-900">{fmtCurrency(modalTotal)}</span>
                </div>
              </div>

              <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
                <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
                  onClick={() => setModalOpen(false)}>Cancel</Button>
                <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
                  onClick={handleSave}>
                  {editingItem ? 'Update' : 'Add Item'}
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