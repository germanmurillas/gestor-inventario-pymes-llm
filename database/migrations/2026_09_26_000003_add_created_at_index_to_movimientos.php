<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * El Kardex se pagina del más reciente al más antiguo: índice por fecha para no ordenar la tabla completa.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->index(['created_at', 'id']);
        });
    }

    public function down(): void
    {
        Schema::table('movimientos', function (Blueprint $table) {
            $table->dropIndex(['created_at', 'id']);
        });
    }
};
