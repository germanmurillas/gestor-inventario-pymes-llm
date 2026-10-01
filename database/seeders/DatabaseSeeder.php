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
        // Configuración y etiquetas del sistema, luego la demo del caso de estudio (panadería).
        $this->call([
            TagSeeder::class,
            SettingsSeeder::class,
            LlmPreciosSeeder::class,
            PanaderiaDemoSeeder::class,
        ]);
    }
}
