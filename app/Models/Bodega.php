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

    /** Imagen subida por el administrador; si no hay, la foto por defecto de su código (catálogo demo). */
    public function getImageUrlAttribute(): ?string
    {
        if ($this->image_path) {
            return asset('storage/' . $this->image_path);
        }
        return is_file(public_path("images/bodegas/{$this->code}.webp")) ? asset("images/bodegas/{$this->code}.webp") : null;
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
