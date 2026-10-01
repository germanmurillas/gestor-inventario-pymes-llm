<?php

namespace Tests\Feature;

use App\Models\ChatHistory;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Historial del asistente: por páginas de 30 y sin las sesiones de rag:evaluar. */
class HistorialChatTest extends TestCase
{
    use RefreshDatabase;

    private function sesion(User $u, string $id, string $titulo, int $minutos): void
    {
        ChatHistory::create(['user_id' => $u->id, 'session_id' => $id, 'session_title' => $titulo, 'prompt' => 'p', 'response' => 'r', 'source' => 'local'])
            ->forceFill(['created_at' => now()->subMinutes($minutos)])->save();
    }

    public function test_las_sesiones_se_entregan_de_a_30_de_la_mas_reciente_a_la_mas_antigua(): void
    {
        $u = User::factory()->create(['role' => 'admin']);
        for ($i = 0; $i < 35; $i++) $this->sesion($u, "s{$i}", "Consulta {$i}", $i);

        $p0 = $this->actingAs($u)->getJson('/chat-sessions')->assertOk();
        $this->assertCount(30, $p0->json('sessions'));
        $this->assertTrue($p0->json('hay_mas'));
        $this->assertSame('s0', $p0->json('sessions.0.session_id'));

        $p1 = $this->actingAs($u)->getJson('/chat-sessions?pagina=1')->assertOk();
        $this->assertCount(5, $p1->json('sessions'));
        $this->assertFalse($p1->json('hay_mas'));
    }

    public function test_las_consultas_del_evaluador_no_aparecen_en_el_historial(): void
    {
        $u = User::factory()->create(['role' => 'admin']);
        $this->sesion($u, 'session_abc', '¿Cuánta harina hay?', 1);
        for ($i = 0; $i < 5; $i++) $this->sesion($u, "rag-evaluar:prueba:{$i}:x", 'Evaluación: prueba', 0);

        $r = $this->actingAs($u)->getJson('/chat-sessions')->assertOk();
        $this->assertSame(['session_abc'], array_column($r->json('sessions'), 'session_id'));
    }

    public function test_la_busqueda_se_hace_sobre_todo_el_historial(): void
    {
        $u = User::factory()->create(['role' => 'admin']);
        for ($i = 0; $i < 40; $i++) $this->sesion($u, "s{$i}", "Consulta {$i}", $i);
        $this->sesion($u, 'vieja', 'Ajonjolí para el pan', 500);

        $r = $this->actingAs($u)->getJson('/chat-sessions?buscar=ajonjol')->assertOk();
        $this->assertSame(['vieja'], array_column($r->json('sessions'), 'session_id'));
    }
}
