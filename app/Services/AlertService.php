<?php
namespace App\Services;

use App\Models\Notification;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

class AlertService
{
    /**
     * Send alert through all configured channels.
     */
    public function send(string $tipo, string $titulo, string $mensaje, ?string $accionUrl = null, ?string $icono = null): void
    {
        // Los comandos corren cada hora: no se repite un aviso que sigue sin leer en las últimas 24 h.
        if (self::yaNotificada($titulo)) {
            return;
        }

        $this->sendInApp($tipo, $titulo, $mensaje, $accionUrl, $icono);

        if (self::isActive('notif_telegram_activo')) {
            $this->sendTelegram($tipo, $titulo, $mensaje);
        }

        if (self::isActive('notif_email_activo')) {
            $this->sendEmail($tipo, $titulo, $mensaje);
        }
    }

    public static function yaNotificada(string $titulo): bool
    {
        return Notification::where('titulo', $titulo)->unread()
            ->where('created_at', '>=', now()->subDay())->exists();
    }

    /**
     * Store notification in the `notifications` table for all admin users.
     */
    public function sendInApp(string $tipo, string $titulo, string $mensaje, ?string $accionUrl = null, ?string $icono = null): void
    {
        $adminIds = User::where('role', 'admin')->pluck('id');

        if ($adminIds->isEmpty()) {
            Notification::create([
                'user_id'    => null,
                'tipo'       => $tipo,
                'titulo'     => $titulo,
                'mensaje'    => $mensaje,
                'accion_url' => $accionUrl,
                'icono'      => $icono,
            ]);
            return;
        }

        foreach ($adminIds as $adminId) {
            Notification::create([
                'user_id'    => $adminId,
                'tipo'       => $tipo,
                'titulo'     => $titulo,
                'mensaje'    => $mensaje,
                'accion_url' => $accionUrl,
                'icono'      => $icono,
            ]);
        }
    }

    /**
     * Send a Telegram message to the configured chat.
     */
    public function sendTelegram(string $tipo, string $titulo, string $mensaje): void
    {
        $token  = (string) config('services.telegram.token', '');
        $chatId = (string) config('services.telegram.chat_id', '');

        if (empty($token) || empty($chatId)) {
            return;
        }

        $emoji = match ($tipo) {
            'critico' => '🔴',
            'warning' => '🟠',
            'info'    => '🔵',
            'exito'   => '🟢',
            default   => '⚪',
        };

        $text = "{$emoji} <b>{$titulo}</b>\n\n{$mensaje}";

        Http::timeout(10)
            ->post("https://api.telegram.org/bot{$token}/sendMessage", [
                'chat_id'    => $chatId,
                'text'       => $text,
                'parse_mode' => 'HTML',
            ]);
    }

    /**
     * Send email to admin if mail is configured.
     */
    public function sendEmail(string $tipo, string $titulo, string $mensaje): void
    {
        $email = DB::table('settings')
            ->where('clave', 'notif_email_admin')
            ->value('valor');

        if (empty($email)) {
            return;
        }

        try {
            Mail::raw("{$titulo}\n\n{$mensaje}", function ($message) use ($email, $titulo) {
                $message->to($email)
                    ->subject("[Pymetory] {$titulo}");
            });
        } catch (\Exception $e) {
            // mail driver may not be configured (log driver in dev)
        }
    }

    /**
     * Check if a specific alert type is active in settings.
     */
    public static function isActive(string $clave): bool
    {
        $valor = DB::table('settings')
            ->where('clave', $clave)
            ->value('valor');

        return $valor === 'true' || $valor === '1';
    }

    /**
     * Get configured FEFO critical days threshold.
     */
    public static function fefoThresholdDays(): int
    {
        $valor = DB::table('settings')
            ->where('clave', 'fefo_dias_criticos')
            ->value('valor');

        return (int) ($valor ?: 15);
    }
}
