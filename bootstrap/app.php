<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'role' => \App\Http\Middleware\RoleMiddleware::class,
            'must-change-password' => \App\Http\Middleware\EnsurePasswordChanged::class,
            'maintenance-check' => \App\Http\Middleware\CheckMaintenanceMode::class, 
            ]);
            // Activity log: logs logout + flushes audit entries AFTER the response is sent.
        $middleware->appendToGroup('api', \App\Http\Middleware\AuditRequest::class);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        //
    })->create();
