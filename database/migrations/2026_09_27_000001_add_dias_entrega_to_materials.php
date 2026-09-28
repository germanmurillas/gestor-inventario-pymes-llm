<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tiempo de entrega del proveedor (días entre el pedido y la llegada), para calcular
 * el punto de reorden del insumo (RF-09). Nulo = no se conoce y no se calcula.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->unsignedSmallInteger('dias_entrega')->nullable()->after('dias_criticos');
        });
    }

    public function down(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->dropColumn('dias_entrega');
        });
    }
};
