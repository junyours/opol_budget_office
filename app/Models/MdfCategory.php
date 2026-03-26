<?php
// app/Models/MdfCategory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MdfCategory extends Model
{
    protected $primaryKey = 'category_id';

    protected $fillable = [
        'name',
        'code',
        'is_debt_servicing',
        'sort_order',
    ];

    protected $casts = [
        'is_debt_servicing' => 'boolean',
    ];

    public function items(): HasMany
    {
        return $this->hasMany(MdfItem::class, 'category_id', 'category_id')
                    ->orderBy('sort_order')
                    ->orderBy('item_id');
    }
}