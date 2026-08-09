import React from "react";
import { cn } from "@/src/lib/utils";
import {
  MegaphoneIcon,
  CalendarDaysIcon,
  FlagIcon,
  BellIcon,
  SparklesIcon,
  ClockIcon,
  BuildingOffice2Icon,
} from "@heroicons/react/24/outline";
import { useDashboardAnnouncements, DashboardAnnouncement } from "@/src/hooks/useDashboardAnnouncements";

const ICONS: Record<string, React.ElementType> = {
  megaphone: MegaphoneIcon,
  calendar: CalendarDaysIcon,
  flag: FlagIcon,
  bell: BellIcon,
  sparkles: SparklesIcon,
  clock: ClockIcon,
  building: BuildingOffice2Icon,
};

const ACCENTS: Record<string, { bg: string; text: string; border: string }> = {
  blue:    { bg: "bg-blue-50",    text: "text-blue-600",    border: "border-blue-500" },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-600", border: "border-emerald-500" },
  amber:   { bg: "bg-amber-50",   text: "text-amber-600",   border: "border-amber-500" },
  violet:  { bg: "bg-violet-50",  text: "text-violet-600",  border: "border-violet-500" },
  rose:    { bg: "bg-rose-50",    text: "text-rose-600",    border: "border-rose-500" },
  indigo:  { bg: "bg-indigo-50",  text: "text-indigo-600",  border: "border-indigo-500" },
};

const TYPE_LABEL: Record<string, string> = {
  announcement: "Announcement",
  phase: "Budget Phase",
  schedule: "Schedule",
  department: "Department",
};

const fmtDate = (d: string | null) =>
  d ? new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : null;

const AnnouncementPill: React.FC<{ item: DashboardAnnouncement }> = ({ item }) => {
  const accent = ACCENTS[item.accent_color] ?? ACCENTS.blue;
  const Icon = ICONS[item.icon ?? ""] ?? MegaphoneIcon;
  const dept = item.department;

  return (
   <div className="flex-shrink-0 h-full flex items-center gap-2 bg-card pl-2.5 pr-3">
      {dept ? (
        <div className="w-4 h-4 flex items-center justify-center flex-shrink-0 overflow-hidden">
          {dept.logo ? (
            <img src={`/storage/${dept.logo}`} alt={dept.dept_abbreviation} className="w-full h-full object-contain" />
          ) : (
            <span className="text-[6px] font-bold text-muted-foreground">{dept.dept_abbreviation}</span>
          )}
        </div>
      ) : (
        <Icon className={cn("w-3.5 h-3.5 flex-shrink-0", accent.text)} />
      )}
      <span className={cn("text-[8px] font-semibold uppercase tracking-wide flex-shrink-0", accent.text)}>
        {dept ? dept.dept_abbreviation : TYPE_LABEL[item.type]}
      </span>
      <span className="text-[11px] font-medium text-foreground truncate max-w-[220px]">{item.title}</span>
      {item.description && (
        <span className="text-[10px] text-muted-foreground truncate max-w-[240px]"> {item.description}</span>
      )}
      {item.event_date && (
        <span className="text-[9px] text-muted-foreground flex-shrink-0">· {fmtDate(item.event_date)}</span>
      )}
    </div>
  );
};

// Fixed rate the marquee moves at — kept constant regardless of item count,
// so 1 announcement and 10 announcements feel the same speed.
const SECONDS_PER_ITEM = 10;
// How many times the item set is duplicated back-to-back so the loop is seamless.
const REPEAT = 10;

export const AnnouncementsCarousel: React.FC<{ className?: string }> = ({ className }) => {
  const { data: items = [], isLoading } = useDashboardAnnouncements(true);

  if (!isLoading && items.length === 0) return null;

  const isSingle = items.length === 1;
  const loop = !isSingle ? Array.from({ length: REPEAT }, () => items).flat() : [];
  // Distance traveled per loop is exactly one "set" of items — so duration scales
  // only with items.length, keeping px/sec constant no matter how many sets we repeat.
  const multiDuration = items.length * SECONDS_PER_ITEM;
  const singleDuration = SECONDS_PER_ITEM * 2;

  return (
    <div
      className={cn("relative overflow-hidden border bg-muted/30 h-7", className)}
      style={{
        WebkitMaskImage:
          "linear-gradient(to right, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)",
        maskImage:
          "linear-gradient(to right, transparent 0, black 20px, black calc(100% - 20px), transparent 100%)",
      }}
    >
      {isLoading ? (
        <div className="flex gap-1.5 px-2 h-full items-center">
          {[0, 1, 2].map(i => (
            <div key={i} className="h-5 w-24 rounded-full bg-muted animate-pulse flex-shrink-0" />
          ))}
        </div>
      ) : isSingle ? (
        // Single announcement: no duplicate pill. It scrolls fully across and off
        // both edges before restarting, so the loop point is never visible.
        <div
          className="dac-track-single"
          style={{ animationDuration: `${singleDuration}s` }}
        >
          <AnnouncementPill item={items[0]} />
        </div>
      ) : (
        <div
          className="dac-track flex gap-1.5 px-1 w-max h-full items-center"
          style={{ animationDuration: `${multiDuration}s` }}
        >
          {loop.map((item, i) => (
            <AnnouncementPill key={`${item.id}-${i}`} item={item} />
          ))}
        </div>
      )}

      <style>{`
        .dac-track { animation-name: dac-scroll; animation-timing-function: linear; animation-iteration-count: infinite; }
        .dac-track-single {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          left: 100%;
          animation-name: dac-scroll-single;
          animation-timing-function: linear;
          animation-iteration-count: infinite;
        }

        @keyframes dac-scroll {
          from { transform: translateX(0); }
          to   { transform: translateX(-${100 / REPEAT}%); }
        }
        @keyframes dac-scroll-single {
          from { left: 100%; }
          to   { left: -100%; }
        }
        @media (prefers-reduced-motion: reduce) {
          .dac-track, .dac-track-single { animation: none; }
        }
      `}</style>
    </div>
  );
};

export default AnnouncementsCarousel;
