/**
 * useGetTotalAmount.ts
 *
 * Parameterised hooks for fetching named aggregate totals.
 *
 * ─── Two families of hooks ────────────────────────────────────────────────────
 *
 *  1. PS expense aggregates      →  useGetTotalAmount / useGetAllTotals
 *     GET /api/totals/{key}
 *     GET /api/totals
 *
 *  2. Income-fund / debt / AIP   →  useGetIncomeFundTotals
 *     GET /api/totals/income-fund-derived
 *     Returns ldf20, ldrrmf5, aidToBarangays and their source inputs,
 *     so the frontend can render detailed computation tooltips.
 *
 * ─── PS keys (mirrors AggregateTotalsService::DEFINITIONS) ───────────────────
 *
 *   retirementGratuity         – Retirement Gratuity
 *   terminalLeave              – Terminal Leave Benefits
 *   otherPersonnelBenefits     – Other Personnel Benefits
 *   ecip                       – Employees Compensation Insurance Premiums
 *   philHealth                 – PhilHealth Contributions
 *   pagIbig                    – Pag-IBIG Contributions
 *   retirementAndLifeInsurance – Retirement and Life Insurance Premiums
 *   psAllowancesTotal          – All of the above combined
 *
 * ─── Usage ────────────────────────────────────────────────────────────────────
 *
 *   // Single PS total (active plan auto-resolved server-side)
 *   const { total, label, loading } = useGetTotalAmount('philHealth');
 *
 *   // Specific plan
 *   const { total } = useGetTotalAmount('terminalLeave', { budgetPlanId: 3 });
 *
 *   // Disable auto-fetch
 *   const { total, refetch } = useGetTotalAmount('pagIbig', { enabled: false });
 *
 *   // All PS totals at once
 *   const { totals } = useGetAllTotals({ budgetPlanId: 1 });
 *   totals.philHealth?.total;
 *
 *   // Income-fund derived values (for Form 6 tooltips)
 *   const { data } = useGetIncomeFundTotals({ budgetPlanId: 1 });
 *   data.ldf20.ntaProposed   // → 331_730_144  (source value shown in tooltip)
 *   data.ldf20.amount        // → 66_346_029   (= NTA × 20%)
 *   data.infraProgram.balanced  // → true/false (green/red validation)
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

// ─────────────────────────────────────────────────────────────────────────────
// PS Aggregate Totals
// ─────────────────────────────────────────────────────────────────────────────

export type TotalKey =
  | 'retirementGratuity'
  | 'terminalLeave'
  | 'otherPersonnelBenefits'
  | 'ecip'
  | 'philHealth'
  | 'pagIbig'
  | 'retirementAndLifeInsurance'
  | 'psAllowancesTotal';
  // | 'salariesAndWages'  ← add here when registered in the service

export const TOTAL_KEYS: TotalKey[] = [
  'retirementGratuity',
  'terminalLeave',
  'otherPersonnelBenefits',
  'ecip',
  'philHealth',
  'pagIbig',
  'retirementAndLifeInsurance',
  'psAllowancesTotal',
];

export interface TotalResult {
  key: TotalKey;
  label: string;
  total: number;
}

export interface UseTotalOptions {
  /** Scope to a specific budget plan; omit to use the server-active plan. */
  budgetPlanId?: number | null;
  /** Set false to skip the initial auto-fetch (call refetch() manually). */
  enabled?: boolean;
  /** Override the API base URL. Defaults to '/api'. */
  baseUrl?: string;
}

export interface UseTotalAmountReturn {
  total:        number;
  label:        string;
  budgetPlanId: number | null;
  loading:      boolean;
  error:        string | null;
  refetch:      () => void;
}

/**
 * Fetch a single named PS aggregate total.
 */
export function useGetTotalAmount(
  key: TotalKey,
  options: UseTotalOptions = {}
): UseTotalAmountReturn {
  const { budgetPlanId = null, enabled = true, baseUrl = '/api' } = options;

  const [state, setState] = useState<Omit<UseTotalAmountReturn, 'refetch'>>({
    total: 0, label: '', budgetPlanId: null, loading: false, error: null,
  });

  const latestRef = useRef({ key, budgetPlanId, baseUrl });
  useEffect(() => { latestRef.current = { key, budgetPlanId, baseUrl }; });

  useEffect(() => {
    if (import.meta.env.DEV && !TOTAL_KEYS.includes(key)) {
      console.warn(
        `[useGetTotalAmount] Unknown key "${key}". ` +
        `Did you add it to AggregateTotalsService::DEFINITIONS and to TotalKey? ` +
        `Known keys: ${TOTAL_KEYS.join(', ')}`
      );
    }
  }, [key]);

  const fetchTotal = useCallback(async () => {
    const { key: k, budgetPlanId: planId, baseUrl: base } = latestRef.current;
    if (!k) return;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params: Record<string, unknown> = {};
      if (planId) params.budget_plan_id = planId;
      const { data } = await axios.get<{
        success: boolean;
        data: { key: TotalKey; label: string; total: number; budget_plan_id: number };
      }>(`${base}/totals/${k}`, { params });
      setState({
        total:        data.data.total        ?? 0,
        label:        data.data.label        ?? k,
        budgetPlanId: data.data.budget_plan_id ?? null,
        loading:      false,
        error:        null,
      });
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        (err instanceof Error && err.message) ||
        'Failed to fetch total.';
      setState(prev => ({ ...prev, loading: false, error: String(message) }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchTotal();
  }, [key, budgetPlanId, enabled, fetchTotal]);

  return { ...state, refetch: fetchTotal };
}

// ─── useGetAllTotals ──────────────────────────────────────────────────────────

export interface TotalEntry {
  key:   TotalKey;
  label: string;
  total: number;
}

export interface UseAllTotalsReturn {
  totals:       Partial<Record<TotalKey, TotalEntry>>;
  budgetPlanId: number | null;
  loading:      boolean;
  error:        string | null;
  refetch:      () => void;
}

/**
 * Fetch ALL registered PS aggregate totals in a single request.
 *
 * @example
 *   const { totals, loading } = useGetAllTotals({ budgetPlanId: 1 });
 *   totals.philHealth?.total  // → number | undefined
 */
export function useGetAllTotals(options: UseTotalOptions = {}): UseAllTotalsReturn {
  const { budgetPlanId = null, enabled = true, baseUrl = '/api' } = options;

  const [state, setState] = useState<Omit<UseAllTotalsReturn, 'refetch'>>({
    totals: {}, budgetPlanId: null, loading: false, error: null,
  });

  const latestRef = useRef({ budgetPlanId, baseUrl });
  useEffect(() => { latestRef.current = { budgetPlanId, baseUrl }; });

  const fetchAll = useCallback(async () => {
    const { budgetPlanId: planId, baseUrl: base } = latestRef.current;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params: Record<string, unknown> = {};
      if (planId) params.budget_plan_id = planId;
      const { data } = await axios.get<{
        success: boolean;
        data: { budget_plan_id: number; totals: Record<string, TotalEntry> };
      }>(`${base}/totals`, { params });
      setState({
        totals:       (data.data.totals ?? {}) as Partial<Record<TotalKey, TotalEntry>>,
        budgetPlanId: data.data.budget_plan_id ?? null,
        loading:      false,
        error:        null,
      });
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        (err instanceof Error && err.message) ||
        'Failed to fetch totals.';
      setState(prev => ({ ...prev, loading: false, error: String(message) }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchAll();
  }, [budgetPlanId, enabled, fetchAll]);

  return { ...state, refetch: fetchAll };
}

// ─────────────────────────────────────────────────────────────────────────────
// Income-Fund Derived Totals
// GET /api/totals/income-fund-derived?budget_plan_id=X
//
// Exposes the same intermediate values computed in syncFromOther(), but as a
// read-only GET endpoint so the frontend can show computation tooltips without
// triggering a sync/write operation.
// ─────────────────────────────────────────────────────────────────────────────

/** Raw shape returned by GET /api/totals/income-fund-derived */
export interface IncomeFundDerivedResponse {
  budget_plan_id:     number;

  // Source values (raw inputs to the derivations)
  nta_proposed:       number;   // National Tax Allotment proposed amount
  grand_total_income: number;   // Grand total of general-fund income (proposed)
  debt_services:      number;   // Σ principal_due + interest_due (Form 5)
  aid_to_barangays:   number;   // AIP "Aid to Barangay" total

  // Derived values
  ldf_20pct:              number;   // nta_proposed × 0.20
  infrastructure_program: number;   // ldf_20pct − debt_services
  ldrrmf_5pct:            number;   // grand_total_income × 0.05
  qrf_30pct:              number;   // ldrrmf_5pct × 0.30
  pda_70pct:              number;   // ldrrmf_5pct × 0.70
}

/**
 * Structured derived data for Form 6 tooltip rendering.
 * Each field carries the final `amount` PLUS its source inputs.
 */
export interface IncomeFundDerivedData {
  /** 20% of NTA for Local Development Fund */
  ldf20: {
    amount:      number;
    ntaProposed: number;
    rate:        0.2;
  };
  /**
   * Infrastructure Program = ldf20 − debtServices.
   * `balanced` is true when infraProgram + debtServices === ldf20 (within rounding).
   * Show green when balanced, red when not.
   */
  infraProgram: {
    amount:       number;
    ldf20:        number;
    debtServices: number;
    balanced:     boolean;
  };
  /** Debt Services (Form 5 total) */
  debtServices: {
    amount: number;
  };
  /** 5% Local Disaster Risk Reduction Management Fund */
  ldrrmf5: {
    amount:           number;
    grandTotalIncome: number;
    rate:             0.05;
  };
  /** 30% Quick Response Fund */
  qrf30: {
    amount:  number;
    ldrrmf5: number;
    rate:    0.3;
  };
  /** 70% Pre-Disaster Activities */
  pda70: {
    amount:  number;
    ldrrmf5: number;
    rate:    0.7;
  };
  /** Financial Assistance to Barangays (AIP total) */
  aidToBarangays: {
    amount: number;
  };
}

export interface UseIncomeFundTotalsReturn {
  /** Structured derived data, ready to feed directly into tooltip components. */
  data:         IncomeFundDerivedData | null;
  /** Raw API response (useful for debug panels). */
  raw:          IncomeFundDerivedResponse | null;
  budgetPlanId: number | null;
  loading:      boolean;
  error:        string | null;
  refetch:      () => void;
}

/**
 * Fetch all income-fund-derived values for Form 6 tooltips.
 *
 * The hook calls GET /api/totals/income-fund-derived, which is a read-only
 * counterpart to syncFromOther() — it computes the same numbers without
 * writing anything.
 *
 * @example
 *   const { data, loading } = useGetIncomeFundTotals({ budgetPlanId: 1 });
 *
 *   // Tooltip for "20% NTA for Local Development Fund"
 *   //   National Tax Allotment = 331,730,144 × 20% = 66,346,029
 *   data.ldf20.ntaProposed   // 331_730_144
 *   data.ldf20.amount        // 66_346_029
 *
 *   // Validation: Infrastructure Program + Debt Services = 20% NTA?
 *   data.infraProgram.balanced  // true → green, false → red
 *   data.infraProgram.amount    // Infrastructure Program amount
 *   data.infraProgram.debtServices  // Debt Services amount
 *   data.infraProgram.ldf20     // 20% NTA amount
 *
 *   // 5% LDRRMF
 *   data.ldrrmf5.grandTotalIncome  // source
 *   data.ldrrmf5.amount            // computed
 *
 *   // Financial Assistance to Barangays
 *   data.aidToBarangays.amount
 */
export function useGetIncomeFundTotals(
  options: UseTotalOptions = {}
): UseIncomeFundTotalsReturn {
  const { budgetPlanId = null, enabled = true, baseUrl = '/api' } = options;

  const [state, setState] = useState<Omit<UseIncomeFundTotalsReturn, 'refetch'>>({
    data: null, raw: null, budgetPlanId: null, loading: false, error: null,
  });

  const latestRef = useRef({ budgetPlanId, baseUrl });
  useEffect(() => { latestRef.current = { budgetPlanId, baseUrl }; });

  const fetchDerived = useCallback(async () => {
    const { budgetPlanId: planId, baseUrl: base } = latestRef.current;
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const params: Record<string, unknown> = {};
      if (planId) params.budget_plan_id = planId;

      const { data: res } = await axios.get<{
        success: boolean;
        data: IncomeFundDerivedResponse;
      }>(`${base}/totals/income-fund-derived`, { params });

      const r = res.data;

      // Balance check: infraProgram + debtServices should equal ldf20 (rounded)
      const balanced =
        Math.round(r.infrastructure_program + r.debt_services) ===
        Math.round(r.ldf_20pct);

      const structured: IncomeFundDerivedData = {
        ldf20: {
          amount:      r.ldf_20pct,
          ntaProposed: r.nta_proposed,
          rate:        0.2,
        },
        infraProgram: {
          amount:       r.infrastructure_program,
          ldf20:        r.ldf_20pct,
          debtServices: r.debt_services,
          balanced,
        },
        debtServices: {
          amount: r.debt_services,
        },
        ldrrmf5: {
          amount:           r.ldrrmf_5pct,
          grandTotalIncome: r.grand_total_income,
          rate:             0.05,
        },
        qrf30: {
          amount:  r.qrf_30pct,
          ldrrmf5: r.ldrrmf_5pct,
          rate:    0.3,
        },
        pda70: {
          amount:  r.pda_70pct,
          ldrrmf5: r.ldrrmf_5pct,
          rate:    0.7,
        },
        aidToBarangays: {
          amount: r.aid_to_barangays,
        },
      };

      setState({
        data:         structured,
        raw:          r,
        budgetPlanId: r.budget_plan_id ?? null,
        loading:      false,
        error:        null,
      });
    } catch (err: unknown) {
      const message =
        (axios.isAxiosError(err) && err.response?.data?.message) ||
        (err instanceof Error && err.message) ||
        'Failed to fetch income-fund derived totals.';
      setState(prev => ({ ...prev, loading: false, error: String(message) }));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    fetchDerived();
  }, [budgetPlanId, enabled, fetchDerived]);

  return { ...state, refetch: fetchDerived };
}