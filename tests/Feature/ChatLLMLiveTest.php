<?php

namespace Tests\Feature;

use App\Models\ApiKey;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChatLLMLiveTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Test LIVE del RAG: pega a OpenCode con key real de api_keys.
     * SKIP por defecto (los límites mensuales de OpenCode lo romperían en CI).
     * Para correr en defensa:
     *   OPENCODE_LIVE=1 OPENCODE_KEY=sk-... php artisan test --filter ChatLLMLiveTest
     */
    public function test_rag_live_con_opencode_key_real(): void
    {
        if (!env('OPENCODE_LIVE')) {
            $this->markTestSkipped('Test live requiere OPENCODE_LIVE=1 y OPENCODE_KEY configurada');
        }

        $key = env('OPENCODE_KEY');
        if (!$key) {
            $this->markTestSkipped('OPENCODE_KEY no configurada');
        }

        $user = User::factory()->create();

        ApiKey::create([
            'nombre'    => 'Test OpenCode',
            'key'       => $key,
            'tipo'      => 'opencode',
            'base_url'  => 'https://opencode.ai/zen/go/v1',
            'model_name' => 'deepseek-v4-pro',
            'is_active' => true,
        ]);

        $resp = $this->actingAs($user)
            ->postJson('/chat-rag', ['prompt' => 'Cuantos lotes activos hay en el inventario?']);

        $resp->assertOk();

        $data = $resp->json();
        $this->assertNotEmpty($data['response'] ?? $data['message'] ?? '',
            'RAG debe responder algo no vacio. Keys: ' . implode(',', array_keys($data)));
    }
}
