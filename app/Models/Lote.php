<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

/**
 * @property int $id
 * @property int $material_id
 * @property int $bodega_id
 * @property string $batch_number
 * @property float $quantity
 * @property float $unit_cost
 * @property \Carbon\CarbonInterface|null $expiration_date
 * @property string $status
 * @property Material|null $material
 * @property Bodega|null $bodega
 * @property \Illuminate\Database\Eloquent\Collection<int, Movimiento> $movimientos
 * @property-read int $days_until_expiration
 * @property-read bool $is_critical
 * @property-read float $valor_total
 * @property-read string|null $photo_url
 */
class Lote extends Model {
    use HasFactory;

    /** @var list<string> */
    protected $fillable = [
        'material_id', 'bodega_id', 'batch_number', 'quantity',
        'unit_cost', 'expiration_date', 'status', 'photo_path'
    ];

    /** @var list<string> */
    protected $appends = [
        'days_until_expiration',
        'is_critical',
        'valor_total',
        'photo_url',
    ];

    /** @return array<string, string|float> */
    protected function casts(): array {
        return [
            'expiration_date' => 'date',
            'quantity'        => 'float',
            'unit_cost'       => 'float',
        ];
    }

    /** @return BelongsTo<Material, $this> */
    public function material(): BelongsTo {
        return $this->belongsTo(Material::class);
    }

    /** @return BelongsTo */
    public function bodega(): BelongsTo {
        return $this->belongsTo(Bodega::class);
    }

    /** @return HasMany */
    public function movimientos(): HasMany {
        return $this->hasMany(Movimiento::class);
    }

    // ── Computed Attributes ───────────────────────────────────────────────────

    /** Días restantes hasta el vencimiento (negativo = ya venció) */
    public function getDaysUntilExpirationAttribute(): int {
        if (!$this->expiration_date) return 9999;
        return (int) Carbon::now()->diffInDays($this->expiration_date, false);
    }

    /**
     * Lote crítico: vence dentro del umbral FEFO de su insumo y no está consumido.
     */
    public function getIsCriticalAttribute(): bool {
        return $this->days_until_expiration <= $this->umbralDias()
            && $this->status !== 'consumed';
    }

    /** Umbral del lote: el del insumo (materials.dias_criticos) o, si no tiene, el general. */
    public function umbralDias(): int {
        return (int) ($this->material?->dias_criticos ?: self::diasCriticos());
    }

    /** Umbral FEFO configurable en Ajustes (settings.fefo_dias_criticos); 15 días por defecto. */
    public static function diasCriticos(): int {
        return once(fn () => max(1, (int) (\Illuminate\Support\Facades\DB::table('settings')
            ->where('clave', 'fefo_dias_criticos')->value('valor') ?: 15)));
    }

    /** Valor económico total del lote: quantity × unit_cost */
    public function getValorTotalAttribute(): float {
        return round(($this->quantity ?? 0) * ($this->unit_cost ?? 0), 2);
    }

    /** URL pública de la foto del lote */
    public function getPhotoUrlAttribute(): ?string {
        if (!$this->photo_path) return null;
        return \App\Support\Imagen::url($this->photo_path);
    }

    // ── Scopes ────────────────────────────────────────────────────────────────

    /** First-Expired-First-Out: lotes activos ordenados por vencimiento más próximo */
    public function scopeFefoOrder($query) {
        return $query->where('status', '!=', 'consumed')
                     ->orderBy('expiration_date', 'asc');
    }

    /** Solo lotes en estado activo */
    public function scopeActivos($query) {
        return $query->where('status', 'active');
    }

    /** Lotes que pueden salir a producción o venta: activos y sin vencer (FEFO no despacha vencidos). */
    public function scopeDespachables($query) {
        return $query->where('status', 'active')
                     ->whereDate('expiration_date', '>=', Carbon::today());
    }

    /**
     * Motivo por el que este lote no puede despacharse con la razón dada, o null si puede.
     * Reglas: solo lotes activos (no en cuarentena ni consumidos); un lote vencido solo se da de
     * baja como desperdicio; y, salvo desperdicio, FEFO exige despachar antes el lote que vence primero.
     */
    public function motivoNoDespachable(string $reason): ?string {
        if ($this->status !== 'active') {
            $estado = $this->status === 'quarantined' ? 'en cuarentena' : 'consumido';
            return "El lote {$this->batch_number} está {$estado} y no se puede despachar.";
        }
        if ($reason === 'desperdicio') {
            return null;
        }
        if ($this->expiration_date && $this->expiration_date->lt(Carbon::today())) {
            return "El lote {$this->batch_number} venció el {$this->expiration_date->format('Y-m-d')}; solo puede darse de baja como desperdicio.";
        }
        $anterior = static::despachables()
            ->where('material_id', $this->material_id)
            ->where('id', '!=', $this->id)
            ->whereDate('expiration_date', '<', $this->expiration_date)
            ->orderBy('expiration_date')
            ->first();
        if ($anterior) {
            return "FEFO: primero debe despacharse el lote {$anterior->batch_number}, que vence el {$anterior->expiration_date->format('Y-m-d')}.";
        }
        return null;
    }

    /** Lotes que vencen dentro de N días */
    public function scopeVenceEn($query, int $dias = 15) {
        return $query->where('status', 'active')
                     ->whereDate('expiration_date', '<=', Carbon::now()->addDays($dias))
                     ->whereDate('expiration_date', '>=', Carbon::now());
    }

    /**
     * Lotes críticos (consistente con getIsCriticalAttribute): cada lote se compara con el
     * umbral de su insumo o, si no tiene, con el general. Incluye lotes ya vencidos.
     * Se agrupa por umbral para no depender de aritmética de fechas propia de cada motor SQL.
     */
    public function scopeCriticos($query) {
        $general = self::diasCriticos();
        $propios = Material::whereNotNull('dias_criticos')->pluck('dias_criticos', 'id');

        return $query->where('status', '!=', 'consumed')->where(function ($q) use ($general, $propios) {
            $q->where(function ($g) use ($general, $propios) {
                $g->whereNotIn('material_id', $propios->keys()->all())
                  ->whereDate('expiration_date', '<=', Carbon::now()->addDays($general));
            });
            foreach ($propios->groupBy(fn ($dias) => $dias, true) as $dias => $grupo) {
                $q->orWhere(function ($p) use ($dias, $grupo) {
                    $p->whereIn('material_id', $grupo->keys()->all())
                      ->whereDate('expiration_date', '<=', Carbon::now()->addDays((int) $dias));
                });
            }
        });
    }
}
