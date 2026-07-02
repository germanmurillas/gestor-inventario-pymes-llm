<?php

namespace Tests\Feature;

use App\Models\Lote;
use App\Models\User;
use App\Models\Material;
use App\Models\Bodega;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class ReportExportTest extends TestCase
{
    use RefreshDatabase;

    private function seedInventory(): void
    {
        $bodega = Bodega::factory()->create(['name' => 'Bodega A', 'status' => 'active']);
        $material = Material::factory()->create(['name' => 'Harina', 'code' => 'HAR-001']);

        Lote::factory()->create([
            'material_id' => $material->id,
            'bodega_id' => $bodega->id,
            'batch_number' => 'LT-001',
            'quantity' => 100,
            'expiration_date' => now()->addDays(30),
            'status' => 'active',
        ]);
    }

    // ── PDF exports: los 6 tipos no vacios ───────────────────────────────

    #[DataProvider('pdfTypes')]
    public function test_export_pdf_no_vacio(string $type): void
    {
        $this->seedInventory();
        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)
            ->get("/reports/export?type={$type}&format=pdf");

        $resp->assertOk();
        $this->assertStringContainsString('application/pdf', $resp->headers->get('content-type'));
        $this->assertNotEmpty($resp->getContent(), "PDF {$type} no debe estar vacio");
        $this->assertGreaterThan(500, strlen($resp->getContent()), "PDF {$type} debe tener contenido");
    }

    public static function pdfTypes(): array
    {
        return [
            'inventario'    => ['inventario'],
            'movimientos'   => ['movimientos'],
            'fefo'          => ['fefo'],
            'consumo'       => ['consumo'],
            'valorizacion'  => ['valorizacion'],
        ];
    }

    // ── CSV export ────────────────────────────────────────────────────────

    public function test_export_csv_descarga(): void
    {
        $this->seedInventory();
        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->get('/reports/export?type=inventario&format=csv');
        $resp->assertOk();
        $this->assertStringContainsString('csv', strtolower($resp->headers->get('content-type')));
    }

    // ── RBAC: usuarios autenticados pueden exportar reportes ──────────

    public function test_operario_autenticado_puede_exportar(): void
    {
        $this->seedInventory();
        $op = User::factory()->create(['role' => 'operario']);
        $resp = $this->actingAs($op)->get('/reports/export?type=inventario&format=pdf');
        // Reports usan solo auth+verified (no role:admin)
        $resp->assertOk();
    }

    // ── Ruta legacy (InventoryController delega a ReportController) ──────

    public function test_ruta_legacy_inventory_report_funciona(): void
    {
        $this->seedInventory();
        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->get('/inventory/report');
        $resp->assertOk();
        $this->assertStringContainsString('application/pdf', $resp->headers->get('content-type'));
    }

    public function test_ruta_legacy_inventory_csv_funciona(): void
    {
        $this->seedInventory();
        $admin = User::factory()->create(['role' => 'admin']);

        $resp = $this->actingAs($admin)->get('/inventory/report/csv');
        $resp->assertOk();
        $this->assertStringContainsString('csv', strtolower($resp->headers->get('content-type')));
    }
}
