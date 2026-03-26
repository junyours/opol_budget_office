<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;

abstract class BaseMasterCrudController extends BaseApiController
{
    protected string $modelClass;

        
    public function index()
    {
        $this->authorize('viewAny', $this->modelClass);
        return $this->success($this->modelClass::all());
    }
    /**
     * Display the specified resource.
     * Any authenticated user can view.
     */
    public function show($id)
    {
        $model = $this->modelClass::findOrFail($id);

        $this->authorize('view', $model);

        return $this->success($model);
    }

    /**
     * Store a newly created resource.
     * Restricted to admin/super-admin via policy.
     */
    public function store(Request $request)
    {
        $this->authorize('create', $this->modelClass);

        $validated = $request->validate($this->rules());

        $model = $this->modelClass::create($validated);

        return $this->success($model, 201);
    }

    /**
     * Update the specified resource.
     * Restricted to admin/super-admin via policy.
     */
    public function update(Request $request, $id)
    {
       
        $model = $this->modelClass::findOrFail($id);

        $this->authorize('update', $model);

        $validated = $request->validate($this->rules($id));

        $model->update($validated);

        return $this->success($model);
    }

    /**
     * Remove the specified resource.
     * Restricted to admin/super-admin via policy.
     */
    public function destroy($id)
    {
        $model = $this->modelClass::findOrFail($id);

        $this->authorize('delete', $model);

        $model->delete();

        return $this->success(['message' => 'Deleted']);
    }

    /**
     * Validation rules for store/update.
     */
    abstract protected function rules($id = null): array;
}
