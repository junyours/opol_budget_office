<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class GadEntry extends Model
{
    use HasFactory, SoftDeletes;

    // Laravel would pluralize GadEntry → g_a_d_entries — override explicitly
    protected $table = 'gad_entries';

    protected $primaryKey = 'gad_entry_id';

    protected $fillable = [
        'budget_plan_id',
        'focus_type',
        'gender_issue',
        'gad_objective',
        'relevant_program',
        'gad_activity',
        'performance_indicator',
        'mooe',
        'department_id',
        'lead_office_text',
        'group_key',
        'sort_order',
    ];

    protected $casts = [
        'mooe'       => 'decimal:2',
        'sort_order' => 'integer',
    ];

    // ── Relationships ──────────────────────────────────────────────────────────

    public function budgetPlan(): BelongsTo
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'department_id', 'dept_id');
    }

    // ── Accessors ──────────────────────────────────────────────────────────────

    /**
     * Returns the display label for the responsible office.
     * Prefers the linked department abbreviation/name, falls back to free-text.
     */
    public function getLeadOfficeDisplayAttribute(): ?string
    {
        if ($this->department) {
            return $this->department->dept_abbreviation ?? $this->department->dept_name;
        }
        return $this->lead_office_text;
    }

    // ── Scopes ─────────────────────────────────────────────────────────────────

    public function scopeForPlan($query, int $planId)
    {
        return $query->where('budget_plan_id', $planId);
    }

    public function scopeClient($query)
    {
        return $query->where('focus_type', 'client');
    }

    public function scopeOrganization($query)
    {
        return $query->where('focus_type', 'organization');
    }
}