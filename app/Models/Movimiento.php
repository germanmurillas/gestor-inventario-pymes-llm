<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int|null $lote_id
 * @property string $type
 * @property float $quantity
 * @property string|null $reason
 * @property \App\Models\Lote|null $lote
 * @property \App\Models\User|null $user
 * @property \Carbon\CarbonInterface $created_at
 */
class Movimiento extends Model
{
    protected $fillable = [
        'lote_id',
        'user_id',
        'type', // 'entrada', 'salida'
        'quantity',
        'reason', // 'produccion', 'vencimiento', 'ajuste', 'ingreso'
        'description'
    ];

    /**
     * Kardex inmutable (regla de la dirección del trabajo de grado): un movimiento
     * registrado no se edita ni se elimina; las correcciones se hacen con un
     * nuevo movimiento de ajuste.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new \LogicException('El Kardex es inmutable: los movimientos no se pueden modificar.');
        });
        static::deleting(function () {
            throw new \LogicException('El Kardex es inmutable: los movimientos no se pueden eliminar.');
        });
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Motivos válidos para una salida. El ajuste solo lo registra el administrador (RF-11): un operario
     * corrige diferencias pidiendo una conciliación, no con salidas de ajuste.
     */
    public static function reglaMotivoSalida(?User $usuario): string
    {
        return 'in:produccion,venta,desperdicio' . ($usuario?->role === 'admin' ? ',ajuste' : '');
    }
}
