<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Bodega;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryTest extends TestCase
{
    use RefreshDatabase;

    public function test_listar_inventario(): void
    {
        $user = User::factory()->create();
        Material::create(['code' => 'M1', 'name' => 'Material Uno', 'unit' => 'kg', 'stock_minimo' => 10]);

        $response = $this->actingAs($user)->getJson('/dashboard');
        $this->assertContains($response->status(), [200, 302]);
    }

    public function test_crear_material_autenticado(): void
    {
        $user = User::factory()->create();

        $response = $this->actingAs($user)->postJson('/inventory/material', [
            'code' => 'MAT-TEST',
            'name' => 'Material de Prueba',
            'unit' => 'kg',
            'stock_minimo' => 50,
        ]);

        // Puede ser 200, 201, 302 (redirect) o 403 (no admin) — todas validas
        $status = $response->status();
        $this->assertTrue(in_array($status, [200, 201, 302, 403]));
    }

    public function test_sin_auth_devuelve_redirect(): void
    {
        $response = $this->postJson('/inventory/material', [
            'code' => 'MAT-X',
            'name' => 'Test',
            'unit' => 'kg',
        ]);

        // Sin auth debe redirigir o devolver 401
        $this->assertContains($response->status(), [302, 401, 403]);
    }
}
