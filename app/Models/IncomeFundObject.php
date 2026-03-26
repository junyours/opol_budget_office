<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class IncomeFundObject extends Model
{
    protected $table = 'income_fund_objects';
    
    protected $fillable = [
        'parent_id',
        'code',
        'name',
        'level',
        'sort_order'
    ];

    public function parent()
    {
        return $this->belongsTo(IncomeFundObject::class, 'parent_id');
    }

    public function children()
    {
        return $this->hasMany(IncomeFundObject::class, 'parent_id');
    }

    public function amounts()
    {
        return $this->hasMany(IncomeFundAmount::class, 'income_fund_object_id');
    }
}