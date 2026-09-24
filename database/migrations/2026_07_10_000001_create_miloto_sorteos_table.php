<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MiLoto — sorteos históricos.
 *
 * Regla fija del juego: K = 5 balotas, universo N = 39, una única máquina.
 * El orden de las balotas NO importa (solo la cantidad de coincidencias),
 * por eso b1..b5 se almacenan siempre ordenadas ascendentemente.
 *
 * `idx` = orden cronológico ascendente (1 = sorteo más antiguo). Es la ÚNICA
 * fuente de verdad temporal y la clave del anti-leakage del backtesting:
 * la predicción del sorteo N solo puede leer filas con idx < N.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miloto_sorteos', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('idx')->comment('Orden cronológico ASC (1..N). Anti-leakage.');
            $table->date('fecha');

            // Balotas normalizadas (ordenadas ASC). K=5 fijo.
            $table->unsignedTinyInteger('b1');
            $table->unsignedTinyInteger('b2');
            $table->unsignedTinyInteger('b3');
            $table->unsignedTinyInteger('b4');
            $table->unsignedTinyInteger('b5');

            // Respaldo/redundancia del array original.
            $table->json('numeros_json');

            // Columna generada: suma de las 5 balotas (cero cómputo en lectura).
            $table->unsignedSmallInteger('suma')
                  ->storedAs('b1 + b2 + b3 + b4 + b5');

            $table->timestamp('created_at')->useCurrent();

            $table->unique('idx', 'uq_idx');
            $table->unique('fecha', 'uq_fecha');
            $table->index('fecha', 'idx_fecha');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miloto_sorteos');
    }
};
