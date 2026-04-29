<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class TagSeeder extends Seeder
{
    public function run(): void
    {
        $tags = [
            ['nombre' => 'Perecedero',    'color' => '#ef4444', 'icono' => 'Clock',       'descripcion' => 'Materiales con fecha de vencimiento crítica'],
            ['nombre' => 'Químico',       'color' => '#f97316', 'icono' => 'FlaskConical', 'descripcion' => 'Productos químicos que requieren manejo especial'],
            ['nombre' => 'Sólido',        'color' => '#eab308', 'icono' => 'Box',          'descripcion' => 'Materiales en estado sólido (harinas, azúcares, etc.)'],
            ['nombre' => 'Líquido',       'color' => '#06b6d4', 'icono' => 'Droplets',     'descripcion' => 'Materiales en estado líquido'],
            ['nombre' => 'Refrigeración', 'color' => '#3b82f6', 'icono' => 'Thermometer',  'descripcion' => 'Requiere cadena de frío'],
            ['nombre' => 'Alta Rotación', 'color' => '#8b5cf6', 'icono' => 'TrendingUp',   'descripcion' => 'Materiales de uso frecuente y alta rotación'],
            ['nombre' => 'Importado',     'color' => '#6366f1', 'icono' => 'Globe',        'descripcion' => 'Materiales de origen importado'],
            ['nombre' => 'Granel',        'color' => '#10b981', 'icono' => 'Package',      'descripcion' => 'Material almacenado a granel sin empaque individual'],
        ];

        foreach ($tags as $tag) {
            DB::table('tags')->updateOrInsert(
                ['nombre' => $tag['nombre']],
                array_merge($tag, [
                    'created_at' => now(),
                    'updated_at' => now(),
                ])
            );
        }
    }
}
