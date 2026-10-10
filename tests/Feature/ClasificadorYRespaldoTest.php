<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as PeticionHttp;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Clasificador: el modelo decide primero y los patrones son la red de seguridad. Respaldo en la nube antes del local. */
class ClasificadorYRespaldoTest extends TestCase
{
    use RefreshDatabase;

    private function ajustes(array $extra = []): User
    {
        foreach (['llm_source' => 'local', 'llm_modelo' => 'gpt-oss:120b-cloud', 'llm_activo' => 'true'] + $extra as $clave => $valor) {
            DB::table('settings')->insert(['clave' => $clave, 'valor' => $valor]);
        }
        return User::factory()->create(['role' => 'admin']);
    }

    private function preguntar(User $u, string $q)
    {
        return $this->actingAs($u)->postJson('/chat-rag', ['prompt' => $q])->assertOk();
    }

    public function test_el_modelo_clasifica_primero_lo_que_los_patrones_no_entienden(): void
    {
        $u = $this->ajustes(['llm_clasificador_modelo' => 'gpt-oss:120b-cloud']);
        Http::fake(['*/api/chat' => Http::sequence()
            ->push(['message' => ['content' => 'critical_alerts']])
            ->push(['message' => ['content' => 'Nada por vencer.']])]);

        // Los patrones la tomarían como existencias ("hay que sacar"); el modelo la entiende como alertas.
        $this->preguntar($u, '¿Qué se me está dañando y hay que sacar?')->assertJsonPath('intent', 'critical_alerts');
    }

    public function test_si_el_modelo_responde_algo_fuera_de_las_categorias_deciden_los_patrones(): void
    {
        $u = $this->ajustes(['llm_clasificador_modelo' => 'gpt-oss:120b-cloud']);
        Http::fake(['*/api/chat' => Http::sequence()
            ->push(['message' => ['content' => 'Creo que pregunta por la ubicación del insumo']])
            ->push(['message' => ['content' => 'En la bodega seca.']])]);

        $this->preguntar($u, '¿Dónde está la harina?')->assertJsonPath('intent', 'location');
    }

    public function test_si_el_modelo_falla_deciden_los_patrones(): void
    {
        $u = $this->ajustes(['llm_clasificador_modelo' => 'gpt-oss:120b-cloud']);
        Http::fake(['*/api/chat' => Http::sequence()
            ->push(['error' => 'no disponible'], 503)
            ->push(['message' => ['content' => 'En la bodega seca.']])]);

        $this->preguntar($u, '¿Dónde está la harina?')->assertJsonPath('intent', 'location');
    }

    public function test_un_numero_de_lote_no_pasa_por_el_modelo_clasificador(): void
    {
        $u = $this->ajustes(['llm_clasificador_modelo' => 'gpt-oss:120b-cloud']);
        Http::fake(['*/api/chat' => Http::response(['message' => ['content' => 'Lote sin datos.']])]);

        $this->preguntar($u, '¿Qué tiene el lote HAR-01-260901?')->assertJsonPath('intent', 'batch_info');
        Http::assertSentCount(1);
    }

    public function test_si_el_principal_falla_responde_el_respaldo_en_la_nube_antes_que_el_local(): void
    {
        $u = $this->ajustes(['llm_respaldo_fuente' => 'opencode-go', 'llm_respaldo_modelo' => 'glm-5.3-flash']);
        ApiKey::create(['nombre' => 'pruebas', 'key' => 'clave-de-prueba', 'tipo' => 'opencode-go', 'activo' => true,
            'base_url' => 'https://opencode.ai/zen/go/v1/chat/completions']);
        Http::fake([
            '*/api/chat' => Http::response(['error' => 'caído'], 500),
            'opencode.ai/*' => Http::response(['choices' => [['message' => ['content' => 'Hay 120 kg de harina.']]],
                'usage' => ['prompt_tokens' => 500, 'completion_tokens' => 20]]),
        ]);

        $this->preguntar($u, '¿Cuánta harina hay?')
            ->assertJsonPath('model', 'glm-5.3-flash (respaldo en la nube)')
            ->assertJsonPath('source', 'opencode-go')
            ->assertJsonPath('tokens.entrada', 500);
        Http::assertSent(fn (PeticionHttp $p) => str_contains($p->url(), 'opencode.ai') && $p['model'] === 'glm-5.3-flash'
            && str_starts_with($p->header('x-opencode-session')[0] ?? '', 'sess-pymetory-'));
    }

    public function test_si_el_modelo_omite_los_vencidos_el_sistema_los_agrega_y_no_los_repite_si_ya_estan(): void
    {
        $u = $this->ajustes();
        $m = \App\Models\Material::factory()->create(['name' => 'Huevo líquido']);
        \App\Models\Lote::factory()->create(['material_id' => $m->id, 'batch_number' => 'HUE-VIEJO', 'quantity' => 5, 'expiration_date' => now()->subDays(3)]);
        \App\Models\Lote::factory()->create(['material_id' => $m->id, 'batch_number' => 'HUE-NUEVO', 'quantity' => 5, 'expiration_date' => now()->addDays(2)]);

        Http::fake(['*/api/chat' => Http::sequence()
            ->push(['message' => ['content' => 'Por vencer: Huevo líquido, lote HUE-NUEVO.']])
            ->push(['message' => ['content' => 'Por vencer: HUE-NUEVO. Vencido, dar de baja: HUE‑VIEJO.']])]);
        $r = $this->preguntar($u, '¿Qué está por vencer?')->json('response');
        $this->assertStringContainsString('HUE-NUEVO', $r);
        $this->assertStringContainsString('Lotes vencidos (no se despachan; deben darse de baja', $r);
        $this->assertStringContainsString('HUE-VIEJO', $r);

        $r = $this->preguntar($u, '¿Qué lotes están por vencer?')->json('response');
        $this->assertStringNotContainsString('Lotes vencidos (no se despachan', $r);
    }
}
