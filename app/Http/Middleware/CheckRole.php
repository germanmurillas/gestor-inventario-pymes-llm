<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckRole
{
    /**
     * Maneja una solicitud entrante y verifica si el usuario tiene el rol requerido.
     *
     * @param  \Illuminate\Http\Request  $request
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     * @param  string  $role
     * @return \Symfony\Component\HttpFoundation\Response
     */
    public function handle(Request $request, Closure $next, string $role): Response
    {
        if (!$request->user() || $request->user()->role !== $role) {
            // Si el usuario no tiene el rol, abortamos con un 403 (Acceso Denegado)
            abort(403, 'No tienes permisos de ' . strtoupper($role) . ' para realizar esta acción.');
        }

        return $next($request);
    }
}
