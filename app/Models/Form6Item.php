<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Form6Item extends Model
{
    protected $primaryKey = 'form6_item_id';

    protected $fillable = [
        'budget_plan_id',
        'source',           // 'general-fund' | 'occ' | 'pm' | 'sh' | …
        'form6_template_id',
        'amount',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'amount' => 'float',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function template()
    {
        return $this->belongsTo(Form6Template::class, 'form6_template_id', 'form6_template_id');
    }
}