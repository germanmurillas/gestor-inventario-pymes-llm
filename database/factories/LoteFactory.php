<?php

namespace Database\Factories;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Bodega;
use Illuminate\Database\Eloquent\Factories\Factory;

class LoteFactory extends Factory
{
    protected $model = Lote::class;

    public function definition(): array
    {
        return [
            'material_id'     => Material::factory(),
            'bodega_id'       => Bodega::factory(),
            'batch_number'    => 'LT-' . fake()->unique()->numberBetween(1000, 9999),
            'quantity'        => 100,
            'unit_cost'       => 5.50,
            'expiration_date' => now()->addDays(30),
            'status'          => 'active',
        ];
    }
}
