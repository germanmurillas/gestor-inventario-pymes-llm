<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LabelTest extends TestCase
{
    use RefreshDatabase;

    public function test_index_lista_solo_lotes_activos(): void
    {
        Lote::factory()->create(['status' => 'active']);
        Lote::factory()->create(['status' => 'consumed']);

        $resp = $this->actingAs(User::factory()->create())->getJson('/inventory/labels');

        $resp->assertOk();
        $data = $resp->json();
        $this->assertCount(1, $data['lotes'] ?? []);
    }

    public function test_generate_valida_ids(): void
    {
        $resp = $this->actingAs(User::factory()->create())
            ->postJson('/inventory/labels/generate', ['ids' => []]);

        $resp->assertStatus(422);
    }
}
