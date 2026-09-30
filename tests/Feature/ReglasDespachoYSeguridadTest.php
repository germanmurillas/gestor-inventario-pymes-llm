<?php

namespace Tests\Feature;

use App\Models\Bodega;
use App\Models\Lote;
use App\Models\Material;
use App\Models\Movimiento;
use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderItem;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Reglas de despacho (cuarentena, vencimiento, FEFO), órdenes de compra y seguridad de acceso.
 * Nacieron de la revisión exploratoria del 30-sep-2026: cada una falló antes de su corrección.
 */
class ReglasDespachoYSeguridadTest extends TestCase
{
    use RefreshDatabase;

    private Bodega $bodega;
    private Material $material;

    protected function setUp(): void
    {
        parent::setUp();
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
        $this->bodega = Bodega::create(['code' => 'B1', 'name' => 'Bodega 1', 'ubicacion' => 'A', 'capacity' => 1000]);
        $this->material = Material::create(['code' => 'M1', 'name' => 'Harina', 'unit' => 'kg', 'stock_minimo' => 1]);
    }

    private function lote(string $batch, float $qty, string $vence, string $status = 'active'): Lote
    {
        return Lote::create([
            'material_id' => $this->material->id, 'bodega_id' => $this->bodega->id,
            'batch_number' => $batch, 'quantity' => $qty, 'unit_cost' => 1000,
            'expiration_date' => $vence, 'status' => $status,
        ]);
    }

    private function operario(): User { return User::factory()->create(['role' => 'operario']); }
    private function admin(): User { return User::factory()->create(['role' => 'admin']); }

    // ── Cuarentena ──────────────────────────────────────────────────────────
    public function test_no_se_puede_despachar_un_lote_en_cuarentena(): void
    {
        $l = $this->lote('Q-1', 50, now()->addDays(30)->toDateString(), 'quarantined');
        $this->actingAs($this->operario())->post("/inventory/lote/{$l->id}/consume", ['quantity' => 10, 'reason' => 'produccion']);
        $this->assertEquals(50, (float) $l->fresh()->quantity, 'Se despachó un lote en cuarentena');
    }

    public function test_ajuste_de_un_lote_en_cuarentena_no_lo_libera(): void
    {
        $l = $this->lote('Q-2', 50, now()->addDays(30)->toDateString(), 'quarantined');
        $this->actingAs($this->admin())->patch("/inventory/adjust/{$l->id}", ['new_quantity' => 45, 'reason' => 'conteo']);
        $this->assertEquals('quarantined', $l->fresh()->status, 'El ajuste sacó el lote de cuarentena');
    }

    // ── FEFO ────────────────────────────────────────────────────────────────
    public function test_despacho_por_lote_respeta_fefo(): void
    {
        $this->lote('A-VIEJO', 10, now()->addDays(5)->toDateString());
        $nuevo = $this->lote('B-NUEVO', 10, now()->addDays(60)->toDateString());
        $r = $this->actingAs($this->operario())->post("/inventory/lote/{$nuevo->id}/consume", ['quantity' => 5, 'reason' => 'produccion']);
        $this->assertEquals(10, (float) $nuevo->fresh()->quantity, 'Se despachó un lote que no es el primero en vencer (salta FEFO)');
    }

    public function test_fefo_no_despacha_lotes_vencidos(): void
    {
        $vencido = $this->lote('V-1', 10, now()->subDays(3)->toDateString());
        $this->lote('OK-1', 10, now()->addDays(20)->toDateString());
        $this->actingAs($this->operario())->postJson('/inventory/consume-fefo', ['material_id' => $this->material->id, 'quantity' => 5, 'reason' => 'produccion']);
        $this->assertEquals(10, (float) $vencido->fresh()->quantity, 'FEFO despachó un lote vencido a producción');
    }

    public function test_consumo_mayor_al_stock_se_rechaza(): void
    {
        $l = $this->lote('S-1', 10, now()->addDays(20)->toDateString());
        $this->actingAs($this->operario())->postJson('/inventory/consume-fefo', ['material_id' => $this->material->id, 'quantity' => 11, 'reason' => 'produccion']);
        $this->assertEquals(10, (float) $l->fresh()->quantity);
        $this->assertEquals(0, Movimiento::count());
    }

    public function test_consumo_negativo_o_cero_se_rechaza(): void
    {
        $l = $this->lote('S-2', 10, now()->addDays(20)->toDateString());
        foreach ([0, -5] as $q) {
            $this->actingAs($this->operario())->postJson('/inventory/consume-fefo', ['material_id' => $this->material->id, 'quantity' => $q, 'reason' => 'produccion'])->assertStatus(422);
            $this->actingAs($this->operario())->post("/inventory/lote/{$l->id}/consume", ['quantity' => $q, 'reason' => 'produccion']);
        }
        $this->assertEquals(10, (float) $l->fresh()->quantity);
    }

    // ── Kardex ──────────────────────────────────────────────────────────────
    public function test_ajuste_solo_admin(): void
    {
        $l = $this->lote('K-1', 10, now()->addDays(20)->toDateString());
        $this->actingAs($this->operario())->patch("/inventory/adjust/{$l->id}", ['new_quantity' => 1, 'reason' => 'x'])->assertForbidden();
    }

    // ── Órdenes de compra ───────────────────────────────────────────────────
    public function test_recibir_items_de_otra_orden_se_rechaza(): void
    {
        $u = $this->admin();
        $a = PurchaseOrder::create(['po_number' => 'OC-A', 'status' => 'approved', 'created_by' => $u->id]);
        $b = PurchaseOrder::create(['po_number' => 'OC-B', 'status' => 'draft', 'created_by' => $u->id]);
        $itemB = PurchaseOrderItem::create(['purchase_order_id' => $b->id, 'material_id' => $this->material->id, 'quantity' => 10, 'unit_cost' => 1, 'received_qty' => 0]);
        $this->actingAs($u)->postJson("/api/purchase-orders/{$a->id}/receive", ['items' => [[
            'id' => $itemB->id, 'received' => 10, 'batch_number' => 'X-1',
            'expiration_date' => now()->addDays(30)->toDateString(), 'bodega_id' => $this->bodega->id,
        ]]]);
        $this->assertEquals(0, (float) $itemB->fresh()->received_qty, 'Se recibió un ítem de una orden en borrador a través de otra orden');
    }

    public function test_operario_no_aprueba_ordenes(): void
    {
        $o = PurchaseOrder::create(['po_number' => 'OC-C', 'status' => 'draft', 'created_by' => $this->admin()->id]);
        $this->actingAs($this->operario())->putJson("/api/purchase-orders/{$o->id}", ['status' => 'approved']);
        $this->assertEquals('draft', $o->fresh()->status, 'Un operario aprobó una orden de compra');
    }

    public function test_operario_no_borra_ordenes(): void
    {
        $o = PurchaseOrder::create(['po_number' => 'OC-D', 'status' => 'approved', 'created_by' => $this->admin()->id]);
        $this->actingAs($this->operario())->deleteJson("/api/purchase-orders/{$o->id}");
        $this->assertNotNull($o->fresh(), 'Un operario borró una orden de compra');
    }

    // ── Autenticación ───────────────────────────────────────────────────────
    public function test_no_hay_registro_publico(): void
    {
        $this->post('/register', ['name' => 'Extraño', 'email' => 'x@example.com', 'password' => 'clave12345', 'password_confirmation' => 'clave12345']);
        $this->assertDatabaseMissing('users', ['email' => 'x@example.com']);
        $this->assertGuest();
    }

    public function test_login_limita_intentos(): void
    {
        $u = $this->admin();
        $ultimo = null;
        for ($i = 0; $i < 8; $i++) {
            $ultimo = $this->post('/login', ['email' => $u->email, 'password' => 'mala' . $i]);
        }
        // Tras 8 fallos, la clave correcta no debería entrar de inmediato (bloqueo temporal).
        $this->post('/login', ['email' => $u->email, 'password' => 'password']);
        $this->assertGuest();
    }

    public function test_monitor_del_servidor_requiere_sesion(): void
    {
        $this->getJson('/api/monitor/stats')->assertUnauthorized();
        $this->actingAs($this->operario())->getJson('/api/monitor/stats')->assertForbidden();
        $this->actingAs($this->operario())->postJson('/api/monitor/pulse')->assertForbidden();
    }

    public function test_storage_privado_no_se_sirve_sin_firma(): void
    {
        \Illuminate\Support\Facades\Storage::disk('local')->put('secreto.txt', 'dato');
        $this->get('/storage/secreto.txt')->assertForbidden();
    }

    // ── Transferencias ──────────────────────────────────────────────────────
    public function test_transferencia_mayor_al_lote_se_rechaza(): void
    {
        $b2 = Bodega::create(['code' => 'B2', 'name' => 'Bodega 2', 'ubicacion' => 'B', 'capacity' => 1000]);
        $l = $this->lote('T-1', 10, now()->addDays(20)->toDateString());
        $this->actingAs($this->operario())->post('/inventory/transfer', ['lote_id' => $l->id, 'from_bodega_id' => $this->bodega->id, 'to_bodega_id' => $b2->id, 'cantidad' => 11]);
        $this->assertEquals(10, (float) $l->fresh()->quantity);
    }

    public function test_operario_no_borra_tarjetas_del_kanban(): void
    {
        $k = \App\Models\KanbanItem::create(['title' => 'Tarjeta de la tesis', 'column' => 'done', 'user_id' => $this->admin()->id]);
        $this->actingAs($this->operario())->deleteJson("/kanban/{$k->id}");
        $this->assertNotNull(\App\Models\KanbanItem::find($k->id), 'Un operario borró una tarjeta del Kanban del proyecto');
    }

    // ── Casos permitidos (que la regla no quede demasiado estricta) ─────────
    public function test_lote_vencido_se_puede_dar_de_baja_como_desperdicio(): void
    {
        $v = $this->lote('V-2', 10, now()->subDays(3)->toDateString());
        $this->actingAs($this->operario())->post("/inventory/lote/{$v->id}/consume", ['quantity' => 10, 'reason' => 'desperdicio']);
        $this->assertEquals('consumed', $v->fresh()->status);
    }

    public function test_despacho_por_lote_permite_el_primero_en_vencer(): void
    {
        $primero = $this->lote('P-1', 10, now()->addDays(5)->toDateString());
        $this->lote('P-2', 10, now()->addDays(60)->toDateString());
        $this->actingAs($this->operario())->post("/inventory/lote/{$primero->id}/consume", ['quantity' => 4, 'reason' => 'produccion']);
        $this->assertEquals(6, (float) $primero->fresh()->quantity);
    }

    public function test_fefo_salta_el_vencido_y_despacha_el_siguiente(): void
    {
        $this->lote('V-3', 10, now()->subDay()->toDateString());
        $ok = $this->lote('OK-3', 10, now()->addDays(20)->toDateString());
        $this->actingAs($this->operario())->postJson('/inventory/consume-fefo', ['material_id' => $this->material->id, 'quantity' => 4, 'reason' => 'produccion']);
        $this->assertEquals(6, (float) $ok->fresh()->quantity);
    }

    public function test_qr_salida_respeta_cuarentena_y_entrada_no_la_libera(): void
    {
        $q = $this->lote('Q-3', 20, now()->addDays(30)->toDateString(), 'quarantined');
        $qr = json_encode(['id' => $q->id, 'v' => 1]);
        $op = $this->operario();
        $this->actingAs($op)->post('/inventory/qr-scan', ['qr_data' => $qr, 'action' => 'salida', 'quantity' => 5]);
        $this->assertEquals(20, (float) $q->fresh()->quantity);
        $this->actingAs($op)->post('/inventory/qr-scan', ['qr_data' => $qr, 'action' => 'entrada', 'quantity' => 5]);
        $this->assertEquals('quarantined', $q->fresh()->status);
    }

    public function test_operario_envia_a_revision_y_admin_aprueba(): void
    {
        $o = PurchaseOrder::create(['po_number' => 'OC-E', 'status' => 'draft', 'created_by' => $this->admin()->id]);
        $this->actingAs($this->operario())->putJson("/api/purchase-orders/{$o->id}", ['status' => 'ready_for_review'])->assertOk();
        $this->actingAs($this->admin())->putJson("/api/purchase-orders/{$o->id}", ['status' => 'approved'])->assertOk();
        $this->assertEquals('approved', $o->fresh()->status);
    }
}
