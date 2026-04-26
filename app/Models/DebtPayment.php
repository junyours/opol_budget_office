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
        'principal_sem1',
        'principal_sem2',
        'principal_due',
        'interest_sem1',
        'interest_sem2',
        'interest_due',
        'obligation_principal_amount',
        'obligation_interest_amount',
    ];

    protected $casts = [
        'principal_sem1'              => 'decimal:2',
        'principal_sem2'              => 'decimal:2',
        'principal_due'               => 'decimal:2',
        'interest_sem1'               => 'decimal:2',
        'interest_sem2'               => 'decimal:2',
        'interest_due'                => 'decimal:2',
        'obligation_principal_amount' => 'decimal:2',
        'obligation_interest_amount'  => 'decimal:2',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function obligation()
    {
        return $this->belongsTo(DebtObligation::class, 'obligation_id', 'obligation_id');
    }

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }
}
