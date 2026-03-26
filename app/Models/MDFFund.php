<?php
// app/Models/MDFFund.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MDFFund extends Model
{
    use HasFactory;

    protected $table = 'mdf_funds';

    protected $fillable = [
        'account_code',
        'object_of_expenditure',
        'category',
        'level',
        'parent_id',
        'is_editable',
        'is_total_row',
        'sort_order'
    ];

    protected $casts = [
        'is_editable' => 'boolean',
        'is_total_row' => 'boolean',
        'level' => 'integer',
        'sort_order' => 'integer'
    ];

    public function parent()
    {
        return $this->belongsTo(MDFFund::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(MDFFund::class, 'parent_id')->orderBy('sort_order');
    }

    public function amounts()
    {
        return $this->hasMany(MDFFundAmount::class);
    }

    public function getAmountForBudgetPlan($budgetPlanId)
    {
        $amount = $this->amounts()->where('budget_plan_id', $budgetPlanId)->first();
        return $amount ? $amount->amount : null;
    }
}