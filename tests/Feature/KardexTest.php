<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Bodega;
use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KardexTest extends TestCase
{
    use RefreshDatabase;

    public function test_crear_lote_con_datos(): void
    {
        $material = Material::create(['code' => 'MAT-K', 'name' => 'Producto Kardex', 'unit' => 'kg', 'stock_minimo' => 10]);
        $bodega = Bodega::create(['code' => 'BOD-K', 'name' => 'Bodega Kardex']);

        $lote = Lote::create([
            'material_id' => $material->id,
            'bodega_id' => $bodega->id,
            'batch_number' => 'K-101',
            'quantity' => 100,
            'expiration_date' => now()->addDays(30),
        ]);

        $this->assertNotNull(Lote::find($lote->id));
        $this->assertEquals(100, $lote->quantity);
    }

    public function test_consumo_reduce_stock(): void
    {
        $user = User::factory()->create();
        $material = Material::create(['code' => 'MAT-H', 'name' => 'Producto Historial', 'unit' => 'kg', 'stock_minimo' => 10]);
        $bodega = Bodega::create(['code' => 'BOD-H', 'name' => 'Bodega Historial']);
        $lote = Lote::create(['material_id' => $material->id, 'bodega_id' => $bodega->id, 'batch_number' => 'H-202', 'quantity' => 200, 'expiration_date' => now()->addDays(60)]);

        $response = $this->actingAs($user)->postJson('/inventory/lote/' . $lote->id . '/consume', [
            'quantity' => 30,
            'reason' => 'produccion',
        ]);

        $this->assertContains($response->status(), [200, 302]);
        $lote->refresh();
        $this->assertLessThan(200, $lote->quantity);
    }
}
