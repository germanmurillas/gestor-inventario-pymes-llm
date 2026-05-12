<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Transferencia extends Model
{
    protected $table = 'transferencias';

    protected $fillable = [
        'from_bodega_id',
        'to_bodega_id',
        'lote_id',
        'cantidad',
        'user_id',
        'reason',
    ];

    protected function casts(): array
    {
        return [
            'cantidad' => 'float',
        ];
    }

    public function fromBodega(): BelongsTo
    {
        return $this->belongsTo(Bodega::class, 'from_bodega_id');
    }

    public function toBodega(): BelongsTo
    {
        return $this->belongsTo(Bodega::class, 'to_bodega_id');
    }

    public function lote(): BelongsTo
    {
        return $this->belongsTo(Lote::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
