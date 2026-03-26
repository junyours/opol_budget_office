<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetPlanForm3Assignment extends Model
{
    use HasFactory;

    protected $table      = 'dept_bp_from3_assignments';
    protected $primaryKey = 'dept_bp_from3_assignment_id';

    protected $fillable = [
        'dept_budget_plan_id',
        'plantilla_position_id',
        'personnel_id',
        'salary_grade',
        'step',
        'monthly_rate',
        'annual_rate',
        'annual_increment',           // new: incrAnnual from the 3rd (increment) row; null if no step-up
        'step_effective_date',
        'salary_standard_version_id',
    ];

    protected $casts = [
        'monthly_rate'               => 'decimal:2',
        'annual_rate'                => 'decimal:2',
        'annual_increment'           => 'decimal:2',  // nullable
        'salary_grade'               => 'integer',
        'step'                       => 'integer',
        'step_effective_date'        => 'date',
        'salary_standard_version_id' => 'integer',
    ];

    public function plantillaPosition()
    {
        return $this->belongsTo(PlantillaPosition::class, 'plantilla_position_id', 'plantilla_position_id');
    }

    public function personnel()
    {
        return $this->belongsTo(Personnel::class, 'personnel_id', 'personnel_id');
    }

    public function budgetPlan()
    {
        return $this->belongsTo(
            DepartmentBudgetPlan::class,
            'dept_budget_plan_id',
            'dept_budget_plan_id'
        );
    }

    public function salaryVersion()
    {
        return $this->belongsTo(
            SalaryStandardVersion::class,
            'salary_standard_version_id',
            'salary_standard_version_id'
        );
    }
}
