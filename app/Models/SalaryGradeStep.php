<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalaryGradeStep extends Model
{
    use HasFactory;

    protected $table = 'salary_grade_steps';
    protected $primaryKey = 'salary_grade_step_id';
    protected $fillable = [
        'salary_standard_version_id',
        'salary_grade',
        'step',
        'salary',
    ];

    protected $casts = [
        'salary_grade' => 'integer',
        'step' => 'integer',
        'salary' => 'decimal:2',
    ];

    public function version()
    {
        return $this->belongsTo(SalaryStandardVersion::class, 'salary_standard_version_id', 'salary_standard_version_id');
    }
}