<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pedidos de la administradora en la prueba con usuario (8-oct-2026) para usar el sistema con
 * datos reales:
 * - bodegas agrupadas en materia prima, producto terminado y productos de reventa;
 * - presentación de cada insumo (p. ej. bulto de 50 kg) para registrar en bultos y guardar en kg;
 * - vida útil del insumo, para proponer el vencimiento de los lotes nuevos;
 * - lotes con vencimiento estimado (sin fecha real del empaque), para pedir que se confirme;
 * - bodega habitual del insumo, para que aparezca en su bodega aunque no tenga existencia;
 * - tema visual de cada usuario («yo lo quiero negro, a ti te gusta morado»).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bodegas', function (Blueprint $t) {
            $t->string('grupo', 30)->nullable()->after('code');
        });
        Schema::table('materials', function (Blueprint $t) {
            $t->string('presentacion_nombre', 30)->nullable()->after('unit');
            $t->decimal('presentacion_cantidad', 12, 3)->nullable()->after('presentacion_nombre');
            $t->unsignedInteger('vida_util_dias')->nullable()->after('dias_entrega');
            $t->foreignId('bodega_id')->nullable()->after('vida_util_dias')->constrained('bodegas')->nullOnDelete();
        });
        Schema::table('lotes', function (Blueprint $t) {
            $t->boolean('vencimiento_estimado')->default(false)->after('expiration_date');
        });
        Schema::table('users', function (Blueprint $t) {
            $t->string('theme', 40)->nullable()->after('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', fn (Blueprint $t) => $t->dropColumn('theme'));
        Schema::table('lotes', fn (Blueprint $t) => $t->dropColumn('vencimiento_estimado'));
        Schema::table('materials', function (Blueprint $t) {
            $t->dropConstrainedForeignId('bodega_id');
            $t->dropColumn(['presentacion_nombre', 'presentacion_cantidad', 'vida_util_dias']);
        });
        Schema::table('bodegas', fn (Blueprint $t) => $t->dropColumn('grupo'));
    }
};
