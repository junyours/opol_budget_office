<?php

namespace App\Http\Controllers\Api;

use App\Models\Personnel;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;

class PersonnelController extends BaseMasterCrudController
{
    protected string $modelClass = Personnel::class;

    // protected function rules($id = null): array
    // {
    //     return [
    //         'first_name'  => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
    //         'middle_name' => ['nullable', 'string', 'max:255'],
    //         'last_name'   => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
    //         // 'step'        => ['nullable', 'integer', 'min:1'],
    //         // plantilla_position_id is NOT required here
    //     ];
    // }

    // public function bulkStore(Request $request)
    protected function rules($id = null): array
    {
        return [
            'first_name'  => [$id ? 'sometimes' : 'required', 'string', 'max:255'],
            'middle_name' => ['nullable', 'string', 'max:255'],
            'status'      => ['sometimes', 'in:active,inactive'],
            // The uniqueness constraint lives on last_name, scoped to rows that
            // also match the submitted first_name + middle_name — this is what
            // enforces "the combination of all 3 must be unique," while still
            // allowing duplicate first names, duplicate middle names, or
            // duplicate last names individually.
            'last_name' => [
                $id ? 'sometimes' : 'required',
                'string',
                'max:255',
                Rule::unique('personnels')->where(function ($query) {
                    $query->where('first_name', trim((string) request('first_name')));

                    $middle = request('middle_name');
                    $middle = $middle !== null ? trim($middle) : null;

                    if ($middle === null || $middle === '') {
                        $query->where(function ($q) {
                            $q->whereNull('middle_name')->orWhere('middle_name', '');
                        });
                    } else {
                        $query->where('middle_name', $middle);
                    }
                })->ignore($id, 'personnel_id'),
            ],
        ];
    }

    /**
     * Search personnel for the department "signatory name" picker.
     *
     * GET /api/personnels/search-signatory?dept_id=&q=
     * - dept_id: restrict to personnel currently assigned (via plantilla_position)
     *   to this department. Omit to search across all departments.
     * - q: free-text match against first/middle/last name.
     */
    public function searchSignatory(Request $request)
    {
        $this->authorize('viewAny', Personnel::class);

        $query = Personnel::query()->with([
            'plantillaAssignments.plantilla_position.department:dept_id,dept_name,dept_abbreviation',
        ]);

        if ($request->filled('dept_id')) {
            $deptId = $request->input('dept_id');
            $query->whereHas('plantillaAssignments.plantilla_position', function ($q) use ($deptId) {
                $q->where('dept_id', $deptId);
            });
        }

        if ($request->filled('q')) {
            $term = trim($request->input('q'));
            $query->where(function ($q) use ($term) {
                $q->where('first_name', 'like', "%{$term}%")
                  ->orWhere('middle_name', 'like', "%{$term}%")
                  ->orWhere('last_name', 'like', "%{$term}%");
            });
        }

        $personnels = $query->orderBy('last_name')->orderBy('first_name')->limit(50)->get();

        return $this->success($personnels);
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

    /**
     * Delete a personnel record — restricted to super admins, requires
     * password re-entry + typing the full name to confirm (GitHub-style),
     * and only allowed if the person has no active plantilla assignment.
     */
    public function destroy($id)
    {
        $personnel = Personnel::findOrFail($id);

        $request = request();

        $user = $request->user();
        if (!$user || ($user->role ?? null) !== 'super-admin') {
            return response()->json([
                'message' => 'Only a super admin can delete personnel records.',
            ], 403);
        }

        $validated = $request->validate([
            'password'     => ['required', 'string'],
            'confirm_name' => ['required', 'string'],
        ]);

        if (!Hash::check($validated['password'], $user->password)) {
            return response()->json(['message' => 'Incorrect password.'], 422);
        }

        $expectedName = trim("{$personnel->first_name} {$personnel->middle_name} {$personnel->last_name}");
        $expectedName = preg_replace('/\s+/', ' ', $expectedName);

        if (trim($validated['confirm_name']) !== $expectedName) {
            return response()->json([
                'message' => "Confirmation text doesn't match this personnel's name.",
            ], 422);
        }

        if ($personnel->plantillaAssignments()->whereNotNull('personnel_id')->exists()) {
            return response()->json([
                'message' => 'Cannot delete — this personnel is currently assigned to a position. Unassign first.',
            ], 422);
        }

        $personnel->delete();

        return $this->success(['message' => 'Personnel deleted successfully.']);
    }
}
