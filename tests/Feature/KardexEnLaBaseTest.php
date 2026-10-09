<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Revisión contra-tesis (5-oct-2026): la inmutabilidad del Kardex no dependía solo de Eloquent; un
 * DB::table() o SQL directo la saltaba. Ahora la base rechaza UPDATE y DELETE en `movimientos`.
 */
class KardexEnLaBaseTest extends TestCase
{
    use RefreshDatabase;

    private function movimiento(): Movimiento
    {
        $lote = Lote::factory()->create(['quantity' => 10]);
        return Movimiento::create(['lote_id' => $lote->id, 'user_id' => User::factory()->create()->id, 'type' => 'salida', 'quantity' => 1, 'reason' => 'produccion']);
    }

    public function test_la_base_rechaza_modificar_un_movimiento_aunque_se_salte_eloquent(): void
    {
        $m = $this->movimiento();

        $this->expectException(QueryException::class);
        DB::table('movimientos')->where('id', $m->id)->update(['quantity' => 999]);
    }

    public function test_la_base_rechaza_borrar_un_movimiento_aunque_se_salte_eloquent(): void
    {
        $m = $this->movimiento();

        try {
            DB::table('movimientos')->where('id', $m->id)->delete();
            $this->fail('La base debía rechazar el borrado');
        } catch (QueryException $e) {
            $this->assertStringContainsString('inmutable', $e->getMessage());
        }
        $this->assertSame(1, Movimiento::count());
    }

    public function test_un_despacho_en_gramos_cuadra_el_lote_con_el_kardex(): void
    {
        $m = Material::factory()->create(['unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $m->id, 'quantity' => 1.000, 'expiration_date' => now()->addDays(10)]);

        Lote::despacharFefo($m, 0.004, 'produccion', 'Prueba de gramos', User::factory()->create()->id);

        $this->assertEquals(0.996, (float) DB::table('lotes')->where('id', $lote->id)->value('quantity'));
        $this->assertEquals(0.004, (float) DB::table('movimientos')->where('lote_id', $lote->id)->value('quantity'));
    }
}
