import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/src/components/ui/command";
import { Kbd, KbdGroup } from "@/src/components/ui/kbd";
import { MagnifyingGlassIcon, ClockIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { buildNavGroups, isEligibleDepartment, User } from "./AppSidebar";
import {
  WrenchScrewdriverIcon,
  ClipboardDocumentListIcon,
  UsersIcon,
  Square3Stack3DIcon,
  BuildingOffice2Icon,
  BanknotesIcon,
  CalendarDaysIcon,
  TableCellsIcon,
  HeartIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  BeakerIcon,
  SparklesIcon,
  SunIcon,
} from "@heroicons/react/24/outline";

// Mirrors SettingsPage.tsx's TAB_GROUPS — kept in sync manually since the tabs
// live as client-side state under one route rather than separate nav items.
const SETTINGS_TABS = [
  { group: "Settings · Budget Reference Data", name: "Salary Tranche", tabKey: "tranche", iconBg: "bg-orange-100", iconColor: "text-orange-600", icon: WrenchScrewdriverIcon },
  { group: "Settings · Budget Reference Data", name: "Income Items", tabKey: "income-items", iconBg: "bg-emerald-100", iconColor: "text-emerald-600", icon: BanknotesIcon },
  { group: "Settings · Budget Reference Data", name: "Expense Items", tabKey: "expense-items", iconBg: "bg-amber-100", iconColor: "text-amber-600", icon: TableCellsIcon },
  { group: "Settings · Planning & Programs", name: "AIP Programs", tabKey: "aip-programs", iconBg: "bg-indigo-100", iconColor: "text-indigo-600", icon: CalendarDaysIcon },
  { group: "Settings · Position & Staffing", name: "Plantilla Positions", tabKey: "plantilla", iconBg: "bg-teal-100", iconColor: "text-teal-600", icon: ClipboardDocumentListIcon },
  { group: "Settings · Position & Staffing", name: "Personnel", tabKey: "personnel", iconBg: "bg-sky-100", iconColor: "text-sky-600", icon: UsersIcon },
  { group: "Settings · Position & Staffing", name: "Plantilla of Personnel", tabKey: "plantilla-of-personnel", iconBg: "bg-purple-100", iconColor: "text-purple-600", icon: Square3Stack3DIcon },
  { group: "Settings · Org Management", name: "Departments", tabKey: "departments", iconBg: "bg-slate-100", iconColor: "text-slate-600", icon: BuildingOffice2Icon },
  { group: "Settings · Org Management", name: "User Accounts", tabKey: "users", iconBg: "bg-blue-100", iconColor: "text-blue-600", icon: UsersIcon },
   { group: "Settings · System", name: "Activity Log", tabKey: "activity-log", iconBg: "bg-slate-100", iconColor: "text-slate-600", icon: ClipboardDocumentListIcon },
] as const;

// Mirrors PlansPage.tsx's TABS — kept in sync manually since the tabs live
// as client-side state under one route rather than separate nav items.
const PLANS_TABS = [
  { group: "Plans · Special Purpose", name: "GAD Budget Plan", tabKey: "gad", iconBg: "bg-pink-100", iconColor: "text-pink-600", icon: HeartIcon },
  { group: "Plans · Special Purpose", name: "LCPC", tabKey: "lcpc", iconBg: "bg-sky-100", iconColor: "text-sky-600", icon: ShieldCheckIcon },
  { group: "Plans · Special Purpose", name: "LYDP", tabKey: "lydp", iconBg: "bg-violet-100", iconColor: "text-violet-600", icon: UserGroupIcon },
  { group: "Plans · Special Purpose", name: "Senior Citizens (SC)", tabKey: "sc", iconBg: "bg-amber-100", iconColor: "text-amber-600", icon: HeartIcon },
  { group: "Plans · Annual Plans", name: "Peace & Order (MPOC)", tabKey: "mpoc", iconBg: "bg-red-100", iconColor: "text-red-600", icon: ShieldCheckIcon },
  { group: "Plans · Annual Plans", name: "Anti-Drug PPAs", tabKey: "drugs", iconBg: "bg-orange-100", iconColor: "text-orange-600", icon: BeakerIcon },
  { group: "Plans · Annual Plans", name: "Cultural & Arts", tabKey: "arts", iconBg: "bg-pink-100", iconColor: "text-pink-600", icon: SparklesIcon },
  { group: "Plans · Annual Plans", name: "Anti-AIDS PPAs", tabKey: "aids", iconBg: "bg-rose-100", iconColor: "text-rose-600", icon: HeartIcon },
  { group: "Plans · Annual Plans", name: "SC PPAs", tabKey: "sc_ppa", iconBg: "bg-yellow-100", iconColor: "text-yellow-600", icon: UserGroupIcon },
  { group: "Plans · Annual Plans", name: "Nutrition", tabKey: "nutrition", iconBg: "bg-green-100", iconColor: "text-green-600", icon: SunIcon },
] as const;

interface GlobalSearchProps {
  user: User | null;
}

interface RecentEntry {
  name: string;
  href: string;
  iconBg: string;
  iconColorKey: string; // stored as className string
}

const MAX_RECENTS = 5;
const isMac =
  typeof navigator !== "undefined" && /Mac|iPod|iPhone|iPad/.test(navigator.platform);

const storageKey = (userId?: number) => `global-search-recents:${userId ?? "anon"}`;

function loadRecents(userId?: number): RecentEntry[] {
  try {
    const raw = localStorage.getItem(storageKey(userId));
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveRecents(userId: number | undefined, entries: RecentEntry[]) {
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(entries.slice(0, MAX_RECENTS)));
  } catch {
    /* ignore quota errors */
  }
}

export const GlobalSearch: React.FC<GlobalSearchProps> = ({ user }) => {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [recents, setRecents] = useState<RecentEntry[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  const eligible  = useMemo(() => isEligibleDepartment(user), [user]);
  const navGroups = useMemo(() => buildNavGroups(user, eligible), [user, eligible]);

  const isSettingsAdmin = user?.role === "admin" || user?.role === "super-admin";
  // Plans page ("Attributions") is visible to super-admin, admin, and viewer per its nav entry
  const isPlansViewer =
    user?.role === "admin" || user?.role === "super-admin" || user?.role === "viewer";

  const groupTabsByLabel = <T extends { group: string }>(tabs: readonly T[]) => {
    const map = new Map<string, T[]>();
    tabs.forEach((tab) => {
      if (!map.has(tab.group)) map.set(tab.group, []);
      map.get(tab.group)!.push(tab);
    });
    return map;
  };

  const searchableGroups = useMemo(() => {
    const fromNav = navGroups
      .map((group) => ({
        label: group.label,
        items: group.items
          .filter((it) => it.roles.includes(user?.role ?? ""))
          .map((it) => ({
            name: it.name,
            href: it.href,
            iconBg: it.iconBg,
            iconColor: it.iconColor,
            icon: it.icon,
          })),
      }))
      .filter((group) => group.items.length > 0);

    let extraGroups: { label: string; items: { name: string; href: string; iconBg: string; iconColor: string; icon: React.ElementType }[] }[] = [];

    if (isSettingsAdmin) {
      const settingsByGroup = groupTabsByLabel(SETTINGS_TABS);
      extraGroups = extraGroups.concat(
        Array.from(settingsByGroup.entries()).map(([label, tabs]) => ({
          label,
          items: tabs.map((t) => ({
            name: t.name,
            href: `/admin/settings?tab=${t.tabKey}`,
            iconBg: t.iconBg,
            iconColor: t.iconColor,
            icon: t.icon,
          })),
        })),
      );
    }

    if (isPlansViewer) {
      const plansByGroup = groupTabsByLabel(PLANS_TABS);
      extraGroups = extraGroups.concat(
        Array.from(plansByGroup.entries()).map(([label, tabs]) => ({
          label,
          items: tabs.map((t) => ({
            name: t.name,
            href: `/admin/plans?tab=${t.tabKey}`,
            iconBg: t.iconBg,
            iconColor: t.iconColor,
            icon: t.icon,
          })),
        })),
      );
    }

    return [...fromNav, ...extraGroups];
  }, [navGroups, user, isSettingsAdmin, isPlansViewer]);

  // Flat lookup so we can re-derive icon/color when recording a recent
  const flatByHref = useMemo(() => {
    const map = new Map<string, { name: string; href: string; iconBg: string; iconColor: string; icon: React.ElementType }>();
    searchableGroups.forEach((g) => g.items.forEach((it) => map.set(it.href, it)));
    return map;
  }, [searchableGroups]);

  useEffect(() => {
    setRecents(loadRecents(user?.user_id));
  }, [user?.user_id]);

  // Ctrl+Shift+F (Cmd+Shift+F on Mac) toggles the palette
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.shiftKey && (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "f") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  const recordRecent = (name: string, href: string) => {
    const item = flatByHref.get(href);
    const entry: RecentEntry = {
      name,
      href,
      iconBg: item?.iconBg ?? "bg-zinc-100",
      iconColorKey: item?.iconColor ?? "text-zinc-500",
    };
    setRecents((prev) => {
      const next = [entry, ...prev.filter((r) => r.href !== href)].slice(0, MAX_RECENTS);
      saveRecents(user?.user_id, next);
      return next;
    });
  };

  const handleSelect = (name: string, href: string) => {
    recordRecent(name, href);
    setOpen(false);
    navigate(href);
  };

  const clearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    setRecents([]);
    saveRecents(user?.user_id, []);
  };

  const hasQuery = query.trim().length > 0;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="group flex items-center justify-center sm:justify-start gap-2 h-8 w-8 sm:w-64 px-0 sm:pl-3 sm:pr-2 rounded-lg border border-zinc-200 bg-zinc-50/80 text-zinc-400 hover:text-zinc-600 hover:bg-white hover:border-zinc-300 hover:shadow-sm transition-all flex-shrink-0"
      >
        <MagnifyingGlassIcon className="w-3.5 h-3.5 flex-shrink-0" />
        <span className="hidden sm:block text-[12px] flex-1 text-left truncate">Search pages…</span>
        <KbdGroup className="hidden sm:flex flex-shrink-0 gap-1">
          <Kbd className="border border-zinc-200">{isMac ? "⌘" : "Ctrl"}</Kbd>
          <Kbd className="border border-zinc-200">{isMac ? "⇧" : "Shift"}</Kbd>
          <Kbd className="border border-zinc-200">F</Kbd>
        </KbdGroup>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput
          ref={inputRef}
          value={query}
          onValueChange={setQuery}
          placeholder="Search pages by name…"
        />
        <CommandList>
          {!hasQuery ? (
            recents.length > 0 ? (
              <CommandGroup
                heading={
                  <div className="flex items-center justify-between w-full pr-1">
                    <span>Recent</span>
                    <button
                      onClick={clearRecents}
                      className="flex items-center gap-1 text-[10px] font-medium text-zinc-400 hover:text-zinc-700 normal-case tracking-normal"
                    >
                      <XMarkIcon className="w-3 h-3" />
                      Clear
                    </button>
                  </div>
                }
              >
                {recents.map((r) => (
                  <CommandItem
                    key={r.href}
                    value={`recent-${r.name}`}
                    onSelect={() => handleSelect(r.name, r.href)}
                    className="cursor-pointer"
                  >
                    <span className="w-5 h-5 rounded-md bg-zinc-100 flex items-center justify-center flex-shrink-0 mr-2">
                      <ClockIcon className="w-3 h-3 text-zinc-400" />
                    </span>
                    {r.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : (
              <div className="py-10 flex flex-col items-center gap-2 text-zinc-300">
                <MagnifyingGlassIcon className="w-6 h-6" />
                <p className="text-[12px]">Start typing to search pages</p>
              </div>
            )
          ) : (
            <>
              <CommandEmpty>No pages found.</CommandEmpty>
              {searchableGroups.map((group) => (
                <CommandGroup key={group.label} heading={group.label}>
                  {group.items.map((item) => (
                    <CommandItem
                      key={item.href}
                      value={item.name}
                      onSelect={() => handleSelect(item.name, item.href)}
                      className="cursor-pointer"
                    >
                      <span className={`w-5 h-5 rounded-md ${item.iconBg} flex items-center justify-center flex-shrink-0 mr-2`}>
                        <item.icon className={`w-3 h-3 ${item.iconColor}`} />
                      </span>
                      {item.name}
                    </CommandItem>
                  ))}
                </CommandGroup>
              ))}
            </>
          )}
        </CommandList>
      </CommandDialog>
    </>
  );
};
