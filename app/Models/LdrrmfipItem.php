<?php
// app/Models/LdrrmfipItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class LdrrmfipItem extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'ldrrmfip_item_id';

    protected $fillable = [
        'budget_plan_id',
        'ldrrmfip_category_id',
        'source',
        'description',
        'implementing_office',
        'starting_date',
        'completion_date',
        'expected_output',
        'funding_source',
        'mooe',
        'co',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'mooe' => 'float',
        'co'   => 'float',
    ];

    public function getTotalAttribute(): float
    {
        return $this->mooe + $this->co;
    }

    protected $appends = ['total'];

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function category()
    {
        return $this->belongsTo(LdrrmfipCategory::class, 'ldrrmfip_category_id', 'ldrrmfip_category_id');
    }
}