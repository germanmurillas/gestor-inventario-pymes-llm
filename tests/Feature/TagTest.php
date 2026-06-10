<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TagTest extends TestCase
{
    use RefreshDatabase;

    private function admin(): User
    {
        return User::factory()->create(['role' => 'admin']);
    }

    public function test_crea_tag(): void
    {
        $resp = $this->actingAs($this->admin())
            ->postJson('/api/tags', ['nombre' => 'Lacteos', 'color' => '#E63B2E']);

        $resp->assertStatus(201)->assertJsonFragment(['nombre' => 'Lacteos']);
        $this->assertDatabaseHas('tags', ['nombre' => 'Lacteos']);
    }

    public function test_rechaza_tag_duplicado(): void
    {
        $this->actingAs($this->admin())->postJson('/api/tags', ['nombre' => 'X', 'color' => '#000']);

        $resp = $this->actingAs($this->admin())->postJson('/api/tags', ['nombre' => 'X', 'color' => '#111']);

        $resp->assertStatus(422);
    }

    public function test_asigna_tags_a_material(): void
    {
        $material = \App\Models\Material::factory()->create();
        $tag = \App\Models\Tag::create(['nombre' => 'Frio', 'color' => '#00f', 'active' => true]);

        $resp = $this->actingAs($this->admin())
            ->postJson("/api/materials/{$material->id}/tags", ['tag_ids' => [$tag->id]]);

        $resp->assertOk();
        $this->assertDatabaseHas('material_tag', ['material_id' => $material->id, 'tag_id' => $tag->id]);
    }
}
