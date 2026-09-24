<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MiLoto — Fase 2: catálogo de algoritmos.
 *
 * Registro declarativo de cada método de predicción/análisis. NADA se
 * hardcodea en el motor: éste itera sobre las filas ACTIVAS de esta tabla,
 * resuelve el `handler` y le inyecta los parámetros leídos de config('miloto.*')
 * declarados en `config_keys`.
 *
 * - `slug`         : clave máquina única (estable para código y config).
 * - `categoria`    : estadistico | combinatorio | estocastico | muestreo.
 * - `tipo_salida`  : ranking (score por número 1..39) | combinacion (tickets de K=5).
 * - `handler`      : FQCN del servicio que implementa el algoritmo (Fase 3).
 * - `config_keys`  : llaves de config('miloto.*') que consume (sin hardcodeo).
 * - `activo`       : el motor solo ejecuta los algoritmos activos.
 * - `orden`        : orden de presentación/ejecución.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miloto_algoritmos', function (Blueprint $table) {
            $table->id();
            $table->string('slug', 40)->comment('Clave máquina única (ej: frecuencia).');
            $table->string('nombre', 80);
            $table->string('categoria', 20)->comment('estadistico|combinatorio|estocastico|muestreo');
            $table->string('tipo_salida', 20)->comment('ranking|combinacion');
            $table->text('descripcion');
            $table->string('handler')->comment('FQCN del servicio que lo implementa (Fase 3).');
            $table->json('config_keys')->comment('Llaves de config(miloto.*) que consume.');
            $table->boolean('activo')->default(true);
            $table->unsignedTinyInteger('orden')->default(0);

            $table->timestamp('created_at')->useCurrent();
            $table->timestamp('updated_at')->useCurrent();

            $table->unique('slug', 'uq_algo_slug');
            $table->index(['activo', 'orden'], 'idx_activo_orden');
            $table->index('categoria', 'idx_categoria');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miloto_algoritmos');
    }
};
