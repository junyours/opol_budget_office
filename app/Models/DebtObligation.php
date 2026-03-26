<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class DebtObligation extends Model
{
    use HasFactory, SoftDeletes;

    protected $table      = 'debt_obligations';
    protected $primaryKey = 'obligation_id';

    protected $fillable = [
        'creditor',
        'date_contracted',
        'term',
        'principal_amount',
        'purpose',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'principal_amount' => 'decimal:2',
        'is_active'        => 'boolean',
        'sort_order'       => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    /** All payment records across every budget-plan year */
    public function payments()
    {
        return $this->hasMany(DebtPayment::class, 'obligation_id', 'obligation_id');
    }

    /** Payment record for a specific budget plan */
    public function paymentForPlan(int $budgetPlanId)
    {
        return $this->payments()->where('budget_plan_id', $budgetPlanId)->first();
    }
}