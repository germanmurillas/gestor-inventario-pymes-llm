<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class QRScanTest extends TestCase
{
    use RefreshDatabase;

    public function test_lookup_devuelve_datos_del_lote(): void
    {
        $lote = Lote::factory()->create(['quantity' => 80]);

        $resp = $this->actingAs(User::factory()->create())
            ->getJson("/inventory/qr-lookup/{$lote->id}");

        $resp->assertOk()->assertJsonFragment(['cantidad' => 80.0]);
    }

    public function test_scan_salida_descuenta_stock(): void
    {
        $lote = Lote::factory()->create(['quantity' => 100]);
        $qr = json_encode(['id' => $lote->id, 'v' => 1]);

        $resp = $this->actingAs(User::factory()->create())
            ->from('/dashboard')
            ->post('/inventory/qr-scan', ['qr_data' => $qr, 'action' => 'salida', 'quantity' => 30]);

        $resp->assertRedirect();
        $this->assertEquals(70, $lote->fresh()->quantity);
        $this->assertDatabaseHas('movimientos', ['lote_id' => $lote->id, 'type' => 'salida']);
    }

    public function test_scan_salida_insuficiente_rechaza(): void
    {
        $lote = Lote::factory()->create(['quantity' => 5]);
        $qr = json_encode(['id' => $lote->id, 'v' => 1]);

        $resp = $this->actingAs(User::factory()->create())
            ->from('/dashboard')
            ->post('/inventory/qr-scan', ['qr_data' => $qr, 'action' => 'salida', 'quantity' => 50]);

        $resp->assertRedirect('/dashboard');
        $resp->assertSessionHasErrors('quantity');
        $this->assertEquals(5, $lote->fresh()->quantity);
    }

    public function test_el_escaner_encuentra_un_lote_por_su_numero(): void
    {
        $user = \App\Models\User::factory()->create(['role' => 'operario']);
        $lote = \App\Models\Lote::factory()->create(['batch_number' => 'HAR-01-260917-1']);

        $this->actingAs($user)->getJson('/inventory/qr-lookup-lote/har-01-260917-1')
            ->assertOk()->assertJsonPath('id', $lote->id)->assertJsonPath('lote', 'HAR-01-260917-1');
        $this->actingAs($user)->getJson('/inventory/qr-lookup-lote/NO-EXISTE-1')->assertNotFound();
    }
}
