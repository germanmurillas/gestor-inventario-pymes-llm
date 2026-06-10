<?php

namespace Database\Factories;

use App\Models\Material;
use Illuminate\Database\Eloquent\Factories\Factory;

class MaterialFactory extends Factory
{
    protected $model = Material::class;

    public function definition(): array
    {
        return [
            'code'         => 'MAT-' . fake()->unique()->numberBetween(1000, 9999),
            'name'         => fake()->words(2, true),
            'unit'         => 'kg',
            'description'  => fake()->sentence(),
            'stock_min'    => 10,
            'stock_minimo' => 50,
        ];
    }
}
