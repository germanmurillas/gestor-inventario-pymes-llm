<?php

namespace Tests\Feature\Flujos;

use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QrFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_flujo_qr_crear_lookup_escanear(): void
    {
        $lote = Lote::factory()->create(['quantity' => 100]);
        $user = User::factory()->create();
        $qr = json_encode(['id' => $lote->id, 'v' => 1]);

        $lookup = $this->actingAs($user)->getJson("/inventory/qr-lookup/{$lote->id}");
        $lookup->assertOk()->assertJsonFragment(['cantidad' => 100.0]);

        $scan = $this->actingAs($user)->from('/dashboard')
            ->post('/inventory/qr-scan', ['qr_data' => $qr, 'action' => 'salida', 'quantity' => 25]);
        $scan->assertRedirect();

        $this->assertEquals(75, $lote->fresh()->quantity);
        $this->assertDatabaseHas('movimientos', ['lote_id' => $lote->id, 'type' => 'salida', 'quantity' => 25]);
    }
}
