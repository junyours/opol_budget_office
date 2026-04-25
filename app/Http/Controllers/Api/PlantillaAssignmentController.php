<?php

// namespace App\Http\Controllers\Api;

// use App\Models\PlantillaAssignment;
// use Illuminate\Http\Request;

// class PlantillaAssignmentController extends BaseMasterCrudController
// {
//     protected string $modelClass = PlantillaAssignment::class;

//     protected function rules($id = null): array
//     {
//         return [
//             'plantilla_position_id' => [
//                 $id ? 'sometimes' : 'required',
//                 'integer',
//                 'exists:plantilla_positions,plantilla_position_id',
//             ],
//             'personnel_id' => [
//                 'nullable',
//                 'integer',
//                 'exists:personnels,personnel_id',
//             ],
//             // Note: assignment_date is managed via bulkUpdate only; no single-record rule needed here
//         ];
//     }

//     public function index()
//     {
//         try {
//             // $assignments = PlantillaAssignment::with(['plantilla_position', 'personnel'])->get();
//             $assignments = PlantillaAssignment::with(['plantilla_position.department', 'personnel'])->get();
//             return $this->success($assignments);
//         } catch (\Exception $e) {
//             return response()->json([
//                 'message' => 'Failed to fetch plantilla assignments',
//                 'error'   => $e->getMessage(),
//             ], 500);
//         }
//     }

//     /**
//      * Bulk-upsert assignments from the Plantilla of Personnel page.
//      * Accepts `assignment_date` (the date the person was hired / assigned).
//      * Also accepts the legacy field name `effective_date` so old clients
//      * keep working during a rolling deploy.
//      */
//     public function bulkUpdate(Request $request)
//     {
//         $this->authorize('update', PlantillaAssignment::class);

//         $validated = $request->validate([
//             'assignments'                             => ['required', 'array'],
//             'assignments.*.plantilla_position_id'     => ['required', 'integer', 'exists:plantilla_positions,plantilla_position_id'],
//             'assignments.*.personnel_id'              => ['nullable', 'integer', 'exists:personnels,personnel_id'],
//             // accept both field names; assignment_date wins if both are provided
//             'assignments.*.assignment_date'           => ['nullable', 'date'],
//             'assignments.*.effective_date'            => ['nullable', 'date'],   // legacy alias
//         ]);

//         \DB::transaction(function () use ($validated) {
//             foreach ($validated['assignments'] as $assignment) {
//                 // Prefer assignment_date; fall back to effective_date for old clients
//                 $date = $assignment['assignment_date']
//                      ?? $assignment['effective_date']
//                      ?? null;

//                 PlantillaAssignment::updateOrCreate(
//                     ['plantilla_position_id' => $assignment['plantilla_position_id']],
//                     [
//                         'personnel_id'    => $assignment['personnel_id'],
//                         'assignment_date' => $date,
//                     ]
//                 );
//             }
//         });

//         return $this->success(['message' => 'Assignments updated successfully']);
//     }
// }



namespace App\Http\Controllers\Api;

use App\Models\PlantillaAssignment;
use Illuminate\Http\Request;

class PlantillaAssignmentController extends BaseMasterCrudController
{
    protected string $modelClass = PlantillaAssignment::class;

    protected function rules($id = null): array
    {
        return [
            'plantilla_position_id' => [
                $id ? 'sometimes' : 'required',
                'integer',
                'exists:plantilla_positions,plantilla_position_id',
            ],
            'personnel_id' => [
                'nullable',
                'integer',
                'exists:personnels,personnel_id',
            ],
        ];
    }

    public function index()
    {
        try {
            $assignments = PlantillaAssignment::with([
                'plantilla_position.department',  // ← nested: position → department
                'personnel',
            ])->get();

            return $this->success($assignments);
        } catch (\Exception $e) {
            return response()->json([
                'message' => 'Failed to fetch plantilla assignments',
                'error'   => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Bulk-upsert assignments from the Plantilla of Personnel page.
     */
    public function bulkUpdate(Request $request)
    {
        $this->authorize('update', PlantillaAssignment::class);

        $validated = $request->validate([
            'assignments'                             => ['required', 'array'],
            'assignments.*.plantilla_position_id'     => ['required', 'integer', 'exists:plantilla_positions,plantilla_position_id'],
            'assignments.*.personnel_id'              => ['nullable', 'integer', 'exists:personnels,personnel_id'],
            'assignments.*.assignment_date'           => ['nullable', 'date'],
            'assignments.*.effective_date'            => ['nullable', 'date'],
        ]);

        \DB::transaction(function () use ($validated) {
            foreach ($validated['assignments'] as $assignment) {
                $date = $assignment['assignment_date']
                     ?? $assignment['effective_date']
                     ?? null;

                PlantillaAssignment::updateOrCreate(
                    ['plantilla_position_id' => $assignment['plantilla_position_id']],
                    [
                        'personnel_id'    => $assignment['personnel_id'],
                        'assignment_date' => $date,
                    ]
                );
            }
        });

        return $this->success(['message' => 'Assignments updated successfully']);
    }
}
