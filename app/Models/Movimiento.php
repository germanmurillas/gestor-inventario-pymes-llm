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

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
