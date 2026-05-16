<?php

namespace App\Notifications;

use App\Models\DepartmentBudgetPlan;
use Illuminate\Notifications\Notification;

class BudgetProposalReturned extends Notification
{
    public function __construct(public DepartmentBudgetPlan $plan) {}

    public function via(): array { return ['database']; }

    public function toDatabase(): array
    {
        return [
            'type'                => 'budget_returned',
            'dept_budget_plan_id' => $this->plan->dept_budget_plan_id,
            'budget_year'         => $this->plan->budgetPlan?->year,
            'message'             => "Your budget proposal for FY {$this->plan->budgetPlan?->year} was returned for revision.",
        ];
    }
}
