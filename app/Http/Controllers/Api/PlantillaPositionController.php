<?php

namespace App\Http\Controllers\Api;

use App\Models\PlantillaPosition;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class PlantillaPositionController extends BaseMasterCrudController
{
    protected string $modelClass = PlantillaPosition::class;

    protected function rules($id = null): array
    {
        return [
            'old_item_number' => ['nullable', 'string', 'max:100'],
            'new_item_number' => ['nullable', 'string', 'max:100'],
            'position_title'  => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
            'salary_grade'    => [$id ? 'sometimes' : 'required', 'integer', 'min:1'],
            'dept_id'         => [$id ? 'sometimes' : 'required', 'exists:departments,dept_id'],
            'is_active'       => ['sometimes', 'boolean'],
        ];
    }

    public function index()
    {
        $query = PlantillaPosition::query();
        $request = request(); // get the current HTTP request

        // Handle ?include=assignments.personnel
        if ($request->has('include')) {
            $includes = explode(',', $request->include);
            $query->with($includes);
        }

        $positions = $query->get();
        return $this->success($positions);
    }

    public function bulkStore(Request $request)
    {
        $this->authorize('create', PlantillaPosition::class);

        $validated = $request->validate([
            'positions' => ['required', 'array', 'min:1'],
            'positions.*.old_item_number' => ['nullable', 'string', 'max:100'],
            'positions.*.new_item_number' => ['nullable', 'string', 'max:100'],
            'positions.*.position_title'  => ['required', 'string', 'max:255'],
            'positions.*.salary_grade'    => ['required', 'integer', 'min:1'],
            'positions.*.dept_id'         => ['required', 'exists:departments,dept_id'],
            'positions.*.is_active'       => ['sometimes', 'boolean'],
        ]);

        DB::transaction(function () use ($validated) {
            $positions = collect($validated['positions'])->map(function ($item) {
                return [
                    'old_item_number' => $item['old_item_number'] ?? null,
                    'new_item_number' => $item['new_item_number'] ?? null,
                    'position_title'  => $item['position_title'],
                    'salary_grade'    => $item['salary_grade'],
                    'dept_id'         => $item['dept_id'],
                    'is_active'       => $item['is_active'] ?? true,
                    'created_at'      => now(),
                    'updated_at'      => now(),
                ];
            })->toArray();

            PlantillaPosition::insert($positions);
        });

        return $this->success(['message' => 'Plantilla positions uploaded successfully'], 201);
    }

// Add this method to PlantillaPositionController

/**
 * POST /api/plantilla-positions/renumber
 *
 * Accepts a sorted list of { plantilla_position_id, new_item_number }
 * and bulk-updates all positions in a single transaction.
 *
 * Called by the front-end "Sort & Renumber" button after it computes
 * the correct order client-side:
 *   1. Active + assigned  → SG desc, per department
 *   2. Active + vacant    → SG desc, per department
 *   3. Inactive           → SG desc, globally at the end
 */

// Add this method to PlantillaPositionController

/**
 * POST /api/plantilla-positions/renumber
 *
 * Step 1: Set all positions to a safe temporary number (10000 + their current ID)
 *         to avoid unique constraint collisions during the update.
 * Step 2: Apply the final sorted new_item_numbers from the frontend payload.
 *
 * Sorting order (computed client-side):
 *   1. Active + assigned  → SG desc, per department
 *   2. Active + vacant    → SG desc, per department
 *   3. Inactive           → SG desc, globally at the end
 */
public function renumber(Request $request)
{
    $this->authorize('update', PlantillaPosition::class);

    $validated = $request->validate([
        'positions'                         => ['required', 'array', 'min:1'],
        'positions.*.plantilla_position_id' => ['required', 'integer', 'exists:plantilla_positions,plantilla_position_id'],
        'positions.*.new_item_number'       => ['required', 'string', 'max:100'],
    ]);

    DB::transaction(function () use ($validated) {
        $ids = collect($validated['positions'])->pluck('plantilla_position_id');

        // ── Step 1: move ALL positions in the payload to a collision-free temp range ──
        // Using 10000 + plantilla_position_id guarantees uniqueness
        foreach ($ids as $posId) {
            PlantillaPosition::where('plantilla_position_id', $posId)
                ->update(['new_item_number' => '99000' . $posId]);
        }

        // ── Step 2: apply the final numbers ──────────────────────────────────────────
        foreach ($validated['positions'] as $item) {
            PlantillaPosition::where('plantilla_position_id', $item['plantilla_position_id'])
                ->update(['new_item_number' => $item['new_item_number']]);
        }
    });

    return $this->success([
        'message' => 'Item numbers updated successfully.',
        'count'   => count($validated['positions']),
    ]);
}
}