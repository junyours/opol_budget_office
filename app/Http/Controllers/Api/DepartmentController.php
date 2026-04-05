<?php

namespace App\Http\Controllers\Api;

use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class DepartmentController extends BaseMasterCrudController
{
    protected string $modelClass = Department::class;

    /**
     * Display a listing of departments with their categories.
     */
    public function index()
    {
        $this->authorize('viewAny', $this->modelClass);
        $departments = $this->modelClass::with('category')->get();
        return $this->success($departments);
    }

    /**
     * Store a newly created department with optional logo.
     */
    public function store(Request $request)
    {
        $this->authorize('create', $this->modelClass);

        $rules = $this->rules();
        if ($request->hasFile('logo')) {
            $rules['logo'] = 'image|mimes:jpeg,png,jpg,gif,svg|max:5120';
        }

        $validated = $request->validate($rules);

        if ($request->hasFile('logo')) {
            $validated['logo'] = $request->file('logo')->store('departments', 'public');
        }

        $department = $this->modelClass::create($validated);

        return $this->success($department, 201);
    }

    /**
     * Update the specified department, handling logo replacement.
     */
    public function update(Request $request, $id)
    {
        $model = $this->modelClass::findOrFail($id);
        $this->authorize('update', $model);

        $rules = $this->rules($id);
        if ($request->hasFile('logo')) {
            $rules['logo'] = 'image|mimes:jpeg,png,jpg,gif,svg|max:5120';
        }

        $validated = $request->validate($rules);

        if ($request->hasFile('logo')) {
            if ($model->logo) {
                Storage::disk('public')->delete($model->logo);
            }
            $validated['logo'] = $request->file('logo')->store('departments', 'public');
        }

        $model->update($validated);

        return $this->success($model);
    }

    /**
     * Remove the specified department and its logo.
     */
    public function destroy($id)
    {
        $model = $this->modelClass::findOrFail($id);

        $this->authorize('delete', $model);

        if ($model->logo) {
            Storage::disk('public')->delete($model->logo);
        }

        $model->delete();

        return $this->success(['message' => 'Deleted']);
    }

    /**
     * Validation rules for store/update (excluding logo, handled separately).
     */
    protected function rules($id = null): array
    {
        $rules = [
            'dept_name'          => 'required|string|max:255',
            'dept_category_id'   => 'required|exists:department_categories,dept_category_id',
            'dept_abbreviation'  => 'nullable|string|max:50',
            'mandate'            => 'nullable|string',
            'special_provisions' => 'nullable|string',
        ];

        if ($id) {
            $rules['dept_name']        = 'sometimes|string|max:255';
            $rules['dept_category_id'] = 'sometimes|exists:department_categories,dept_category_id';
        }

        return $rules;
    }
}