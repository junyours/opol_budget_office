<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

class AuditLog extends Model
{
    public const UPDATED_AT = null;

    protected $table   = 'audit_logs';
    protected $guarded = [];

    protected $casts = [
        'changes'          => 'array',
        'budget_plan_year' => 'integer',
        'created_at'       => 'datetime',
    ];

    /**
     * Admins must never see super-admin activity.
     * Super-admins see everything (including their own).
     */
    public function scopeVisibleTo(Builder $query, User $viewer): Builder
    {
        if ($viewer->role === 'super-admin') {
            return $query;
        }

        return $query->where(function (Builder $q) {
            $q->whereNull('user_role')->orWhere('user_role', '!=', 'super-admin');
        });
    }
}
