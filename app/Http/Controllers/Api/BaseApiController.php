<?php

namespace App\Http\Controllers\Api;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

use App\Http\Controllers\Controller;

class BaseApiController extends Controller
{
    use AuthorizesRequests;
    
    protected function success($data = null, $status = 200)
    {
        return response()->json([
            'success' => true,
            'data' => $data
        ], $status);
    }

    protected function error($message, $status = 400)
    {
        return response()->json([
            'success' => false,
            'message' => $message
        ], $status);
    }
}
