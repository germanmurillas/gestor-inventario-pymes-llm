<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Material extends Model {
    protected $fillable = [
        'code', 'name', 'unit', 'description', 
        'stock_min', 'stock_max'
    ];

    public function lotes(): HasMany {
        return $this->hasMany(Lote::class);
    }
}
