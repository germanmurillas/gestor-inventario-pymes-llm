<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class SettingsTest extends TestCase
{
    use RefreshDatabase;

    public function test_operario_no_puede_ver_settings(): void
    {
        $op = User::factory()->create(['role' => 'operario']);

        $this->actingAs($op)->get('/settings')->assertStatus(403);
    }

    public function test_admin_actualiza_settings(): void
    {
        DB::table('settings')->insert([
            'clave' => 'app_nombre', 'valor' => 'X', 'tipo' => 'string', 'grupo' => 'general',
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->putJson('/settings', [
            'settings' => ['app_nombre' => 'PYMETORY'],
        ]);

        $resp->assertOk();
        $this->assertDatabaseHas('settings', ['clave' => 'app_nombre', 'valor' => 'PYMETORY']);
    }
}
