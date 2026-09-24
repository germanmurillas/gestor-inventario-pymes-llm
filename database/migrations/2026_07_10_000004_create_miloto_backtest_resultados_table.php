<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MiLoto — Fase 3: resultado del backtest walk-forward.
 *
 * Una fila por (sorteo evaluado, algoritmo). La predicción se generó usando
 * SOLO idx < sorteo_idx (anti-leakage), y se compara contra el resultado real
 * de ese sorteo.
 *
 *  - prediccion            : combinación primaria (K números).
 *  - aciertos / pct_acierto: coincidencias del ticket PRIMARIO (métrica justa,
 *                            comparable entre todos los algoritmos: 1 ticket c/u).
 *  - n_tickets             : nº de tickets que emite el sistema (rueda/cobertura).
 *  - mejor_ticket_aciertos : mejor coincidencia entre TODOS los tickets
 *                            (informativo: mide la cobertura del sistema).
 *  - score / color         : ver planes/miloto-backtesting.md §5.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miloto_backtest_resultados', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('sorteo_idx')->comment('Sorteo evaluado (usó historia 1..idx-1).');
            $table->unsignedBigInteger('algoritmo_id');

            $table->json('prediccion')->comment('Combinación primaria [n1..nK].');
            $table->unsignedTinyInteger('aciertos')->comment('Coincidencias del ticket primario.');
            $table->decimal('pct_acierto', 5, 2);

            $table->unsignedSmallInteger('n_tickets')->default(1);
            $table->unsignedTinyInteger('mejor_ticket_aciertos')->default(0);

            $table->decimal('score', 10, 3);
            $table->string('color', 10)->comment('rojo|amarillo|verde');

            $table->timestamp('calculado_at')->useCurrent();

            $table->unique(['sorteo_idx', 'algoritmo_id'], 'uq_sorteo_algo');
            $table->index('algoritmo_id', 'idx_algo');
            $table->index('sorteo_idx', 'idx_sorteo');
            $table->index(['algoritmo_id', 'score'], 'idx_algo_score');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miloto_backtest_resultados');
    }
};
