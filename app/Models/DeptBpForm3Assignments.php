<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DeptBpFrom3Assignment extends Model
{
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
        'effective_date',
    ];

    protected $casts = [
        'salary_grade'  => 'integer',
        'step'          => 'integer',
        'monthly_rate'  => 'decimal:2',
        'annual_rate'   => 'decimal:2',
        'effective_date'=> 'date',
    ];

    /* ── Relationships ──────────────────────────────────────────────── */

    public function departmentBudgetPlan(): BelongsTo
    {
        return $this->belongsTo(DepartmentBudgetPlan::class, 'dept_budget_plan_id', 'dept_budget_plan_id');
    }

    public function plantillaPosition(): BelongsTo
    {
        return $this->belongsTo(PlantillaPosition::class, 'plantilla_position_id', 'plantilla_position_id');
    }

    public function personnel(): BelongsTo
    {
        return $this->belongsTo(Personnel::class, 'personnel_id', 'personnel_id');
    }
}