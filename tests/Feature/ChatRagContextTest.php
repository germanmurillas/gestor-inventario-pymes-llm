<?php

namespace Tests\Feature;

use App\Http\Controllers\ChatLLMController;
use App\Models\Lote;
use App\Models\Material;
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
}
