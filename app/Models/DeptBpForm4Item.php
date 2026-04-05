<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeptBpForm4Item extends Model
{
    protected $primaryKey = 'dept_bp_form4_item_id';

    protected $fillable = [
        'aip_program_id',
        'dept_budget_plan_id',
        'major_final_output',
        'performance_indicator',
        'target',
        'ps_amount',
        'mooe_amount',
        'co_amount',
        // total_amount is DB-computed (storedAs) — not fillable
        'sem1_amount',
        'sem2_amount',
        'obligation_amount',
        'recommendation',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'ps_amount'    => 'decimal:2',
        'mooe_amount'  => 'decimal:2',
        'co_amount'    => 'decimal:2',
        'total_amount' => 'decimal:2',
        'sem1_amount'  => 'decimal:2',
        'sem2_amount'  => 'decimal:2',
    ];

    public function aipProgram(): BelongsTo
    {
        return $this->belongsTo(AIPProgram::class, 'aip_program_id', 'aip_program_id');
    }

    public function budgetPlan(): BelongsTo
    {
        return $this->belongsTo(DepartmentBudgetPlan::class, 'dept_budget_plan_id', 'dept_budget_plan_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function updatedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'updated_by', 'user_id');
    }
}