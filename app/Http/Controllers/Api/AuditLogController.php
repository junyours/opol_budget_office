<?php

namespace App\Http\Controllers\Api;

use App\Models\AuditLog;
use App\Models\BudgetPlan;
use App\Models\User;
use App\Services\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class AuditLogController extends BaseApiController
{
    private const ACTIONS = [
        'login', 'logout', 'create', 'add', 'update', 'delete',
        'submitted', 'acknowledged', 'approved', 'returned_to_draft', 'status_change',
        'activated', 'deactivated', 'opened', 'closed',
        'bulk_update', 'logs_cleared',
    ];

    /**
     * GET /audit-logs
     * ?budget_plan_year=2027|all  &user_id=  &action=  &search=  &page=  &per_page=
     */
    public function index(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'budget_plan_year' => 'nullable',
            'user_id'          => 'nullable|integer',
            'action'           => 'nullable|string|max:30',
            'search'           => 'nullable|string|max:100',
            'before_id'        => 'nullable|integer|min:1',
            'per_page'         => 'nullable|integer|min:10|max:100',
        ]);

        $query = AuditLog::query()->visibleTo($request->user());

        $year = $validated['budget_plan_year'] ?? 'all';
        if ($year !== 'all' && $year !== '' && is_numeric($year)) {
            $query->where('budget_plan_year', (int) $year);
        }

        if (!empty($validated['user_id'])) {
            $query->where('user_id', $validated['user_id']);
        }

        if (!empty($validated['action']) && $validated['action'] !== 'all') {
            $query->where('action', $validated['action']);
        }

        if (!empty($validated['search'])) {
            $term = '%' . addcslashes($validated['search'], '%_\\') . '%';
            $query->where(function ($q) use ($term) {
                $q->where('description', 'like', $term)
                  ->orWhere('subject_label', 'like', $term)
                  ->orWhere('username', 'like', $term)
                  ->orWhere('ip_address', 'like', $term);
            });
        }

        // Keyset ("infinite scroll") pagination: the client sends the id of the last row it has
        // (before_id) and gets the next older rows. id order == chronological order, the PK index
        // makes this cheap, there is no COUNT(*), and rows logged meanwhile never shift pages.
        $perPage = (int) ($validated['per_page'] ?? 20);

        if (!empty($validated['before_id'])) {
            $query->where('id', '<', (int) $validated['before_id']);
        }

        // Fetch one extra row to learn whether an older page exists.
        $rows    = $query->orderByDesc('id')->limit($perPage + 1)->get();
        $hasMore = $rows->count() > $perPage;
        $rows    = $rows->take($perPage)->values();

        // Avatars of the users on THIS page only: one tiny primary-key lookup.
        $userIds = $rows->pluck('user_id')->filter()->unique()->values()->all();
        $avatars = $userIds ? User::whereIn('user_id', $userIds)->pluck('avatar', 'user_id') : collect();

        $rows->each(function (AuditLog $r) use ($avatars) {
            $r->setAttribute('user_avatar', $r->user_id ? ($avatars[$r->user_id] ?? null) : null);
        });

        return response()->json([
            'success' => true,
            'data'    => $rows,
            'meta'    => [
                'per_page'    => $perPage,
                'has_more'    => $hasMore,
                'next_cursor' => $hasMore ? $rows->last()->id : null,
            ],
        ]);
    }

    /**
     * GET /audit-logs/filters
     * One small call that feeds both dropdowns + the default year.
     */
    public function filters(Request $request): JsonResponse
    {
        $base = AuditLog::query()->visibleTo($request->user());

        $years = (clone $base)->select('budget_plan_year')->distinct()
            ->orderByDesc('budget_plan_year')->pluck('budget_plan_year');

        $users = (clone $base)->whereNotNull('user_id')
            ->select('user_id', 'username', 'user_name', 'user_role')
            ->groupBy('user_id', 'username', 'user_name', 'user_role')
            ->orderBy('username')->get();

        return $this->success([
            'years'       => $years,
            'users'       => $users,
            'actions'     => self::ACTIONS,
            'active_year' => BudgetPlan::where('is_active', true)->orderByDesc('year')->value('year'),
            'can_clear'   => $request->user()->can('clear-audit-logs'),
        ]);
    }

    /**
     * DELETE /audit-logs   (super-admin only — enforced by the route gate)
     * body: { scope: "all" } | { scope: "year", year: 2027 }
     */
    public function clear(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'scope' => 'required|in:all,year',
            'year'  => 'required_if:scope,year|nullable|integer',
        ]);

        if ($validated['scope'] === 'all') {
            $deleted = AuditLog::count();
            AuditLog::truncate();
            $what = 'all budget plan years';
        } else {
            $deleted = AuditLog::where('budget_plan_year', $validated['year'])->delete();
            $what = 'budget plan year ' . $validated['year'];
        }

        // Leave a trace of the wipe itself (only recorded if a plan is active).
        app(AuditLogger::class)->record(
            'logs_cleared',
            "Cleared {$deleted} audit log entr" . ($deleted === 1 ? 'y' : 'ies') . " for {$what}",
            'Audit Log',
            $what
        );

        return $this->success(['deleted' => $deleted]);
    }
}
