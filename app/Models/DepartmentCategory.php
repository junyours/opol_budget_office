<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class DepartmentCategory extends Model
{
    use HasFactory;

    protected $table = 'department_categories';
    protected $primaryKey = 'dept_category_id';
    protected $fillable = ['dept_category_name'];

    public function departments()
    {
        return $this->hasMany(Department::class, 'dept_category_id', 'dept_category_id');
    }
}