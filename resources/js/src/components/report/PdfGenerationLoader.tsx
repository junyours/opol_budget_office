import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, Cloud, Loader2 } from 'lucide-react';
import { cn } from '@/src/lib/utils';

interface PdfGenerationLoaderProps {
  stages: string[];
  /** Is a generation run currently in flight (shows the loader at all) */
  active: boolean;
  /** Flip to true the instant the real PDF blob has arrived — plays the
   *  "finish all checks" animation, then calls onFinished so the parent
   *  can swap to the actual preview. */
  ready: boolean;
  /** Called once the finish animation completes */
  onFinished?: () => void;
  title?: string;
}

const ROW_H = 30;
const VISIBLE_ROWS = 3;
const FINISH_STEP_MS = 90; // how fast the checks cascade once ready

// Different stage *kinds* take visibly different amounts of time so they
// never look synchronized — "Sending request" is quick, "Compiling…" steps
// are medium with jitter so consecutive ones don't feel identical, and
// heavier steps (rendering/packaging/loading) take longer.
function delayFor(label: string): number {
  if (/sending request|preparing/i.test(label))      return 380 + Math.random() * 180;
  if (/rendering layout|loading preview|packaging/i.test(label)) return 900 + Math.random() * 450;
  return 550 + Math.random() * 400; // "Compiling …" steps
}

export const PdfGenerationLoader: React.FC<PdfGenerationLoaderProps> = ({
  stages,
  active,
  ready,
  onFinished,
  title = 'Generating PDF…',
}) => {
  const [index, setIndex]     = useState(0);
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Tracks the latest `index` so the finish effect can pick up exactly where
  // the simulated progression left off, instead of restarting from row 0.
  const indexRef = useRef(0);
  useEffect(() => { indexRef.current = index; }, [index]);

  // Freeze the stage list the instant a run starts, and ignore any further
  // changes to `stages` while still active — so toggling form checkboxes
  // mid-generate doesn't reset or alter the running carousel.
  const frozenStagesRef = useRef<string[]>(stages);
  const wasActiveRef    = useRef(false);
  if (active && !wasActiveRef.current) {
    frozenStagesRef.current = stages;
  }
  wasActiveRef.current = active;
  const runStages = active ? frozenStagesRef.current : stages;
  const lastIndex = runStages.length - 1;

  const clearTimer = () => { if (timerRef.current) clearTimeout(timerRef.current); };

  // Normal simulated progression — walks forward once, parks (spinning,
  // unchecked) on the final stage if the server takes longer than the
  // simulated timeline. Never loops back.
  useEffect(() => {
    if (!active || runStages.length === 0 || ready) return;

    setIndex(0);
    setChecked(new Set());
    let cancelled = false;
    let i = 0;

    const step = () => {
      timerRef.current = setTimeout(() => {
        if (cancelled) return;
        if (i === lastIndex) return; // park here — no auto-check, no loop

        setChecked(prev => new Set(prev).add(i));
        timerRef.current = setTimeout(() => {
          if (cancelled) return;
          i += 1;
          setIndex(i);
          step();
        }, 200);
      }, delayFor(runStages[i]));
    };
    step();

    return () => { cancelled = true; clearTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, ready, runStages.join('|')]);

  // Real signal arrived: cascade-check everything, then hand back to parent.
 useEffect(() => {
    if (!ready) return;
    clearTimer();
    let cancelled = false;
    // Resume the cascade from wherever the simulated progression currently
    // is — never restart at 0, or the visible rows would jump/scroll back
    // to the top before cascading down again.
    let i = indexRef.current;

    const finishStep = () => {
      if (cancelled) return;
      setIndex(i);
      setChecked(prev => new Set(prev).add(i));
      if (i < lastIndex) {
        i += 1;
        timerRef.current = setTimeout(finishStep, FINISH_STEP_MS);
      } else {
        timerRef.current = setTimeout(() => { if (!cancelled) onFinished?.(); }, 350);
      }
    };
    finishStep();

    return () => { cancelled = true; clearTimer(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  if (!active || runStages.length === 0) return null;

  const percent = ready
    ? 100
    : index === lastIndex
      ? 85 // parked on the final stage, waiting on the real server response
      : Math.min(80, Math.round(((index + (checked.has(index) ? 1 : 0.4)) / runStages.length) * 100));

  const start = Math.max(0, Math.min(index - 1, runStages.length - VISIBLE_ROWS));

  return (
    <div className="w-80 flex flex-col items-center gap-4 bg-transparent">
      <div className="relative flex items-center justify-center w-20 h-20">
        {/* goo blob — soft blurred pulse behind the cloud while generating */}
        <div
          className={cn(
            'absolute w-14 h-14 rounded-full blur-xl transition-colors duration-500',
            ready ? 'bg-emerald-400/50' : 'bg-zinc-900/15 animate-goo-blob',
          )}
        />
        <Cloud
          className={cn(
            'relative w-9 h-9 transition-colors duration-300',
            ready ? 'text-emerald-500' : 'text-zinc-800',
          )}
          strokeWidth={1.75}
        />
        {!ready && (
          <span className="absolute w-16 h-16 rounded-full border-2 border-zinc-200 border-t-zinc-900 animate-spin" />
        )}
      </div>
      <p className="text-sm font-semibold text-foreground">{title}</p>

      {/* Explicit filling bar — width transitions left-to-right so it visibly
          fills, rather than relying on an opaque indicator swap. */}
      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
        <div
          className={cn(
            'h-full rounded-full transition-[width] duration-700 ease-out',
            ready ? 'bg-emerald-500' : 'bg-primary',
          )}
          style={{ width: `${percent}%` }}
        />
      </div>

      <div className="relative w-full overflow-hidden" style={{ height: ROW_H * VISIBLE_ROWS }}>
        <div
          className="flex flex-col transition-transform duration-300 ease-out"
          style={{ transform: `translateY(${-(start * ROW_H)}px)` }}
        >
          {runStages.map((label, i) => {
            const isDone   = checked.has(i);
            const isActive = i === index && !isDone;
            return (
              <div
                key={label + i}
                className={cn('flex items-center gap-2 px-2 rounded-md transition-colors', isActive && 'bg-primary/5')}
                style={{ height: ROW_H }}
              >
                {isDone ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0 animate-in zoom-in-50 duration-200" />
                ) : isActive ? (
                  <Loader2 className="h-3.5 w-3.5 text-primary animate-spin flex-shrink-0" />
                ) : (
                  <span className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <span className={cn(
                  'text-xs truncate',
                  isDone && 'text-emerald-600/70',
                  isActive && 'font-semibold text-foreground',
                  !isDone && !isActive && 'text-muted-foreground/40',
                )}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default PdfGenerationLoader;
