import React, { useState, useEffect, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import API from '../../services/api';
import { Department } from '../../types/api';
import { useDebounce } from '../../hooks/useDebounce';
import { LoadingState } from '../common/LoadingState';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../../components/ui/alert-dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../components/ui/dropdown-menu';
import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from '../../components/ui/pagination';
import { Avatar, AvatarFallback, AvatarImage } from '../../components/ui/avatar';
import { Badge } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import { MoreHorizontalIcon } from 'lucide-react';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  XMarkIcon,
  FunnelIcon,
  KeyIcon,
  ChevronUpDownIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/src/lib/utils';

// ─── Constants ────────────────────────────────────────────────────────────────

const PER_PAGE = 10;

const ROLE_OPTIONS = [
  { value: 'admin',           label: 'Budget Officer' },
  { value: 'department-head', label: 'Department Head' },
  { value: 'admin-hrmo',      label: 'HRMO' },
  // super-admin intentionally omitted — only creatable at DB level
] as const;

const ROLE_BADGE: Record<string, string> = {
  'super-admin':     'text-violet-700 bg-violet-50 border-violet-200',
  'admin':           'text-blue-700 bg-blue-50 border-blue-200',
  'department-head': 'text-emerald-700 bg-emerald-50 border-emerald-200',
  'admin-hrmo':      'text-orange-700 bg-orange-50 border-orange-200',
};

const ROLE_LABEL: Record<string, string> = {
  'super-admin':     'Super Admin',
  'admin':           'Budget Officer',
//   'department-head': 'Dept. Head',
'department-head': 'Department Head',
  'admin-hrmo':      'HRMO',
};

// ─── Types ────────────────────────────────────────────────────────────────────

interface UserRecord {
  user_id:    number;
  username:   string;
  fname:      string;
  mname:      string | null;
  lname:      string;
  avatar:     string | null;
  role:       string;
  dept_id:    number | null;
  is_online:  boolean;
  is_active:  boolean;
  department: Department | null;
}

type SortField = 'name' | 'role' | 'status';
type SortDir   = 'asc' | 'desc';
type StatusFilter = 'all' | 'active' | 'inactive';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getInitials = (u: UserRecord) =>
  `${u.fname.charAt(0)}${u.lname.charAt(0)}`.toUpperCase();

function highlightMatch(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase().trim());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-yellow-100 text-yellow-900 rounded-[2px] px-0.5">
        {text.slice(idx, idx + query.trim().length)}
      </mark>
      {text.slice(idx + query.trim().length)}
    </>
  );
}

// ─── Empty form states ────────────────────────────────────────────────────────

const emptyUserForm = () => ({
  fname:    '',
  mname:    '',
  lname:    '',
  username: '',
  role:     '' as string,
//   dept_id:  '' as string,
  dept_id: 'none',
  password: '',
  password_confirmation: '',
  is_active: true,
});

const emptyPwForm = () => ({
  password:              '',
  password_confirmation: '',
});

// ─── Component ────────────────────────────────────────────────────────────────

const UserAccountPage: React.FC = () => {
  const [users,       setUsers]       = useState<UserRecord[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading,     setLoading]     = useState(true);

  // ── Search ────────────────────────────────────────────────────────────────
  const [searchRaw,     setSearchRaw]     = useState('');
  const debouncedSearch                   = useDebounce(searchRaw, 250);

  // ── Filters & Sort ────────────────────────────────────────────────────────
  const [statusFilter,  setStatusFilter]  = useState<StatusFilter>('all');
  const [roleFilter,    setRoleFilter]    = useState<string>('all');
  const [sortField,     setSortField]     = useState<SortField>('name');
  const [sortDir,       setSortDir]       = useState<SortDir>('asc');

  // ── Pagination ────────────────────────────────────────────────────────────
  const [page, setPage] = useState(1);

  // ── Create/Edit modal ─────────────────────────────────────────────────────
  const [modalOpen,    setModalOpen]    = useState(false);
  const [editingUser,  setEditingUser]  = useState<UserRecord | null>(null);
  const [form,         setForm]         = useState(emptyUserForm());
  const [formErrors,   setFormErrors]   = useState<Record<string, string>>({});
  const [submitting,   setSubmitting]   = useState(false);

  // ── Change password modal ─────────────────────────────────────────────────
  const [pwModalOpen,  setPwModalOpen]  = useState(false);
  const [pwTarget,     setPwTarget]     = useState<UserRecord | null>(null);
  const [pwForm,       setPwForm]       = useState(emptyPwForm());
  const [pwErrors,     setPwErrors]     = useState<Record<string, string>>({});
  const [pwSubmitting, setPwSubmitting] = useState(false);

  // ── Toggle active confirm ─────────────────────────────────────────────────
  const [toggleTarget, setToggleTarget] = useState<UserRecord | null>(null);
  const [toggling,     setToggling]     = useState(false);

  // ── Delete confirm ────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<UserRecord | null>(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    try {
      const [usersRes, deptsRes] = await Promise.all([
        API.get('/users'),
        API.get('/departments'),
      ]);
      setUsers(usersRes.data.data ?? []);
      setDepartments(deptsRes.data.data ?? []);
    } catch {
      toast.error('Failed to load users.');
    } finally {
      setLoading(false);
    }
  };

  // ── Filtered + sorted + searched list ────────────────────────────────────

  const processed = useMemo(() => {
    let list = [...users];

    // Status filter
    if (statusFilter === 'active')   list = list.filter(u => u.is_active);
    if (statusFilter === 'inactive') list = list.filter(u => !u.is_active);

    // Role filter
    if (roleFilter !== 'all') list = list.filter(u => u.role === roleFilter);

    // Search
    const q = debouncedSearch.trim().toLowerCase();
    if (q) {
      list = list.filter(u =>
        u.fname.toLowerCase().includes(q)     ||
        u.lname.toLowerCase().includes(q)     ||
        u.username.toLowerCase().includes(q)  ||
        (u.mname ?? '').toLowerCase().includes(q) ||
        (u.department?.dept_name ?? '').toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'name') {
        cmp = `${a.lname}${a.fname}`.localeCompare(`${b.lname}${b.fname}`);
      } else if (sortField === 'role') {
        cmp = (ROLE_LABEL[a.role] ?? a.role).localeCompare(ROLE_LABEL[b.role] ?? b.role);
      } else if (sortField === 'status') {
        // active first = asc
        cmp = Number(b.is_active) - Number(a.is_active);
      }
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [users, statusFilter, roleFilter, debouncedSearch, sortField, sortDir]);

  // Reset to page 1 when filters change
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, roleFilter, sortField, sortDir]);

  // ── Pagination ────────────────────────────────────────────────────────────

  const totalPages = Math.max(1, Math.ceil(processed.length / PER_PAGE));
  const paginated  = processed.slice((page - 1) * PER_PAGE, page * PER_PAGE);

  const getPageNumbers = (): (number | 'ellipsis')[] => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const pages: (number | 'ellipsis')[] = [1];
    if (page > 3)              pages.push('ellipsis');
    for (let p = Math.max(2, page - 1); p <= Math.min(totalPages - 1, page + 1); p++) {
      pages.push(p);
    }
    if (page < totalPages - 2) pages.push('ellipsis');
    pages.push(totalPages);
    return pages;
  };

  // ── Sort toggle ───────────────────────────────────────────────────────────

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIndicator = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUpDownIcon className="w-3 h-3 text-gray-300 inline ml-1" />;
    return (
      <span className="inline ml-1 text-gray-600">
        {sortDir === 'asc' ? '↑' : '↓'}
      </span>
    );
  };

  // ── Open modals ───────────────────────────────────────────────────────────

  const openCreate = () => {
    setEditingUser(null);
    setForm(emptyUserForm());
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (u: UserRecord) => {
    setEditingUser(u);
    setForm({
      fname:    u.fname,
      mname:    u.mname ?? '',
      lname:    u.lname,
      username: u.username,
      role:     u.role,
    //   dept_id:  u.dept_id?.toString() ?? '',
      dept_id: u.dept_id?.toString() ?? 'none',
      password: '',
      password_confirmation: '',
      is_active: u.is_active,
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const openPasswordModal = (u: UserRecord) => {
    setPwTarget(u);
    setPwForm(emptyPwForm());
    setPwErrors({});
    setPwModalOpen(true);
  };

  // ── Submit user (create/edit) ─────────────────────────────────────────────

  const handleSubmit = async () => {
    setFormErrors({});

    // Basic validation
    const errs: Record<string, string> = {};
    if (!form.fname.trim())    errs.fname    = 'First name is required.';
    if (!form.lname.trim())    errs.lname    = 'Last name is required.';
    if (!form.username.trim()) errs.username = 'Username is required.';
    if (!form.role)            errs.role     = 'Role is required.';
    if (!editingUser && !form.password)
      errs.password = 'Password is required for new users.';
    if (!editingUser && form.password !== form.password_confirmation)
      errs.password_confirmation = 'Passwords do not match.';
    if (form.role === 'department-head' && !form.dept_id)
      errs.dept_id = 'Department is required for Department Head.';

    if (Object.keys(errs).length) { setFormErrors(errs); return; }

    setSubmitting(true);
    try {
      const payload: Record<string, any> = {
        fname:     form.fname,
        mname:     form.mname || null,
        lname:     form.lname,
        username:  form.username,
        role:      form.role,
        // dept_id:   form.dept_id || null,
        dept_id: (form.dept_id && form.dept_id !== 'none') ? form.dept_id : null,
        is_active: form.is_active,
      };
      if (!editingUser) {
        payload.password = form.password;
      }

      if (editingUser) {
        await API.put(`/users/${editingUser.user_id}`, payload);
        toast.success('User updated successfully.');
      } else {
        await API.post('/users', payload);
        toast.success('User created successfully.');
      }

      setModalOpen(false);
      fetchAll();
    } catch (err: any) {
      const laravelErrors = err?.response?.data?.errors ?? {};
      const mapped: Record<string, string> = {};
      Object.entries(laravelErrors).forEach(([k, v]) => {
        mapped[k] = Array.isArray(v) ? (v as string[])[0] : String(v);
      });
      if (Object.keys(mapped).length) {
        setFormErrors(mapped);
      } else {
        toast.error(err?.response?.data?.message ?? 'Failed to save user.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Change password ───────────────────────────────────────────────────────

  const handlePasswordChange = async () => {
    setPwErrors({});
    const errs: Record<string, string> = {};
    if (!pwForm.password)              errs.password              = 'New password is required.';
    if (pwForm.password.length < 6)    errs.password              = 'Password must be at least 6 characters.';
    if (!pwForm.password_confirmation) errs.password_confirmation = 'Please confirm the password.';
    if (pwForm.password && pwForm.password !== pwForm.password_confirmation)
      errs.password_confirmation = 'Passwords do not match.';
    if (Object.keys(errs).length) { setPwErrors(errs); return; }

    setPwSubmitting(true);
    try {
      await API.put(`/users/${pwTarget!.user_id}`, { password: pwForm.password });
      toast.success(`Password updated for ${pwTarget!.fname}.`);
      setPwModalOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to update password.');
    } finally {
      setPwSubmitting(false);
    }
  };

  // ── Toggle active ─────────────────────────────────────────────────────────

  const handleToggleActive = async () => {
    if (!toggleTarget) return;
    setToggling(true);
    try {
      await API.put(`/users/${toggleTarget.user_id}`, {
        is_active: !toggleTarget.is_active,
      });
      toast.success(
        toggleTarget.is_active
          ? `${toggleTarget.fname} has been deactivated.`
          : `${toggleTarget.fname} has been activated.`
      );
      setToggleTarget(null);
      fetchAll();
    } catch {
      toast.error('Failed to update status.');
    } finally {
      setToggling(false);
    }
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await API.delete(`/users/${deleteTarget.user_id}`);
      toast.success(`${deleteTarget.fname} ${deleteTarget.lname} deleted.`);
      setDeleteTarget(null);
      fetchAll();
    } catch {
      toast.error('Failed to delete user.');
    }
  };

  // ── Counts for summary pills ──────────────────────────────────────────────

  const counts = useMemo(() => ({
    total:    users.length,
    active:   users.filter(u => u.is_active).length,
    inactive: users.filter(u => !u.is_active).length,
  }), [users]);

  const isSearching = debouncedSearch.trim().length > 0;
  const isFiltered  = statusFilter !== 'all' || roleFilter !== 'all';

  // ── Render ────────────────────────────────────────────────────────────────

  if (loading && users.length === 0) return <LoadingState />;

  return (
    <div className="p-6">

      {/* ── Page Header ── */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <span className="text-[10px] font-semibold tracking-[0.12em] uppercase text-gray-400">
            Administration
          </span>
          <h1 className="text-2xl font-semibold text-gray-900 tracking-tight mt-0.5">
            User Accounts
          </h1>
        </div>
        <Button
          size="sm"
          onClick={openCreate}
          className="gap-1.5 text-xs h-8 bg-gray-900 hover:bg-gray-800 text-white"
        >
          <PlusIcon className="w-3.5 h-3.5" />
          Add User
        </Button>
      </div>

      {/* ── Summary pills ── */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-[11px] text-gray-500 font-medium">
          {counts.total} total
        </span>
        <span className="text-gray-200">·</span>
        <span className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full font-semibold">
          {counts.active} active
        </span>
        {counts.inactive > 0 && (
          <span className="text-[11px] text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full font-semibold">
            {counts.inactive} inactive
          </span>
        )}
      </div>

      {/* ── Search + Filter bar ── */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">

        {/* Search */}
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
          <Input
            value={searchRaw}
            onChange={e => { setSearchRaw(e.target.value); }}
            placeholder="Search by name or username…"
            className="pl-8 h-8 text-xs border-gray-200 bg-white"
          />
          {isSearching && (
            <button
              onClick={() => setSearchRaw('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-600 transition-colors"
            >
              <XMarkIcon className="w-3 h-3" />
            </button>
          )}
        </div>

        {/* Status filter */}
        <div className="flex items-center gap-2">
          <FunnelIcon className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
          <Select
            value={statusFilter}
            onValueChange={v => setStatusFilter(v as StatusFilter)}
          >
            <SelectTrigger className={cn('h-8 text-xs w-36 border-gray-200', statusFilter !== 'all' && 'border-gray-400 bg-gray-50')}>
              <SelectValue placeholder="All statuses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all"      className="text-xs">All statuses</SelectItem>
              <SelectItem value="active"   className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Role filter */}
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className={cn('h-8 text-xs w-40 border-gray-200', roleFilter !== 'all' && 'border-gray-400 bg-gray-50')}>
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="text-xs">All roles</SelectItem>
            {ROLE_OPTIONS.map(r => (
              <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
            ))}
            <SelectItem value="super-admin" className="text-xs">Super Admin</SelectItem>
          </SelectContent>
        </Select>

        {/* Clear filters */}
        {isFiltered && (
          <button
            onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }}
            className="flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-800 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1 transition-colors"
          >
            <XMarkIcon className="w-3 h-3" />
            Clear filters
          </button>
        )}

        {/* Result count */}
        <span className="text-[11px] text-gray-400 ml-auto">
          {isFiltered || isSearching ? (
            <>
              <span className="font-medium text-gray-600">{processed.length}</span> of{' '}
              <span className="font-medium text-gray-600">{users.length}</span> users
            </>
          ) : (
            <>
              <span className="font-medium text-gray-600">{users.length}</span> user
              {users.length !== 1 ? 's' : ''}
            </>
          )}
        </span>
      </div>

      {/* ── Table ── */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        {processed.length === 0 ? (
          <div className="text-center py-14 text-gray-400 text-sm">
            {isSearching ? (
              <>
                No users match{' '}
                <span className="font-medium text-gray-600">"{debouncedSearch}"</span>.{' '}
                <button onClick={() => setSearchRaw('')} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Clear search
                </button>
              </>
            ) : isFiltered ? (
              <>
                No users match the selected filters.{' '}
                <button onClick={() => { setStatusFilter('all'); setRoleFilter('all'); }} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Clear filters
                </button>
              </>
            ) : (
              <>
                No users yet.{' '}
                <button onClick={openCreate} className="text-gray-600 underline underline-offset-2 font-medium hover:text-gray-900">
                  Add the first one
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide w-12">
                    Avatar
                  </th>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer select-none hover:text-gray-900"
                    onClick={() => handleSort('name')}
                  >
                    Name <SortIndicator field="name" />
                  </th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide">
                    Username
                  </th>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer select-none hover:text-gray-900"
                    onClick={() => handleSort('role')}
                  >
                    Role <SortIndicator field="role" />
                  </th>
                  <th className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide hidden md:table-cell">
                    Department
                  </th>
                  <th
                    className="border-b border-gray-200 bg-white px-4 py-2.5 text-left font-semibold text-gray-600 text-[11px] uppercase tracking-wide cursor-pointer select-none hover:text-gray-900"
                    onClick={() => handleSort('status')}
                  >
                    Status <SortIndicator field="status" />
                  </th>
                  <th className="border-b border-gray-200 bg-white px-2 py-2.5 text-center w-12" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginated.map(u => {
                  const fullName = [u.fname, u.mname, u.lname].filter(Boolean).join(' ');
                  return (
                    <tr key={u.user_id} className={cn('hover:bg-gray-50/60 transition-colors', !u.is_active && 'opacity-60')}>

                      {/* Avatar */}
                      <td className="px-4 py-3">
                        <Avatar className="h-8 w-8 rounded-full border border-gray-100">
                          <AvatarImage
                            src={u.avatar ? `/storage/${u.avatar}` : undefined}
                            alt={fullName}
                          />
                          <AvatarFallback className="rounded-full bg-gray-100 text-gray-600 text-[10px] font-semibold">
                            {getInitials(u)}
                          </AvatarFallback>
                        </Avatar>
                      </td>

                      {/* Name */}
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {isSearching ? highlightMatch(fullName, debouncedSearch) : fullName}
                      </td>

                      {/* Username */}
                      <td className="px-4 py-3 text-gray-500 font-mono text-[11px]">
                        {isSearching
                          ? highlightMatch(u.username, debouncedSearch)
                          : u.username}
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={cn('text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5', ROLE_BADGE[u.role] ?? '')}
                        >
                          {ROLE_LABEL[u.role] ?? u.role}
                        </Badge>
                      </td>

                      {/* Department */}
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">
                        {u.department?.dept_abbreviation || u.department?.dept_name || (
                          <span className="text-gray-300">–</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex items-center gap-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full border',
                          u.is_active
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : 'text-red-600 bg-red-50 border-red-200'
                        )}>
                          <span className={cn('w-1.5 h-1.5 rounded-full', u.is_active ? 'bg-emerald-500' : 'bg-red-400')} />
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-2 py-2.5 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="size-7 text-gray-400 hover:text-gray-700">
                              <MoreHorizontalIcon className="w-4 h-4" />
                              <span className="sr-only">Open menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => openEdit(u)}>
                              Edit User
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPasswordModal(u)}>
                              <KeyIcon className="w-3.5 h-3.5 mr-2 text-gray-400" />
                              Change Password
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => setToggleTarget(u)}
                              className={u.is_active ? 'text-amber-600 focus:text-amber-600 focus:bg-amber-50' : 'text-emerald-600 focus:text-emerald-600 focus:bg-emerald-50'}
                            >
                              {u.is_active ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              onClick={() => setDeleteTarget(u)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                <p className="text-[11px] text-gray-400">
                  Showing{' '}
                  <span className="font-medium text-gray-600">
                    {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, processed.length)}
                  </span>{' '}
                  of{' '}
                  <span className="font-medium text-gray-600">{processed.length}</span>
                </p>

                <Pagination className="w-auto mx-0">
                  <PaginationContent className="gap-0.5">
                    <PaginationItem>
                      <PaginationPrevious
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className={cn('h-7 px-2 text-[11px] rounded-md cursor-pointer', page === 1 && 'pointer-events-none opacity-40')}
                      />
                    </PaginationItem>

                    {getPageNumbers().map((p, i) =>
                      p === 'ellipsis' ? (
                        <PaginationItem key={`ellipsis-${i}`}>
                          <PaginationEllipsis className="h-7 w-7 text-[11px]" />
                        </PaginationItem>
                      ) : (
                        <PaginationItem key={p}>
                          <PaginationLink
                            onClick={() => setPage(p)}
                            isActive={page === p}
                            className={cn(
                              'h-7 w-7 text-[11px] rounded-md cursor-pointer',
                              page === p ? 'bg-gray-900 text-white hover:bg-gray-800 border-gray-900' : 'text-gray-600 hover:bg-gray-50'
                            )}
                          >
                            {p}
                          </PaginationLink>
                        </PaginationItem>
                      )
                    )}

                    <PaginationItem>
                      <PaginationNext
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className={cn('h-7 px-2 text-[11px] rounded-md cursor-pointer', page === totalPages && 'pointer-events-none opacity-40')}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              </div>
            )}
          </>
        )}
      </div>

      {/* ════════ Create / Edit User Dialog ════════ */}
      <Dialog open={modalOpen} onOpenChange={open => { if (!open) setModalOpen(false); }}>
        <DialogContent className="max-w-2xl rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900">
              {editingUser ? 'Edit User' : 'Add User'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              {editingUser ? 'Update user account details.' : 'Fill in the details for the new user account.'}
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 max-h-[75vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-x-6 gap-y-4">

              {/* LEFT COLUMN */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    First Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={form.fname}
                    onChange={e => setForm(p => ({ ...p, fname: e.target.value }))}
                    placeholder="Juan"
                    className={cn('h-9 text-sm', formErrors.fname && 'border-red-400')}
                  />
                  {formErrors.fname && <p className="text-[11px] text-red-500">{formErrors.fname}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">Middle Name</Label>
                  <Input
                    value={form.mname}
                    onChange={e => setForm(p => ({ ...p, mname: e.target.value }))}
                    placeholder="Optional"
                    className="h-9 text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    Last Name <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={form.lname}
                    onChange={e => setForm(p => ({ ...p, lname: e.target.value }))}
                    placeholder="dela Cruz"
                    className={cn('h-9 text-sm', formErrors.lname && 'border-red-400')}
                  />
                  {formErrors.lname && <p className="text-[11px] text-red-500">{formErrors.lname}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    Username <span className="text-red-400">*</span>
                  </Label>
                  <Input
                    value={form.username}
                    onChange={e => setForm(p => ({ ...p, username: e.target.value }))}
                    placeholder="e.g. jdelacruz"
                    className={cn('h-9 text-sm font-mono', formErrors.username && 'border-red-400')}
                  />
                  {formErrors.username && <p className="text-[11px] text-red-500">{formErrors.username}</p>}
                </div>

                <div className="flex items-center justify-between bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
                  <div>
                    <p className="text-[13px] font-medium text-gray-800">Account Status</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {form.is_active ? 'User can log in.' : 'User cannot log in.'}
                    </p>
                  </div>
                  <Switch
                    checked={form.is_active}
                    onCheckedChange={v => setForm(p => ({ ...p, is_active: v }))}
                  />
                </div>
              </div>

              {/* RIGHT COLUMN */}
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    Role <span className="text-red-400">*</span>
                  </Label>
                  <Select
                    value={form.role}
                    onValueChange={v => setForm(p => ({ ...p, role: v, dept_id: v !== 'department-head' ? 'none' : p.dept_id }))}
                  >
                    <SelectTrigger className={cn('h-9 text-sm', formErrors.role && 'border-red-400')}>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROLE_OPTIONS.map(r => (
                        <SelectItem key={r.value} value={r.value} className="text-sm">{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.role && <p className="text-[11px] text-red-500">{formErrors.role}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-gray-600">
                    Department
                    {form.role === 'department-head' && <span className="text-red-400"> *</span>}
                  </Label>
                  <Select
                    value={form.dept_id}
                    onValueChange={v => setForm(p => ({ ...p, dept_id: v }))}
                  >
                    <SelectTrigger className={cn('h-9 text-sm', formErrors.dept_id && 'border-red-400')}>
                      <SelectValue placeholder="No department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none" className="text-sm text-gray-400">No department</SelectItem>
                      {departments.map(d => (
                        <SelectItem key={d.dept_id} value={d.dept_id.toString()} className="text-sm">
                          {d.dept_abbreviation ? `${d.dept_abbreviation} – ` : ''}{d.dept_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.dept_id && <p className="text-[11px] text-red-500">{formErrors.dept_id}</p>}
                </div>

                {!editingUser && (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">
                        Password <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        type="password"
                        value={form.password}
                        onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
                        placeholder="Min. 6 characters"
                        className={cn('h-9 text-sm', formErrors.password && 'border-red-400')}
                      />
                      {formErrors.password && <p className="text-[11px] text-red-500">{formErrors.password}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs font-semibold text-gray-600">
                        Confirm Password <span className="text-red-400">*</span>
                      </Label>
                      <Input
                        type="password"
                        value={form.password_confirmation}
                        onChange={e => setForm(p => ({ ...p, password_confirmation: e.target.value }))}
                        placeholder="Re-enter password"
                        className={cn('h-9 text-sm', formErrors.password_confirmation && 'border-red-400')}
                      />
                      {formErrors.password_confirmation && <p className="text-[11px] text-red-500">{formErrors.password_confirmation}</p>}
                    </div>
                  </>
                )}
              </div>

            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
              onClick={() => setModalOpen(false)} disabled={submitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
              onClick={handleSubmit} disabled={submitting}>
              {submitting
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving…</>
                : editingUser ? 'Update' : 'Create User'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ Change Password Dialog ════════ */}
      <Dialog open={pwModalOpen} onOpenChange={open => { if (!open) setPwModalOpen(false); }}>
        <DialogContent className="max-w-sm rounded-2xl border-gray-200 gap-0 p-0 overflow-hidden">
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-gray-100">
            <DialogTitle className="text-[15px] font-semibold text-gray-900 flex items-center gap-2">
              <KeyIcon className="w-4 h-4 text-gray-500" />
              Change Password
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400 mt-0.5">
              Set a new password for{' '}
              <span className="font-medium text-gray-700">
                {pwTarget?.fname} {pwTarget?.lname}
              </span>.
            </DialogDescription>
          </DialogHeader>

          <div className="px-6 py-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                New Password <span className="text-red-400">*</span>
              </Label>
              <Input
                type="password"
                value={pwForm.password}
                onChange={e => setPwForm(p => ({ ...p, password: e.target.value }))}
                placeholder="Min. 6 characters"
                className={cn('h-9 text-sm', pwErrors.password && 'border-red-400')}
              />
              {pwErrors.password && <p className="text-[11px] text-red-500">{pwErrors.password}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">
                Confirm Password <span className="text-red-400">*</span>
              </Label>
              <Input
                type="password"
                value={pwForm.password_confirmation}
                onChange={e => setPwForm(p => ({ ...p, password_confirmation: e.target.value }))}
                placeholder="Re-enter password"
                className={cn('h-9 text-sm', pwErrors.password_confirmation && 'border-red-400')}
              />
              {pwErrors.password_confirmation && <p className="text-[11px] text-red-500">{pwErrors.password_confirmation}</p>}
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-gray-100 gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200"
              onClick={() => setPwModalOpen(false)} disabled={pwSubmitting}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-gray-900 hover:bg-gray-800"
              onClick={handlePasswordChange} disabled={pwSubmitting}>
              {pwSubmitting
                ? <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Updating…</>
                : 'Update Password'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ════════ Toggle Active Confirm ════════ */}
      <AlertDialog open={!!toggleTarget} onOpenChange={o => { if (!o) setToggleTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">
              {toggleTarget?.is_active ? 'Deactivate account?' : 'Activate account?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              {toggleTarget?.is_active ? (
                <>
                  <span className="font-medium text-gray-700">
                    {toggleTarget?.fname} {toggleTarget?.lname}
                  </span>{' '}
                  will be deactivated and{' '}
                  <span className="font-medium text-gray-700">will no longer be able to log in</span>.
                </>
              ) : (
                <>
                  <span className="font-medium text-gray-700">
                    {toggleTarget?.fname} {toggleTarget?.lname}
                  </span>{' '}
                  will be re-activated and can log in again.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                size="sm"
                className={cn(
                  'h-8 text-xs',
                  toggleTarget?.is_active
                    ? 'bg-amber-600 hover:bg-amber-700 text-white'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                )}
                onClick={handleToggleActive}
                disabled={toggling}
              >
                {toggling ? (
                  <><span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Working…</>
                ) : toggleTarget?.is_active ? 'Deactivate' : 'Activate'}
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ════════ Delete Confirm ════════ */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-gray-200">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Delete user?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              <span className="font-medium text-gray-700">
                {deleteTarget?.fname} {deleteTarget?.lname}
              </span>{' '}
              will be permanently removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="h-8 text-xs border-gray-200">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700" onClick={handleDelete}>
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default UserAccountPage;
