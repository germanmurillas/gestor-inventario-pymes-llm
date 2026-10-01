<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Precios oficiales de los modelos de la palanca (database/seeders/data/llm_precios.json) y el modelo
 * recomendado. Se puede volver a ejecutar para actualizar precios; no toca el modelo recomendado si ya existe.
 */
class LlmPreciosSeeder extends Seeder
{
    public function run(): void
    {
        $datos = json_decode(file_get_contents(database_path('seeders/data/llm_precios.json')), true);
        $consultado = substr($datos['_fuente'], strpos($datos['_fuente'], '20'), 10);

        foreach ($datos['modelos'] as $m) {
            DB::table('llm_precios')->updateOrInsert(['modelo' => $m['modelo']], [
                'fuente' => $m['fuente'], 'proveedor' => $m['proveedor'],
                'entrada_usd_millon' => $m['entrada'], 'salida_usd_millon' => $m['salida'],
                'entrada_pico_usd_millon' => $m['entrada_pico'] ?? null, 'salida_pico_usd_millon' => $m['salida_pico'] ?? null,
                'nota' => $m['nota'] ?? null, 'fuente_url' => $m['fuente_url'], 'consultado_el' => $consultado,
                'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        // Clasificador de intención y respaldo en la nube (ver ChatLLMController::intencion y ::respaldo).
        foreach ([
            ['llm_clasificador_modelo', 'gpt-oss:120b-cloud', 'Modelo (Ollama) que clasifica la intención antes de los patrones; vacío = solo patrones'],
            ['llm_respaldo_fuente', 'opencode-go', 'Origen del modelo de respaldo en la nube; vacío = sin respaldo en la nube'],
            ['llm_respaldo_modelo', 'glm-5.3-flash', 'Modelo de respaldo en la nube, antes del modelo local'],
        ] as [$clave, $valor, $desc]) {
            DB::table('settings')->insertOrIgnore([
                'clave' => $clave, 'valor' => $valor, 'tipo' => 'string', 'grupo' => 'llm', 'es_publica' => false,
                'descripcion' => $desc, 'created_at' => now(), 'updated_at' => now(),
            ]);
        }

        DB::table('settings')->insertOrIgnore([
            'clave' => 'llm_modelo_recomendado', 'valor' => $datos['recomendado'], 'tipo' => 'string', 'grupo' => 'llm',
            'es_publica' => false, 'descripcion' => 'Modelo recomendado (verde) en la palanca de modelos',
            'created_at' => now(), 'updated_at' => now(),
        ]);
    }
}
