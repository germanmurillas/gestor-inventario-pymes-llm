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
    ->withCommands([
        __DIR__.'/../app/Console/Commands',
    ])
    ->withMiddleware(function (Middleware $middleware): void {
        // La app escucha solo en 127.0.0.1 detrás del túnel de Cloudflare/nginx:
        // confiar en X-Forwarded-Proto para generar URLs y redirecciones https.
        $middleware->trustProxies(at: '*');
        $middleware->web(append: [
            \App\Http\Middleware\HandleInertiaRequests::class,
            \Illuminate\Http\Middleware\AddLinkHeadersForPreloadedAssets::class,
        ]);

        $middleware->alias([
            'role' => \App\Http\Middleware\CheckRole::class,
        ]);

        $middleware->validateCsrfTokens(except: [
            'api/chat/relay',
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        // Las llamadas de la interfaz que no son navegación de Inertia (fetch, axios) reciben los
        // errores en JSON, nunca una página HTML que el navegador no puede leer como datos.
        $exceptions->shouldRenderJsonWhen(fn (\Illuminate\Http\Request $request) => $request->is('api/*')
            || $request->expectsJson()
            || ($request->ajax() && ! $request->header('X-Inertia')));

        // Sesión o formulario vencido (419) en una navegación de Inertia: volver a la página con un
        // aviso en vez de mostrar la pantalla de error.
        $exceptions->respond(function ($response, \Throwable $e, \Illuminate\Http\Request $request) {
            if ($response->getStatusCode() === 419 && $request->header('X-Inertia')) {
                return back()->with('error', 'Su sesión expiró y no se guardó el último cambio. Vuelva a intentarlo; si le pide ingresar, hágalo de nuevo.');
            }
            return $response;
        });

        $exceptions->report(function (\Throwable $e) {
            $logFile = base_path('docs/ERROR_LOG.md');
            $timestamp = now()->format('Y-m-d H:i:s');
            $cleanMessage = str_replace(["\r", "\n", "|"], [" ", " ", "/"], $e->getMessage());
            $errorClass = get_class($e);
            $line = "| {$timestamp} | Exception | {$cleanMessage} | {$errorClass} | Investigando... |\n";
            file_put_contents($logFile, $line, FILE_APPEND);
        });
    })->create();
