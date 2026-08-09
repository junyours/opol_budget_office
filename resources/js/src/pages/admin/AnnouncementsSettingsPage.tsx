import React, { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/src/components/ui/button';
import { Input } from '@/src/components/ui/input';
import { Textarea } from '@/src/components/ui/textarea';
import { Switch } from '@/src/components/ui/switch';
import { Label } from '@/src/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from '@/src/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/src/components/ui/select';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/src/components/ui/alert-dialog';
import {
  PlusIcon, PencilIcon, TrashIcon, Bars3Icon, MegaphoneIcon,
} from '@heroicons/react/24/outline';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { cn } from '@/src/lib/utils';
import { useDepartmentsLite } from '@/src/hooks/useDashboardQueries';
import { useIsMobile } from '@/src/hooks/use-mobile';
import {
  useDashboardAnnouncements,
  useCreateDashboardAnnouncement,
  useUpdateDashboardAnnouncement,
  useDeleteDashboardAnnouncement,
  useReorderDashboardAnnouncements,
  DashboardAnnouncement,
} from '@/src/hooks/useDashboardAnnouncements';

const TYPE_OPTIONS = [
  { value: 'announcement', label: 'Announcement' },
  { value: 'phase',        label: 'Budget Phase' },
  { value: 'schedule',     label: 'Schedule / Review Date' },
  { value: 'department',   label: 'Department Spotlight' },
];

const COLOR_OPTIONS = ['blue', 'emerald', 'amber', 'violet', 'rose', 'indigo'];
const ICON_OPTIONS  = ['megaphone', 'calendar', 'flag', 'bell', 'sparkles', 'clock', 'building'];

const BADGE_CLASSES: Record<string, string> = {
  blue: 'bg-blue-50 text-blue-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  violet: 'bg-violet-50 text-violet-600',
  rose: 'bg-rose-50 text-rose-600',
  indigo: 'bg-indigo-50 text-indigo-600',
};

const ItemTypes = { ANNOUNCEMENT_ROW: 'announcement_row' };

interface ContextMenuState {
  x: number;
  y: number;
  item: DashboardAnnouncement;
}

interface AnnouncementRowProps {
  item: DashboardAnnouncement;
  index: number;
  moveRow: (from: number, to: number) => void;
  onDropped: () => void;
  onRowClick: (e: React.MouseEvent, item: DashboardAnnouncement) => void;
  onToggleActive: (item: DashboardAnnouncement) => void;
}

const DraggableAnnouncementRow: React.FC<AnnouncementRowProps> = ({
  item, index, moveRow, onDropped, onRowClick, onToggleActive,
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  const [, drop] = useDrop({
    accept: ItemTypes.ANNOUNCEMENT_ROW,
    hover(dragItem: { index: number }) {
      if (!ref.current || dragItem.index === index) return;
      moveRow(dragItem.index, index);
      dragItem.index = index;
    },
    drop: () => onDropped(),
  });

  const [{ isDragging }, drag] = useDrag({
    type: ItemTypes.ANNOUNCEMENT_ROW,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      onClick={(e) => onRowClick(e, item)}
      onContextMenu={(e) => { e.preventDefault(); onRowClick(e, item); }}
      className={cn("p-3.5 flex items-center gap-3 cursor-pointer select-none hover:bg-gray-50/80 transition-colors", isDragging && "opacity-30")}
    >
      <Bars3Icon className="w-3.5 h-3.5 text-gray-300 flex-shrink-0 cursor-grab active:cursor-grabbing" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className={cn(
            "text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded",
            BADGE_CLASSES[item.accent_color] ?? BADGE_CLASSES.blue
          )}>
            {TYPE_OPTIONS.find(t => t.value === item.type)?.label}
          </span>
          {!item.is_active && (
            <span className="text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-100 text-gray-400">
              Hidden
            </span>
          )}
        </div>
        <p className="text-[13px] font-medium text-gray-800 truncate mt-0.5">{item.title}</p>
        {item.description && <p className="text-[11px] text-gray-400 truncate">{item.description}</p>}
      </div>

      <div data-toggle onClick={(e) => e.stopPropagation()}>
        <Switch checked={item.is_active} onCheckedChange={() => onToggleActive(item)} />
      </div>
    </div>
  );
};

const emptyForm = {
  type: 'announcement' as DashboardAnnouncement['type'],
  title: '',
  description: '',
  dept_id: null as number | null,
  accent_color: 'blue',
  icon: 'megaphone',
  event_date: '',
  is_active: true,
};

const AnnouncementsSettingsPage: React.FC = () => {
  const isMobile = useIsMobile();
  const { data: items = [], isLoading } = useDashboardAnnouncements(false);
  const { data: departments = [] } = useDepartmentsLite();

  const createMut  = useCreateDashboardAnnouncement();
  const updateMut  = useUpdateDashboardAnnouncement();
  const deleteMut  = useDeleteDashboardAnnouncement();
  const reorderMut = useReorderDashboardAnnouncements();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<DashboardAnnouncement | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [deleteTarget, setDeleteTarget] = useState<DashboardAnnouncement | null>(null);
  const [ctxMenu, setCtxMenu] = useState<ContextMenuState | null>(null);
  const ctxRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!ctxMenu) return;
    const handler = (e: MouseEvent) => {
      if (ctxRef.current && !ctxRef.current.contains(e.target as Node)) setCtxMenu(null);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [ctxMenu]);

  const handleRowClick = (e: React.MouseEvent, item: DashboardAnnouncement) => {
    if ((e.target as HTMLElement).closest('[data-toggle]')) return;
    e.preventDefault();
    const MENU_W = 170, MENU_H = 90;
    const x = e.clientX + MENU_W > window.innerWidth  ? e.clientX - MENU_W : e.clientX;
    const y = e.clientY + MENU_H > window.innerHeight ? e.clientY - MENU_H : e.clientY;
    setCtxMenu({ x, y, item });
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (item: DashboardAnnouncement) => {
    setEditing(item);
    setForm({
      type: item.type,
      title: item.title,
      description: item.description ?? '',
      dept_id: item.dept_id,
      accent_color: item.accent_color,
      icon: item.icon ?? 'megaphone',
      event_date: item.event_date ?? '',
      is_active: item.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.title.trim()) { toast.error('Title is required.'); return; }
    const payload = {
      ...form,
      description: form.description.trim() || null,
      event_date: form.event_date || null,
      dept_id: form.type === 'department' ? form.dept_id : null,
    };
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, ...payload });
        toast.success('Announcement updated.');
      } else {
        await createMut.mutateAsync(payload);
        toast.success('Announcement created.');
      }
      setDialogOpen(false);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to save.');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deleteMut.mutateAsync(deleteTarget.id);
      toast.success('Announcement removed.');
    } catch {
      toast.error('Failed to delete.');
    } finally {
      setDeleteTarget(null);
    }
  };

  const [localOrder, setLocalOrder] = useState<DashboardAnnouncement[]>(items);

  React.useEffect(() => { setLocalOrder(items); }, [items]);

  const moveRow = React.useCallback((from: number, to: number) => {
    setLocalOrder(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  const persistOrder = () => {
    const original = items.map(i => i.id);
    const next = localOrder.map(i => i.id);
    if (JSON.stringify(original) === JSON.stringify(next)) return;
    reorderMut.mutate(next);
  };

  const toggleActive = (item: DashboardAnnouncement) => {
    updateMut.mutate({ id: item.id, is_active: !item.is_active });
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-1">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-gray-400 mb-0.5">Dashboard Content</p>
          <h1 className="text-[18px] font-semibold text-gray-900">Dashboard Announcements</h1>
        </div>
        <Button size="sm" onClick={openCreate} className="h-8 text-xs gap-1.5 bg-gray-900 hover:bg-gray-800">
          <PlusIcon className="w-3.5 h-3.5" /> Add Announcement
        </Button>
      </div>
      <p className="text-[13px] text-gray-500 mb-6">
        These appear as a scrolling carousel at the top of the Admin, Department Head, and LDRRMO dashboards.
      </p>

      {isLoading ? (
        <div className="text-sm text-gray-400">Loading…</div>
      ) : items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 p-8 text-center text-sm text-gray-400">
          <MegaphoneIcon className="w-6 h-6 mx-auto mb-2 text-gray-300" />
          No announcements yet. Add one to populate the dashboard carousel.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100">
          <DndProvider backend={HTML5Backend}>
            {localOrder.map((item, i) => (
              <DraggableAnnouncementRow
                key={item.id}
                item={item}
                index={i}
                moveRow={moveRow}
                onDropped={persistOrder}
                onRowClick={handleRowClick}
                onToggleActive={toggleActive}
              />
            ))}
          </DndProvider>
        </div>
      )}

      {ctxMenu && (isMobile ? (
        <div className="fixed inset-0 z-[9999] flex items-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setCtxMenu(null)} />
          <div ref={ctxRef} className="relative w-full bg-white rounded-t-2xl shadow-2xl pb-[env(safe-area-inset-bottom)]">
            <div className="w-9 h-1 bg-gray-200 rounded-full mx-auto mt-2.5 mb-1" />
            <div className="px-4 py-3 border-b border-gray-100">
              <p className="text-[13px] font-semibold text-gray-900 truncate">{ctxMenu.item.title}</p>
            </div>
            <button
              onClick={() => { setCtxMenu(null); openEdit(ctxMenu.item); }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-[14px] text-gray-700 active:bg-gray-50 transition-colors"
            >
              <PencilIcon className="w-4 h-4 text-gray-400 shrink-0" />
              Edit Announcement
            </button>
            <button
              onClick={() => { setCtxMenu(null); setDeleteTarget(ctxMenu.item); }}
              className="flex items-center gap-3 w-full px-4 py-3.5 text-[14px] text-red-600 active:bg-red-50 transition-colors border-t border-gray-100"
            >
              <TrashIcon className="w-4 h-4 text-red-400 shrink-0" />
              Delete
            </button>
            <button
              onClick={() => setCtxMenu(null)}
              className="w-full px-4 py-3.5 text-[14px] font-medium text-gray-400 border-t border-gray-100 active:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div
          ref={ctxRef}
          style={{ position: 'fixed', top: ctxMenu.y, left: ctxMenu.x, zIndex: 9999 }}
          className="bg-white border border-gray-200 rounded-xl shadow-xl py-1.5 min-w-[170px] overflow-hidden"
        >
          <div className="absolute -top-[5px] left-4 w-2.5 h-2.5 bg-white border-l border-t border-gray-200 rotate-45" />
          <div className="px-3 py-1.5 border-b border-gray-100 mb-1">
            <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide truncate max-w-[150px]">
              {ctxMenu.item.title}
            </p>
          </div>
          <button
            onClick={() => { setCtxMenu(null); openEdit(ctxMenu.item); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <PencilIcon className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            Edit Announcement
          </button>
          <button
            onClick={() => { setCtxMenu(null); setDeleteTarget(ctxMenu.item); }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-[12px] text-red-600 hover:bg-red-50 transition-colors"
          >
            <TrashIcon className="w-3.5 h-3.5 text-red-400 shrink-0" />
            Delete
          </button>
        </div>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold">
              {editing ? 'Edit Announcement' : 'New Announcement'}
            </DialogTitle>
            <DialogDescription className="text-xs text-gray-400">
              Shown in the scrolling carousel at the top of dashboards.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3.5 py-1">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Type</Label>
              <Select value={form.type} onValueChange={(v) => setForm(f => ({ ...f, type: v as any }))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {form.type === 'department' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Department</Label>
                <Select value={form.dept_id ? String(form.dept_id) : ''} onValueChange={(v) => setForm(f => ({ ...f, dept_id: Number(v) }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select department" /></SelectTrigger>
                  <SelectContent>
                    {departments.map((d: any) => (
                      <SelectItem key={d.dept_id} value={String(d.dept_id)}>
                        {d.dept_abbreviation ?? d.dept_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Title <span className="text-red-400">*</span></Label>
              <Input value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Phase 1: Target Setting" className="h-9 text-sm" />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold text-gray-600">Description</Label>
              <Textarea value={form.description} onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="Short supporting detail" rows={2} className="text-sm resize-none" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Date (optional)</Label>
                <Input type="date" value={form.event_date} onChange={(e) => setForm(f => ({ ...f, event_date: e.target.value }))}
                  className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Accent Color</Label>
                <Select value={form.accent_color} onValueChange={(v) => setForm(f => ({ ...f, accent_color: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COLOR_OPTIONS.map(c => <SelectItem key={c} value={c} className="capitalize">{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {form.type !== 'department' && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-gray-600">Icon</Label>
                <Select value={form.icon} onValueChange={(v) => setForm(f => ({ ...f, icon: v }))}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ICON_OPTIONS.map(i => <SelectItem key={i} value={i} className="capitalize">{i}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <Label className="text-xs font-semibold text-gray-600">Visible on dashboards</Label>
              <Switch checked={form.is_active} onCheckedChange={(v) => setForm(f => ({ ...f, is_active: v }))} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDialogOpen(false)} className="h-8 text-xs">Cancel</Button>
            <Button size="sm" onClick={handleSave} disabled={createMut.isPending || updateMut.isPending}
              className="h-8 text-xs bg-gray-900 hover:bg-gray-800">
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-2xl max-w-sm">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold">Delete announcement?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-gray-500">
              "{deleteTarget?.title}" will be permanently removed from the dashboard carousel.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild><Button variant="outline" size="sm" className="h-8 text-xs">Cancel</Button></AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" onClick={handleDelete} className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white">
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AnnouncementsSettingsPage;
