<?php

use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\{
    AuthController,
    UserController,
    DepartmentCategoryController,
    DepartmentController,
    ExpenseClassificationController,
    ExpenseClassItemController,
    DepartmentBudgetPlanController,
    BudgetPlanForm2ItemController,
    PersonnelController,
    PlantillaPositionController,
    PlantillaAssignmentController,
    SalaryStandardVersionController,
    SalaryGradeStepController,
    BudgetPlanForm4ItemController,
    BudgetPlanForm6ItemController,
    BudgetSummaryController,
    BudgetPlanController,
    IncomeFundController,
    MDFFundController,
    AipProgramController,
    DebtObligationController,
    Form6Controller,
    AggregateTotalsController,
    Form7Controller,
    MdfCategoryController,
    MdfItemController,
    PsComputationController,
    LdrrmfipController,
    LdrrmfPlanController,
    Form6SpecialController,
    GADEntryController,
    UnifiedPlanItemController,
    ConsolidatedSpecialIncomeController,
    CalamityFundController,
    UnifiedReportController,
    ProfileController,
    MdfSnapshotController,
    LEPReportController,
    LepHeaderSettingController,
    IncomeFundObjectController,
};

// ── Public: Login (strict rate limit) ─────────────────────────────────────────
Route::prefix('auth')->middleware('throttle:login')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

// ── Authenticated Routes (standard API rate limit) ─────────────────────────────
Route::middleware(['auth:sanctum', 'throttle:api'])->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ── Core Resources ─────────────────────────────────────────────────────────
    Route::apiResource('users',                     UserController::class);
    Route::apiResource('department-categories',     DepartmentCategoryController::class);
    Route::apiResource('departments',               DepartmentController::class);
    Route::apiResource('expense-classifications',   ExpenseClassificationController::class);
    Route::apiResource('expense-class-items',       ExpenseClassItemController::class);

    // ── Income Fund Objects (master list) ─────────────────────────────────────────
    Route::get ('income-fund-objects/sources', [IncomeFundObjectController::class, 'sources']);
    Route::apiResource('income-fund-objects',  IncomeFundObjectController::class)
        ->only(['index', 'store', 'update', 'destroy']);

    // ── Personnel & Plantilla ──────────────────────────────────────────────────
    Route::apiResource('personnels', PersonnelController::class);
    Route::apiResource('plantilla-positions', PlantillaPositionController::class);
    Route::post('plantilla-positions/renumber', [PlantillaPositionController::class, 'renumber']);
    Route::apiResource('plantilla-assignments', PlantillaAssignmentController::class);

    // ── Salary Standards ───────────────────────────────────────────────────────
    Route::apiResource('salary-standard-versions', SalaryStandardVersionController::class);
    Route::apiResource('salary-grade-steps',        SalaryGradeStepController::class);
    Route::post('salary-standard-versions/{version}/activate', [SalaryStandardVersionController::class, 'activate']);

    // ── Budget Plans ───────────────────────────────────────────────────────────
    Route::get ('budget-plans/active',                          [BudgetPlanController::class, 'active']);
    Route::get ('budget-plans/{budget_plan}/draft-departments', [BudgetPlanController::class, 'draftDepartments']);
    Route::apiResource('budget-plans', BudgetPlanController::class);
    Route::post('budget-plans/{budget_plan}/activate', [BudgetPlanController::class, 'activate']);
    Route::post('budget-plans/{budget_plan}/close',    [BudgetPlanController::class, 'close']);

    // ── Department Budget Plans ────────────────────────────────────────────────
    Route::get('/department-budget-plans/years',                      [DepartmentBudgetPlanController::class, 'years']);
    Route::get('/department-budget-plans/by-dept-year/{dept}/{year}', [DepartmentBudgetPlanController::class, 'findByDeptAndYear']);
    Route::apiResource('department-budget-plans', DepartmentBudgetPlanController::class);
    Route::post('department-budget-plans/{department_budget_plan}/submit',  [DepartmentBudgetPlanController::class, 'submit']);
    Route::post('department-budget-plans/{department_budget_plan}/approve', [DepartmentBudgetPlanController::class, 'approve']);
    Route::post('department-budget-plans/{department_budget_plan}/reject',  [DepartmentBudgetPlanController::class, 'reject']);
    Route::apiResource('department-budget-plans.items', BudgetPlanForm2ItemController::class);
    Route::get ('department-budget-plans/{budget_plan}/plantilla-assignments',      [DepartmentBudgetPlanController::class, 'plantillaAssignments']);
    Route::delete('department-budget-plans/{budget_plan}/plantilla-assignments/{assignment}', [DepartmentBudgetPlanController::class, 'destroyPlantillaAssignment']);

    // ── Form 4 / AIP ──────────────────────────────────────────────────────────
    Route::apiResource('form4-items', BudgetPlanForm4ItemController::class);
    Route::get('/aip-programs', [AipProgramController::class, 'index']);
    Route::put('/aip-programs/{id}', [AipProgramController::class, 'update']);

    // ── Form 6 ────────────────────────────────────────────────────────────────
    Route::apiResource('dept-bp-form6-items', BudgetPlanForm6ItemController::class);
    Route::get ('form6/templates',       [Form6Controller::class, 'templates']);
    Route::apiResource('form6', Form6Controller::class)
        ->parameters(['form6' => 'form6Item'])
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get ('form6-special/sources',   [Form6SpecialController::class, 'sources']);
    Route::get ('form6-special/templates', [Form6SpecialController::class, 'templates']);
    Route::apiResource('form6-special', Form6SpecialController::class)
        ->parameters(['form6-special' => 'form6Item'])
        ->only(['index', 'store', 'update', 'destroy']);

    // ── Aggregate Totals ───────────────────────────────────────────────────────
    Route::get('totals/keys',                [AggregateTotalsController::class, 'keys']);
    Route::get('totals/income-fund-derived', [AggregateTotalsController::class, 'incomeFundDerived']);
    Route::apiResource('totals', AggregateTotalsController::class)
        ->parameters(['totals' => 'key'])
        ->only(['index', 'show']);

    // ── Misc Read/Write ────────────────────────────────────────────────────────
    Route::get('/budget-summary/statutory/{year}', [BudgetSummaryController::class, 'statutoryAndContractualTotals']);
    Route::get ('/income-fund',      [IncomeFundController::class, 'index']);
    Route::post('/income-fund/save', [IncomeFundController::class, 'save']);
    Route::apiResource('debt-obligations', DebtObligationController::class);
    Route::get('/calamity-fund', [CalamityFundController::class, 'index']);
    Route::get('form7', [Form7Controller::class, 'index']);
    Route::apiResource('mdf-funds',      MDFFundController::class)->only(['index']);
    Route::apiResource('mdf-categories', MdfCategoryController::class)->only(['store', 'update', 'destroy']);
    Route::apiResource('mdf-items',      MdfItemController::class)->only(['index', 'store', 'update', 'destroy']);
    Route::delete('/mdf-snapshots', [MdfSnapshotController::class, 'destroy']);
    Route::get ('/ps-computation/debug', [PsComputationController::class, 'debug']);
    Route::get ('/ps-computation',       [PsComputationController::class, 'index']);

    Route::get  ('ldrrmfip/categories',     [LdrrmfipController::class, 'categories']);
    Route::get  ('ldrrmfip/sources',        [LdrrmfipController::class, 'sources']);
    Route::get  ('ldrrmfip/previous-items', [LdrrmfipController::class, 'previousItems']);
    Route::get  ('ldrrmfip/summary',        [LdrrmfipController::class, 'summary']);
    Route::apiResource('ldrrmfip', LdrrmfipController::class)
        ->parameters(['ldrrmfip' => 'ldrrmfip'])
        ->only(['index', 'store', 'update', 'destroy']);

    Route::get('ldrrmf-plan/special-accounts', [LdrrmfPlanController::class, 'specialAccounts']);
    Route::get('ldrrmf-plan/consolidated',      [LdrrmfPlanController::class, 'consolidated']);
    Route::apiResource('ldrrmf-plan', LdrrmfPlanController::class)->only(['index']);

    Route::apiResource('gad-entries', GADEntryController::class)
        ->parameters(['gad-entries' => 'gadEntry']);
    Route::get('/consolidated-special-income', [ConsolidatedSpecialIncomeController::class, 'index']);

    // ── User Profile ───────────────────────────────────────────────────────────
    Route::get ('/profile',          [ProfileController::class, 'show']);
    Route::put ('/profile',          [ProfileController::class, 'update']);
    Route::put ('/profile/password', [ProfileController::class, 'changePassword']);

    // ════════════════════════════════════════════════════════════════════════════
    // STRICTER LIMITERS — nested inside the auth group so auth still applies,
    // but these override the outer 'throttle:api' for their specific routes.
    // ════════════════════════════════════════════════════════════════════════════

    // ── File Uploads (5/min) ───────────────────────────────────────────────────
    Route::middleware('throttle:uploads')->group(function () {
        Route::post('/profile/avatar', [ProfileController::class, 'uploadAvatar']);
        Route::post(
            'department-budget-plans/{department_budget_plan}/upload-obligations',
            [DepartmentBudgetPlanController::class, 'uploadObligations']
        );
    });

    // ── Bulk Writes (20/min) ───────────────────────────────────────────────────
    Route::middleware('throttle:bulk')->group(function () {
        Route::post('personnels/bulk',                                    [PersonnelController::class, 'bulkStore']);
        Route::post('plantilla-positions/bulk',                           [PlantillaPositionController::class, 'bulkStore']);
        Route::post('plantilla-assignments/bulk',                         [PlantillaAssignmentController::class, 'bulkUpdate']);
        Route::post('salary-grade-steps/bulk',                            [SalaryGradeStepController::class, 'bulkStore']);
        Route::post('salary-standard-versions/with-steps',                [SalaryStandardVersionController::class, 'storeWithSteps']);
        Route::post('department-budget-plans/{budget_plan}/plantilla-assignments/bulk', [DepartmentBudgetPlanController::class, 'bulkSavePlantillaAssignments']);
        Route::post('debt-obligations/{obligation}/payment',              [DebtObligationController::class, 'upsertPayment']);
        Route::post('debt-obligations/payments/bulk',                     [DebtObligationController::class, 'bulkUpsertPayments']);
        Route::post('form6/init',            [Form6Controller::class, 'init']);
        Route::post('form6/bulk',            [Form6Controller::class, 'bulk']);
        Route::post('form6/sync-from-ps',    [Form6Controller::class, 'syncFromPs']);
        Route::post('form6/sync-from-other', [Form6Controller::class, 'syncFromOther']);
        Route::post('form6-special/init',            [Form6SpecialController::class, 'init']);
        Route::post('form6-special/bulk',            [Form6SpecialController::class, 'bulk']);
        Route::post('form6-special/sync-from-ps',    [Form6SpecialController::class, 'syncFromPs']);
        Route::post('form6-special/sync-from-other', [Form6SpecialController::class, 'syncFromOther']);
        Route::post('/ps-computation/save',          [PsComputationController::class, 'save']);
        Route::patch('ldrrmfip/upsert-year-amounts', [LdrrmfipController::class, 'upsertYearAmounts']);
        Route::post('gad-entries/bulk',              [GADEntryController::class, 'bulk']);
        Route::post('gad-entries/reorder',           [GADEntryController::class, 'reorder']);
        Route::post('mdf-funds/save-proposed',       [MDFFundController::class, 'saveProposed']);
        Route::post('mdf-funds/save-sem1',           [MDFFundController::class, 'saveSem1']);
        Route::post('mdf-funds/save-obligation', [MDFFundController::class, 'saveObligation']);
        Route::post('mdf-funds/sync-debt-items',     [MDFFundController::class, 'syncDebtItems']);

        // Unified plans
        $unifiedPlans = [
            'lcpc' => 'lcpc', 'lydp' => 'lydp', 'sc' => 'sc',
            'mpoc' => 'mpoc', 'drugs' => 'drugs', 'arts' => 'arts',
            'aids' => 'aids', 'sc-ppa' => 'sc_ppa', 'nutrition' => 'nutrition',
        ];
        foreach ($unifiedPlans as $slug => $type) {
            Route::post("{$slug}-plan/bulk", [UnifiedPlanItemController::class, 'bulk'])
                ->defaults('planType', $type);
        }
    });

    // ── Report Generation (10/min) ─────────────────────────────────────────────
    Route::middleware('throttle:reports')->prefix('reports/unified')->group(function () {
        Route::get ('sources',          [UnifiedReportController::class, 'sources']);
        Route::post('form1',            [UnifiedReportController::class, 'form1']);
        Route::post('dept',             [UnifiedReportController::class, 'dept']);
        Route::post('form5',            [UnifiedReportController::class, 'form5']);
        Route::post('form6pdf',         [UnifiedReportController::class, 'form6PDF']);
        Route::post('form7pdf',         [UnifiedReportController::class, 'form7PDF']);
        Route::post('mdf20pdf',         [UnifiedReportController::class, 'mdf20PDF']);
        Route::post('calamity5pdf',     [UnifiedReportController::class, 'calamity5PDF']);
        Route::post('pscomputationpdf', [UnifiedReportController::class, 'psComputationPDF']);
        Route::post('summary',          [UnifiedReportController::class, 'summary']);
        Route::post('generate-all',     [UnifiedReportController::class, 'generateAll']);


        // Route::post('lep/consolidated-plantilla', [LEPReportController::class, 'consolidatedPlantilla']);
    });

    Route::prefix('reports/lep')->group(function () {
        Route::post('consolidated-plantilla',         [LEPReportController::class,        'consolidatedPlantilla']);
        Route::get ('header-settings/{budgetPlanId}', [LepHeaderSettingController::class, 'show']);
        Route::put ('header-settings/{budgetPlanId}', [LepHeaderSettingController::class, 'upsert']);

        Route::post('receipts-program', [LEPReportController::class, 'receiptsProgram']);
        Route::post('form2', [LEPReportController::class, 'lepForm2']);
        Route::post('form7', [LEPReportController::class, 'lepForm7']);
    });

    // Unified plan read/write (non-bulk)
    $unifiedPlans = [
        'lcpc' => 'lcpc', 'lydp' => 'lydp', 'sc' => 'sc',
        'mpoc' => 'mpoc', 'drugs' => 'drugs', 'arts' => 'arts',
        'aids' => 'aids', 'sc-ppa' => 'sc_ppa', 'nutrition' => 'nutrition',
    ];
    foreach ($unifiedPlans as $slug => $type) {
        Route::get   ("{$slug}-plan",          [UnifiedPlanItemController::class, 'index'])  ->defaults('planType', $type);
        Route::post  ("{$slug}-plan",          [UnifiedPlanItemController::class, 'store'])  ->defaults('planType', $type);
        Route::put   ("{$slug}-plan/{upItem}", [UnifiedPlanItemController::class, 'update']) ->defaults('planType', $type);
        Route::delete("{$slug}-plan/{upItem}", [UnifiedPlanItemController::class, 'destroy'])->defaults('planType', $type);
    }
});
