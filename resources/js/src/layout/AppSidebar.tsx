// import { useAuth } from "@/src/hooks/useAuth";
// import { useNavigate, useLocation } from "react-router-dom";
// import { useState, useMemo, useEffect, useRef } from "react";
// import {
//   Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
//   SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
//   SidebarRail, useSidebar,
// } from "@/src/components/ui/sidebar";
// import {
//   DropdownMenu, DropdownMenuContent, DropdownMenuItem,
//   DropdownMenuSeparator, DropdownMenuTrigger,
// } from "@/src/components/ui/dropdown-menu";
// import {
//   AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
//   AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
// } from "@/src/components/ui/alert-dialog";
// import { Badge } from "@/src/components/ui/badge";
// import { Button } from "@/src/components/ui/button";
// import { Department } from "@/src/types/api";
// import { Logout01Icon, UserIcon } from "hugeicons-react";
// import { ChevronUpDownIcon } from "@/src/icons/heroicons-chevron-up-down";
// import { cn } from "@/src/lib/utils";
// import {
//   HomeIcon, DocumentTextIcon, BanknotesIcon, CurrencyDollarIcon,
//   UserGroupIcon, Square3Stack3DIcon, BuildingLibraryIcon, BuildingStorefrontIcon,
//   BuildingLibraryIcon as HeroPiggyIcon, ChartBarIcon,
//   UsersIcon, ClipboardDocumentListIcon, TableCellsIcon, CreditCardIcon, ScaleIcon,
//   ShieldCheckIcon, Cog6ToothIcon, CalculatorIcon, DocumentChartBarIcon,
//   ListBulletIcon,
// } from "@heroicons/react/24/outline";

// interface User {
//   user_id: number; username: string; fname: string; mname?: string; lname: string;
//   role: string; dept_id?: number; department?: Department;
//   is_online?: boolean; is_active?: boolean;
//   avatar?: string | null;
// }

// // ── Avatar URL helper (mirrors ProfilePage logic) ─────────────────────────────
// function getAvatarUrl(avatar?: string | null): string | null {
//   if (!avatar) return null;
//   if (avatar.startsWith("http")) return avatar;
//   return `/storage/${avatar}`;
// }

// const isEligibleDepartment = (u: User | null) => {
//   if (!u || u.role !== "department-head" || !u.department) return false;
//   const n = u.department.dept_name?.toLowerCase() ?? "";
//   const c = u.department.dept_abbreviation?.toLowerCase() ?? "";
//   return (
//     n.includes("opol community college") || n.includes("slaughterhouse") ||
//     n.includes("public market") || c === "occ" || c === "pm" || c === "sh"
//   );
// };
// const getDeptIcon = (u: User | null) => {
//   if (!u?.department) return CurrencyDollarIcon;
//   const n = u.department.dept_name?.toLowerCase() ?? "";
//   const c = u.department.dept_abbreviation?.toLowerCase() ?? "";
//   if (n.includes("opol community college") || c === "occ") return BuildingLibraryIcon;
//   return BuildingStorefrontIcon;
// };
// const getDeptName = (u: User | null) => {
//   if (!u?.department) return null;
//   const n = u.department.dept_name?.toLowerCase() ?? "";
//   const c = u.department.dept_abbreviation?.toLowerCase() ?? "";
//   if (n.includes("opol community college") || c === "occ") return "Opol Community College";
//   if (n.includes("slaughterhouse") || c === "sh") return "Slaughterhouse";
//   if (n.includes("market") || c === "pm") return "Opol Market";
//   return u.department.dept_name;
// };

// const roleConfig = {
//   "super-admin":     { label: "Super Admin",    avatarClass: "bg-violet-600", badge: "text-violet-700 bg-violet-50 border-violet-200" },
//   "admin":           { label: "Budget Officer", avatarClass: "bg-blue-600",   badge: "text-blue-700 bg-blue-50 border-blue-200"       },
//   "department-head": { label: "Dept. Head",     avatarClass: "bg-emerald-600",badge: "text-emerald-700 bg-emerald-50 border-emerald-200" },
//   "admin-hrmo":      { label: "HRMO",           avatarClass: "bg-orange-600", badge: "text-orange-700 bg-orange-50 border-orange-200" },
// } as const;

// interface NavItem {
//   name: string; href: string; icon: React.ElementType;
//   iconBg: string; iconColor: string; roles: string[];
// }

// const buildNavGroups = (user: User | null, eligible: boolean) => {
//   const deptCode = user?.department?.dept_abbreviation?.toLowerCase();
//   return [
//     {
//       label: "Overview",
//       items: [
//         { name: "Dashboard", href: "/dashboard", icon: HomeIcon, iconBg: "bg-blue-100", iconColor: "text-blue-600", roles: ["super-admin", "admin", "department-head", "admin-hrmo"] },
//       ] as NavItem[],
//     },
//     ...(eligible ? [{
//       label: "Special Accounts",
//       items: [
//         { name: "Income Special Account", href: `/department/${deptCode}-fund`, icon: getDeptIcon(user), iconBg: "bg-emerald-100", iconColor: "text-emerald-600", roles: ["department-head"] },
//       ] as NavItem[],
//     }] : []),
//     {
//       label: "Income, Budget",
//       items: [
//         { name: "Budget Plans",           href: "/admin/budget-plans",                icon: DocumentTextIcon,    iconBg: "bg-blue-100",    iconColor: "text-blue-600",    roles: ["super-admin", "admin"] },
//         { name: "Income Funds",           href: "/admin/income-general-fund",         icon: BanknotesIcon,       iconBg: "bg-emerald-100", iconColor: "text-emerald-600", roles: ["super-admin", "admin"] },
//         { name: "SA Income Consolidated", href: "/admin/consolidated-special-income", icon: TableCellsIcon,      iconBg: "bg-emerald-100", iconColor: "text-emerald-600", roles: ["super-admin", "admin"] },
//         { name: "Personnel Services",     href: "/admin/personnel-services",          icon: UserGroupIcon,       iconBg: "bg-cyan-100",    iconColor: "text-cyan-600",    roles: ["super-admin", "admin"] },
//         { name: "Obligations & Budget",   href: "/admin/lbp-form6",                   icon: DocumentTextIcon,    iconBg: "bg-teal-100",    iconColor: "text-teal-600",    roles: ["super-admin", "admin"] },
//         { name: "Allocation by Sector",   href: "/admin/lbp-form7",                   icon: TableCellsIcon,      iconBg: "bg-indigo-100",  iconColor: "text-indigo-600",  roles: ["super-admin", "admin"] },
//         { name: "PS Computation",         href: "/admin/ps-computation",              icon: CalculatorIcon,      iconBg: "bg-sky-100",     iconColor: "text-sky-600",     roles: ["super-admin", "admin"] },
//         { name: "20% MDF",                href: "/admin/mdf-fund",                    icon: HeroPiggyIcon,       iconBg: "bg-amber-100",   iconColor: "text-amber-600",   roles: ["super-admin", "admin"] },
//         { name: "5% CF",                  href: "/admin/ldrrmfip",                    icon: ShieldCheckIcon,     iconBg: "bg-red-100",     iconColor: "text-red-600",     roles: ["super-admin", "admin"] },
//         { name: "5% SA Consolidated",     href: "/admin/ldrrmf-plan",                 icon: DocumentChartBarIcon,iconBg: "bg-orange-100",  iconColor: "text-orange-600",  roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "Plans",
//       items: [
//         { name: "Special Purpose & Annual Plans", href: "/admin/plans", icon: ClipboardDocumentListIcon, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "Workbook",
//       items: [
//         { name: "General Funds",           href: "/admin/object-of-expenditures", icon: TableCellsIcon, iconBg: "bg-violet-100", iconColor: "text-violet-600", roles: ["super-admin", "admin"] },
//         { name: "Special Accounts",        href: "/admin/special-accounts",       icon: CreditCardIcon, iconBg: "bg-rose-100",   iconColor: "text-rose-600",   roles: ["super-admin", "admin"] },
//         { name: "Summary of Expenditures", href: "/admin/summary-expenditures",   icon: ListBulletIcon, iconBg: "bg-zinc-100",   iconColor: "text-zinc-600",   roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "Debt Management",
//       items: [
//         { name: "Statement of Indebtedness", href: "/admin/lbp-form5", icon: ScaleIcon, iconBg: "bg-red-100", iconColor: "text-red-600", roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "Review",
//       items: [
//         { name: "LBP Forms Review", href: "/admin/lbp-forms", icon: ClipboardDocumentListIcon, iconBg: "bg-blue-100", iconColor: "text-blue-600", roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "Reports",
//       items: [
//         { name: "LBP Forms", href: "/admin/reports-unified", icon: DocumentTextIcon, iconBg: "bg-violet-100", iconColor: "text-violet-600", roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "System",
//       items: [
//         { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon, iconBg: "bg-gray-100", iconColor: "text-gray-600", roles: ["super-admin", "admin"] },
//       ] as NavItem[],
//     },
//     {
//       label: "HRMO",
//       items: [
//         { name: "Plantilla",              href: "/hrmo/plantilla",              icon: ClipboardDocumentListIcon, iconBg: "bg-teal-100",   iconColor: "text-teal-600",   roles: ["admin-hrmo"] },
//         { name: "Personnel",              href: "/hrmo/personnel",              icon: UsersIcon,                 iconBg: "bg-sky-100",    iconColor: "text-sky-600",    roles: ["admin-hrmo"] },
//         { name: "Plantilla of Personnel", href: "/hrmo/plantilla-of-personnel", icon: Square3Stack3DIcon,        iconBg: "bg-purple-100", iconColor: "text-purple-600", roles: ["admin-hrmo"] },
//       ] as NavItem[],
//     },
//     {
//       label: "Reports",
//       items: [
//         { name: "Department Reports", href: "/department/reports", icon: DocumentTextIcon, iconBg: "bg-green-100", iconColor: "text-green-600", roles: ["department-head"] },
//       ] as NavItem[],
//     },
//   ];
// };

// // ── Circle avatar — shows real photo when available, falls back to initials ───
// const CircleAvatar = ({
//   initials,
//   colorClass,
//   avatarUrl,
//   size = "h-8 w-8",
//   textSize = "text-xs",
// }: {
//   initials: string;
//   colorClass: string;
//   avatarUrl?: string | null;
//   size?: string;
//   textSize?: string;
// }) => {
//   const [imgFailed, setImgFailed] = useState(false);
//   const showImg = !!avatarUrl && !imgFailed;

//   return (
//     <div
//       className={cn(
//         size,
//         "rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white overflow-hidden",
//         textSize,
//         // Only apply the color background when showing initials
//         !showImg && colorClass,
//       )}
//     >
//       {showImg ? (
//         <img
//           src={avatarUrl!}
//           alt="avatar"
//           className="w-full h-full object-cover"
//           onError={() => setImgFailed(true)}
//         />
//       ) : (
//         initials
//       )}
//     </div>
//   );
// };

// export function AppSidebar() {
//   const { user, logout, loading } = useAuth();
//   const navigate  = useNavigate();
//   const location  = useLocation();
//   const { state } = useSidebar();
//   const [showLogout, setShowLogout] = useState(false);
//   const [animKey,    setAnimKey]    = useState(0);

//   const typedUser = user as User | null;
//   const eligible  = useMemo(() => isEligibleDepartment(typedUser), [typedUser]);
//   const deptName  = useMemo(() => getDeptName(typedUser), [typedUser]);
//   const navGroups = useMemo(() => buildNavGroups(typedUser, eligible), [typedUser, eligible]);
//   const role      = (typedUser?.role ?? "admin-hrmo") as keyof typeof roleConfig;
//   const rc        = roleConfig[role] ?? roleConfig["admin-hrmo"];

//   const prevState = useRef(state);
//   useEffect(() => {
//     if (prevState.current !== state && state === "expanded") setAnimKey(k => k + 1);
//     prevState.current = state;
//   }, [state]);

//   if (loading) return null;

//   const isActive = (path: string) =>
//     path === "/admin/settings"
//       ? location.pathname.startsWith("/admin/settings")
//       : location.pathname === path;

//   const confirmLogout = async () => {
//     setShowLogout(false);
//     await logout();
//     navigate("/", { replace: true });
//   };

//   // const sa = (idx: number) => `sb-item sb-item-${(idx % 12) + 1}`;
//   const sa = (idx: number) => `sb-item sb-item-${((Math.abs(idx) % 12) + 1)}`;
//   const initials  = `${typedUser?.fname?.charAt(0) ?? ""}${typedUser?.lname?.charAt(0) ?? ""}`.toUpperCase() || "U";
//   const fullName  = `${typedUser?.fname ?? ""} ${typedUser?.lname ?? ""}`.trim();
//   const avatarUrl = getAvatarUrl(typedUser?.avatar);

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
//         [data-sidebar="sidebar"] { font-family: 'Geist', sans-serif; }
//         .sb-mono { font-family: 'Geist Mono', monospace; }
//         .sb-item { opacity:0; transform:translateX(-8px); animation:sbIn .3s cubic-bezier(.25,.8,.25,1) forwards; }
//         @keyframes sbIn { to { opacity:1; transform:translateX(0); } }
//         .sb-item-1{animation-delay:.03s}.sb-item-2{animation-delay:.06s}.sb-item-3{animation-delay:.09s}
// .sb-item-4{animation-delay:.12s}.sb-item-5{animation-delay:.15s}.sb-item-6{animation-delay:.18s}
// .sb-item-7{animation-delay:.21s}.sb-item-8{animation-delay:.24s}.sb-item-9{animation-delay:.27s}
// .sb-item-10{animation-delay:.30s}.sb-item-11{animation-delay:.33s}.sb-item-12{animation-delay:.36s}
//         .sb-btn { display:flex; align-items:center; gap:9px; width:100%; border-radius:8px; padding:6px 8px; font-size:13px; font-weight:500; background:transparent; border:none; cursor:pointer; color:hsl(240 3.8% 40%); transition:background .12s ease,color .12s ease; text-align:left; white-space:nowrap; overflow:hidden; }
//         .sb-btn:hover { background:hsl(240 4.8% 95.9%); color:hsl(240 5.9% 10%); }
//         .sb-btn.active { background:hsl(240 5.9% 10%); color:#fff; position:relative; }
//         .sb-btn.active::before { content:''; position:absolute; left:0; top:50%; transform:translateY(-50%); width:3px; height:55%; border-radius:0 2px 2px 0; background:#fff; }
//         .sb-btn.active .sb-icon-tile { opacity:.92; filter:brightness(1.05); }
//         .sb-btn.active .sb-label-text { color:#fff; }
//         .sb-icon-tile { width:22px; height:22px; border-radius:5px; display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:opacity .12s ease; }
//         .sb-icon-tile svg { width:13px; height:13px; }
//         .sb-section-label { font-size:10px; font-weight:600; letter-spacing:.08em; text-transform:uppercase; color:hsl(240 3.8% 65%); padding:0 8px; margin-bottom:2px; display:block; }
//         /* Override shadcn !size-8 on the user footer button when collapsed */
//         [data-collapsible=icon] .sb-user-btn[data-sidebar="menu-button"] {
//           width: 100% !important;
//           height: auto !important;
//           padding: 0 !important;
//           justify-content: flex-start !important;
//         }
//       `}</style>

//       <Sidebar collapsible="icon" className="border-r border-zinc-200 bg-white">

//         {/* ══ HEADER ══════════════════════════════════════ */}
//         <SidebarHeader className="px-3 pt-4 pb-3 border-b border-zinc-100">
//           <div key={`hd-${animKey}`} className={cn("flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center", sa(1))}>
//             <div className="flex-shrink-0">
//               <img src="/images/opol.png" alt="MBO" className="w-8 h-8 object-contain"
//                 onError={e => { e.currentTarget.style.display="none"; (e.currentTarget.parentElement as HTMLElement).innerHTML='<span class="sb-mono" style="font-size:10px;font-weight:700;color:hsl(240 5.9% 10%)">MBO</span>'; }} />
//             </div>
//             <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
//               <span className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">Municipal Budget Office</span>
//               <span className="sb-mono text-[10px] text-zinc-400 mt-0.5">Opol LGU · FY {new Date().getFullYear()}</span>
//             </div>
//           </div>
//           <div key={`tags-${animKey}`} className={cn("mt-3 flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden", sa(2))}>
//             <Badge variant="outline" className={cn("self-start text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5", rc.badge)}>{rc.label}</Badge>
//             {typedUser?.role === "department-head" && deptName && (
//               <Badge variant="outline" className="self-start text-[10px] font-normal text-zinc-500 bg-zinc-50 border-zinc-200 px-2 py-0.5 normal-case tracking-normal">{deptName}</Badge>
//             )}
//           </div>
//         </SidebarHeader>

//         {/* ══ NAV ═════════════════════════════════════════ */}
//         <SidebarContent className="px-2 py-3">
//           {(() => {
//             let idx = 2;
//             return navGroups.map(group => {
//               const items = group.items.filter(it => it.roles.includes(typedUser?.role ?? ""));
//               if (!items.length) return null;
//               return (
//                 <SidebarGroup key={group.label} className="p-0 mb-3">
//                   <span key={`lbl-${group.label}-${animKey}`} className={cn("sb-section-label group-data-[collapsible=icon]:hidden", sa(++idx))}>{group.label}</span>
//                   <SidebarMenu className="gap-0.5">
//                     {items.map(item => {
//                       const Icon = item.icon;
//                       const active = isActive(item.href);
//                       idx++;
//                       // return (
//                       //   <SidebarMenuItem key={item.name}>
//                       //     <SidebarMenuButton asChild tooltip={item.name}>
//                       //       <button key={`nav-${item.name}-${animKey}`} onClick={() => navigate(item.href)} className={cn("sb-btn", active && "active", sa(idx))}>
//                         return (
//                           <SidebarMenuItem key={`${item.name}-${animKey}`}>
//                             <SidebarMenuButton asChild tooltip={item.name}>
//                               <button onClick={() => navigate(item.href)} className={cn("sb-btn", active && "active", sa(idx))}>
//                               <span className={cn("sb-icon-tile", item.iconBg)}><Icon className={item.iconColor} /></span>
//                               <span className="sb-label-text group-data-[collapsible=icon]:hidden truncate">{item.name}</span>
//                             </button>
//                           </SidebarMenuButton>
//                         </SidebarMenuItem>
//                       );
//                     })}
//                   </SidebarMenu>
//                 </SidebarGroup>
//               );
//             });
//           })()}
//         </SidebarContent>

//         {/* ══ FOOTER ══════════════════════════════════════ */}
//         <SidebarFooter className="p-2 border-t border-zinc-100">
//           <SidebarMenu>
//             <SidebarMenuItem>
//               <DropdownMenu>
//                 <DropdownMenuTrigger asChild>
//                   <SidebarMenuButton tooltip={fullName} data-user-btn className="sb-user-btn h-auto p-0 hover:bg-transparent active:bg-transparent focus-visible:ring-0">

//                     {/* ── Expanded ── */}
//                     <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer">
//                       <CircleAvatar
//                         initials={initials}
//                         colorClass={rc.avatarClass}
//                         avatarUrl={avatarUrl}
//                         size="h-7 w-7"
//                         textSize="text-xs"
//                       />
//                       <div className="flex flex-col flex-1 overflow-hidden min-w-0">
//                         <span className="text-[13px] font-semibold text-zinc-800 truncate leading-tight">{fullName}</span>
//                         <span className="sb-mono text-[10px] text-zinc-400 truncate">@{typedUser?.username}</span>
//                       </div>
//                       <ChevronUpDownIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
//                     </div>

//                     {/* ── Collapsed — circle only ── */}
//                     <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full">
//                       <CircleAvatar
//                         initials={initials}
//                         colorClass={rc.avatarClass}
//                         avatarUrl={avatarUrl}
//                         size="h-8 w-8"
//                         textSize="text-xs"
//                       />
//                     </div>

//                   </SidebarMenuButton>
//                 </DropdownMenuTrigger>

//                 <DropdownMenuContent align="end" side="top" sideOffset={6} className="w-56 rounded-xl border-zinc-200 shadow-md p-1.5">

//                   {/* Dropdown header */}
//                   <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5">
//                     <CircleAvatar
//                       initials={initials}
//                       colorClass={rc.avatarClass}
//                       avatarUrl={avatarUrl}
//                       size="h-8 w-8"
//                       textSize="text-xs"
//                     />
//                     <div className="overflow-hidden">
//                       <p className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">{fullName}</p>
//                       <p className="sb-mono text-[10px] text-zinc-400 truncate">@{typedUser?.username}</p>
//                     </div>
//                   </div>

//                   <DropdownMenuSeparator className="bg-zinc-100 my-1" />
//                   <DropdownMenuItem onClick={() => navigate("/profile")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-zinc-600 cursor-pointer">
//                     <UserIcon className="w-4 h-4 text-zinc-400" />View Profile
//                   </DropdownMenuItem>
//                   <DropdownMenuSeparator className="bg-zinc-100 my-1" />
//                   <DropdownMenuItem onClick={() => setShowLogout(true)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
//                     <Logout01Icon className="w-4 h-4" />Sign out
//                   </DropdownMenuItem>

//                 </DropdownMenuContent>
//               </DropdownMenu>
//             </SidebarMenuItem>
//           </SidebarMenu>
//         </SidebarFooter>

//         <SidebarRail />
//       </Sidebar>

//       {/* ── Logout dialog ───────────────────────────────── */}
//       <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
//         <AlertDialogContent className="rounded-2xl max-w-sm border-zinc-200 gap-4">
//           <AlertDialogHeader>
//             <AlertDialogTitle className="text-[15px] font-semibold text-zinc-900">Sign out?</AlertDialogTitle>
//             <AlertDialogDescription className="text-sm text-zinc-500">You'll need to sign back in to access the system.</AlertDialogDescription>
//           </AlertDialogHeader>
//           <AlertDialogFooter>
//             <AlertDialogCancel asChild><Button variant="outline" size="sm" className="rounded-lg border-zinc-200 text-zinc-700">Cancel</Button></AlertDialogCancel>
//             <AlertDialogAction asChild><Button size="sm" className="rounded-lg bg-zinc-900 hover:bg-zinc-800" onClick={confirmLogout}>Sign out</Button></AlertDialogAction>
//           </AlertDialogFooter>
//         </AlertDialogContent>
//       </AlertDialog>
//     </>
//   );
// }
import { useAuth } from "@/src/hooks/useAuth";
import { useNavigate, useLocation } from "react-router-dom";
import { useState, useMemo, useEffect, useRef } from "react";
import {
  Sidebar, SidebarContent, SidebarFooter, SidebarGroup,
  SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarRail, useSidebar,
} from "@/src/components/ui/sidebar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/src/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/src/components/ui/alert-dialog";
import { Badge } from "@/src/components/ui/badge";
import { Button } from "@/src/components/ui/button";
import { Department } from "@/src/types/api";
import { Logout01Icon, UserIcon } from "hugeicons-react";
import { ChevronUpDownIcon } from "@/src/icons/heroicons-chevron-up-down";
import { cn } from "@/src/lib/utils";
import {
  HomeIcon, DocumentTextIcon, BanknotesIcon, CurrencyDollarIcon,
  UserGroupIcon, Square3Stack3DIcon, BuildingLibraryIcon, BuildingStorefrontIcon,
  BuildingLibraryIcon as HeroPiggyIcon,
  UsersIcon, ClipboardDocumentListIcon, TableCellsIcon, CreditCardIcon, ScaleIcon,
  ShieldCheckIcon, Cog6ToothIcon, CalculatorIcon, DocumentChartBarIcon,
  ListBulletIcon,
} from "@heroicons/react/24/outline";

interface User {
  user_id: number; username: string; fname: string; mname?: string; lname: string;
  role: string; dept_id?: number; department?: Department;
  is_online?: boolean; is_active?: boolean;
  avatar?: string | null;
}

function getAvatarUrl(avatar?: string | null): string | null {
  if (!avatar) return null;
  if (avatar.startsWith("http")) return avatar;
  return `/storage/${avatar}`;
}

const isEligibleDepartment = (u: User | null) => {
  if (!u || u.role !== "department-head" || !u.department) return false;
  const n = u.department.dept_name?.toLowerCase() ?? "";
  const c = u.department.dept_abbreviation?.toLowerCase() ?? "";
  return (
    n.includes("opol community college") || n.includes("slaughterhouse") ||
    n.includes("public market") || c === "occ" || c === "pm" || c === "sh"
  );
};
const getDeptIcon = (u: User | null) => {
  if (!u?.department) return CurrencyDollarIcon;
  const n = u.department.dept_name?.toLowerCase() ?? "";
  const c = u.department.dept_abbreviation?.toLowerCase() ?? "";
  if (n.includes("opol community college") || c === "occ") return BuildingLibraryIcon;
  return BuildingStorefrontIcon;
};
const getDeptName = (u: User | null) => {
  if (!u?.department) return null;
  const n = u.department.dept_name?.toLowerCase() ?? "";
  const c = u.department.dept_abbreviation?.toLowerCase() ?? "";
  if (n.includes("opol community college") || c === "occ") return "Opol Community College";
  if (n.includes("slaughterhouse") || c === "sh") return "Slaughterhouse";
  if (n.includes("market") || c === "pm") return "Opol Market";
  return u.department.dept_name;
};

const roleConfig = {
  "super-admin":     { label: "Super Admin",    avatarClass: "bg-violet-600", badge: "text-violet-700 bg-violet-50 border-violet-200" },
  "admin":           { label: "Budget Officer", avatarClass: "bg-blue-600",   badge: "text-blue-700 bg-blue-50 border-blue-200"       },
  "department-head": { label: "Dept. Head",     avatarClass: "bg-emerald-600",badge: "text-emerald-700 bg-emerald-50 border-emerald-200" },
  "admin-hrmo":      { label: "HRMO",           avatarClass: "bg-orange-600", badge: "text-orange-700 bg-orange-50 border-orange-200" },
} as const;

interface NavItem {
  name: string; href: string; icon: React.ElementType;
  iconBg: string; iconColor: string; roles: string[];
}

const buildNavGroups = (user: User | null, eligible: boolean) => {
  const deptCode = user?.department?.dept_abbreviation?.toLowerCase();
  return [
    {
      label: "Overview",
      items: [
        { name: "Dashboard", href: "/dashboard", icon: HomeIcon, iconBg: "bg-blue-100", iconColor: "text-blue-600", roles: ["super-admin", "admin", "department-head", "admin-hrmo"] },
      ] as NavItem[],
    },
    ...(eligible ? [{
      label: "Special Accounts",
      items: [
        { name: "Income Special Account", href: `/department/${deptCode}-fund`, icon: getDeptIcon(user), iconBg: "bg-emerald-100", iconColor: "text-emerald-600", roles: ["department-head"] },
        { 
          name: "5% Calamity Fund", 
          href: `/admin/${deptCode}-cf`,   // ← was /department/${deptCode}-cf
          icon: ShieldCheckIcon, 
          iconBg: "bg-red-100", 
          iconColor: "text-red-600", 
          roles: ["department-head"] 
        },
      ] as NavItem[],
    }] : []),
    {
      label: "Budget",
      items: [{
        name: "Budget Proposal",
        href: "/department/budget-proposal",
        icon: DocumentTextIcon,
        iconBg: "bg-indigo-100",
        iconColor: "text-indigo-600",
        roles: ["department-head"],
      }] as NavItem[],
    },
    {
      label: "Income, Budget",
      items: [
        { name: "Budget Plans",           href: "/admin/budget-plans",                icon: DocumentTextIcon,    iconBg: "bg-blue-100",    iconColor: "text-blue-600",    roles: ["super-admin", "admin"] },
        { name: "Income Funds",           href: "/admin/income-general-fund",         icon: BanknotesIcon,       iconBg: "bg-emerald-100", iconColor: "text-emerald-600", roles: ["super-admin", "admin"] },
        { name: "SA Income Consolidated", href: "/admin/consolidated-special-income", icon: TableCellsIcon,      iconBg: "bg-emerald-100", iconColor: "text-emerald-600", roles: ["super-admin", "admin"] },
        { name: "Personnel Services",     href: "/admin/personnel-services",          icon: UserGroupIcon,       iconBg: "bg-cyan-100",    iconColor: "text-cyan-600",    roles: ["super-admin", "admin"] },
        { name: "Obligations & Budget",   href: "/admin/lbp-form6",                   icon: DocumentTextIcon,    iconBg: "bg-teal-100",    iconColor: "text-teal-600",    roles: ["super-admin", "admin"] },
        { name: "Allocation by Sector",   href: "/admin/lbp-form7",                   icon: TableCellsIcon,      iconBg: "bg-indigo-100",  iconColor: "text-indigo-600",  roles: ["super-admin", "admin"] },
        { name: "PS Computation",         href: "/admin/ps-computation",              icon: CalculatorIcon,      iconBg: "bg-sky-100",     iconColor: "text-sky-600",     roles: ["super-admin", "admin"] },
        { name: "20% MDF",                href: "/admin/mdf-fund",                    icon: HeroPiggyIcon,       iconBg: "bg-amber-100",   iconColor: "text-amber-600",   roles: ["super-admin", "admin"] },
        { name: "5% CF",                  href: "/admin/ldrrmfip",                    icon: ShieldCheckIcon,     iconBg: "bg-red-100",     iconColor: "text-red-600",     roles: ["super-admin", "admin"] },
        { name: "5% SA Consolidated",     href: "/admin/ldrrmf-plan",                 icon: DocumentChartBarIcon,iconBg: "bg-orange-100",  iconColor: "text-orange-600",  roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "Plans",
      items: [
        { name: "Special Purpose & Annual Plans", href: "/admin/plans", icon: ClipboardDocumentListIcon, iconBg: "bg-indigo-100", iconColor: "text-indigo-600", roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "Workbook",
      items: [
        { name: "General Funds",           href: "/admin/object-of-expenditures", icon: TableCellsIcon, iconBg: "bg-violet-100", iconColor: "text-violet-600", roles: ["super-admin", "admin"] },
        { name: "Special Accounts",        href: "/admin/special-accounts",       icon: CreditCardIcon, iconBg: "bg-rose-100",   iconColor: "text-rose-600",   roles: ["super-admin", "admin"] },
        { name: "Summary of Expenditures", href: "/admin/summary-expenditures",   icon: ListBulletIcon, iconBg: "bg-zinc-100",   iconColor: "text-zinc-600",   roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "Debt Management",
      items: [
        { name: "Statement of Indebtedness", href: "/admin/lbp-form5", icon: ScaleIcon, iconBg: "bg-red-100", iconColor: "text-red-600", roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "Review",
      items: [
        { name: "LBP Forms Review", href: "/admin/lbp-forms", icon: ClipboardDocumentListIcon, iconBg: "bg-blue-100", iconColor: "text-blue-600", roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "Reports",
      items: [
        { name: "LBP Forms", href: "/admin/reports-unified", icon: DocumentTextIcon, iconBg: "bg-violet-100", iconColor: "text-violet-600", roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "System",
      items: [
        { name: "Settings", href: "/admin/settings", icon: Cog6ToothIcon, iconBg: "bg-gray-100", iconColor: "text-gray-600", roles: ["super-admin", "admin"] },
      ] as NavItem[],
    },
    {
      label: "HRMO",
      items: [
        { name: "Plantilla",              href: "/hrmo/plantilla",              icon: ClipboardDocumentListIcon, iconBg: "bg-teal-100",   iconColor: "text-teal-600",   roles: ["admin-hrmo"] },
        { name: "Personnel",              href: "/hrmo/personnel",              icon: UsersIcon,                 iconBg: "bg-sky-100",    iconColor: "text-sky-600",    roles: ["admin-hrmo"] },
        { name: "Plantilla of Personnel", href: "/hrmo/plantilla-of-personnel", icon: Square3Stack3DIcon,        iconBg: "bg-purple-100", iconColor: "text-purple-600", roles: ["admin-hrmo"] },
      ] as NavItem[],
    },
    {
      label: "Reports",
      items: [
        { name: "Department Reports", href: "/department/reports", icon: DocumentTextIcon, iconBg: "bg-green-100", iconColor: "text-green-600", roles: ["department-head"] },
      ] as NavItem[],
    },
    {
      label: "Settings",
      items: [{
        name: "Department",
        href: "/department/settings",
        icon: Cog6ToothIcon,
        iconBg: "bg-gray-100",
        iconColor: "text-gray-600",
        roles: ["department-head"],
      }] as NavItem[],
    },
    

  ];
};

const CircleAvatar = ({
  initials, colorClass, avatarUrl,
  size = "h-8 w-8", textSize = "text-xs",
}: {
  initials: string; colorClass: string; avatarUrl?: string | null;
  size?: string; textSize?: string;
}) => {
  const [imgFailed, setImgFailed] = useState(false);
  const showImg = !!avatarUrl && !imgFailed;
  return (
    <div className={cn(size, "rounded-full flex-shrink-0 flex items-center justify-center font-bold text-white overflow-hidden", textSize, !showImg && colorClass)}>
      {showImg
        ? <img src={avatarUrl!} alt="avatar" className="w-full h-full object-cover" onError={() => setImgFailed(true)} />
        : initials
      }
    </div>
  );
};

export function AppSidebar() {
  const { user, logout, loading } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const { state } = useSidebar();
  const [showLogout, setShowLogout] = useState(false);
  const [animKey,    setAnimKey]    = useState(0);

  const typedUser = user as User | null;
  const eligible  = useMemo(() => isEligibleDepartment(typedUser), [typedUser]);
  const deptName  = useMemo(() => getDeptName(typedUser), [typedUser]);
  const navGroups = useMemo(() => buildNavGroups(typedUser, eligible), [typedUser, eligible]);
  const role      = (typedUser?.role ?? "admin-hrmo") as keyof typeof roleConfig;
  const rc        = roleConfig[role] ?? roleConfig["admin-hrmo"];

  const prevState = useRef(state);
  useEffect(() => {
    if (prevState.current !== state && state === "expanded") setAnimKey(k => k + 1);
    prevState.current = state;
  }, [state]);

  if (loading) return null;

  const isActive = (path: string) =>
    path === "/admin/settings"
      ? location.pathname.startsWith("/admin/settings")
      : location.pathname === path;

  const confirmLogout = async () => {
    setShowLogout(false);
    await logout();
    navigate("/", { replace: true });
  };

  // ── Build a flat list of every visible nav item in render order ──────────
  // This gives each item a stable sequential index (0-based) regardless of
  // how many groups or role-filtered items exist, so stagger is always uniform.
  const flatItems = useMemo(() => {
    const list: { groupLabel: string; item: NavItem }[] = [];
    navGroups.forEach(group => {
      const items = group.items.filter(it => it.roles.includes(typedUser?.role ?? ""));
      items.forEach(item => list.push({ groupLabel: group.label, item }));
    });
    return list;
  }, [navGroups, typedUser]);

  // Returns inline style for a given sequential slot (0-based).
  // Each slot steps by 35ms; max visible delay capped at ~600ms.
  const staggerStyle = (slot: number): React.CSSProperties => ({
    opacity: 0,
    transform: "translateX(-8px)",
    animation: "sbIn .28s cubic-bezier(.25,.8,.25,1) forwards",
    animationDelay: `${Math.min(slot * 35, 600)}ms`,
  });

  // Header items get slots 0 and 1; nav items start at slot 2.
  const navItemSlot = (globalIndex: number) => globalIndex + 2;

  const initials  = `${typedUser?.fname?.charAt(0) ?? ""}${typedUser?.lname?.charAt(0) ?? ""}`.toUpperCase() || "U";
  const fullName  = `${typedUser?.fname ?? ""} ${typedUser?.lname ?? ""}`.trim();
  const avatarUrl = getAvatarUrl(typedUser?.avatar);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Geist:wght@300;400;500;600;700&family=Geist+Mono:wght@400;500&display=swap');
        [data-sidebar="sidebar"] { font-family: 'Geist', sans-serif; }
        .sb-mono { font-family: 'Geist Mono', monospace; }

        @keyframes sbIn {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }

        @media (prefers-reduced-motion: reduce) {
          [data-sidebar="sidebar"] * { animation: none !important; opacity: 1 !important; transform: none !important; }
        }

        .sb-btn {
          display: flex; align-items: center; gap: 9px; width: 100%;
          border-radius: 8px; padding: 6px 8px; font-size: 13px; font-weight: 500;
          background: transparent; border: none; cursor: pointer;
          color: hsl(240 3.8% 40%);
          transition: background .12s ease, color .12s ease;
          text-align: left; white-space: nowrap; overflow: hidden;
        }
        .sb-btn:hover { background: hsl(240 4.8% 95.9%); color: hsl(240 5.9% 10%); }
        .sb-btn.active {
          background: hsl(240 5.9% 10%); color: #fff; position: relative;
        }
        .sb-btn.active::before {
          content: ''; position: absolute; left: 0; top: 50%; transform: translateY(-50%);
          width: 3px; height: 55%; border-radius: 0 2px 2px 0; background: #fff;
        }
        .sb-btn.active .sb-icon-tile { opacity: .92; filter: brightness(1.05); }
        .sb-btn.active .sb-label-text { color: #fff; }
        .sb-icon-tile {
          width: 22px; height: 22px; border-radius: 5px;
          display: flex; align-items: center; justify-content: center;
          flex-shrink: 0; transition: opacity .12s ease;
        }
        .sb-icon-tile svg { width: 13px; height: 13px; }
        .sb-section-label {
          font-size: 10px; font-weight: 600; letter-spacing: .08em; text-transform: uppercase;
          color: hsl(240 3.8% 65%); padding: 0 8px; margin-bottom: 2px; display: block;
        }
        [data-collapsible=icon] .sb-user-btn[data-sidebar="menu-button"] {
          width: 100% !important; height: auto !important;
          padding: 0 !important; justify-content: flex-start !important;
        }
      `}</style>

      <Sidebar collapsible="icon" className="border-r border-zinc-200 bg-white">

        {/* ══ HEADER ══════════════════════════════════════ */}
        <SidebarHeader className="px-3 pt-4 pb-3 border-b border-zinc-100">

          {/* Logo row — slot 0 */}
          <div
            key={`hd-${animKey}`}
            className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center"
            style={staggerStyle(0)}
          >
            <div className="flex-shrink-0">
              <img
                src="/images/opol.png" alt="MBO" className="w-8 h-8 object-contain"
                onError={e => {
                  e.currentTarget.style.display = "none";
                  (e.currentTarget.parentElement as HTMLElement).innerHTML =
                    '<span class="sb-mono" style="font-size:10px;font-weight:700;color:hsl(240 5.9% 10%)">MBO</span>';
                }}
              />
            </div>
            <div className="flex flex-col group-data-[collapsible=icon]:hidden min-w-0">
              <span className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">Municipal Budget Office</span>
              <span className="sb-mono text-[10px] text-zinc-400 mt-0.5">Opol LGU · FY {new Date().getFullYear()}</span>
            </div>
          </div>

          {/* Role badges — slot 1 */}
          <div
            key={`tags-${animKey}`}
            className="mt-3 flex flex-col gap-1.5 group-data-[collapsible=icon]:hidden"
            style={staggerStyle(1)}
          >
            <Badge variant="outline" className={cn("self-start text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5", rc.badge)}>
              {rc.label}
            </Badge>
            {typedUser?.role === "department-head" && deptName && (
              <Badge variant="outline" className="self-start text-[10px] font-normal text-zinc-500 bg-zinc-50 border-zinc-200 px-2 py-0.5 normal-case tracking-normal">
                {deptName}
              </Badge>
            )}
          </div>

        </SidebarHeader>

        {/* ══ NAV ═════════════════════════════════════════ */}
        <SidebarContent className="px-2 py-3">
          {(() => {
            // Track which flat index we're on as we iterate groups
            let flatIdx = 0;

            return navGroups.map(group => {
              const items = group.items.filter(it => it.roles.includes(typedUser?.role ?? ""));
              if (!items.length) return null;

              // Slot for the section label = current flatIdx position
              const labelSlot = navItemSlot(flatIdx);

              return (
                <SidebarGroup key={group.label} className="p-0 mb-3">

                  {/* Section label */}
                  <span
                    key={`lbl-${group.label}-${animKey}`}
                    className="sb-section-label group-data-[collapsible=icon]:hidden"
                    style={staggerStyle(labelSlot)}
                  >
                    {group.label}
                  </span>

                  <SidebarMenu className="gap-0.5">
                    {items.map(item => {
                      const Icon = item.icon;
                      const active = isActive(item.href);
                      // Each item gets the next sequential slot
                      flatIdx++;
                      const itemSlot = navItemSlot(flatIdx);

                      return (
                        <SidebarMenuItem key={`${item.name}-${animKey}`}>
                          <SidebarMenuButton asChild tooltip={item.name}>
                            <button
                              onClick={() => navigate(item.href)}
                              className={cn("sb-btn", active && "active")}
                              style={staggerStyle(itemSlot)}
                            >
                              <span className={cn("sb-icon-tile", item.iconBg)}>
                                <Icon className={item.iconColor} />
                              </span>
                              <span className="sb-label-text group-data-[collapsible=icon]:hidden truncate">
                                {item.name}
                              </span>
                            </button>
                          </SidebarMenuButton>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>

                </SidebarGroup>
              );
            });
          })()}
        </SidebarContent>

        {/* ══ FOOTER ══════════════════════════════════════ */}
        <SidebarFooter className="p-2 border-t border-zinc-100">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={fullName}
                    data-user-btn
                    className="sb-user-btn h-auto p-0 hover:bg-transparent active:bg-transparent focus-visible:ring-0"
                  >
                    {/* Expanded */}
                    <div className="group-data-[collapsible=icon]:hidden flex items-center gap-2.5 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-2.5 py-2 hover:bg-zinc-100 hover:border-zinc-300 transition-colors cursor-pointer">
                      <CircleAvatar initials={initials} colorClass={rc.avatarClass} avatarUrl={avatarUrl} size="h-7 w-7" textSize="text-xs" />
                      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
                        <span className="text-[13px] font-semibold text-zinc-800 truncate leading-tight">{fullName}</span>
                        <span className="sb-mono text-[10px] text-zinc-400 truncate">@{typedUser?.username}</span>
                      </div>
                      <ChevronUpDownIcon className="w-3.5 h-3.5 text-zinc-400 flex-shrink-0" />
                    </div>

                    {/* Collapsed */}
                    <div className="hidden group-data-[collapsible=icon]:flex items-center justify-center w-full">
                      <CircleAvatar initials={initials} colorClass={rc.avatarClass} avatarUrl={avatarUrl} size="h-8 w-8" textSize="text-xs" />
                    </div>
                  </SidebarMenuButton>
                </DropdownMenuTrigger>

                <DropdownMenuContent align="end" side="top" sideOffset={6} className="w-56 rounded-xl border-zinc-200 shadow-md p-1.5">
                  <div className="flex items-center gap-2.5 px-2.5 py-2 mb-0.5">
                    <CircleAvatar initials={initials} colorClass={rc.avatarClass} avatarUrl={avatarUrl} size="h-8 w-8" textSize="text-xs" />
                    <div className="overflow-hidden">
                      <p className="text-[13px] font-semibold text-zinc-900 leading-tight truncate">{fullName}</p>
                      <p className="sb-mono text-[10px] text-zinc-400 truncate">@{typedUser?.username}</p>
                    </div>
                  </div>
                  <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                  <DropdownMenuItem onClick={() => navigate("/profile")} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-zinc-600 cursor-pointer">
                    <UserIcon className="w-4 h-4 text-zinc-400" />View Profile
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-zinc-100 my-1" />
                  <DropdownMenuItem onClick={() => setShowLogout(true)} className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-red-600 cursor-pointer focus:text-red-600 focus:bg-red-50">
                    <Logout01Icon className="w-4 h-4" />Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>

        <SidebarRail />
      </Sidebar>

      {/* ── Logout dialog ── */}
      <AlertDialog open={showLogout} onOpenChange={setShowLogout}>
        <AlertDialogContent className="rounded-2xl max-w-sm border-zinc-200 gap-4">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[15px] font-semibold text-zinc-900">Sign out?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm text-zinc-500">You'll need to sign back in to access the system.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel asChild>
              <Button variant="outline" size="sm" className="rounded-lg border-zinc-200 text-zinc-700">Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button size="sm" className="rounded-lg bg-zinc-900 hover:bg-zinc-800" onClick={confirmLogout}>Sign out</Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}