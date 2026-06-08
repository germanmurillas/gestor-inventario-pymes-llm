<?php

namespace Tests\Feature;

use App\Models\Material;
use App\Models\Lote;
use App\Models\Bodega;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class FefoTest extends TestCase
{
    use RefreshDatabase;

    /**
     * FEFO: verifica que los lotes se ordenen por fecha de vencimiento ascendente.
     */
    public function test_lotes_se_ordenan_por_vencimiento_fefo(): void
    {
        // Arrange
        $material = Material::create([
            'code' => 'MAT-001',
            'name' => 'Harina de Trigo',
            'unit' => 'kg',
            'stock_minimo' => 50,
        ]);

        $bodega = Bodega::create([
            'code' => 'BOD-001',
            'name' => 'Bodega Principal',
            'ubicacion' => 'Zona A',
        ]);

        Lote::create([
            'material_id' => $material->id,
            'bodega_id' => $bodega->id,
            'batch_number' => 'H-205',
            'quantity' => 500,
            'expiration_date' => '2026-08-01',
        ]);

        Lote::create([
            'material_id' => $material->id,
            'bodega_id' => $bodega->id,
            'batch_number' => 'H-201',
            'quantity' => 340,
            'expiration_date' => '2026-06-15',
        ]);

        Lote::create([
            'material_id' => $material->id,
            'bodega_id' => $bodega->id,
            'batch_number' => 'H-204',
            'quantity' => 120,
            'expiration_date' => '2026-05-30',
        ]);

        // Act — consultar lotes ordenados por vencimiento (FEFO)
        $lotes = Lote::where('material_id', $material->id)
            ->orderBy('expiration_date', 'asc')
            ->get();

        // Assert — deben estar en orden: H-204, H-201, H-205
        $this->assertCount(3, $lotes);
        $this->assertEquals('H-204', $lotes[0]->batch_number);
        $this->assertEquals('H-201', $lotes[1]->batch_number);
        $this->assertEquals('H-205', $lotes[2]->batch_number);

        $this->assertTrue($lotes[0]->expiration_date->lt($lotes[1]->expiration_date));
        $this->assertTrue($lotes[1]->expiration_date->lt($lotes[2]->expiration_date));
    }

    /**
     * FEFO: verifica que lotes vencidos sean detectados.
     */
    public function test_detecta_lotes_vencidos(): void
    {
        $material = Material::create([
            'code' => 'MAT-002',
            'name' => 'Leche en Polvo',
            'unit' => 'kg',
            'stock_minimo' => 20,
        ]);

        $bodega2 = Bodega::create([
            'code' => 'BOD-002',
            'name' => 'Bodega Fria',
            'ubicacion' => 'Zona B',
        ]);

        Lote::create([
            'material_id' => $material->id,
            'bodega_id' => $bodega2->id,
            'batch_number' => 'L-001',
            'quantity' => 100,
            'expiration_date' => now()->subDays(10),
        ]);

        Lote::create([
            'material_id' => $material->id,
            'bodega_id' => $bodega2->id,
            'batch_number' => 'L-002',
            'quantity' => 200,
            'expiration_date' => now()->addDays(30),
        ]);

        $vencidos = Lote::where('material_id', $material->id)
            ->where('expiration_date', '<', now())
            ->get();

        $this->assertCount(1, $vencidos);
        $this->assertEquals('L-001', $vencidos->first()->batch_number);
    }
}
