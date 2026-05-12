<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notification extends Model
{
    protected $table = 'notifications';

    protected $fillable = [
        'user_id', 'tipo', 'titulo', 'mensaje',
        'accion_url', 'icono', 'leida', 'leida_at',
    ];

    protected function casts(): array
    {
        return [
            'leida'    => 'boolean',
            'leida_at' => 'datetime',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeUnread($query)
    {
        return $query->where('leida', false);
    }

    public function scopeForUser($query, $userId = null)
    {
        return $query->where(function ($q) use ($userId) {
            $q->where('user_id', $userId)
              ->orWhereNull('user_id');
        });
    }
}
