<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$mem = [];
@file_get_contents('/proc/meminfo');
if (file_exists('/proc/meminfo')) {
    preg_match('/MemTotal:\s+(\d+)\s+kB/', file_get_contents('/proc/meminfo'), $mTotal);
    preg_match('/MemAvailable:\s+(\d+)\s+kB/', file_get_contents('/proc/meminfo'), $mAvail);
    preg_match('/SwapTotal:\s+(\d+)\s+kB/', file_get_contents('/proc/meminfo'), $sTotal);
    preg_match('/SwapFree:\s+(\d+)\s+kB/', file_get_contents('/proc/meminfo'), $sFree);
}

$memTotalMb = isset($mTotal[1]) ? intval(round($mTotal[1] / 1024)) : 24000;
$memAvailMb = isset($mAvail[1]) ? intval(round($mAvail[1] / 1024)) : 16000;
$swapTotal = isset($sTotal[1]) ? intval(round($sTotal[1] / 1024)) : 4096;
$swapFree = isset($sFree[1]) ? intval(round($sFree[1] / 1024)) : 4096;

$load = sys_getloadavg();
$diskFree = disk_free_space('/');
$diskTotal = disk_total_space('/');
$uptime = file_get_contents('/proc/uptime');
$uptimeSec = $uptime ? intval(explode(' ', $uptime)[0]) : 0;

echo json_encode([
    'hostname' => gethostname(),
    'ram_total_mb' => $memTotalMb,
    'ram_used' => $memTotalMb - $memAvailMb,
    'swap_total' => $swapTotal,
    'swap_used' => $swapTotal - $swapFree,
    'disk_total_gb' => intval($diskTotal / 1024 / 1024 / 1024),
    'disk_free_gb' => intval($diskFree / 1024 / 1024 / 1024),
    'load_1m' => round($load[0], 2),
    'load_5m' => round($load[1], 2),
    'load_15m' => round($load[2], 2),
    'uptime_hours' => intval($uptimeSec / 3600),
    'uptime_days' => round($uptimeSec / 86400, 1),
    'active_model' => 'qwen3:0.6b',
    'timestamp' => date('c'),
    'oci_region' => 'us-ashburn-1',
    'free_tier' => true,
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
