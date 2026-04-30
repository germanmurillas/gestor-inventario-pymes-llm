<?php
namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;

class Tag extends Model {
    protected $fillable = ['nombre', 'color', 'icono', 'descripcion'];

    /** Materiales que tienen este tag */
    public function materials(): BelongsToMany {
        return $this->belongsToMany(Material::class, 'material_tag');
    }
}
