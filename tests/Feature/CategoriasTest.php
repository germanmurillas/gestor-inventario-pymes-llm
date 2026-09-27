<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Las categorías son texto del insumo: el tablero envía las existentes para sugerirlas
 * y el servidor reutiliza una existente escrita con otras mayúsculas.
 */
class CategoriasTest extends TestCase
{
    use RefreshDatabase;

    public function test_nuevo_insumo_reutiliza_la_categoria_existente_sin_importar_mayusculas(): void
    {
        Material::create(['code' => 'HAR-1', 'name' => 'Harina de trigo', 'unit' => 'kg', 'stock_minimo' => 0, 'categoria' => 'Harinas']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->from('/dashboard')->post('/inventory/material', [
            'name' => 'Harina integral', 'code' => 'HAR-2', 'bodega_id' => Bodega::factory()->create()->id,
            'stock_initial' => 10, 'expiration_date' => now()->addMonth()->format('Y-m-d'), 'batch_number' => 'HAR-2-L1',
            'unit' => 'kg', 'unit_cost' => 2000, 'categoria' => '  harinas ',
        ])->assertRedirect();

        $this->assertSame('Harinas', Material::where('code', 'HAR-2')->value('categoria'));
        $this->assertSame(1, Material::distinct()->count('categoria'));
    }

    public function test_ajustes_del_insumo_reutilizan_la_categoria_y_una_nueva_se_conserva(): void
    {
        Material::create(['code' => 'GRA-1', 'name' => 'Margarina', 'unit' => 'kg', 'stock_minimo' => 0, 'categoria' => 'Grasas']);
        $m = Material::create(['code' => 'AZU-1', 'name' => 'Azúcar', 'unit' => 'kg', 'stock_minimo' => 0]);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($admin)->put("/inventory/material/{$m->id}", ['categoria' => 'GRASAS'])->assertRedirect();
        $this->assertSame('Grasas', $m->fresh()->categoria);

        $this->actingAs($admin)->put("/inventory/material/{$m->id}", ['categoria' => 'Endulzantes'])->assertRedirect();
        $this->assertSame('Endulzantes', $m->fresh()->categoria);
    }

    public function test_el_tablero_envia_las_categorias_existentes_ordenadas_y_sin_repetir(): void
    {
        foreach ([['A', 'Levaduras'], ['B', 'Harinas'], ['C', 'Harinas'], ['D', null]] as [$code, $cat]) {
            Material::create(['code' => $code, 'name' => "Insumo $code", 'unit' => 'kg', 'stock_minimo' => 0, 'categoria' => $cat]);
        }
        $this->actingAs(User::factory()->create())->get('/dashboard')->assertOk()
            ->assertInertia(fn ($page) => $page->where('dashboardStats.categorias', ['Harinas', 'Levaduras']));
    }
}
