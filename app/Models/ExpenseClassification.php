<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseClassification extends Model
{
    use HasFactory;

    protected $table = 'expense_classifications';
    protected $primaryKey = 'expense_class_id';
    protected $fillable = ['expense_class_name', 'abbreviation'];

    public function items()
    {
        return $this->hasMany(ExpenseClassItem::class, 'expense_class_id', 'expense_class_id');
    }
}