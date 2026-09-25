<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class UserManagementTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crea_usuario(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->postJson('/api/users', [
            'name'     => 'Laura',
            'email'    => 'laura@p.com',
            'password' => 'secret123',
            'role'     => 'operario',
        ]);

        $resp->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'laura@p.com', 'role' => 'operario']);
    }

    public function test_admin_no_puede_autoeliminarse(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->deleteJson("/api/users/{$admin->id}")->assertStatus(422);
    }

    public function test_operario_no_gestiona_usuarios(): void
    {
        $operario = User::factory()->create(['role' => 'operario']);

        $this->actingAs($operario)->getJson('/api/users')->assertStatus(403);
        $this->actingAs($operario)->postJson('/api/users', [
            'name' => 'Intruso', 'email' => 'intruso@p.com', 'password' => 'secret123', 'role' => 'admin',
        ])->assertStatus(403);
        $this->assertDatabaseMissing('users', ['email' => 'intruso@p.com']);
    }

    public function test_operario_no_accede_a_api_keys_ni_proveedores(): void
    {
        $operario = User::factory()->create(['role' => 'operario']);

        $this->actingAs($operario)->getJson('/api/api-keys')->assertStatus(403);
        $this->actingAs($operario)->postJson('/api/llm-providers', ['key' => 'x'])->assertStatus(403);
    }

    public function test_registro_publico_siempre_crea_operario(): void
    {
        $this->post('/register', [
            'name' => 'Externo', 'email' => 'externo@p.com',
            'password' => 'secret123', 'password_confirmation' => 'secret123',
            'role' => 'admin',
        ]);

        $this->assertDatabaseHas('users', ['email' => 'externo@p.com', 'role' => 'operario']);
    }
}
