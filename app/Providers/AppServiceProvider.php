<?php

// namespace App\Providers;

// use Illuminate\Support\ServiceProvider;
// use Illuminate\Support\Facades\URL;
// class AppServiceProvider extends ServiceProvider
// {
//     /**
//      * Register any application services.
//      */
//     public function register(): void
//     {
//         //
//     }

//     /**
//      * Bootstrap any application services.
//      */
//     public function boot()
//     {
//         // uncomment for test tunnel
//         // if (app()->environment('local')) {
//         //     URL::forceScheme('https');
//         // }
//     }
// }

namespace App\Providers;

use Illuminate\Support\ServiceProvider;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Facades\URL;
use Illuminate\Http\Request;
use Illuminate\Cache\RateLimiting\Limit;

class AppServiceProvider extends ServiceProvider
{

    protected const LOGIN_RATE_LIMIT = 5;      // attempts
    protected const LOGIN_RATE_WINDOW = 1;      // minutes

    public function register(): void {}

    public function boot(): void
    {
        $this->configureRateLimiting();
    }

    protected function configureRateLimiting(): void
    {
        // ── 1. Login endpoint — very strict ────────────────────────────────────
        // 10 attempts per minute per IP address
        // Protects against brute-force credential stuffing
        RateLimiter::for('login', function (Request $request) {
            return Limit::perMinutes(self::LOGIN_RATE_WINDOW, self::LOGIN_RATE_LIMIT)
                ->by($request->ip())
                ->response(function (Request $request, array $headers) {
                    return response()->json([
                        'message' => 'Too many login attempts. Please wait a moment.',
                        'retry_after' => $headers['Retry-After'], // ← send it in body too
                    ], 429, $headers); // ← pass headers through (includes Retry-After)
                });
        });

        // ── 2. Authenticated API — per user ────────────────────────────────────
        // 200 requests per minute per authenticated user ID
        // Falls back to IP if somehow unauthenticated hits this group
        RateLimiter::for('api', function (Request $request) {
            return $request->user()
                ? Limit::perMinute(200)->by($request->user()->id)
                : Limit::perMinute(30)->by($request->ip());
        });

        // ── 3. Report generation — expensive endpoints ─────────────────────────
        // PDF/ZIP generation is CPU-heavy; limit to 10 per minute per user
        RateLimiter::for('reports', function (Request $request) {
            return Limit::perMinute(10)
                ->by(optional($request->user())->id ?: $request->ip());
        });

        // ── 4. File uploads — bandwidth protection ─────────────────────────────
        // Avatar uploads, obligation file uploads: 5 per minute per user
        RateLimiter::for('uploads', function (Request $request) {
            return Limit::perMinute(5)
                ->by(optional($request->user())->id ?: $request->ip());
        });

        // ── 5. Bulk write operations — DB protection ───────────────────────────
        // Bulk store/update endpoints can hammer the DB; 20 per minute per user
        RateLimiter::for('bulk', function (Request $request) {
            return Limit::perMinute(20)
                ->by(optional($request->user())->id ?: $request->ip());
        });
    }



}
