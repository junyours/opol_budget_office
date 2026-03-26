<?php
// app/Models/LdrrmfipCategory.php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class LdrrmfipCategory extends Model
{
    protected $primaryKey = 'ldrrmfip_category_id';

    protected $fillable = ['name', 'sort_order', 'is_active'];

    protected $casts = [
        'is_active'  => 'boolean',
        'sort_order' => 'integer',
    ];

    public function items()
    {
        return $this->hasMany(LdrrmfipItem::class, 'ldrrmfip_category_id', 'ldrrmfip_category_id');
    }
}