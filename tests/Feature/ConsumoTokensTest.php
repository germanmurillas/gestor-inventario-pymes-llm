<?php

namespace Tests\Feature;

use App\Models\ChatHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as PeticionHttp;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Consumo de tokens por consulta: se toma del uso que reporta el proveedor y se guarda
 * en chat_histories para estimar el costo de operación del asistente.
 */
class ConsumoTokensTest extends TestCase
{
    use RefreshDatabase;

    private function configurar(string $fuente, string $modelo): User
    {
        foreach (['llm_source' => $fuente, 'llm_modelo' => $modelo, 'llm_activo' => 'true'] as $clave => $valor) {
            DB::table('settings')->insert(['clave' => $clave, 'valor' => $valor]);
        }
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_api_compatible_con_openai_guarda_tokens_de_usage(): void
    {
        $user = $this->configurar('external', 'gpt-prueba');
        Http::fake(['api.openai.com/*' => Http::response([
            'choices' => [['message' => ['content' => 'Hay 120 kg de harina.']]],
            'usage' => ['prompt_tokens' => 812, 'completion_tokens' => 37],
        ])]);

        $r = $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        $this->assertSame(['entrada' => 812, 'salida' => 37], $r->json('tokens'));
        $fila = ChatHistory::latest('id')->first();
        $this->assertSame([812, 37, 'gpt-prueba'], [$fila->tokens_entrada, $fila->tokens_salida, $fila->modelo]);
    }

    public function test_ollama_nativo_guarda_prompt_eval_count_y_eval_count(): void
    {
        $user = $this->configurar('local', 'gpt-oss:120b-cloud');
        Http::fake(['*/api/chat' => Http::response([
            'message' => ['content' => 'Hay 120 kg de harina.'],
            'prompt_eval_count' => 640, 'eval_count' => 52,
        ])]);

        $r = $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        $this->assertSame(['entrada' => 640, 'salida' => 52], $r->json('tokens'));
        $this->assertSame(640, ChatHistory::latest('id')->first()->tokens_entrada);
    }

    public function test_proveedor_sin_usage_deja_tokens_en_null(): void
    {
        $user = $this->configurar('external', 'gpt-prueba');
        Http::fake(['api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => 'Listo.']]]])]);

        $r = $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        $this->assertSame(['entrada' => null, 'salida' => null], $r->json('tokens'));
    }

    public function test_modelo_local_respeta_max_tokens(): void
    {
        $user = $this->configurar('local', 'qwen3.5:9b');
        DB::table('settings')->insert(['clave' => 'llm_max_tokens', 'valor' => '700']);
        Http::fake(['*/api/chat' => Http::response(['message' => ['content' => 'Hay 120 kg.'], 'prompt_eval_count' => 600, 'eval_count' => 10])]);

        $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        Http::assertSent(fn (PeticionHttp $p) => str_contains($p->url(), '/api/chat') && $p['options']['num_predict'] === 700);
    }

    public function test_modelo_cloud_por_ollama_no_tiene_tope_de_salida(): void
    {
        $user = $this->configurar('local', 'gpt-oss:120b-cloud');
        DB::table('settings')->insert(['clave' => 'llm_max_tokens', 'valor' => '700']);
        Http::fake(['*/api/chat' => Http::response(['message' => ['content' => 'Hay 120 kg.'], 'prompt_eval_count' => 600, 'eval_count' => 10])]);

        $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        Http::assertSent(fn (PeticionHttp $p) => str_contains($p->url(), '/api/chat') && $p['options']['num_predict'] === -1);
    }

    public function test_api_externa_no_envia_max_tokens(): void
    {
        $user = $this->configurar('external', 'gpt-prueba');
        DB::table('settings')->insert(['clave' => 'llm_max_tokens', 'valor' => '700']);
        Http::fake(['api.openai.com/*' => Http::response(['choices' => [['message' => ['content' => 'Hay 120 kg.']]]])]);

        $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        Http::assertSent(fn (PeticionHttp $p) => str_contains($p->url(), 'api.openai.com') && !isset($p['max_tokens']));
    }

    public function test_opencode_go_se_identifica_como_pymetory_y_no_como_agente_de_codigo(): void
    {
        $user = $this->configurar('opencode-go', 'glm-prueba');
        Http::fake(['opencode.ai/*' => Http::response([
            'choices' => [['message' => ['content' => 'Hay 120 kg de harina.']]],
            'usage' => ['prompt_tokens' => 700, 'completion_tokens' => 40],
        ])]);

        $this->actingAs($user)->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();

        Http::assertSent(function (PeticionHttp $p) {
            $ua = $p->header('User-Agent')[0] ?? '';
            return str_contains($p->url(), 'opencode.ai') && str_starts_with($ua, 'pymetory/') && !str_contains($ua, 'agent');
        });
    }
}
