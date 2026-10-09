<?php

namespace Tests\Feature;

use App\Http\Controllers\ChatLLMController;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use App\Services\ProyeccionInventario;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Analítica predictiva y diagnóstica sobre el Kardex (RF-09 y RF-10). */
class ProyeccionInventarioTest extends TestCase
{
    use RefreshDatabase;

    private Carbon $hoy;
    private User $usuario;

    protected function setUp(): void
    {
        parent::setUp();
        $this->hoy = Carbon::parse('2026-09-28');
        $this->usuario = User::factory()->create();
    }

    private function salida(Lote $lote, float $cantidad, string $motivo, string $fecha): void
    {
        $m = new Movimiento(['lote_id' => $lote->id, 'user_id' => $this->usuario->id, 'type' => 'salida', 'quantity' => $cantidad, 'reason' => $motivo]);
        $m->created_at = $m->updated_at = Carbon::parse($fecha);
        $m->save();
    }

    private function invokePrivate(string $method, ...$args)
    {
        $c = app(ChatLLMController::class);
        $m = new \ReflectionMethod($c, $method);
        $m->setAccessible(true);
        return $m->invoke($c, ...$args);
    }

    public function test_calcula_consumo_diario_cobertura_y_agotamiento(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg', 'stock_minimo' => 0]);
        $lote = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 280, 'status' => 'active']);
        // 28 días × 10 kg = 280 kg en la ventana: 10 kg/día; 280 kg alcanzan 28 días.
        for ($d = 1; $d <= 28; $d++) $this->salida($lote, 10, 'produccion', $this->hoy->copy()->subDays($d)->setTime(10, 0)->toDateTimeString());

        $f = app(ProyeccionInventario::class)->proyeccion([$harina->id], 28, $this->hoy)->first();

        $this->assertEquals(10.0, $f['consumo_diario']);
        $this->assertEquals(28.0, $f['dias_cobertura']);
        $this->assertSame('2026-10-26', $f['fecha_agotamiento']);
        $this->assertNull($f['punto_reorden'], 'Sin días de entrega no se calcula el punto de reorden');
    }

    public function test_transferencias_y_ajustes_no_cuentan_como_consumo(): void
    {
        $sal = Material::factory()->create(['name' => 'Sal refinada']);
        $lote = Lote::factory()->create(['material_id' => $sal->id, 'quantity' => 100, 'status' => 'active']);
        $this->salida($lote, 14, 'venta', '2026-09-24 09:00:00');
        $this->salida($lote, 50, 'transferencia', '2026-09-21 09:00:00');
        $this->salida($lote, 30, 'ajuste', '2026-09-22 09:00:00');

        $f = app(ProyeccionInventario::class)->proyeccion([$sal->id], 7, $this->hoy)->first();

        $this->assertEquals(14.0, $f['consumo_ventana']);
        $this->assertEquals(2.0, $f['consumo_diario']);
    }

    public function test_punto_de_reorden_y_estado_reponer(): void
    {
        $semilla = Material::factory()->create(['name' => 'Semilla de ajonjolí', 'stock_minimo' => 10, 'dias_entrega' => 8]);
        $lote = Lote::factory()->create(['material_id' => $semilla->id, 'quantity' => 60, 'status' => 'active']);
        for ($d = 1; $d <= 7; $d++) $this->salida($lote, 7, 'produccion', $this->hoy->copy()->subDays($d)->toDateTimeString());

        $f = app(ProyeccionInventario::class)->proyeccion([$semilla->id], 7, $this->hoy)->first();

        // 7 kg/día × 8 días + 10 de mínimo = 66 > 60 de existencia: hay que pedir ya.
        $this->assertEquals(66.0, $f['punto_reorden']);
        $this->assertSame('pedir', $f['estado']);
        $this->assertFalse($f['bajo_minimo']);
    }

    public function test_indica_la_fecha_limite_para_pedir(): void
    {
        $azucar = Material::factory()->create(['name' => 'Azúcar', 'stock_minimo' => 0, 'dias_entrega' => 5]);
        $lote = Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 100, 'status' => 'active']);
        for ($d = 1; $d <= 7; $d++) $this->salida($lote, 2, 'produccion', $this->hoy->copy()->subDays($d)->toDateTimeString());

        $f = app(ProyeccionInventario::class)->proyeccion([$azucar->id], 7, $this->hoy)->first();

        // Reorden = 2 × 5 = 10; la existencia llega a 10 en (100 - 10) / 2 = 45 días.
        $this->assertSame('ok', $f['estado']);
        $this->assertSame('2026-11-12', $f['pedir_antes_de']);
    }

    public function test_consumo_por_semana_es_continuo_y_suma_bien(): void
    {
        $leva = Material::factory()->create(['name' => 'Levadura']);
        $lote = Lote::factory()->create(['material_id' => $leva->id, 'quantity' => 500, 'status' => 'active']);
        $this->salida($lote, 4, 'produccion', '2026-09-22 08:00:00'); // semana del lunes 21
        $this->salida($lote, 6, 'venta', '2026-09-24 08:00:00');      // misma semana
        $this->salida($lote, 5, 'produccion', '2026-09-08 08:00:00'); // semana del lunes 7

        $serie = app(ProyeccionInventario::class)->consumoPorPeriodo($leva->id, 'semana', 4, $this->hoy);

        $this->assertCount(4, $serie);
        $this->assertSame(['2026-09-07', '2026-09-14', '2026-09-21', '2026-09-28'], array_column($serie, 'desde'));
        $this->assertSame([5.0, 0.0, 10.0, 0.0], array_column($serie, 'cantidad'));
    }

    public function test_variacion_desglosa_por_motivo_y_compara_periodos(): void
    {
        $azucar = Material::factory()->create(['name' => 'Azúcar']);
        $lote = Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 500, 'status' => 'active']);
        $this->salida($lote, 20, 'produccion', '2026-09-25 08:00:00');
        $this->salida($lote, 5, 'desperdicio', '2026-09-26 08:00:00');
        $this->salida($lote, 8, 'produccion', '2026-09-18 08:00:00');

        $v = app(ProyeccionInventario::class)->variacion($azucar->id, 7, $this->hoy);

        $this->assertEquals(25.0, $v['consumo_actual']);
        $this->assertEquals(8.0, $v['consumo_anterior']);
        $this->assertContains('desperdicio', array_column($v['actual'], 'motivo'));
    }

    public function test_endpoint_requiere_sesion_y_devuelve_la_proyeccion(): void
    {
        $this->getJson('/proyeccion')->assertUnauthorized();

        Material::factory()->create(['name' => 'Harina']);
        $this->actingAs($this->usuario)->getJson('/proyeccion')
            ->assertOk()->assertJsonStructure(['ventana_dias', 'insumos' => [['material_id', 'dias_cobertura', 'punto_reorden', 'estado']]]);
    }

    public function test_el_administrador_registra_los_dias_de_entrega(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $m = Material::factory()->create();

        $this->actingAs($admin)->put("/inventory/material/{$m->id}", ['stock_minimo' => 5, 'dias_entrega' => 8])->assertRedirect();

        $this->assertSame(8, $m->fresh()->dias_entrega);
    }

    public function test_clasifica_preguntas_de_pronostico_y_consumo_sin_romper_las_existentes(): void
    {
        $this->assertSame('forecast', $this->invokePrivate('classifyQuery', '¿Cuándo se me acaba la harina?'));
        $this->assertSame('forecast', $this->invokePrivate('classifyQuery', '¿Para cuántos días alcanza el azúcar?'));
        $this->assertSame('forecast', $this->invokePrivate('classifyQuery', '¿Cuándo hay que pedir levadura?'));
        $this->assertSame('consumption', $this->invokePrivate('classifyQuery', '¿Cuánto consumimos de harina esta semana?'));
        $this->assertSame('consumption', $this->invokePrivate('classifyQuery', '¿Por qué bajó tanto el azúcar?'));
        // Preguntas de las baterías de evaluación que deben seguir en su categoría.
        $this->assertSame('critical_alerts', $this->invokePrivate('classifyQuery', '¿Qué lotes son urgentes de consumir?'));
        $this->assertSame('low_stock', $this->invokePrivate('classifyQuery', '¿Qué nos hace falta pedir?'));
        $this->assertSame('expiration', $this->invokePrivate('classifyQuery', '¿Cuándo vence la levadura fresca prensada?'));
    }

    public function test_pregunta_general_de_consumo_no_toma_palabras_comunes_como_insumo(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 100, 'status' => 'active']);
        $this->salida($lote, 12, 'produccion', now()->subDays(2)->toDateTimeString());

        $ctx = $this->invokePrivate('buildRagContext', '¿Qué se consumió más este mes?', 'consumption');

        $this->assertStringNotContainsString('MATERIAL NO ENCONTRADO', $ctx);
        $this->assertStringContainsString('Harina de trigo: 12', $ctx);
    }

    public function test_pronostico_de_material_inexistente_no_muestra_otros(): void
    {
        Material::factory()->create(['name' => 'Harina de trigo']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Cuándo se acaba el chocolate?', 'forecast');

        $this->assertStringContainsString('MATERIAL NO ENCONTRADO', $ctx);
        $this->assertStringNotContainsString('PROYECCIÓN', $ctx);
    }

    public function test_la_ventana_son_los_28_dias_completos_anteriores_sin_el_dia_en_curso(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 500, 'status' => 'active', 'expiration_date' => '2027-01-01']);
        $this->salida($lote, 28, 'produccion', $this->hoy->copy()->subDays(28)->setTime(8, 0)->toDateTimeString());
        $this->salida($lote, 50, 'produccion', $this->hoy->copy()->setTime(9, 0)->toDateTimeString()); // hoy: no cuenta
        $this->salida($lote, 99, 'produccion', $this->hoy->copy()->subDays(29)->setTime(9, 0)->toDateTimeString()); // fuera de la ventana

        $f = app(ProyeccionInventario::class)->proyeccion([$harina->id], 28, $this->hoy)->first();

        $this->assertEquals(28, $f['consumo_ventana']);
        $this->assertEquals(1, $f['consumo_diario']);
    }

    public function test_los_lotes_vencidos_no_cuentan_como_existencia(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg']);
        Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 40, 'status' => 'active', 'expiration_date' => $this->hoy->copy()->subDay()]);
        Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 60, 'status' => 'active', 'expiration_date' => $this->hoy->copy()->addDays(10)]);

        $f = app(ProyeccionInventario::class)->proyeccion([$harina->id], 28, $this->hoy)->first();

        $this->assertEquals(60, $f['stock']);
    }
}
