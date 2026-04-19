<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * LepHeaderSetting
 * One row per budget_plan_id — stores the editable LEP ordinance header fields.
 *
 * Place in: app/Models/LepHeaderSetting.php
 */
class LepHeaderSetting extends Model
{
    protected $table      = 'lep_header_settings';
    protected $primaryKey = 'id';

    protected $fillable = [
        'budget_plan_id',
        'province',
        'municipality',
        'office_name',
        'office_subtitle',
        'ordinance_session',
        'session_date_text',
        'ordinance_number',
        'ordinance_title',
        'introduced_by',
    ];

    public function budgetPlan()
    {
        return $this->belongsTo(BudgetPlan::class, 'budget_plan_id', 'budget_plan_id');
    }
}
