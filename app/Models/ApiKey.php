<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ApiKey extends Model
{
    use HasFactory;

    protected $fillable = [
        'nombre',
        'key',
        'base_url',
        'model_name',
        'tipo',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'activo' => 'boolean',
            'key'    => 'encrypted', // Cifrado transparente en DB; se descifra al leer
        ];
    }
}
