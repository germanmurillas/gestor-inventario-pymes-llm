<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->report(function (\Throwable $e) {
            $logFile = base_path('docs/ERROR_LOG.md');
            $timestamp = now()->format('Y-m-d H:i:s');
            $cleanMessage = str_replace(["\r", "\n", "|"], [" ", " ", "/"], $e->getMessage());
            $errorClass = get_class($e);
            $line = "| {$timestamp} | Exception | {$cleanMessage} | {$errorClass} | Investigando... |\n";
            file_put_contents($logFile, $line, FILE_APPEND);
        });
    })->create();
