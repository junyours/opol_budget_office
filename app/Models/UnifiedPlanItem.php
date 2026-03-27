<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class UnifiedPlanItem extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'up_item_id';
    protected $table      = 'unified_plan_items';

    // ── Plan type registry ─────────────────────────────────────────────────────

    /** All valid plan_type values */
    const PLAN_TYPES = [
        'mpoc', 'drugs', 'arts', 'aids', 'sc_ppa',   // sector plans
        'lcpc', 'lydp', 'sc',                          // fund plans
        'nutrition',                                    // nutrition
    ];

    const PLAN_LABELS = [
        'mpoc'      => 'Municipal Peace and Order & Public Safety Plan',
        'drugs'     => 'List of PPAs to Combat Illegal Drugs',
        'arts'      => 'Local Annual Cultural & Arts Development Plan',
        'aids'      => 'List of PPAs to Combat AIDS',
        'sc_ppa'    => "List of PPAs for Senior Citizens",
        'lcpc'      => 'Local Council for the Protection of Children',
        'lydp'      => 'Local Youth Development Program',
        'sc'        => 'Social Welfare Program for Senior Citizens',
        'nutrition' => 'Nutrition Action Plan',
    ];

    /**
     * Plans using sector + target_aip/ab + aip_amount/ab_amount (no PS/MOOE/CO split)
     */
    const SECTOR_PLANS = ['mpoc', 'drugs', 'arts', 'aids', 'sc_ppa'];

    /**
     * Plans using fund_source + PS/MOOE/CO (no AB column)
     */
    const FUND_PLANS = ['lcpc', 'lydp', 'sc'];

    // ── Fillable ───────────────────────────────────────────────────────────────

    protected $fillable = [
        'plan_type', 'budget_plan_id', 'aip_program_id',
        'dept_id', 'implementing_office',
        'sector', 'sub_sector', 'program_description',
        'target_output_aip', 'target_output_ab',
        'aip_amount', 'ab_amount',
        'fund_source',
        'ps_amount', 'mooe_amount', 'co_amount',
        'start_date', 'completion_date',
        'cc_adaptation', 'cc_mitigation', 'cc_typology_code',
        'nutrition_issue', 'nutrition_objective', 'nutrition_activity',
        'nutrition_target', 'lead_office_text',
        'sort_order', 'is_subtotal_row', 'row_label',
    ];

    protected $casts = [
        'aip_amount'     => 'decimal:2',
        'ab_amount'      => 'decimal:2',
        'ps_amount'      => 'decimal:2',
        'mooe_amount'    => 'decimal:2',
        'co_amount'      => 'decimal:2',
        'cc_adaptation'  => 'decimal:2',
        'cc_mitigation'  => 'decimal:2',
        'sort_order'     => 'integer',
        'is_subtotal_row'=> 'boolean',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function aipProgram(): BelongsTo
    {
        return $this->belongsTo(AIPProgram::class, 'aip_program_id', 'aip_program_id');
    }

    public function budgetPlan(): BelongsTo
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'dept_id', 'dept_id');
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    public function getOfficeDisplayAttribute(): ?string
    {
        if ($this->department) {
            return $this->department->dept_abbreviation ?? $this->department->dept_name;
        }
        return $this->implementing_office ?? $this->lead_office_text;
    }

    public function getFundSourceLabelAttribute(): string
    {
        return match ($this->fund_source) {
            'special_account' => 'Special Account',
            default           => 'General Fund',
        };
    }

    public function getPlanLabelAttribute(): string
    {
        return self::PLAN_LABELS[$this->plan_type] ?? strtoupper($this->plan_type);
    }

    /** True if this plan type uses sector + AIP/AB dual-amount columns */
    public function getIsSectorPlanAttribute(): bool
    {
        return in_array($this->plan_type, self::SECTOR_PLANS);
    }

    /** True if this plan type uses fund_source + PS/MOOE/CO */
    public function getIsFundPlanAttribute(): bool
    {
        return in_array($this->plan_type, self::FUND_PLANS);
    }

    public function getIsNutritionAttribute(): bool
    {
        return $this->plan_type === 'nutrition';
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeForPlan($query, int $planId)
    {
        return $query->where('budget_plan_id', $planId);
    }

    public function scopeOfType($query, string $planType)
    {
        return $query->where('plan_type', $planType);
    }
}