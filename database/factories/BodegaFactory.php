<?php

namespace Database\Factories;

use App\Models\Bodega;
use Illuminate\Database\Eloquent\Factories\Factory;

class BodegaFactory extends Factory
{
    protected $model = Bodega::class;

    public function definition(): array
    {
        return [
            'name'     => fake()->city() . ' Bodega',
            'code'     => 'BOD-' . fake()->unique()->numberBetween(100, 999),
            'capacity' => 1000,
            'status'   => 'active',
        ];
    }
}
