<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PlantillaAssignment extends Model
{
    use HasFactory;

    protected $table      = 'plantilla_assignments';
    protected $primaryKey = 'assignment_id';

    protected $fillable = [
        'plantilla_position_id',
        'personnel_id',
        'assignment_date',   // renamed from effective_date
    ];

    protected $casts = [
        'assignment_date' => 'date',
    ];

    public function plantilla_position()
    {
        return $this->belongsTo(PlantillaPosition::class, 'plantilla_position_id', 'plantilla_position_id');
    }

    public function personnel()
    {
        return $this->belongsTo(Personnel::class, 'personnel_id', 'personnel_id');
    }
}