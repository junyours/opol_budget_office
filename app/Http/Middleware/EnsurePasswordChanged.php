<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsurePasswordChanged
{
    /**
     * Routes a user with must_change_pass = true is still allowed to hit.
     * Everything else returns 423 Locked until they change their password.
     */
    protected array $allowed = [
        'api/auth/logout',
        'api/auth/change-forced-password',
        'api/profile',
    ];

    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user && $user->must_change_pass && !$request->is(...$this->allowed)) {
            abort(423, 'You must change your password before continuing.');
        }

        return $next($request);
    }
}
