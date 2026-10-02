<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

/**
 * Las claves de proveedores solo viven cifradas en api_keys. Se eliminan los ajustes llm_external_key y
 * llm_opencode_key, que guardaban claves en texto plano y que GET /settings devolvía al navegador.
 */
return new class extends Migration
{
    public function up(): void
    {
        DB::table('settings')->whereIn('clave', ['llm_external_key', 'llm_opencode_key'])->delete();
    }

    public function down(): void
    {
        // No se restauran: volver a guardar claves en texto plano sería reintroducir la falla.
    }
};
