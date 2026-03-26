<?php
// app/Models/MdfSnapshot.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class MdfSnapshot extends Model
{
    protected $primaryKey = 'snapshot_id';

    protected $fillable = [
        'item_id',
        'budget_plan_id',
        'total_amount',
        'sem1_actual',
    ];

    protected $casts = [
        'total_amount' => 'float',
        'sem1_actual'  => 'float',
    ];

    // sem2 is always derived — never stored separately
    public function getSem2Attribute(): float
    {
        return max(0.0, $this->total_amount - $this->sem1_actual);
    }

    public function item(): BelongsTo
    {
        return $this->belongsTo(MdfItem::class, 'item_id', 'item_id');
    }

    public function budgetPlan(): BelongsTo
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }
}