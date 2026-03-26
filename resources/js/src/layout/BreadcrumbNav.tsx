import React from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/src/components/ui/breadcrumb';

export const BreadcrumbNav: React.FC = () => {
  const location = useLocation();
  const pathname = location.pathname;

  // Build breadcrumb items explicitly for each route
  let breadcrumbItems: { to?: string; name: string }[] = [];

  // Always start with Dashboard (linked)
  breadcrumbItems.push({ to: '/dashboard', name: 'Dashboard' });

  // Handle specific routes
  if (pathname.startsWith('/admin/object-of-expenditures')) {
    breadcrumbItems.push({ name: 'Object of Expenditures' });
  } else if (pathname.startsWith('/admin/lbp-forms')) {
    breadcrumbItems.push({ name: 'LBP Forms' });
  } else if (pathname.startsWith('/hrmo/tranche')) {
    breadcrumbItems.push({ name: 'Tranche' });
  } else if (pathname.startsWith('/hrmo/plantilla')) {
    breadcrumbItems.push({ name: 'Plantilla' });
  } else if (pathname.startsWith('/hrmo/personnel')) {
    breadcrumbItems.push({ name: 'Personnel' });
  } else if (pathname.startsWith('/hrmo/plantilla-of-personnel')) {
    breadcrumbItems.push({ name: 'Plantilla of Personnel' });
  } else if (pathname.startsWith('/department-budget-plans/')) {
    // For dynamic budget plan detail – show only "Budget Plans" (no ID)
    breadcrumbItems.push({ name: 'Budget Plan' });
  } else if (pathname === '/dashboard') {
    // Only dashboard – remove the extra "Dashboard" we added? Actually we want just one.
    // Reset to only the current page (Dashboard) without a link.
    breadcrumbItems = [{ name: 'Dashboard' }];
  } else if (pathname === '/profile') {
    breadcrumbItems.push({ name: 'Profile' });
  } else {
    // Fallback for any unlisted route: show the last segment capitalized
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length > 0) {
      const last = segments[segments.length - 1];
      breadcrumbItems.push({ name: last.charAt(0).toUpperCase() + last.slice(1) });
    }
  }

  // Remove duplicate Dashboard if the second item is also Dashboard (shouldn't happen)
  if (breadcrumbItems.length > 1 && breadcrumbItems[0].name === 'Dashboard' && breadcrumbItems[1].name === 'Dashboard') {
    breadcrumbItems.splice(1, 1);
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;
          return (
            <React.Fragment key={index}>
              <BreadcrumbItem>
                {isLast ? (
                  <BreadcrumbPage>{item.name}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={item.to!}>{item.name}</Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!isLast && <BreadcrumbSeparator />}
            </React.Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
};