import React, { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import {
  SidebarProvider,
  SidebarTrigger,
  SidebarInset,
} from "@/src/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { BreadcrumbNav } from "./BreadcrumbNav";
import { useAuth } from "@/src/hooks/useAuth";
import API from "@/src/services/api";
import { cn } from "@/src/lib/utils";

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

  // Initials for avatar fallback
  const deptInitials = department?.name
    ? department.name.slice(0, 2).toUpperCase()
    : null;

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset className="min-w-0 overflow-x-hidden">

        {/* ── Top Header Bar ──────────────────────────────────────────── */}
        <header className="sticky top-0 z-20 flex h-12 items-center gap-3 border-b border-zinc-200 bg-white px-4">

          {/* Sidebar toggle */}
          <SidebarTrigger className="text-zinc-400 hover:text-zinc-700 transition-colors -ml-1" />

          {/* Vertical divider */}
          <div className="h-4 w-px bg-zinc-200 flex-shrink-0" />

          {/* Breadcrumb */}
          <div className="flex-1 min-w-0">
            <BreadcrumbNav />
          </div>

          {/* Department pill — only for department-head */}
          {department && (
            <div className="flex items-center gap-2 ml-auto flex-shrink-0 pl-3 border-l border-zinc-100">
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
              <span className="text-[12px] font-semibold text-zinc-700 truncate max-w-[180px]">
                {department.name}
              </span>
            </div>
          )}
        </header>

        {/* ── Page Content ────────────────────────────────────────────── */}
        <main className="relative flex-1 min-w-0 overflow-x-auto bg-gray-50">

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
          <div className="relative z-10">
            <Outlet />
          </div>

        </main>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default MainLayout;
