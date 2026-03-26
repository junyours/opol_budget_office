<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryStandardVersion extends Model
{
    use HasFactory;

    protected $table = 'salary_standard_versions';
    protected $primaryKey = 'salary_standard_version_id';
    protected $fillable = [
        'lbc_reference',
        'tranche',
        'income_class',
        'effective_year',
        'is_active',
    ];

    protected $casts = [
        'effective_year' => 'date',        
        'is_active' => 'boolean',
    ];

    public function steps()
    {
        return $this->hasMany(SalaryGradeStep::class, 'salary_standard_version_id', 'salary_standard_version_id');
    }
}