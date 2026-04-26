// src/hooks/useSubmittedPlanCount.tsx
// Fetches submitted dept-plan count for the active budget year.
// Call refreshSubmittedCount() from anywhere (e.g. after approve/reject)
// to trigger a re-fetch without prop drilling or context.

import { useState, useEffect, useCallback } from "react";
import API from "@/src/services/api";

const REFRESH_EVENT = "submitted-plan-count:refresh";

/** Call this after any action that changes submitted plan count. */
export function refreshSubmittedCount() {
  window.dispatchEvent(new Event(REFRESH_EVENT));
}

export function useSubmittedPlanCount() {
  const [count, setCount] = useState<number | null>(null);

  const fetch = useCallback(async () => {
    try {
      const activeRes = await API.get("/budget-plans/active");
      const activePlanId: number | undefined =
        activeRes.data?.data?.budget_plan_id;
      if (!activePlanId) return;

      const plansRes = await API.get("/department-budget-plans", {
        params: { budget_plan_id: activePlanId },
      });

      const plans: { status: string }[] = plansRes.data?.data ?? [];
      const submitted = plans.filter((p) => p.status === "submitted").length;
      setCount(submitted > 0 ? submitted : null);
    } catch {
      // non-critical — badge just won't show
    }
  }, []);

  useEffect(() => {
    fetch();
    window.addEventListener(REFRESH_EVENT, fetch);
    return () => window.removeEventListener(REFRESH_EVENT, fetch);
  }, [fetch]);

  return count;
}
