<?php

// namespace App\Providers;

// use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
// use App\Policies\MasterDataPolicy;
// use App\Models\BudgetPlanForm2Item;
// use App\Policies\BudgetPlanItemPolicy;
// use App\Models\BudgetPlan;
// use App\Policies\BudgetPlanPolicy;
// use App\Models\DepartmentBudgetPlan;
// use App\Policies\DepartmentBudgetPlanPolicy;

// class AuthServiceProvider extends ServiceProvider
// {
//     protected $policies = [
//         \App\Models\DepartmentCategory::class => MasterDataPolicy::class,
//         \App\Models\Department::class => MasterDataPolicy::class,
//         \App\Models\ExpenseClassification::class => MasterDataPolicy::class,
//         \App\Models\ExpenseClassItem::class => MasterDataPolicy::class,
//         \App\Models\Personnel::class => MasterDataPolicy::class,
//         \App\Models\PlantillaPosition::class => MasterDataPolicy::class,
//         \App\Models\PlantillaAssignment::class => MasterDataPolicy::class,
//         \App\Models\SalaryStandardVersion::class => MasterDataPolicy::class,
//         \App\Models\SalaryGradeStep::class => MasterDataPolicy::class,
//         \App\Models\BudgetPlanForm4Item::class => MasterDataPolicy::class,
//         BudgetPlanForm2Item::class => BudgetPlanItemPolicy::class,
//         BudgetPlan::class => BudgetPlanPolicy::class,
//         DepartmentBudgetPlan::class              => DepartmentBudgetPlanPolicy::class,
//     ];
// }

namespace App\Providers;

use Illuminate\Foundation\Support\Providers\AuthServiceProvider as ServiceProvider;
use App\Policies\MasterDataPolicy;
use App\Models\BudgetPlanForm2Item;
use App\Policies\BudgetPlanItemPolicy;
use App\Models\BudgetPlan;
use App\Policies\BudgetPlanPolicy;
use App\Models\DepartmentBudgetPlan;
use App\Policies\DepartmentBudgetPlanPolicy;

class AuthServiceProvider extends ServiceProvider
{
    protected $policies = [
        \App\Models\DepartmentCategory::class    => MasterDataPolicy::class,
        \App\Models\Department::class            => MasterDataPolicy::class,
        \App\Models\ExpenseClassification::class => MasterDataPolicy::class,
        \App\Models\ExpenseClassItem::class      => MasterDataPolicy::class,
        \App\Models\Personnel::class             => MasterDataPolicy::class,
        \App\Models\PlantillaPosition::class     => MasterDataPolicy::class,
        \App\Models\PlantillaAssignment::class   => MasterDataPolicy::class,
        \App\Models\SalaryStandardVersion::class => MasterDataPolicy::class,
        \App\Models\SalaryGradeStep::class       => MasterDataPolicy::class,
        \App\Models\BudgetPlanForm4Item::class   => MasterDataPolicy::class,
        BudgetPlanForm2Item::class               => BudgetPlanItemPolicy::class,
        BudgetPlan::class                        => BudgetPlanPolicy::class,
        DepartmentBudgetPlan::class              => DepartmentBudgetPlanPolicy::class,
    ];

    /**
     * boot() MUST call registerPolicies() — without this the $policies array
     * is never loaded and every authorize() call returns 403.
     */
    public function boot(): void
    {
        $this->registerPolicies();
    }
}