<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentBudgetPlan extends Model
{
    use HasFactory;

    protected $table = 'department_budget_plans';
    protected $primaryKey = 'dept_budget_plan_id';
    protected $fillable = [
        'dept_id',
        'budget_plan_id', 
        'status',
        'created_by',
        'updated_by',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'dept_id', 'dept_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by', 'user_id');
    }

    public function items()
    {
        return $this->hasMany(BudgetPlanForm2Item::class, 'dept_budget_plan_id', 'dept_budget_plan_id');
    }

    // public function plantillaAssignments()
    // {
    //     return $this->hasMany(BudgetPlanForm3Assignment::class, 'budget_plan_id', 'dept_budget_plan_id');
    // }
    public function plantillaAssignments()
    {
        return $this->hasMany(
            BudgetPlanForm3Assignment::class,
            'dept_budget_plan_id',   // foreign key on snapshot table
            'dept_budget_plan_id'    // local key
        );
    }

    public function form4Items()
    {
        return $this->hasMany(BudgetPlanForm4Item::class, 'budget_plan_id', 'dept_budget_plan_id');
    }

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function plantillaPosition()
{
    return $this->belongsTo(\App\Models\PlantillaPosition::class, 'plantilla_position_id', 'plantilla_position_id');
}

public function personnel()
{
    return $this->belongsTo(\App\Models\Personnel::class, 'personnel_id', 'personnel_id');
}


}
