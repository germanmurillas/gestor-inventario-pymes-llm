<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Material extends Model {
    use HasFactory;
    protected $fillable = [
        'code', 'name', 'unit', 'description',
        'stock_min', 'stock_max', 'photo_path',
        'unidad_medida', 'categoria', 'stock_minimo',
        'custom_fields',
    ];

    protected $appends = ['stock_total', 'tiene_criticos', 'photo_url'];

    protected function casts(): array {
        return [
            'stock_min'     => 'float',
            'stock_max'     => 'float',
            'stock_minimo'  => 'float',
            'custom_fields' => 'json',
        ];
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /** Todos los lotes de este material */
    public function lotes(): HasMany {
        return $this->hasMany(Lote::class);
    }

    /** Etiquetas de clasificación (many-to-many) */
    public function tags(): BelongsToMany {
        return $this->belongsToMany(Tag::class, 'material_tag');
    }

    // ── Computed Attributes ───────────────────────────────────────────────────

    /** Stock total activo (suma de quantity de lotes activos) */
    public function getStockTotalAttribute(): float {
        return (float) $this->lotes()->where('status', 'active')->sum('quantity');
    }

    /** Si tiene algún lote crítico (vence en ≤ 15 días) */
    public function getTieneCriticosAttribute(): bool {
        return $this->lotes()->activos()->venceEn(15)->exists();
    }

    /** URL pública de la foto del material */
    public function getPhotoUrlAttribute(): ?string {
        if (!$this->photo_path) return null;
        return \App\Support\Imagen::url($this->photo_path);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** Materiales con stock bajo (stock_total < stock_minimo) */
    public function scopeStockBajo($query) {
        return $query->withSum(['lotes' => fn($q) => $q->where('status', 'active')], 'quantity')
                     ->whereNotNull('stock_minimo')
                     ->whereRaw('lotes_sum_quantity < stock_minimo');
    }

    /** Búsqueda global por nombre o código */
    public function scopeBuscar($query, string $term) {
        return $query->where(function ($q) use ($term) {
            $q->where('name', 'like', "%{$term}%")
              ->orWhere('code', 'like', "%{$term}%")
              ->orWhere('categoria', 'like', "%{$term}%");
        });
    }
}
