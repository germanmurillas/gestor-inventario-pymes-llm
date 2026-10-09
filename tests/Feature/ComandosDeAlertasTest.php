<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Revisión contra-tesis (5-oct-2026): los comandos programados de RF-07 (alertas FEFO) y RF-08
 * (stock bajo) no tenían pruebas. Se verifica que notifican al administrador y que respetan su interruptor.
 */
class ComandosDeAlertasTest extends TestCase
{
    use RefreshDatabase;

    private function activar(string $clave, string $valor = 'true'): void
    {
        DB::table('settings')->updateOrInsert(['clave' => $clave], ['valor' => $valor]);
    }

    public function test_alertas_fefo_notifican_al_admin_los_lotes_por_vencer_y_no_los_vencidos(): void
    {
        $this->activar('notif_fefo_activo');
        $admin = User::factory()->create(['role' => 'admin']);
        $m = Material::factory()->create(['name' => 'Levadura']);
        Lote::factory()->create(['material_id' => $m->id, 'batch_number' => 'LEV-PRONTO', 'expiration_date' => now()->addDays(3)]);
        Lote::factory()->create(['material_id' => $m->id, 'batch_number' => 'LEV-LEJOS', 'expiration_date' => now()->addDays(200)]);
        Lote::factory()->create(['material_id' => $m->id, 'batch_number' => 'LEV-VENCIDO', 'expiration_date' => now()->subDay()]);

        $this->artisan('alerts:fefo')->assertSuccessful();

        $titulos = Notification::where('user_id', $admin->id)->pluck('titulo')->join(' | ');
        $this->assertStringContainsString('LEV-PRONTO', $titulos);
        $this->assertStringNotContainsString('LEV-LEJOS', $titulos);
        $this->assertStringNotContainsString('LEV-VENCIDO', $titulos);
        $this->assertSame('critico', Notification::where('user_id', $admin->id)->value('tipo'));
    }

    public function test_alertas_fefo_desactivadas_no_notifican(): void
    {
        $this->activar('notif_fefo_activo', 'false');
        User::factory()->create(['role' => 'admin']);
        Lote::factory()->create(['expiration_date' => now()->addDays(3)]);

        $this->artisan('alerts:fefo')->assertSuccessful();

        $this->assertSame(0, Notification::count());
    }

    public function test_stock_bajo_notifica_solo_los_insumos_bajo_su_minimo(): void
    {
        $this->activar('notif_stock_bajo');
        $admin = User::factory()->create(['role' => 'admin']);
        $sal = Material::factory()->create(['name' => 'Sal', 'stock_minimo' => 50]);
        $harina = Material::factory()->create(['name' => 'Harina', 'stock_minimo' => 50]);
        Lote::factory()->create(['material_id' => $sal->id, 'quantity' => 10]);
        Lote::factory()->create(['material_id' => $harina->id, 'quantity' => 80]);

        $this->artisan('alerts:low-stock')->assertSuccessful();

        $titulos = Notification::where('user_id', $admin->id)->pluck('titulo')->all();
        $this->assertSame(['📦 Stock bajo: Sal'], $titulos);
    }

    public function test_stock_bajo_desactivado_no_notifica(): void
    {
        $this->activar('notif_stock_bajo', 'false');
        User::factory()->create(['role' => 'admin']);
        Lote::factory()->create(['material_id' => Material::factory()->create(['stock_minimo' => 50])->id, 'quantity' => 1]);

        $this->artisan('alerts:low-stock')->assertSuccessful();

        $this->assertSame(0, Notification::count());
    }
}
