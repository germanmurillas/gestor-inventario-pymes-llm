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
}
