<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use App\Services\ProyeccionInventario;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Pedidos de la administradora en la prueba con usuario (8-oct-2026) para usar el sistema con datos
 * reales: devolver al lote lo que sobró, confirmar vencimientos estimados, bodegas por grupo,
 * presentaciones, insumos sin existencia visibles y un tema de color por usuario.
 */
class PedidosEmpresaTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        app()->setLocale('es');
    }

    private function admin(): User { return User::factory()->create(['role' => 'admin']); }

    private function loteConSalida(float $stock, float $salida): array
    {
        $usuario = $this->admin();
        $m = Material::factory()->create(['name' => 'Ajonjolí', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $m->id, 'quantity' => $stock, 'status' => 'active']);
        Movimiento::create(['lote_id' => $lote->id, 'user_id' => $usuario->id, 'type' => 'salida', 'quantity' => $salida, 'reason' => 'produccion']);
        return [$usuario, $lote];
    }

    public function test_devolver_sobrante_suma_al_mismo_lote_con_un_movimiento_nuevo(): void
    {
        [$usuario, $lote] = $this->loteConSalida(20, 25);

        $this->actingAs($usuario)->post("/inventory/lote/{$lote->id}/devolver", ['cantidad' => 3, 'nota' => 'sobró en la tarde'])
            ->assertSessionHas('success');

        $this->assertEquals(23, $lote->fresh()->quantity);
        $mov = Movimiento::where('reason', 'devolucion')->first();
        $this->assertSame('entrada', $mov->type);
        $this->assertStringContainsString('sobró en la tarde', $mov->description);
    }

    public function test_no_se_devuelve_mas_de_lo_que_salio_del_lote(): void
    {
        [$usuario, $lote] = $this->loteConSalida(20, 5);

        $this->actingAs($usuario)->post("/inventory/lote/{$lote->id}/devolver", ['cantidad' => 6])
            ->assertSessionHasErrors('cantidad');
        $this->assertEquals(20, $lote->fresh()->quantity);
    }

    public function test_devolver_a_un_lote_agotado_lo_reactiva(): void
    {
        [$usuario, $lote] = $this->loteConSalida(0, 25);
        $lote->update(['status' => 'consumed']);

        $this->actingAs($usuario)->post("/inventory/lote/{$lote->id}/devolver", ['cantidad' => 3]);

        $this->assertSame('active', $lote->fresh()->status);
    }

    public function test_las_devoluciones_restan_del_consumo_del_pronostico(): void
    {
        [$usuario, $lote] = $this->loteConSalida(100, 28);
        Movimiento::create(['lote_id' => $lote->id, 'user_id' => $usuario->id, 'type' => 'entrada', 'quantity' => 14, 'reason' => 'devolucion']);

        $fila = app(ProyeccionInventario::class)->proyeccion([$lote->material_id], 28)->first();

        $this->assertEquals(0.5, $fila['consumo_diario'], '(28 − 14) / 28 días');
    }

    public function test_confirmar_vencimiento_quita_la_marca_de_estimado_y_es_solo_del_admin(): void
    {
        $lote = Lote::factory()->create(['status' => 'active', 'vencimiento_estimado' => true, 'expiration_date' => now()->addMonths(6)]);

        $this->actingAs(User::factory()->create(['role' => 'operario']))
            ->patch("/inventory/lote/{$lote->id}/vencimiento", ['expiration_date' => '2027-01-15'])->assertForbidden();
        $this->actingAs($this->admin())
            ->patch("/inventory/lote/{$lote->id}/vencimiento", ['expiration_date' => '2027-01-15'])->assertSessionHas('success');

        $lote->refresh();
        $this->assertSame('2027-01-15', $lote->expiration_date->toDateString());
        $this->assertFalse($lote->vencimiento_estimado);
    }

    public function test_la_bodega_guarda_su_grupo(): void
    {
        $this->actingAs($this->admin())->post('/bodegas', [
            'name' => 'Cuarto frío', 'code' => 'MP-FRIO', 'capacity' => 2000, 'capacity_unit' => 'kg', 'grupo' => 'materia_prima',
        ])->assertSessionHasNoErrors();
        $this->assertSame('materia_prima', Bodega::where('code', 'MP-FRIO')->value('grupo'));

        $this->actingAs($this->admin())->post('/bodegas', [
            'name' => 'X', 'code' => 'X1', 'capacity' => 10, 'capacity_unit' => 'kg', 'grupo' => 'otro',
        ])->assertSessionHasErrors('grupo');
    }

    public function test_el_insumo_guarda_su_presentacion_y_exige_las_dos_partes(): void
    {
        $harina = Material::factory()->create(['unit' => 'kg']);
        $admin = $this->admin();

        $this->actingAs($admin)->put("/inventory/material/{$harina->id}", ['presentacion_nombre' => 'Bulto', 'presentacion_cantidad' => 50, 'vida_util_dias' => 180])
            ->assertSessionHasNoErrors();
        $harina->refresh();
        $this->assertSame('bulto', $harina->presentacion_nombre);
        $this->assertEquals(50, $harina->presentacion_cantidad);

        $this->actingAs($admin)->put("/inventory/material/{$harina->id}", ['presentacion_nombre' => 'caja'])
            ->assertSessionHasErrors('presentacion_cantidad');
    }

    public function test_los_insumos_sin_existencia_llegan_al_inventario_en_su_bodega(): void
    {
        $pt = Bodega::factory()->create(['name' => 'Producto terminado', 'grupo' => 'producto_terminado']);
        Material::factory()->create(['code' => '500', 'name' => 'Pan x 8', 'bodega_id' => $pt->id]);

        $this->actingAs($this->admin())->get('/dashboard')->assertInertia(fn ($p) => $p
            ->where('insumosSinExistencia.0.codigo', '500')
            ->where('insumosSinExistencia.0.bodega', 'Producto terminado')
            ->where('dashboardStats.bodegas.0.grupo', 'producto_terminado'));
    }

    public function test_cada_usuario_guarda_su_propio_tema(): void
    {
        $lina = $this->admin();
        $operario = User::factory()->create(['role' => 'operario']);

        $this->actingAs($lina)->putJson('/perfil/tema', ['theme' => 'carbon-amber'])->assertOk();
        $this->actingAs($operario)->putJson('/perfil/tema', ['theme' => 'royal-plum'])->assertOk();
        $this->actingAs($operario)->putJson('/perfil/tema', ['theme' => 'inventado'])->assertStatus(422);

        $this->assertSame('carbon-amber', $lina->fresh()->theme);
        $this->assertSame('royal-plum', $operario->fresh()->theme);
    }

    public function test_el_lote_de_producto_terminado_se_registra_sin_costo(): void
    {
        $pt = Bodega::factory()->create(['grupo' => 'producto_terminado']);
        $pan = Material::factory()->create(['unit' => 'und']);

        $this->actingAs($this->admin())->post("/inventory/material/{$pan->id}/lotes", [
            'batch_number' => '500-261009-1500', 'quantity' => 40, 'expiration_date' => now()->addDays(7)->toDateString(), 'bodega_id' => $pt->id,
        ])->assertSessionHasNoErrors();

        $this->assertEquals(0, Lote::where('batch_number', '500-261009-1500')->value('unit_cost'));
    }

    public function test_el_escaner_encuentra_el_producto_por_su_codigo_de_barras(): void
    {
        $pt = Bodega::factory()->create(['grupo' => 'producto_terminado']);
        $pan = Material::factory()->create(['code' => '502', 'name' => 'Pan perro x 10', 'unit' => 'und', 'bodega_id' => $pt->id, 'vida_util_dias' => 7, 'custom_fields' => ['codigo_barras' => '7709526716725']]);
        Lote::factory()->create(['material_id' => $pan->id, 'quantity' => 30, 'status' => 'active', 'expiration_date' => now()->addDays(5)]);

        $this->actingAs(User::factory()->create(['role' => 'operario']))->getJson('/inventory/codigo-barras/7709526716725')
            ->assertOk()->assertJsonPath('codigo', '502')->assertJsonPath('grupo', 'producto_terminado')->assertJsonPath('disponible', 30);
        $this->actingAs($this->admin())->getJson('/inventory/codigo-barras/7700000000000')->assertNotFound();
    }

    public function test_el_codigo_de_barras_se_guarda_en_los_ajustes_y_no_se_repite(): void
    {
        $a = Material::factory()->create();
        $b = Material::factory()->create(['custom_fields' => ['codigo_barras' => '7709869863117']]);
        $admin = $this->admin();

        $this->actingAs($admin)->put("/inventory/material/{$a->id}", ['codigo_barras' => '7709526716725'])->assertSessionHasNoErrors();
        $this->assertSame('7709526716725', $a->fresh()->custom_fields['codigo_barras']);
        $this->actingAs($admin)->put("/inventory/material/{$a->id}", ['codigo_barras' => '7709869863117'])->assertSessionHasErrors('codigo_barras');
        $this->actingAs($admin)->put("/inventory/material/{$a->id}", ['codigo_barras' => '77ABC'])->assertSessionHasErrors('codigo_barras');
    }
}
