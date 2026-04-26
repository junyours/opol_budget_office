<?php
// app/Http/Controllers/Api/MDFFundController.php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\DebtObligation;
use App\Models\DebtPayment;
use App\Models\MdfCategory;
use App\Models\MdfItem;
use App\Models\MdfSnapshot;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MDFFundController extends Controller
{
    // ══════════════════════════════════════════════════════════════════════════
    // GET /api/mdf-funds?budget_plan_id=X
    //
    // Column mapping:
    //   col (3) past obligation → pastPlan snapshot.obligation_amount  [EDITABLE for regular]
    //                           → debt_payments.obligation_principal/interest_amount [EDITABLE for debt]
    //   col (4) sem1 actual     → currentPlan snapshot.sem1_actual        [EDITABLE for regular]
    //                           → debt_payments.principal/interest_sem1   [EDITABLE for debt]
    //   col (5) sem2            → auto-computed, stored                   [READ-ONLY display]
    //   col (6) cur total       → currentPlan snapshot.total_amount       [READ-ONLY for regular]
    //                           → debt_payments.principal/interest_due    [READ-ONLY for debt]
    //   col (7) proposed        → activePlan  snapshot.total_amount       [EDITABLE for regular]
    //                           → debt_payments.principal/interest_due    [READ-ONLY for debt]
    //
    // Auto-syncs debt items before returning data (replaces manual sync button).
    // ══════════════════════════════════════════════════════════════════════════

    public function index(Request $request): JsonResponse
    {
        $budgetPlanId = $request->query('budget_plan_id');

        $activePlan = $budgetPlanId
            ? BudgetPlan::find($budgetPlanId)
            : BudgetPlan::where('is_active', true)->latest('budget_plan_id')->first();

        if (! $activePlan) {
            return response()->json(['message' => 'No active budget plan found.'], 404);
        }

        // ── Auto-sync debt items so the caller never has to press a button ────
        $this->autoSyncDebtItems();

        $proposedYear = (int) $activePlan->year;
        $currentYear  = $proposedYear - 1;
        $pastYear     = $proposedYear - 2;

        $currentPlan = BudgetPlan::where('year', $currentYear)->first();
        $pastPlan    = BudgetPlan::where('year', $pastYear)->first();

        $relevantPlanIds = array_values(array_filter([
            $activePlan->budget_plan_id,
            $currentPlan?->budget_plan_id,
            $pastPlan?->budget_plan_id,
        ]));

        $categories = MdfCategory::orderBy('sort_order')
            ->with([
                'items' => function ($q) use ($relevantPlanIds) {
                    $q->where('is_active', true)
                      ->orderBy('sort_order')
                      ->with([
                          'snapshots' => fn($sq) => $sq->whereIn('budget_plan_id', $relevantPlanIds),
                      ]);
                },
            ])
            ->get();

        $obligationIds = DebtObligation::where('is_active', true)->pluck('obligation_id')->all();

        $debtPayments = collect();
        if ($obligationIds && $relevantPlanIds) {
            $debtPayments = DebtPayment::whereIn('obligation_id', $obligationIds)
                ->whereIn('budget_plan_id', $relevantPlanIds)
                ->get()
                ->groupBy(fn($p) => "{$p->obligation_id}_{$p->budget_plan_id}");
        }

        $pay = function (int $obligationId, ?int $planId, string $field) use ($debtPayments): float {
            if (! $planId) return 0.0;
            $row = $debtPayments->get("{$obligationId}_{$planId}")?->first();
            return $row ? (float) $row->$field : 0.0;
        };

        $result = $categories->map(function (MdfCategory $cat) use (
            $activePlan, $currentPlan, $pastPlan, $pay
        ) {
            $items = $cat->items->map(function (MdfItem $item) use (
                $activePlan, $currentPlan, $pastPlan, $pay
            ) {
                // ── Debt-servicing rows ─────────────────────────────────────
                if ($item->obligation_id && $item->debt_type) {
                    $dueField = $item->debt_type === 'principal' ? 'principal_due'  : 'interest_due';
                    $s1Field  = $item->debt_type === 'principal' ? 'principal_sem1' : 'interest_sem1';
                    $s2Field  = $item->debt_type === 'principal' ? 'principal_sem2' : 'interest_sem2';
                    $oblField = $item->debt_type === 'principal'
                        ? 'obligation_principal_amount'
                        : 'obligation_interest_amount';

                    $pastObligation = $pay($item->obligation_id, $pastPlan?->budget_plan_id, $oblField);
                    $curTotal       = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $dueField);
                    $curSem1        = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $s1Field);
                    $curSem2Stored  = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $s2Field);
                    $curSem2        = $curSem2Stored > 0
                        ? $curSem2Stored
                        : max(0, $curTotal - $curSem1);
                    $proposed       = $pay($item->obligation_id, $activePlan->budget_plan_id, $dueField);

                    // Hide row if no data exists across all 3 plans
                    if ($pastObligation == 0 && $curTotal == 0 && $proposed == 0) {
                        if ($item->debt_type === 'principal') {
                            $obligation = DebtObligation::find($item->obligation_id);
                            if ($obligation) {
                                $totalPaid = DebtPayment::where('obligation_id', $item->obligation_id)
                                    ->sum('principal_due');
                                $balance = (float) $obligation->principal_amount - (float) $totalPaid;
                                if ($balance <= 0) return null;
                            } else {
                                return null;
                            }
                        } else {
                            return null;
                        }
                    }

                    return [
                        'item_id'             => $item->item_id,
                        'category_id'         => $item->category_id,
                        'name'                => $item->name,
                        'account_code'        => $item->account_code,
                        'obligation_id'       => $item->obligation_id,
                        'debt_type'           => $item->debt_type,
                        'sort_order'          => $item->sort_order,
                        'is_debt_row'         => true,
                        'active_snapshot_id'  => null,
                        'current_snapshot_id' => null,
                        'past_snapshot_id'    => null,
                        // Past obligation (col 3) — NOW editable, stored in debt_payments
                        'past_obligation'     => $pastObligation,
                        // Current year (col 4/5/6)
                        'cur_sem1'            => $curSem1,
                        'cur_sem2'            => $curSem2,
                        'cur_total'           => $curTotal,
                        // Budget year (col 7) — read-only for debt rows (from debt_payments)
                        'proposed'            => $proposed,
                        'has_prior_data'      => true,
                    ];
                }

                // ── Regular items ───────────────────────────────────────────
                $byPlan = $item->snapshots->keyBy('budget_plan_id');

                $activeSnap  = $byPlan->get($activePlan->budget_plan_id);
                $currentSnap = $currentPlan ? $byPlan->get($currentPlan->budget_plan_id) : null;
                $pastSnap    = $pastPlan    ? $byPlan->get($pastPlan->budget_plan_id)    : null;

                $hasPriorData = ($currentSnap && $currentSnap->total_amount > 0)
                             || ($pastSnap    && $pastSnap->total_amount    > 0);

                $hasAnyData = $hasPriorData
                           || ($activeSnap && $activeSnap->total_amount > 0);

                if (! $hasAnyData) return null;

                $pastObligation = (float) ($pastSnap?->obligation_amount ?? 0);
                $curTotal       = (float) ($currentSnap?->total_amount   ?? 0);
                $curSem1        = (float) ($currentSnap?->sem1_actual    ?? 0);
                $curSem2        = ($currentSnap && $currentSnap->sem2_actual > 0)
                    ? (float) $currentSnap->sem2_actual
                    : max(0, $curTotal - $curSem1);
                $proposed       = (float) ($activeSnap?->total_amount    ?? 0);

                return [
                    'item_id'             => $item->item_id,
                    'category_id'         => $item->category_id,
                    'name'                => $item->name,
                    'account_code'        => $item->account_code,
                    'obligation_id'       => null,
                    'debt_type'           => null,
                    'sort_order'          => $item->sort_order,
                    'is_debt_row'         => false,
                    'active_snapshot_id'  => $activeSnap?->snapshot_id,
                    'current_snapshot_id' => $currentSnap?->snapshot_id,
                    'past_snapshot_id'    => $pastSnap?->snapshot_id,
                    'past_obligation'     => $pastObligation,
                    'cur_sem1'            => $curSem1,
                    'cur_sem2'            => $curSem2,
                    'cur_total'           => $curTotal,
                    'proposed'            => $proposed,
                    'has_prior_data'      => $hasPriorData,
                ];
            })
            ->filter()
            ->values();

            return [
                'category_id'       => $cat->category_id,
                'name'              => $cat->name,
                'code'              => $cat->code,
                'is_debt_servicing' => $cat->is_debt_servicing,
                'sort_order'        => $cat->sort_order,
                'items'             => $items,
                'totals' => [
                    'past_obligation' => $items->sum('past_obligation'),
                    'cur_sem1'        => $items->sum('cur_sem1'),
                    'cur_sem2'        => $items->sum('cur_sem2'),
                    'cur_total'       => $items->sum('cur_total'),
                    'proposed'        => $items->sum('proposed'),
                ],
            ];
        });

        $grandTotals = [
            'past_obligation' => $result->sum(fn($c) => $c['totals']['past_obligation']),
            'cur_sem1'        => $result->sum(fn($c) => $c['totals']['cur_sem1']),
            'cur_sem2'        => $result->sum(fn($c) => $c['totals']['cur_sem2']),
            'cur_total'       => $result->sum(fn($c) => $c['totals']['cur_total']),
            'proposed'        => $result->sum(fn($c) => $c['totals']['proposed']),
        ];

        return response()->json([
            'budget_plan' => [
                'budget_plan_id' => $activePlan->budget_plan_id,
                'year'           => $activePlan->year,
            ],
            'years' => [
                'proposed'        => $proposedYear,
                'current'         => $currentYear,
                'past'            => $pastYear,
                'active_plan_id'  => $activePlan->budget_plan_id,
                'current_plan_id' => $currentPlan?->budget_plan_id,
                'past_plan_id'    => $pastPlan?->budget_plan_id,
            ],
            'past_plan_missing' => $pastPlan === null,
            'categories'        => $result,
            'grand_totals'      => $grandTotals,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/mdf-funds/save-proposed
    // ══════════════════════════════════════════════════════════════════════════

    public function saveProposed(Request $request): JsonResponse
    {
        $v = $request->validate([
            'item_id'        => 'required|integer|exists:mdf_items,item_id',
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'total_amount'   => 'required|numeric|min:0',
        ]);

        $item = MdfItem::findOrFail($v['item_id']);
        if ($item->obligation_id) {
            return response()->json(['message' => 'Debt rows are read-only.'], 422);
        }

        $snap = MdfSnapshot::updateOrCreate(
            ['item_id' => $item->item_id, 'budget_plan_id' => $v['budget_plan_id']],
            ['total_amount' => $v['total_amount']]
        );

        return response()->json(['data' => $snap]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/mdf-funds/save-sem1
    // Regular items only — debt items use DebtObligationController::saveSem1
    // ══════════════════════════════════════════════════════════════════════════

    public function saveSem1(Request $request): JsonResponse
    {
        $v = $request->validate([
            'item_id'        => 'required|integer|exists:mdf_items,item_id',
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'sem1_actual'    => 'required|numeric|min:0',
        ]);

        $item = MdfItem::findOrFail($v['item_id']);
        if ($item->obligation_id) {
            return response()->json(['message' => 'Debt rows are managed via the debt-obligations endpoint.'], 422);
        }

        $snap = MdfSnapshot::firstOrNew([
            'item_id'        => $item->item_id,
            'budget_plan_id' => $v['budget_plan_id'],
        ]);

        $clamped           = min(max((float) $v['sem1_actual'], 0), (float) $snap->total_amount);
        $snap->sem1_actual = $clamped;
        $snap->sem2_actual = max(0.0, (float) $snap->total_amount - $clamped);
        $snap->save();

        return response()->json([
            'data' => [
                'snapshot_id'  => $snap->snapshot_id,
                'sem1_actual'  => $snap->sem1_actual,
                'sem2_actual'  => $snap->sem2_actual,
                'total_amount' => $snap->total_amount,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/mdf-funds/save-obligation
    // Regular items only — debt items use DebtObligationController::saveObligation
    // ══════════════════════════════════════════════════════════════════════════

    public function saveObligation(Request $request): JsonResponse
    {
        $v = $request->validate([
            'item_id'           => 'required|integer|exists:mdf_items,item_id',
            'past_plan_id'      => 'required|integer',
            'obligation_amount' => 'required|numeric|min:0',
        ]);

        $item = MdfItem::findOrFail($v['item_id']);
        if ($item->obligation_id) {
            return response()->json(['message' => 'Debt rows are managed via the debt-obligations endpoint.'], 422);
        }

        $pastPlan = BudgetPlan::find($v['past_plan_id']);
        if (! $pastPlan) {
            return response()->json([
                'message' => "Budget plan for the past year does not exist. "
                    . "Please create it first before entering obligation amounts.",
            ], 422);
        }

        $snap = MdfSnapshot::updateOrCreate(
            [
                'item_id'        => $item->item_id,
                'budget_plan_id' => $pastPlan->budget_plan_id,
            ],
            [
                'obligation_amount' => $v['obligation_amount'],
            ]
        );

        return response()->json([
            'data' => [
                'snapshot_id'       => $snap->snapshot_id,
                'obligation_amount' => $snap->obligation_amount,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // syncDebtItems — called automatically on index(), kept for manual use too
    // POST /api/mdf-funds/sync-debt-items
    // ══════════════════════════════════════════════════════════════════════════

    public function syncDebtItems(): JsonResponse
    {
        $created = $this->autoSyncDebtItems();
        return response()->json(['message' => "{$created} debt item(s) synced."]);
    }

    /**
     * Internal helper — creates MdfItem stubs for any active debt obligation
     * that doesn't yet have principal + interest rows in the debt-servicing category.
     * Returns the number of newly created rows.
     */
    private function autoSyncDebtItems(): int
    {
        $cat = MdfCategory::where('is_debt_servicing', true)->first();
        if (! $cat) return 0;

        $created = 0;
        DB::transaction(function () use ($cat, &$created) {
            foreach (DebtObligation::where('is_active', true)->get() as $ob) {
                foreach (['principal', 'interest'] as $type) {
                    $exists = MdfItem::where('obligation_id', $ob->obligation_id)
                        ->where('debt_type', $type)->exists();
                    if (! $exists) {
                        MdfItem::create([
                            'category_id'   => $cat->category_id,
                            'name'          => "{$ob->creditor} - " . ucfirst($type),
                            'obligation_id' => $ob->obligation_id,
                            'debt_type'     => $type,
                            'sort_order'    => $ob->sort_order ?? 0,
                        ]);
                        $created++;
                    }
                }
            }
        });

        return $created;
    }
}
