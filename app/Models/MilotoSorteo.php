<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/**
 * @property int    $idx          Orden cronológico ascendente (1 = más antiguo)
 * @property string $fecha
 * @property int    $b1
 * @property int    $b2
 * @property int    $b3
 * @property int    $b4
 * @property int    $b5
 * @property array  $numeros_json
 * @property int    $suma
 */
class MilotoSorteo extends Model
{
    protected $table = 'miloto_sorteos';

    public const UPDATED_AT = null; // solo created_at

    protected $fillable = [
        'idx', 'fecha', 'b1', 'b2', 'b3', 'b4', 'b5', 'numeros_json',
    ];

    protected $casts = [
        'fecha'        => 'date:Y-m-d',
        'numeros_json' => 'array',
    ];

    /** Balotas como array ordenado ASC. */
    public function numeros(): array
    {
        return [$this->b1, $this->b2, $this->b3, $this->b4, $this->b5];
    }
}
