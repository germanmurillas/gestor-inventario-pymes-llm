<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApiKeyTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crea_api_key(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->postJson('/api/api-keys', [
            'nombre'    => 'OpenCode',
            'key'       => 'sk-demo-123456789',
            'tipo'      => 'opencode',
            'base_url'  => 'https://opencode.ai/zen/go/v1',
            'model_name' => 'deepseek-v4-pro',
        ]);

        $resp->assertStatus(201);

        $this->assertEquals('sk-demo-123456789', ApiKey::first()->key);
    }

    public function test_listado_tolera_clave_cifrada_con_otra_app_key(): void
    {
        $admin = \App\Models\User::factory()->create(['role' => 'admin']);
        $id = \Illuminate\Support\Facades\DB::table('api_keys')->insertGetId([
            'nombre' => 'Vieja', 'key' => 'eyJpdiI6ImJhc3VyYSJ9', 'tipo' => 'opencode', 'activo' => false,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->actingAs($admin)->getJson('/api/api-keys')
            ->assertOk()
            ->assertJsonFragment(['id' => $id, 'key_masked' => 'Ilegible: vuelve a ingresarla']);
    }
}
