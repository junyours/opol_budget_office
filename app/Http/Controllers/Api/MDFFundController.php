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
    // Loads 3 budget plans based on the active plan year:
    //   activePlan  (e.g. 2026) → col (7) proposed  = snapshot.total_amount  [EDITABLE]
    //   currentPlan (e.g. 2025) → col (4) sem1       = snapshot.sem1_actual   [EDITABLE]
    //                           → col (5) sem2       = total_amount−sem1      [COMPUTED]
    //                           → col (6) cur total  = snapshot.total_amount  [READ-ONLY]
    //   pastPlan    (e.g. 2024) → col (3) past total = snapshot.total_amount  [READ-ONLY]
    //
    // Visibility rule for regular items:
    //   Show item ONLY when pastPlan OR currentPlan has a snapshot for it.
    //   If activePlan has no snapshot yet, proposed = 0 (editable — creates on save).
    //   If neither prior plan has data → item hidden from table.
    //
    // Debt-servicing rows: always shown, values auto-derived from debt_payments.
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

        $proposedYear = (int) $activePlan->year;   // e.g. 2026
        $currentYear  = $proposedYear - 1;          // 2025
        $pastYear     = $proposedYear - 2;          // 2024

        $currentPlan = BudgetPlan::where('year', $currentYear)->first();
        $pastPlan    = BudgetPlan::where('year', $pastYear)->first();

        // Collect all relevant plan IDs for a single snapshot query
        $relevantPlanIds = array_values(array_filter([
            $activePlan->budget_plan_id,
            $currentPlan?->budget_plan_id,
            $pastPlan?->budget_plan_id,
        ]));

        // Load categories + items + all their snapshots across the 3 plans
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

        // Pre-load debt payments for auto-derived rows
        $obligationIds = DebtObligation::where('is_active', true)
            ->pluck('obligation_id')->all();

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
                // ── Debt-servicing rows ────────────────────────────────────
                if ($item->obligation_id && $item->debt_type) {
                    $dueField = $item->debt_type === 'principal' ? 'principal_due'  : 'interest_due';
                    $s1Field  = $item->debt_type === 'principal' ? 'principal_sem1' : 'interest_sem1';

                    $pastTotal   = $pay($item->obligation_id, $pastPlan?->budget_plan_id, $dueField);
                    $curTotal    = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $dueField);
                    $curSem1     = $pay($item->obligation_id, $currentPlan?->budget_plan_id, $s1Field);
                    $curSem2     = max(0, $curTotal - $curSem1);
                    $proposed    = $pay($item->obligation_id, $activePlan->budget_plan_id, $dueField);

                    // Hide debt row if none of the 3 plans has any data
                    // if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) {
                    //     return null;
                    // }
                    // Hide debt row if none of the 3 plans has any data
                    if ($pastTotal == 0 && $curTotal == 0 && $proposed == 0) {
                        if ($item->debt_type === 'principal') {
                            $obligation = \App\Models\DebtObligation::find($item->obligation_id);
                            if ($obligation) {
                                $totalPaid = \App\Models\DebtPayment::where('obligation_id', $item->obligation_id)
                                    ->sum('principal_due');
                                $balance = (float) $obligation->principal_amount - (float) $totalPaid;
                                if ($balance <= 0) {
                                    return null;
                                }
                                // Balance still remains — keep row visible (shows as –)
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
                        'past_total'          => $pastTotal,
                        'cur_sem1'            => $curSem1,
                        'cur_sem2'            => $curSem2,
                        'cur_total'           => $curTotal,
                        'proposed'            => $proposed,
                        'has_prior_data'      => true,
                    ];
                }

                // ── Regular items ──────────────────────────────────────────
                $byPlan = $item->snapshots->keyBy('budget_plan_id');

                $activeSnap  = $byPlan->get($activePlan->budget_plan_id);
                $currentSnap = $currentPlan ? $byPlan->get($currentPlan->budget_plan_id) : null;
                $pastSnap    = $pastPlan    ? $byPlan->get($pastPlan->budget_plan_id)    : null;

                // Show item when ANY of the 3 plans has data.
                // This ensures newly-added items (only active plan snapshot exists)
                // remain visible after a page reload.
                $hasPriorData = ($currentSnap && $currentSnap->total_amount > 0)
                             || ($pastSnap    && $pastSnap->total_amount    > 0);

                $hasAnyData = $hasPriorData
                           || ($activeSnap && $activeSnap->total_amount > 0);

                if (! $hasAnyData) return null;

                $pastTotal = (float) ($pastSnap?->total_amount ?? 0);
                $curTotal  = (float) ($currentSnap?->total_amount ?? 0);
                $curSem1   = (float) ($currentSnap?->sem1_actual  ?? 0);
                $curSem2   = max(0, $curTotal - $curSem1);
                $proposed  = (float) ($activeSnap?->total_amount  ?? 0);

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
                    'past_total'          => $pastTotal,
                    'cur_sem1'            => $curSem1,
                    'cur_sem2'            => $curSem2,
                    'cur_total'           => $curTotal,
                    'proposed'            => $proposed,
                    'has_prior_data'      => $hasPriorData,  // false = newly added, no history yet
                ];
            })
            ->filter()   // remove null (items with no prior data)
            ->values();

            return [
                'category_id'       => $cat->category_id,
                'name'              => $cat->name,
                'code'              => $cat->code,
                'is_debt_servicing' => $cat->is_debt_servicing,
                'sort_order'        => $cat->sort_order,
                'items'             => $items,
                'totals' => [
                    'past_total' => $items->sum('past_total'),
                    'cur_sem1'   => $items->sum('cur_sem1'),
                    'cur_sem2'   => $items->sum('cur_sem2'),
                    'cur_total'  => $items->sum('cur_total'),
                    'proposed'   => $items->sum('proposed'),
                ],
            ];
        });

        $grandTotals = [
            'past_total' => $result->sum(fn($c) => $c['totals']['past_total']),
            'cur_sem1'   => $result->sum(fn($c) => $c['totals']['cur_sem1']),
            'cur_sem2'   => $result->sum(fn($c) => $c['totals']['cur_sem2']),
            'cur_total'  => $result->sum(fn($c) => $c['totals']['cur_total']),
            'proposed'   => $result->sum(fn($c) => $c['totals']['proposed']),
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
            'categories'   => $result,
            'grand_totals' => $grandTotals,
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // POST /api/mdf-funds/save-proposed
    //
    // Save col (7) proposed → active plan snapshot's total_amount.
    // Creates the snapshot row if it doesn't exist yet.
    // Body: { item_id, budget_plan_id, total_amount }
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
    //
    // Save col (4) sem1 → current year plan snapshot's sem1_actual.
    // Mirrors Form2's handlePastSem1Blur — sem1 is clamped to total_amount.
    // Body: { item_id, budget_plan_id, sem1_actual }
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
            return response()->json(['message' => 'Debt rows are read-only.'], 422);
        }

        // Find or create the snapshot for the current year plan
        $snap = MdfSnapshot::firstOrNew([
            'item_id'        => $item->item_id,
            'budget_plan_id' => $v['budget_plan_id'],
        ]);

        // Clamp sem1 to total_amount (sem2 = total - sem1, always ≥ 0)
        $clamped           = min(max((float) $v['sem1_actual'], 0), $snap->total_amount);
        $snap->sem1_actual = $clamped;
        $snap->save();

        return response()->json([
            'data' => [
                'snapshot_id'  => $snap->snapshot_id,
                'sem1_actual'  => $snap->sem1_actual,
                'sem2'         => $snap->sem2,  // accessor: total - sem1
                'total_amount' => $snap->total_amount,
            ],
        ]);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // Category and Item CRUD have moved to dedicated controllers:
    //   MdfCategoryController  →  POST/PUT/DELETE /api/mdf-categories
    //   MdfItemController      →  GET/POST/PUT/DELETE /api/mdf-items
    // ══════════════════════════════════════════════════════════════════════════


    public function syncDebtItems(): JsonResponse
    {
        $cat = MdfCategory::where('is_debt_servicing', true)->first();
        if (! $cat) {
            return response()->json(['message' => 'No debt-servicing category found.'], 404);
        }

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

        return response()->json(['message' => "{$created} debt item(s) synced."]);
    }
}