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
}
