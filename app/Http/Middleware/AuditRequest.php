<?php

namespace App\Http\Middleware;

use App\Services\AuditLogger;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

/**
 * Alias: 'audit'
 *
 *  - handle():    records LOGOUT (the token is deleted inside the controller, so we must grab the user first).
 *  - terminate(): runs AFTER the response has been sent to the browser, so audit writing adds
 *                 zero latency to the user's click. Successful write requests are flushed in one INSERT;
 *                 failed / read-only requests discard whatever was buffered.
 */
class AuditRequest
{
    public function handle(Request $request, Closure $next): Response
    {
        // This middleware runs before auth:sanctum, so resolve the bearer token explicitly.
        if ($request->isMethod('POST') && $request->is('api/auth/logout')) {
            $user = $request->user('sanctum');
            if ($user) {
                app(AuditLogger::class)->recordAuth('logout', $user);
            }
        }

        return $next($request);
    }

    public function terminate(Request $request, Response $response): void
    {
        $logger = app(AuditLogger::class);

        try {
            if (!$request->isMethodSafe() && $response->getStatusCode() < 400 && $request->user()) {
                $logger->finalize($request);
            } else {
                $logger->discard();
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }
}
