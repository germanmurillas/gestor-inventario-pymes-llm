<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MiLoto — tabla "long" (una fila por balota).
 *
 * Formato óptimo para las agregaciones SQL de los algoritmos estadísticos
 * (frecuencia, calientes/fríos, chi², Markov, LHS...). Se deriva 100% de
 * miloto_sorteos y se reconstruye en cada ingesta.
 *
 * `sorteo_idx` referencia miloto_sorteos.idx (no el PK autoincremental),
 * porque idx es el orden cronológico usado por el backtesting.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miloto_sorteo_balotas', function (Blueprint $table) {
            $table->unsignedInteger('sorteo_idx');
            $table->unsignedTinyInteger('posicion'); // 1..5 (orden ASC, informativo)
            $table->unsignedTinyInteger('numero');   // 1..39

            $table->primary(['sorteo_idx', 'posicion']);
            $table->index('numero', 'idx_numero');
            $table->index(['sorteo_idx', 'numero'], 'idx_idx_num');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miloto_sorteo_balotas');
    }
};
