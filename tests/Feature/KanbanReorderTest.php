<?php

namespace Tests\Feature;

use App\Models\KanbanItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanReorderTest extends TestCase
{
    use RefreshDatabase;

    public function test_reorder_entre_columnas_no_deja_huecos_ni_colisiones(): void
    {
        $user = User::factory()->create();
        $a = KanbanItem::create(['user_id' => $user->id, 'title' => 'A', 'column' => 'todo', 'position' => 1]);
        $b = KanbanItem::create(['user_id' => $user->id, 'title' => 'B', 'column' => 'todo', 'position' => 2]);
        $c = KanbanItem::create(['user_id' => $user->id, 'title' => 'C', 'column' => 'todo', 'position' => 3]);
        $d = KanbanItem::create(['user_id' => $user->id, 'title' => 'D', 'column' => 'in_progress', 'position' => 1]);
        $e = KanbanItem::create(['user_id' => $user->id, 'title' => 'E', 'column' => 'in_progress', 'position' => 2]);

        $resp = $this->actingAs($user)->postJson('/kanban/reorder', [
            'item_id'  => $b->id,
            'column'   => 'in_progress',
            'position' => 2,
        ]);

        $resp->assertOk();

        $todo = KanbanItem::where('user_id', $user->id)->where('column', 'todo')->orderBy('position')->pluck('title', 'position')->toArray();
        $this->assertEquals([1 => 'A', 2 => 'C'], $todo,
            'Columna todo deberia tener A(1) y C(2) sin hueco. Actual: ' . json_encode($todo)
            . ' | in_progress: ' . json_encode(KanbanItem::where('user_id', $user->id)->where('column', 'in_progress')->orderBy('position')->pluck('title', 'position')->toArray()));
        $this->assertCount(2, $todo);

        $inProgress = KanbanItem::where('user_id', $user->id)->where('column', 'in_progress')->orderBy('position')->pluck('title', 'position')->toArray();
        $this->assertCount(3, $inProgress, 'in_progress debe tener D, B, E en posiciones 1, 2, 3');
        $this->assertEquals(['D', 'B', 'E'], array_values($inProgress));
    }

    public function test_reorder_dentro_de_misma_columna_no_colisiona_con_si_mismo(): void
    {
        $user = User::factory()->create();
        KanbanItem::create(['user_id' => $user->id, 'title' => 'A', 'column' => 'todo', 'position' => 1]);
        $b = KanbanItem::create(['user_id' => $user->id, 'title' => 'B', 'column' => 'todo', 'position' => 2]);
        KanbanItem::create(['user_id' => $user->id, 'title' => 'C', 'column' => 'todo', 'position' => 3]);

        $resp = $this->actingAs($user)->postJson('/kanban/reorder', [
            'item_id'  => $b->id,
            'column'   => 'todo',
            'position' => 1,
        ]);

        $resp->assertOk();

        $todo = KanbanItem::where('user_id', $user->id)->where('column', 'todo')->orderBy('position')->pluck('title', 'position')->toArray();
        $this->assertCount(3, $todo, 'Sigue habiendo 3 items');
        $this->assertEquals(['B', 'A', 'C'], array_values($todo),
            'B deberia estar en posicion 1, A en 2, C en 3 (sin colision)');

        $positions = KanbanItem::where('user_id', $user->id)->pluck('position')->toArray();
        $this->assertCount(3, array_unique($positions), 'No debe haber posiciones duplicadas');
    }

    public function test_reorder_mismo_column_sube_al_final(): void
    {
        $user = User::factory()->create();
        $a = KanbanItem::create(['user_id' => $user->id, 'title' => 'A', 'column' => 'todo', 'position' => 1]);
        KanbanItem::create(['user_id' => $user->id, 'title' => 'B', 'column' => 'todo', 'position' => 2]);
        KanbanItem::create(['user_id' => $user->id, 'title' => 'C', 'column' => 'todo', 'position' => 3]);

        $resp = $this->actingAs($user)->postJson('/kanban/reorder', [
            'item_id'  => $a->id,
            'column'   => 'todo',
            'position' => 3,
        ]);

        $resp->assertOk();

        $todo = KanbanItem::where('user_id', $user->id)->where('column', 'todo')->orderBy('position')->pluck('title')->toArray();
        $this->assertEquals(['B', 'C', 'A'], $todo, 'A debe quedar al final');

        $positions = KanbanItem::where('user_id', $user->id)->pluck('position')->toArray();
        $this->assertEquals([1, 2, 3], sort($positions) ? $positions : $positions, 'Posiciones deben ser 1, 2, 3');
        $this->assertCount(3, array_unique($positions), 'No debe haber posiciones duplicadas');
    }
}
