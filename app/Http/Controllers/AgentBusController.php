<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Process;

class AgentBusController extends Controller
{
    public function events()
    {
        $result = Process::timeout(10)->run([
            'ssh', '-p443', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=5',
            '-i', '/tmp/titan_key', 'ubuntu@SERVIDOR',
            '/usr/local/bin/pymetory-bus', 'query', '--limit', '50'
        ]);

        if ($result->successful()) {
            $events = json_decode($result->output(), true) ?: [];
        } else {
            $events = [];
        }

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

        return response()->json([
            'agents' => $agents,
            'events' => $events,
            'count' => count($events),
        ]);
    }

    private function mapStatus(string $event): string
    {
        return match(true) {
            str_contains($event, 'completed') => 'activo',
            str_contains($event, 'dispatched') => 'leyendo',
            str_contains($event, 'failed') => 'crash',
            str_contains($event, 'handoff.created') => 'gestando',
            str_contains($event, 'handoff.picked-up') => 'leyendo',
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
            str_contains($event, 'handoff.picked-up') => '📖',
            str_contains($event, 'audit.requested') => '🗃️',
            str_contains($event, 'audit.completed') => '✍️',
            str_contains($event, 'build-plan') => '🔍',
            default => '🟢',
        };
    }
}
