<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TransferTest extends TestCase
{
    use RefreshDatabase;

    public function test_transferencia_mueve_stock_y_crea_lote_destino(): void
    {
        $origen  = Bodega::factory()->create();
        $destino = Bodega::factory()->create();
        $lote = Lote::factory()->create([
            'bodega_id' => $origen->id, 'quantity' => 100, 'status' => 'active',
        ]);

        $resp = $this->actingAs(User::factory()->create())
            ->from('/dashboard')
            ->post('/inventory/transfer', [
                'lote_id'        => $lote->id,
                'from_bodega_id' => $origen->id,
                'to_bodega_id'   => $destino->id,
                'cantidad'       => 30,
            ]);

        $resp->assertRedirect();
        $this->assertEquals(70, $lote->fresh()->quantity);
        $this->assertDatabaseHas('lotes', ['bodega_id' => $destino->id, 'quantity' => 30]);
        $this->assertDatabaseHas('transferencias', ['lote_id' => $lote->id, 'cantidad' => 30]);
    }

    public function test_transferencia_misma_bodega_rechaza(): void
    {
        $b = Bodega::factory()->create();
        $lote = Lote::factory()->create(['bodega_id' => $b->id, 'quantity' => 50]);

        $resp = $this->actingAs(User::factory()->create())
            ->from('/dashboard')
            ->post('/inventory/transfer', [
                'lote_id'        => $lote->id,
                'from_bodega_id' => $b->id,
                'to_bodega_id'   => $b->id,
                'cantidad'       => 10,
            ]);

        $resp->assertSessionHasErrors('to_bodega_id');
    }
}
