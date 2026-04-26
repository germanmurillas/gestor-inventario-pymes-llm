<?php

namespace Database\Seeders;

use App\Models\Bodega;
use App\Models\Lote;
use Illuminate\Database\Seeder;

class BodegaSeeder extends Seeder
{
    public function run(): void
    {
        $b1 = Bodega::create([
            'name' => 'Bodega de Insumos Secos',
            'code' => 'BOD-SEC-01',
            'description' => 'Almacenamiento de harinas, granos y productos no perecederos a temperatura ambiente.',
            'capacity' => 5000.00, // 5 Tons
            'status' => 'active'
        ]);

        $b2 = Bodega::create([
            'name' => 'Cava de Materia Prima Fría',
            'code' => 'BOD-FRIA-01',
            'description' => 'Cuarto frío para lácteos y aditivos sensibles al calor.',
            'capacity' => 1500.00, // 1.5 Tons
            'status' => 'active'
        ]);

        // Asignamos todos los lotes actuales a la Bodega 1 por defecto para la demo
        Lote::whereNull('bodega_id')->update(['bodega_id' => $b1->id]);
    }
}
