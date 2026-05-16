export interface AppNotification {
  id:                   string;
  type:                 'budget_submitted' | 'budget_approved' | 'budget_returned';
  message:              string;
  dept_id:              number | null;
  dept_name:            string | null;
  dept_abbreviation:    string | null;
  dept_budget_plan_id:  number | null;
  budget_year:          number | null;
  created_at:           string;
}
