// data/signatory.ts
//
// Static signatory data — structured the same way it would eventually live
// in the database once this becomes dynamic (2 tables):
//
//   signatories            (id, signatory_key, name, title)
//   form_signatory_layout  (id, form_code, signatory_key, row_group, sort_order)
//
// row_group meaning per form:
//   1 = top row
//   2 = second row (below the top row)
//   3 = "Approved" row (always the mayor, bottom of the block)
//
// To change a name/title later, edit it once in `signatories` below —
// every form that references that signatory_key updates automatically.
//
// This file is a reference/planning artifact for now. The actual PHP report
// (Laravel + Blade + Dompdf) can't read a .ts file directly, so the same
// structure is mirrored in the PHP controller (see chat instructions) until
// a real `signatories` + `form_signatory_layout` migration replaces both.

export interface Signatory {
  id: number;
  signatory_key: string; // stable key referenced by form_signatory_layout
  name: string;
  title: string;
}

export interface FormSignatoryLayoutRow {
  id: number;
  form_code: string;     // 'form1', 'form2', 'form3', ... (matches controller $mode)
  signatory_key: string; // FK -> signatories.signatory_key
  row_group: number;     // 1 = top row, 2 = middle row, 3 = approved/bottom row
  sort_order: number;    // left-to-right order within the row_group
}

// ── Master signatory list (id, key, name, title) ─────────────────────────
export const signatories: Signatory[] = [
  { id: 1, signatory_key: 'administrator',  name: 'ATTY. KENNETH M. KEMPIS',     title: 'Municipal Administrator' },
  { id: 2, signatory_key: 'budget_officer', name: 'GREG M. RADAZA, MBA',         title: 'Municipal Budget Officer' },
  { id: 3, signatory_key: 'treasurer',      name: 'LALAINE M. CARILIMAN',        title: 'Assistant Municipal Treasurer' },
  { id: 4, signatory_key: 'mpdc',           name: 'AILEL ROSE S. ASEQUIA, EnP',  title: 'Municipal Planning & Development Coordinator' },
  { id: 5, signatory_key: 'accountant',     name: 'HILAIRE MAY F. BACULIO, CPA',  title: 'Municipal Accountant' },
  { id: 6, signatory_key: 'mayor',          name: 'ATTY. JAYFRANCIS D. BAGO',    title: 'Municipal Mayor' },

  // Kept for other forms that still reference these keys in the controller
  // (hrmo, drrm_officer). Update names/titles once these forms get their
  // own layout entries below.
  { id: 7, signatory_key: 'hrmo',         name: 'JOSEPH A. ACTUB', title: 'HRMO - Designate' },
  { id: 8, signatory_key: 'drrm_officer', name: 'DRRM OFFICER',    title: 'DRRM Officer' },
];

// ── Per-form layout — which signatories appear, in which row, in what order ──
export const formSignatoryLayout: FormSignatoryLayoutRow[] = [
  // ── LBP Form 1 (B.E.S.F.) — 3 top / 2 middle / 1 approved (mayor) ───────
  { id: 1, form_code: 'form1', signatory_key: 'administrator',  row_group: 1, sort_order: 1 },
  { id: 2, form_code: 'form1', signatory_key: 'budget_officer', row_group: 1, sort_order: 2 },
  { id: 3, form_code: 'form1', signatory_key: 'treasurer',      row_group: 1, sort_order: 3 },
  { id: 4, form_code: 'form1', signatory_key: 'mpdc',           row_group: 2, sort_order: 1 },
  { id: 5, form_code: 'form1', signatory_key: 'accountant',     row_group: 2, sort_order: 2 },
  { id: 6, form_code: 'form1', signatory_key: 'mayor',          row_group: 3, sort_order: 1 },
];

// ── Convenience lookup, mirrors how the PHP side will assemble the array ──
export function getSignatoriesForForm(formCode: string) {
  const byKey = Object.fromEntries(signatories.map(s => [s.signatory_key, s]));

  const rows = formSignatoryLayout
    .filter(l => l.form_code === formCode && l.row_group < 3)
    .reduce<Record<number, Signatory[]>>((acc, l) => {
      acc[l.row_group] = acc[l.row_group] || [];
      acc[l.row_group].push(byKey[l.signatory_key]);
      return acc;
    }, {});

  const mayorEntry = formSignatoryLayout.find(
    l => l.form_code === formCode && l.row_group === 3
  );

  return {
    rows: Object.keys(rows)
      .sort((a, b) => Number(a) - Number(b))
      .map(rg => rows[Number(rg)]),
    mayor: mayorEntry ? byKey[mayorEntry.signatory_key] : undefined,
  };
}
