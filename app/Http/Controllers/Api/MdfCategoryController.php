<?php
// app/Http/Controllers/Api/MdfCategoryController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MdfCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MdfCategoryController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $cat = MdfCategory::create($request->validate([
            'name'              => 'required|string|max:255',
            'code'              => 'nullable|string|max:50',
            'is_debt_servicing' => 'sometimes|boolean',
            'sort_order'        => 'nullable|integer',
        ]));

        return response()->json(['data' => $cat], 201);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $cat = MdfCategory::findOrFail($id);

        $cat->update($request->validate([
            'name'              => 'sometimes|required|string|max:255',
            'code'              => 'nullable|string|max:50',
            'is_debt_servicing' => 'sometimes|boolean',
            'sort_order'        => 'sometimes|integer',
        ]));

        return response()->json(['data' => $cat]);
    }

    public function destroy(int $id): JsonResponse
    {
        MdfCategory::findOrFail($id)->delete();

        return response()->json(['message' => 'Category deleted.']);
    }
}