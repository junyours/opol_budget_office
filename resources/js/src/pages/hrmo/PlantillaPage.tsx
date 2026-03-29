import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import { Badge } from '@/src/components/ui/badge';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/src/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/src/components/ui/pagination";
import { MoreHorizontalIcon } from "lucide-react";
import { PlusIcon, MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { ExcelUploadModal } from './ExcelUploadModal';
import { LoadingState } from '../common/LoadingState';
import { useDebounce } from '../../hooks/useDebounce';
import API from '../../services/api';
import { Department } from '../../types/api';
import { cn } from '@/src/lib/utils';
import { TabScrollIndicator } from '@/src/components/ui/TabScrollIndicator';

const ITEMS_PER_PAGE = 10;

const PlantillaPage: React.FC = () => {
  const [positions, setPositions]           = useState<any[]>([]);
  const [departments, setDepartments]       = useState<Department[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<number | null>(null);
  const [loading, setLoading]               = useState(true);
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [existingNewNumbers, setExistingNewNumbers] = useState<Set<string>>(new Set());

  const [searchRaw, setSearchRaw]         = useState('');
  const debouncedSearch                   = useDebounce(searchRaw, 300);
  const [sortOrder, setSortOrder]         = useState<'asc' | 'desc'>('asc');
  const [sortColumn, setSortColumn]       = useState('position_title');
  const [currentPage, setCurrentPage]     = useState(1);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({ old_item_number: '', new_item_number: '', position_title: '', salary_grade: 1, dept_id: 0 });
  const [editDialogOpen, setEditDialogOpen]     = useState(false);
  const [editingPosition, setEditingPosition]   = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ old_item_number: '', new_item_number: '', position_title: '', salary_grade: 1, dept_id: 0 });
  const [toggleActiveOpen, setToggleActiveOpen] = useState(false);
  const [togglePosition, setTogglePosition]     = useState<any | null>(null);
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);

  useEffect(() => { if (selectedDeptId) setCreateForm(p => ({ ...p, dept_id: selectedDeptId })); }, [selectedDeptId]);
  useEffect(() => { if (createDialogOpen) setCreateForm(p => ({ ...p, new_item_number: getNextNewNumber() })); }, [createDialogOpen]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [posRes, deptRes] = await Promise.all([API.get('/plantilla-positions'), API.get('/departments')]);
      const posData = posRes.data.data || [];
      const deptData = deptRes.data.data || [];
      setPositions(posData);
      setDepartments(deptData);
      const nums = new Set<string>();
      posData.forEach((p: any) => { if (p.new_item_number) nums.add(p.new_item_number.trim()); });
      setExistingNewNumbers(nums);
      if (deptData.length > 0) setSelectedDeptId(deptData[0].dept_id);
    } catch { toast.error('Failed to load data.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, selectedDeptId]);

  const getNextNewNumber = (): string => {
    const nums = positions.map(p => p.new_item_number).filter(n => n && !isNaN(parseInt(n))).map(n => parseInt(n));
    return nums.length === 0 ? '1' : (Math.max(...nums) + 1).toString();
  };

  const filteredPositions = useMemo(() => {
    let filtered = positions.filter(p => p.dept_id === selectedDeptId);
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return filtered;
    return filtered.filter(p =>
      (p.old_item_number?.toLowerCase().includes(q)) ||
      (p.new_item_number?.toLowerCase().includes(q)) ||
      p.position_title.toLowerCase().includes(q) ||
      p.salary_grade.toString().includes(q)
    );
  }, [positions, selectedDeptId, debouncedSearch]);

  const sortedPositions = useMemo(() => {
    return [...filteredPositions].sort((a, b) => {
      let aVal = a[sortColumn], bVal = b[sortColumn];
      if (sortColumn === 'new_item_number' || sortColumn === 'old_item_number') {
        const aNum = aVal ? parseInt(aVal, 10) : 0;
        const bNum = bVal ? parseInt(bVal, 10) : 0;
        return sortOrder === 'asc' ? aNum - bNum : bNum - aNum;
      }
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPositions, sortColumn, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sortedPositions.length / ITEMS_PER_PAGE));
  const paginated  = useMemo(() => sortedPositions.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [sortedPositions, currentPage]);

  const handleSort = (col: string) => {
    setSortColumn(col);
    setSortOrder(sortColumn === col ? (sortOrder === 'asc' ? 'desc' : 'asc') : 'asc');
    setCurrentPage(1);
  };

  const sortIcon = (col: string) => sortColumn === col ? (sortOrder === 'asc' ? ' ↑' : ' ↓') : '';

  const getDeptAbbr = (id: number) => departments.find(d => d.dept_id === id)?.dept_abbreviation || `Dept ${id}`;

  const handleCreateClick = () => {
    if (!createForm.position_title || !createForm.new_item_number) { toast.error('Title and item number required.'); return; }
    if (existingNewNumbers.has(createForm.new_item_number)) { toast.error(`Item number "${createForm.new_item_number}" already exists.`); return; }
    setConfirmCreateOpen(true);
  };
  const handleConfirmCreate = async () => {
    setConfirmCreateOpen(false);
    try {
      await API.post('/plantilla-positions', createForm);
      toast.success('Position created.'); fetchData(); setCreateDialogOpen(false);
      setCreateForm({ old_item_number: '', new_item_number: '', position_title: '', salary_grade: 1, dept_id: selectedDeptId || 0 });
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed.'); }
  };
  const handleEdit = (pos: any) => {
    setEditingPosition(pos);
    setEditForm({ old_item_number: pos.old_item_number || '', new_item_number: pos.new_item_number, position_title: pos.position_title, salary_grade: pos.salary_grade, dept_id: pos.dept_id });
    setEditDialogOpen(true);
  };
  const handleConfirmUpdate = async () => {
    setConfirmUpdateOpen(false); if (!editingPosition) return;
    try {
      await API.put(`/plantilla-positions/${editingPosition.plantilla_position_id}`, editForm);
      toast.success('Position updated.'); fetchData(); setEditDialogOpen(false); setEditingPosition(null);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed.'); }
  };
  const confirmToggleActive = async () => {
    if (!togglePosition) return;
    try {
      await API.patch(`/plantilla-positions/${togglePosition.plantilla_position_id}`, { is_active: !togglePosition.is_active });
      toast.success(`Position ${togglePosition.is_active ? 'deactivated' : 'activated'}.`); fetchData();
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed.'); }
    finally { setToggleActiveOpen(false); setTogglePosition(null); }
  };

  const parsePlantillaRow = (row: any[]) => {
    const [old, newItem, title, grade, dept] = row;
    return { old_item_number: old ? String(old).trim() : null, new_item_number: newItem ? String(newItem).trim() : null, position_title: String(title).trim(), salary_grade: Number(grade), dept_id: Number(dept) };
  };
  const duplicateChecker = (row: any) => !!row.new_item_number && existingNewNumbers.has(row.new_item_number);
  const savePlantilla = async (data: any[]) => {
    await API.post('/plantilla-positions/bulk', { positions: data });
    toast.success(`Uploaded ${data.length} positions.`); fetchData(); setUploadOpen(false);
  };

  const isSearching = debouncedSearch.trim().length > 0;

  const getPageNumbers = () => {
    const delta = 2; const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) range.push(i);
      else if (range[range.length - 1] !== '...') range.push('...');
    }
    return range;
  };

  if (loading) return <LoadingState />;

  return (
    <div className="p-6 w-full space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">HR Management</span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">Plantilla Positions</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600">
            Upload Excel
          </Button>
          <Button size="sm" onClick={() => setCreateDialogOpen(true)} className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white">
            <PlusIcon className="w-3.5 h-3.5" /> New Position
          </Button>
        </div>
      </div>

      {/* Department tabs + search bar */}
      <div className="space-y-2">
        {/* Dept scrollable tab strip — full width row */}
        <div className="relative flex items-center gap-1 min-w-0">
    <button
      onClick={() => {
        const el = document.getElementById('plantilla-tabs-scroll');
        if (el) el.scrollBy({ left: -200, behavior: 'smooth' });
      }}
      className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
      </svg>
    </button>
    <div
            id="plantilla-tabs-scroll"
            className="flex-1 overflow-x-hidden min-w-0"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
      <div className="flex w-max gap-1">
        {departments.map((dept, idx) => (
          <button
            key={dept.dept_id}
            onClick={() => {
              setSelectedDeptId(dept.dept_id);
              setCurrentPage(1);
              setTimeout(() => {
                const strip = document.getElementById('plantilla-tabs-scroll');
                const btn = strip?.querySelectorAll('button')[idx] as HTMLElement | undefined;
                if (strip && btn) {
                  const btnLeft = btn.offsetLeft;
                  const btnWidth = btn.offsetWidth;
                  const stripW = strip.offsetWidth;
                  const scrollL = strip.scrollLeft;
                  if (btnLeft < scrollL + 40) {
                    strip.scrollBy({ left: btnLeft - scrollL - 40, behavior: 'smooth' });
                  } else if (btnLeft + btnWidth > scrollL + stripW - 40) {
                    strip.scrollBy({ left: btnLeft + btnWidth - scrollL - stripW + 40, behavior: 'smooth' });
                  }
                }
              }, 0);
            }}
            className={cn(
              'flex-shrink-0 h-8 px-3.5 text-xs font-medium rounded-lg border transition-all duration-200 whitespace-nowrap',
              selectedDeptId === dept.dept_id
                ? 'bg-gray-900 text-white border-gray-900 shadow-md scale-[1.03]'
                : 'text-gray-500 border-transparent bg-gray-100 hover:bg-gray-200 hover:text-gray-800 hover:scale-[1.02]'
            )}
          >
            {dept.dept_abbreviation || dept.dept_name}
          </button>
        ))}
      </div>
    </div>
    <button
      onClick={() => {
        const el = document.getElementById('plantilla-tabs-scroll');
        if (el) el.scrollBy({ left: 200, behavior: 'smooth' });
      }}
      className="flex-shrink-0 h-8 w-7 flex items-center justify-center rounded-md border border-gray-200 bg-white text-gray-400 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all shadow-sm z-10"
    >
      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </button>
  </div>
  <TabScrollIndicator scrollId="plantilla-tabs-scroll" />

        {/* Search + count row */}
        <div className="flex items-center gap-3">
        <div className="relative min-w-[180px] max-w-xs">
      <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      <Input value={searchRaw} onChange={e => { setSearchRaw(e.target.value); setCurrentPage(1); }} placeholder="Search positions…" className="pl-8 pr-8 h-8 text-xs border-gray-200 bg-white" />
      {isSearching && (
        <button onClick={() => { setSearchRaw(''); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
          <XMarkIcon className="w-3 h-3" />
        </button>
      )}
    </div>
    <span className="text-[11px] text-gray-400 whitespace-nowrap">
      {isSearching
        ? <><span className="font-medium text-gray-600">{sortedPositions.length}</span> of <span className="font-medium text-gray-600">{positions.filter(p => p.dept_id === selectedDeptId).length}</span> positions</>
        : <><span className="font-medium text-gray-600">{sortedPositions.length}</span> position{sortedPositions.length !== 1 ? 's' : ''}</>
      }
    </span>
  </div>
</div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {sortedPositions.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching ? (
              <>No positions match "{debouncedSearch}".{' '}
                <button onClick={() => setSearchRaw('')} className="text-gray-600 underline underline-offset-2 font-medium">Clear search</button>
              </>
            ) : 'No positions in this department.'}
          </div>
        ) : (
          <>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  {[
                    { col: 'old_item_number', label: 'Old Item #', cls: 'w-28' },
                    { col: 'new_item_number', label: 'New Item #', cls: 'w-28' },
                    { col: 'position_title',  label: 'Position Title', cls: '' },
                    { col: 'salary_grade',    label: 'Grade', cls: 'w-20 text-center' },
                  ].map(({ col, label, cls }) => (
                    <th key={col} onClick={() => handleSort(col)} className={cn(
                      "border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none", cls
                    )}>
                      {label}{sortIcon(col)}
                    </th>
                  ))}
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-20">Status</th>
                  <th className="border-b border-gray-200 bg-white px-2 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(pos => (
                  <tr key={pos.plantilla_position_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-gray-500">{pos.old_item_number || '–'}</td>
                    <td className="px-4 py-2.5 font-mono text-gray-700 font-medium">{pos.new_item_number}</td>
                    <td className="px-4 py-2.5 text-gray-900">{pos.position_title}</td>
                    <td className="px-4 py-2.5 text-center tabular-nums text-gray-700">{pos.salary_grade}</td>
                    <td className="px-4 py-2.5">
                      <span className={cn(
                        "inline-flex text-[10px] font-semibold px-2 py-0.5 rounded-full border",
                        pos.is_active
                          ? "text-emerald-700 bg-emerald-50 border-emerald-200"
                          : "text-red-600 bg-red-50 border-red-200"
                      )}>
                        {pos.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-2 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                            <MoreHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem onClick={() => handleEdit(pos)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onClick={() => { setTogglePosition(pos); setToggleActiveOpen(true); }}>
                            {pos.is_active ? 'Deactivate' : 'Activate'}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing <span className="font-medium text-gray-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sortedPositions.length)}</span> of <span className="font-medium text-gray-600">{sortedPositions.length}</span>
                </p>
                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious onClick={() => setCurrentPage(p => Math.max(1, p - 1))} className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", currentPage === 1 && "pointer-events-none opacity-40")} />
                    </PaginationItem>
                    {getPageNumbers().map((p, i) => p === '...' ? (
                      <PaginationItem key={`e-${i}`}><PaginationEllipsis className="h-7 w-7 text-[11px]" /></PaginationItem>
                    ) : (
                      <PaginationItem key={p}>
                        <PaginationLink onClick={() => setCurrentPage(p as number)} isActive={currentPage === p} className={cn("h-7 w-7 text-[11px] rounded-md cursor-pointer", currentPage === p ? "bg-gray-900 text-white hover:bg-gray-800 border-gray-900" : "text-gray-600 hover:bg-gray-50")}>{p}</PaginationLink>
                      </PaginationItem>
                    ))}
                    <PaginationItem>
                      <PaginationNext onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} className={cn("h-7 px-2 text-[11px] rounded-md cursor-pointer", currentPage === totalPages && "pointer-events-none opacity-40")} />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Dialogs ── */}

      {/* Create */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold">New Plantilla Position</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">Fill in the details for the new position.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {[
              { id: 'old_item', label: 'Old Item #', key: 'old_item_number', placeholder: 'Optional' },
              { id: 'new_item', label: 'New Item #', key: 'new_item_number', placeholder: 'Required' },
              { id: 'pos_title', label: 'Position Title', key: 'position_title', placeholder: 'e.g. Administrative Aide I' },
            ].map(f => (
              <div key={f.id} className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">{f.label}</Label>
                <Input value={(createForm as any)[f.key]} onChange={e => setCreateForm(p => ({ ...p, [f.key]: e.target.value }))} placeholder={f.placeholder} className="h-9 text-sm" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Salary Grade</Label>
              <Input type="number" min={1} max={40} value={createForm.salary_grade} onChange={e => setCreateForm(p => ({ ...p, salary_grade: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Department</Label>
              <Input value={getDeptAbbr(createForm.dept_id)} disabled className="h-9 text-sm bg-gray-50 text-gray-500" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleCreateClick}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold">Edit Position</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">Update the position details.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {[
              { label: 'Old Item #', key: 'old_item_number' },
              { label: 'New Item #', key: 'new_item_number' },
              { label: 'Position Title', key: 'position_title' },
            ].map(f => (
              <div key={f.key} className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">{f.label}</Label>
                <Input value={(editForm as any)[f.key]} onChange={e => setEditForm(p => ({ ...p, [f.key]: e.target.value }))} className="h-9 text-sm" />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Salary Grade</Label>
              <Input type="number" min={1} max={40} value={editForm.salary_grade} onChange={e => setEditForm(p => ({ ...p, salary_grade: parseInt(e.target.value) || 1 }))} className="h-9 text-sm" />
            </div>
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={() => setConfirmUpdateOpen(true)}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirm Create */}
      <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Create position?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">A new plantilla position will be added to the database.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleConfirmCreate}>Create</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirm Update */}
      <AlertDialog open={confirmUpdateOpen} onOpenChange={setConfirmUpdateOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Save changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">The position details will be updated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleConfirmUpdate}>Save</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Toggle Active */}
      <AlertDialog open={toggleActiveOpen} onOpenChange={setToggleActiveOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">{togglePosition?.is_active ? 'Deactivate' : 'Activate'} position?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">{togglePosition?.position_title}</span> will be {togglePosition?.is_active ? 'deactivated and hidden from personnel services' : 'activated and visible for assignment'}.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className={cn("h-8 text-xs", togglePosition?.is_active ? "bg-red-600 hover:bg-red-700" : "bg-emerald-600 hover:bg-emerald-700")} onClick={confirmToggleActive}>
                {togglePosition?.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExcelUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Plantilla Positions" entityName="plantilla positions" confirmationDescription="These positions will be bulk-inserted into the database." parseRow={parsePlantillaRow} requiredColumns={['old_item_number','new_item_number','position_title','salary_grade','dept_id']} onSave={savePlantilla} headerRowsToSkip={1} duplicateChecker={duplicateChecker} />
    </div>
  );
};

export default PlantillaPage;