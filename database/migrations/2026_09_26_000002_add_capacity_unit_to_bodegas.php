<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Unidad en que se expresa la capacidad de la bodega (kg, und, gal…). La ocupación solo
 * suma los lotes en esa unidad: no se mezclan kilos con unidades ni se inventan conversiones.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bodegas', function (Blueprint $table) {
            $table->string('capacity_unit', 10)->nullable()->after('capacity');
        });
    }

    public function down(): void
    {
        Schema::table('bodegas', function (Blueprint $table) {
            $table->dropColumn('capacity_unit');
        });
    }
};
