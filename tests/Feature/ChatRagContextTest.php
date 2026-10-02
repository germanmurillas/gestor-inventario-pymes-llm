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

    public function test_consumo_de_la_semana_con_palabras_de_relleno_da_el_consumo_total(): void
    {
        Material::factory()->create(['name' => 'Harina de trigo']);
        $q = 'genermare un grafico para descargar sobre el consumo de esta semana porfavor';

        $ctx = $this->invokePrivate('buildRagContext', $q, 'consumption');

        $this->assertStringNotContainsString('MATERIAL NO ENCONTRADO', $ctx);
        $this->assertStringContainsString('CONSUMO DE LOS ÚLTIMOS 7 DÍAS', $ctx);
        $this->assertStringContainsString('palabras no reconocidas: genermare', $ctx);
        $this->assertStringContainsString('no genera gráficos', $ctx);
    }

    public function test_consumo_de_un_insumo_inexistente_sin_periodo_sigue_diciendo_no_registrado(): void
    {
        Material::factory()->create(['name' => 'Harina de trigo']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Cuánto ajonjolí consumimos?', 'consumption');

        $this->assertStringContainsString('MATERIAL NO ENCONTRADO', $ctx);
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

    public function test_cuarentena_y_stock_bajo_tienen_su_categoria(): void
    {
        foreach (['que hay en cuarentena', '¿Qué lotes están en cuarentena?', '¿Hay algún lote retenido por calidad?'] as $q) {
            $this->assertSame('quarantine', $this->invokePrivate('classifyQuery', $q), $q);
        }
        foreach (['¿Qué insumos están por debajo del mínimo?', '¿Qué nos hace falta pedir?', '¿Qué está bajo de stock?'] as $q) {
            $this->assertSame('low_stock', $this->invokePrivate('classifyQuery', $q), $q);
        }
    }

    public function test_formas_coloquiales_de_por_vencer_y_encuentro_no_es_entrada(): void
    {
        foreach (['¿Qué se me va a vencer pronto?', '¿Qué toca usar primero porque ya casi se vence?', '¿Qué se va a dañar pronto?', '¿Hay algo que se vaya a echar a perder?'] as $q) {
            $this->assertSame('critical_alerts', $this->invokePrivate('classifyQuery', $q), $q);
        }
        $this->assertSame('location', $this->invokePrivate('classifyQuery', '¿Dónde encuentro la leche en polvo?'));
        $this->assertSame('movements', $this->invokePrivate('classifyQuery', '¿Qué entró ayer?'));
    }

    public function test_contexto_de_cuarentena_lista_solo_los_lotes_retenidos(): void
    {
        $harina = Material::factory()->create(['name' => 'Harina de trigo']);
        Lote::factory()->create(['material_id' => $harina->id, 'batch_number' => 'LT-RET-1', 'status' => 'quarantined']);
        Lote::factory()->create(['material_id' => $harina->id, 'batch_number' => 'LT-OK-1', 'status' => 'active']);

        $ctx = $this->invokePrivate('buildRagContext', 'que hay en cuarentena', 'quarantine');

        $this->assertStringContainsString('LOTES EN CUARENTENA', $ctx);
        $this->assertStringContainsString('LT-RET-1', $ctx);
        $this->assertStringNotContainsString('LT-OK-1', $ctx);
        $this->assertStringNotContainsString('MATERIAL NO ENCONTRADO', $ctx);
    }

    public function test_contexto_de_stock_bajo_lista_los_insumos_bajo_su_minimo(): void
    {
        $azucar = Material::factory()->create(['name' => 'Azúcar blanca', 'stock_minimo' => 100, 'unit' => 'kg']);
        $sal = Material::factory()->create(['name' => 'Sal refinada', 'stock_minimo' => 10, 'unit' => 'kg']);
        Lote::factory()->create(['material_id' => $azucar->id, 'quantity' => 40, 'status' => 'active']);
        Lote::factory()->create(['material_id' => $sal->id, 'quantity' => 50, 'status' => 'active']);

        $ctx = $this->invokePrivate('buildRagContext', '¿Qué nos hace falta pedir?', 'low_stock');

        $this->assertStringContainsString('Azúcar blanca: hay 40 kg | mínimo 100 kg | faltan 60 kg', $ctx);
        $this->assertStringNotContainsString('Sal refinada', $ctx);
    }

    public function test_palabras_coloquiales_no_filtran_la_lista_de_por_vencer(): void
    {
        // "algo" aparece en la descripción de un insumo: no debe tomarse como el insumo pedido.
        $pan = Material::factory()->create(['name' => 'Pan perro', 'description' => 'algo de pan', 'dias_criticos' => 5]);
        $huevo = Material::factory()->create(['name' => 'Huevo líquido', 'dias_criticos' => 5]);
        Lote::factory()->create(['material_id' => $huevo->id, 'batch_number' => 'LT-HUE-9', 'status' => 'active', 'quantity' => 10, 'expiration_date' => now()->addDays(2)]);
        Lote::factory()->create(['material_id' => $pan->id, 'batch_number' => 'LT-PAN-9', 'status' => 'active', 'quantity' => 10, 'expiration_date' => now()->addDays(60)]);

        $ctx = $this->invokePrivate('buildRagContext', '¿Hay algo que se vaya a echar a perder?', 'critical_alerts');

        $this->assertStringContainsString('LT-HUE-9', $ctx);
        $this->assertStringNotContainsString('MATERIAL NO ENCONTRADO', $ctx);
    }
}
