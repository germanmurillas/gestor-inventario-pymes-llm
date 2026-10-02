<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request as PeticionHttp;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/** Gestión segura de API keys: destinos permitidos, prueba sin gastar tokens, máscara y claves fuera de los ajustes. */
class ApiKeySeguridadTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    private function clave(array $extra = []): ApiKey
    {
        return ApiKey::create(['nombre' => 'Pruebas', 'key' => 'sk-demo-abcdefgh1234', 'tipo' => 'opencode-go', 'activo' => true,
            'base_url' => 'https://opencode.ai/zen/go/v1/chat/completions'] + $extra);
    }

    public function test_no_acepta_una_base_url_fuera_del_servidor_oficial(): void
    {
        $this->actingAs($this->admin())->postJson('/api/api-keys', [
            'nombre' => 'Trampa', 'key' => 'sk-demo-1', 'tipo' => 'opencode', 'base_url' => 'https://atacante.example/v1/chat/completions',
        ])->assertStatus(422)->assertJsonValidationErrors('base_url');

        $k = $this->clave();
        $this->actingAs($this->admin())->putJson("/api/api-keys/{$k->id}", ['base_url' => 'http://169.254.169.254/latest'])
            ->assertStatus(422);
        $this->assertSame('https://opencode.ai/zen/go/v1/chat/completions', $k->fresh()->base_url);
    }

    public function test_probar_consulta_la_lista_de_modelos_sin_gastar_tokens(): void
    {
        $k = $this->clave();
        Http::fake(['opencode.ai/*' => Http::response(['data' => []], 200)]);

        $this->actingAs($this->admin())->postJson("/api/api-keys/{$k->id}/test")->assertOk()->assertJsonPath('ok', true);

        Http::assertSent(fn (PeticionHttp $p) => $p->method() === 'GET' && $p->url() === 'https://opencode.ai/zen/go/v1/models'
            && $p->hasHeader('Authorization', 'Bearer sk-demo-abcdefgh1234'));
        Http::assertSentCount(1);
        $this->assertSame(1, DB::table('audit_log')->where('modulo', 'ApiKeys')->where('accion', 'probar')->count());
    }

    public function test_probar_explica_una_clave_rechazada_sin_detalles_internos(): void
    {
        $k = $this->clave();
        Http::fake(['opencode.ai/*' => Http::response(['error' => 'Invalid credential en 10.0.0.5'], 401)]);

        $r = $this->actingAs($this->admin())->postJson("/api/api-keys/{$k->id}/test")->assertOk();

        $r->assertJsonPath('ok', false)->assertJsonPath('detail', 'El proveedor rechazó la clave (revocada o incorrecta).');
        $this->assertStringNotContainsString('10.0.0.5', $r->getContent());
    }

    public function test_probar_no_envia_la_clave_a_un_destino_no_permitido(): void
    {
        $k = $this->clave();
        DB::table('api_keys')->where('id', $k->id)->update(['base_url' => 'https://atacante.example/v1/chat/completions']);
        Http::fake();

        $this->actingAs($this->admin())->postJson("/api/api-keys/{$k->id}/test")->assertStatus(422);

        Http::assertNothingSent();
    }

    public function test_la_mascara_solo_muestra_los_ultimos_cuatro(): void
    {
        $this->clave();

        $r = $this->actingAs($this->admin())->getJson('/api/api-keys')->assertOk();

        $this->assertSame('••••••••1234', $r->json('api_keys.0.key_masked'));
        $this->assertStringNotContainsString('sk-d', $r->getContent());
    }

    public function test_los_ajustes_no_exponen_ni_guardan_claves(): void
    {
        DB::table('settings')->insert([['clave' => 'llm_opencode_key', 'valor' => 'oc_sk_secreto', 'grupo' => 'llm'], ['clave' => 'app_nombre', 'valor' => 'Pymetory', 'grupo' => 'general']]);
        $admin = $this->admin();

        $this->assertStringNotContainsString('oc_sk_secreto', $this->actingAs($admin)->getJson('/settings')->getContent());
        $this->actingAs($admin)->getJson('/settings/llm_opencode_key')->assertNotFound();
        $this->actingAs($admin)->putJson('/settings', ['settings' => ['llm_opencode_key' => 'otra']])->assertStatus(422);
        $this->assertSame('oc_sk_secreto', DB::table('settings')->where('clave', 'llm_opencode_key')->value('valor'));
    }

    public function test_una_clave_ilegible_no_tumba_al_asistente(): void
    {
        foreach (['llm_source' => 'opencode-go', 'llm_modelo' => 'glm-prueba', 'llm_activo' => 'true'] as $c => $v) {
            DB::table('settings')->insert(['clave' => $c, 'valor' => $v]);
        }
        DB::table('api_keys')->insert(['nombre' => 'Vieja', 'key' => 'eyJpdiI6ImJhc3VyYSJ9', 'tipo' => 'opencode-go', 'activo' => true,
            'created_at' => now(), 'updated_at' => now()]);
        Http::fake(['*' => Http::response(['error' => 'sin clave'], 401)]);

        $this->actingAs($this->admin())->postJson('/chat-rag', ['prompt' => '¿Cuánta harina hay?'])->assertOk();
    }
}
