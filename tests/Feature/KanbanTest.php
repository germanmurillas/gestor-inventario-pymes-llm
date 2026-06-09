<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\KanbanItem;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanTest extends TestCase
{
    use RefreshDatabase;

    public function test_listar_kanban(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->get('/kanban');
        $response->assertStatus(200);
    }

    public function test_crear_tarjeta_kanban(): void
    {
        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/kanban', [
            'title' => 'Nueva Tarea',
            'column' => 'todo',
        ]);
        $this->assertContains($response->status(), [200, 201, 302]);
    }

    public function test_reordenar_tarjeta_kanban(): void
    {
        $user = User::factory()->create();
        $item = KanbanItem::create([
            'title' => 'Tarea Mover',
            'column' => 'todo',
            'order' => 1,
            'user_id' => $user->id,
        ]);

        $response = $this->actingAs($user)->postJson('/kanban/reorder', [
            'item_id' => $item->id,
            'column' => 'in_progress',
            'position' => 0,
        ]);

        $this->assertContains($response->status(), [200, 302]);
    }
}
