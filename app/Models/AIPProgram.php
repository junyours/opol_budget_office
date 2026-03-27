<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class AIPProgram extends Model
{
    protected $table = 'aip_programs'; // ← add this line
    protected $primaryKey = 'aip_program_id';

    protected $fillable = [
        'aip_reference_code',
        'program_description',
        'dept_id',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class, 'dept_id', 'dept_id');
    }

    public function form4Items(): HasMany
    {
        return $this->hasMany(DeptBpForm4Item::class, 'aip_program_id', 'aip_program_id');
    }
}