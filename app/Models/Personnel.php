<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Personnel extends Model
{
    use HasFactory;

    protected $table = 'personnels';
    protected $primaryKey = 'personnel_id';
    protected $fillable = [
        'first_name',
        'middle_name',
        'last_name',
        // 'step',
        // 'employment_status' – add if column exists
    ];

    // protected $casts = ['step' => 'integer'];

    public function plantillaAssignments()
    {
        return $this->hasMany(PlantillaAssignment::class, 'personnel_id', 'personnel_id');
    }
}