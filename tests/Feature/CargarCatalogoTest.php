<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Carga del catálogo real de una empresa desde un JSON privado (datos inventados en la prueba). */
class CargarCatalogoTest extends TestCase
{
    use RefreshDatabase;

    private function archivo(): string
    {
        $ruta = tempnam(sys_get_temp_dir(), 'catalogo');
        file_put_contents($ruta, json_encode([
            'fecha_corte' => '2026-09-30',
            'bodegas' => [
                ['code' => 'MP', 'name' => 'Materia prima', 'grupo' => 'materia_prima', 'capacity' => 1000, 'capacity_unit' => 'kg'],
                ['code' => 'PT', 'name' => 'Producto terminado', 'grupo' => 'producto_terminado', 'capacity' => 500, 'capacity_unit' => 'und'],
            ],
            'insumos' => [
                ['code' => '2', 'name' => 'Harina', 'unit' => 'kg', 'bodega' => 'MP', 'existencia' => 300, 'presentacion_nombre' => 'bulto', 'presentacion_cantidad' => 50, 'vida_util_dias' => 180],
                ['code' => '9', 'name' => 'Azúcar', 'unit' => 'kg', 'bodega' => 'MP', 'existencia' => 100, 'vencimiento' => '2027-05-01'],
                ['code' => '500', 'name' => 'Pan x 8', 'unit' => 'und', 'bodega' => 'PT', 'existencia' => 0, 'vida_util_dias' => 7, 'codigo_barras' => '7709869863117'],
            ],
        ]));
        return $ruta;
    }

    public function test_carga_bodegas_insumos_y_existencias_con_su_movimiento_de_ingreso(): void
    {
        User::factory()->create(['role' => 'admin']);

        $this->artisan('bodega:cargar-catalogo', ['archivo' => $this->archivo()])->assertSuccessful();

        $this->assertSame('materia_prima', Bodega::where('code', 'MP')->value('grupo'));
        $harina = Material::where('code', '2')->first();
        $this->assertSame('bulto', $harina->presentacion_nombre);
        $this->assertEquals(50, $harina->presentacion_cantidad);

        $lote = Lote::where('material_id', $harina->id)->first();
        $this->assertEquals(300, $lote->quantity);
        $this->assertSame('2027-03-29', $lote->expiration_date->toDateString(), '30-sep + 180 días');
        $this->assertTrue($lote->vencimiento_estimado);

        $azucar = Lote::whereHas('material', fn ($q) => $q->where('code', '9'))->first();
        $this->assertFalse($azucar->vencimiento_estimado, 'Con fecha real no se marca como estimada');
        $this->assertSame(0, Lote::whereHas('material', fn ($q) => $q->where('code', '500'))->count(), 'Sin existencia no se inventa un lote');
        $this->assertSame(2, Movimiento::where('reason', 'ingreso')->count());
        $this->assertSame('7709869863117', Material::where('code', '500')->first()->custom_fields['codigo_barras']);
    }

    public function test_es_idempotente(): void
    {
        User::factory()->create(['role' => 'admin']);
        $archivo = $this->archivo();
        $this->artisan('bodega:cargar-catalogo', ['archivo' => $archivo])->assertSuccessful();
        $this->artisan('bodega:cargar-catalogo', ['archivo' => $archivo])->assertSuccessful();

        $this->assertSame(3, Material::count());
        $this->assertSame(2, Lote::count());
        $this->assertSame(2, Movimiento::count());
    }

    public function test_sin_administrador_no_carga_nada(): void
    {
        $this->artisan('bodega:cargar-catalogo', ['archivo' => $this->archivo()])->assertFailed();
        $this->assertSame(0, Material::count());
    }

    public function test_simular_no_guarda_nada(): void
    {
        User::factory()->create(['role' => 'admin']);
        $this->artisan('bodega:cargar-catalogo', ['archivo' => $this->archivo(), '--simular' => true])->assertSuccessful();

        $this->assertSame(0, Material::count());
        $this->assertSame(0, Bodega::count());
    }
}
