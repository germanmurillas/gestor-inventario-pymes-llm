<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * MiLoto — Fase 3: mejor algoritmo por sorteo (derivada).
 *
 * Para pintar rápido el histórico (Requisito B): qué algoritmo habría acertado
 * más en cada sorteo, con sus balotas acertadas, % y color de barra. La
 * predicción nunca vio el sorteo evaluado (anti-leakage intacto).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('miloto_sorteo_mejor_algo', function (Blueprint $table) {
            $table->unsignedInteger('sorteo_idx')->primary();
            $table->unsignedBigInteger('algoritmo_id');
            $table->unsignedTinyInteger('aciertos');
            $table->decimal('pct_acierto', 5, 2);
            $table->string('color', 10);

            $table->index('algoritmo_id', 'idx_mejor_algo');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('miloto_sorteo_mejor_algo');
    }
};
