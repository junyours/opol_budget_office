<?php

namespace App\Http\Controllers\Api;

use App\Models\SalaryStandardVersion;
use Illuminate\Validation\Rule;
use App\Models\SalaryGradeStep;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SalaryStandardVersionController extends BaseMasterCrudController
{
    protected string $modelClass = SalaryStandardVersion::class;

    protected function rules($id = null): array
    {
        return [
            // Optional on update, required on create
            'lbc_reference' => [$id ? 'sometimes' : 'required', 'string', 'max:100'],

            'tranche' => [
                $id ? 'sometimes' : 'required',
                Rule::in(['1st Tranche', '2nd Tranche', '3rd Tranche', '4th Tranche'])
            ],

            'income_class' => [$id ? 'sometimes' : 'required', 'string', 'max:50'],

            'effective_year' => [$id ? 'sometimes' : 'required', 'date'],

            'is_active' => ['sometimes', 'boolean'],
        ];
    }

    // use Illuminate\Http\Request; // already at top

public function index()
{
    $request = request(); // get the current HTTP request
    $query = SalaryStandardVersion::query();

    if ($request->has('include')) {
        $includes = explode(',', $request->include);
        $query->with($includes);
    }

    $versions = $query->get();
    return $this->success($versions);
}

    public function storeWithSteps(Request $request)
{
    $this->authorize('create', SalaryStandardVersion::class);

    $validated = $request->validate([
        'lbc_reference' => ['required','string','max:100'],
        'tranche' => [
            'required',
            Rule::in(['1st Tranche', '2nd Tranche', '3rd Tranche', '4th Tranche'])
        ],
        'income_class' => ['required','string','max:50'],
        'effective_year' => ['required', 'date'],
        'is_active' => ['boolean'],

        'steps' => ['required','array','min:1'],
        'steps.*.salary_grade' => ['required','integer','min:1','max:40'],
        'steps.*.step' => ['required','integer','min:1','max:8'],
        'steps.*.salary' => ['required','numeric','min:0'],
    ]);

    DB::transaction(function () use ($validated) {

        if (!empty($validated['is_active'])) {
            SalaryStandardVersion::where('is_active', true)->update(['is_active' => false]);
        }

        $version = SalaryStandardVersion::create([
            'lbc_reference' => $validated['lbc_reference'],
            'tranche' => $validated['tranche'],
            'income_class' => $validated['income_class'],
            'effective_year' => $validated['effective_year'],
            'is_active' => $validated['is_active'] ?? false,
        ]);

        $steps = collect($validated['steps'])->map(function ($item) use ($version) {
            return [
                'salary_standard_version_id' => $version->salary_standard_version_id,
                'salary_grade' => $item['salary_grade'],
                'step' => $item['step'],
                'salary' => $item['salary'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
        });

        SalaryGradeStep::insert($steps->toArray());
    });

    return $this->success(['message' => 'Salary version with steps created'], 201);
}

public function activate(SalaryStandardVersion $version)
{
    $this->authorize('update', $version);

    DB::transaction(function () use ($version) {
        // Deactivate all other versions
        SalaryStandardVersion::where('is_active', true)
            ->where('salary_standard_version_id', '!=', $version->salary_standard_version_id)
            ->update(['is_active' => false]);
        // Activate the selected version
        $version->update(['is_active' => true]);
    });

    return $this->success(['message' => 'Version activated successfully', 'version' => $version->fresh()]);
}
}
