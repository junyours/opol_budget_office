// types/api.ts

export type UserRole = 'admin' | 'super-admin' | 'admin-hrmo' | 'department-head';

export interface User {
  user_id: number;
  username: string;
  fname: string;
  mname: string | null;
  lname: string;
  avatar:string;
  role: UserRole;
  dept_id?: number | null; // only for department-head
  is_online: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department; // when included via ?include=
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}

///////////////////////////////////////////////////////////

export interface ExpenseClassification {
  expense_class_id: number;
  expense_class_name: string;
  abbreviation: string;

}

export interface ExpenseItem {
  expense_class_item_id: number;
  expense_class_item_name: string;
  expense_class_id: number;   // ← this is the correct foreign key
  expense_class_item_acc_code: string;
  // other fields as needed
}

export interface DepartmentBudgetPlanItem {
  dept_bp_form2_item_id: number;
  dept_budget_plan_id: number;
  expense_item_id: number;
  sem1_amount: number | null;
  sem2_amount: number | null;
  total_amount: number;
  expense_item?: ExpenseItem;
}

export interface DepartmentBudgetPlan {
  dept_budget_plan_id: number;
  budget_plan_id: number;      // 👈 new parent ID
  year: number;                // kept (can be derived or accessor)
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  dept_id: number;
  created_at: string;
  updated_at: string;
  items: DepartmentBudgetPlanItem[];
  department?: Department;
  budget_plan?: BudgetPlan;
}

///////////////////////////////////////////////////////////

export interface DepartmentCategory {
  dept_category_id: number;
  dept_category_name: string;
}

export interface Department {
  dept_id: number;
  dept_name: string;
  dept_abbreviation: string;
  dept_category_id: number;
  mandate: string | null;
  logo: string | null;
  category?: DepartmentCategory;
}

///////////////////////////////////////////////
export interface SalaryStandardVersion {
  salary_standard_version_id: number;
  lbc_reference: string;
  tranche: string;
  income_class: string;
  effective_year: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Salary Grade Step
export interface SalaryGradeStep {
  salary_grade_step_id: number;
  salary_standard_version_id: number;
  salary_grade: number;
  step: number;
  salary: number;          // from API
  amount?: number;         // alias for display (set in hook)
}

// Plantilla Position
export interface PlantillaPosition {
  plantilla_position_id: number;
  old_item_number: string | null;
  new_item_number: string;
  position_title: string;
  salary_grade: number;
  dept_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  department?: Department;
}

// Personnel
export interface Personnel {
  personnel_id: number;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  // step: number;
  plantilla_position_id: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  plantillaPosition?: PlantillaPosition;
}

// For previewing parsed Excel data
export interface ParsedSalaryGrade {
  salary_grade: number;
  step1: number;
  step2: number;
  step3: number;
  step4: number;
  step5: number;
  step6: number;
  step7: number;
  step8: number;
}

export interface ParsedPlantilla {
  old_item_number: string | null;
  new_item_number: string;
  position_title: string;
  salary_grade: number;
  dept_id: number;
}

export interface ParsedPersonnel {
  first_name: string;
  middle_name: string | null;
  last_name: string;
  step: number;
  // plantilla assignment will be resolved after preview
}
/////////////////////////////////

export interface PlantillaAssignment {
  assignment_id: number;
  plantilla_position_id: number;
  personnel_id: number | null;
  personnel?: Personnel; // when included via ?include=
}
/////////////////////////////////////
export interface PlantillaAssignmentSnapshot {
  assignment_id: number;
  plantilla_position_id: number;
  personnel_id: number | null;
  personnel?: Personnel | null;          // optional, if included
  plantilla_position?: PlantillaPosition; // optional, if included
  monthly_rate: number;                  // stored at time of assignment
  annual_rate: number;                   // stored at time of assignment
  salary_grade: number;                  // copied from plantilla position (or snapshot)
  step: number;                           // from personnel at that time
  created_at: string;
  updated_at: string;
}
///////////////////////////////////////////////////////////
export interface DepartmentBudgetPlanForm4Item {
  dept_bp_form4_item_id: number;
  budget_plan_id: number;
  aip_program_id: number;
  aip_reference_code: string | null;
  program_description: string | null;
  major_final_output: string | null;
  performance_indicator: string | null;
  target: string | null;
  ps_amount: number;
  mooe_amount: number;
  co_amount: number;
  sem1_amount: number;
  sem2_amount: number;
  total_amount: number;
  created_at: string;
  updated_at: string;
}

//Parent
export interface BudgetPlan {
  budget_plan_id: number;
  year: number;
  is_active: boolean;
  is_open:        boolean;
  created_at: string;
  updated_at: string;
}

///////////////////////////////////////////////////

// types/api.ts
// export interface IncomeFundRow {
//   id: number;
//   parent_id: number | null;
//   code: string | null;
//   name: string;
//   level: number;
//   past: number | null;
//   current_total: number | null;
//   sem1: number | null;
//   sem2: number | null;
//   proposed: number | null;
// }

// export interface IncomeFundResponse {
//   year: number;
//   past_year: number;
//   current_year: number;
//   source: string;
//   data: IncomeFundRow[];
// }

// export interface IncomeFundResponse {
//   data: IncomeFundRow[]
//   year: number
//   past_year: number
//   current_year: number
//   source: string
//   records_exist: boolean
// }

export interface IncomeFundRow {
  id: number
  parent_id: number | null
  code: string
  name: string
  level: number
  past: number | null
  current_total: number | null
  sem1: number | null
  sem2: number | null
  proposed: number | null
}

export interface IncomeFundResponse {
  data: IncomeFundRow[]
  year: number
  past_year: number
  current_year: number
  source: string
  records_exist: boolean
}

/////////////////////////////////////////////////

// ── Add to types/api.ts ────────────────────────────────────────────────────

export interface MdfItem {
  item_id: number;
  category_id: number;
  name: string;
  account_code: string | null;
  obligation_id: number | null;
  debt_type: "principal" | "interest" | null;
  sort_order: number;
  is_debt_row: boolean;
  snapshot_id: number | null;
  past_actual: number;
  sem1_actual: number;
  sem2_estimate: number;
  current_total: number;
  proposed: number;
}

export interface MdfCategory {
  category_id: number;
  name: string;
  code: string | null;
  is_debt_servicing: boolean;
  sort_order: number;
  items: MdfItem[];
  totals: {
    past_actual: number;
    sem1_actual: number;
    sem2_estimate: number;
    current_total: number;
    proposed: number;
  };
}

export interface MdfFundResponse {
  budget_plan: { budget_plan_id: number; year: number };
  years: { proposed: number; current: number; past: number };
  categories: MdfCategory[];
  grand_totals: {
    past_actual: number;
    sem1_actual: number;
    sem2_estimate: number;
    current_total: number;
    proposed: number;
  };
}