<?php

namespace App\Http\Controllers\Api;

use App\Models\DeptBpForm6Item;
use Illuminate\Http\Request;

class BudgetPlanForm6ItemController extends BaseMasterCrudController
{
    protected string $modelClass = DeptBpForm6Item::class;

    protected function rules($id = null): array
    {
        return [
            'year' => 'required|integer',
            'expense_item_id' => 'required|exists:expense_class_items,expense_class_item_id',
            'total_amount' => 'required|numeric|min:0',
        ];
    }
}