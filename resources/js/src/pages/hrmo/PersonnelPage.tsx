import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Label } from '@/src/components/ui/label';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from "@/src/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem,
  PaginationLink, PaginationNext, PaginationPrevious,
} from "@/src/components/ui/pagination";
import {
  PlusIcon, MagnifyingGlassIcon, XMarkIcon,
  PencilSquareIcon,
} from "@heroicons/react/24/outline";
import { ExcelUploadModal } from './ExcelUploadModal';
import { LoadingState } from '../common/LoadingState';
import { useDebounce } from '../../hooks/useDebounce';
import API from '../../services/api';
import { cn } from '@/src/lib/utils';

// ─── Constants ─────────────────────────────────────────────────────────────────

const ITEMS_PER_PAGE = 10;

// ─── Types ─────────────────────────────────────────────────────────────────────

interface Department {
  dept_id: number;
  dept_name: string;
  dept_abbreviation: string | null;
  logo: string | null;
}

// ─── Department Logo ────────────────────────────────────────────────────────────
// logo path is stored as e.g. "departments/filename.jpg" served from /storage/

const DeptLogo = ({ dept }: { dept: Department }) => {
  const [imgError, setImgError] = useState(false);

  if (dept.logo && !imgError) {
    return (
      <div className="flex items-center gap-2">
        <img
          src={`/storage/${dept.logo}`}
          alt={dept.dept_abbreviation || dept.dept_name}
          onError={() => setImgError(true)}
          className="w-6 h-6 rounded object-contain shrink-0 border border-gray-100"
        />
        <span className="text-gray-700 text-[12px]">
          {dept.dept_abbreviation || dept.dept_name}
        </span>
      </div>
    );
  }

  // No logo or broken image — show a lettered avatar fallback
  const initials = dept.dept_abbreviation
    ? dept.dept_abbreviation.slice(0, 2).toUpperCase()
    : dept.dept_name.slice(0, 2).toUpperCase();

  return (
    <div className="flex items-center gap-2">
      <div className="w-6 h-6 rounded bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
        <span className="text-[8px] font-bold text-gray-400 leading-none">{initials}</span>
      </div>
      <span className="text-gray-700 text-[12px]">
        {dept.dept_abbreviation || dept.dept_name}
      </span>
    </div>
  );
};

interface PlantillaPosition {
  plantilla_position_id: number;
  position_title: string;
  salary_grade: number;
  dept_id: number;
}

interface PlantillaAssignment {
  assignment_id: number;
  plantilla_position_id: number;
  personnel_id: number | null;
  plantilla_position?: PlantillaPosition & { department?: Department };
}

interface Personnel {
  personnel_id: number;
  first_name: string;
  middle_name?: string | null;
  last_name: string;
  // enriched client-side from assignments
  assignment?: PlantillaAssignment | null;
}

type AssignmentFilter = 'all' | 'assigned' | 'unassigned';

interface ContextMenuState {
  x: number;
  y: number;
  personnel: Personnel;
}

// ─── Sort Icon ─────────────────────────────────────────────────────────────────

const SortIcon = ({ dir }: { dir: 'asc' | 'desc' }) => (
  <span className="ml-1 text-[10px] leading-none text-gray-700">
    {dir === 'asc' ? '↑' : '↓'}
  </span>
);

// ─── Component ─────────────────────────────────────────────────────────────────

const PersonnelPage: React.FC = () => {
  const [personnels, setPersonnels]       = useState<Personnel[]>([]);
  const [departments, setDepartments]     = useState<Department[]>([]);
  const [loading, setLoading]             = useState(true);
  const [uploadOpen, setUploadOpen]       = useState(false);
  const [existingNames, setExistingNames] = useState<Set<string>>(new Set());

  // ── Search / Sort / Page ───────────────────────────────────────────────────
  const [searchRaw, setSearchRaw]           = useState('');
  const debouncedSearch                     = useDebounce(searchRaw, 300);
  const [sortOrder, setSortOrder]           = useState<'asc' | 'desc'>('asc');
  const [currentPage, setCurrentPage]       = useState(1);

  // ── Filters ────────────────────────────────────────────────────────────────
  const [deptFilter, setDeptFilter]         = useState<number | 'all'>('all');
  const [assignFilter, setAssignFilter]     = useState<AssignmentFilter>('all');

  // ── Context menu ───────────────────────────────────────────────────────────
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef                = useRef<HTMLDivElement>(null);

  // ── Create dialog ──────────────────────────────────────────────────────────
  const [newDialogOpen, setNewDialogOpen]         = useState(false);
  const [newForm, setNewForm]                     = useState({ first_name: '', middle_name: '', last_name: '' });
  const [confirmCreateOpen, setConfirmCreateOpen] = useState(false);

  // ── Edit dialog ────────────────────────────────────────────────────────────
  const [editDialogOpen, setEditDialogOpen]       = useState(false);
  const [editingPersonnel, setEditingPersonnel]   = useState<Personnel | null>(null);
  const [editForm, setEditForm]                   = useState({ first_name: '', middle_name: '', last_name: '' });
  const [confirmUpdateOpen, setConfirmUpdateOpen] = useState(false);

  // ── Close ctx menu on outside click ───────────────────────────────────────
  useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctxMenu]);

  // ── Fetch ──────────────────────────────────────────────────────────────────

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [personnelRes, assignmentRes, deptRes] = await Promise.all([
        API.get('/personnels'),
        // include plantilla_position and its department so we get full data
        API.get('/plantilla-assignments?include=plantilla_position.department'),
        API.get('/departments'),
      ]);

      const rawPersonnels: Personnel[] = personnelRes.data.data || [];
      const rawAssignments: PlantillaAssignment[] = assignmentRes.data.data || [];
      const rawDepts: Department[] = deptRes.data.data || [];

      // Build a map: personnel_id → assignment (only where personnel_id is set)
      const assignmentByPersonnel = new Map<number, PlantillaAssignment>();
      rawAssignments.forEach(a => {
        if (a.personnel_id != null) {
          assignmentByPersonnel.set(a.personnel_id, a);
        }
      });

      // Enrich personnels with their assignment
      const enriched = rawPersonnels.map(p => ({
        ...p,
        assignment: assignmentByPersonnel.get(p.personnel_id) ?? null,
      }));

      setPersonnels(enriched);
      setDepartments(rawDepts);

      const names = new Set<string>();
      enriched.forEach(p => {
        names.add(
          `${p.last_name?.trim().toLowerCase()}|${p.first_name?.trim().toLowerCase()}|${(p.middle_name?.trim() || '').toLowerCase()}`
        );
      });
      setExistingNames(names);
      setCurrentPage(1);
    } catch {
      toast.error('Failed to load personnel.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);
  useEffect(() => { setCurrentPage(1); }, [debouncedSearch, deptFilter, assignFilter]);

  // ── Filter / Sort ──────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    let list = personnels;

    // Text search
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(p =>
        p.first_name?.toLowerCase().includes(q) ||
        p.middle_name?.toLowerCase().includes(q) ||
        p.last_name?.toLowerCase().includes(q)
      );
    }

    // Assignment filter
    if (assignFilter === 'assigned') {
      list = list.filter(p => p.assignment != null);
    } else if (assignFilter === 'unassigned') {
      list = list.filter(p => p.assignment == null);
    }

    // Department filter (only meaningful for assigned personnel)
    if (deptFilter !== 'all') {
      list = list.filter(p => {
        const deptId = p.assignment?.plantilla_position?.dept_id;
        return deptId === deptFilter;
      });
    }

    return list;
  }, [personnels, debouncedSearch, assignFilter, deptFilter]);

  const sorted = useMemo(() =>
    [...filtered].sort((a, b) => {
      const av = a.last_name?.toLowerCase() || '';
      const bv = b.last_name?.toLowerCase() || '';
      return sortOrder === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av);
    }),
  [filtered, sortOrder]);

  const totalPages = Math.max(1, Math.ceil(sorted.length / ITEMS_PER_PAGE));
  const paginated  = useMemo(
    () => sorted.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE),
    [sorted, currentPage]
  );

  const isSearching   = debouncedSearch.trim().length > 0;
  const isFiltering   = deptFilter !== 'all' || assignFilter !== 'all';
  const isAnyFilter   = isSearching || isFiltering;

  // Stats
  const assignedCount   = useMemo(() => personnels.filter(p => p.assignment != null).length, [personnels]);
  const unassignedCount = personnels.length - assignedCount;

  // ── Pagination numbers ─────────────────────────────────────────────────────

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (currentPage > 3) pages.push('ellipsis');
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) pages.push(p);
    if (currentPage < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  // ── Row click → context menu ───────────────────────────────────────────────

  const handleRowClick = (e: React.MouseEvent, personnel: Personnel) => {
    e.preventDefault();
    const MENU_W = 175, MENU_H = 80;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, personnel });
  };

  // ── Edit ───────────────────────────────────────────────────────────────────

  const openEdit = (p: Personnel) => {
    setCtxMenu(null);
    setEditingPersonnel(p);
    setEditForm({ first_name: p.first_name, middle_name: p.middle_name || '', last_name: p.last_name });
    setEditDialogOpen(true);
  };

  // ── Create ─────────────────────────────────────────────────────────────────

  const handleConfirmCreate = async () => {
    setConfirmCreateOpen(false);
    try {
      await API.post('/personnels', newForm);
      toast.success('Personnel created.');
      fetchAll();
      setNewDialogOpen(false);
      setNewForm({ first_name: '', middle_name: '', last_name: '' });
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to create personnel.');
    }
  };

  // ── Update ─────────────────────────────────────────────────────────────────

  const handleConfirmUpdate = async () => {
    setConfirmUpdateOpen(false);
    if (!editingPersonnel) return;
    try {
      await API.put(`/personnels/${editingPersonnel.personnel_id}`, editForm);
      toast.success('Personnel updated.');
      fetchAll();
      setEditDialogOpen(false);
      setEditingPersonnel(null);
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to update personnel.');
    }
  };

  // ── Excel upload helpers ───────────────────────────────────────────────────

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
    toast.success(`Uploaded ${data.length} personnel.`);
    fetchAll();
    setUploadOpen(false);
  };

  // ── Clear all filters ──────────────────────────────────────────────────────

  const clearFilters = () => {
    setSearchRaw('');
    setDeptFilter('all');
    setAssignFilter('all');
    setCurrentPage(1);
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return <LoadingState />;

  return (
    <div className="p-6 relative">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            HR Management
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            Personnel
          </h1>
          <p className="text-xs text-gray-400 mt-1">
            Manage personnel records and employee information.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={() => setUploadOpen(true)}
            className="gap-1.5 text-xs h-8 border-gray-200 text-gray-600"
          >
            Upload Excel
          </Button>
          <Button
            size="sm"
            onClick={() => setNewDialogOpen(true)}
            className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
          >
            <PlusIcon className="w-3.5 h-3.5" />
            New Personnel
          </Button>
        </div>
      </div>

      {/* ── Stats chips ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="inline-flex items-center gap-1.5 text-[11px] text-gray-500 bg-gray-100 rounded-full px-2.5 py-1">
          <span className="font-semibold text-gray-700">{personnels.length}</span> total
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span className="font-semibold">{assignedCount}</span> assigned
        </span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2.5 py-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
          <span className="font-semibold">{unassignedCount}</span> unassigned
        </span>
      </div>

      {/* ── Search + Filters ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">

        {/* Search */}
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchRaw}
            onChange={e => { setSearchRaw(e.target.value); setCurrentPage(1); }}
            placeholder="Search by name…"
            className="pl-8 pr-8 h-8 text-xs border-gray-200 bg-white"
          />
          {isSearching && (
            <button
              onClick={() => { setSearchRaw(''); setCurrentPage(1); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Assignment status filter */}
        <div className="flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden h-8">
          {(['all', 'assigned', 'unassigned'] as AssignmentFilter[]).map(val => (
            <button
              key={val}
              onClick={() => { setAssignFilter(val); setCurrentPage(1); }}
              className={cn(
                'px-3 text-[11px] font-medium h-full transition-colors border-r border-gray-200 last:border-r-0',
                assignFilter === val
                  ? 'bg-gray-900 text-white'
                  : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
              )}
            >
              {val === 'all' ? 'All' : val === 'assigned' ? 'Assigned' : 'Unassigned'}
            </button>
          ))}
        </div>

        {/* Department filter */}
        <select
          value={deptFilter === 'all' ? 'all' : String(deptFilter)}
          onChange={e => { setDeptFilter(e.target.value === 'all' ? 'all' : Number(e.target.value)); setCurrentPage(1); }}
          className="h-8 text-xs border border-gray-200 rounded-lg bg-white px-2 pr-7 text-gray-600 focus:outline-none focus:ring-1 focus:ring-gray-300 max-w-[180px] cursor-pointer"
        >
          <option value="all">All Departments</option>
          {departments.map(d => (
            <option key={d.dept_id} value={String(d.dept_id)}>
              {d.dept_abbreviation || d.dept_name}
            </option>
          ))}
        </select>

        {/* Clear filters */}
        {isAnyFilter && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
          >
            <XMarkIcon className="w-3 h-3" />
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="text-[11px] text-gray-400 ml-auto">
          {isAnyFilter ? (
            <><span className="font-medium text-gray-600">{sorted.length}</span> of <span className="font-medium text-gray-600">{personnels.length}</span> records</>
          ) : (
            <><span className="font-medium text-gray-600">{personnels.length}</span> record{personnels.length !== 1 ? 's' : ''}</>
          )}
        </span>
      </div>

      {/* ── Hint ── */}
      <div className="mb-4">
        <span className="text-[10px] text-gray-400 italic hidden sm:block">
          Click a row to edit
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {sorted.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isAnyFilter ? (
              <>
                No personnel match the current filters.{' '}
                <button onClick={clearFilters} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                No personnel records yet.{' '}
                <button onClick={() => setNewDialogOpen(true)} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Add the first one
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-[12px] border-collapse min-w-[640px]">
                <thead>
                  <tr>
                    <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                      First Name
                    </th>
                    <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                      Middle Name
                    </th>
                    <th
                      className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer select-none hover:bg-gray-50 transition-colors"
                      onClick={() => { setSortOrder(o => o === 'asc' ? 'desc' : 'asc'); setCurrentPage(1); }}
                    >
                      Last Name <SortIcon dir={sortOrder} />
                    </th>
                    <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                      Department
                    </th>
                    <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                      Position
                    </th>
                    <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left align-bottom font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginated.map(p => {
                    const dept     = p.assignment?.plantilla_position?.department;
                    const position = p.assignment?.plantilla_position;
                    const assigned = p.assignment != null;

                    return (
                      <tr
                        key={p.personnel_id}
                        onClick={e => handleRowClick(e, p)}
                        onContextMenu={e => { e.preventDefault(); handleRowClick(e, p); }}
                        className="hover:bg-gray-50/80 transition-colors cursor-pointer select-none"
                      >
                        <td className="px-4 py-3 text-gray-900">{p.first_name}</td>
                        <td className="px-4 py-3 text-gray-500">{p.middle_name || '–'}</td>
                        <td className="px-4 py-3 font-medium text-gray-900">{p.last_name}</td>

                        {/* Department — nullable, shows logo */}
                        <td className="px-4 py-3">
                          {dept ? (
                            <DeptLogo dept={dept} />
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Position — nullable */}
                        <td className="px-4 py-3">
                          {position ? (
                            <span className="text-gray-700">{position.position_title}</span>
                          ) : (
                            <span className="text-gray-300 text-[11px]">—</span>
                          )}
                        </td>

                        {/* Assignment status badge */}
                        <td className="px-4 py-3">
                          {assigned ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-full px-2 py-0.5">
                              <span className="w-1 h-1 rounded-full bg-emerald-400" />
                              Assigned
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-100 rounded-full px-2 py-0.5">
                              <span className="w-1 h-1 rounded-full bg-amber-400" />
                              Unassigned
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing{' '}
                  <span className="font-medium text-gray-600">
                    {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, sorted.length)}
                  </span>{' '}
                  of <span className="font-medium text-gray-600">{sorted.length}</span>
                </p>
                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        className={cn('h-7 px-2 text-[11px] rounded-md cursor-pointer', currentPage === 1 && 'pointer-events-none opacity-40')}
                      />
                    </PaginationItem>
                    {getPageNumbers().map((p, i) =>
                      p === 'ellipsis' ? (
                        <PaginationItem key={`e-${i}`}>
                          <PaginationEllipsis className="h-7 w-7 text-[11px]" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            onClick={() => setCurrentPage(p as number)}
                            isActive={currentPage === p}
                            className={cn(
                              'h-7 w-7 text-[11px] rounded-md cursor-pointer',
                              currentPage === p ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900' : 'text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}
                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        className={cn('h-7 px-2 text-[11px] rounded-md cursor-pointer', currentPage === totalPages && 'pointer-events-none opacity-40')}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Context Menu ── */}
      {ctxMenu && (
        <div
          ref={ctxRef}
          style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[175px] overflow-hidden"
        >
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[155px]">
              {ctxMenu.personnel.last_name}, {ctxMenu.personnel.first_name}
            </p>
          </div>
          <button
            onClick={() => openEdit(ctxMenu.personnel)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilSquareIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Personnel
          </button>
        </div>
      )}

      {/* ════════ New Personnel Dialog ════════ */}
      <Dialog open={newDialogOpen} onOpenChange={setNewDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">New Personnel</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              Enter the personnel details.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {(['first_name', 'middle_name', 'last_name'] as const).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  {key === 'first_name' ? 'First Name' : key === 'middle_name' ? 'Middle Name' : 'Last Name'}
                  {key !== 'middle_name' && <span className="text-red-400 ml-0.5">*</span>}
                </Label>
                <Input
                  value={newForm[key]}
                  onChange={e => setNewForm(p => ({ ...p, [key]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setNewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
              onClick={() => {
                if (!newForm.first_name || !newForm.last_name) { toast.error('First and last name are required.'); return; }
                setConfirmCreateOpen(true);
              }}
            >
              Create
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════ Edit Personnel Dialog ════════ */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">Edit Personnel</DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              Update the personnel details.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-5 space-y-4">
            {(['first_name', 'middle_name', 'last_name'] as const).map((key) => (
              <div key={key} className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">
                  {key === 'first_name' ? 'First Name' : key === 'middle_name' ? 'Middle Name' : 'Last Name'}
                </Label>
                <Input
                  value={editForm[key]}
                  onChange={e => setEditForm(p => ({ ...p, [key]: e.target.value }))}
                  className="h-9 text-sm"
                />
              </div>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={() => setConfirmUpdateOpen(true)}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* ════════ Confirm Create ════════ */}
      <AlertDialog open={confirmCreateOpen} onOpenChange={setConfirmCreateOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Create personnel record?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              A new personnel entry will be added to the system.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleConfirmCreate}>Create</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════ Confirm Update ════════ */}
      <AlertDialog open={confirmUpdateOpen} onOpenChange={setConfirmUpdateOpen}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Save changes?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              The personnel record will be updated.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800" onClick={handleConfirmUpdate}>Save</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════ Excel Upload ════════ */}
      <ExcelUploadModal
        isOpen={uploadOpen}
        onClose={() => setUploadOpen(false)}
        title="Upload Personnel"
        entityName="personnel"
        confirmationDescription="These personnel records will be bulk-inserted."
        parseRow={parsePersonnelRow}
        requiredColumns={['first_name', 'middle_name', 'last_name']}
        onSave={savePersonnels}
        headerRowsToSkip={1}
        duplicateChecker={duplicateChecker}
      />
    </div>
  );
};

export default PersonnelPage;
