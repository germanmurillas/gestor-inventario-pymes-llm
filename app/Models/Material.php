<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Material extends Model {
    use HasFactory;
    /** Unidades de medida admitidas al registrar un insumo. */
    public const UNIDADES = ['kg', 'g', 'L', 'mL', 'gal', 'und'];

    /** Grupos de bodegas que pidió la empresa (prueba con usuario, 8-oct-2026). */
    public const GRUPOS = ['materia_prima' => 'Materia prima', 'producto_terminado' => 'Producto terminado', 'reventa' => 'Productos de reventa'];

    protected $fillable = [
        'code', 'name', 'unit', 'description', 'presentacion_nombre', 'presentacion_cantidad', 'vida_util_dias', 'bodega_id',
        'stock_min', 'stock_max', 'photo_path',
        'unidad_medida', 'categoria', 'stock_minimo', 'dias_criticos', 'dias_entrega',
        'custom_fields',
    ];

    protected $appends = ['stock_total', 'tiene_criticos', 'photo_url'];

    protected function casts(): array {
        return [
            'stock_min'     => 'float',
            'stock_max'     => 'float',
            'stock_minimo'  => 'float',
            'presentacion_cantidad' => 'float',
            'custom_fields' => 'json',
        ];
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    /** Todos los lotes de este material */
    public function lotes(): HasMany {
        return $this->hasMany(Lote::class);
    }

    /** Bodega habitual: donde se muestra el insumo aunque no tenga existencia. */
    public function bodega(): \Illuminate\Database\Eloquent\Relations\BelongsTo {
        return $this->belongsTo(Bodega::class);
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

    /** Si tiene algún lote crítico según su umbral FEFO (propio o general). */
    public function getTieneCriticosAttribute(): bool {
        return $this->lotes()->activos()->criticos()->exists();
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
