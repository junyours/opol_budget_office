<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentReviewSchedule extends Model
{
    use HasFactory;

    protected $table      = 'department_review_schedules';
    protected $primaryKey = 'dept_review_schedule_id';

    protected $fillable = [
        'dept_id',
        'budget_plan_id',
        'review_date',
        'period',
        'review_time',
        'location',
        'status',
        'reschedule_reason',
        'previous_date',
        'previous_period',
        'previous_time',
        'rescheduled_at',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'review_date'    => 'date',
        'previous_date'  => 'date',
        'rescheduled_at' => 'datetime',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'dept_id', 'dept_id');
    }

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by', 'user_id');
    }

    public function updatedBy()
    {
        return $this->belongsTo(User::class, 'updated_by', 'user_id');
    }
}
