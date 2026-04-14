<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Carbon\Carbon;

class Lote extends Model {
    protected $fillable = [
        'material_id', 'batch_number', 'quantity', 
        'expiration_date', 'status'
    ];

    protected function casts(): array {
        return [
            'expiration_date' => 'date',
        ];
    }

    public function material(): BelongsTo {
        return $this->belongsTo(Material::class);
    }

    public function getDaysUntilExpirationAttribute(): int {
        return Carbon::now()->diffInDays($this->expiration_date, false);
    }

    public function getIsCriticalAttribute(): bool {
        return $this->days_until_expiration <= 7 && $this->status !== 'consumed';
    }

    // First-Expired-First-Out Global Scope implementation
    public function scopeFefoOrder($query) {
        return $query->where('status', '!=', 'consumed')
                     ->orderBy('expiration_date', 'asc');
    }
}
