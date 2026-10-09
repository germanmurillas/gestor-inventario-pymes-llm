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

    public function test_telegram_usa_la_configuracion_aunque_este_en_cache(): void
    {
        config(['services.telegram.token' => 'TOKEN-PRUEBA', 'services.telegram.chat_id' => '123']);
        \Illuminate\Support\Facades\Http::fake(['api.telegram.org/*' => \Illuminate\Support\Facades\Http::response(['ok' => true])]);

        app(\App\Services\AlertService::class)->sendTelegram('critico', 'Lote por vencer', 'Prueba');

        \Illuminate\Support\Facades\Http::assertSent(fn ($r) => str_contains($r->url(), 'botTOKEN-PRUEBA') && ($r->data()['chat_id'] ?? null) == '123');
    }
}
