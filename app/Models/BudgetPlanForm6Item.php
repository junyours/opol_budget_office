<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
//DeptBpForm6Item
class BudgetPlanForm6Item extends Model
{
    use HasFactory;

    protected $table = 'dept_bp_form6_items';
    protected $fillable = ['year', 'expense_item_id', 'total_amount', 'computed_at'];

    protected $casts = [
        'computed_at' => 'datetime',
    ];

    public function expenseItem()
    {
        return $this->belongsTo(ExpenseClassItem::class, 'expense_item_id', 'expense_class_item_id');
    }
}