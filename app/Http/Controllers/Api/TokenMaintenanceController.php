<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\Request;
use Laravel\Sanctum\PersonalAccessToken;

class TokenMaintenanceController extends BaseApiController
{
    public function pruneStale(Request $request)
    {
        if ($request->user()->role !== 'super-admin') {
            return $this->error('Unauthorized.', 403);
        }

        $currentTokenId = $request->user()->currentAccessToken()->id;

        $deleted = PersonalAccessToken::where('id', '!=', $currentTokenId)
            ->where(function ($query) {
                $query->whereNull('expires_at')
                      ->orWhere('expires_at', '<', now());
            })
            ->delete();

        return $this->success(['deleted' => $deleted]);
    }
}
