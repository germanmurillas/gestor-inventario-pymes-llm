<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Si el modelo principal (en la nube, servido por Ollama) falla o responde vacío, contesta el
 * modelo local de respaldo; solo si ese también falla se pasa al modo texto.
 */
class RespaldoLocalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['services.ollama.respaldo' => 'qwen3.5:9b']);
        foreach (['llm_source' => 'local', 'llm_modelo' => 'gpt-oss:120b-cloud'] as $clave => $valor) {
            DB::table('settings')->updateOrInsert(['clave' => $clave], ['valor' => $valor, 'tipo' => 'string', 'grupo' => 'llm']);
        }
    }

    private function preguntar()
    {
        // Pregunta que el clasificador por patrones reconoce: no hace una llamada extra para clasificar.
        return $this->actingAs(User::factory()->create())->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?']);
    }

    public function test_si_la_nube_falla_responde_el_modelo_local(): void
    {
        Http::fake(['*/api/chat' => Http::sequence()
            ->push(['error' => 'upstream unavailable'], 503)
            ->push(['message' => ['content' => 'Hay 120 kg de harina.']], 200)]);

        $this->preguntar()->assertOk()->assertJson(['response' => 'Hay 120 kg de harina.', 'model' => 'qwen3.5:9b (respaldo local)']);
        Http::assertSent(fn ($r) => str_ends_with($r->url(), '/api/chat') && $r['model'] === 'qwen3.5:9b' && $r['think'] === false);
    }

    public function test_si_la_nube_responde_vacio_responde_el_modelo_local(): void
    {
        Http::fake(['*/api/chat' => Http::sequence()
            ->push(['message' => ['content' => '']], 200)
            ->push(['message' => ['content' => 'Hay 120 kg de harina.']], 200)]);

        $this->preguntar()->assertOk()->assertJson(['model' => 'qwen3.5:9b (respaldo local)']);
    }

    public function test_si_ambos_fallan_pasa_a_modo_texto(): void
    {
        Http::fake(['*/api/chat' => Http::response(['error' => 'x'], 503)]);

        $this->preguntar()->assertOk()->assertJson(['model' => 'text-mode', 'source' => 'fallback']);
    }
}
