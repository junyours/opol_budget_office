<?php

namespace App\Http\Controllers\Api;

use App\Models\ExpenseClassification;

class ExpenseClassificationController extends BaseMasterCrudController
{
    protected string $modelClass = ExpenseClassification::class;

    protected function rules($id = null): array
    {
        return [
            'expense_class_name' => 'required|string|max:255',
            'abbreviation' => 'nullable|string|max:255',
        ];
    }
}
