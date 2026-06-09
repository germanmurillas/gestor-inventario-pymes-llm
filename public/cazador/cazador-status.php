<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

echo json_encode([
    'status' => 'VICTORY',
    'shape' => 'VM.Standard.A1.Flex',
    'regions' => [
        ['region' => 'us-ashburn-1', 'total' => 1758, 'ooc' => 0, 'errors' => 0, 'status' => 'completed'],
    ],
    'message' => 'DesktopTitan A1.Flex capturado. 4 OCPU, 24 GB RAM, 200 GB SSD. Oracle Always Free.',
    'timestamp' => date('c'),
], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE);
