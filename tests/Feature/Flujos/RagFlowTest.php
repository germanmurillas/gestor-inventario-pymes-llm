<?php

namespace Tests\Feature\Flujos;

use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class RagFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_rag_responde_usando_fake(): void
    {
        Http::fake([
            '*' => Http::response(
                ['choices' => [['message' => ['content' => 'Stock harina: 120 kg']]]], 200),
        ]);

        Lote::factory()->create();

        $resp = $this->actingAs(User::factory()->create())
            ->postJson('/chat-rag', ['prompt' => 'Cuanta harina hay?']);

        $resp->assertOk();
    }
}
