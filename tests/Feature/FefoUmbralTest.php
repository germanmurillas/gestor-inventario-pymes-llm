<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class FefoUmbralTest extends TestCase
{
    use RefreshDatabase;

    public function test_el_umbral_critico_se_lee_de_los_ajustes(): void
    {
        DB::table('settings')->insert(['clave' => 'fefo_dias_criticos', 'valor' => '30', 'tipo' => 'integer', 'grupo' => 'general']);
        $lote = Lote::factory()->create(['expiration_date' => now()->addDays(20), 'status' => 'active']);

        $this->assertTrue($lote->fresh()->is_critical);
        $this->assertEquals(1, Lote::criticos()->count());
    }

    public function test_un_insumo_con_umbral_propio_no_usa_el_general(): void
    {
        // General 15 días (por defecto). El pan tiene umbral propio de 2 días.
        $pan = Material::factory()->create(['dias_criticos' => 2]);
        $harina = Material::factory()->create(['dias_criticos' => null]);
        $panEn5 = Lote::factory()->create(['material_id' => $pan->id, 'expiration_date' => now()->addDays(5), 'status' => 'active']);
        $panEn1 = Lote::factory()->create(['material_id' => $pan->id, 'expiration_date' => now()->addDays(1), 'status' => 'active']);
        $harinaEn10 = Lote::factory()->create(['material_id' => $harina->id, 'expiration_date' => now()->addDays(10), 'status' => 'active']);

        $this->assertFalse($panEn5->fresh()->is_critical);
        $this->assertTrue($panEn1->fresh()->is_critical);
        $this->assertTrue($harinaEn10->fresh()->is_critical);

        // El scope da el mismo resultado que el atributo.
        $this->assertEqualsCanonicalizing([$panEn1->id, $harinaEn10->id], Lote::criticos()->pluck('id')->all());
        $this->assertTrue($pan->fresh()->tiene_criticos);
    }

    public function test_registrar_insumo_guarda_unidad_costo_minimo_y_umbral(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $bodega = Bodega::factory()->create();

        $this->actingAs($admin)->post('/inventory/material', [
            'name' => 'Aceite de palma', 'code' => 'MP-ACE-09', 'bodega_id' => $bodega->id,
            'stock_initial' => 40, 'expiration_date' => now()->addDays(90)->toDateString(), 'batch_number' => 'ACE-1',
            'unit' => 'L', 'unit_cost' => 7200, 'stock_minimo' => 20, 'dias_criticos' => 10, 'categoria' => 'Grasas',
        ])->assertSessionHasNoErrors();

        $m = Material::where('code', 'MP-ACE-09')->first();
        $this->assertSame('L', $m->unit);
        $this->assertEquals(20, $m->stock_minimo);
        $this->assertSame(10, (int) $m->dias_criticos);
        $this->assertEquals(7200, $m->lotes()->first()->unit_cost);
    }

    public function test_solo_el_admin_edita_los_ajustes_del_insumo(): void
    {
        $m = Material::factory()->create(['dias_criticos' => null]);
        $operario = User::factory()->create(['role' => 'operario']);
        $admin = User::factory()->create(['role' => 'admin']);

        $this->actingAs($operario)->put("/inventory/material/{$m->id}", ['dias_criticos' => 3])->assertForbidden();
        $this->actingAs($admin)->put("/inventory/material/{$m->id}", ['dias_criticos' => 3, 'stock_minimo' => 12])->assertRedirect();
        $this->assertSame(3, (int) $m->fresh()->dias_criticos);
    }
}
