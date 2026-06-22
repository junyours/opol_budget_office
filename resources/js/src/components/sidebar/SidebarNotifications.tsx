import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/src/lib/utils';
import { AppNotification } from '@/src/types/notifications';
import { Button } from '@/src/components/ui/button';
import { Separator } from '@/src/components/ui/separator';
import {
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentListIcon,
  XMarkIcon,
  EyeIcon,
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
  budget_under_review: {
    icon: EyeIcon, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600', label: 'Under Review',
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

const unread = notifications.filter(n => !n.read_at);
  if (unread.length === 0) return null;

  const latest = unread[0]; // most recent unread — auto-replaced when a newer one arrives
  const cfg    = TYPE_CFG[latest.type] ?? TYPE_CFG.budget_submitted;
  const Icon   = cfg.icon;

  const handleOpen = () => {
    if (isAdmin) {
      navigate('/admin/lbp-forms', { state: { deptId: latest.dept_id } });
    } else {
      navigate(`/department-budget-plans/${latest.dept_budget_plan_id}`);
    }
  };

  const title = isAdmin
    ? `(${latest.dept_abbreviation || 'Dept'})`
    : cfg.label;

  return (
    <div className="px-2 pb-2">
      <Separator className="mb-2" />

      <div
        onClick={handleOpen}
        className="group flex items-start gap-2 rounded-lg px-2.5 py-2 bg-white border border-gray-100 hover:border-gray-200 hover:bg-gray-50 cursor-pointer transition-all"
      >
        <div className={cn('w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5', cfg.iconBg)}>
          <Icon className={cn('w-3.5 h-3.5', cfg.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[11px] font-semibold text-gray-800 leading-tight truncate">
            {title}
          </p>
          <p className="text-[10px] text-gray-500 leading-snug mt-0.5 line-clamp-2">
            {latest.message}
          </p>
          <p className="text-[9px] text-gray-400 mt-0.5">{relTime(latest.created_at)}</p>
        </div>
        <button
          onClick={e => { e.stopPropagation(); markRead(latest.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0 mt-0.5"
        >
          <XMarkIcon className="w-3.5 h-3.5 text-gray-400 hover:text-gray-700" />
        </button>
      </div>
    </div>
  );
};
