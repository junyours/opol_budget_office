<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncomeFundAmount extends Model
{
    protected $table = 'income_fund_amounts';

    protected $fillable = [
        'budget_plan_id',
        'income_fund_object_id',
        'source',
        'sem1_actual',
        'sem2_actual',
        'proposed_amount',
        'obligation_amount',
    ];

    protected $casts = [
        'sem1_actual' => 'decimal:2',
        'sem2_actual' => 'decimal:2',
        'proposed_amount' => 'decimal:2',
        'obligation_amount' => 'decimal:2',
    ];

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function object()
    {
        return $this->belongsTo(IncomeFundObject::class, 'income_fund_object_id');
    }
}
