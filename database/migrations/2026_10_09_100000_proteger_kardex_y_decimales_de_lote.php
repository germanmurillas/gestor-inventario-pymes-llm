<?php

use App\Support\KardexInmutable;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\QueryException;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

/**
 * Revisión contra-tesis (5-oct-2026):
 * - lotes.quantity pasa de decimal(10,2) a decimal(12,3), igual que movimientos.quantity: un despacho
 *   de gramos ya no descuadra el lote frente al Kardex.
 * - Triggers que rechazan UPDATE y DELETE en `movimientos` (Kardex inmutable también en la base).
 *
 * Si MySQL no deja crear los triggers (binlog activo sin log_bin_trust_function_creators y sin SUPER),
 * la migración lo registra y continúa para no detener el despliegue; un administrador del servidor
 * puede activarlos después con `php artisan kardex:proteger`.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('lotes', function (Blueprint $t) {
            $t->decimal('quantity', 12, 3)->default(0)->change();
        });

        try {
            KardexInmutable::crear();
        } catch (QueryException $e) {
            if (DB::getDriverName() !== 'mysql') {
                throw $e;
            }
            Log::warning('Kardex: no se pudieron crear los triggers (' . $e->getMessage() . '). Ejecutar php artisan kardex:proteger con un usuario con permiso.');
            echo "  AVISO: triggers del Kardex no creados; ver storage/logs y ejecutar kardex:proteger.\n";
        }
    }

    public function down(): void
    {
        KardexInmutable::quitar();
        Schema::table('lotes', function (Blueprint $t) {
            $t->decimal('quantity', 10, 2)->default(0)->change();
        });
    }
};
