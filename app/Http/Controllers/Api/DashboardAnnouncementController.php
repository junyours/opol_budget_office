<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\DashboardAnnouncement;
use Illuminate\Http\Request;

class DashboardAnnouncementController extends Controller
{
    public function index(Request $request)
    {
        $query = DashboardAnnouncement::with('department')->orderBy('sort_order');

        if ($request->boolean('active_only')) {
            $query->where('is_active', true);
        }

        return response()->json(['data' => $query->get()]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'type'         => 'required|in:announcement,phase,schedule,department',
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'dept_id'      => 'nullable|exists:departments,dept_id',
            'accent_color' => 'nullable|string|max:20',
            'icon'         => 'nullable|string|max:40',
            'event_date'   => 'nullable|date',
            'is_active'    => 'boolean',
        ]);

        $data['sort_order'] = (int) DashboardAnnouncement::max('sort_order') + 1;
        $item = DashboardAnnouncement::create($data);

        return response()->json(['data' => $item->load('department')], 201);
    }

    public function update(Request $request, DashboardAnnouncement $dashboardAnnouncement)
    {
        $data = $request->validate([
            'type'         => 'sometimes|in:announcement,phase,schedule,department',
            'title'        => 'sometimes|string|max:255',
            'description'  => 'nullable|string',
            'dept_id'      => 'nullable|exists:departments,dept_id',
            'accent_color' => 'nullable|string|max:20',
            'icon'         => 'nullable|string|max:40',
            'event_date'   => 'nullable|date',
            'is_active'    => 'boolean',
        ]);

        $dashboardAnnouncement->update($data);

        return response()->json(['data' => $dashboardAnnouncement->load('department')]);
    }

    public function destroy(DashboardAnnouncement $dashboardAnnouncement)
    {
        $dashboardAnnouncement->delete();

        return response()->json(['message' => 'Deleted']);
    }

    public function reorder(Request $request)
    {
        $ids = $request->validate(['ids' => 'required|array'])['ids'];

        foreach ($ids as $i => $id) {
            DashboardAnnouncement::where('id', $id)->update(['sort_order' => $i]);
        }

        return response()->json(['message' => 'Reordered']);
    }
}
