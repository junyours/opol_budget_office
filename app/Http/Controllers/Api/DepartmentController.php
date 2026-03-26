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

    \Log::info('Store request received', [
        'has_logo' => $request->hasFile('logo'),
        'all_files' => array_keys($request->allFiles()),
    ]);

    $rules = $this->rules();
    if ($request->hasFile('logo')) {
        $rules['logo'] = 'image|mimes:jpeg,png,jpg,gif,svg|max:5120';
    }

    $validated = $request->validate($rules);

    if ($request->hasFile('logo')) {
        $file = $request->file('logo');
        \Log::info('Logo file details', [
            'original_name' => $file->getClientOriginalName(),
            'size' => $file->getSize(),
            'mime' => $file->getMimeType(),
        ]);
        $path = $file->store('departments', 'public');
        \Log::info('Logo stored at: ' . $path);
        $validated['logo'] = $path;
    }

    $department = $this->modelClass::create($validated);
    \Log::info('Department created', $department->toArray());

    return $this->success($department, 201);
}

    /**
     * Update the specified department, handling logo replacement.
     */
    public function update(Request $request, $id)
{
    $model = $this->modelClass::findOrFail($id);
    $this->authorize('update', $model);

    \Log::info('=== Department Update Start ===');
    \Log::info('Request has file "logo"?', ['hasFile' => $request->hasFile('logo')]);
    if ($request->hasFile('logo')) {
        $file = $request->file('logo');
        \Log::info('File details', [
            'originalName' => $file->getClientOriginalName(),
            'mime' => $file->getMimeType(),
            'size' => $file->getSize(),
            'isValid' => $file->isValid(),
        ]);
    }

    $rules = $this->rules($id);
    if ($request->hasFile('logo')) {
        $rules['logo'] = 'image|mimes:jpeg,png,jpg,gif,svg|max:5120';
    }

    $validated = $request->validate($rules);
    \Log::info('Validated data', $validated);

    if ($request->hasFile('logo')) {
        // Delete old logo if exists
        if ($model->logo) {
            Storage::disk('public')->delete($model->logo);
            \Log::info('Deleted old logo', ['old' => $model->logo]);
        }
        $path = $request->file('logo')->store('departments', 'public');
        \Log::info('New logo stored at', ['path' => $path]);
        $validated['logo'] = $path;
    }

    $model->update($validated);
    \Log::info('Department after update', $model->fresh()->toArray());

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
            'dept_name' => 'required|string|max:255',
            'dept_category_id' => 'required|exists:department_categories,dept_category_id',
            'dept_abbreviation' => 'nullable|string|max:50',
            'mandate' => 'nullable|string',
        ];

        if ($id) {
            $rules['dept_name'] = 'sometimes|string|max:255';
            $rules['dept_category_id'] = 'sometimes|exists:department_categories,dept_category_id';
        }

        return $rules;
    }
}