// import React from 'react';
// import { useLocation, Link } from 'react-router-dom';
// import {
//   Breadcrumb,
//   BreadcrumbItem,
//   BreadcrumbLink,
//   BreadcrumbList,
//   BreadcrumbPage,
//   BreadcrumbSeparator,
// } from '@/src/components/ui/breadcrumb';

// export const BreadcrumbNav: React.FC = () => {
//   const location = useLocation();
//   const pathname = location.pathname;

//   // Build breadcrumb items explicitly for each route
//   let breadcrumbItems: { to?: string; name: string }[] = [];

//   // Always start with Dashboard (linked)
//   breadcrumbItems.push({ to: '/dashboard', name: 'Dashboard' });

//   // Handle specific routes
//   if (pathname.startsWith('/admin/object-of-expenditures')) {
//     breadcrumbItems.push({ name: 'Object of Expenditures' });
//   } else if (pathname.startsWith('/admin/lbp-forms')) {
//     breadcrumbItems.push({ name: 'LBP Forms' });
//   } else if (pathname.startsWith('/hrmo/tranche')) {
//     breadcrumbItems.push({ name: 'Tranche' });
//   } else if (pathname.startsWith('/hrmo/plantilla')) {
//     breadcrumbItems.push({ name: 'Plantilla' });
//   } else if (pathname.startsWith('/hrmo/personnel')) {
//     breadcrumbItems.push({ name: 'Personnel' });
//   } else if (pathname.startsWith('/hrmo/plantilla-of-personnel')) {
//     breadcrumbItems.push({ name: 'Plantilla of Personnel' });
//   } else if (pathname.startsWith('/department-budget-plans/')) {
//     // For dynamic budget plan detail – show only "Budget Plans" (no ID)
//     breadcrumbItems.push({ name: 'Budget Plan' });
//   } else if (pathname === '/dashboard') {
//     // Only dashboard – remove the extra "Dashboard" we added? Actually we want just one.
//     // Reset to only the current page (Dashboard) without a link.
//     breadcrumbItems = [{ name: 'Dashboard' }];
//   } else if (pathname === '/profile') {
//     breadcrumbItems.push({ name: 'Profile' });
//   } else {
//     // Fallback for any unlisted route: show the last segment capitalized
//     const segments = pathname.split('/').filter(Boolean);
//     if (segments.length > 0) {
//       const last = segments[segments.length - 1];
//       breadcrumbItems.push({ name: last.charAt(0).toUpperCase() + last.slice(1) });
//     }
//   }

//   // Remove duplicate Dashboard if the second item is also Dashboard (shouldn't happen)
//   if (breadcrumbItems.length > 1 && breadcrumbItems[0].name === 'Dashboard' && breadcrumbItems[1].name === 'Dashboard') {
//     breadcrumbItems.splice(1, 1);
//   }

//   return (
//     <Breadcrumb className="min-w-0">
//       <BreadcrumbList className="flex-nowrap overflow-hidden">
//         {breadcrumbItems.map((item, index) => {
//           const isLast = index === breadcrumbItems.length - 1;
//           // On mobile, collapse everything except the current page into a
//           // single "…" so long trails don't wrap or overflow the header.
//           const isCollapsedOnMobile = !isLast && breadcrumbItems.length > 1;
//           return (
//             <React.Fragment key={index}>
//               <BreadcrumbItem
//                 className={
//                   isCollapsedOnMobile
//                     ? "hidden sm:flex flex-shrink-0"
//                     : "flex-shrink min-w-0"
//                 }
//               >
//                 {isLast ? (
//                   <BreadcrumbPage className="truncate block max-w-[140px] sm:max-w-none">
//                     {item.name}
//                   </BreadcrumbPage>
//                 ) : (
//                   <BreadcrumbLink asChild>
//                     <Link to={item.to!} className="whitespace-nowrap">
//                       {item.name}
//                     </Link>
//                   </BreadcrumbLink>
//                 )}
//               </BreadcrumbItem>
//               {!isLast && (
//                 <BreadcrumbSeparator className={isCollapsedOnMobile ? "hidden sm:flex" : ""} />
//               )}
//             </React.Fragment>
//           );
//         })}
//       </BreadcrumbList>
//     </Breadcrumb>
//   );
// };


import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import API from '@/src/services/api';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/src/components/ui/breadcrumb';

// ─── Route → label lookup ───────────────────────────────────────────────────
// Ordered so more specific prefixes are checked before shorter/generic ones
// that could otherwise match first (e.g. "/admin/lbp-forms/:id" vs
// "/admin/lbp-forms", or "/admin/ldrrmf-plan" vs "/admin/ldrrmfip").
const ROUTE_LABELS: { prefix: string; name: string }[] = [
  // Overview
  { prefix: '/bag-ong-opol', name: 'Bag-ong Opol' },
  { prefix: '/budget-call-memo', name: 'Budget Call Memo' },
  { prefix: '/profile', name: 'Profile' },
  { prefix: '/change-password', name: 'Change Password' },

  // Department head
  { prefix: '/department-budget-plans/', name: 'Budget Plan' },
  { prefix: '/department/budget-proposal', name: 'Budget Proposal' },
  { prefix: '/department/occ-fund', name: 'Income Special Account' },
  { prefix: '/department/sh-fund', name: 'Income Special Account' },
  { prefix: '/department/pm-fund', name: 'Income Special Account' },
  { prefix: '/department/reports', name: 'Department Reports' },
  { prefix: '/department/settings', name: 'Department Settings' },

  // 5% Calamity Fund (department-head scoped)
  { prefix: '/admin/sh-cf', name: '5% Calamity Fund' },
  { prefix: '/admin/occ-cf', name: '5% Calamity Fund' },
  { prefix: '/admin/pm-cf', name: '5% Calamity Fund' },

  // LDRRMO
  { prefix: '/admin/ldrrmf-reports', name: '5% CF Reports' },
  { prefix: '/admin/ldrrmf-plan', name: '5% SA Consolidated' },
  { prefix: '/admin/ldrrmfip', name: '5% CF' },

  // Admin-only
  { prefix: '/admin/tranche', name: 'Tranche' },
  { prefix: '/admin/departments', name: 'Departments' },
  { prefix: '/admin/budget-plans', name: 'Budget Plans' },
  { prefix: '/admin/object-of-expenditures', name: 'Object of Expenditures' },
  { prefix: '/admin/lbp-forms', name: 'LBP Forms' },
  { prefix: '/admin/reports-unified', name: 'Budget Reports' },
  { prefix: '/admin/reports', name: 'Reports' },
  { prefix: '/admin/special-accounts', name: 'Special Accounts' },
  { prefix: '/admin/personnel-services', name: 'Personnel Services' },
  { prefix: '/admin/income-general-fund', name: 'Income GF & SA' },
  { prefix: '/admin/sh-fund', name: 'Income Special Account' },
  { prefix: '/admin/occ-fund', name: 'Income Special Account' },
  { prefix: '/admin/pm-fund', name: 'Income Special Account' },
  { prefix: '/admin/lbp-form5', name: 'Statement of Indebtedness' },
  { prefix: '/admin/lbp-form6', name: 'Obligations & Budget' },
  { prefix: '/admin/lbp-form7', name: 'Allocation by Sector' },
  { prefix: '/admin/mdf-fund', name: '20% MDF' },
  { prefix: '/admin/ps-computation', name: 'PS Computation' },
  { prefix: '/admin/gad', name: 'GAD' },
  { prefix: '/admin/plans', name: 'Attributions' },
  { prefix: '/admin/consolidated-special-income', name: 'Consolidated Income (SA)' },
  { prefix: '/admin/summary-expenditures', name: 'Summary by Office' },
  { prefix: '/admin/comparative-summary', name: 'Comparative Summary' },
  { prefix: '/admin/expenditure', name: 'Expenditure' },
  { prefix: '/admin/settings', name: 'Settings' },

  // HRMO
  { prefix: '/hrmo/plantilla-of-personnel', name: 'Plantilla of Personnel' },
  { prefix: '/hrmo/plantilla', name: 'Plantilla' },
  { prefix: '/hrmo/personnel', name: 'Personnel' },
];

const getRouteLabel = (pathname: string): string | null => {
  const match = ROUTE_LABELS.find(r => pathname.startsWith(r.prefix));
  return match?.name ?? null;
};

// Matches "/admin/lbp-forms/137" (the department detail page) but NOT the
// bare list route "/admin/lbp-forms" itself.
const LBP_FORMS_DETAIL_RE = /^\/admin\/lbp-forms\/(\d+)$/;

export const BreadcrumbNav: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  const lbpDetailMatch = pathname.match(LBP_FORMS_DETAIL_RE);
  const lbpPlanId = lbpDetailMatch ? lbpDetailMatch[1] : undefined;

  // Only fetch when we're actually on a department's LBP Forms detail page —
  // gives us the department name for the third breadcrumb crumb.
  const { data: deptPlan } = useQuery({
    queryKey: ['breadcrumb-department-budget-plan', lbpPlanId],
    queryFn: () =>
      API.get(`/department-budget-plans/${lbpPlanId}`).then(r => r.data?.data ?? r.data),
    enabled: !!lbpPlanId,
    
  });

  let breadcrumbItems: { to?: string; name: string }[];

  if (pathname === '/dashboard') {
    // Dashboard is the root — show it alone, not linked to itself.
    breadcrumbItems = [{ name: 'Dashboard' }];
  } else if (lbpPlanId) {
    // Department detail page — "LBP Forms" becomes a link back to the list,
    // and the department name (once loaded) becomes the final crumb.
    const deptName =
      deptPlan?.department?.dept_name ??
      deptPlan?.department?.dept_abbreviation ??
      'Department';
    breadcrumbItems = [
      { to: '/dashboard', name: 'Dashboard' },
      { to: '/admin/lbp-forms', name: 'LBP Forms' },
      { name: deptName },
    ];
  } else {
    breadcrumbItems = [{ to: '/dashboard', name: 'Dashboard' }];

    const label = getRouteLabel(pathname);
    if (label) {
      breadcrumbItems.push({ name: label });
    } else {
      // Fallback for any unlisted route: show the last segment, prettified
      const segments = pathname.split('/').filter(Boolean);
      if (segments.length > 0) {
        const last = segments[segments.length - 1];
        const pretty = last
          .replace(/-/g, ' ')
          .replace(/\b\w/g, c => c.toUpperCase());
        breadcrumbItems.push({ name: pretty });
      }
    }
  }

  return (
    <Breadcrumb className="min-w-0">
      <BreadcrumbList className="flex-nowrap overflow-hidden">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          // On mobile, collapse everything except the current page into a
          // single "…" so long trails don't wrap or overflow the header.
          const isCollapsedOnMobile = !isLast && breadcrumbItems.length > 1;
          return (
            <React.Fragment key={index}>
              <BreadcrumbItem
                className={
                  isCollapsedOnMobile
                    ? "hidden sm:flex flex-shrink-0"
                    : "flex-shrink min-w-0"
                }
              >
                {isLast ? (
                  <BreadcrumbPage className="truncate block max-w-[140px] sm:max-w-none">
                    {item.name}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to!} className="whitespace-nowrap">
                      {item.name}
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && (
                <BreadcrumbSeparator className={isCollapsedOnMobile ? "hidden sm:flex" : ""} />
              )}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};
