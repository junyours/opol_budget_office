<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class DashboardAnnouncement extends Model
{
    protected $fillable = [
        'type', 'title', 'description', 'dept_id',
        'accent_color', 'icon', 'event_date', 'is_active', 'sort_order',
    ];

    protected $casts = [
        'event_date' => 'date',
        'is_active'  => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'dept_id', 'dept_id');
    }
}
