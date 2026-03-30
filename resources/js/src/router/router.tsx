import React from "react";
import {
  createBrowserRouter,
  Navigate,
  Outlet,
  RouterProvider,
} from "react-router-dom";

import { useAuth } from "../hooks/useAuth";
import { UserRole } from "../types/api";
import MainLayout from "../layout/MainLayout";
import { LoadingState } from "../pages/common/LoadingState";

/* ------------------ Lazy Pages ------------------ */

const Login = React.lazy(() => import("../pages/common/Login"));
const Dashboard = React.lazy(() => import("../pages/common/Dashboard"));
const Unauthorized = React.lazy(() => import("../pages/common/Unauthorized"));

const BudgetPlanDetail = React.lazy(
  () => import("../pages/department-head/BudgetPlanDetail")
);

const ObjectOfExpenditures = React.lazy(
  () => import("../pages/admin/ObjectOfExpenditures")
);

const AdminTranche = React.lazy(
  () => import("../pages/admin/TranchePage")
);

const BudgetPlanList = React.lazy(
  () => import("../pages/admin/BudgetPlanList")
);

const AdminDepartments = React.lazy(
  () => import("../pages/admin/DepartmentsPage")
);

const SpecialAccounts = React.lazy(
  () => import("../pages/admin/SpecialAccounts")
);

const PersonnelServices = React.lazy(
  () => import("../pages/admin/PersonnelServices")
);

const Reports = React.lazy(
  () => import("../pages/admin/ReportsPage")
);

const HrmoPlantilla = React.lazy(
  () => import("../pages/hrmo/PlantillaPage")
);

const HrmoPersonnel = React.lazy(
  () => import("../pages/hrmo/PersonnelPage")
);

const PlantillaOfPersonnelPage = React.lazy(
  () => import("../pages/hrmo/PlantillaOfPersonnelPage")
);

const IncomeFund = React.lazy(
 () => import("../pages/admin/IncomeFund")
);

const Form5 = React.lazy(
  () => import("../pages/admin/Form5")
);

const LBPForms = React.lazy(
  () => import("../pages/admin/LBPForms")
);

const Form6Page = React.lazy(
  () => import("../pages/admin/Form6")
);

const SettingsPage = React.lazy(
  () => import("../pages/admin/Settings")
);

const Form7Page = React.lazy(
      () => import("../pages/admin/Form7")
    );

const PsComputation = React.lazy(
  () => import("../pages/admin/PsComputation")
);

const MDFFund = React.lazy(
  () => import("../pages/admin/MDFFund")
);

const LdrrmfipPage = React.lazy(
  () => import("../pages/admin/LdrrmfipPage")
);

const LdrrmfPlanPage = React.lazy(
  () => import("../pages/admin/LdrrmfPlanPage")
);

const GadPage = React.lazy(
  () => import("../pages/admin/GadPage")
);

const PlansPage = React.lazy(() => import("../pages/admin/PlansPage"));
const ConsolidatedSpecialIncomePage = React.lazy(
  () => import("../pages/admin/ConsolidatedSpecialIncomePage")
);

const SummaryOfExpenditures = React.lazy(
  () => import("../pages/admin/SummaryOfExpenditures")
);

const DepartmentReportsPage = React.lazy(
    () => import('../components/report/DepartmentReportPage')
  );

const UnifiedReportsPage = React.lazy(
    () => import('../components/report/UnifiedReportsPage')
  );

const ProfilePage = React.lazy(() => import("../pages/common/ProfilePage"));


const BudgetProposal = React.lazy(
  () => import("../pages/department-head/BudgetProposal")
);

const DepartmentSettings = React.lazy(
  () => import("../pages/department-head/DepartmentSettings")
);

/* ------------------ Suspense Wrapper ------------------ */

const Lazy = (Component: React.LazyExoticComponent<any>) => (
  <React.Suspense fallback={<LoadingState />}>
    <Component />
  </React.Suspense>
);

/* ------------------ Guest Route ------------------ */

const GuestRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;

  if (user) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

/* ------------------ Protected Route ------------------ */

const ProtectedRoute = () => {
  const { user, loading } = useAuth();

  if (loading) return <LoadingState />;

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

/* ------------------ Role Route ------------------ */

const RoleRoute: React.FC<{ roles: UserRole[] }> = ({ roles }) => {
  const { user } = useAuth();

  if (!user || !roles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

/* ------------------ Router ------------------ */

const router = createBrowserRouter([
  {
    element: <GuestRoute />,
    children: [
      {
        path: "/login",
        element: Lazy(Login),
      },
    ],
  },

  {
    path: "/unauthorized",
    element: Lazy(Unauthorized),
  },

  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <MainLayout />,
        children: [
          {
            index: true,
            element: <Navigate to="/dashboard" replace />,
          },

          {
            path: "dashboard",
            element: Lazy(Dashboard),
          },
          {
            path: "profile",
            element: Lazy(ProfilePage),
          },

          {
            path: "department-budget-plans/:id",
            element: Lazy(BudgetPlanDetail),
          },

          
          /* ---------------- ADMIN ---------------- */

          {
            element: <RoleRoute roles={["admin", "super-admin"]} />,
            children: [
              {
                path: "admin/tranche",
                element: Lazy(AdminTranche),
              },
              {
                path: "admin/object-of-expenditures",
                element: Lazy(ObjectOfExpenditures),
              },
              {
                path: "admin/lbp-forms",
                element: Lazy(LBPForms),
              },
              {
                path: "admin/reports",
                element: Lazy(Reports),
              },
              {
                path: "admin/budget-plans",
                element: Lazy(BudgetPlanList),
              },
              {
                path: "admin/departments",
                element: Lazy(AdminDepartments),
              },
              {
                path: "admin/special-accounts",
                element: Lazy(SpecialAccounts),
              },
              {
                path: "admin/personnel-services",
                element: Lazy(PersonnelServices),
              },
              {
                path: "admin/income-general-fund",
                element: Lazy(IncomeFund)
              },
              {
                path: "admin/sh-fund",
                element: Lazy(IncomeFund)
              },
              {
                path: "admin/occ-fund",
                element: Lazy(IncomeFund)
              },
              {
                path: "admin/pm-fund",
                element: Lazy(IncomeFund)
              },
              {
                path: "admin/lbp-form5",
                element: Lazy(Form5),
              },
              {
                path: "admin/lbp-forms",
                element: Lazy(LBPForms),
              },
              {
                path: "admin/lbp-form6",
                element: Lazy(Form6Page),
                },
              {
                path: "admin/lbp-form7",
                element: Lazy(Form7Page),
              },
              {
                path: "admin/mdf-fund",
                element: Lazy(MDFFund),
              },  
              {
                path: "hrmo/plantilla",
                element: Lazy(HrmoPlantilla),
              },
              {
                path: "hrmo/personnel",
                element: Lazy(HrmoPersonnel),
              },
              {
                path: "hrmo/plantilla-of-personnel",
                element: Lazy(PlantillaOfPersonnelPage),
              },
              {
                path: "admin/settings",
                element: Lazy(SettingsPage),
              },
              {
                path: "admin/ps-computation",
                element: Lazy(PsComputation),
              },
              {
                path: "admin/ldrrmfip",
                element: Lazy(LdrrmfipPage),
              },
              {
                path: "admin/ldrrmf-plan",
                element: Lazy(LdrrmfPlanPage),
              },
              {
                path: "admin/gad",
                element: Lazy(GadPage),
              },
              { path: "admin/plans", element: Lazy(PlansPage) },
              {
  path: "admin/consolidated-special-income",
  element: Lazy(ConsolidatedSpecialIncomePage),
},
{
  path: "admin/summary-expenditures",
  element: Lazy(SummaryOfExpenditures),
},

{
    path: 'admin/reports-unified',
    element: Lazy(UnifiedReportsPage),
  },
 
            ],
          },

          /* ---------------- HRMO ---------------- */

          {
            element: <RoleRoute roles={["admin-hrmo"]} />,
            children: [
              {
                path: "hrmo/plantilla",
                element: Lazy(HrmoPlantilla),
              },
              {
                path: "hrmo/personnel",
                element: Lazy(HrmoPersonnel),
              },
              {
                path: "hrmo/plantilla-of-personnel",
                element: Lazy(PlantillaOfPersonnelPage),
              },
            ],
          },

          /* -------------------Department Head---------------------- */
          {
            element: <RoleRoute roles={["department-head"]} />,
            children: [
              {
                path: "department/budget-proposal",
                element: Lazy(BudgetProposal),
              },
              {
                path: "department/occ-fund",
                element: Lazy(IncomeFund) // Reuse the same component
              },
              {
                path: "department/sh-fund",
                element: Lazy(IncomeFund)
              },
              {
                path: "department/pm-fund",
                element: Lazy(IncomeFund)
              },
              {
                path: 'department/reports',
                element: Lazy(DepartmentReportsPage),
              },
              {
                path: "department/settings",
                element: Lazy(DepartmentSettings),
              },
              {
                path: "admin/sh-cf",
                element: Lazy(LdrrmfipPage)
              },
              {
                path: "admin/occ-cf",
                element: Lazy(LdrrmfipPage)
              },
              {
                path: "admin/pm-cf",
                element: Lazy(LdrrmfipPage)
              },
            ],
          },
        ],
      },
    ],
  },

  {
    path: "*",
    element: <Navigate to="/" replace />,
  },
]);

/* ------------------ Provider ------------------ */

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
