<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MiLoto — Fase 3: ranking global agregado de algoritmos (Requisito C).
 *
 * Recalculado tras cada backtest a partir de miloto_backtest_resultados.
 * La UI lee esta tabla directamente (cero cómputo en lectura).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miloto_algoritmo_ranking', function (Blueprint $table) {
            $table->unsignedBigInteger('algoritmo_id')->primary();
            $table->decimal('puntos_totales', 14, 3)->comment('Σ score');
            $table->decimal('score_promedio', 8, 4)->comment('AVG pct_acierto');
            $table->unsignedInteger('total_aciertos')->comment('Σ aciertos (ticket primario)');
            $table->unsignedInteger('sorteos_evaluados');
            $table->unsignedInteger('mejor_racha')->default(0)->comment('máx. sorteos consecutivos con ≥2 aciertos');
            $table->unsignedSmallInteger('posicion');
            $table->timestamp('actualizado_at')->useCurrent()->useCurrentOnUpdate();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miloto_algoritmo_ranking');
    }
};
