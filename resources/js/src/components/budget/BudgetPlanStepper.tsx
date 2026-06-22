import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import { Pencil, Send, Inbox, Eye, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface StepperProps {
  status: string;
  submittedAt?: string | null;
  acknowledgedAt?: string | null;
  approvedAt?: string | null;
  createdAt?: string | null;   // used for the Preparation step (admin only)
  isAdmin?: boolean;
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
  const { status, isAdmin = false, className } = props;
  const [expanded, setExpanded] = useState(false);

  const STEPS = isAdmin ? [PREP_STEP, ...BASE_STEPS] : BASE_STEPS;
  const DONE_INDEX_MAP = isAdmin ? ADMIN_DONE_INDEX : NON_ADMIN_DONE_INDEX;

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
  const doneIndex = DONE_INDEX_MAP[status] ?? -1;
  const activeIndex = status === 'approved' ? -1 : doneIndex + 1;

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
          className="absolute top-[17px] h-0.5 bg-gray-200 rounded-full"
          style={{ left: `${insetPct}%`, right: `${insetPct}%` }}
        />
        <div
          className="absolute top-[17px] h-0.5 bg-emerald-500 rounded-full transition-all duration-300"
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
                    'w-[34px] h-[34px] rounded-full flex items-center justify-center flex-shrink-0 transition-colors border-2 bg-white',
                    done
                      ? 'border-emerald-600 bg-emerald-600 text-white'
                      : active
                      ? cn(step.border, step.text)
                      : 'border-gray-200 text-gray-300',
                  )}
                >
                  {done ? <Check className="w-4 h-4" strokeWidth={2.5} /> : <Icon className="w-4 h-4" strokeWidth={2} />}
                </div>
                <span
                  className={cn(
                    'mt-2 text-[12px] font-semibold leading-tight break-words',
                    done ? 'text-emerald-700' : active ? step.text : 'text-gray-400',
                  )}
                >
                  {step.label}
                </span>
                <span className="mt-0.5 text-[10.5px] text-gray-400 leading-snug px-1 break-words">
                  {step.description}
                </span>
                {dateLabel && (done || active) && (
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
