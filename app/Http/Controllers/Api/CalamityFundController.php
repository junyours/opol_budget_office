<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\BudgetPlan;
use App\Models\IncomeFundObject;
use App\Models\IncomeFundAmount;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * GET /api/calamity-fund?budget_plan_id=X&source=sh|occ|pm|general-fund
 * GET /api/calamity-fund?budget_plan_id=X&source=occ&debug=1
 *
 * Base = Total Non-Tax Revenue proposed amount for special accounts (sh/occ/pm).
 * For general-fund the base is Tax Revenue (id=4 in the general-fund seeder).
 *
 * Special account seeder names:
 *   Non-Tax Revenue parent → "2. Non-Tax Revenue"   (level 3, under "A. Local Source")
 *
 *   calamity_fund  = base × 0.05
 *   pre_disaster   = calamity_fund × 0.70
 *   quick_response = calamity_fund × 0.30
 */
class CalamityFundController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'source'         => 'required|string|in:sh,occ,pm,general-fund',
        ]);

        $budgetPlan = BudgetPlan::findOrFail($request->budget_plan_id);
        $source     = $request->source;

        // ── Choose base node depending on source ──────────────────────────────
        // Special accounts (sh/occ/pm) → Non-Tax Revenue  ("2. Non-Tax Revenue")
        // General-fund                 → Tax Revenue       ("Tax Revenue")
        $baseParent = $this->findBaseParent($source);

        if (! $baseParent) {
            return response()->json([
                'data'    => $this->emptyResult(),
                'message' => "Base income node not found for source='{$source}'. Add ?debug=1 for details.",
            ]);
        }

        // ── Collect all descendant IDs scoped to this source ──────────────────
        $descendantIds = $this->getDescendantIdsBySource($baseParent->id, $source);

        if (empty($descendantIds)) {
            // Parent is itself a leaf — sum it directly
            $descendantIds = [$baseParent->id];
        }

        // ── Sum proposed amounts ──────────────────────────────────────────────
        $total = (float) IncomeFundAmount::where('budget_plan_id', $request->budget_plan_id)
            ->where('source', $source)
            ->whereIn('income_fund_object_id', $descendantIds)
            ->sum('proposed_amount');

        // ── Debug mode ────────────────────────────────────────────────────────
        if ($request->boolean('debug')) {
            return $this->debugResponse($request, $baseParent, $descendantIds, $total, $source);
        }

        if ($total <= 0) {
            return response()->json(['data' => $this->emptyResult()]);
        }

        $calamityFund  = $total * 0.05;
        $preDisaster   = $calamityFund * 0.70;
        $quickResponse = $calamityFund * 0.30;

        return response()->json([
            'data' => [
                'budget_plan_id'             => $budgetPlan->budget_plan_id,
                'year'                       => $budgetPlan->year,
                'source'                     => $source,
                'total_tax_revenue_proposed' => $total,   // kept for frontend compat
                'calamity_fund'              => $calamityFund,
                'pre_disaster'               => $preDisaster,
                'quick_response'             => $quickResponse,
            ],
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Find the correct base parent node for the given source.
     *
     * special accounts → "2. Non-Tax Revenue"  (level 3)
     * general-fund     → "Tax Revenue"          (level 3)
     */
    private function findBaseParent(string $source): ?IncomeFundObject
    {
        $isSpecial = in_array($source, ['sh', 'occ', 'pm']);

        if ($isSpecial) {
            // Primary match — exact name used in SpecialAccountsObjectSeeder
            $node = IncomeFundObject::where('source', $source)
                ->whereIn('name', ['2. Non-Tax Revenue', 'Non-Tax Revenue', 'B. Non-Tax Revenue'])
                ->orderBy('level')
                ->first();

            // Broader fallback
            if (! $node) {
                $node = IncomeFundObject::where('source', $source)
                    ->where('name', 'like', '%Non-Tax Revenue%')
                    ->orderBy('level')
                    ->first();
            }

            return $node;
        }

        // general-fund → Tax Revenue (id=4 in the general-fund seeder)
        $node = IncomeFundObject::where('source', $source)
            ->whereIn('name', ['Tax Revenue', '1. Tax Revenue', 'A. Tax Revenue'])
            ->orderBy('level')
            ->first();

        if (! $node) {
            $node = IncomeFundObject::where('source', $source)
                ->where('name', 'like', '%Tax Revenue%')
                ->where('name', 'not like', '%Non-Tax%')
                ->where('name', 'not like', '%Non Tax%')
                ->orderBy('level')
                ->first();
        }

        return $node;
    }

    /**
     * Recursively collect all descendant IDs under $parentId,
     * scoped to $source to prevent cross-source contamination.
     * Returns only child/leaf IDs — NOT the parent itself.
     */
    private function getDescendantIdsBySource(int $parentId, string $source): array
    {
        $ids   = [];
        $queue = [$parentId];

        while (! empty($queue)) {
            $currentId = array_shift($queue);

            $children = IncomeFundObject::where('parent_id', $currentId)
                ->where('source', $source)
                ->pluck('id')
                ->toArray();

            foreach ($children as $childId) {
                $ids[]   = $childId;
                $queue[] = $childId;
            }
        }

        return $ids;
    }

    private function emptyResult(): array
    {
        return [
            'budget_plan_id'             => null,
            'year'                       => null,
            'source'                     => null,
            'total_tax_revenue_proposed' => null,
            'calamity_fund'              => null,
            'pre_disaster'               => null,
            'quick_response'             => null,
        ];
    }

    // ─────────────────────────────────────────────────────────────────────────

    private function debugResponse(
        Request $request,
        ?IncomeFundObject $baseParent,
        array $descendantIds,
        float $sum,
        string $source
    ): JsonResponse {
        $amountRows = IncomeFundAmount::where('budget_plan_id', $request->budget_plan_id)
            ->where('source', $source)
            ->get(['income_fund_object_id', 'proposed_amount'])
            ->toArray();

        $objectRows = IncomeFundObject::whereIn('id', array_unique(array_merge(
                $baseParent ? [$baseParent->id] : [],
                $descendantIds
            )))
            ->orderBy('level')->orderBy('id')
            ->get(['id', 'parent_id', 'source', 'name', 'level'])
            ->toArray();

        $matchingIds = array_values(array_filter($amountRows, fn ($r) =>
            in_array($r['income_fund_object_id'], $descendantIds)
        ));

        if (! $baseParent) {
            $diagnosis = "Base income node not found for source='{$source}'.";
        } elseif (empty($amountRows)) {
            $diagnosis = "No income_fund_amounts rows exist for this plan+source. Fill in the income fund page first.";
        } elseif (empty($matchingIds)) {
            $diagnosis = "Amounts exist but none match descendant IDs: [" . implode(', ', $descendantIds) . "].";
        } elseif ($sum <= 0) {
            $diagnosis = "Matching rows found but all proposed_amount values are 0 or null. Enter amounts in the income fund.";
        } else {
            $diagnosis = "OK — sum = {$sum}.";
        }

        $baseLabel = in_array($source, ['sh', 'occ', 'pm']) ? 'Non-Tax Revenue' : 'Tax Revenue';

        return response()->json([
            'debug' => [
                'budget_plan_id'         => $request->budget_plan_id,
                'source'                 => $source,
                'base_node_used'         => $baseLabel,
                'base_parent'            => $baseParent?->only(['id', 'parent_id', 'source', 'name', 'level']),
                'descendant_ids'         => $descendantIds,
                'object_rows_in_subtree' => $objectRows,
                'amount_rows_for_source' => $amountRows,
                'matching_amount_rows'   => $matchingIds,
                'computed_sum'           => $sum,
                'diagnosis'              => $diagnosis,
            ],
        ]);
    }
}