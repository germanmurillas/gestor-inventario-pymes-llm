<?php

namespace Tests\Feature;

use App\Http\Controllers\ChatLLMController;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatRagContextTest extends TestCase
{
    use RefreshDatabase;

    private function invokePrivate(string $method, ...$args)
    {
        $c = app(ChatLLMController::class);
        $m = new \ReflectionMethod($c, $method);
        $m->setAccessible(true);

        return $m->invoke($c, ...$args);
    }

    public function test_preguntas_con_tilde_se_clasifican(): void
    {
        $this->assertSame('stock_check', $this->invokePrivate('classifyQuery', '¿Cuánta harina hay?'));
        $this->assertSame('stock_check', $this->invokePrivate('classifyQuery', '¿CUÁNTOS bultos quedan?'));
        $this->assertSame('location', $this->invokePrivate('classifyQuery', '¿Dónde está la levadura?'));
    }

    public function test_la_palabra_todo_no_fuerza_el_resumen(): void
    {
        $this->assertNotSame('summary', $this->invokePrivate('classifyQuery', 'muéstrame todo lo de levadura'));
        $this->assertSame('summary', $this->invokePrivate('classifyQuery', 'dame un resumen de todo el inventario'));
    }

    public function test_material_inexistente_no_devuelve_lotes_de_otros(): void
    {
        $otro = Material::factory()->create(['name' => 'Azúcar refinada']);
        Lote::factory()->create(['material_id' => $otro->id, 'batch_number' => 'LT-AZU-1']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Cuánto ajonjolí hay?', 'stock_check');

        $this->assertStringContainsString('MATERIAL NO ENCONTRADO', $ctx);
        $this->assertStringNotContainsString('LT-AZU-1', $ctx);
    }

    public function test_material_existente_filtra_su_contexto(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo']);
        $sal    = Material::factory()->create(['name' => 'Sal refinada']);
        Lote::factory()->create(['material_id' => $harina->id, 'batch_number' => 'LT-HAR-1']);
        Lote::factory()->create(['material_id' => $sal->id, 'batch_number' => 'LT-SAL-1']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Cuánta harina hay?', 'stock_check');

        $this->assertStringContainsString('LT-HAR-1', $ctx);
        $this->assertStringNotContainsString('LT-SAL-1', $ctx);
    }

    public function test_pregunta_de_vencimiento_sin_material_lista_por_fecha(): void
    {
        $lev = Material::factory()->create(['name' => 'Levadura fresca']);
        Lote::factory()->create(['material_id' => $lev->id, 'batch_number' => 'LT-LEV-9']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Qué lotes vencen pronto?', 'expiration');

        $this->assertStringNotContainsString('MATERIAL NO ENCONTRADO', $ctx);
        $this->assertStringContainsString('LT-LEV-9', $ctx);
    }

    /** Regresión: el asistente respondía que nada vencía esta semana porque leía lotes ya consumidos. */
    public function test_vencimientos_de_la_semana_solo_lotes_con_stock(): void
    {
        $pan = Material::factory()->create(['name' => 'Pan tajado']);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'LT-CONSUMIDO', 'status' => 'consumed',
            'quantity' => 0, 'expiration_date' => now()->subDays(5)]);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'LT-ESTA-SEMANA', 'status' => 'active',
            'quantity' => 90, 'expiration_date' => now()->addDays(3)]);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'LT-MES', 'status' => 'active',
            'quantity' => 40, 'expiration_date' => now()->addDays(20)]);

        $pregunta = '¿Qué lotes vencen esta semana?';
        $ctx = $this->invokePrivate('buildRagContext', $pregunta, $this->invokePrivate('classifyQuery', $pregunta));

        $this->assertStringContainsString('FECHA DE HOY', $ctx);
        $this->assertStringContainsString('LT-ESTA-SEMANA', $ctx);
        $this->assertStringContainsString('(en 3 días)', $ctx);
        $this->assertStringNotContainsString('LT-CONSUMIDO', $ctx);
        $this->assertStringNotContainsString('LT-MES', $ctx);
    }

    public function test_reconoce_lotes_por_su_numero_real(): void
    {
        $m = Material::factory()->create(['name' => 'Azúcar blanca', 'unit' => 'kg']);
        Lote::factory()->create(['material_id' => $m->id, 'batch_number' => 'AZU-01-260817-1', 'quantity' => 207.24, 'status' => 'active']);

        $pregunta = '¿Qué información hay del lote AZU-01-260817-1?';
        $this->assertSame('batch_info', $this->invokePrivate('classifyQuery', $pregunta));
        $ctx = $this->invokePrivate('buildRagContext', $pregunta, 'batch_info');
        $this->assertStringContainsString('AZU-01-260817-1', $ctx);
        $this->assertStringContainsString('207.24 kg', $ctx);
    }

    public function test_conciliacion_lista_los_ajustes_del_kardex(): void
    {
        $user = User::factory()->create();
        $lote = Lote::factory()->create(['batch_number' => 'MEJ-1', 'status' => 'active']);
        Movimiento::create(['lote_id' => $lote->id, 'user_id' => $user->id, 'type' => 'salida', 'quantity' => 2.5, 'reason' => 'ajuste', 'description' => 'Conteo físico menor']);

        $pregunta = '¿Hubo ajustes de conciliación?';
        $this->assertSame('conciliation', $this->invokePrivate('classifyQuery', $pregunta));
        $ctx = $this->invokePrivate('buildRagContext', $pregunta, 'conciliation');
        $this->assertStringContainsString('MEJ-1', $ctx);
        $this->assertStringContainsString('2.5', $ctx);
    }

    public function test_valorizacion_incluye_costo_y_total(): void
    {
        $m = Material::factory()->create(['name' => 'Sal refinada', 'unit' => 'kg']);
        Lote::factory()->create(['material_id' => $m->id, 'quantity' => 10, 'unit_cost' => 1500, 'status' => 'active']);
        Lote::factory()->create(['material_id' => $m->id, 'quantity' => 4, 'unit_cost' => 1500, 'status' => 'active']);

        $pregunta = '¿Cuánto vale la sal refinada?';
        $this->assertSame('valuation', $this->invokePrivate('classifyQuery', $pregunta));
        $ctx = $this->invokePrivate('buildRagContext', $pregunta, 'valuation');
        $this->assertStringContainsString('TOTAL Sal refinada: 14 kg', $ctx);
        $this->assertStringContainsString('$21.000 COP', $ctx);
    }

    public function test_elige_el_insumo_que_coincide_con_mas_palabras(): void
    {
        $perro = Material::factory()->create(['name' => 'Pan perro x 8', 'unit' => 'und']);
        $tajado = Material::factory()->create(['name' => 'Pan tajado blanco 500 g', 'unit' => 'und']);
        Lote::factory()->create(['material_id' => $perro->id, 'batch_number' => 'PER-1', 'status' => 'active']);
        Lote::factory()->create(['material_id' => $tajado->id, 'batch_number' => 'TAJ-1', 'status' => 'active']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Dónde está el pan perro x 8?', 'location');
        $this->assertStringContainsString('PER-1', $ctx);
        $this->assertStringNotContainsString('TAJ-1', $ctx);
    }

    public function test_las_cantidades_no_llevan_ceros_sobrantes(): void
    {
        $this->assertSame('403', $this->invokePrivate('num', 403.000));
        $this->assertSame('71.015', $this->invokePrivate('num', 71.015));
        $this->assertSame('2.5', $this->invokePrivate('num', '2.500'));
    }
}
