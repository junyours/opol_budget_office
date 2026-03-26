<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Department extends Model
{
    use HasFactory;

    protected $table = 'departments';
    protected $primaryKey = 'dept_id';
    protected $fillable = [
        'dept_name', 
        'dept_abbreviation', 
        'dept_category_id', 
        'mandate',
        'logo',];

   public function category()
    {
        return $this->belongsTo(
            DepartmentCategory::class,
            'dept_category_id',
            'dept_category_id'
        );
    }

    public function users()
    {
        return $this->hasMany(User::class, 'dept_id', 'dept_id');
    }

    public function plantillaPositions()
    {
        return $this->hasMany(PlantillaPosition::class, 'dept_id', 'dept_id');
    }

    public function budgetPlans()
    {
        return $this->hasMany(DepartmentBudgetPlan::class, 'dept_id', 'dept_id');
    }
}