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
    BudgetReportController,
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
    GadEntryController,
    UnifiedPlanItemController,
    ConsolidatedSpecialIncomeController,
    LbpForm1Controller,
    ReportForm5controller,
    UnifiedReportController,
    ProfileController,
};

Route::prefix('auth')->group(function () {
    Route::post('/login', [AuthController::class, 'login']);
});

Route::middleware('auth:sanctum')->group(function () {

    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // ── Core Resources ─────────────────────────────────────────────────────────
    Route::apiResource('users',                     UserController::class);
    Route::apiResource('department-categories',     DepartmentCategoryController::class);
    Route::apiResource('departments',               DepartmentController::class);
    Route::apiResource('expense-classifications',   ExpenseClassificationController::class);
    Route::apiResource('expense-class-items',       ExpenseClassItemController::class);

    // ── Personnel & Plantilla ──────────────────────────────────────────────────
    Route::apiResource('personnels', PersonnelController::class);
    Route::post('personnels/bulk', [PersonnelController::class, 'bulkStore']);
    
    Route::post('plantilla-positions/renumber', [PlantillaPositionController::class, 'renumber']);
    Route::apiResource('plantilla-positions', PlantillaPositionController::class);
    Route::post('plantilla-positions/bulk', [PlantillaPositionController::class, 'bulkStore']);

    Route::apiResource('plantilla-assignments', PlantillaAssignmentController::class);
    Route::post('plantilla-assignments/bulk', [PlantillaAssignmentController::class, 'bulkUpdate']);

    // ── Salary Standards ───────────────────────────────────────────────────────
    Route::apiResource('salary-standard-versions', SalaryStandardVersionController::class);
    Route::apiResource('salary-grade-steps',        SalaryGradeStepController::class);
    Route::post('salary-grade-steps/bulk', [SalaryGradeStepController::class, 'bulkStore']);
    Route::post('salary-standard-versions/with-steps', [SalaryStandardVersionController::class, 'storeWithSteps']);
    Route::post('salary-standard-versions/{version}/activate', [SalaryStandardVersionController::class, 'activate']);

    // ── Budget Plans ───────────────────────────────────────────────────────────
    // Named extra routes MUST come before apiResource to avoid wildcard conflicts
    Route::get ('budget-plans/active',                    [BudgetPlanController::class, 'active']);
    Route::post('budget-plans/{budget_plan}/activate',    [BudgetPlanController::class, 'activate']);
    Route::post('budget-plans/{budget_plan}/close',       [BudgetPlanController::class, 'close']);
    Route::get ('budget-plans/{budget_plan}/draft-departments', [BudgetPlanController::class, 'draftDepartments']);

    Route::apiResource('budget-plans', BudgetPlanController::class);

    // ── Department Budget Plans ────────────────────────────────────────────────
    // Static extra routes BEFORE apiResource (avoids {department_budget_plan} matching 'years')
    Route::get('/department-budget-plans/years',                    [DepartmentBudgetPlanController::class, 'years']);
    Route::get('/department-budget-plans/by-dept-year/{dept}/{year}', [DepartmentBudgetPlanController::class, 'findByDeptAndYear']);

    Route::apiResource('department-budget-plans', DepartmentBudgetPlanController::class);

    // Status transitions
    Route::post('department-budget-plans/{department_budget_plan}/submit',  [DepartmentBudgetPlanController::class, 'submit']);
    Route::post('department-budget-plans/{department_budget_plan}/approve', [DepartmentBudgetPlanController::class, 'approve']);
    Route::post('department-budget-plans/{department_budget_plan}/reject',  [DepartmentBudgetPlanController::class, 'reject']);

    // Nested items (Form 2)
    Route::apiResource('department-budget-plans.items', BudgetPlanForm2ItemController::class);

    // Plantilla assignments sub-resource
    Route::get ('department-budget-plans/{budget_plan}/plantilla-assignments',       [DepartmentBudgetPlanController::class, 'plantillaAssignments']);
    Route::post('department-budget-plans/{budget_plan}/plantilla-assignments/bulk',  [DepartmentBudgetPlanController::class, 'bulkSavePlantillaAssignments']);

    // ── Form 4 / AIP ──────────────────────────────────────────────────────────
    Route::apiResource('form4-items', BudgetPlanForm4ItemController::class);
    Route::get('/aip-programs', [AipProgramController::class, 'index']);

    // ── Form 6 (legacy item resource — kept for backward compat) ──────────────
    Route::apiResource('dept-bp-form6-items', BudgetPlanForm6ItemController::class);

    // ── Form 6 — Statement of Statutory and Contractual Obligations ───────────
    //
    // Non-resource actions MUST come before apiResource to avoid route conflicts.
    //
    // Static named actions:
    Route::get ('form6/templates',       [Form6Controller::class, 'templates']);
    Route::post('form6/init',            [Form6Controller::class, 'init']);
    Route::post('form6/bulk',            [Form6Controller::class, 'bulk']);
    Route::post('form6/sync-from-ps',    [Form6Controller::class, 'syncFromPs']);
    Route::post('form6/sync-from-other', [Form6Controller::class, 'syncFromOther']);

    // apiResource: index, store, update, destroy
    // {form6} → Form6Item model binding
    Route::apiResource('form6', Form6Controller::class)
        ->parameters(['form6' => 'form6Item'])
        ->only(['index', 'store', 'update', 'destroy']);

        Route::get ('form6-special/sources',         [Form6SpecialController::class, 'sources']);
Route::get ('form6-special/templates',       [Form6SpecialController::class, 'templates']);
Route::post('form6-special/init',            [Form6SpecialController::class, 'init']);
Route::post('form6-special/bulk',            [Form6SpecialController::class, 'bulk']);
Route::post('form6-special/sync-from-ps',    [Form6SpecialController::class, 'syncFromPs']);
Route::post('form6-special/sync-from-other', [Form6SpecialController::class, 'syncFromOther']);
 
Route::apiResource('form6-special', Form6SpecialController::class)
    ->parameters(['form6-special' => 'form6Item'])
    ->only(['index', 'store', 'update', 'destroy']);

    // ── Aggregate Totals ───────────────────────────────────────────────────────
    //
    // GET /api/totals/keys       → list of { key, label } — no DB hit
    // GET /api/totals             → all totals for a plan
    // GET /api/totals/{key}       → single total by key
    //
    // 'keys' MUST be declared before apiResource so it is not captured by {key}.
    //
    Route::get('totals/keys',                [AggregateTotalsController::class, 'keys']);
    Route::get('totals/income-fund-derived', [AggregateTotalsController::class, 'incomeFundDerived']);

    Route::apiResource('totals', AggregateTotalsController::class)
        ->parameters(['totals' => 'key'])   // {totals} segment → $key string param
        ->only(['index', 'show']);

    // ── Misc ───────────────────────────────────────────────────────────────────
    Route::get('/budget-summary/statutory/{year}', [BudgetSummaryController::class, 'statutoryAndContractualTotals']);

    // Route::post('/reports/generate', [BudgetReportController::class, 'generate']);
    // Route::get ('/reports/form2',    [BudgetReportController::class, 'generateForm2']);

    Route::get ('/income-fund',      [IncomeFundController::class, 'index']);
    Route::post('/income-fund/save', [IncomeFundController::class, 'save']);

    // Route::get ('/mdf-funds',         [MDFFundController::class, 'index']);
    // Route::put ('/mdf-funds/{id}',    [MDFFundController::class, 'update']);
    // Route::post('/mdf-funds/bulk-update', [MDFFundController::class, 'bulkUpdate']);

    // Statement of Indebtedness (LBP Form 5)
    Route::apiResource('debt-obligations', DebtObligationController::class);
    Route::post('debt-obligations/{obligation}/payment',  [DebtObligationController::class, 'upsertPayment']);
    Route::post('debt-obligations/payments/bulk',         [DebtObligationController::class, 'bulkUpsertPayments']);

    Route::get('/calamity-fund', [\App\Http\Controllers\Api\CalamityFundController::class, 'index']);

    Route::get('form7', [Form7Controller::class, 'index']);

    Route::post('mdf-funds/save-proposed',   [MDFFundController::class,  'saveProposed']);
    Route::post('mdf-funds/save-sem1',       [MDFFundController::class,  'saveSem1']);
    Route::post('mdf-funds/sync-debt-items', [MDFFundController::class,  'syncDebtItems']);
    
    Route::apiResource('mdf-funds',      MDFFundController::class)->only(['index']);
    Route::apiResource('mdf-categories', MdfCategoryController::class)->only(['store', 'update', 'destroy']);
    Route::apiResource('mdf-items',      MdfItemController::class)->only(['index', 'store', 'update', 'destroy']);
 
    Route::get ('/ps-computation/debug', [PsComputationController::class, 'debug']);
    Route::get ('/ps-computation',       [PsComputationController::class, 'index']);
    Route::post('/ps-computation/save',  [PsComputationController::class, 'save']);

    Route::get('ldrrmfip/categories',     [LdrrmfipController::class, 'categories']);
    Route::get('ldrrmfip/sources',        [LdrrmfipController::class, 'sources']);      // ← NEW
    Route::get('ldrrmfip/previous-items', [LdrrmfipController::class, 'previousItems']);
    Route::get('ldrrmfip/summary',        [LdrrmfipController::class, 'summary']);
    
    Route::apiResource('ldrrmfip', LdrrmfipController::class)
        ->parameters(['ldrrmfip' => 'ldrrmfip'])
        ->only(['index', 'store', 'update', 'destroy']);

    // Static named route before apiResource
    Route::get('ldrrmf-plan/special-accounts', [LdrrmfPlanController::class, 'specialAccounts']);
    
    Route::apiResource('ldrrmf-plan', LdrrmfPlanController::class)
        ->only(['index']);

    Route::post('gad-entries/bulk',    [GadEntryController::class, 'bulk']);
    Route::post('gad-entries/reorder', [GadEntryController::class, 'reorder']);
 
    Route::apiResource('gad-entries', GadEntryController::class)
        ->parameters(['gad-entries' => 'gadEntry']);

    // Route::post('lcpc-items/bulk', [LcpcItemController::class, 'bulk']);
    // Route::apiResource('lcpc-items', LcpcItemController::class)
    //     ->parameters(['lcpc-items' => 'lcpcItem']);

    $unifiedPlans = [
        // slug          => plan_type
        'lcpc'           => 'lcpc',
        'lydp'           => 'lydp',
        'sc'             => 'sc',
        'mpoc'           => 'mpoc',
        'drugs'          => 'drugs',
        'arts'           => 'arts',
        'aids'           => 'aids',
        'sc-ppa'         => 'sc_ppa',
        'nutrition'      => 'nutrition',
    ];
    
    foreach ($unifiedPlans as $slug => $type) {
        // Bulk MUST be before {upItem} wildcard
        Route::post("{$slug}-plan/bulk", [UnifiedPlanItemController::class, 'bulk'])
            ->defaults('planType', $type);
    
        Route::get   ("{$slug}-plan",          [UnifiedPlanItemController::class, 'index'])  ->defaults('planType', $type);
        Route::post  ("{$slug}-plan",          [UnifiedPlanItemController::class, 'store'])  ->defaults('planType', $type);
        Route::put   ("{$slug}-plan/{upItem}", [UnifiedPlanItemController::class, 'update']) ->defaults('planType', $type);
        Route::delete("{$slug}-plan/{upItem}", [UnifiedPlanItemController::class, 'destroy'])->defaults('planType', $type);
    }

    Route::get('/consolidated-special-income', [ConsolidatedSpecialIncomeController::class, 'index']);
        
    // Route::post('/reports/lbp-form1/generate', [LbpForm1Controller::class, 'generate']);
    // Route::get('/reports/lbp-form1/sources',  [LbpForm1Controller::class, 'sources']);

    
    // Route::post('/reports/lbp-form5/generate', [ReportForm5controller::class, 'generate']);

    Route::prefix('reports/unified')->group(function () {
 
        // Filter options (Form 1 scope dropdown)
        Route::get ('sources',      [UnifiedReportController::class, 'sources']);
    
        // Individual form endpoints
        Route::post('form1',        [UnifiedReportController::class, 'form1']);   // B.E.S.F.
        Route::post('dept',         [UnifiedReportController::class, 'dept']);    // Forms 2, 3, 4
        Route::post('form5',        [UnifiedReportController::class, 'form5']);   // Indebtedness (landscape)
        Route::post('form6pdf',  [UnifiedReportController::class, 'form6PDF']);
        Route::post('form7pdf',  [UnifiedReportController::class, 'form7PDF']);
        Route::post('mdf20pdf', [UnifiedReportController::class, 'mdf20PDF']);
        Route::post('summary', [UnifiedReportController::class, 'summary']);

        // Generate All → ZIP
        // POST body: budget_plan_id, forms[] e.g. ['form1','form2','form3','form4','form5']
        Route::post('generate-all', [UnifiedReportController::class, 'generateAll']);
        // In your unified reports route group:
    });

    // ── User Profile ───────────────────────────────────────────────────────────
    Route::get ('/profile',          [ProfileController::class, 'show']);
    Route::put ('/profile',          [ProfileController::class, 'update']);
    Route::put ('/profile/password', [ProfileController::class, 'changePassword']);
    Route::post('/profile/avatar',   [ProfileController::class, 'uploadAvatar']);
    });