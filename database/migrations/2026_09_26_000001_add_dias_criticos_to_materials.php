<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Umbral FEFO propio del insumo (días antes del vencimiento en que un lote pasa a crítico).
 * Nulo = se usa el umbral general de Ajustes (settings.fefo_dias_criticos).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->unsignedSmallInteger('dias_criticos')->nullable()->after('stock_minimo');
        });
    }

    public function down(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->dropColumn('dias_criticos');
        });
    }
};
