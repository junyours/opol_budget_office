<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ExpenseClassItem extends Model
{
    use HasFactory;

    protected $table = 'expense_class_items';
    protected $primaryKey = 'expense_class_item_id';
    protected $fillable = [
        'expense_class_id',
        'expense_class_item_name',
        'expense_class_item_acc_code',
        'is_active',
    ];

    protected $casts = ['is_active' => 'boolean'];

    public function classification()
    {
        return $this->belongsTo(ExpenseClassification::class, 'expense_class_id', 'expense_class_id');
    }

    public function budgetPlanItems()
    {
        return $this->hasMany(BudgetPlanForm2Item::class, 'expense_item_id', 'expense_class_item_id');
    }
}