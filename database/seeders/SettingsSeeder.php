<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class SettingsSeeder extends Seeder
{
    public function run(): void
    {
        $settings = [
            // Grupo: General
            ['clave' => 'app_nombre',          'valor' => 'PYMETORY',               'tipo' => 'string',  'grupo' => 'general',        'es_publica' => true,  'descripcion' => 'Nombre del sistema'],
            ['clave' => 'app_empresa',         'valor' => 'Panificadora Demo',       'tipo' => 'string',  'grupo' => 'general',        'es_publica' => true,  'descripcion' => 'Nombre de la empresa cliente'],
            ['clave' => 'fefo_dias_criticos',  'valor' => '15',                      'tipo' => 'integer', 'grupo' => 'general',        'es_publica' => false, 'descripcion' => 'Días para considerar un lote como crítico (FEFO)'],
            ['clave' => 'zona_horaria',        'valor' => 'America/Bogota',          'tipo' => 'string',  'grupo' => 'general',        'es_publica' => true,  'descripcion' => 'Zona horaria del sistema'],

            // Grupo: LLM
            ['clave' => 'llm_modelo',          'valor' => 'gpt-4o-mini',             'tipo' => 'string',  'grupo' => 'llm',            'es_publica' => false, 'descripcion' => 'Modelo de IA activo (gpt-4o-mini | gpt-4o | claude-3-haiku)'],
            ['clave' => 'llm_temperatura',     'valor' => '0.3',                     'tipo' => 'float',   'grupo' => 'llm',            'es_publica' => false, 'descripcion' => 'Temperatura del LLM (0.0 = preciso, 1.0 = creativo)'],
            ['clave' => 'llm_max_tokens',      'valor' => '1024',                    'tipo' => 'integer', 'grupo' => 'llm',            'es_publica' => false, 'descripcion' => 'Máximo de tokens por respuesta del LLM'],
            ['clave' => 'llm_contexto_lotes',  'valor' => '20',                      'tipo' => 'integer', 'grupo' => 'llm',            'es_publica' => false, 'descripcion' => 'Número de lotes recientes a inyectar en el contexto RAG'],
            ['clave' => 'llm_activo',          'valor' => 'true',                    'tipo' => 'boolean', 'grupo' => 'llm',            'es_publica' => false, 'descripcion' => 'Activar o desactivar el módulo LLM'],

            // Grupo: Notificaciones
            ['clave' => 'notif_fefo_activo',   'valor' => 'true',                    'tipo' => 'boolean', 'grupo' => 'notificaciones', 'es_publica' => false, 'descripcion' => 'Enviar notificación cuando un lote entra en estado crítico FEFO'],
            ['clave' => 'notif_stock_bajo',    'valor' => 'true',                    'tipo' => 'boolean', 'grupo' => 'notificaciones', 'es_publica' => false, 'descripcion' => 'Notificar cuando el stock cae por debajo del mínimo'],
            ['clave' => 'notif_email_admin',   'valor' => 'admin@pymetory.com',      'tipo' => 'string',  'grupo' => 'notificaciones', 'es_publica' => false, 'descripcion' => 'Email del administrador para alertas críticas'],

            // Grupo: Seguridad
            ['clave' => 'sesion_timeout_min',  'valor' => '120',                     'tipo' => 'integer', 'grupo' => 'seguridad',      'es_publica' => false, 'descripcion' => 'Tiempo en minutos antes de cerrar sesión por inactividad'],
            ['clave' => 'max_intentos_login',  'valor' => '5',                       'tipo' => 'integer', 'grupo' => 'seguridad',      'es_publica' => false, 'descripcion' => 'Intentos de login fallidos antes de bloquear cuenta'],
            ['clave' => 'audit_log_activo',    'valor' => 'true',                    'tipo' => 'boolean', 'grupo' => 'seguridad',      'es_publica' => false, 'descripcion' => 'Registrar todas las acciones en el log de auditoría'],
        ];

        foreach ($settings as $setting) {
            DB::table('settings')->updateOrInsert(
                ['clave' => $setting['clave']],
                array_merge($setting, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
