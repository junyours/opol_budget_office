<?php

namespace App\Http\Controllers\Api;

use App\Models\DepartmentCategory;

class DepartmentCategoryController extends BaseMasterCrudController
{
    protected string $modelClass = DepartmentCategory::class;

    protected function rules($id = null): array
    {
        return [
            'dept_category_name' => 'required|string|max:255'
        ];
    }
}
