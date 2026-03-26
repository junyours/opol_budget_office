<?php
// app/Models/PsComputationValue.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class PsComputationValue extends Model
{
    protected $table      = 'ps_computation_values';
    protected $primaryKey = 'ps_computation_id';

    protected $fillable = [
        'budget_plan_id',
        'total_income',
        'non_recurring_income',
        'excess_amount',
    ];

    protected $casts = [
        'total_income'         => 'decimal:2',
        'non_recurring_income' => 'decimal:2',
        'excess_amount'        => 'decimal:2',
    ];

    public function budgetPlan(): BelongsTo
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }
}