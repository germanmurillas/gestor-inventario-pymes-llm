<?php

namespace Tests\Feature;

use App\Models\KanbanItem;
use App\Models\User;
use Database\Seeders\KanbanProyectoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class KanbanProyectoSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_cada_tarjeta_hecha_cita_su_issue_o_commit(): void
    {
        $admin = User::factory()->create(['email' => 'admin@pymetory.com', 'role' => 'admin']);
        $otro = User::factory()->create(['role' => 'admin']);
        KanbanItem::create(['user_id' => $admin->id, 'title' => 'Tarjeta vieja', 'column' => 'todo', 'position' => 0]);
        KanbanItem::create(['user_id' => $otro->id, 'title' => 'De otro usuario', 'column' => 'todo', 'position' => 0]);

        $this->seed(KanbanProyectoSeeder::class);

        $total = count(json_decode(file_get_contents(database_path('seeders/data/kanban_proyecto.json')), true)['tarjetas']);
        $this->assertSame($total, KanbanItem::where('user_id', $admin->id)->count());
        $this->assertDatabaseMissing('kanban_items', ['title' => 'Tarjeta vieja']);
        $this->assertDatabaseHas('kanban_items', ['title' => 'De otro usuario']);

        KanbanItem::where('user_id', $admin->id)->where('column', 'done')->each(function (KanbanItem $k) {
            $this->assertMatchesRegularExpression('/Issue #\d+|Commit [0-9a-f]{7}|reuniones\.pymetory\.com/', $k->description, $k->title);
        });
    }
}
