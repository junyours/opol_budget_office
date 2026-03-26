<?php
// app/Models/MDFFundAmount.php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MDFFundAmount extends Model
{
    use HasFactory;

    protected $table = 'mdf_fund_amounts';

    protected $fillable = [
        'mdf_fund_id',
        'budget_plan_id',
        'amount'
    ];

    protected $casts = [
        'amount' => 'decimal:2'
    ];

    public function mdfFund()
    {
        return $this->belongsTo(MDFFund::class);
    }

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class);
    }
}