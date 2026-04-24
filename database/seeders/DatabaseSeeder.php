<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Bodega;
use App\Models\Material;
use App\Models\Lote;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // 1. Usuario Admin
        User::create([
            'name' => 'Germán David',
            'email' => 'admin@pymetory.com',
            'password' => bcrypt('password'),
        ]);

        // 2. Bodegas Realistas
        $bodegaA = Bodega::create([
            'name' => 'Bodega Central de Suministros',
            'code' => 'BOD-CENTRAL',
            'description' => 'Almacén principal para materiales pesados y construcción.',
            'capacity' => 10000,
            'status' => 'active'
        ]);

        $bodegaB = Bodega::create([
            'name' => 'Estantería de Químicos y Pinturas',
            'code' => 'EST-QUIM',
            'description' => 'Zona climatizada para almacenamiento de solventes.',
            'capacity' => 2000,
            'status' => 'active'
        ]);

        // 3. Materiales Realistas
        $cemento = Material::create([
            'code' => 'MAT-001',
            'name' => 'Cemento Argos Gris (Saco 50kg)',
            'unit' => 'KG',
            'description' => 'Cemento de alta resistencia para estructuras.',
            'stock_min' => 1000,
            'stock_max' => 5000
        ]);

        $pintura = Material::create([
            'code' => 'MAT-002',
            'name' => 'Pintura Epóxica Azul Marín',
            'unit' => 'GL',
            'description' => 'Pintura de alta durabilidad para pisos industriales.',
            'stock_min' => 10,
            'stock_max' => 50
        ]);

        $varilla = Material::create([
            'code' => 'MAT-003',
            'name' => 'Varilla Corrugada 1/2 pulgada',
            'unit' => 'UND',
            'description' => 'Acero de refuerzo para concreto.',
            'stock_min' => 100,
            'stock_max' => 500
        ]);

        // 4. Lotes (Stock con fechas de vencimiento)
        Lote::create([
            'material_id' => $cemento->id,
            'bodega_id' => $bodegaA->id,
            'batch_number' => 'LT-CENT-001',
            'quantity' => 2500,
            'expiration_date' => now()->addMonths(6),
            'status' => 'active'
        ]);

        Lote::create([
            'material_id' => $pintura->id,
            'bodega_id' => $bodegaB->id,
            'batch_number' => 'LT-QUIM-099',
            'quantity' => 15,
            'expiration_date' => now()->addDays(4),
            'status' => 'active'
        ]);

        Lote::create([
            'material_id' => $varilla->id,
            'bodega_id' => $bodegaA->id,
            'batch_number' => 'LT-CENT-005',
            'quantity' => 120,
            'expiration_date' => now()->addYears(2),
            'status' => 'active'
        ]);
    }
}
