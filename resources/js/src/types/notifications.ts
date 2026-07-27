export interface AppNotification {
  id: string;
  type: 'budget_submitted' | 'budget_under_review' | 'budget_approved' | 'budget_returned';
  message: string;
  reason?: string | null;
  dept_id?: number;
  dept_name?: string;
  dept_abbreviation?: string;
  dept_budget_plan_id?: number;
  budget_year?: number;
  created_at: string;
  read_at: string | null;
}
