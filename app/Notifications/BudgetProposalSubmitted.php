<?php

namespace App\Notifications;

use App\Models\DepartmentBudgetPlan;
use Illuminate\Notifications\Notification;

class BudgetProposalSubmitted extends Notification
{
    public function __construct(public DepartmentBudgetPlan $plan) {}

    public function via(): array
    {
        return ['database'];
    }

    public function toDatabase(): array
    {
        return [
            'type'                 => 'budget_submitted',
            'dept_budget_plan_id'  => $this->plan->dept_budget_plan_id,
            'dept_id'              => $this->plan->dept_id,
            'dept_name'            => $this->plan->department?->dept_name ?? 'Unknown',
            'dept_abbreviation'    => $this->plan->department?->dept_abbreviation ?? '',
            'budget_year'          => $this->plan->budgetPlan?->year,
            'message'              => "{$this->plan->department?->dept_name} submitted their budget proposal.",
        ];
    }
}
