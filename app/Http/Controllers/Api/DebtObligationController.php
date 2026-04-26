<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\DebtObligation;
use App\Models\DebtPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class DebtObligationController extends Controller
{
    /**
     * GET /api/debt-obligations?budget_plan_id=X
     *
     * Returns every obligation enriched with:
     *  – previous_principal  (6)  sum of principal_due for ALL plans BEFORE budget_plan_id
     *  – previous_interest   (7)  same for interest_due
     *  – previous_total      (8)  (6) + (7)
     *  – current_principal   (9)  principal_due for THIS budget_plan_id  (editable)
     *  – current_interest    (10) interest_due  for THIS budget_plan_id  (editable)
     *  – current_total       (11) (9) + (10)
     *  – balance_principal   (12) principal_amount − (6) − (9)
     *
     * Also returns per-plan obligation amounts (past year):
     *  – obligation_principal_amount  stored on the past budget plan's payment row
     *  – obligation_interest_amount   stored on the past budget plan's payment row
     */
    public function index(Request $request): JsonResponse
    {
        $budgetPlanId = $request->query('budget_plan_id');

        $obligations = DebtObligation::orderBy('sort_order')->orderBy('obligation_id')->get();

        $currentPlan = $budgetPlanId ? BudgetPlan::find($budgetPlanId) : null;

        // Resolve past plan (year - 1) if current plan is known
        $pastPlan = null;
        if ($currentPlan) {
            $pastYear = (int) $currentPlan->year - 1;
            $pastPlan = BudgetPlan::where('year', $pastYear)->first();
        }

        $data = $obligations->map(function (DebtObligation $ob) use ($budgetPlanId, $currentPlan, $pastPlan) {

            // ── Previous payments ─────────────────────────────────────────────────
            $prevQuery = $ob->payments();
            if ($budgetPlanId) {
                $prevQuery = $prevQuery->where('budget_plan_id', '!=', $budgetPlanId);
            }
            $prevAgg = $prevQuery->selectRaw('SUM(principal_due) as prev_principal, SUM(interest_due) as prev_interest')
                ->first();

            $prevPrincipal = (float) ($prevAgg->prev_principal ?? 0);
            $prevInterest  = (float) ($prevAgg->prev_interest  ?? 0);
            $prevTotal     = $prevPrincipal + $prevInterest;

            // ── Current year payment ──────────────────────────────────────────────
            $currentPayment = $budgetPlanId
                ? $ob->payments()->where('budget_plan_id', $budgetPlanId)->first()
                : null;

            $curPrincipal     = (float) ($currentPayment->principal_due  ?? 0);
            $curInterest      = (float) ($currentPayment->interest_due   ?? 0);
            $curPrincipalSem1 = (float) ($currentPayment->principal_sem1 ?? 0);
            $curPrincipalSem2 = (float) ($currentPayment->principal_sem2 ?? 0);
            $curInterestSem1  = (float) ($currentPayment->interest_sem1  ?? 0);
            $curInterestSem2  = (float) ($currentPayment->interest_sem2  ?? 0);
            $curTotal         = $curPrincipal + $curInterest;

            // ── Past year payment (for obligation columns) ────────────────────────
            $pastPayment = $pastPlan
                ? $ob->payments()->where('budget_plan_id', $pastPlan->budget_plan_id)->first()
                : null;

            $obligationPrincipal = (float) ($pastPayment->obligation_principal_amount ?? 0);
            $obligationInterest  = (float) ($pastPayment->obligation_interest_amount  ?? 0);

            // ── Balance (12) ──────────────────────────────────────────────────────
            $balance = (float) $ob->principal_amount - $prevPrincipal - $curPrincipal;

            return [
                'obligation_id'      => $ob->obligation_id,
                'creditor'           => $ob->creditor,
                'date_contracted'    => $ob->date_contracted,
                'term'               => $ob->term,
                'principal_amount'   => (float) $ob->principal_amount,
                'purpose'            => $ob->purpose,

                // Previous (read-only)
                'previous_principal' => $prevPrincipal,
                'previous_interest'  => $prevInterest,
                'previous_total'     => $prevTotal,

                // Current year (editable)
                'current_principal'      => $curPrincipal,
                'current_interest'       => $curInterest,
                'current_total'          => $curTotal,
                'current_principal_sem1' => $curPrincipalSem1,
                'current_principal_sem2' => $curPrincipalSem2,
                'current_interest_sem1'  => $curInterestSem1,
                'current_interest_sem2'  => $curInterestSem2,

                // Past year obligation (editable)
                'obligation_principal'   => $obligationPrincipal,
                'obligation_interest'    => $obligationInterest,
                'obligation_total'       => $obligationPrincipal + $obligationInterest,

                // Meta
                'balance_principal'  => $balance,
                'payment_id'         => $currentPayment?->payment_id,
                'past_payment_id'    => $pastPayment?->payment_id,
                'past_plan_id'       => $pastPlan?->budget_plan_id,
                'past_plan_missing'  => $pastPlan === null,
                'is_active'          => $ob->is_active,
                'sort_order'         => $ob->sort_order,
            ];
        });

        // ── Column totals ─────────────────────────────────────────────────────────
        $totals = [
            'principal_amount'       => $data->sum('principal_amount'),
            'previous_principal'     => $data->sum('previous_principal'),
            'previous_interest'      => $data->sum('previous_interest'),
            'previous_total'         => $data->sum('previous_total'),
            'current_principal'      => $data->sum('current_principal'),
            'current_interest'       => $data->sum('current_interest'),
            'current_total'          => $data->sum('current_total'),
            'current_principal_sem1' => $data->sum('current_principal_sem1'),
            'current_principal_sem2' => $data->sum('current_principal_sem2'),
            'current_interest_sem1'  => $data->sum('current_interest_sem1'),
            'current_interest_sem2'  => $data->sum('current_interest_sem2'),
            'obligation_principal'   => $data->sum('obligation_principal'),
            'obligation_interest'    => $data->sum('obligation_interest'),
            'obligation_total'       => $data->sum('obligation_total'),
            'balance_principal'      => $data->sum('balance_principal'),
        ];

        return response()->json([
            'data'    => $data,
            'totals'  => $totals,
            'budget_plan' => $currentPlan ? [
                'budget_plan_id' => $currentPlan->budget_plan_id,
                'year'           => $currentPlan->year,
            ] : null,
            'past_plan' => $pastPlan ? [
                'budget_plan_id' => $pastPlan->budget_plan_id,
                'year'           => $pastPlan->year,
            ] : null,
            'past_plan_missing' => $pastPlan === null,
        ]);
    }

    /**
     * POST /api/debt-obligations
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'creditor'         => 'required|string|max:255',
            'date_contracted'  => 'required|string|max:255',
            'term'             => 'required|string',
            'principal_amount' => 'required|numeric|min:0',
            'purpose'          => 'required|string',
            'sort_order'       => 'nullable|integer',
        ]);

        $obligation = DebtObligation::create($validated);

        return response()->json(['data' => $obligation], 201);
    }

    /**
     * GET /api/debt-obligations/{id}
     */
    public function show(int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);
        return response()->json(['data' => $ob]);
    }

    /**
     * PUT /api/debt-obligations/{id}
     */
    public function update(Request $request, int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);

        $validated = $request->validate([
            'creditor'         => 'sometimes|required|string|max:255',
            'date_contracted'  => 'sometimes|required|string|max:255',
            'term'             => 'sometimes|required|string',
            'principal_amount' => 'sometimes|required|numeric|min:0',
            'purpose'          => 'sometimes|required|string',
            'is_active'        => 'sometimes|boolean',
            'sort_order'       => 'sometimes|integer',
        ]);

        $ob->update($validated);

        return response()->json(['data' => $ob]);
    }

    /**
     * DELETE /api/debt-obligations/{id}
     */
    public function destroy(int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);
        $ob->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Payment sub-resource
    // ══════════════════════════════════════════════════════════════════════════

    /**
     * POST /api/debt-obligations/{id}/payment
     *
     * Upsert the current-year payment row.
     * Body: { budget_plan_id, principal_due, interest_due }
     */
    public function upsertPayment(Request $request, int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'principal_due'  => 'required|numeric|min:0',
            'interest_due'   => 'required|numeric|min:0',
        ]);

        $payment = DebtPayment::updateOrCreate(
            [
                'obligation_id'  => $ob->obligation_id,
                'budget_plan_id' => $validated['budget_plan_id'],
            ],
            [
                'principal_due' => $validated['principal_due'],
                'interest_due'  => $validated['interest_due'],
            ]
        );

        return response()->json(['data' => $payment], 200);
    }

    /**
     * POST /api/debt-obligations/payments/bulk
     *
     * Bulk-upsert current-year payments.
     * Body: { budget_plan_id, items: [{ obligation_id, principal_due, interest_due }] }
     */
    public function bulkUpsertPayments(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_id'              => 'required|integer|exists:budget_plans,budget_plan_id',
            'items'                       => 'required|array|min:1',
            'items.*.obligation_id'       => 'required|integer|exists:debt_obligations,obligation_id',
            'items.*.principal_due'       => 'required|numeric|min:0',
            'items.*.interest_due'        => 'required|numeric|min:0',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['items'] as $item) {
                DebtPayment::updateOrCreate(
                    [
                        'obligation_id'  => $item['obligation_id'],
                        'budget_plan_id' => $validated['budget_plan_id'],
                    ],
                    [
                        'principal_due' => $item['principal_due'],
                        'interest_due'  => $item['interest_due'],
                    ]
                );
            }
        });

        return response()->json(['message' => 'Payments saved successfully']);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // New: save sem1 for current year (principal or interest)
    // POST /api/debt-obligations/{id}/save-sem1
    //
    // Body: { budget_plan_id, type: "principal"|"interest", sem1_amount }
    //
    // Behaviour:
    //   - sem1 is clamped to the corresponding *_due value (total)
    //   - sem2 = due - sem1  (auto-computed and stored)
    // ══════════════════════════════════════════════════════════════════════════

    public function saveSem1(Request $request, int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);

        $v = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'type'           => 'required|in:principal,interest',
            'sem1_amount'    => 'required|numeric|min:0',
        ]);

        $payment = DebtPayment::firstOrNew([
            'obligation_id'  => $ob->obligation_id,
            'budget_plan_id' => $v['budget_plan_id'],
        ]);

        if ($v['type'] === 'principal') {
            $total = (float) $payment->principal_due;
            $sem1  = min(max((float) $v['sem1_amount'], 0), $total);
            $sem2  = max(0.0, $total - $sem1);
            $payment->principal_sem1 = $sem1;
            $payment->principal_sem2 = $sem2;
        } else {
            $total = (float) $payment->interest_due;
            $sem1  = min(max((float) $v['sem1_amount'], 0), $total);
            $sem2  = max(0.0, $total - $sem1);
            $payment->interest_sem1 = $sem1;
            $payment->interest_sem2 = $sem2;
        }

        $payment->save();

        return response()->json([
            'data' => [
                'payment_id'      => $payment->payment_id,
                'type'            => $v['type'],
                'sem1_amount'     => $v['type'] === 'principal' ? $payment->principal_sem1 : $payment->interest_sem1,
                'sem2_amount'     => $v['type'] === 'principal' ? $payment->principal_sem2 : $payment->interest_sem2,
                'total'           => $v['type'] === 'principal' ? $payment->principal_due  : $payment->interest_due,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // New: save past-year obligation amounts (principal or interest)
    // POST /api/debt-obligations/{id}/save-obligation
    //
    // Body: { past_plan_id, type: "principal"|"interest", obligation_amount }
    //
    // Rules:
    //   - past_plan_id must exist as a budget plan
    //   - Saves to the payment row keyed on (obligation_id, past_plan_id)
    // ══════════════════════════════════════════════════════════════════════════

    public function saveObligation(Request $request, int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);

        $v = $request->validate([
            'past_plan_id'       => 'required|integer',
            'type'               => 'required|in:principal,interest',
            'obligation_amount'  => 'required|numeric|min:0',
        ]);

        $pastPlan = BudgetPlan::find($v['past_plan_id']);
        if (! $pastPlan) {
            return response()->json([
                'message' => "Budget plan for the past year does not exist. "
                    . "Please create it first before entering obligation amounts.",
            ], 422);
        }

        $payment = DebtPayment::firstOrNew([
            'obligation_id'  => $ob->obligation_id,
            'budget_plan_id' => $pastPlan->budget_plan_id,
        ]);

        if ($v['type'] === 'principal') {
            $payment->obligation_principal_amount = (float) $v['obligation_amount'];
        } else {
            $payment->obligation_interest_amount = (float) $v['obligation_amount'];
        }

        $payment->save();

        return response()->json([
            'data' => [
                'payment_id'                  => $payment->payment_id,
                'type'                        => $v['type'],
                'obligation_principal_amount' => (float) $payment->obligation_principal_amount,
                'obligation_interest_amount'  => (float) $payment->obligation_interest_amount,
            ],
        ]);
    }
}
