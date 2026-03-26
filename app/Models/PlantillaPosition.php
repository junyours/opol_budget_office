<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlantillaPosition extends Model
{
    use HasFactory;

    protected $table = 'plantilla_positions';
    protected $primaryKey = 'plantilla_position_id';
    protected $fillable = [
        'old_item_number',
        'new_item_number',
        'position_title',
        'salary_grade',
        'dept_id',
        'is_active',
    ];

    protected $casts = [
        'salary_grade' => 'integer',
        'is_active' => 'boolean',
    ];

    public function department()
    {
        return $this->belongsTo(Department::class, 'dept_id', 'dept_id');
    }

    public function assignments()
    {
        return $this->hasMany(PlantillaAssignment::class, 'plantilla_position_id', 'plantilla_position_id');
    }

    public function assignment()
        {
            // only the latest assignment per position
            return $this->hasOne(PlantillaAssignment::class, 'plantilla_position_id')->latest('effective_date');
        }
    
}