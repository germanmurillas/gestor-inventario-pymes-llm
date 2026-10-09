<?php

namespace Tests\Feature;

use App\Models\ChatHistory;
use App\Models\Lote;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

/**
 * Pedido de la prueba con usuario: «¿y eso para cuánto alcanza?» después de preguntar por un insumo
 * debe responder sobre ese insumo (antes, sin nombre de insumo, no encontraba nada).
 */
class PreguntasDeSeguimientoTest extends TestCase
{
    use RefreshDatabase;

    private function sistemaEnviado(): string
    {
        $sistema = '';
        Http::assertSent(function ($request) use (&$sistema) {
            $sistema = $request->data()['messages'][0]['content'] ?? $sistema;
            return true;
        });
        return $sistema;
    }

    public function test_eso_toma_el_insumo_de_la_pregunta_anterior_y_pide_el_pronostico(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $grasa = Material::factory()->create(['name' => 'Grasa vegetal', 'unit' => 'kg']);
        Material::factory()->create(['name' => 'Harina de trigo', 'unit' => 'kg']);
        Lote::factory()->create(['material_id' => $grasa->id, 'quantity' => 120, 'expiration_date' => now()->addDays(60)]);
        ChatHistory::create(['user_id' => $admin->id, 'session_id' => 'conv-1', 'session_title' => 'Grasas', 'prompt' => '¿Cuánta grasa vegetal tenemos?', 'response' => 'Hay 120 kg.', 'source' => 'local']);
        Http::fake(['*' => Http::response(['message' => ['content' => 'Alcanza para...'], 'choices' => [['message' => ['content' => 'Alcanza para...']]]], 200)]);

        $this->actingAs($admin)->postJson('/chat-rag', ['prompt' => '¿Y eso para cuánto alcanza?', 'session_id' => 'conv-1'])->assertOk();

        $sistema = $this->sistemaEnviado();
        $this->assertStringContainsString('PROYECCIÓN DE REABASTECIMIENTO', $sistema);
        $this->assertStringContainsString('Grasa vegetal', $sistema);
        $this->assertStringNotContainsString('Harina de trigo', $sistema);
        $this->assertStringNotContainsString('MATERIAL NO ENCONTRADO', $sistema);
    }

    public function test_sin_referencia_a_lo_anterior_no_arrastra_insumos(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        Material::factory()->create(['name' => 'Grasa vegetal', 'unit' => 'kg']);
        ChatHistory::create(['user_id' => $admin->id, 'session_id' => 'conv-2', 'session_title' => 'Grasas', 'prompt' => '¿Cuánta grasa vegetal tenemos?', 'response' => 'Hay 120 kg.', 'source' => 'local']);
        Http::fake(['*' => Http::response(['message' => ['content' => 'ok'], 'choices' => [['message' => ['content' => 'ok']]]], 200)]);

        $this->actingAs($admin)->postJson('/chat-rag', ['prompt' => '¿Cuánto ajonjolí hay?', 'session_id' => 'conv-2'])->assertOk();

        $this->assertStringContainsString('MATERIAL NO ENCONTRADO', $this->sistemaEnviado());
    }
}
