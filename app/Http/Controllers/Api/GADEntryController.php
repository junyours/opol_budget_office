<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\GADEntry;
use App\Models\BudgetPlan;
use App\Models\Department;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;

class GADEntryController extends Controller
{
    // ── GET /api/gad-entries?budget_plan_id=X ─────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $request->validate(['budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id']);

        $entries = GADEntry::with('department')
            ->forPlan($request->budget_plan_id)
            ->orderBy('focus_type')
            ->orderBy('sort_order')
            ->orderBy('gad_entry_id')
            ->get()
            ->map(fn ($e) => $this->format($e));

        // Subtotals
        $subtotalA = $entries->where('focus_type', 'client')->sum('mooe');
        $subtotalB = $entries->where('focus_type', 'organization')->sum('mooe');

        return response()->json([
            'data'        => $entries,
            'subtotal_a'  => $subtotalA,
            'subtotal_b'  => $subtotalB,
            'grand_total' => $subtotalA + $subtotalB,
        ]);
    }

    // ── POST /api/gad-entries ─────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $data = $request->validate([
            'budget_plan_id'        => 'required|integer|exists:budget_plans,budget_plan_id',
            'focus_type'            => ['required', Rule::in(['client', 'organization'])],
            'gender_issue'          => 'nullable|string',
            'gad_objective'         => 'nullable|string',
            'relevant_program'      => 'nullable|string',
            'gad_activity'          => 'nullable|string',
            'performance_indicator' => 'nullable|string',
            'mooe'                  => 'nullable|numeric|min:0',
            'department_id'         => 'nullable|integer|exists:departments,dept_id',
            'lead_office_text'      => 'nullable|string|max:255',
            'group_key'             => 'nullable|string|max:64',
            'sort_order'            => 'nullable|integer|min:0',
        ]);

        // Auto-assign sort_order if not given
        if (!isset($data['sort_order'])) {
            $data['sort_order'] = GADEntry::forPlan($data['budget_plan_id'])
                ->where('focus_type', $data['focus_type'])
                ->max('sort_order') + 1;
        }

        $entry = GADEntry::create($data);
        $entry->load('department');

        return response()->json(['data' => $this->format($entry)], 201);
    }

    // ── GET /api/gad-entries/{id} ─────────────────────────────────────────────

    public function show(GADEntry $gadEntry): JsonResponse
    {
        $gadEntry->load('department');
        return response()->json(['data' => $this->format($gadEntry)]);
    }

    // ── PUT /api/gad-entries/{id} ─────────────────────────────────────────────

    public function update(Request $request, GADEntry $gadEntry): JsonResponse
    {
        $data = $request->validate([
            'focus_type'            => ['nullable', Rule::in(['client', 'organization'])],
            'gender_issue'          => 'nullable|string',
            'gad_objective'         => 'nullable|string',
            'relevant_program'      => 'nullable|string',
            'gad_activity'          => 'nullable|string',
            'performance_indicator' => 'nullable|string',
            'mooe'                  => 'nullable|numeric|min:0',
            'department_id'         => 'nullable|integer|exists:departments,dept_id',
            'lead_office_text'      => 'nullable|string|max:255',
            'group_key'             => 'nullable|string|max:64',
            'sort_order'            => 'nullable|integer|min:0',
        ]);

        $gadEntry->update($data);
        $gadEntry->load('department');

        return response()->json(['data' => $this->format($gadEntry)]);
    }

    // ── DELETE /api/gad-entries/{id} ──────────────────────────────────────────

    public function destroy(GADEntry $gadEntry): JsonResponse
    {
        $gadEntry->delete();
        return response()->json(['message' => 'Deleted successfully']);
    }

    // ── POST /api/gad-entries/bulk ────────────────────────────────────────────
    // Accepts array of entries from Excel import, keyed by focus_type.
    // Each item may have an optional gad_entry_id for upsert.

    public function bulk(Request $request): JsonResponse
    {
        $request->validate([
            'budget_plan_id'         => 'required|integer|exists:budget_plans,budget_plan_id',
            'entries'                => 'required|array|min:1',
            'entries.*.focus_type'   => ['required', Rule::in(['client', 'organization'])],
            'entries.*.gender_issue'          => 'nullable|string',
            'entries.*.gad_objective'         => 'nullable|string',
            'entries.*.relevant_program'      => 'nullable|string',
            'entries.*.gad_activity'          => 'nullable|string',
            'entries.*.performance_indicator' => 'nullable|string',
            'entries.*.mooe'                  => 'nullable|numeric|min:0',
            'entries.*.department_id'         => 'nullable|integer|exists:departments,dept_id',
            'entries.*.lead_office_text'      => 'nullable|string|max:255',
            'entries.*.group_key'             => 'nullable|string|max:64',
            'entries.*.sort_order'            => 'nullable|integer|min:0',
        ]);

        $planId = $request->budget_plan_id;

        DB::transaction(function () use ($request, $planId) {
            foreach ($request->entries as $idx => $row) {
                $payload = array_merge($row, [
                    'budget_plan_id' => $planId,
                    'sort_order'     => $row['sort_order'] ?? $idx,
                ]);

                if (!empty($row['gad_entry_id'])) {
                    GADEntry::where('gad_entry_id', $row['gad_entry_id'])
                        ->where('budget_plan_id', $planId)
                        ->update($payload);
                } else {
                    GADEntry::create($payload);
                }
            }
        });

        // Return refreshed data
        return $this->index(new Request(['budget_plan_id' => $planId]));
    }

    // ── POST /api/gad-entries/reorder ────────────────────────────────────────
    // Accepts [{gad_entry_id, sort_order}, ...]

    public function reorder(Request $request): JsonResponse
    {
        $request->validate([
            'items'                  => 'required|array',
            'items.*.gad_entry_id'   => 'required|integer|exists:gad_entries,gad_entry_id',
            'items.*.sort_order'     => 'required|integer|min:0',
        ]);

        DB::transaction(function () use ($request) {
            foreach ($request->items as $item) {
                GADEntry::where('gad_entry_id', $item['gad_entry_id'])
                    ->update(['sort_order' => $item['sort_order']]);
            }
        });

        return response()->json(['message' => 'Reordered successfully']);
    }

    // ── Private formatter ─────────────────────────────────────────────────────

    private function format(GADEntry $e): array
    {
        return [
            'gad_entry_id'          => $e->gad_entry_id,
            'budget_plan_id'        => $e->budget_plan_id,
            'focus_type'            => $e->focus_type,
            'gender_issue'          => $e->gender_issue,
            'gad_objective'         => $e->gad_objective,
            'relevant_program'      => $e->relevant_program,
            'gad_activity'          => $e->gad_activity,
            'performance_indicator' => $e->performance_indicator,
            'mooe'                  => (float) $e->mooe,
            'department_id'         => $e->department_id,
            'lead_office_text'      => $e->lead_office_text,
            'lead_office_display'   => $e->lead_office_display,
            'group_key'             => $e->group_key,
            'sort_order'            => $e->sort_order,
            'department'            => $e->department ? [
                'dept_id'           => $e->department->dept_id,
                'dept_name'         => $e->department->dept_name,
                'dept_abbreviation' => $e->department->dept_abbreviation,
            ] : null,
        ];
    }
}