<?php

namespace App\Http\Controllers\Api;

use App\Models\DepartmentReviewSchedule;
use Illuminate\Http\Request;

class DepartmentReviewScheduleController extends BaseApiController
{
    /**
     * GET /api/department-review-schedules?budget_plan_id=X
     * Admin/super-admin: every department's schedule for the year.
     * Department head: only their own (defensive — frontend never calls
     * this for that role, but the policy/query still scope it).
     */
    public function index(Request $request)
    {
        $this->authorize('viewAny', DepartmentReviewSchedule::class);

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        $user  = $request->user();
        $query = DepartmentReviewSchedule::with('department')
            ->where('budget_plan_id', $validated['budget_plan_id']);

        if ($user->role === 'department-head') {
            $query->where('dept_id', $user->dept_id);
        }

        return $this->success($query->orderBy('review_date')->get());
    }

    /**
     * GET /api/department-review-schedules/my-schedule?budget_plan_id=X
     * Department head: fetch their own schedule (null if none set yet).
     */
    public function myCurrent(Request $request)
    {
        $user = $request->user();

        if ($user->role !== 'department-head' || !$user->dept_id) {
            return $this->error('Not applicable for this account.', 403);
        }

        $validated = $request->validate([
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
        ]);

        $schedule = DepartmentReviewSchedule::where('dept_id', $user->dept_id)
            ->where('budget_plan_id', $validated['budget_plan_id'])
            ->first();

        return $this->success($schedule);
    }

    /**
     * POST /api/department-review-schedules
     * Admin only: set the initial schedule for a department. One per
     * dept per budget plan — use /reschedule to move an existing one.
     */
    public function store(Request $request)
    {
        $this->authorize('create', DepartmentReviewSchedule::class);

        $validated = $request->validate([
            'dept_id'        => 'required|integer|exists:departments,dept_id',
            'budget_plan_id' => 'required|integer|exists:budget_plans,budget_plan_id',
            'review_date'    => 'required|date',
            'period'         => 'required|in:morning,afternoon',
            'review_time'    => 'nullable|date_format:H:i',
            'location'       => 'nullable|string|max:255',
        ]);

        $exists = DepartmentReviewSchedule::where('dept_id', $validated['dept_id'])
            ->where('budget_plan_id', $validated['budget_plan_id'])
            ->exists();

        if ($exists) {
            return $this->error(
                'A review schedule already exists for this department. Use reschedule to move it instead.',
                422
            );
        }

        $schedule = DepartmentReviewSchedule::create([
            ...$validated,
            'status'     => 'scheduled',
            'created_by' => $request->user()->user_id,
        ]);

        $schedule->load('department');
        return $this->success($schedule, 201);
    }

    /**
     * PUT /api/department-review-schedules/{department_review_schedule}
     * Admin only: edit location/status without recording it as a move.
     */
    public function update(Request $request, DepartmentReviewSchedule $department_review_schedule)
    {
        $this->authorize('update', $department_review_schedule);

        $validated = $request->validate([
            'location' => 'sometimes|nullable|string|max:255',
            'status'   => 'sometimes|in:scheduled,moved,completed,cancelled',
        ]);

        $department_review_schedule->update([
            ...$validated,
            'updated_by' => $request->user()->user_id,
        ]);

        return $this->success($department_review_schedule);
    }

    /**
     * PATCH /api/department-review-schedules/{department_review_schedule}/reschedule
     * Admin only: move an existing schedule — e.g. "moved to next day
     * afternoon due to a delay". Keeps the previous date/period/time and
     * the stated reason so the department sees why it moved.
     */
    public function reschedule(Request $request, DepartmentReviewSchedule $department_review_schedule)
    {
        $this->authorize('update', $department_review_schedule);

        $validated = $request->validate([
            'review_date' => 'required|date',
            'period'      => 'required|in:morning,afternoon',
            'review_time' => 'nullable|date_format:H:i',
            'location'    => 'nullable|string|max:255',
            'reason'      => 'nullable|string|max:1000',
        ]);

        $department_review_schedule->update([
            'previous_date'     => $department_review_schedule->review_date,
            'previous_period'   => $department_review_schedule->period,
            'previous_time'     => $department_review_schedule->review_time,
            'review_date'       => $validated['review_date'],
            'period'            => $validated['period'],
            'review_time'       => $validated['review_time'] ?? null,
            'location'          => $validated['location'] ?? $department_review_schedule->location,
            'reschedule_reason' => $validated['reason'] ?? null,
            'status'            => 'moved',
            'rescheduled_at'    => now(),
            'updated_by'        => $request->user()->user_id,
        ]);

        $department_review_schedule->load('department');
        return $this->success($department_review_schedule);
    }

    /**
     * DELETE /api/department-review-schedules/{department_review_schedule}
     */
    public function destroy(DepartmentReviewSchedule $department_review_schedule)
    {
        $this->authorize('delete', $department_review_schedule);
        $department_review_schedule->delete();
        return $this->success(['message' => 'Deleted']);
    }
}
