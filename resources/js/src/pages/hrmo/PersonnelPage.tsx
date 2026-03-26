import React, { useState, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
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
import { cn } from '@/src/lib/utils';

const ITEMS_PER_PAGE = 10;

const PersonnelPage: React.FC = () => {
  const [personnels, setPersonnels]         = useState<any[]>([]);
  const [loading, setLoading]               = useState(true);
  const [uploadOpen, setUploadOpen]         = useState(false);
  const [existingNames, setExistingNames]   = useState<Set<string>>(new Set());

  const [searchRaw, setSearchRaw]       = useState('');
  const debouncedSearch                 = useDebounce(searchRaw, 300);
  const [sortOrder, setSortOrder]       = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage]   = useState(1);

  const [newDialogOpen, setNewDialogOpen]         = useState(false);
  const [newForm, setNewForm]                     = useState({ first_name: '', middle_name: '', last_name: '' });
  const [editDialogOpen, setEditDialogOpen]       = useState(false);
  const [editingPersonnel, setEditingPersonnel]   = useState<any | null>(null);
  const [editForm, setEditForm]                   = useState({ first_name: '', middle_name: '', last_name: '' });
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);

  const fetchPersonnels = async () => {
    try {
      const res = await API.get('/personnels');
      const data = res.data.data || [];
      setPersonnels(data);
      const names = new Set<string>();
      data.forEach((p: any) => {
        names.add(`${p.last_name?.trim().toLowerCase()}|${p.first_name?.trim().toLowerCase()}|${(p.middle_name?.trim() || '').toLowerCase()}`);
      });
      setExistingNames(names);
      setCurrentPage(1);
    } catch { toast.error('Failed to load personnel.'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPersonnels(); }, []);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch]);

  const filtered = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return personnels;
    return personnels.filter(p =>
      p.first_name?.toLowerCase().includes(q) ||
      p.middle_name?.toLowerCase().includes(q) ||
      p.last_name?.toLowerCase().includes(q)
    );
  }, [personnels, debouncedSearch]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a.last_name?.toLowerCase() || '';
      const bVal = b.last_name?.toLowerCase() || '';
      return sortOrder === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
    });
  }, [filtered, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated  = useMemo(() => sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE), [sorted, currentPage]);

  const isSearching = debouncedSearch.trim().length > 0;

  const getPageNumbers = () => {
    const delta = 2; const range: (number | string)[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - delta && i <= currentPage + delta)) range.push(i);
      else if (range[range.length - 1] !== '...') range.push('...');
    }
    return range;
  };

  const handleConfirmCreate = async () => {
    setConfirmCreateOpen(false);
    try {
      await API.post('/personnels', newForm);
      toast.success('Personnel created.'); fetchPersonnels(); setNewDialogOpen(false);
      setNewForm({ first_name: '', middle_name: '', last_name: '' });
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed.'); }
  };

  const handleEdit = (p: any) => {
    setEditingPersonnel(p);
    setEditForm({ first_name: p.first_name, middle_name: p.middle_name || '', last_name: p.last_name });
    setEditDialogOpen(true);
  };

  const handleConfirmUpdate = async () => {
    setConfirmUpdateOpen(false); if (!editingPersonnel) return;
    try {
      await API.put(`/personnels/${editingPersonnel.personnel_id}`, editForm);
      toast.success('Personnel updated.'); fetchPersonnels(); setEditDialogOpen(false); setEditingPersonnel(null);
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed.'); }
  };

  const parsePersonnelRow = (row: any[]) => {
    const [first, middle, last] = row;
    return { first_name: String(first), middle_name: middle ? String(middle) : null, last_name: String(last) };
  };
  const duplicateChecker = (row: any) => {
    const full = `${row.last_name?.trim().toLowerCase()}|${row.first_name?.trim().toLowerCase()}|${(row.middle_name?.trim() || '').toLowerCase()}`;
    return existingNames.has(full);
  };
  const savePersonnels = async (data: any[]) => {
    await API.post('/personnels/bulk', { personnels: data });
    toast.success(`Uploaded ${data.length} personnel.`); fetchPersonnels(); setUploadOpen(false);
  };

  if (loading) return <LoadingState />;

  return (
    <div className="p-6 w-full space-y-5">

      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">HR Management</span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">Personnel</h1>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setUploadOpen(true)} className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600">
            Upload Excel
          </Button>
          <Button size="sm" onClick={() => setNewDialogOpen(true)} className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white">
            <PlusIcon className="w-3.5 h-3.5" /> New Personnel
          </Button>
        </div>
      </div>

      {/* Search + count */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input value={searchRaw} onChange={e => { setSearchRaw(e.target.value); setCurrentPage(1); }} placeholder="Search by name…" className="pl-8 pr-8 h-8 text-xs border-gray-200 bg-white" />
          {isSearching && (
            <button onClick={() => { setSearchRaw(''); setCurrentPage(1); }} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors">
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>
        <span className="text-[11px] text-gray-400">
          {isSearching
            ? <><span className="font-medium text-gray-600">{sorted.length}</span> of <span className="font-medium text-gray-600">{personnels.length}</span> records</>
            : <><span className="font-medium text-gray-600">{personnels.length}</span> record{personnels.length !== 1 ? 's' : ''}</>
          }
        </span>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching
              ? <><span>No personnel match "{debouncedSearch}".</span> <button onClick={() => setSearchRaw('')} className="text-gray-600 underline underline-offset-2 font-medium">Clear search</button></>
              : 'No personnel records yet.'}
          </div>
        ) : (
          <>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">First Name</th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">Middle Name</th>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer hover:text-gray-900 select-none"
                    onClick={() => { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
                  >
                    Last Name {sortOrder === 'asc' ? '↑' : '↓'}
                  </th>
                  <th className="border-b border-gray-200 bg-white px-2 py-2.5 w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(p => (
                  <tr key={p.personnel_id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-2.5 text-gray-900">{p.first_name}</td>
                    <td className="px-4 py-2.5 text-gray-500">{p.middle_name || '–'}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{p.last_name}</td>
                    <td className="px-2 py-2.5 text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                            <MoreHorizontalIcon className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-32">
                          <DropdownMenuItem onClick={() => handleEdit(p)}>Edit</DropdownMenuItem>
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
                  Showing <span className="font-medium text-gray-600">{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)}</span> of <span className="font-medium text-gray-600">{sorted.length}</span>
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

      {/* New */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold">New Personnel</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">Enter the personnel details.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {[['first_name','First Name'],['middle_name','Middle Name'],['last_name','Last Name']].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">{label}{key !== 'middle_name' && <span className="text-red-400 ml-0.5">*</span>}</Label>
                <Input value={(newForm as any)[key]} onChange={e => setNewForm(p => ({ ...p, [key]: e.target.value }))} className="h-9 text-sm" />
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setNewDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={() => {
              if (!newForm.first_name || !newForm.last_name) { toast.error('First and last name required.'); return; }
              setConfirmCreateOpen(true);
            }}>Create</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold">Edit Personnel</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">Update the personnel details.</DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {[['first_name','First Name'],['middle_name','Middle Name'],['last_name','Last Name']].map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">{label}</Label>
                <Input value={(editForm as any)[key]} onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))} className="h-9 text-sm" />
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setEditDialogOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={() => setConfirmUpdateOpen(true)}>Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Create personnel record?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">A new personnel entry will be added.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleConfirmCreate}>Create</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmUpdateOpen} onOpenChange={setConfirmUpdateOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Save changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">The personnel record will be updated.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild><Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleConfirmUpdate}>Save</Button></AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ExcelUploadModal isOpen={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload Personnel" entityName="personnel" confirmationDescription="These personnel records will be bulk-inserted." parseRow={parsePersonnelRow} requiredColumns={['first_name','middle_name','last_name']} onSave={savePersonnels} headerRowsToSkip={1} duplicateChecker={duplicateChecker} />
    </div>
  );
};

export default PersonnelPage;