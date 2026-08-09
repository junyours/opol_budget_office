import React from 'react';
import {
  ClockIcon, MapPinIcon, ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon as CheckCircleSolid } from '@heroicons/react/24/solid';
import { DepartmentReviewSchedule } from '@/src/types/api';
import { cn } from '@/src/lib/utils';

interface Props {
  schedule: DepartmentReviewSchedule;
}

const periodLabel = (p: 'morning' | 'afternoon') => (p === 'morning' ? 'Morning' : 'Afternoon');

const formatDate = (dateStr: string) => {
  const datePart = dateStr.split('T')[0];
  return new Date(datePart + 'T00:00:00').toLocaleDateString('en-PH', {
    weekday: 'short', month: 'short', day: 'numeric',
  });
};

const formatTime = (t: string | null) => {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m);
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }).replace(' ', '\u00A0');
};

const toDateObj = (dateStr: string) => {
  const datePart = dateStr.split('T')[0];
  const d = new Date(datePart + 'T00:00:00');
  d.setHours(0, 0, 0, 0);
  return d;
};

const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

/** The 7 dates (Sun–Sat) of the week containing `date`. */
const getWeekDates = (date: Date) => {
  const start = new Date(date);
  start.setDate(date.getDate() - date.getDay());
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
};

const sameDay = (a: Date, b: Date) =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

const isPastDate = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toDateObj(dateStr) < today;
};

const isToday = (dateStr: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return toDateObj(dateStr).getTime() === today.getTime();
};

/**
 * Returns null when there is nothing worth showing in the sidebar:
 * the scheduled day has fully passed. This is checked by the caller
 * as well (see AppSidebar), but keeping it here too makes this
 * component safe to use anywhere.
 */
export const SidebarReviewSchedule: React.FC<Props> = ({ schedule }) => {
  if (isPastDate(schedule.review_date)) return null;

  const completed = schedule.status === 'completed';
  const cancelled = schedule.status === 'cancelled';
  const wasMoved  = schedule.status === 'moved' && !!schedule.previous_date;
  const today     = !completed && !cancelled && isToday(schedule.review_date);

  const state = completed ? 'completed' : cancelled ? 'cancelled' : wasMoved ? 'moved' : today ? 'today' : 'upcoming';

  const tone: Record<string, { border: string; dayBg: string; dot: string; label: string; labelColor: string }> = {
    completed: { border: 'border-emerald-200', dayBg: 'bg-emerald-600 hover:bg-emerald-600', dot: 'bg-emerald-500', label: 'Completed',   labelColor: 'text-emerald-700' },
    cancelled: { border: 'border-gray-200',     dayBg: 'bg-gray-400 hover:bg-gray-400',       dot: 'bg-gray-300',    label: 'Cancelled',   labelColor: 'text-gray-400' },
    moved:     { border: 'border-amber-200',    dayBg: 'bg-amber-500 hover:bg-amber-500',     dot: 'bg-amber-500',   label: 'Rescheduled', labelColor: 'text-amber-700' },
    today:     { border: 'border-amber-200',    dayBg: 'bg-amber-500 hover:bg-amber-500',     dot: 'bg-amber-500',   label: 'Today',       labelColor: 'text-amber-700' },
    upcoming:  { border: 'border-gray-200',     dayBg: 'bg-gray-900 hover:bg-gray-900',       dot: 'bg-gray-400',    label: 'Upcoming',    labelColor: 'text-gray-500' },
  };

  const t = tone[state];
  const reviewDate = toDateObj(schedule.review_date);

  return (
    <div className={cn('mb-2 rounded-lg border bg-white', t.border)}>

      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 rounded-t-lg">
        <div className="flex items-center gap-1.5">
          <span className={cn('w-1.5 h-1.5 rounded-full', t.dot)} />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400">
            Your Schedule
          </span>
        </div>
        <span className={cn('text-[10px] font-semibold', t.labelColor)}>{t.label}</span>
      </div>

      {/* Week strip */}
      <div className="px-3 pt-2.5 pb-1">
        <p className="text-[11px] font-semibold text-gray-700 mb-1.5 text-center">
          {reviewDate.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' })}
        </p>
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAY_LABELS.map((d) => (
            <span key={d} className="text-[9.5px] font-semibold text-gray-400">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {getWeekDates(reviewDate).map((d) => {
            const isSelected = sameDay(d, reviewDate);
            const isTodayCell = sameDay(d, new Date());

            return (
              <div
                key={d.toISOString()}
                className={cn(
                  'aspect-square flex items-center justify-center rounded-md text-[12px] font-medium transition-colors cursor-default',
                  isSelected
                    ? cn(t.dayBg, 'text-white')
                    : isTodayCell
                      ? 'border border-gray-300 text-gray-900 hover:bg-gray-50'
                      : 'text-gray-500 hover:bg-gray-100',
                )}
              >
                {d.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* Details */}
      <div className="px-3 pb-3 pt-1">
        <p className={cn(
          'text-[13px] font-semibold leading-tight',
          completed || cancelled ? 'text-gray-400' : 'text-gray-800',
        )}>
          {formatDate(schedule.review_date)} · {periodLabel(schedule.period)}
        </p>

        <div className="mt-1 flex flex-col gap-[3px]">
          {schedule.review_time && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500 whitespace-nowrap">
              <ClockIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
              {formatTime(schedule.review_time)}
            </span>
          )}
          {schedule.location && (
            <span className="flex items-center gap-1.5 text-[11px] text-gray-500">
              <MapPinIcon className="w-3 h-3 flex-shrink-0" strokeWidth={2} />
              {schedule.location}
            </span>
          )}
          {completed && (
            <span className="flex items-center gap-1.5 text-[11px] text-emerald-600 font-medium">
              <CheckCircleSolid className="w-3.5 h-3.5 flex-shrink-0" />
              Marked complete
            </span>
          )}
        </div>

        {wasMoved && (
          <div className="mt-2.5 pt-2.5 border-t border-amber-200/70">
            <p className="flex items-start gap-1.5 text-[10.5px] text-amber-700 leading-snug">
              <ArrowPathIcon className="w-3 h-3 flex-shrink-0 mt-[1.5px]" strokeWidth={2} />
              <span>
                Originally{' '}
                <span className="whitespace-nowrap">
                  {formatDate(schedule.previous_date!)}
                  {schedule.previous_period ? ` · ${periodLabel(schedule.previous_period)}` : ''}
                  {schedule.previous_time ? ` · ${formatTime(schedule.previous_time)}` : ''}
                </span>
                .{schedule.reschedule_reason ? ` Reason: ${schedule.reschedule_reason}` : ''}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
