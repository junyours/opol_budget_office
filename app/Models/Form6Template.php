<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Form6Template extends Model
{
    protected $primaryKey = 'form6_template_id';

    protected $fillable = [
        'code',
        'label',
        'parent_code',
        'sort_order',
        'show_peso_sign',
        'is_section',
        'is_computed',
        'level',
    ];

    protected $casts = [
        'show_peso_sign' => 'boolean',
        'is_section'     => 'boolean',
        'is_computed'    => 'boolean',
        'level'          => 'integer',
        'sort_order'     => 'integer',
    ];

    // ── Relationships ─────────────────────────────────────────────────────────

    public function items()
    {
        return $this->hasMany(Form6Item::class, 'form6_template_id', 'form6_template_id');
    }

    public function parent()
    {
        return $this->belongsTo(Form6Template::class, 'parent_code', 'code');
    }

    public function children()
    {
        return $this->hasMany(Form6Template::class, 'parent_code', 'code')
                    ->orderBy('sort_order');
    }
}
