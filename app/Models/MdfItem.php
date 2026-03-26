<?php
// app/Models/MdfItem.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class MdfItem extends Model
{
    use SoftDeletes;

    protected $primaryKey = 'item_id';

    protected $fillable = [
        'category_id',
        'name',
        'obligation_id',
        'debt_type',
        'account_code',
        'sort_order',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function category(): BelongsTo
    {
        return $this->belongsTo(MdfCategory::class, 'category_id', 'category_id');
    }

    public function obligation(): BelongsTo
    {
        return $this->belongsTo(DebtObligation::class, 'obligation_id', 'obligation_id');
    }

    public function snapshots(): HasMany
    {
        return $this->hasMany(MdfSnapshot::class, 'item_id', 'item_id');
    }
}