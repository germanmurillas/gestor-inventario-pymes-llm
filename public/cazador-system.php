<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// System metrics endpoint for Titan Hunter dashboard.

$mem = [];
preg_match('/MemTotal:\s+(\d+)\s+kB/', @file_get_contents('/proc/meminfo') ?: '', $mTotal);
preg_match('/MemAvailable:\s+(\d+)\s+kB/', @file_get_contents('/proc/meminfo') ?: '', $mAvail);

$memTotalMb = isset($mTotal[1]) ? round($mTotal[1] / 1024) : 24000;
$memAvailMb = isset($mAvail[1]) ? round($mAvail[1] / 1024) : 16000;

$load = sys_getloadavg();

$diskFree = disk_free_space('/');
$diskTotal = disk_total_space('/');

echo json_encode([
    'timestamp' => date('c'),
    'cpu' => [
        'cores' => 4,
        'load_1m' => round($load[0], 2),
        'load_5m' => round($load[1], 2),
        'load_15m' => round($load[2], 2),
    ],
    'memory' => [
        'total_mb' => $memTotalMb,
        'available_mb' => $memAvailMb,
        'used_mb' => $memTotalMb - $memAvailMb,
        'used_percent' => round((($memTotalMb - $memAvailMb) / $memTotalMb) * 100, 1),
    ],
    'disk' => [
        'free_gb' => round($diskFree / 1024 / 1024 / 1024, 1),
        'total_gb' => round($diskTotal / 1024 / 1024 / 1024, 1),
        'used_percent' => round((1 - $diskFree / $diskTotal) * 100, 1),
    ],
    'services' => [
        'nginx' => shell_exec('pgrep nginx >/dev/null 2>&1 && echo "running" || echo "stopped"'),
        'mysql' => shell_exec('pgrep mysql >/dev/null 2>&1 && echo "running" || echo "stopped"'),
        'ollama' => shell_exec('pgrep ollama >/dev/null 2>&1 && echo "running" || echo "stopped"'),
    ],
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
