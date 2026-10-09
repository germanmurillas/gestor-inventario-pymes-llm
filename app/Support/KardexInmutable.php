<?php

namespace App\Support;

use Illuminate\Support\Facades\DB;

/**
 * Triggers que hacen el Kardex inmutable en la propia base de datos: además de los eventos de Eloquent
 * (Movimiento::booted), rechazan cualquier UPDATE o DELETE sobre `movimientos`, incluido SQL directo o
 * DB::table(). Solo el sembrador de la demostración los quita un momento para vaciar la tabla.
 */
class KardexInmutable
{
    public const TRIGGERS = ['kardex_sin_modificar', 'kardex_sin_borrar'];

    public static function crear(): void
    {
        foreach (self::sentencias(DB::getDriverName()) as $sql) {
            DB::unprepared($sql);
        }
    }

    /**
     * SQL que crea los triggers. En MySQL con registro binario activo, crear triggers exige SUPER o
     * log_bin_trust_function_creators=1 (ERROR 1419, comprobado el 9-oct con una copia restaurada):
     * el administrador del servidor lo aplica con «php artisan kardex:proteger --sql | sudo mysql <base>».
     */
    public static function sentencias(string $driver): array
    {
        $mensajes = [
            'kardex_sin_modificar' => ['UPDATE', 'El Kardex es inmutable: los movimientos no se pueden modificar.'],
            'kardex_sin_borrar' => ['DELETE', 'El Kardex es inmutable: los movimientos no se pueden eliminar.'],
        ];
        $sql = [];
        foreach ($mensajes as $nombre => [$operacion, $mensaje]) {
            $sql[] = "DROP TRIGGER IF EXISTS {$nombre}";
            $sql[] = $driver === 'mysql'
                ? "CREATE TRIGGER {$nombre} BEFORE {$operacion} ON movimientos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '{$mensaje}'"
                : "CREATE TRIGGER {$nombre} BEFORE {$operacion} ON movimientos BEGIN SELECT RAISE(ABORT, '{$mensaje}'); END";
        }
        return $sql;
    }

    public static function quitar(): void
    {
        foreach (self::TRIGGERS as $nombre) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$nombre}");
        }
    }
}
