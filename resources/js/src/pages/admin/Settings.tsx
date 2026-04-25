import React, { useState } from 'react';
import { cn } from '@/src/lib/utils';
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Square3Stack3DIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  CalendarDaysIcon,
  TableCellsIcon,
} from '@heroicons/react/24/outline';

const TranchePage              = React.lazy(() => import('./TranchePage'));
const PlantillaPage            = React.lazy(() => import('../hrmo/PlantillaPage'));
const PersonnelPage            = React.lazy(() => import('../hrmo/PersonnelPage'));
const PlantillaOfPersonnelPage = React.lazy(() => import('../hrmo/PlantillaOfPersonnelPage'));
const DepartmentsPage          = React.lazy(() => import('./DepartmentsPage'));
const UserAccountPage          = React.lazy(() => import('./UserAccountPage'));
const ExpenseItemsPage         = React.lazy(() => import('./ExpenseClassItemsPage'));
const IncomeItemsPage          = React.lazy(() => import('./IncomeItemsTab'));
const AIPProgramsPage          = React.lazy(() => import('./AipProgramsTab'));

// ── Tab groups ────────────────────────────────────────────────────────────────

type TabDef = {
  key: string;
  label: string;
  short: string;
  description: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
  component: React.LazyExoticComponent<React.ComponentType>;
};

type TabGroup = {
  group: string;
  tabs: TabDef[];
};

const TAB_GROUPS: TabGroup[] = [
    {
    group: 'Budget Reference Data',
    tabs: [
      {
        key: 'tranche', label: 'Salary Tranche', short: 'Tranche',
        description: 'Salary grade versions and active tranche',
        icon: WrenchScrewdriverIcon, iconBg: 'bg-orange-100', iconColor: 'text-orange-600',
        component: TranchePage,
      },
      {
        key: 'income-items', label: 'Income Items', short: 'Income Items',
        description: 'Manage income items',
        icon: BanknotesIcon, iconBg: 'bg-emerald-100', iconColor: 'text-emerald-600',
        component: IncomeItemsPage,
      },
      {
        key: 'expense-items', label: 'Expense Items', short: 'Expense Items',
        description: 'Manage expense items',
        icon: TableCellsIcon, iconBg: 'bg-amber-100', iconColor: 'text-amber-600',
        component: ExpenseItemsPage,
      },
    ],
  },
  {
    group: 'Planning & Programs',
    tabs: [
      {
        key: 'aip-programs', label: 'AIP Programs', short: 'AIP Programs',
        description: 'Annual Investment Programs',
        icon: CalendarDaysIcon, iconBg: 'bg-indigo-100', iconColor: 'text-indigo-600',
        component: AIPProgramsPage,
      },
    ],
  },
  {
    group: 'Position & Staffing',
    tabs: [
      {
        key: 'plantilla', label: 'Plantilla Positions', short: 'Plantilla',
        description: 'Positions per department',
        icon: ClipboardDocumentListIcon, iconBg: 'bg-teal-100', iconColor: 'text-teal-600',
        component: PlantillaPage,
      },
      {
        key: 'personnel', label: 'Personnel', short: 'Personnels',
        description: 'Personnel records',
        icon: UsersIcon, iconBg: 'bg-sky-100', iconColor: 'text-sky-600',
        component: PersonnelPage,
      },
      {
        key: 'plantilla-of-personnel', label: 'Plantilla of Personnel', short: 'Assignments',
        description: 'Assign personnel to positions',
        icon: Square3Stack3DIcon, iconBg: 'bg-purple-100', iconColor: 'text-purple-600',
        component: PlantillaOfPersonnelPage,
      },
    ],
  },
  {
    group: 'Org Management',
    tabs: [
      {
        key: 'departments', label: 'Departments', short: 'Departments',
        description: 'Manage LGU departments',
        icon: BuildingOffice2Icon, iconBg: 'bg-slate-100', iconColor: 'text-slate-600',
        component: DepartmentsPage,
      },
      {
        key: 'users', label: 'User Accounts', short: 'Users',
        description: 'Manage user accounts',
        icon: UsersIcon, iconBg: 'bg-blue-100', iconColor: 'text-blue-600',
        component: UserAccountPage,
      },
    ],
  },
];

const ALL_TABS = TAB_GROUPS.flatMap(g => g.tabs);
type TabKey = typeof ALL_TABS[number]['key'];

// ── Component ─────────────────────────────────────────────────────────────────

const SettingsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabKey>('tranche');

  const current   = ALL_TABS.find(t => t.key === activeTab)!;
  const Component = current.component;

  return (
    <div className="flex h-full min-h-0 overflow-hidden w-full">

      {/* ── Left rail ─────────────────────────────────────────────────── */}
      <aside className="w-52 shrink-0 border-r border-gray-100 bg-gray-50/40 flex flex-col py-4 px-2 gap-0 overflow-y-auto">

        <p className="px-2.5 mb-3 text-[10px] font-semibold uppercase tracking-[0.1em] text-gray-400">
          Settings
        </p>

        {TAB_GROUPS.map(group => (
          <div key={group.group} className="mb-3">
            {/* Group label */}
            <p className="px-2.5 mb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-gray-400/70">
              {group.group}
            </p>

            {/* Items */}
            <div className="flex flex-col gap-0.5">
              {group.tabs.map(tab => {
                const Icon   = tab.icon;
                const active = tab.key === activeTab;

                return (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key as TabKey)}
                    className={cn(
                      'group flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-left transition-all',
                      active
                        ? 'bg-gray-900 shadow-sm border border-gray-800 text-white'
                        : 'text-gray-500 hover:bg-white/70 hover:text-gray-700 border border-transparent',
                    )}
                  >
                    <span className={cn(
                      'w-[26px] h-[26px] rounded-md flex items-center justify-center shrink-0 transition-opacity',
                      active ? 'bg-white/15' : tab.iconBg,
                      !active && 'opacity-70 group-hover:opacity-100',
                    )}>
                      <Icon className={cn('w-3.5 h-3.5', active ? 'text-white' : tab.iconColor)} />
                    </span>
                    <div className="flex-1 min-w-0">
                      <span className={cn(
                        'text-[13px] font-medium leading-tight block truncate',
                        active ? 'text-white' : '',
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
            </div>
          </div>
        ))}
      </aside>

      {/* ── Main content ──────────────────────────────────────────────── */}
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

export default SettingsPage;
