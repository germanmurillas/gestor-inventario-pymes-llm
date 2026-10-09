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
        $mensajes = [
            'kardex_sin_modificar' => ['UPDATE', 'El Kardex es inmutable: los movimientos no se pueden modificar.'],
            'kardex_sin_borrar' => ['DELETE', 'El Kardex es inmutable: los movimientos no se pueden eliminar.'],
        ];
        $mysql = DB::getDriverName() === 'mysql';
        foreach ($mensajes as $nombre => [$operacion, $mensaje]) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$nombre}");
            DB::unprepared($mysql
                ? "CREATE TRIGGER {$nombre} BEFORE {$operacion} ON movimientos FOR EACH ROW SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = '{$mensaje}'"
                : "CREATE TRIGGER {$nombre} BEFORE {$operacion} ON movimientos BEGIN SELECT RAISE(ABORT, '{$mensaje}'); END");
        }
    }

    public static function quitar(): void
    {
        foreach (self::TRIGGERS as $nombre) {
            DB::unprepared("DROP TRIGGER IF EXISTS {$nombre}");
        }
    }
}
