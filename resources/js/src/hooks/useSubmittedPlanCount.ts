// // src/hooks/useSubmittedPlanCount.tsx
// // Fetches submitted dept-plan count for the active budget year.
// // Call refreshSubmittedCount() from anywhere (e.g. after approve/reject)
// // to trigger a re-fetch without prop drilling or context.

// import { useState, useEffect, useCallback } from "react";
// import API from "@/src/services/api";

// const REFRESH_EVENT = "submitted-plan-count:refresh";

// /** Call this after any action that changes submitted plan count. */
// export function refreshSubmittedCount() {
//   window.dispatchEvent(new Event(REFRESH_EVENT));
// }

// export function useSubmittedPlanCount() {
//   const [count, setCount] = useState<number | null>(null);

//   const fetch = useCallback(async () => {
//     try {
//       const activeRes = await API.get("/budget-plans/active");
//       const activePlanId: number | undefined =
//         activeRes.data?.data?.budget_plan_id;
//       if (!activePlanId) return;

//       const plansRes = await API.get("/department-budget-plans", {
//         params: { budget_plan_id: activePlanId },
//       });

//       const plans: { status: string }[] = plansRes.data?.data ?? [];
//       const submitted = plans.filter((p) => p.status === "submitted").length;
//       setCount(submitted > 0 ? submitted : null);
//     } catch {
//       // non-critical — badge just won't show
//     }
//   }, []);

//   useEffect(() => {
//     fetch();
//     window.addEventListener(REFRESH_EVENT, fetch);
//     return () => window.removeEventListener(REFRESH_EVENT, fetch);
//   }, [fetch]);

//   return count;
// }

// src/hooks/useSubmittedPlanCount.ts
// Reads submitted dept-plan count from the shared React Query cache.
// Call refreshSubmittedCount() after approve/reject to invalidate.

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useBudgetPlans, useDepartmentBudgetPlans, queryKeys } from "./useDashboardQueries";
import { BudgetPlan, DepartmentBudgetPlan } from "../types/api";

const REFRESH_EVENT = "submitted-plan-count:refresh";

/** Call this after any action that changes submitted plan count. */
export function refreshSubmittedCount() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useSubmittedPlanCount(): number | null {
  const queryClient = useQueryClient();

  // ── Reuse shared budget-plans cache — /budget-plans/active call eliminated ─
  const { data: plans = [] } = useBudgetPlans();
  const activePlan = plans.find((p: BudgetPlan) => p.is_active);
  const planId = activePlan?.budget_plan_id;

  // ── Reuse shared dept-budget-plans cache — no extra network call ───────────
  // Same queryKey as useDashboardQueries: ['dept-budget-plans', planId]
  const { data: deptPlans = [] } = useDepartmentBudgetPlans(planId);

  // ── On refresh event, invalidate the two upstream queries ─────────────────
  // React Query will refetch them if stale, and this hook re-renders automatically.
  useEffect(() => {
    const handler = () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.budgetPlans });
      if (planId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.deptBudgetPlans(planId) });
      }
    };
    window.addEventListener(REFRESH_EVENT, handler);
    return () => window.removeEventListener(REFRESH_EVENT, handler);
  }, [queryClient, planId]);

  const submitted = deptPlans.filter(
    (p: DepartmentBudgetPlan) => p.status === "submitted"
  ).length;

  return submitted > 0 ? submitted : null;
}
