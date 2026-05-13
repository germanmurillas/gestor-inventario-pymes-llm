<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;
use Illuminate\Support\Facades\Cache;

class AgentBusController extends Controller
{
    public function events()
    {
        // Cache por 2 segundos para evitar SSH en cada poll
        $cached = Cache::get('agent_bus_events');
        if ($cached) {
            return response()->json($cached);
        }

        $result = Process::timeout(8)->run([
            '/usr/local/bin/pymetory-bus-www', 'query', '--limit', '50'
        ]);

        $events = $result->successful() ? (json_decode($result->output(), true) ?: []) : [];
        
        $agents = [];
        foreach ($events as $e) {
            $src = $e['source'] ?? 'unknown';
            if (!isset($agents[$src])) {
                $agents[$src] = [
                    'name' => $src,
                    'hostname' => $e['hostname'] ?? '',
                    'status' => $this->mapStatus($e['event'] ?? ''),
                    'icon' => $this->mapIcon($e['event'] ?? ''),
                    'last_event' => $e['event'] ?? '',
                    'last_summary' => $e['summary'] ?? '',
                    'last_ts' => $e['ts'] ?? '',
                    'target' => $e['target'] ?? null,
                    'event_id' => $e['id'] ?? '',
                ];
            }
        }

        $data = [
            'agents' => $agents,
            'events' => $events,
            'count' => count($events),
        ];

        Cache::put('agent_bus_events', $data, 2);

        return response()->json($data);
    }

    private function mapStatus(string $event): string
    {
        return match(true) {
            str_contains($event, 'completed') => 'activo',
            str_contains($event, 'dispatched') => 'leyendo',
            str_contains($event, 'failed') => 'crash',
            str_contains($event, 'handoff.created') => 'gestando',
            str_contains($event, 'audit.requested') => 'consultando',
            str_contains($event, 'audit.completed') => 'escribiendo',
            str_contains($event, 'build-plan') => 'buscando',
            default => 'activo',
        };
    }

    private function mapIcon(string $event): string
    {
        return match(true) {
            str_contains($event, 'completed') => '🟢',
            str_contains($event, 'dispatched') => '📖',
            str_contains($event, 'failed') => '❌',
            str_contains($event, 'handoff.created') => '🤰',
            str_contains($event, 'audit.requested') => '🗃️',
            str_contains($event, 'audit.completed') => '✍️',
            str_contains($event, 'build-plan') => '🔍',
            default => '🟢',
        };
    }
}
