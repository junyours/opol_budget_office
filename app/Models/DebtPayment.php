<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DebtPayment extends Model
{
    use HasFactory;

    protected $table      = 'debt_payments';
    protected $primaryKey = 'payment_id';

    protected $fillable = [
        'obligation_id',
        'budget_plan_id',
        'principal_due',
        'interest_due',
    ];

    protected $casts = [
        'principal_due' => 'decimal:2',
        'interest_due'  => 'decimal:2',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function obligation()
    {
        return $this->belongsTo(DebtObligation::class, 'obligation_id', 'obligation_id');
    }

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'id');
    }
}