<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * El Kardex se consulta por páginas de 50 desde /inventory/kardex, con filtros en la base.
 */
class KardexPaginadoTest extends TestCase
{
    use RefreshDatabase;

    private User $ana;
    private Lote $harina;
    private Lote $azucar;

    protected function setUp(): void
    {
        parent::setUp();
        $this->ana = User::factory()->create(['name' => 'Ana Operaria']);
        $bodega = Bodega::create(['code' => 'BOD-P', 'name' => 'Bodega P']);
        $this->harina = Lote::create(['material_id' => Material::create(['code' => 'HAR', 'name' => 'Harina de trigo', 'unit' => 'kg', 'stock_minimo' => 0])->id,
            'bodega_id' => $bodega->id, 'batch_number' => 'H-001', 'quantity' => 500, 'expiration_date' => now()->addDays(60)]);
        $this->azucar = Lote::create(['material_id' => Material::create(['code' => 'AZU', 'name' => 'Azúcar blanca', 'unit' => 'kg', 'stock_minimo' => 0])->id,
            'bodega_id' => $bodega->id, 'batch_number' => 'A-777', 'quantity' => 300, 'expiration_date' => now()->addDays(90)]);
    }

    private function movimiento(Lote $lote, string $tipo, User $usuario, int $minutosAtras): Movimiento
    {
        $this->travelTo(now()->subMinutes($minutosAtras));
        $m = Movimiento::create(['lote_id' => $lote->id, 'user_id' => $usuario->id, 'type' => $tipo, 'quantity' => 1, 'reason' => 'produccion']);
        $this->travelBack();
        return $m;
    }

    public function test_pagina_de_50_del_mas_reciente_al_mas_antiguo(): void
    {
        for ($i = 60; $i >= 1; $i--) $this->movimiento($this->harina, 'salida', $this->ana, $i);

        $p1 = $this->actingAs($this->ana)->getJson('/inventory/kardex')->assertOk();
        $p1->assertJsonCount(50, 'movimientos')->assertJson(['pagina' => 1, 'paginas' => 2, 'total' => 60, 'total_general' => 60]);
        $ids = collect($p1->json('movimientos'))->pluck('id');
        $this->assertSame(Movimiento::orderByDesc('created_at')->take(50)->pluck('id')->all(), $ids->all());

        $this->actingAs($this->ana)->getJson('/inventory/kardex?page=2')->assertOk()->assertJsonCount(10, 'movimientos');
    }

    public function test_filtra_por_tipo_insumo_lote_y_responsable_en_la_base(): void
    {
        $this->movimiento($this->harina, 'entrada', $this->ana, 5);
        $this->movimiento($this->harina, 'salida', User::factory()->create(['name' => 'Luis Bodega']), 4);
        $this->movimiento($this->azucar, 'salida', $this->ana, 3);

        $this->actingAs($this->ana)->getJson('/inventory/kardex?tipo=salida')->assertJson(['total' => 2, 'total_general' => 3]);
        $this->actingAs($this->ana)->getJson('/inventory/kardex?q=harina')->assertJson(['total' => 2]);
        $this->actingAs($this->ana)->getJson('/inventory/kardex?q=A-777')
            ->assertJson(['total' => 1])->assertJsonPath('movimientos.0.material', 'Azúcar blanca');
        $this->actingAs($this->ana)->getJson('/inventory/kardex?q=ana&tipo=salida')->assertJson(['total' => 1]);
        $this->actingAs($this->ana)->getJson('/inventory/kardex?q=harina&tipo=salida')
            ->assertJson(['total' => 1])->assertJsonPath('movimientos.0.user', 'Luis Bodega');
    }

    public function test_requiere_sesion_y_valida_el_tipo(): void
    {
        $this->getJson('/inventory/kardex')->assertUnauthorized();
        $this->actingAs($this->ana)->getJson('/inventory/kardex?tipo=borrado')->assertUnprocessable();
    }

    public function test_el_tablero_ya_no_envia_el_kardex_completo(): void
    {
        $this->movimiento($this->harina, 'entrada', $this->ana, 1);
        $this->actingAs($this->ana)->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->missing('dashboardStats.fullActivity')->has('dashboardStats.recentActivity', 1));
    }
}
