<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model {
    protected $fillable = ['nombre', 'color', 'icono', 'descripcion', 'active'];

    protected function casts(): array {
        return [
            'active' => 'boolean',
        ];
    }

    /** Materiales que tienen este tag */
    public function materials(): BelongsToMany {
        return $this->belongsToMany(Material::class, 'material_tag');
    }

    /** Solo tags activos */
    public function scopeActive($query) {
        return $query->where('active', true);
    }
}
