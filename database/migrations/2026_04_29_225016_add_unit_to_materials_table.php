<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->string('unidad_medida', 20)->default('unidad')
                  ->after('nombre')
                  ->comment('kg | g | l | ml | unidad | m | m2 | m3');
            $table->string('categoria', 60)->nullable()
                  ->after('unidad_medida')
                  ->comment('Clasificación general del material');
            $table->decimal('stock_minimo', 12, 3)->default(0)
                  ->after('categoria')
                  ->comment('Umbral para alerta de stock bajo');
        });
    }

    public function down(): void
    {
        Schema::table('materials', function (Blueprint $table) {
            $table->dropColumn(['unidad_medida', 'categoria', 'stock_minimo']);
        });
    }
};
