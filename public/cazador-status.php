<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Status endpoint for Titan Hunter dashboard.
// The original hunter ran on cazador-2 (SERVIDOR, now terminated).
// DesktopTitan is the consolidated server (SERVIDOR).
// This endpoint provides current OCI instance status.

$status = [
    'is_hunting' => false,
    'is_victory' => true,
    'instance_found' => 'DesktopTitan A1.Flex (4 OCPU, 24 GB RAM, 200 GB SSD)',
    'last_message' => 'Caza completada — DesktopTitan corriendo en Oracle Cloud Always Free. Cazador original en cazador-2 (SERVIDOR) fue terminado tras consolidación.',
    'last_check' => date('c'),
    'server' => [
        'ip' => 'SERVIDOR',
        'hostname' => gethostname(),
    ],
    'attempts' => 1758,
    'uptime_days' => round((time() - strtotime('2026-05-11')) / 86400, 1),
];

echo json_encode($status, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
