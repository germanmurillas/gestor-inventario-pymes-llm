<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class NotificationSeeder extends Seeder
{
    public function run(): void
    {
        // Obtener admin user ID si existe
        $adminId = DB::table('users')->where('email', 'admin@pymetory.com')->value('id');

        $notifications = [
            [
                'user_id'    => $adminId,
                'tipo'       => 'critico',
                'titulo'     => '⚠️ Lote L-2024-047 vence en 12 días',
                'mensaje'    => 'El Lote L-2024-047 de Harina de Trigo (850kg) vence el ' . now()->addDays(12)->format('d/m/Y') . '. Se recomienda priorizar su consumo bajo política FEFO.',
                'accion_url' => '/inventory',
                'icono'      => 'AlertTriangle',
                'leida'      => false,
            ],
            [
                'user_id'    => $adminId,
                'tipo'       => 'warning',
                'titulo'     => '📦 Stock bajo: Azúcar Blanca',
                'mensaje'    => 'El stock de Azúcar Blanca ha caído a 45kg, por debajo del mínimo establecido (100kg). Se recomienda gestionar una nueva orden de compra.',
                'accion_url' => '/inventory',
                'icono'      => 'Package',
                'leida'      => false,
            ],
            [
                'user_id'    => $adminId,
                'tipo'       => 'exito',
                'titulo'     => '✅ Conciliación completada',
                'mensaje'    => 'La conciliación de inventario de la Bodega 2 fue completada exitosamente. Se registraron 3 ajustes en el Kardex histórico.',
                'accion_url' => '/log-maestro',
                'icono'      => 'CheckCircle',
                'leida'      => true,
                'leida_at'   => now()->subHours(2),
            ],
            [
                'user_id'    => $adminId,
                'tipo'       => 'info',
                'titulo'     => '🤖 Consulta IA procesada',
                'mensaje'    => 'El módulo RAG procesó 8 consultas hoy. Tiempo de respuesta promedio: 1.3 segundos. Sin errores reportados.',
                'accion_url' => '/llm',
                'icono'      => 'Bot',
                'leida'      => true,
                'leida_at'   => now()->subDay(),
            ],
            [
                'user_id'    => null, // Notificación global
                'tipo'       => 'info',
                'titulo'     => '🚀 Sistema PYMETORY actualizado',
                'mensaje'    => 'Se ha implementado el módulo de Log Maestro con auditoría completa. Todos los movimientos de inventario quedan registrados automáticamente.',
                'accion_url' => '/log-maestro',
                'icono'      => 'Zap',
                'leida'      => false,
            ],
        ];

        foreach ($notifications as $notif) {
            DB::table('notifications')->insert(array_merge($notif, [
                'created_at' => now()->subMinutes(rand(5, 2880)),
                'updated_at' => now(),
            ]));
        }
    }
}
