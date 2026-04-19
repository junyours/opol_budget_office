import React, { useState } from "react";
import { cn } from "@/src/lib/utils";
import {
  ListBulletIcon,
  ClipboardDocumentListIcon,
} from "@heroicons/react/24/outline";

// Lazy-load sub-tabs
const ExpenseClassItemsPage = React.lazy(() => import("./ExpenseClassItemsPage"));
const AipProgramsTab        = React.lazy(() => import("./AipProgramsTab"));

// ─── Tab definitions ───────────────────────────────────────────────────────────

const TABS = [
  {
    key:         "expense-items",
    label:       "Expense Items",
    short:       "Expense Items",
    description: "Manage expense class items & account codes",
    icon:        ListBulletIcon,
    iconBg:      "bg-amber-100",
    iconColor:   "text-amber-600",
    component:   ExpenseClassItemsPage,
  },
  {
    key:         "aip-programs",
    label:       "AIP Programs",
    short:       "AIP Programs",
    description: "Annual investment program master list",
    icon:        ClipboardDocumentListIcon,
    iconBg:      "bg-indigo-100",
    iconColor:   "text-indigo-600",
    component:   AipProgramsTab,
  },
] as const;

type TabKey = (typeof TABS)[number]["key"];

// ─── Component ─────────────────────────────────────────────────────────────────

const ExpenditurePage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>("expense-items");

  const current   = TABS.find((t) => t.key === activeTab)!;
  const Component = current.component;

  return (
    <div className="flex h-full min-h-0 overflow-hidden w-full">

      {/* ── Left rail ───────────────────────────────────────────────────── */}
      <aside className="w-48 shrink-0 border-r border-gray-100 bg-gray-50/40 flex flex-col py-4 px-2 gap-0.5 overflow-y-auto">

        <p className="px-2.5 mb-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
          Expenditure
        </p>

        {TABS.map((tab) => {
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
                  : "text-gray-500 hover:bg-white/70 hover:text-gray-700 border border-transparent"
              )}
            >
              <span className={cn(
                "w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 transition-opacity",
                active ? "bg-white/15" : tab.iconBg,
                !active && "opacity-70 group-hover:opacity-100"
              )}>
                <Icon className={cn("w-3.5 h-3.5", active ? "text-white" : tab.iconColor)} />
              </span>
              <div className="flex-1 min-w-0">
                <span className={cn(
                  "text-[13px] font-medium leading-tight block truncate",
                  active ? "text-white" : ""
                )}>
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
      </aside>

      {/* ── Main content ────────────────────────────────────────────────── */}
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

export default ExpenditurePage;
