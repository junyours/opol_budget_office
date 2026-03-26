<?php
// app/Services/PlantillaBudgetService.php

namespace App\Services;

use App\Models\DepartmentBudgetPlan;
use App\Models\DepartmentPlantillaBudget;
use App\Models\PlantillaPosition;
use App\Models\PlantillaAssignment;
use App\Models\Personnel;
use App\Models\SalaryGradeStep;
use App\Models\SalaryStandardVersion;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PlantillaBudgetService
{
    /**
     * Generate plantilla budget entries for a budget plan WITH salary calculation
     */
    public function generateForBudgetPlan(DepartmentBudgetPlan $budgetPlan, ?int $currentVersionId = null): array
    {
        if ($currentVersionId === null) {
            // For current version, we may want the latest active version overall
            $latest = SalaryStandardVersion::where('is_active', true)
                ->orderBy('effective_year', 'desc')
                ->first();
            $currentVersionId = $latest ? $latest->salary_standard_version_id : 1;
            Log::info("Auto-selected current version ID: {$currentVersionId}");
        }
        
        $createdCount = 0;
        $updatedCount = 0;
        $errors = [];

        try {
            DB::beginTransaction();

            // Get the appropriate salary standard version for the budget year
            $salaryStandardVersion = $this->getSalaryStandardVersionForYear($budgetPlan->year);
            
            if (!$salaryStandardVersion) {
                throw new \Exception("No active salary standard version found for year {$budgetPlan->year}");
            }

            // Get all plantilla positions for the department
            $positions = PlantillaPosition::with(['assignments' => function($query) {
                    $query->where('status', 'ACTIVE')
                          ->with('personnel');
                }])
                ->where('department_id', $budgetPlan->dept_id)
                ->where('is_active', true)
                ->get();

            foreach ($positions as $position) {
                try {
                    // Get active assignment if exists
                    $activeAssignment = $position->assignments->first();
                    
                    // Get incumbent information
                    $incumbentName = 'VACANT';
                    $employmentStatus = null;
                    $currentStep = 1;
                    $currentSalaryGrade = $position->salary_grade;
                    $currentSalaryStandardVersionId = $currentVersionId;
                    
                    if ($activeAssignment && $activeAssignment->personnel) {
                        $personnel = $activeAssignment->personnel;
                        $incumbentName = trim($personnel->first_name . ' ' . 
                                          ($personnel->middle_name ? $personnel->middle_name . ' ' : '') . 
                                          $personnel->last_name);
                        $employmentStatus = $personnel->employment_status;
                        $currentStep = $personnel->step ?? 1;
                    }

                    // Calculate proposed step based on effective date
                    $proposedStep = $this->calculateProposedStep(
                        $activeAssignment?->effective_date,
                        $budgetPlan->year,
                        $currentStep
                    );

                    // Calculate salary amounts (MONTHLY)
                    $currentMonthlyAmount = 0;
                    if ($currentVersionId) {
                        $currentMonthlyAmount = SalaryGradeStep::getSalary(
                            $currentSalaryGrade,
                            $currentStep,
                            $currentVersionId
                        ) ?? 0;
                    }
                    
                    $proposedMonthlyAmount = SalaryGradeStep::getSalary(
                        $currentSalaryGrade,
                        $proposedStep,
                        $salaryStandardVersion->salary_standard_version_id
                    ) ?? 0;
                    
                    // Convert to ANNUAL amounts (multiply by 12)
                    $currentAnnualAmount = $currentMonthlyAmount * 12;
                    $proposedAnnualAmount = $proposedMonthlyAmount * 12;
                    $increaseAmount = $proposedAnnualAmount - $currentAnnualAmount;

                    // Check if record already exists
                    $existingRecord = DepartmentPlantillaBudget::where([
                        'dept_budget_plan_id' => $budgetPlan->dept_budget_plan_id,
                        'plantilla_position_id' => $position->plantilla_position_id
                    ])->first();

                    if ($existingRecord) {
                        // Update existing record
                        $existingRecord->update([
                            'incumbent_name' => $incumbentName,
                            'employment_status' => $employmentStatus,
                            'current_salary_standard_version_id' => $currentVersionId,
                            'current_salary_grade' => $currentSalaryGrade,
                            'current_step' => $currentStep,
                            'current_amount' => $currentAnnualAmount,
                            'proposed_salary_standard_version_id' => $salaryStandardVersion->salary_standard_version_id,
                            'proposed_salary_grade' => $currentSalaryGrade,
                            'proposed_step' => $proposedStep,
                            'proposed_amount' => $proposedAnnualAmount,
                            'increase_amount' => $increaseAmount,
                            'remarks' => $incumbentName === 'VACANT' ? 'Position Vacant' : null
                        ]);
                        $updatedCount++;
                    } else {
                        // Create new record
                        DepartmentPlantillaBudget::create([
                            'dept_budget_plan_id' => $budgetPlan->dept_budget_plan_id,
                            'plantilla_position_id' => $position->plantilla_position_id,
                            'incumbent_name' => $incumbentName,
                            'employment_status' => $employmentStatus,
                            'current_salary_standard_version_id' => $currentVersionId,
                            'current_salary_grade' => $currentSalaryGrade,
                            'current_step' => $currentStep,
                            'current_amount' => $currentAnnualAmount,
                            'proposed_salary_standard_version_id' => $salaryStandardVersion->salary_standard_version_id,
                            'proposed_salary_grade' => $currentSalaryGrade,
                            'proposed_step' => $proposedStep,
                            'proposed_amount' => $proposedAnnualAmount,
                            'increase_amount' => $increaseAmount,
                            'remarks' => $incumbentName === 'VACANT' ? 'Position Vacant' : null
                        ]);
                        $createdCount++;
                    }

                } catch (\Exception $e) {
                    $errors[] = [
                        'position_id' => $position->plantilla_position_id,
                        'position_title' => $position->position_title,
                        'error' => $e->getMessage()
                    ];
                    Log::error('Error processing position: ' . $e->getMessage());
                }
            }

            DB::commit();

            return [
                'success' => true,
                'created' => $createdCount,
                'updated' => $updatedCount,
                'total' => $positions->count(),
                'errors' => $errors,
                'salary_standard_version' => $salaryStandardVersion->lbc_reference
            ];

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Error generating plantilla budget: ' . $e->getMessage());
            
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'created' => 0,
                'updated' => 0,
                'total' => 0,
                'errors' => $errors
            ];
        }
    }

    /**
     * Calculate proposed step based on effective date
     * Rule: If step >= 8, stay at 8 (max step)
     */
    private function calculateProposedStep($effectiveDate, int $budgetYear, int $currentStep): int
    {
        // If already at max step (8), no increase
        if ($currentStep >= 8) {
            return 8;
        }

        // If no effective date (vacant position), return current step
        if (!$effectiveDate) {
            return $currentStep;
        }

        try {
            $effectiveDate = \Carbon\Carbon::parse($effectiveDate);
            $budgetYearDate = \Carbon\Carbon::createFromDate($budgetYear, 1, 1);
            
            // Calculate years of service
            $yearsOfService = $effectiveDate->diffInYears($budgetYearDate);
            
            // Calculate step increments (every 3 years)
            $stepIncrements = floor($yearsOfService / 3);
            
            // Proposed step = current step + increments
            $proposedStep = $currentStep + $stepIncrements;
            
            // Cap at maximum step (8)
            return min($proposedStep, 8);
            
        } catch (\Exception $e) {
            Log::error('Error calculating proposed step: ' . $e->getMessage());
            return $currentStep;
        }
    }

    /**
     * Calculate salary amounts using versioned SalaryGradeStep model
     * (Keep this for recalculations if needed)
     */
    public function calculateSalaries(DepartmentBudgetPlan $budgetPlan): array
    {
        $updated = 0;
        $errors = [];

        $plantillaBudgets = DepartmentPlantillaBudget::with('position')
            ->where('dept_budget_plan_id', $budgetPlan->dept_budget_plan_id)
            ->get();

        foreach ($plantillaBudgets as $plantillaBudget) {
            try {
                // Get current MONTHLY salary amount
                $currentMonthlyAmount = null;
                if ($plantillaBudget->current_salary_standard_version_id) {
                    $currentMonthlyAmount = SalaryGradeStep::getSalary(
                        $plantillaBudget->current_salary_grade,
                        $plantillaBudget->current_step,
                        $plantillaBudget->current_salary_standard_version_id
                    );
                }
                
                // Get proposed MONTHLY salary amount
                $proposedMonthlyAmount = SalaryGradeStep::getSalary(
                    $plantillaBudget->proposed_salary_grade,
                    $plantillaBudget->proposed_step,
                    $plantillaBudget->proposed_salary_standard_version_id
                );

                // Validate that salaries were found
                if ($plantillaBudget->current_salary_standard_version_id && $currentMonthlyAmount === null) {
                    throw new \Exception("No salary found for grade {$plantillaBudget->current_salary_grade}, step {$plantillaBudget->current_step} in version {$plantillaBudget->current_salary_standard_version_id}");
                }
                
                if ($proposedMonthlyAmount === null) {
                    throw new \Exception("No salary found for grade {$plantillaBudget->proposed_salary_grade}, step {$plantillaBudget->proposed_step} in version {$plantillaBudget->proposed_salary_standard_version_id}");
                }

                // Convert to ANNUAL amounts
                $currentAnnualAmount = ($currentMonthlyAmount ?? 0) * 12;
                $proposedAnnualAmount = $proposedMonthlyAmount * 12;

                $plantillaBudget->update([
                    'current_amount' => $currentAnnualAmount,
                    'proposed_amount' => $proposedAnnualAmount,
                    'increase_amount' => $proposedAnnualAmount - $currentAnnualAmount
                ]);

                $updated++;

            } catch (\Exception $e) {
                $errors[] = [
                    'plantilla_budget_id' => $plantillaBudget->department_plantilla_budget_id,
                    'position' => $plantillaBudget->position?->position_title,
                    'salary_grade' => $plantillaBudget->current_salary_grade,
                    'step' => $plantillaBudget->current_step,
                    'error' => $e->getMessage()
                ];
                Log::error('Error calculating salary: ' . $e->getMessage());
            }
        }

        return [
            'success' => count($errors) === 0,
            'updated' => $updated,
            'errors' => $errors
        ];
    }

    /**
     * Get salary standard version for a specific year
     * Now that effective_year is a date, we find the version effective on or before the end of that year.
     */
    private function getSalaryStandardVersionForYear(int $year): ?SalaryStandardVersion
    {
        $endOfYear = $year . '-12-31';
        return SalaryStandardVersion::where('effective_year', '<=', $endOfYear)
            ->where('is_active', true)
            ->orderBy('effective_year', 'desc')
            ->first();
    }

    /**
     * Get salary standard version for a specific date
     */
    private function getSalaryStandardVersionForDate(string $date): ?SalaryStandardVersion
    {
        return SalaryStandardVersion::where('effective_year', '<=', $date)
            ->where('is_active', true)
            ->orderBy('effective_year', 'desc')
            ->first();
    }

    /**
     * Compare salary amounts across different SSL versions
     */
    public function compareSalaryVersions(int $grade, int $step, array $versionIds): array
    {
        $comparison = [];
        
        foreach ($versionIds as $versionId) {
            $version = SalaryStandardVersion::find($versionId);
            $salary = SalaryGradeStep::getSalary($grade, $step, $versionId);
            
            if ($version && $salary) {
                $comparison[] = [
                    'version_id' => $versionId,
                    'lbc_reference' => $version->lbc_reference,
                    'tranche' => $version->tranche,
                    'effective_date' => $version->effective_year->toDateString(), // full date
                    'monthly_salary' => $salary,
                    'annual_salary' => $salary * 12
                ];
            }
        }
        
        return $comparison;
    }

    /**
     * Get step progression history with version-aware salary calculations
     */
    public function getStepProgressionHistory(int $personnelId, int $startYear, int $endYear): array
    {
        $history = [];
        $personnel = Personnel::with('currentAssignment.position')->find($personnelId);
        
        if (!$personnel) {
            return $history;
        }

        $currentStep = $personnel->step;
        
        $assignments = PlantillaAssignment::where('personnel_id', $personnelId)
            ->with('position')
            ->orderBy('effective_date')
            ->get();

        // Get all salary versions for the period (by year end dates)
        $salaryVersions = SalaryStandardVersion::where('effective_year', '<=', $endYear . '-12-31')
            ->where('is_active', true)
            ->orderBy('effective_year')
            ->get()
            ->keyBy(function ($version) {
                // Key by the year part for quick lookup (assumes one version per year max)
                return $version->effective_year->year;
            });

        foreach ($assignments as $assignment) {
            $effectiveYear = (int) date('Y', strtotime($assignment->effective_date));
            
            if ($effectiveYear >= $startYear && $effectiveYear <= $endYear) {
                $yearsFromStart = $effectiveYear - $startYear;
                $stepIncrements = floor($yearsFromStart / 3);
                $projectedStep = min($currentStep + $stepIncrements, 8);
                
                // Get the appropriate salary version for this year
                $version = $salaryVersions[$effectiveYear] ?? null;
                
                $monthlySalary = null;
                $annualSalary = null;
                if ($version && $assignment->position) {
                    $monthlySalary = SalaryGradeStep::getSalary(
                        $assignment->position->salary_grade,
                        $projectedStep,
                        $version->salary_standard_version_id
                    );
                    $annualSalary = $monthlySalary ? $monthlySalary * 12 : null;
                }
                
                $history[] = [
                    'year' => $effectiveYear,
                    'step' => $projectedStep,
                    'step_increment' => $stepIncrements,
                    'effective_date' => $assignment->effective_date,
                    'position_id' => $assignment->plantilla_position_id,
                    'position_title' => $assignment->position?->position_title,
                    'salary_grade' => $assignment->position?->salary_grade,
                    'salary_version' => $version?->lbc_reference,
                    'monthly_salary' => $monthlySalary,
                    'annual_salary' => $annualSalary,
                    'years_of_service_at_date' => $yearsFromStart
                ];
            }
        }

        return $history;
    }

    /**
     * Get salary matrix for a specific version
     */
    public function getSalaryMatrix(int $versionId): array
    {
        return SalaryGradeStep::getMatrixByVersion($versionId)->toArray();
    }

    /**
     * Validate if a grade-step exists in a specific version
     */
    public function validateGradeStepInVersion(int $versionId, int $grade, int $step): bool
    {
        return SalaryGradeStep::existsForVersion($versionId, $grade, $step);
    }
}