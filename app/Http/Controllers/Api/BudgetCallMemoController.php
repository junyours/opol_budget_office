<?php

namespace App\Http\Controllers\Api;

use App\Models\BudgetCallMemo;
use App\Models\BudgetPlan;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class BudgetCallMemoController extends BaseApiController
{
    /**
     * GET /api/budget-call-memos
     * Full list across all years — used by the admin Settings tab.
     */
    public function index()
    {
        $this->authorize('viewAny', BudgetCallMemo::class);

        $files = BudgetCallMemo::orderBy('year', 'desc')
            ->orderBy('sort_order')
            ->get();

        return $this->success($files);
    }

    /**
     * GET /api/budget-call-memos/current
     * Public viewer — returns the file set for the ACTIVE budget plan's year only.
     * If there's no active plan, or no memo uploaded for that plan's year,
     * returns an empty array (no fallback to any other year).
     */
    public function current()
    {
        $this->authorize('viewAny', BudgetCallMemo::class);

        $activePlan = BudgetPlan::where('is_active', true)->first();

        if (!$activePlan) {
            return $this->success([]);
        }

        $files = BudgetCallMemo::where('year', $activePlan->year)
            ->orderBy('sort_order')
            ->get();

        return $this->success($files);
    }

    /**
     * GET /api/budget-call-memos/{budget_call_memo}/download
     * Streams the PDF back so the frontend can render it in an <iframe>.
     */
    public function download(BudgetCallMemo $budget_call_memo)
    {
        $this->authorize('viewAny', BudgetCallMemo::class);

        if (!Storage::disk('public')->exists($budget_call_memo->file_path)) {
            abort(404, 'File not found.');
        }

        return Storage::disk('public')->response(
            $budget_call_memo->file_path,
            $budget_call_memo->original_filename,
            ['Content-Type' => 'application/pdf']
        );
    }

    /**
     * POST /api/budget-call-memos
     * Admin/super-admin upload — one or many PDF files in a single request.
     */
    public function store(Request $request)
    {
        $this->authorize('create', BudgetCallMemo::class);

        $validated = $request->validate([
            'year'    => ['required', 'integer', \Illuminate\Validation\Rule::exists('budget_plans', 'year')],
            'files'   => 'required|array|min:1',
            'files.*' => 'required|file|mimes:pdf|max:20480', // 20MB per file
        ]);

        $user = $request->user();

        $created = DB::transaction(function () use ($request, $validated, $user) {
            $nextOrder = (int) (BudgetCallMemo::max('sort_order') ?? 0) + 1;
            $records = [];

            foreach ($request->file('files') as $file) {
                $path = $file->store('budget-memos', 'public');

                $records[] = BudgetCallMemo::create([
                    'year'              => $validated['year'],
                    'title'             => null,
                    'original_filename' => $file->getClientOriginalName(),
                    'file_path'         => $path,
                    'file_size'         => $file->getSize(),
                    'sort_order'        => $nextOrder++,
                    'uploaded_by'       => $user->user_id,
                ]);
            }

            return $records;
        });

        return $this->success($created, 201);
    }

    /**
     * PUT /api/budget-call-memos/{budget_call_memo}
     * Rename the display title of a file.
     */
    public function update(Request $request, BudgetCallMemo $budget_call_memo)
    {
        $this->authorize('update', $budget_call_memo);

        $validated = $request->validate([
            'title' => 'nullable|string|max:255',
            'year'  => 'sometimes|integer|min:2000|max:2100',
        ]);

        $budget_call_memo->update($validated);

        return $this->success($budget_call_memo);
    }

    /**
     * POST /api/budget-call-memos/reorder
     * Body: { ordered_ids: [budget_memo_id, ...] }
     * Reuses the 'create' ability (same admin-only privilege) since this
     * isn't tied to a single model instance.
     */
    public function reorder(Request $request)
    {
        $this->authorize('create', BudgetCallMemo::class);

        $validated = $request->validate([
            'ordered_ids'   => 'required|array|min:1',
            'ordered_ids.*' => 'integer|exists:budget_call_memos,budget_call_memos_id',
        ]);

        DB::transaction(function () use ($validated) {
            foreach ($validated['ordered_ids'] as $index => $id) {
                BudgetCallMemo::where('budget_call_memos_id', $id)->update(['sort_order' => $index + 1]);
            }
        });

        return $this->success(['message' => 'Reordered.']);
    }

    /**
     * DELETE /api/budget-call-memos/{budget_call_memo}
     */
    public function destroy(BudgetCallMemo $budget_call_memo)
    {
        $this->authorize('delete', $budget_call_memo);

        Storage::disk('public')->delete($budget_call_memo->file_path);
        $budget_call_memo->delete();

        return $this->success(['message' => 'Deleted']);
    }
}
