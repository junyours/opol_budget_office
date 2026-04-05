<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetPlanForm2Item extends Model
{
    use HasFactory;

    protected $table = 'dept_bp_form2_items';
    protected $primaryKey = 'dept_bp_form2_item_id';
    // public function getRouteKeyName()
    // {
    //     return 'dept_bp_form2_item_id';
    // }
    protected $fillable = [
        'dept_budget_plan_id',
        'expense_item_id',
        'sem1_amount',
        'sem2_amount',
        'total_amount',
        'obligation_amount',
        'recommendation',
        'updated_by',
    ];

    protected $casts = [
        'sem1_amount'       => 'decimal:2',
        'sem2_amount'       => 'decimal:2',
        'total_amount'      => 'decimal:2',
        'obligation_amount' => 'decimal:2',
    ];

    public function budgetPlan()
    {
        return $this->belongsTo(DepartmentBudgetPlan::class, 'dept_budget_plan_id', 'dept_budget_plan_id');
    }

    public function expenseItem()
    {
        return $this->belongsTo(ExpenseClassItem::class, 'expense_item_id', 'expense_class_item_id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by', 'user_id');
    }
}