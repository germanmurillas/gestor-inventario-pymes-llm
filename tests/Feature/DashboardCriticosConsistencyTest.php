<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\Material;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class DashboardCriticosConsistencyTest extends TestCase
{
    use RefreshDatabase;

    public function test_dashboard_cuenta_lotes_vencidos_como_criticos(): void
    {
        $mat = Material::factory()->create();

        $vencido = Lote::factory()->create([
            'material_id' => $mat->id,
            'quantity' => 30,
            'expiration_date' => now()->subDays(5),
            'status' => 'active',
        ]);

        $critico = Lote::factory()->create([
            'material_id' => $mat->id,
            'quantity' => 50,
            'expiration_date' => now()->addDays(10),
            'status' => 'active',
        ]);

        $sano = Lote::factory()->create([
            'material_id' => $mat->id,
            'quantity' => 100,
            'expiration_date' => now()->addDays(60),
            'status' => 'active',
        ]);

        $this->assertTrue($vencido->fresh()->is_critical);
        $this->assertTrue($critico->fresh()->is_critical);
        $this->assertFalse($sano->fresh()->is_critical);

        $admin = User::factory()->create(['role' => 'admin']);
        $resp = $this->actingAs($admin)->get('/dashboard');
        $resp->assertOk();

        $page = $resp->viewData('page');
        $stats = $page['props']['dashboardStats']['summary'] ?? [];

        $this->assertEquals(2, $stats['lotesCriticos'] ?? null,
            'Dashboard debe contar 2 críticos (1 vencido + 1 vence en 10d) pero cuenta '
            . ($stats['lotesCriticos'] ?? 'NULL'));
    }
}
