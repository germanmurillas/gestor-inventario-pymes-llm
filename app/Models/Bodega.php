<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bodega extends Model
{
    protected $fillable = [
        'name',
        'code',
        'description',
        'capacity',
        'status'
    ];

    public function lotes(): HasMany
    {
        return $this->hasMany(Lote::class);
    }

    /**
     * Calcula la ocupación actual en KG.
     */
    public function getOccupiedCapacityAttribute(): float
    {
        return $this->lotes()->where('status', '!=', 'consumed')->sum('quantity');
    }

    /**
     * Calcula el porcentaje de ocupación basado en la capacidad total.
     */
    public function getOccupancyPercentageAttribute(): float
    {
        if ($this->capacity <= 0) return 0;
        return round(($this->occupied_capacity / $this->capacity) * 100, 2);
    }
}
