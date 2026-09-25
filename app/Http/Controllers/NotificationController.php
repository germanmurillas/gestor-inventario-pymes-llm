<?php

namespace App\Http\Controllers;

use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Bandeja de alertas del usuario: lo que generan los comandos alerts:fefo y alerts:low-stock. */
class NotificationController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $notificaciones = Notification::forUser($request->user()->id)
            ->latest()->limit(100)
            ->get(['id', 'tipo', 'titulo', 'mensaje', 'accion_url', 'icono', 'leida', 'created_at']);

        return response()->json([
            'notificaciones' => $notificaciones,
            'sin_leer' => Notification::forUser($request->user()->id)->unread()->count(),
        ]);
    }

    public function marcarLeida(Request $request, Notification $notification): JsonResponse
    {
        abort_unless($notification->user_id === null || $notification->user_id === $request->user()->id, 403);
        $notification->update(['leida' => true, 'leida_at' => now()]);

        return response()->json(['ok' => true]);
    }

    public function marcarTodas(Request $request): JsonResponse
    {
        $n = Notification::forUser($request->user()->id)->unread()->update(['leida' => true, 'leida_at' => now()]);

        return response()->json(['ok' => true, 'marcadas' => $n]);
    }
}
