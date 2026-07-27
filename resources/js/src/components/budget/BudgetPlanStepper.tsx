import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Pencil, Send, Inbox, Eye, Check, ChevronDown, ChevronUp, Maximize2 } from 'lucide-react';
import { useIsMobile } from '../../hooks/use-mobile';

interface StepperProps {
  status: string;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;   // used for the Preparation step (admin only)
  isAdmin?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

interface StepDef {
  key: string;
  label: string;
  description: string;
  icon: React.ElementType;
  border: string;
  text: string;
  getDate: (p: StepperProps) => string | null | undefined;
}

const PREP_STEP: StepDef = {
  key: 'draft',
  label: 'Preparation',
  description: 'Department is preparing the proposal',
  icon: Pencil,
  border: 'border-blue-600',
  text: 'text-blue-600',
  getDate: p => p.createdAt,
};

const BASE_STEPS: StepDef[] = [
  {
    key: 'submitted',
    label: 'Submitted',
    description: 'Sent to the Budget Officer',
    icon: Send,
    border: 'border-indigo-600',
    text: 'text-indigo-600',
    getDate: p => p.submittedAt,
  },
  {
    key: 'received',
    label: 'Received',
    description: 'Acknowledged by the Budget Officer',
    icon: Inbox,
    border: 'border-amber-500',
    text: 'text-amber-600',
    getDate: p => p.acknowledgedAt,
  },
  {
    key: 'under_review',
    label: 'Under Review',
    description: 'Reviewing and adjusting figures',
    icon: Eye,
    border: 'border-amber-500',
    text: 'text-amber-600',
    getDate: p => p.acknowledgedAt,
  },
  {
    key: 'approved',
    label: 'Approved',
    description: 'Budget plan has been approved',
    icon: Check,
    border: 'border-emerald-600',
    text: 'text-emerald-600',
    getDate: p => p.approvedAt,
  },
];

// Index of the LAST step considered "done" for a given status.
const NON_ADMIN_DONE_INDEX: Record<string, number> = {
  draft:        -1,
  submitted:     0,
  under_review:  1,
  approved:      3,
};

const ADMIN_DONE_INDEX: Record<string, number> = {
  draft:        -1, // Preparation itself is active, not done
  submitted:     1, // Preparation + Submitted done
  under_review:  2, // + Received done
  approved:      4, // everything done
};

const formatDateTime = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
};

export const BudgetPlanStepper: React.FC<StepperProps> = (props) => {
  const { status, isAdmin = false, className, compact = false, onClick } = props;
  const [expanded, setExpanded] = useState(false);
  const isMobile = useIsMobile();

  const STEPS = isAdmin ? [PREP_STEP, ...BASE_STEPS] : BASE_STEPS;
  const DONE_INDEX_MAP = isAdmin ? ADMIN_DONE_INDEX : NON_ADMIN_DONE_INDEX;
  const doneIndex = DONE_INDEX_MAP[status] ?? -1;
  const activeIndex = status === 'approved' ? -1 : doneIndex + 1;

  // ── Compact clickable pill (used e.g. in page headers) ───────────────────
  if (compact) {
    const currentLabel = status === 'approved' ? 'Approved' : (STEPS[activeIndex]?.label ?? STEPS[STEPS.length - 1].label);
    return (
     <button
        type="button"
        onClick={onClick}
        className={cn(
          'flex items-center gap-2 group rounded-full px-2.5 py-1 -mx-2.5 -my-1 transition-colors',
          onClick && 'cursor-pointer hover:bg-gray-100',
          className,
        )}
      >
        <div className="flex items-center">
          {STEPS.map((step, i) => (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <div className={cn('h-0.5 w-3 sm:w-4', i <= doneIndex ? 'bg-emerald-500' : 'bg-gray-200')} />
              )}
              <div
                className={cn(
                  'w-2.5 h-2.5 rounded-full flex-shrink-0 transition-colors',
                  i <= doneIndex
                    ? 'bg-emerald-500'
                    : i === activeIndex
                    ? step.border.replace('border-', 'bg-')
                    : 'bg-gray-200',
                )}
              />
            </React.Fragment>
          ))}
        </div>
        <span className="text-[11px] font-semibold text-gray-600 group-hover:text-gray-900 transition-colors whitespace-nowrap">
          {currentLabel}
        </span>
        {onClick && (
          <Maximize2 className="w-3 h-3 text-gray-300 group-hover:text-gray-500 transition-colors flex-shrink-0" />
        )}
      </button>
    );
  }

  // ── Collapsed "Approved" badge ──────────────────────────────────────────
  if (status === 'approved' && !expanded) {
    const approvedDate = formatDateTime(props.approvedAt);
    return (
      <div className={cn(
        'mx-auto w-full max-w-2xl flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3',
        className,
      )}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center flex-shrink-0">
            <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-700">Approved</p>
            {approvedDate && <p className="text-[11px] text-emerald-600">{approvedDate}</p>}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-1 text-[12px] font-medium text-emerald-700 hover:text-emerald-800 flex-shrink-0"
        >
          Show timeline <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // ── Full stepper ─────────────────────────────────────────────────────────
  // ── Full stepper ─────────────────────────────────────────────────────────
  const n = STEPS.length;
  const insetPct = 100 / (n * 2);
  const progressPct = Math.max(doneIndex + 1, 0) / (n - 1);
  const trackSpanPct = 100 - insetPct * 2;

  return (
    <div className={cn('mx-auto w-full max-w-2xl overflow-hidden', className)}>
      {status === 'approved' && (
        <div className="flex justify-end mb-2">
          <button
            type="button"
            onClick={() => setExpanded(false)}
            className="flex items-center gap-1 text-[12px] font-medium text-gray-500 hover:text-gray-700"
          >
            Hide timeline <ChevronUp className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <div className="relative">
        <div
          className={cn('absolute h-0.5 bg-gray-200 rounded-full', isMobile ? 'top-[12px]' : 'top-[17px]')}
          style={{ left: `${insetPct}%`, right: `${insetPct}%` }}
        />
        <div
          className={cn('absolute h-0.5 bg-emerald-500 rounded-full transition-all duration-300', isMobile ? 'top-[12px]' : 'top-[17px]')}
          style={{ left: `${insetPct}%`, width: `${trackSpanPct * progressPct}%` }}
        />

        <div className="relative flex">
          {STEPS.map((step, i) => {
            const done   = i <= doneIndex;
            const active = i === activeIndex;
            const Icon   = step.icon;
            const dateLabel = formatDateTime(step.getDate(props));

            return (
              <div key={step.key} className="flex flex-1 min-w-0 flex-col items-center text-center px-1">
                <div
                  className={cn(
                    'rounded-full flex items-center justify-center flex-shrink-0 transition-colors border-2 bg-white',
                    isMobile ? 'w-[24px] h-[24px]' : 'w-[34px] h-[34px]',
                    done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : active
                      ? cn(step.border, step.text)
                      : 'border-gray-200 text-gray-300',
                  )}
                >
                  {done
                    ? <Check className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} strokeWidth={2.5} />
                    : <Icon className={isMobile ? 'w-3 h-3' : 'w-4 h-4'} strokeWidth={2} />}
                </div>
                <span
                  className={cn(
                    'font-semibold leading-tight break-words',
                    isMobile ? 'mt-1 text-[9px]' : 'mt-2 text-[12px]',
                    done ? 'text-emerald-700' : active ? step.text : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
                {!isMobile && (
                  <span className="mt-0.5 text-[10.5px] text-gray-400 leading-snug px-1 break-words">
                    {step.description}
                  </span>
                )}
                {!isMobile && dateLabel && (done || active) && (
                  <span className="mt-1 text-[10px] font-medium text-gray-500 break-words">
                    {dateLabel}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
