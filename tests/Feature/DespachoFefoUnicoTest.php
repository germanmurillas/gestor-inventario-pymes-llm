<?php

namespace Tests\Feature;

use App\Exceptions\StockInsuficiente;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Revisión contra-tesis (5-oct-2026): el recorrido FEFO estaba copiado en varios despachos y sin
 * bloqueo de filas. Ahora vive solo en Lote::despacharFefo, que bloquea los lotes y verifica el saldo
 * dentro de la transacción.
 */
class DespachoFefoUnicoTest extends TestCase
{
    use RefreshDatabase;

    public function test_despacha_por_vencimiento_atravesando_lotes_y_registra_cada_salida(): void
    {
        $m = Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg']);
        $tarde = Lote::factory()->create(['material_id' => $m->id, 'quantity' => 50, 'expiration_date' => now()->addDays(40)]);
        $pronto = Lote::factory()->create(['material_id' => $m->id, 'quantity' => 30, 'expiration_date' => now()->addDays(5)]);
        Lote::factory()->create(['material_id' => $m->id, 'quantity' => 99, 'expiration_date' => now()->subDay()]); // vencido: no sale
        $u = User::factory()->create();

        $salidas = Lote::despacharFefo($m, 45, 'produccion', 'Prueba', $u->id);

        $this->assertSame([$pronto->id, $tarde->id], array_map(fn ($s) => $s['lote']->id, $salidas));
        $this->assertSame('consumed', $pronto->fresh()->status);
        $this->assertEquals(35, $tarde->fresh()->quantity);
        $this->assertEquals(45, Movimiento::where('type', 'salida')->sum('quantity'));
    }

    public function test_sin_saldo_despachable_lanza_la_excepcion_y_no_toca_nada(): void
    {
        $m = Material::factory()->create(['name' => 'Sal', 'unit' => 'kg']);
        Lote::factory()->create(['material_id' => $m->id, 'quantity' => 5, 'expiration_date' => now()->addDays(10)]);

        try {
            Lote::despacharFefo($m, 6, 'produccion', 'Prueba', null);
            $this->fail('Debía lanzar StockInsuficiente');
        } catch (StockInsuficiente $e) {
            $this->assertEquals(5, $e->disponible);
        }
        $this->assertSame(0, Movimiento::count());
    }

    public function test_el_despacho_multiple_es_todo_o_nada(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo']);
        $sal = Material::factory()->create(['name' => 'Sal']);
        $lh = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 50, 'expiration_date' => now()->addDays(10)]);
        Lote::factory()->create(['material_id' => $sal->id, 'quantity' => 1, 'expiration_date' => now()->addDays(10)]);

        $this->actingAs(User::factory()->create(['role' => 'admin']))->postJson('/inventory/consume-bulk', ['items' => [
            ['material_id' => $harina->id, 'quantity' => 10, 'reason' => 'produccion'],
            ['material_id' => $sal->id, 'quantity' => 5, 'reason' => 'produccion'],
        ]])->assertStatus(422)->assertJsonPath('error', fn ($t) => str_contains($t, 'Sal'));

        $this->assertEquals(50, $lh->fresh()->quantity);
        $this->assertSame(0, Movimiento::count());
    }
}
