<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Fallas que vio la administradora en la prueba con usuario (8-oct-2026) y su blindaje: las llamadas
 * de la interfaz reciben errores en JSON y en español (nunca una página HTML que se muestre como
 * «Unexpected token '<'»), los mensajes de confirmación llegan a la interfaz y los reportes en PDF
 * terminan dentro del límite de tiempo del servidor.
 */
class BlindajeErroresTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User { return User::factory()->create(['role' => 'admin']); }

    /** Cabeceras de una llamada fetch/axios de la interfaz que NO pide JSON explícitamente. */
    private const AJAX = ['X-Requested-With' => 'XMLHttpRequest'];

    public function test_un_error_de_validacion_en_una_llamada_de_la_interfaz_llega_en_json_y_en_espanol(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina', 'unit' => 'kg']);

        $r = $this->actingAs($this->admin())->post('/inventory/consume-fefo', [
            'material_id' => $harina->id, 'quantity' => 1, 'reason' => 'produccion', 'description' => str_repeat('x', 300),
        ], self::AJAX);

        $r->assertStatus(422)->assertHeader('Content-Type', 'application/json');
        $this->assertSame('El comentario no puede tener más de 255 caracteres.', $r->json('errors.description.0'));
    }

    public function test_un_insumo_inexistente_responde_404_en_json_no_una_pagina_html(): void
    {
        $r = $this->actingAs($this->admin())->get('/inventory/fefo-suggest/999999?quantity=0', self::AJAX);

        $r->assertNotFound();
        $this->assertStringContainsString('application/json', $r->headers->get('Content-Type'));
    }

    public function test_el_stock_insuficiente_se_explica_con_la_unidad_del_insumo(): void
    {
        $aceite = Material::factory()->create(['name' => 'Aceite de soya', 'unit' => 'L']);
        Lote::factory()->create(['material_id' => $aceite->id, 'quantity' => 2, 'status' => 'active', 'expiration_date' => now()->addMonths(3)]);

        $r = $this->actingAs($this->admin())->postJson('/inventory/consume-fefo', ['material_id' => $aceite->id, 'quantity' => 5, 'reason' => 'produccion']);

        $r->assertStatus(422);
        $this->assertStringContainsString('solo hay 2 L', $r->json('error'));
    }

    public function test_la_confirmacion_de_un_ajuste_llega_a_la_interfaz(): void
    {
        $sal = Material::factory()->create(['name' => 'Sal', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $sal->id, 'quantity' => 50, 'status' => 'active']);
        $admin = $this->admin();

        $this->actingAs($admin)->from('/dashboard')->patch("/inventory/adjust/{$lote->id}", ['new_quantity' => 45, 'reason' => 'Conteo físico'])
            ->assertRedirect('/dashboard');
        $this->actingAs($admin)->get('/dashboard')
            ->assertInertia(fn ($pagina) => $pagina->where('flash.success', 'Conciliación realizada exitosamente.'));
    }

    public function test_el_pdf_de_consumo_con_muchos_movimientos_se_genera_a_tiempo(): void
    {
        $admin = $this->admin();
        $harina = Material::factory()->create(['name' => 'Harina', 'unit' => 'kg']);
        $lote = Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 5000, 'status' => 'active']);
        for ($i = 0; $i < 260; $i++) {
            Movimiento::create(['lote_id' => $lote->id, 'user_id' => $admin->id, 'type' => 'salida', 'quantity' => 1, 'reason' => 'produccion']);
        }

        $t = microtime(true);
        $r = $this->actingAs($admin)->get('/reports/export?type=consumo&format=pdf');

        $r->assertOk()->assertHeader('Content-Type', 'application/pdf');
        $this->assertLessThan(20, microtime(true) - $t, 'El PDF debe quedar muy por debajo del límite de 30 s del servidor');
    }

    public function test_los_kilos_consumidos_no_suman_insumos_medidos_en_otra_unidad(): void
    {
        $admin = $this->admin();
        $harina = Material::factory()->create(['name' => 'Harina', 'unit' => 'kg']);
        $bolsas = Material::factory()->create(['name' => 'Bolsas', 'unit' => 'und']);
        foreach ([[$harina, 30], [$bolsas, 500]] as [$m, $q]) {
            $lote = Lote::factory()->create(['material_id' => $m->id, 'quantity' => 1000, 'status' => 'active']);
            Movimiento::create(['lote_id' => $lote->id, 'user_id' => $admin->id, 'type' => 'salida', 'quantity' => $q, 'reason' => 'produccion']);
        }

        $r = $this->actingAs($admin)->getJson('/reports/preview?type=consumo');

        $this->assertEquals(30, $r->json('summary.totalKilosConsumidos'));
    }
}
