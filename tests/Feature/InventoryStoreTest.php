<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class InventoryStoreTest extends TestCase
{
    use RefreshDatabase;

    public function test_admin_crea_material_con_lote_inicial(): void
    {
        $bodega = Bodega::factory()->create();
        $admin  = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->from('/dashboard')->post('/inventory/material', [
            'name'            => 'Cemento',
            'code'            => 'CEM-9',
            'bodega_id'       => $bodega->id,
            'stock_initial'   => 200,
            'expiration_date' => now()->addYear()->format('Y-m-d'),
            'batch_number'    => 'CEM-LT1',
        ]);

        $resp->assertRedirect()
             ->assertSessionHasNoErrors();
        $this->assertDatabaseHas('materials', ['code' => 'CEM-9']);
        $this->assertDatabaseHas('movimientos', ['type' => 'entrada', 'reason' => 'ingreso']);
    }
}
