import React, { useEffect, useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/src/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import { AppSidebar } from "./AppSidebar";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { GlobalSearch } from "./GlobalSearch";
import { useAuth } from "@/src/hooks/useAuth";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";
import { useNotificationStore } from "@/src/store/useNotificationStore";
import {
  BellIcon,
  CheckCircleIcon,
  ArrowUturnLeftIcon,
  ClipboardDocumentListIcon,
  EyeIcon,
} from "@heroicons/react/24/outline";
import { ScrollArea } from "@/src/components/ui/scroll-area";

// ─── Notification type config (mirrors SidebarNotifications) ────────────────

const TYPE_CFG = {
  budget_submitted: {
    icon: ClipboardDocumentListIcon, iconBg: "bg-blue-100", iconColor: "text-blue-600",
  },
  budget_under_review: {
    icon: EyeIcon, iconBg: "bg-indigo-100", iconColor: "text-indigo-600",
  },
  budget_approved: {
    icon: CheckCircleIcon, iconBg: "bg-emerald-100", iconColor: "text-emerald-600",
  },
  budget_returned: {
    icon: ArrowUturnLeftIcon, iconBg: "bg-amber-100", iconColor: "text-amber-600",
  },
} as const;

const TYPE_LABELS: Record<string, string> = {
  budget_submitted:    "Submitted",
  budget_under_review: "Under Review",
  budget_approved:     "Approved",
  budget_returned:     "Returned",
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ─── Header notification bell ────────────────────────────────────────────────

const HeaderNotifications: React.FC<{ role: string }> = ({ role }) => {
  const navigate       = useNavigate();
  const notifications  = useNotificationStore(s => s.notifications);
  const unreadCount    = useNotificationStore(s => s.unreadCount);
  const markRead       = useNotificationStore(s => s.markRead);
  const markAllRead    = useNotificationStore(s => s.markAllRead);
  const isAdmin        = role === "admin" || role === "super-admin";

  const handleClick = (n: typeof notifications[number]) => {
    if (!n.read_at) markRead(n.id);   // marks read, does NOT remove from the list
    if (isAdmin) {
      navigate("/admin/lbp-forms", { state: { deptId: n.dept_id } });
    } else {
      navigate(`/department-budget-plans/${n.dept_budget_plan_id}`);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-colors flex-shrink-0">
          <BellIcon className="w-4 h-4" />
          {unreadCount > 0 && (
            <span
              className={cn(
                "absolute top-0.5 right-0.5",
                "min-w-[14px] h-[14px] px-0.5 rounded-full",
                "flex items-center justify-center",
                "text-[8px] font-bold leading-none tabular-nums",
                "bg-blue-500 text-white ring-1 ring-white",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" sideOffset={8} className="w-96 rounded-xl border-zinc-200 shadow-md p-2">
        <div className="flex items-center justify-between px-1 pb-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Notifications
          </span>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="text-[10px] font-medium text-blue-600 hover:text-blue-700"
            >
              Mark all as read
            </button>
          )}
        </div>

        {notifications.length === 0 ? (
          <div className="py-6 text-center text-[11px] text-zinc-300">No notifications yet</div>
        ) : (
          <ScrollArea className="h-80">
            <div className="flex flex-col gap-1 pr-2">
              {notifications.map(n => {
                const cfg    = TYPE_CFG[n.type] ?? TYPE_CFG.budget_submitted;
                const Icon   = cfg.icon;
                const isRead = !!n.read_at;
                return (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={cn(
                      "flex items-start gap-2 rounded-lg px-2.5 py-2 border cursor-pointer transition-all",
                      isRead
                        ? "bg-white border-gray-100 hover:bg-gray-50"
                        : "bg-blue-50/70 border-blue-100 hover:bg-blue-50",
                    )}
                  >
                    <div className={cn("w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0 mt-0.5", cfg.iconBg)}>
                      <Icon className={cn("w-3.5 h-3.5", cfg.iconColor)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {!isRead && <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />}
                        <p className={cn(
                          "text-[11px] leading-tight truncate",
                          isRead ? "font-medium text-gray-500" : "font-semibold text-gray-900",
                        )}>
                          {isAdmin ? `(${n.dept_abbreviation || "Dept"})` : (TYPE_LABELS[n.type] ?? "Update")}
                        </p>
                      </div>
                      <p className={cn(
                        "text-[10px] leading-snug mt-0.5 line-clamp-2",
                        isRead ? "text-gray-400" : "text-gray-600",
                      )}>
                        {n.message}
                      </p>
                      <p className="text-[9px] text-gray-400 mt-0.5">{relTime(n.created_at)}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// ─── Helper ───────────────────────────────────────────────────────────────────

const getImageUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  const base = (import.meta.env.VITE_API_URL || "").replace(/\/$/, "");
  return `${base}/storage/${path}`;
};

// ─── Component ────────────────────────────────────────────────────────────────

const MainLayout: React.FC = () => {
  const { user } = useAuth();
  const [department, setDepartment] = useState<{
    name: string;
    logo: string | null;
  } | null>(null);

  useEffect(() => {
    if (!user?.dept_id) return;
    API.get(`/departments/${user.dept_id}`)
      .then((res) => {
        const d = res.data.data;
        setDepartment({ name: d?.dept_name ?? null, logo: d?.logo ?? null });
      })
      .catch(() => setDepartment(null));
  }, [user?.dept_id]);

  // ── Maintenance mode indicator ──────────────────────────────────────────────
  // Reaching any authenticated page while maintenance is on almost always means
  // the viewer is a super-admin (everyone else gets bounced at login), so this
  // is a persistent reminder in the header rather than a gate.
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  useEffect(() => {
    API.get('/maintenance/status')
      .then(({ data }) => setMaintenanceMode(!!data?.maintenance_mode))
      .catch(() => {});
  }, []);

  // Initials for avatar fallback
  const deptInitials = department?.name
    ? department.name.slice(0, 2).toUpperCase()
    : null;

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-w-0 h-[100dvh] max-h-[100dvh] overflow-x-hidden overflow-y-hidden flex flex-col">

        {/* ── Top Header Bar ──────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 shrink-0 grid grid-cols-[1fr_auto_1fr] items-center gap-3 h-12 border-b border-zinc-200 bg-white px-4">

          {/* LEFT: sidebar toggle + breadcrumb */}
          <div className="flex items-center gap-3 min-w-0">
            <SidebarTrigger className="text-zinc-400 hover:text-zinc-700 transition-colors -ml-1 flex-shrink-0" />
            <div className="h-4 w-px bg-zinc-200 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <BreadcrumbNav />
            </div>
          </div>

          {/* CENTER: global page search — truly centered via grid */}
          <div className="flex justify-center">
            <GlobalSearch user={user as any} />
          </div>

          {/* RIGHT: department pill + notifications */}
          <div className="flex items-center justify-end gap-2.5">
            {maintenanceMode && (
              <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 flex-shrink-0">
                <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500" />
                </span>
                <span className="text-[11px] font-semibold text-amber-700 whitespace-nowrap">System Maintenance Mode</span>
              </div>
            )}
            {department && (
              <div className="flex items-center gap-2 flex-shrink-0 pr-2.5 mr-0.5 border-r border-zinc-200 h-6">
                {department.logo ? (
                  <img
                    src={getImageUrl(department.logo)}
                    alt={department.name}
                    className="h-5 w-5 rounded-md object-cover border border-zinc-200 flex-shrink-0"
                    onError={(e) => { e.currentTarget.style.display = "none"; }}
                  />
                ) : deptInitials ? (
                  <div className="h-5 w-5 rounded-md bg-zinc-200 flex items-center justify-center text-[8px] font-bold text-zinc-600 flex-shrink-0">
                    {deptInitials}
                  </div>
                ) : null}
                <span className="text-[12px] font-semibold text-zinc-700 whitespace-nowrap">
                  {department.name}
                </span>
              </div>
            )}

            <HeaderNotifications role={user?.role ?? ""} />
          </div>
        </header>

        {/* ── Page Content ────────────────────────────────────────────── */}
        <main className="relative flex-1 min-w-0 min-h-0 overflow-hidden bg-gray-50 flex flex-col" style={{ overscrollBehavior: "contain" }}>

          {/* Watermark logo — behind content */}
          {/* <div
            className="absolute inset-0 flex items-center justify-center pointer-events-none select-none"
            aria-hidden="true"
          >
            <img
              src="/images/opol.png"
              alt=""
              className="w-[500px] h-[500px] object-contain opacity-[0.06]"
            />
          </div> */}

          {/* Routed page */}
          <div className="relative z-10 flex-1 min-h-0 overflow-y-auto">
            <Outlet />
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainLayout;
