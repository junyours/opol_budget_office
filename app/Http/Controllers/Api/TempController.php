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
     */
    public function index(Request $request): JsonResponse
    {
        $budgetPlanId = $request->query('budget_plan_id');

        $obligations = DebtObligation::orderBy('sort_order')->orderBy('obligation_id')->get();

        // Fetch the budget plan to know its year (for ordering "previous")
        $currentPlan = $budgetPlanId ? BudgetPlan::find($budgetPlanId) : null;

        $data = $obligations->map(function (DebtObligation $ob) use ($budgetPlanId, $currentPlan) {

            // ── Previous payments: all plan IDs that are NOT the current one ──────
            // We treat "previous" as every payment row whose budget_plan_id != current.
            // If you want strict year ordering, you can join budget_plans and filter by year.
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

            $curPrincipal = (float) ($currentPayment->principal_due ?? 0);
            $curInterest  = (float) ($currentPayment->interest_due  ?? 0);
            $curTotal     = $curPrincipal + $curInterest;

            // ── Balance (12) ──────────────────────────────────────────────────────
            $balance = (float) $ob->principal_amount - $prevPrincipal - $curPrincipal;

            return [
                'obligation_id'      => $ob->obligation_id,
                'creditor'           => $ob->creditor,           // (1)
                'date_contracted'    => $ob->date_contracted,    // (2)
                'term'               => $ob->term,               // (3)
                'principal_amount'   => (float) $ob->principal_amount, // (4)
                'purpose'            => $ob->purpose,            // (5)

                // Derived / read-only
                'previous_principal' => $prevPrincipal,          // (6)
                'previous_interest'  => $prevInterest,           // (7)
                'previous_total'     => $prevTotal,              // (8)

                // Editable for current budget plan
                'current_principal'  => $curPrincipal,           // (9)
                'current_interest'   => $curInterest,            // (10)
                'current_total'      => $curTotal,               // (11)

                // Derived
                'balance_principal'  => $balance,                // (12)

                // Meta
                'payment_id'         => $currentPayment?->payment_id,
                'is_active'          => $ob->is_active,
                'sort_order'         => $ob->sort_order,
            ];
        });

        // ── Column totals ─────────────────────────────────────────────────────────
        $totals = [
            'principal_amount'   => $data->sum('principal_amount'),
            'previous_principal' => $data->sum('previous_principal'),
            'previous_interest'  => $data->sum('previous_interest'),
            'previous_total'     => $data->sum('previous_total'),
            'current_principal'  => $data->sum('current_principal'),
            'current_interest'   => $data->sum('current_interest'),
            'current_total'      => $data->sum('current_total'),
            'balance_principal'  => $data->sum('balance_principal'),
        ];

        return response()->json([
            'data'    => $data,
            'totals'  => $totals,
            'budget_plan' => $currentPlan ? [
                'budget_plan_id'   => $currentPlan->budget_plan_id,
                'year' => $currentPlan->year,
            ] : null,
        ]);
    }

    /**
     * POST /api/debt-obligations
     * Create a new obligation (parent row only; no payment yet).
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
     * Update the parent obligation fields.
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
     * Soft-delete.
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
     * Upsert the payment row for obligation + budget_plan_id.
     * Body: { budget_plan_id, principal_due, interest_due }
     */
    public function upsertPayment(Request $request, int $id): JsonResponse
    {
        $ob = DebtObligation::findOrFail($id);

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,id',
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
     * Bulk-upsert payments for multiple obligations in one request.
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
}