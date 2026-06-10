<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AlertServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_send_in_app_crea_notificacion_para_admin(): void
    {
        User::factory()->create(['role' => 'admin']);

        app(\App\Services\AlertService::class)->sendInApp('critico', 'Stock bajo', 'Harina < minimo');

        $this->assertDatabaseHas('notifications', ['tipo' => 'critico', 'titulo' => 'Stock bajo']);
    }
}
