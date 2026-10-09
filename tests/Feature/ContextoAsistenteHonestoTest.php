<?php

namespace Tests\Feature;

use App\Http\Controllers\ChatLLMController;
use App\Models\Lote;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Revisión contra-tesis (5-oct-2026): el asistente no debe sugerir despachar lotes vencidos, sus
 * totales deben salir de la base de datos y no de una lista recortada, y debe avisar cuando recorta.
 */
class ContextoAsistenteHonestoTest extends TestCase
{
    use RefreshDatabase;

    private function contexto(string $pregunta, string $intencion): string
    {
        $c = app(ChatLLMController::class);
        $m = new \ReflectionMethod($c, 'buildRagContext');
        $m->setAccessible(true);

        return $m->invoke($c, $pregunta, $intencion);
    }

    public function test_las_alertas_separan_los_vencidos_e_indican_que_no_se_despachan(): void
    {
        $pan = Material::factory()->create(['name' => 'Pan perro']);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'PAN-VENCIDO', 'expiration_date' => now()->subDays(2)]);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'PAN-PRONTO', 'expiration_date' => now()->addDays(2)]);

        $ctx = $this->contexto('¿Qué hay que despachar ya antes de que se venza?', 'critical_alerts');

        $porVencer = strpos($ctx, 'POR VENCER');
        $vencidos = strpos($ctx, 'VENCIDOS (NO se despachan');
        $this->assertNotFalse($porVencer);
        $this->assertNotFalse($vencidos);
        $this->assertGreaterThan($porVencer, strpos($ctx, 'PAN-PRONTO'));
        $this->assertLessThan($vencidos, strpos($ctx, 'PAN-PRONTO'));
        $this->assertGreaterThan($vencidos, strpos($ctx, 'PAN-VENCIDO'));
        $this->assertStringContainsString('No recomiendes despachar', $ctx);
    }

    public function test_sin_vencidos_no_agrega_la_seccion_ni_la_instruccion(): void
    {
        $pan = Material::factory()->create(['name' => 'Pan perro']);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'PAN-PRONTO', 'expiration_date' => now()->addDays(2)]);

        $ctx = $this->contexto('¿Qué está por vencer?', 'critical_alerts');

        $this->assertStringContainsString('PAN-PRONTO', $ctx);
        $this->assertStringNotContainsString('VENCIDOS (NO se despachan', $ctx);
    }

    public function test_el_total_de_un_insumo_suma_todos_sus_lotes_aunque_la_lista_se_recorte(): void
    {
        // 20 lotes de harina: la lista general muestra 15, pero el total debe contar los 20.
        $harina = Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg']);
        for ($i = 1; $i <= 20; $i++) {
            Lote::factory()->create(['material_id' => $harina->id, 'batch_number' => "HAR-{$i}", 'quantity' => 10, 'expiration_date' => now()->addDays($i)]);
        }

        $ctx = $this->contexto('¿Cuánto inventario tenemos?', 'stock_check');

        $this->assertStringContainsString('TOTAL Harina de trigo: 200', $ctx);
        $this->assertStringContainsString('en 20 lote(s)', $ctx);
        $this->assertStringContainsString('Se muestran 15 de 20 lotes', $ctx);
    }

    public function test_la_consulta_al_asistente_tiene_limite_de_peticiones(): void
    {
        $ruta = collect(app('router')->getRoutes())->first(fn ($r) => $r->uri() === 'chat-rag' && in_array('POST', $r->methods()));

        $this->assertContains('throttle:20,1', $ruta->gatherMiddleware());
    }

    public function test_los_nombres_de_usuarios_solo_van_al_modelo_si_la_pregunta_los_pide(): void
    {
        $m = Material::factory()->create(['name' => 'Sal refinada', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $m->id, 'quantity' => 10]);
        $u = User::factory()->create(['name' => 'Claudia Pérez']);
        \App\Models\Movimiento::create(['lote_id' => $lote->id, 'user_id' => $u->id, 'type' => 'salida', 'quantity' => 2, 'reason' => 'produccion']);

        $this->assertStringNotContainsString('Claudia', $this->contexto('¿Cuál fue el último movimiento de la sal refinada?', 'movements'));
        $this->assertStringContainsString('Claudia Pérez', $this->contexto('¿Quién hizo el último movimiento de la sal refinada?', 'movements'));
    }
}
