<?php

namespace Database\Factories;

use App\Models\ApiKey;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<ApiKey>
 */
class ApiKeyFactory extends Factory
{
    protected $model = ApiKey::class;

    public function definition(): array
    {
        return [
            'nombre'     => fake()->unique()->words(2, true),
            'key'        => 'sk-' . fake()->sha256(),
            'base_url'   => 'https://api.openai.com/v1',
            'model_name' => 'gpt-4o-mini',
            'tipo'       => fake()->randomElement(['opencode', 'openai', 'ollama']),
            'activo'     => true,
        ];
    }
}
