<?php

namespace Tests\Feature\Flujos;

use App\Models\Bodega;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_flujo_crear_material_consumir_fefo_kardex(): void
    {
        $bodega = Bodega::factory()->create();
        $admin  = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->from('/dashboard')->post('/inventory/material', [
            'name'            => 'Harina Integral',
            'code'            => 'HAR-FLOW',
            'bodega_id'       => $bodega->id,
            'stock_initial'   => 200,
            'expiration_date' => now()->addMonths(6)->format('Y-m-d'),
            'batch_number'    => 'HAR-LT-FLOW',
            'description'     => 'Test de flujo completo',
        ])->assertRedirect()->assertSessionHasNoErrors();

        $this->assertDatabaseHas('materials', ['code' => 'HAR-FLOW']);
        $this->assertDatabaseHas('movimientos', ['type' => 'entrada', 'reason' => 'ingreso']);

        $material = Material::where('code', 'HAR-FLOW')->first();

        $resp = $this->actingAs($admin)
            ->postJson('/inventory/consume-fefo', [
                'material_id' => $material->id, 'quantity' => 30, 'reason' => 'produccion',
            ]);

        $resp->assertOk()->assertJsonFragment(['success' => true]);

        $this->assertDatabaseHas('movimientos', ['type' => 'salida', 'reason' => 'produccion']);
    }
}
