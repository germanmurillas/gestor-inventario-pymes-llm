<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Process;
use Inertia\Inertia;

class MonitorController extends Controller
{
    public function index()
    {
        return Inertia::render('Monitor/Dashboard');
    }

    public function stats()
    {
        [$idle1, $total1] = $this->cpuSample();
        [$rx1, $tx1]      = $this->netSample();
        usleep(250000);
        [$idle2, $total2] = $this->cpuSample();
        [$rx2, $tx2]      = $this->netSample();

        $dTotal = max(1, $total2 - $total1);
        $cpu    = round((1 - (($idle2 - $idle1) / $dTotal)) * 100, 1);
        $win    = 0.25;
        $down   = max(0, ($rx2 - $rx1)) / $win;
        $up     = max(0, ($tx2 - $tx1)) / $win;

        return response()->json([
            'cpu'       => max(0, min(100, $cpu)),
            'mem'       => $this->memory(),
            'disk'      => $this->disk(),
            'net'       => ['down' => $down, 'up' => $up],
            'uptime'    => $this->uptime(),
            'processes' => $this->processes(),
            'logs'      => $this->logs(),
            'services' => $this->services(),
            'proc_cpu' => $this->processesBy('pcpu'),
            'proc_disk' => $this->processesBy('pcpu'),
            'time'     => now()->toIso8601String(),
            'tz'       => config('app.timezone', 'UTC'),
        ]);
    }

    private function cpuSample(): array
    {
        $line = explode("\n", @file_get_contents('/proc/stat'))[0] ?? 'cpu 0 0 0 0 0';
        $p = preg_split('/\s+/', trim($line));
        array_shift($p);
        $v = array_map('intval', $p);
        $idle  = ($v[3] ?? 0) + ($v[4] ?? 0);
        $total = array_sum($v);
        return [$idle, $total];
    }

    private function netSample(): array
    {
        $rx = 0; $tx = 0;
        foreach (explode("\n", @file_get_contents('/proc/net/dev') ?: '') as $l) {
            if (!str_contains($l, ':')) continue;
            [$if, $data] = explode(':', $l, 2);
            if (trim($if) === 'lo') continue;
            $c = preg_split('/\s+/', trim($data));
            $rx += (int) ($c[0] ?? 0);
            $tx += (int) ($c[8] ?? 0);
        }
        return [$rx, $tx];
    }

    private function memory(): array
    {
        $m = [];
        foreach (explode("\n", @file_get_contents('/proc/meminfo') ?: '') as $l) {
            if (preg_match('/^(\w+):\s+(\d+)/', $l, $x)) $m[$x[1]] = (int) $x[2] * 1024;
        }
        $total = $m['MemTotal']   ?? 0;
        $avail = $m['MemAvailable'] ?? ($m['MemFree'] ?? 0);
        $used  = max(0, $total - $avail);
        return [
            'total' => $total, 'used' => $used, 'free' => $avail,
            'pct'   => $total ? round($used / $total * 100, 1) : 0,
        ];
    }

    private function disk(): array
    {
        $total = @disk_total_space('/') ?: 0;
        $free  = @disk_free_space('/')  ?: 0;
        $used  = max(0, $total - $free);
        return [
            'total' => $total, 'used' => $used, 'free' => $free,
            'pct'   => $total ? round($used / $total * 100, 1) : 0,
        ];
    }

    private function uptime(): array
    {
        $up   = (float) explode(' ', @file_get_contents('/proc/uptime') ?: '0')[0];
        $dias = (int) floor($up / 86400);
        $hrs  = (int) floor(($up - $dias * 86400) / 3600);
        $min  = (int) floor(($up - $dias * 86400 - $hrs * 3600) / 60);
        return ['seconds' => (int) $up, 'label' => "{$dias} dias, {$hrs} horas, {$min} min"];
    }

    private function processes(): array
    {
        try {
            $r = Process::timeout(5)->run(['ps', '-eo', 'pid,comm,pmem,pcpu', '--sort=-pmem']);
            if (!$r->successful()) return [];
            $rows = [];
            $lines = array_slice(array_filter(explode("\n", trim($r->output()))), 1, 15);
            foreach ($lines as $l) {
                $c = preg_split('/\s+/', trim($l), 4);
                if (count($c) < 4) continue;
                $rows[] = [
                    'pid'  => (int) $c[0],
                    'name' => $c[1],
                    'mem'  => (float) $c[2],
                    'cpu'  => (float) $c[3],
                ];
            }
            return $rows;
        } catch (\Throwable $e) {
            return [];
        }
    }

    private function services(): array
    {
        $units = ['nginx', 'mysql', 'ollama', 'cloudflared', 'php8.3-fpm', 'cron', 'docker'];
        $state = array_fill_keys($units, 'unknown');
        try {
            $r = Process::timeout(5)->run(array_merge(['systemctl', 'is-active'], $units));
            $lines = explode("\n", trim($r->output()));
            foreach ($units as $i => $u) $state[$u] = trim($lines[$i] ?? 'unknown');
        } catch (\Throwable $e) {}
        return collect($units)->map(fn($u) => [
            'name' => $u, 'active' => ($state[$u] ?? '') === 'active',
            'state' => $state[$u] ?? 'unknown',
        ])->all();
    }

    private function recentDraws(): array
    {
        $path = storage_path('app/miloto-history.json');
        if (!file_exists($path)) return [];
        $data = json_decode(file_get_contents($path), true);
        return array_slice($data ?: [], 0, 20);
    }

    private function processesBy(string $sort): array
    {
        try {
            $r = Process::timeout(5)->run(['ps', '-eo', 'pid,comm,pmem,pcpu', "--sort=-{$sort}"]);
            if (!$r->successful()) return [];
            $rows = [];
            $lines = array_slice(array_filter(explode("\n", trim($r->output()))), 1, 10);
            foreach ($lines as $l) {
                $c = preg_split('/\s+/', trim($l), 4);
                if (count($c) < 4) continue;
                $rows[] = ['pid' => (int)$c[0], 'name' => $c[1], 'mem' => (float)$c[2], 'cpu' => (float)$c[3]];
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    private function processesByDisk(): array
    {
        try {
            $r = Process::timeout(5)->run(['iotop', '-b', '-n', '1', '-o', '-P', '-q']);
            if (!$r->successful()) return [];
            $rows = [];
            $lines = array_slice(array_filter(explode("\n", trim($r->output()))), 2, 10);
            foreach ($lines as $l) {
                $c = preg_split('/\s+/', trim($l));
                if (count($c) < 4) continue;
                $rows[] = ['pid' => (int)($c[0]??0), 'name' => $c[count($c)-1] ?? '?', 'mem' => 0.0, 'cpu' => 0.0];
            }
            if (empty($rows)) { // fallback: iostat
                $r2 = Process::timeout(5)->run(['iostat', '-x', '1', '1']);
                return [];
            }
            return $rows;
        } catch (\Throwable $e) { return []; }
    }

    public function pulse()
    {
        try {
            Process::timeout(8)->start(['timeout', '5', 'sha256sum', '/dev/zero']);
            @file_put_contents(storage_path('app/heartbeat.txt'), now()->toIso8601String());
        } catch (\Throwable $e) {}
        return response()->json(['ok' => true, 'at' => now()->toIso8601String()]);
    }

    private function logs(): string
    {
        try {
            $r = Process::timeout(5)->run(['journalctl', '-n', '50', '--no-pager', '-o', 'short-iso']);
            if ($r->successful() && trim($r->output()) !== '') return $r->output();
            $r = Process::timeout(5)->run(['tail', '-n', '50', '/var/log/syslog']);
            if ($r->successful()) return $r->output();
        } catch (\Throwable $e) {}
        return "Logs no disponibles.";
    }
}