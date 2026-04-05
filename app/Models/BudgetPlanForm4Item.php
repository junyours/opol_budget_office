<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetPlanForm4Item extends Model
{
    use HasFactory;

    protected $table = 'dept_bp_form4_items';
    protected $primaryKey = 'dept_bp_form4_item_id';
    protected $fillable = [
        'budget_plan_id',
        'aip_reference_code',
        'program_description',
        'major_final_output',
        'performance_indicator',
        'target',
        'ps_amount',
        'mooe_amount',
        'co_amount',
        'total_amount',
        'obligation_amount',
    ];

    protected $casts = [
        'ps_amount'         => 'decimal:2',
        'mooe_amount'       => 'decimal:2',
        'co_amount'         => 'decimal:2',
        'total_amount'      => 'decimal:2',
        'obligation_amount' => 'decimal:2',
    ];

    public function budgetPlan()
    {
        return $this->belongsTo(DepartmentBudgetPlan::class, 'budget_plan_id', 'dept_budget_plan_id');
    }
}