<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class KanbanItem extends Model
{
    protected $table = 'kanban_items';

    protected $fillable = [
        'user_id',
        'title',
        'description',
        'column',
        'position',
        'is_pinned',
        'rag_context',
    ];

    protected function casts(): array
    {
        return [
            'is_pinned' => 'boolean',
            'position' => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function scopeOrdered($query)
    {
        return $query->orderBy('is_pinned', 'desc')
                     ->orderBy('position', 'asc')
                     ->orderBy('created_at', 'desc');
    }

    public function scopeByColumn($query, string $column)
    {
        return $query->where('column', $column)->ordered();
    }
}
