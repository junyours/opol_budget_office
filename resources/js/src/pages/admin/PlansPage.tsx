import React, { useState } from "react";
import { cn } from "@/src/lib/utils";
import {
  HeartIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BeakerIcon,
  SparklesIcon,
  DocumentTextIcon,
  ScaleIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

// ── Lazy-load sub-pages ───────────────────────────────────────────────────────
const GadPage       = React.lazy(() => import("./GadPage"));
const LcpcPage      = React.lazy(() => import("./LCPCPage"));
const LydpPage      = React.lazy(() => import("./LYDPPage"));
const ScPage        = React.lazy(() => import("./SCPage"));
const MpocPage      = React.lazy(() => import("./MPOCPage"));
const DrugsPage     = React.lazy(() => import("./PPACombatIllegalDrugsPage"));
const ArtsPage      = React.lazy(() => import("./CultureAndArtsPage"));
const AidsPage      = React.lazy(() => import("./PPACombatAidsPage"));
const ScPpaPage     = React.lazy(() => import("./PPASCPage"));
const NutritionPage = React.lazy(() => import("./NutritionPage"));

// ── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  // ── Special Purpose ────────────────────────────────────────────────────────
  {
    group:       "Special Purpose",
    key:         "gad",
    label:       "Gender and Development",
    short:       "GAD Budget Plan",
    description: "Gender & development programs",
    icon:        HeartIcon,
    iconBg:      "bg-pink-100",
    iconColor:   "text-pink-600",
    component:   GadPage,
  },
  {
    group:       "Special Purpose",
    key:         "lcpc",
    label:       "Local Council for the Protection of Children",
    short:       "LCPC",
    description: "Children & youth programs",
    icon:        ShieldCheckIcon,
    iconBg:      "bg-sky-100",
    iconColor:   "text-sky-600",
    component:   LcpcPage,
  },
  {
    group:       "Special Purpose",
    key:         "lydp",
    label:       "Local Youth Development Program",
    short:       "LYDP",
    description: "Youth development activities",
    icon:        UserGroupIcon,
    iconBg:      "bg-violet-100",
    iconColor:   "text-violet-600",
    component:   LydpPage,
  },
  {
    group:       "Special Purpose",
    key:         "sc",
    label:       "Social Welfare for Senior Citizens",
    short:       "Senior Citizens (SC)",
    description: "Senior citizens budget plan",
    icon:        HeartIcon,
    iconBg:      "bg-amber-100",
    iconColor:   "text-amber-600",
    component:   ScPage,
  },
  // ── Annual Plans ───────────────────────────────────────────────────────────
  {
    group:       "Annual Plans",
    key:         "mpoc",
    label:       "Municipal Peace and Order & Public Safety Plan",
    short:       "Peace & Order (MPOC)",
    description: "Peace, order & public safety",
    icon:        ShieldCheckIcon,
    iconBg:      "bg-red-100",
    iconColor:   "text-red-600",
    component:   MpocPage,
  },
  {
    group:       "Annual Plans",
    key:         "drugs",
    label:       "List of PPAs to Combat Illegal Drugs",
    short:       "Anti-Drug PPAs",
    description: "Anti-illegal drug programs",
    icon:        BeakerIcon,
    iconBg:      "bg-orange-100",
    iconColor:   "text-orange-600",
    component:   DrugsPage,
  },
  {
    group:       "Annual Plans",
    key:         "arts",
    label:       "Local Annual Cultural & Arts Development Plan",
    short:       "Cultural & Arts",
    description: "Culture, arts & heritage",
    icon:        SparklesIcon,
    iconBg:      "bg-pink-100",
    iconColor:   "text-pink-600",
    component:   ArtsPage,
  },
  {
    group:       "Annual Plans",
    key:         "aids",
    label:       "List of PPAs to Combat AIDS",
    short:       "Anti-AIDS PPAs",
    description: "HIV/AIDS prevention programs",
    icon:        HeartIcon,
    iconBg:      "bg-rose-100",
    iconColor:   "text-rose-600",
    component:   AidsPage,
  },
  {
    group:       "Annual Plans",
    key:         "sc_ppa",
    label:       "List of PPAs for Senior Citizens",
    short:       "SC PPAs",
    description: "Senior citizens PPA list",
    icon:        UserGroupIcon,
    iconBg:      "bg-yellow-100",
    iconColor:   "text-yellow-600",
    component:   ScPpaPage,
  },
  {
    group:       "Annual Plans",
    key:         "nutrition",
    label:       "Nutrition Action Plan",
    short:       "Nutrition",
    description: "Maternal & child nutrition",
    icon:        SunIcon,
    iconBg:      "bg-green-100",
    iconColor:   "text-green-600",
    component:   NutritionPage,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// Group the tabs for rendering the rail sections
const GROUPS = ["Special Purpose", "Annual Plans"] as const;

// ── Component ─────────────────────────────────────────────────────────────────

const PlansPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("gad");

  const current   = TABS.find(t => t.key === activeTab)!;
  const Component = current.component;

  return (
    <div className="flex h-full min-h-0 overflow-hidden w-full">

      {/* ── Left rail ─────────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/40 flex flex-col py-4 px-2 gap-0.5 overflow-y-auto">

        {GROUPS.map((group, gi) => {
          const groupTabs = TABS.filter(t => t.group === group);
          return (
            <div key={group} className={cn(gi > 0 && "mt-4")}>
              <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
                {group}
              </p>
              {groupTabs.map(tab => {
                const Icon   = tab.icon;
                const active = tab.key === activeTab;
                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={cn(
                      "group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-left transition-all",
                      active
                        ? "bg-gray-900 shadow-sm border border-gray-800 text-white"
                        : "text-gray-500 hover:bg-white/70 hover:text-gray-700 border border-transparent",
                    )}
                  >
                    <span className={cn(
                      "w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 transition-opacity",
                      active ? "bg-white/15" : tab.iconBg,
                      !active && "opacity-70 group-hover:opacity-100",
                    )}>
                      <Icon className={cn("w-3.5 h-3.5", active ? "text-white" : tab.iconColor)} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={cn("text-[13px] font-medium leading-tight block truncate", active ? "text-white" : "")}>
                        {tab.short}
                      </span>
                      {active && (
                        <span className="text-[10px] text-gray-400 leading-tight block truncate mt-0.5">
                          {tab.description}
                        </span>
                      )}
                    </div>
                    {active && <span className="w-1.5 h-1.5 rounded-full bg-white shrink-0" />}
                  </button>
                );
              })}
            </div>
          );
        })}
      </aside>

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="flex-1 min-w-0 w-0 flex flex-col overflow-hidden bg-gray-50/20">
        <div className="flex-1 min-w-0 overflow-y-auto overflow-x-auto">
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-40 text-sm text-gray-400 gap-2">
              <span className="w-4 h-4 border-2 border-gray-200 border-t-gray-400 rounded-full animate-spin" />
              Loading…
            </div>
          }>
            <Component />
          </React.Suspense>
        </div>
      </div>

    </div>
  );
};

export default PlansPage;