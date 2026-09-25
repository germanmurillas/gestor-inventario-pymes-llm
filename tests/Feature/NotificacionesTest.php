<?php

namespace Tests\Feature;

use App\Models\Notification;
use App\Models\User;
use App\Services\AlertService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NotificacionesTest extends TestCase
{
    use RefreshDatabase;

    public function test_la_bandeja_muestra_solo_las_alertas_del_usuario(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $otro = User::factory()->create(['role' => 'admin']);
        Notification::create(['user_id' => $admin->id, 'tipo' => 'critico', 'titulo' => 'Lote A vence en 2 días', 'mensaje' => 'x']);
        Notification::create(['user_id' => $otro->id, 'tipo' => 'warning', 'titulo' => 'Ajena', 'mensaje' => 'x']);

        $this->actingAs($admin)->getJson('/api/notificaciones')
            ->assertOk()
            ->assertJsonPath('sin_leer', 1)
            ->assertJsonCount(1, 'notificaciones')
            ->assertJsonPath('notificaciones.0.titulo', 'Lote A vence en 2 días');
    }

    public function test_marcar_leida_y_no_tocar_la_de_otro_usuario(): void
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $otro = User::factory()->create(['role' => 'operario']);
        $propia = Notification::create(['user_id' => $admin->id, 'tipo' => 'info', 'titulo' => 'T', 'mensaje' => 'x']);
        $ajena = Notification::create(['user_id' => $otro->id, 'tipo' => 'info', 'titulo' => 'T', 'mensaje' => 'x']);

        $this->actingAs($admin)->postJson("/api/notificaciones/{$propia->id}/leida")->assertOk();
        $this->actingAs($admin)->postJson("/api/notificaciones/{$ajena->id}/leida")->assertForbidden();

        $this->assertTrue($propia->fresh()->leida);
        $this->assertFalse($ajena->fresh()->leida);
    }

    public function test_el_cron_no_repite_un_aviso_sin_leer(): void
    {
        User::factory()->create(['role' => 'admin']);
        $servicio = app(AlertService::class);

        $servicio->send('warning', 'Stock bajo: Harina', 'mensaje');
        $servicio->send('warning', 'Stock bajo: Harina', 'mensaje');

        $this->assertSame(1, Notification::where('titulo', 'Stock bajo: Harina')->count());
    }
}
