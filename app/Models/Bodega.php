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
        'capacity_unit',
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

    /** Lotes en bodega que cuentan para la ocupación: los que están en la unidad de la capacidad. */
    private function lotesEnUnidad()
    {
        return $this->lotes()->where('status', '!=', 'consumed')
            ->when($this->capacity_unit, fn ($q) => $q->whereHas('material', fn ($m) => $m->where('unit', $this->capacity_unit)));
    }

    /** Ocupación actual, en la unidad de la capacidad (capacity_unit). */
    public function getOccupiedCapacityAttribute(): float
    {
        return (float) $this->lotesEnUnidad()->sum('quantity');
    }

    /** Lotes en bodega expresados en otra unidad: no suman a la ocupación (no hay conversión). */
    public function getLotesOtraUnidadAttribute(): int
    {
        if (!$this->capacity_unit) return 0;
        return $this->lotes()->where('status', '!=', 'consumed')
            ->whereHas('material', fn ($m) => $m->where('unit', '!=', $this->capacity_unit))->count();
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
