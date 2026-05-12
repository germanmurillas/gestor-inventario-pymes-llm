<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class AgentMonitorController extends Controller
{
    /**
     * GET /api/agents/status
     * Devuelve el estado de todos los agentes y servidores
     * para el Laboratorio 3D y el dashboard de Pymetory.
     */
    public function status()
    {
        $result = [
            'timestamp' => now()->timestamp,
            'servers' => [],
            'agents' => [],
        ];

        // 1. Obtener estado de MiniModelGarden
        try {
            $benchmark = Http::timeout(5)
                ->get('http://SERVIDOR/api/models/benchmark')
                ->json();

            if ($benchmark) {
                $result['servers']['minimodelgarden'] = [
                    'ip' => 'SERVIDOR',
                    'status' => 'online',
                    'ram_total_mb' => $benchmark['system']['ram_total_mb'] ?? 956,
                    'ram_available_mb' => $benchmark['system']['ram_available_mb'] ?? 0,
                    'cpu_pct' => $benchmark['system']['cpu_pct'] ?? 0,
                    'disk_total_gb' => $benchmark['system']['disk_total_gb'] ?? 49,
                    'disk_used_gb' => $benchmark['system']['disk_used_gb'] ?? 0,
                    'active_model' => $benchmark['system']['active_model'] ?? null,
                    'models_installed' => collect($benchmark['models'] ?? [])
                        ->where('installed', true)
                        ->pluck('name')
                        ->toArray(),
                ];
            }
        } catch (\Exception $e) {
            $result['servers']['minimodelgarden'] = [
                'ip' => 'SERVIDOR',
                'status' => 'offline',
                'error' => $e->getMessage(),
            ];
        }

        // 2. Obtener heartbeats de agentes
        try {
            $heartbeats = Http::timeout(5)
                ->get('http://SERVIDOR/api/models/heartbeats')
                ->json();

            if ($heartbeats && isset($heartbeats['heartbeats'])) {
                foreach ($heartbeats['heartbeats'] as $hb) {
                    $result['agents'][] = [
                        'id' => $hb['agent'] ?? 'unknown',
                        'status' => $hb['status'] ?? 'unknown',
                        'task' => $hb['task'] ?? '',
                        'server' => $hb['server'] ?? 'MiniModelGarden',
                        'heartbeat_age_sec' => $hb['age_sec'] ?? 0,
                        'need_help' => $hb['need_help'] ?? null,
                        'timestamp' => $hb['timestamp'] ?? 0,
                        'check_in_time' => $hb['check_in_time'] ?? null,
                        'check_out_time' => $hb['check_out_time'] ?? null,
                        'summary' => $hb['summary'] ?? null,
                        'llm_model' => $hb['llm_model'] ?? null,
                    ];
                }
            }
        } catch (\Exception $e) {
            Log::warning('AgentMonitor: Could not fetch heartbeats: ' . $e->getMessage());
        }

        // 3. Estado de Pymetory (auto)
        $result['servers']['pymetory'] = [
            'ip' => 'SERVIDOR',
            'status' => 'online',
            'uptime_h' => $this->getUptimeHours(),
            'app_version' => config('app.version', '1.0.0'),
        ];

        return response()->json($result);
    }

    /**
     * POST /api/chat/relay
     * Reenvía mensajes del chat del Laboratorio al bot de Telegram.
     */
    public function relayToTelegram(Request $request)
    {
        $text = $request->input('text', '');
        $priority = $request->input('priority', 'low');

        if (empty($text)) {
            return response()->json(['error' => 'empty text'], 400);
        }

        // Solo reenviar mensajes de alta prioridad
        if (!in_array($priority, ['high', 'critical'])) {
            return response()->json(['relayed' => false, 'reason' => 'low priority filtered']);
        }

        try {
            $token = env('TELEGRAM_BOT_TOKEN', '');
            $chatId = env('TELEGRAM_CHAT_ID', '');

            $response = Http::timeout(10)
                ->post("https://api.telegram.org/bot{$token}/sendMessage", [
                    'chat_id' => $chatId,
                    'text' => $text,
                    'parse_mode' => 'HTML',
                ]);

            return response()->json([
                'relayed' => $response->successful(),
                'telegram_response' => $response->json(),
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'relayed' => false,
                'error' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Calcula el uptime del servidor en horas.
     */
    private function getUptimeHours(): float
    {
        $uptime = shell_exec('cat /proc/uptime');
        if ($uptime) {
            $parts = explode(' ', trim($uptime));
            return round((float)($parts[0] ?? 0) / 3600, 1);
        }
        return 0;
    }
}
