<?php

namespace App\Http\Controllers\Api;

use App\Models\ExpenseClassItem;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ExpenseClassItemController extends BaseMasterCrudController
{
    protected string $modelClass = ExpenseClassItem::class;

    /**
     * Validation rules for create and update
     */
    protected function rules($id = null): array
    {
        return [

            // CATEGORY (can update alone)
            'expense_class_id' => [
                $id ? 'sometimes' : 'required',
                'integer',
                Rule::exists('expense_classifications', 'expense_class_id')
            ],

            // NAME (can update alone)
            'expense_class_item_name' => [
                $id ? 'sometimes' : 'required',
                'string',
                'max:255',
                Rule::unique('expense_class_items', 'expense_class_item_name')
                    ->ignore($id, 'expense_class_item_id')
            ],

            // ACCOUNT CODE (optional always)
            'expense_class_item_acc_code' => [
                'sometimes',
                'nullable',
                'string',
                'max:50'
            ],

            // ACTIVE STATUS (optional always)
            'is_active' => [
                'sometimes',
                'boolean'
            ],
        ];
    }
}
