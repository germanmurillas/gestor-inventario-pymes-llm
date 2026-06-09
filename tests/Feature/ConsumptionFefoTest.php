<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ConsumptionFefoTest extends TestCase
{
    use RefreshDatabase;

    public function test_consume_fefo_descuenta_del_lote_mas_proximo_a_vencer(): void
    {
        $mat = Material::factory()->create();
        $loteViejo = Lote::factory()->create([
            'material_id' => $mat->id, 'quantity' => 40, 'expiration_date' => now()->addDays(5),
        ]);
        $loteNuevo = Lote::factory()->create([
            'material_id' => $mat->id, 'quantity' => 100, 'expiration_date' => now()->addDays(60),
        ]);

        $resp = $this->actingAs(User::factory()->create())
            ->postJson('/inventory/consume-fefo', [
                'material_id' => $mat->id, 'quantity' => 50, 'reason' => 'produccion',
            ]);

        $resp->assertOk()->assertJsonFragment(['success' => true]);
        $this->assertEquals(0, $loteViejo->fresh()->quantity);
        $this->assertEquals('consumed', $loteViejo->fresh()->status);
        $this->assertEquals(90, $loteNuevo->fresh()->quantity);
    }

    public function test_consume_fefo_sin_stock_devuelve_422(): void
    {
        $mat = Material::factory()->create();
        Lote::factory()->create(['material_id' => $mat->id, 'quantity' => 10]);

        $resp = $this->actingAs(User::factory()->create())
            ->postJson('/inventory/consume-fefo', [
                'material_id' => $mat->id, 'quantity' => 999, 'reason' => 'produccion',
            ]);

        $resp->assertStatus(422);
    }
}
