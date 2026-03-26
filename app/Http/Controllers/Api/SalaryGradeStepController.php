<?php

namespace App\Http\Controllers\Api;

use App\Models\SalaryGradeStep;
use Illuminate\Validation\Rule;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalaryGradeStepController extends BaseMasterCrudController
{
    protected string $modelClass = SalaryGradeStep::class;

    protected function rules($id = null): array
    {
        return [
            'salary_standard_version_id' => [
                $id ? 'sometimes' : 'required',
                'integer',
                'exists:salary_standard_versions,salary_standard_version_id',
            ],
            'salary_grade' => [
                $id ? 'sometimes' : 'required',
                'integer',
                'min:1',
                'max:40',
            ],
            'step' => [
                $id ? 'sometimes' : 'required',
                'integer',
                'min:1',
                'max:8',
            ],
            'salary' => [
                $id ? 'sometimes' : 'required',
                'numeric',
                'min:0',
                'regex:/^\d+(\.\d{1,2})?$/'
            ],
        ];
    }

    // ── ADD THIS ──────────────────────────────────────────────────────────────
    public function index()
    {
        $query = SalaryGradeStep::query();

        if (request()->has('salary_standard_version_id')) {
            $query->where(
                'salary_standard_version_id',
                request()->salary_standard_version_id
            );
        }

        return $this->success($query->get());
    }
    // ─────────────────────────────────────────────────────────────────────────

    public function bulkStore(Request $request)
    {
        $this->authorize('create', SalaryGradeStep::class);

        $validated = $request->validate([
            'steps' => ['required', 'array', 'min:1'],
            'steps.*.salary_standard_version_id' => [
                'required',
                'integer',
                'exists:salary_standard_versions,salary_standard_version_id'
            ],
            'steps.*.salary_grade' => [
                'required',
                'integer',
                'min:1',
                'max:40'
            ],
            'steps.*.step' => [
                'required',
                'integer',
                'min:1',
                'max:8'
            ],
            'steps.*.salary' => [
                'required',
                'numeric',
                'min:0'
            ],
        ]);

        DB::transaction(function () use ($validated) {
            SalaryGradeStep::insert(
                collect($validated['steps'])
                    ->map(fn ($item) => [
                        'salary_standard_version_id' => $item['salary_standard_version_id'],
                        'salary_grade' => $item['salary_grade'],
                        'step' => $item['step'],
                        'salary' => $item['salary'],
                        'created_at' => now(),
                        'updated_at' => now(),
                    ])
                    ->toArray()
            );
        });

        return $this->success(['message' => 'Bulk salary steps uploaded'], 201);
    }
}