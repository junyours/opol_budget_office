import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { AppNotification } from '@/src/types/notifications';
import { ScrollArea } from '@/src/components/ui/scroll-area';
import { Button } from '@/src/components/ui/button';
import { Separator } from '@/src/components/ui/separator';
import {
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

interface Props {
  notifications: AppNotification[];
  role:          string;
  markRead:      (id: string) => Promise<void>;
  markAllRead:   () => Promise<void>;
}

const TYPE_CFG = {
  budget_submitted: {
    icon: ClipboardDocumentListIcon, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', label: 'Submitted',
  },
  budget_approved: {
    icon: CheckCircleIcon, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600', label: 'Approved',
  },
  budget_returned: {
    icon: ArrowUturnLeftIcon, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', label: 'Returned',
  },
} as const;

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export const SidebarNotifications: React.FC<Props> = ({
  notifications, role, markRead, markAllRead,
}) => {
  const navigate = useNavigate();
  const isAdmin  = role === 'admin' || role === 'super-admin';

  if (notifications.length === 0) return null;

  const renderItem = (
    key: string,
    iconBg: string,
    iconColor: string,
    Icon: React.ElementType,
    title: string,
    message: string,
    createdAt: string,
    count: number | null,
    onClick: () => void,
    onDismiss: () => void,
  ) => (
    <div
      key={key}
      onClick={onClick}
      className="group flex items-start gap-2 rounded-lg px-2.5 py-2 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
    >
      <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', iconBg)}>
        <Icon className={cn('w-3.5 h-3.5', iconColor)} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <p className="text-[11px] font-semibold text-gray-800 leading-tight truncate">{title}</p>
          {count && count > 1 && (
            <span className="text-[9px] font-bold bg-gray-100 text-gray-600 rounded-full px-1.5 py-0.5 flex-shrink-0">
              ×{count}
            </span>
          )}
        </div>
        <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">{message}</p>
        <p className="text-[9px] text-gray-400 mt-0.5">{relTime(createdAt)}</p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        onClick={e => { e.stopPropagation(); onDismiss(); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 h-5 w-5"
      >
        <XMarkIcon className="w-3 h-3 text-gray-400 hover:text-gray-700" />
      </Button>
    </div>
  );

  // ── Admin view ────────────────────────────────────────────────────────────
  if (isAdmin) {
  const latest  = notifications[0];          // most recent
  const rest    = notifications.slice(1);    // everyone else
  const hasMore = rest.length > 0;

  const cfg  = TYPE_CFG[latest.type] ?? TYPE_CFG.budget_submitted;
  const Icon = cfg.icon;

  return (
    <div className="px-2 pb-2">
      <Separator className="mb-2" />
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Notifications</span>
        <Button variant="ghost" size="sm" onClick={markAllRead}
          className="text-[9px] text-gray-400 hover:text-gray-600 h-auto py-0 px-1">
          Clear all
        </Button>
      </div>

      <div className="flex flex-col gap-1">

        {/* Card 1 — latest specific */}
        <div
          onClick={() => { navigate('/admin/lbp-forms', { state: { deptId: latest.dept_id } }); markRead(latest.id); }}
          className="group flex items-start gap-2 rounded-lg px-2.5 py-2 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
        >
          <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', cfg.iconBg)}>
            <Icon className={cn('w-3.5 h-3.5', cfg.iconColor)} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-semibold text-gray-800 truncate leading-tight">
              ({latest.dept_abbreviation || 'Dept'})
            </p>
            <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
              {latest.message}
            </p>
            <p className="text-[9px] text-gray-400 mt-0.5">{relTime(latest.created_at)}</p>
          </div>
          <Button variant="ghost" size="icon"
            onClick={e => { e.stopPropagation(); markRead(latest.id); }}
            className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 h-5 w-5">
            <XMarkIcon className="w-3 h-3 text-gray-400 hover:text-gray-700" />
          </Button>
        </div>

        {/* Card 2 — combined rest */}
        {hasMore && (
          <div
            onClick={() => navigate('/admin/lbp-forms')}
            className="group flex items-start gap-2 rounded-lg px-2.5 py-2 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
          >
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5 bg-gray-100">
              <ClipboardDocumentListIcon className="w-3.5 h-3.5 text-gray-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold text-gray-800 leading-tight">
                +{rest.length} more {rest.length === 1 ? 'department' : 'departments'}
              </p>
              <p className="text-[10px] text-gray-500 leading-snug mt-0.5">
                submitted their budget proposals
              </p>
            </div>
            <Button variant="ghost" size="icon"
              onClick={e => { e.stopPropagation(); markAllRead(); }}
              className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5 h-5 w-5">
              <XMarkIcon className="w-3 h-3 text-gray-400 hover:text-gray-700" />
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

  // ── Dept head view ────────────────────────────────────────────────────────
  const grouped = notifications.reduce<Record<string, AppNotification[]>>((acc, n) => {
    (acc[n.type] = acc[n.type] ?? []).push(n);
    return acc;
  }, {});

  const groups  = Object.entries(grouped);
  const shown   = groups.slice(0, 3);
  const hasMore = groups.length > 3;

  return (
    <div className="px-2 pb-2">
      <Separator className="mb-2" />
      <div className="flex items-center justify-between px-1 mb-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-widest text-gray-400">Notifications</span>
        <Button variant="ghost" size="sm" onClick={markAllRead}
          className="text-[9px] text-gray-400 hover:text-gray-600 h-auto py-0 px-1">
          Clear all
        </Button>
      </div>
      <ScrollArea className="max-h-48">
        <div className="flex flex-col gap-1 pr-1">
          {shown.map(([type, group]) => {
            const cfg    = TYPE_CFG[type as keyof typeof TYPE_CFG] ?? TYPE_CFG.budget_approved;
            const latest = group[0];
            return renderItem(
              type, cfg.iconBg, cfg.iconColor, cfg.icon,
              cfg.label, latest.message, latest.created_at, group.length,
              () => { navigate(`/department-budget-plans/${latest.dept_budget_plan_id}`); group.forEach(n => markRead(n.id)); },
              () => group.forEach(n => markRead(n.id)),
            );
          })}
          {hasMore && (
            <Button variant="outline" size="sm" onClick={() => navigate('/department/budget-proposal')}
              className="w-full text-[10px] text-blue-600 border-dashed border-blue-200 hover:bg-blue-50 h-7 mt-1">
              View {groups.length - 3} more →
            </Button>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
