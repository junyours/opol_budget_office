// psConfig.ts
// ── Personnel Services calculation constants ──────────────────────────────
// Edit these values to change how allowances and contributions are computed.
// All monetary values are in PHP (Philippine Peso).

export const PS_CONFIG = {

  // ── PERA ─────────────────────────────────────────────────────────────────
  pera: {
    monthly: 2000,              // Personal Economic Relief Allowance (monthly)
  },

  // ── CONTRIBUTIONS ────────────────────────────────────────────────────────
  retirement: {
    rate: 0.12,                 // 12% of annual salary
  },
  pagibig: {
    rate: 0.02,                 // 2% of monthly salary × 12
  },
  philHealth: {
    rate: 0.025,                // 2.5% of monthly salary
    monthlyCap: 2786.38,        // maximum monthly PhilHealth contribution
  },
  ecip: {
    rate: 0.01,                 // 1% of annual salary
    annualCap: 1200,            // maximum annual ECIP contribution
  },

  // ── ALLOWANCE THRESHOLDS ─────────────────────────────────────────────────
  annualThreshold:      54888,  // min annual salary for clothing, productivity, cash gift
  subsistenceThreshold: 54000,  // min annual salary for subsistence
  laundryThreshold:     54000,  // min annual salary for laundry

  // ── ALLOWANCE AMOUNTS ────────────────────────────────────────────────────
  clothing: {
    annual: 7000,               // Clothing/Uniform Allowance (annual lump sum)
  },
  subsistence: {
    monthly: 0,                 // Subsistence Allowance monthly
  },
  laundry: {
    monthly: 0,                 // Laundry Allowance monthly
  },
  productivity: {
    annual: 2000,               // Productivity Incentive Allowance (annual)
  },
  cashGift: {
    annual: 5000,               // Cash Gift (annual)
  },
  otherBenefits: {
    days: 5,                   // Other Personnel Benefits = (monthly / 22) × days
  },

  // ── MAGNA CARTA BENEFITS ──────────────────────────────────────────────────
  // Both columns use rate × annual salary and are saved to the "Hazard Pay" expense item.
  // magnaCarta1 = Magna Carta Health Benefits     (health workers, MHO by default)
  // magnaCarta2 = Magna Carta PSW RA 9433          (social welfare workers, MSWDO by default)
  magnaCarta: {
    rate: 0.25,                 // 25% of annual salary for both
  },

  // ── DEPARTMENT ELIGIBILITY ────────────────────────────────────────────────
  subsistenceDepts: [
    { dept_id: 21, label: '(MHO)'   },
    { dept_id: 22, label: '(MSWDO)' },
  ] as { dept_id: number; label: string }[],

  laundryDepts: [
    { dept_id: 21, label: '(MHO)'   },
    { dept_id: 22, label: '(MSWDO)' },
  ] as { dept_id: number; label: string }[],

  // Magna Carta Health Benefits eligible departments (default: MHO only)
  magnaCarta1Depts: [
    { dept_id: 21, label: '(MHO)' },
  ] as { dept_id: number; label: string }[],

  // Magna Carta PSW RA 9433 eligible departments (default: MSWDO only)
  magnaCarta2Depts: [
    { dept_id: 22, label: '(MSWDO)' },
  ] as { dept_id: number; label: string }[],

  // ── RA / TA RATES BY SALARY GRADE ────────────────────────────────────────
  ra: [
    { from: 27, to: 40, monthly: 9000  },
    { from: 25, to: 26, monthly: 8550  },
    { from: 24, to: 24, monthly: 7650  },
    { from: 22, to: 23, monthly: 5400  },
  ],

} as const;

export type PsConfig = typeof PS_CONFIG;