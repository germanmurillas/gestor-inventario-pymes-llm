<?php

namespace Tests\Feature\Flujos;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuthFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_flujo_login_dashboard_logout(): void
    {
        $user = User::factory()->create(['password' => bcrypt('secret123')]);

        $this->post('/login', ['email' => $user->email, 'password' => 'secret123'])
             ->assertRedirect('/dashboard');

        $this->actingAs($user)->get('/dashboard')->assertOk();

        $this->post('/logout')->assertRedirect('/');
    }
}
