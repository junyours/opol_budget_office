<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DepartmentPlantillaBudget extends Model
{
    protected $table = 'department_plantilla_budgets';
    protected $primaryKey = 'department_plantilla_budget_id';

    protected $fillable = [
        'dept_budget_plan_id',
        'plantilla_position_id',
        'incumbent_name',
        'employment_status',
        'current_salary_standard_version_id',
        'current_salary_grade',
        'current_step',
        'current_amount',
        'proposed_salary_standard_version_id',
        'proposed_salary_grade',
        'proposed_step',
        'proposed_amount',
        'increase_amount',
        'remarks'
    ];

    protected $casts = [
        'current_amount' => 'decimal:2',
        'proposed_amount' => 'decimal:2',
        'increase_amount' => 'decimal:2',
        'created_at' => 'datetime',
        'updated_at' => 'datetime'
    ];

    /**
     * Get the budget plan that this plantilla budget belongs to
     */
    public function budgetPlan()
    {
        return $this->belongsTo(DepartmentBudgetPlan::class, 'dept_budget_plan_id', 'dept_budget_plan_id');
    }

    /**
     * Get the plantilla position
     */
    public function position()
    {
        return $this->belongsTo(PlantillaPosition::class, 'plantilla_position_id', 'plantilla_position_id');
    }

    /**
     * Get the current salary standard version
     */
    public function currentSalaryStandard()
    {
        return $this->belongsTo(SalaryStandardVersion::class, 'current_salary_standard_version_id', 'salary_standard_version_id');
    }

    /**
     * Get the proposed salary standard version
     */
    public function proposedSalaryStandard()
    {
        return $this->belongsTo(SalaryStandardVersion::class, 'proposed_salary_standard_version_id', 'salary_standard_version_id');
    }
}