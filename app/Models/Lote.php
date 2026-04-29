<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Carbon\Carbon;

class Lote extends Model {
    protected $fillable = [
        'material_id', 'bodega_id', 'batch_number', 'quantity',
        'unit_cost', 'expiration_date', 'status'
    ];

    protected $appends = [
        'days_until_expiration',
        'is_critical',
        'valor_total',
    ];

    protected function casts(): array {
        return [
            'expiration_date' => 'date',
            'quantity'        => 'float',
            'unit_cost'       => 'float',
        ];
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function material(): BelongsTo {
        return $this->belongsTo(Material::class);
    }

    public function bodega(): BelongsTo {
        return $this->belongsTo(Bodega::class);
    }

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
     * Lote crítico: vence en <= 15 días y no está consumido.
     * (Umbral ajustado de 7 a 15 días según criterio Prof. Héctor — auditabilidad temprana)
     */
    public function getIsCriticalAttribute(): bool {
        return $this->days_until_expiration <= 15
            && $this->days_until_expiration >= 0
            && $this->status !== 'consumed';
    }

    /** Valor económico total del lote: quantity × unit_cost */
    public function getValorTotalAttribute(): float {
        return round(($this->quantity ?? 0) * ($this->unit_cost ?? 0), 2);
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

    /** Lotes que vencen dentro de N días */
    public function scopeVenceEn($query, int $dias = 15) {
        return $query->where('status', 'active')
                     ->whereDate('expiration_date', '<=', Carbon::now()->addDays($dias))
                     ->whereDate('expiration_date', '>=', Carbon::now());
    }
}
