<?php

namespace App\Exceptions;

use App\Models\Material;
use RuntimeException;

/** No hay existencia despachable (activa y sin vencer) suficiente para una salida. */
class StockInsuficiente extends RuntimeException
{
    public function __construct(public readonly Material $material, public readonly float $disponible)
    {
        parent::__construct("Stock insuficiente: de {$material->name} solo hay " . round($disponible, 3)
            . " {$material->unit} disponibles (sin vencer ni en cuarentena).");
    }
}
