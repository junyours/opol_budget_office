<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BudgetPlan extends Model
{
    use HasFactory;

    protected $table      = 'budget_plans';
    protected $primaryKey = 'budget_plan_id';

    protected $fillable = [
        'year',
        'is_active',
        'is_open',   // ← controls whether dept heads can submit plans
    ];

    protected $casts = [
        'year'      => 'integer',
        'is_active' => 'boolean',
        'is_open'   => 'boolean',
    ];

    public function departmentPlans()
    {
        return $this->hasMany(DepartmentBudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }
}