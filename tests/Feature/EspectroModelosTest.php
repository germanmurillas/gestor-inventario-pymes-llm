<?php

namespace Tests\Feature;

use App\Models\User;
use Database\Seeders\LlmPreciosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/** Palanca de modelos: datos medidos (llm_evaluaciones) + precios oficiales (llm_precios). */
class EspectroModelosTest extends TestCase
{
    use RefreshDatabase;

    private function medicion(string $modelo, string $fuente, int $correctas, float $entrada, float $salida, string $conjunto = 'bateria'): void
    {
        DB::table('llm_evaluaciones')->insert([
            'fuente' => $fuente, 'modelo' => $modelo, 'conjunto' => $conjunto, 'total' => 50, 'correctas' => $correctas,
            'respuestas_propias' => 50, 'tiempo_mediano_s' => 1.5, 'tokens_entrada_prom' => $entrada, 'tokens_salida_prom' => $salida,
            'medido_el' => '2026-10-01 20:00:00', 'created_at' => now(), 'updated_at' => now(),
        ]);
    }

    public function test_ordena_por_costo_y_compara_con_el_recomendado(): void
    {
        $this->seed(LlmPreciosSeeder::class);
        $this->medicion('gpt-oss:120b-cloud', 'local', 49, 1000, 500);   // 0,15·1000 + 0,60·500 = 450 µUSD
        $this->medicion('kimi-k3', 'opencode-go', 48, 1000, 500);       // 3·1000 + 15·500 = 10 500 µUSD
        $this->medicion('space-bunny-free', 'opencode-go', 50, 1000, 500);
        $this->medicion('modelo-sin-precio', 'opencode-go', 50, 1000, 500);

        $r = $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/api/llm/espectro')->assertOk();

        $this->assertSame('gpt-oss:120b-cloud', $r->json('recomendado'));
        $this->assertSame(['space-bunny-free', 'gpt-oss:120b-cloud', 'kimi-k3'], array_column($r->json('modelos'), 'modelo'));
        $this->assertSame([-100, 0, 2233], array_column($r->json('modelos'), 'costo_vs_recomendado_pct'));
        $this->assertEquals(100.0, $r->json('modelos.0.precision'));
    }

    public function test_usa_la_ultima_medicion_de_cada_conjunto(): void
    {
        $this->seed(LlmPreciosSeeder::class);
        $this->medicion('gpt-oss:120b-cloud', 'local', 45, 1000, 500);
        $this->medicion('gpt-oss:120b-cloud', 'local', 49, 1000, 500);
        $this->medicion('gpt-oss:120b-cloud', 'local', 18, 1000, 500, 'operario');

        $r = $this->actingAs(User::factory()->create(['role' => 'admin']))->getJson('/api/llm/espectro')->assertOk();

        $this->assertSame([67, 100], [$r->json('modelos.0.correctas'), $r->json('modelos.0.total')]);
    }

    public function test_solo_el_administrador_ve_la_palanca(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'operario']))->getJson('/api/llm/espectro')->assertForbidden();
    }

    public function test_el_evaluador_importa_una_medicion_guardada_sin_contar_el_respaldo(): void
    {
        $archivo = tempnam(sys_get_temp_dir(), 'rag');
        file_put_contents($archivo, json_encode(['resumen' => ['conjunto' => 'ciega', 'etiqueta' => 'prueba', 'fecha' => '2026-10-01 21:00:00'], 'resultados' => [
            ['modelo' => 'glm-5.3-flash', 'fuente' => 'opencode-go', 'correcta' => true, 'segundos' => 2.0, 'tokens_entrada' => 600, 'tokens_salida' => 100],
            ['modelo' => 'glm-5.3-flash', 'fuente' => 'opencode-go', 'correcta' => false, 'segundos' => 4.0, 'tokens_entrada' => 800, 'tokens_salida' => 300],
            ['modelo' => 'qwen3.5:9b (respaldo local)', 'fuente' => 'local', 'correcta' => true, 'segundos' => 40.0, 'tokens_entrada' => 500, 'tokens_salida' => 50],
        ]]));

        $this->artisan('rag:evaluar', ['--importar' => [$archivo]])->assertSuccessful();

        $fila = DB::table('llm_evaluaciones')->first();
        $this->assertSame(['glm-5.3-flash', 'opencode-go', 3, 1, 2], [$fila->modelo, $fila->fuente, (int) $fila->total, (int) $fila->correctas, (int) $fila->respuestas_propias]);
        $this->assertEquals(700.0, $fila->tokens_entrada_prom);
        unlink($archivo);
    }
}
