<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ChatHistory extends Model
{
    protected $table = 'chat_histories';

    protected $fillable = [
        'user_id',
        'session_id',
        'session_title',
        'prompt',
        'response',
        'source',
        'modelo',
        'tokens_entrada',
        'tokens_salida',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
