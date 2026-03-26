<?php

namespace App\Http\Controllers\Api;

use App\Models\Personnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PersonnelController extends BaseMasterCrudController
{
    protected string $modelClass = Personnel::class;

    protected function rules($id = null): array
    {
        return [
            'first_name'  => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'last_name'   => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
            // 'step'        => ['nullable', 'integer', 'min:1'],
            // plantilla_position_id is NOT required here
        ];
    }

    public function bulkStore(Request $request)
    {
        $this->authorize('create', Personnel::class);

        $validated = $request->validate([
            'personnels' => ['required', 'array', 'min:1'],
            'personnels.*.first_name'  => ['required', 'string', 'max:255'],
            'personnels.*.middle_name' => ['nullable', 'string', 'max:255'],
            'personnels.*.last_name'   => ['required', 'string', 'max:255'],
            // 'personnels.*.step'        => ['nullable', 'integer', 'min:1'],
        ]);

        DB::transaction(function () use ($validated) {
            $personnels = collect($validated['personnels'])->map(function ($item) {
                return [
                    'first_name'  => $item['first_name'],
                    'middle_name' => $item['middle_name'] ?? null,
                    'last_name'   => $item['last_name'],
                    // 'step'        => $item['step'] ?? null,
                    'created_at'  => now(),
                    'updated_at'  => now(),
                ];
            })->toArray();

            Personnel::insert($personnels);
        });

        return $this->success(['message' => 'Personnels uploaded successfully'], 201);
    }
}