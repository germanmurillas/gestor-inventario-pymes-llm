<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Bodega extends Model
{
    use HasFactory;
    protected $fillable = [
        'name',
        'code',
        'description',
        'capacity',
        'status',
        'image_path',
    ];

    protected $appends = ['image_url'];

    /** URL de la imagen según lo registrado en la base de datos: enlace externo, recurso público o archivo subido. */
    public function getImageUrlAttribute(): ?string
    {
        return \App\Support\Imagen::url($this->image_path);
    }

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
