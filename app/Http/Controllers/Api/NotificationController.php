<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Notifications\DatabaseNotification;

class NotificationController extends BaseApiController
{
    // GET /notifications — latest 10 unread
    public function index(): JsonResponse
    {
        $user = Auth::user();
        $notifications = $user->unreadNotifications()
            ->latest()
            ->take(10)
            ->get()
            ->map(fn ($n) => [
                'id'                  => $n->id,
                'type'                => $n->data['type']               ?? null,
                'message'             => $n->data['message']            ?? null,
                'dept_id'             => $n->data['dept_id']            ?? null,
                'dept_name'           => $n->data['dept_name']          ?? null,
                'dept_abbreviation'   => $n->data['dept_abbreviation']  ?? null,
                'dept_budget_plan_id' => $n->data['dept_budget_plan_id'] ?? null,
                'budget_year'         => $n->data['budget_year']        ?? null,
                'created_at'          => $n->created_at,
            ]);

        return $this->success([
            'notifications' => $notifications,
            'unread_count'  => $user->unreadNotifications()->count(),
        ]);
    }

    // POST /notifications/{id}/read
    public function markRead(string $id): JsonResponse
    {
        $notification = Auth::user()->notifications()->findOrFail($id);
        $notification->markAsRead();
        return $this->success(['message' => 'Marked as read.']);
    }

    // POST /notifications/read-all
    public function markAllRead(): JsonResponse
    {
        Auth::user()->unreadNotifications->markAsRead();
        return $this->success(['message' => 'All marked as read.']);
    }

    // DELETE /notifications/clear-read — admin only, clears all read notifications across all users
    public function clearRead(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!in_array($user->role, ['admin', 'super-admin'])) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        DatabaseNotification::whereNotNull('read_at')->delete();

        return response()->json(['message' => 'Read notifications cleared.']);
    }
}
